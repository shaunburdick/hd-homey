package com.hdhomey.app.ui.auth

import android.graphics.Bitmap
import android.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.hdhomey.app.api.DeviceCodeService
import com.hdhomey.app.api.models.DeviceCodeResponse
import com.hdhomey.app.data.provider.CurrentServerProvider
import com.hdhomey.app.data.repository.ServerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import java.time.Duration
import java.time.Instant
import javax.inject.Inject

/**
 * UI state for the device code pairing / authentication screen.
 *
 * @property deviceCode The 6-character code displayed to the user for manual entry.
 * @property qrCodeBitmap A bitmap of the QR code encoding the pairing URL, or null if
 *   generation failed or hasn't started yet.
 * @property expiresAt Epoch milliseconds at which the device code expires.
 * @property isPolling True while the ViewModel is actively polling the server for
 *   authorization.
 * @property isExpired True after the device code expires without authorization.
 * @property isAuthorized True after the user successfully authorises on the remote device.
 * @property errorMessage A user-facing error description, or null when no error.
 */
data class AuthenticationUiState(
    val deviceCode: String = "",
    val qrCodeBitmap: Bitmap? = null,
    val expiresAt: Long = 0L,
    val isPolling: Boolean = false,
    val isExpired: Boolean = false,
    val isAuthorized: Boolean = false,
    val errorMessage: String? = null
)

/**
 * ViewModel for the device code pairing / authentication screen.
 *
 * Orchestrates the OAuth 2.0 Device Authorization Flow:
 * 1. Fetch a device code from the HD Homey server ([DeviceCodeService.generateCode]).
 * 2. Generate a QR code bitmap from the pairing URL.
 * 3. Poll the server every 3 seconds ([DeviceCodeService.pollAuthorization]) until the
 *    user approves or denies the request on the remote device.
 * 4. On success, persist the JWT via [ServerRepository.updateServerAuthentication].
 * 5. Expose state changes via [uiState] ([StateFlow]<[AuthenticationUiState]>) for the
 *    Compose UI to collect.
 *
 * @property serverRepository Repository for reading/writing server configuration.
 * @property currentServerProvider In-memory holder for the currently active server.
 * @property okHttpClient Application-scoped HTTP client from [com.hdhomey.app.di.NetworkModule].
 */
@HiltViewModel
class AuthenticationViewModel @Inject constructor(
    private val serverRepository: ServerRepository,
    private val currentServerProvider: CurrentServerProvider,
    private val okHttpClient: OkHttpClient
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthenticationUiState())
    val uiState: StateFlow<AuthenticationUiState> = _uiState.asStateFlow()

    /** Active polling job — cancelled by [cancelPolling] or on error/expiry. */
    private var pollingJob: Job? = null

    /** The server ID passed to the most recent [startPairing] call; used by [retryPairing]. */
    private var currentServerId: String? = null

    /** Lazily-created service instance for the current server. */
    private var deviceCodeService: DeviceCodeService? = null

    /** Cached device-code response so [retryPairing] can resume polling without re-fetching. */
    private var lastDeviceCodeResponse: DeviceCodeResponse? = null

    /** QR code dimension in pixels (2× display size for sharp rendering on TV). */
    private companion object {
        private const val QR_CODE_SIZE_PX = 600
        private const val POLL_INTERVAL_MS = 3_000L
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Starts the device-code pairing flow for the given server.
     *
     * 1. Looks up the server by [serverId] in [ServerRepository].
     * 2. Creates a [DeviceCodeService] targeting that server's URL.
     * 3. Calls [DeviceCodeService.generateCode] to obtain a device code and pairing URL.
     * 4. Generates a QR code bitmap from the pairing URL.
     * 5. Starts polling for authorization every 3 seconds.
     *
     * Transitions the UI state through the various phases; errors are surfaced via
     * [AuthenticationUiState.errorMessage].
     *
     * @param serverId The ID of the server to pair with.
     */
    fun startPairing(serverId: String) {
        currentServerId = serverId

        viewModelScope.launch {
            try {
                // Reset to a clean starting state
                _uiState.value = AuthenticationUiState()

                // 1. Look up the server
                val server = serverRepository.getServerById(serverId)
                if (server == null) {
                    _uiState.value = _uiState.value.copy(
                        errorMessage = "Server not found. Please select a different server."
                    )
                    return@launch
                }

                // 2. Create the device-code service
                val service = DeviceCodeService(server.url, okHttpClient)
                deviceCodeService = service

                // 3. Request a device code
                val deviceName = getDeviceName()
                val response = service.generateCode(deviceName)
                lastDeviceCodeResponse = response

                // 4. Parse expires-at and generate QR code
                val expiresAtMillis = try {
                    val instant = Instant.parse(response.expiresAt)
                    Duration.between(Instant.EPOCH, instant).toMillis()
                } catch (e: Exception) {
                    // Fall back to 10 minutes if parsing fails
                    System.currentTimeMillis() + 600_000L
                }

                val qrBitmap = try {
                    generateQrCode(response.pairingUrl)
                } catch (e: Exception) {
                    // QR generation is non-critical — user can still enter the code manually
                    null
                }

                // 5. Update UI state with pairing info
                _uiState.value = AuthenticationUiState(
                    deviceCode = response.code,
                    qrCodeBitmap = qrBitmap,
                    expiresAt = expiresAtMillis,
                    isPolling = true,
                    isExpired = false,
                    isAuthorized = false,
                    errorMessage = null
                )

                // 6. Start polling
                startPolling(response.code)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isPolling = false,
                    errorMessage = e.message ?: "Failed to start pairing"
                )
            }
        }
    }

    /**
     * Cancels the polling coroutine and resets the polling flag.
     *
     * Does NOT clear the device code or QR code — the user may want to retry
     * with [retryPairing] without re-fetching the pairing data from the server.
     */
    fun cancelPolling() {
        pollingJob?.cancel()
        pollingJob = null
        _uiState.value = _uiState.value.copy(isPolling = false)
    }

    /**
     * Restarts the pairing flow for the same server.
     *
     * If a previous [DeviceCodeResponse] was cached, it re-uses the existing code
     * and restarts polling without an additional network round-trip. Otherwise it
     * delegates to a fresh [startPairing] call.
     */
    fun retryPairing() {
        val serverId = currentServerId ?: return

        // Cancel any in-flight polling
        pollingJob?.cancel()
        pollingJob = null
        _uiState.value = AuthenticationUiState()

        // If we already have a cached code response, restart polling without re-fetching
        val cached = lastDeviceCodeResponse
        if (cached != null) {
            val qrBitmap = try {
                generateQrCode(cached.pairingUrl)
            } catch (_: Exception) {
                null
            }
            val expiresAtMillis = try {
                val instant = Instant.parse(cached.expiresAt)
                Duration.between(Instant.EPOCH, instant).toMillis()
            } catch (_: Exception) {
                System.currentTimeMillis() + 600_000L
            }

            _uiState.value = AuthenticationUiState(
                deviceCode = cached.code,
                qrCodeBitmap = qrBitmap,
                expiresAt = expiresAtMillis,
                isPolling = true,
                isExpired = false,
                isAuthorized = false,
                errorMessage = null
            )
            startPolling(cached.code)
        } else {
            startPairing(serverId)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Polls the server every [POLL_INTERVAL_MS] for authorization status.
     *
     * Updates the UI state on each response:
     * - **"pending"**: continues polling.
     * - **"authorized"**: persists the JWT via [ServerRepository.updateServerAuthentication]
     *   and marks [AuthenticationUiState.isAuthorized] as `true`.
     * - **"expired"**: marks [AuthenticationUiState.isExpired] as `true`.
     * - **"denied"**: sets an appropriate error message.
     *
     * @param deviceCode The device code returned by [DeviceCodeService.generateCode].
     */
    private fun startPolling(deviceCode: String) {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            try {
                val service = deviceCodeService
                    ?: throw IllegalStateException("DeviceCodeService not initialised")

                while (true) {
                    delay(POLL_INTERVAL_MS)

                    val pollResponse = service.pollAuthorization(deviceCode)

                    when (pollResponse.status) {
                        "pending" -> {
                            // Continue polling — no state change needed
                        }
                        "authorized" -> {
                            pollingJob = null
                            val serverId = currentServerId
                            val token = pollResponse.token
                            val user = pollResponse.user

                            if (serverId != null && token != null && user != null) {
                                serverRepository.updateServerAuthentication(
                                    serverId = serverId,
                                    jwt = token,
                                    expiresAt = pollResponse.expiresAt
                                        ?: (System.currentTimeMillis() + 24 * 60 * 60 * 1000),
                                    username = user.username,
                                    userRole = user.role
                                )
                            }

                            _uiState.value = _uiState.value.copy(
                                isPolling = false,
                                isAuthorized = true,
                                errorMessage = null
                            )
                            return@launch
                        }
                        "expired" -> {
                            pollingJob = null
                            _uiState.value = _uiState.value.copy(
                                isPolling = false,
                                isExpired = true,
                                errorMessage = "The code has expired. Please try again."
                            )
                            return@launch
                        }
                        "denied" -> {
                            pollingJob = null
                            _uiState.value = _uiState.value.copy(
                                isPolling = false,
                                errorMessage = "Authorization denied."
                            )
                            return@launch
                        }
                    }
                }
            } catch (e: Exception) {
                pollingJob = null
                _uiState.value = _uiState.value.copy(
                    isPolling = false,
                    errorMessage = e.message ?: "Polling error"
                )
            }
        }
    }

    /**
     * Generates a QR code bitmap from the given [content] string (the pairing URL).
     *
     * Uses ZXing's [QRCodeWriter] to encode the content as a square QR code.
     * The resulting bitmap has white background and black modules (high contrast
     * for dark TV backgrounds).
     *
     * @param content The text to encode (the pairing URL).
     * @return A [Bitmap] containing the QR code.
     * @throws com.google.zxing.WriterException If ZXing fails to encode the content.
     */
    private fun generateQrCode(content: String): Bitmap {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, QR_CODE_SIZE_PX, QR_CODE_SIZE_PX)
        val bitmap = Bitmap.createBitmap(QR_CODE_SIZE_PX, QR_CODE_SIZE_PX, Bitmap.Config.RGB_565)
        for (x in 0 until QR_CODE_SIZE_PX) {
            for (y in 0 until QR_CODE_SIZE_PX) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bitmap
    }

    /**
     * Returns a human-readable device name for the pairing request.
     *
     * Uses the device model if available, otherwise falls back to a generic name.
     */
    private fun getDeviceName(): String {
        val model = android.os.Build.MODEL
        return if (model.isNotBlank()) model else "Android TV"
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
        pollingJob = null
    }
}
