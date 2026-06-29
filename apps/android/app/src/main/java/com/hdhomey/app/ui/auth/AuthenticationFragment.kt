package com.hdhomey.app.ui.auth

import android.graphics.Bitmap
import android.os.Bundle
import android.os.CountDownTimer
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.google.zxing.BarcodeFormat
import com.google.zxing.WriterException
import com.google.zxing.qrcode.QRCodeWriter
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.hdhomey.app.R
import com.hdhomey.app.api.DeviceCodeService
import com.hdhomey.app.api.HdHomeyApi
import com.hdhomey.app.api.models.DeviceCodeResponse
import com.hdhomey.app.data.repository.ServerRepository
import com.hdhomey.app.util.Constants
import com.hdhomey.app.util.ErrorHandler
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Authentication fragment for device code pairing.
 * 
 * Implements OAuth 2.0 Device Authorization Flow:
 * 1. Receives serverId as navigation argument
 * 2. Generates device code from server
 * 3. Displays code prominently for user to enter on another device
 * 4. Polls server every 3 seconds for authorization
 * 5. On success: Stores JWT and user info, navigates to success screen
 * 6. On error: Shows retry and cancel buttons for recovery
 */
@AndroidEntryPoint
class AuthenticationFragment : Fragment() {

    @Inject lateinit var repository: ServerRepository
    
    private lateinit var titleText: TextView
    private lateinit var codeLabelText: TextView
    private lateinit var deviceCodeText: TextView
    private lateinit var pairingUrlText: TextView
    private lateinit var qrCodeImage: ImageView
    private lateinit var countdownText: TextView
    private lateinit var statusText: TextView
    private lateinit var loadingIndicator: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var buttonContainer: LinearLayout
    private lateinit var retryButton: Button
    private lateinit var cancelButton: Button
    
    private lateinit var deviceCodeService: DeviceCodeService
    
    private var serverId: String? = null
    private var serverName: String? = null
    private var serverUrl: String? = null
    private var deviceCode: String? = null
    private var countDownTimer: CountDownTimer? = null
    private var pollingJob: Job? = null
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_authentication, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Initialize views
        titleText = view.findViewById(R.id.text_title)
        codeLabelText = view.findViewById(R.id.text_code_label)
        deviceCodeText = view.findViewById(R.id.text_device_code)
        pairingUrlText = view.findViewById(R.id.text_pairing_url)
        qrCodeImage = view.findViewById(R.id.image_qr_code)
        countdownText = view.findViewById(R.id.text_countdown)
        statusText = view.findViewById(R.id.text_status)
        loadingIndicator = view.findViewById(R.id.loading_indicator)
        errorText = view.findViewById(R.id.text_error)
        buttonContainer = view.findViewById(R.id.button_container)
        retryButton = view.findViewById(R.id.button_retry)
        cancelButton = view.findViewById(R.id.button_cancel)
        
        // Setup button listeners
        retryButton.setOnClickListener { onRetryClick() }
        cancelButton.setOnClickListener { onCancelClick() }
        
        // repository is injected via Hilt (@Inject)
        
        // Get serverId from arguments
        serverId = arguments?.getString("serverId")
        
        if (serverId == null) {
            showError("No server selected")
            showActionButtons(showRetry = false, showCancel = true)
            return
        }
        
        // Load server and start authentication flow
        startAuthenticationFlow()
    }
    
    /**
     * Starts the authentication flow:
     * 1. Load server from repository
     * 2. Create API client
     * 3. Request device code
     * 4. Display code and start polling
     */
    private fun startAuthenticationFlow() {
        // Hide error and buttons from previous attempts
        hideError()
        hideActionButtons()
        
        lifecycleScope.launch {
            try {
                // Show connecting status
                showStatus(getString(R.string.auth_status_connecting))
                
                // Load server with explicit null check
                val server = serverId?.let { repository.getServerById(it) }
                if (server == null) {
                    hideStatus()
                    showError("Server not found")
                    showActionButtons(showRetry = false, showCancel = true)
                    return@launch
                }
                
                serverName = server.name
                serverUrl = server.url
                titleText.text = getString(R.string.auth_title_for_server, serverName)
                
                // Create API client
                val httpClient = HdHomeyApi.createClient(server.url)
                deviceCodeService = DeviceCodeService(server.url, httpClient)
                
                // Show generating code status
                showStatus(getString(R.string.auth_status_generating))
                
                // Generate device code
                val response = deviceCodeService.generateCode(getDeviceName())
                
                // Hide loading status once code is generated
                hideStatus()
                
                // Display code and URL
                showDeviceCode(response)
                
                // Show cancel button during auth flow
                showActionButtons(showRetry = false, showCancel = true)
                
                // Start countdown timer (parse ISO 8601 expiration time)
                val expiresAt = java.time.Instant.parse(response.expiresAt)
                val expiresIn = java.time.Duration.between(java.time.Instant.now(), expiresAt).toMillis()
                startCountdown(expiresIn)
                
                // Show waiting status with subtle indicator
                showStatus(getString(R.string.auth_status_waiting), showLoading = false)
                
                // Start polling
                startPolling(response)
                
            } catch (e: Exception) {
                Log.e(Constants.Tags.AUTH, "Failed to start authentication", e)
                hideStatus()
                showError(ErrorHandler.getCodeGenerationError(e))
                showActionButtons(showRetry = true, showCancel = true)
            }
        }
    }
    
    /**
     * Displays the device code and pairing URL.
     */
    private fun showDeviceCode(response: DeviceCodeResponse) {
        deviceCode = response.code
        deviceCodeText.text = response.code
        
        val pairingInstructions = getString(
            R.string.pairing_instructions,
            response.pairingUrl
        )
        pairingUrlText.text = pairingInstructions
        
        // Generate QR code from pairing URL
        try {
            val qrBitmap = generateQrCode(response.pairingUrl, 600) // 600px for sharp QR on TV
            qrCodeImage.setImageBitmap(qrBitmap)
        } catch (e: WriterException) {
            Log.w(Constants.Tags.AUTH, "Failed to generate QR code", e)
            // QR code silently fails — user can still use the URL
        }
    }
    
    /**
     * Starts a countdown timer for code expiration.
     */
    private fun startCountdown(durationMs: Long) {
        countDownTimer?.cancel()
        countDownTimer = object : CountDownTimer(durationMs, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val minutes = millisUntilFinished / 60000
                val seconds = (millisUntilFinished % 60000) / 1000
                countdownText.text = getString(
                    R.string.code_expires_in,
                    minutes,
                    seconds
                )
            }
            
            override fun onFinish() {
                countdownText.text = getString(R.string.code_expired)
                stopPolling()
                hideStatus()
                showError(Constants.Errors.AUTH_EXPIRED)
                showActionButtons(showRetry = true, showCancel = true)
            }
        }.start()
    }
    
    /**
     * Starts polling the server for authorization.
     * 
     * Polls every 3 seconds.
     */
    private fun startPolling(response: DeviceCodeResponse) {
        val pollInterval = 3000L // Poll every 3 seconds
        
        pollingJob = lifecycleScope.launch {
            try {
                while (true) {
                    delay(pollInterval)
                    
                    val pollResponse = deviceCodeService.pollAuthorization(response.code)
                    
                    when (pollResponse.status) {
                        "pending" -> {
                            Log.d(Constants.Tags.AUTH, "Authorization pending...")
                            // Continue polling
                        }
                        "authorized" -> {
                            Log.d(Constants.Tags.AUTH, "Authorization successful!")
                            showStatus(getString(R.string.auth_status_success), showLoading = false)
                            handleAuthorizationSuccess(pollResponse)
                            break
                        }
                        "expired" -> {
                            Log.d(Constants.Tags.AUTH, "Authorization expired")
                            countDownTimer?.cancel()
                            hideStatus()
                            showError(Constants.Errors.AUTH_EXPIRED)
                            showActionButtons(showRetry = true, showCancel = true)
                            break
                        }
                        "denied" -> {
                            Log.d(Constants.Tags.AUTH, "Authorization denied")
                            countDownTimer?.cancel()
                            hideStatus()
                            showError(Constants.Errors.AUTH_DENIED)
                            showActionButtons(showRetry = true, showCancel = true)
                            break
                        }
                        else -> {
                            Log.w(Constants.Tags.AUTH, "Unknown status: ${pollResponse.status}")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(Constants.Tags.AUTH, "Polling error", e)
                countDownTimer?.cancel()
                hideStatus()
                showError(ErrorHandler.getPollingError(e))
                showActionButtons(showRetry = true, showCancel = true)
            }
        }
    }
    
    /**
     * Handles successful authorization.
     * 
     * Updates the server in the repository with JWT and user info,
     * then navigates to the success screen.
     */
    private suspend fun handleAuthorizationSuccess(pollResponse: com.hdhomey.app.api.models.PollResponse) {
        try {
            val token = pollResponse.token ?: throw Exception("No token in response")
            val user = pollResponse.user ?: throw Exception("No user info in response")
            val expiresAt = pollResponse.expiresAt ?: (System.currentTimeMillis() + (24 * 60 * 60 * 1000)) // Default 24h
            
            // Verify serverId is available before updating
            val currentServerId = serverId
            if (currentServerId == null) {
                throw Exception("Server ID not available")
            }
            
            // Update server in repository
            val success = repository.updateServerAuthentication(
                serverId = currentServerId,
                jwt = token,
                expiresAt = expiresAt,
                username = user.username,
                userRole = user.role
            )
            
            if (!success) {
                throw Exception("Failed to save authentication")
            }
            
            Log.d(Constants.Tags.AUTH, "Authentication saved for ${user.username}")
            
            // Token is already stored in Server.jwt via updateServerAuthentication above.
            // No separate token persistence needed — each API client gets its auth cookie
            // from the Server's JWT via HdHomeyApiServiceProvider.
            
            // Stop polling and countdown
            stopPolling()
            countDownTimer?.cancel()
            
            // Navigate to success screen
            val bundle = Bundle().apply {
                putString("serverId", serverId)
                putString("serverName", serverName)
                putString("username", user.username)
                putString("role", user.role)
            }
            findNavController().navigate(R.id.action_authentication_to_success, bundle)
            
        } catch (e: Exception) {
            Log.e(Constants.Tags.AUTH, "Failed to handle authorization", e)
            showError("Failed to save authentication: ${e.message}")
        }
    }
    
    /**
     * Gets a device name for display (model or generic name).
     */
    private fun getDeviceName(): String {
        val model = android.os.Build.MODEL
        return if (model.isNotBlank()) {
            model
        } else {
            "Android TV"
        }
    }
    
    /**
     * Shows/hides loading indicator.
     */
    private fun showLoading(show: Boolean) {
        loadingIndicator.visibility = if (show) View.VISIBLE else View.GONE
    }
    
    /**
     * Shows a status message (e.g., "Connecting...", "Waiting for authorization...").
     * 
     * @param message The status message to display
     * @param showLoading Whether to show the loading indicator alongside the message
     */
    private fun showStatus(message: String, showLoading: Boolean = true) {
        statusText.text = message
        statusText.visibility = View.VISIBLE
        loadingIndicator.visibility = if (showLoading) View.VISIBLE else View.GONE
    }
    
    /**
     * Hides the status message and loading indicator.
     */
    private fun hideStatus() {
        statusText.visibility = View.GONE
        loadingIndicator.visibility = View.GONE
    }
    
    /**
     * Shows an error message (preserves device code visibility).
     */
    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
        // Don't replace device code with "ERROR" - preserve visibility of what went wrong
    }
    
    /**
     * Hides error message.
     */
    private fun hideError() {
        errorText.visibility = View.GONE
    }
    
    /**
     * Shows/hides action buttons (retry and cancel).
     * 
     * @param showRetry Whether to show the retry button
     * @param showCancel Whether to show the cancel button
     */
    private fun showActionButtons(showRetry: Boolean, showCancel: Boolean) {
        retryButton.visibility = if (showRetry) View.VISIBLE else View.GONE
        cancelButton.visibility = if (showCancel) View.VISIBLE else View.GONE
        buttonContainer.visibility = if (showRetry || showCancel) View.VISIBLE else View.GONE
    }
    
    /**
     * Hides all action buttons.
     */
    private fun hideActionButtons() {
        buttonContainer.visibility = View.GONE
    }
    
    /**
     * Handles retry button click.
     * Restarts the entire authentication flow.
     */
    private fun onRetryClick() {
        Log.d(Constants.Tags.AUTH, "Retry button clicked")
        
        // Stop any ongoing polling and countdown
        stopPolling()
        countDownTimer?.cancel()
        
        // Reset UI state
        deviceCodeText.text = getString(R.string.loading)
        pairingUrlText.text = getString(R.string.loading)
        countdownText.text = ""
        hideError()
        hideStatus()
        
        // Restart authentication flow
        startAuthenticationFlow()
    }
    
    /**
     * Handles cancel button click.
     * Stops polling and navigates back to server list.
     */
    private fun onCancelClick() {
        Log.d(Constants.Tags.AUTH, "Cancel button clicked")
        
        // Stop any ongoing operations
        stopPolling()
        countDownTimer?.cancel()
        hideStatus()
        
        // Navigate back to server list
        findNavController().popBackStack()
    }
    
    /**
     * Stops the polling job.
     */
    private fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }
    
    /**
     * Generates a QR code bitmap from the given text content.
     *
     * Uses ZXing's [QRCodeWriter] to encode the content as a square QR code.
     * The resulting bitmap has white background and black modules (high contrast
     * for dark TV backgrounds).
     *
     * @param content The text to encode (the pairing URL).
     * @param sizePx The width/height of the resulting bitmap in pixels.
     *   Use 2× the display size for sharp rendering (e.g., 600px for a 300dp
     *   ImageView on a ~2x density TV screen).
     * @return A [Bitmap] containing the QR code.
     * @throws WriterException If ZXing fails to encode the content.
     */
    private fun generateQrCode(content: String, sizePx: Int): Bitmap {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx)
        
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.RGB_565)
        for (x in 0 until sizePx) {
            for (y in 0 until sizePx) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
        return bitmap
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        stopPolling()
        countDownTimer?.cancel()
    }
}
