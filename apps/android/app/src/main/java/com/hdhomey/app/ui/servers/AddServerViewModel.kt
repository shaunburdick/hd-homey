package com.hdhomey.app.ui.servers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hdhomey.app.data.repository.ServerRepository
import com.hdhomey.app.ui.components.AsyncState
import com.hdhomey.app.util.Constants
import com.hdhomey.app.util.ErrorHandler
import com.hdhomey.app.util.UrlValidator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import javax.inject.Inject

/**
 * ViewModel for the Add Server form screen.
 *
 * Manages server URL validation, connectivity testing via the /api/health endpoint,
 * and persisting new server configurations via [ServerRepository].
 *
 * Exposes [connectionState] as an [AsyncState] via [StateFlow] so the UI layer
 * can reactively render loading, success (healthy / unhealthy), and error states
 * during the connection test workflow:
 *
 * - `Success(false)` — idle / no connection test performed yet
 * - `Loading` — connection test in progress
 * - `Success(true)` — server is healthy and reachable
 * - `Error(message)` — server unreachable or validation failed
 *
 * @property serverRepository Repository that persists server configurations.
 * @property okHttpClient Shared HTTP client (injected from [com.hdhomey.app.di.NetworkModule]).
 */
@HiltViewModel
class AddServerViewModel @Inject constructor(
    private val serverRepository: ServerRepository,
    private val okHttpClient: OkHttpClient
) : ViewModel() {

    private val _connectionState = MutableStateFlow<AsyncState<Boolean>>(AsyncState.Success(false))

    /**
     * Observable async state for the connection test workflow.
     *
     * Starts as [AsyncState.Success]`(false)` and transitions to [AsyncState.Loading]
     * while [testConnection] is running, then to [AsyncState.Success]`(true)` on healthy
     * response or [AsyncState.Error] on failure.
     *
     * Also used by [saveServer] to signal completion:
     * - `Success(false)` — server saved successfully (back to idle)
     * - `Error(message)` — server could not be saved (e.g., duplicate name)
     */
    val connectionState: StateFlow<AsyncState<Boolean>> = _connectionState.asStateFlow()

    /**
     * Validates a server URL and returns a user-friendly error message if invalid.
     *
     * Delegates to [UrlValidator.validate] and maps the result:
     * - [UrlValidator.ValidationResult.Success] → `null` (valid)
     * - [UrlValidator.ValidationResult.Error] → error message string (invalid)
     *
     * @param url The URL string to validate (e.g., `"http://192.168.1.100:3000"`).
     * @return `null` if the URL is valid, or a descriptive error message string.
     */
    fun validateUrl(url: String): String? {
        return when (val result = UrlValidator.validate(url)) {
            is UrlValidator.ValidationResult.Success -> null
            is UrlValidator.ValidationResult.Error -> result.message
        }
    }

    /**
     * Tests connectivity to the specified server by sending a GET request to its
     * `/api/health` endpoint.
     *
     * Transitions [connectionState] through the following lifecycle:
     * 1. [AsyncState.Loading] — request in flight
     * 2. [AsyncState.Success]`(true)` — server responded with HTTP 2xx
     * 3. [AsyncState.Success]`(false)` — server responded with non-2xx status
     * 4. [AsyncState.Error] — network error, timeout, or invalid URL
     *
     * The URL is validated and normalized via [UrlValidator.validate] before the
     * request is made. If validation fails, [connectionState] transitions directly
     * to [AsyncState.Error] with the validation error message.
     *
     * @param url The server URL to test (may be raw user input; will be normalized).
     */
    fun testConnection(url: String) {
        val normalizedUrl = when (val result = UrlValidator.validate(url)) {
            is UrlValidator.ValidationResult.Success -> result.url
            is UrlValidator.ValidationResult.Error -> {
                _connectionState.value = AsyncState.Error(
                    message = result.message
                )
                return
            }
        }

        _connectionState.value = AsyncState.Loading

        viewModelScope.launch {
            try {
                val isHealthy = withContext(Dispatchers.IO) {
                    performHealthCheck(normalizedUrl)
                }
                _connectionState.value = AsyncState.Success(isHealthy)
            } catch (e: Exception) {
                _connectionState.value = AsyncState.Error(
                    message = ErrorHandler.getHealthCheckError(e),
                    cause = e
                )
            }
        }
    }

    /**
     * Saves a new server configuration to the repository.
     *
     * The URL is normalized via [UrlValidator.validate] before persisting.
     * On success, [connectionState] is reset to the idle state `Success(false)`
     * so the UI can reactively detect completion and navigate away.
     * On failure (e.g., duplicate server name), [connectionState] transitions
     * to [AsyncState.Error] with an actionable message.
     *
     * @param name The user-defined display name for the server.
     * @param url The server URL (will be normalized before saving).
     */
    fun saveServer(name: String, url: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val normalizedUrl = normalizeUrl(url)
                    serverRepository.addServer(name.trim(), normalizedUrl)
                }
                // Reset to idle state — the UI layer observes this transition
                // and navigates back to the server list.
                _connectionState.value = AsyncState.Success(false)
            } catch (e: IllegalArgumentException) {
                _connectionState.value = AsyncState.Error(
                    message = e.message ?: Constants.Errors.DUPLICATE_NAME,
                    cause = e
                )
            }
        }
    }

    /**
     * Resets [connectionState] to the idle state `Success(false)`.
     *
     * Call this when the user modifies the URL field after a previous connection
     * test, so that stale test results (success or error) are cleared before
     * the next test.
     */
    fun resetConnectionState() {
        _connectionState.value = AsyncState.Success(false)
    }

    /**
     * Performs a synchronous HTTP GET to the server's `/api/health` endpoint.
     *
     * @param baseUrl The normalized server base URL (e.g., `"http://192.168.1.100:3000"`).
     * @return `true` if the server responded with an HTTP 2xx status, `false` otherwise.
     */
    private fun performHealthCheck(baseUrl: String): Boolean {
        val healthUrl = "$baseUrl${Constants.Api.HEALTH_CHECK}"
        val request = Request.Builder()
            .url(healthUrl)
            .get()
            .build()

        okHttpClient.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }

    /**
     * Returns the normalized form of a URL string.
     *
     * Delegates to [UrlValidator.validate] and falls back to trimming whitespace
     * if validation fails. This ensures the repository always receives a clean URL.
     *
     * @param url The raw URL string to normalize.
     * @return The normalized URL string.
     */
    private fun normalizeUrl(url: String): String {
        return when (val result = UrlValidator.validate(url)) {
            is UrlValidator.ValidationResult.Success -> result.url
            is UrlValidator.ValidationResult.Error -> url.trim()
        }
    }
}
