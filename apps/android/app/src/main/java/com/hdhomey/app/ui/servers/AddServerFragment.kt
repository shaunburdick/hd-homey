package com.hdhomey.app.ui.servers

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.hdhomey.app.R
import com.hdhomey.app.data.repository.ServerRepository
import com.hdhomey.app.storage.AppPreferences
import com.hdhomey.app.util.Constants
import com.hdhomey.app.util.ErrorHandler
import com.hdhomey.app.util.UrlValidator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * Fragment for adding a new HD Homey server.
 *
 * Features:
 * - Input fields for server name and URL
 * - Real-time URL validation
 * - Health check before saving (GET /api/health)
 * - Error handling for network issues, invalid URLs, duplicate names
 */
class AddServerFragment : Fragment() {

    private lateinit var serverNameInput: TextInputEditText
    private lateinit var serverUrlInput: TextInputEditText
    private lateinit var serverUrlLayout: TextInputLayout
    private lateinit var errorMessage: TextView
    private lateinit var connectButton: Button
    private lateinit var cancelButton: Button
    private lateinit var loadingIndicator: ProgressBar
    private lateinit var repository: ServerRepository

    // Debouncing for URL validation
    private val validationHandler = Handler(Looper.getMainLooper())
    private var validationRunnable: Runnable? = null
    private val validationDelayMs = 500L

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(Constants.Timeouts.CONNECTION, TimeUnit.MILLISECONDS)
            .readTimeout(Constants.Timeouts.READ, TimeUnit.MILLISECONDS)
            .writeTimeout(Constants.Timeouts.WRITE, TimeUnit.MILLISECONDS)
            .build()
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_add_server, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Initialize repository
        val prefs = AppPreferences.getInstance(requireContext())
        repository = ServerRepository(prefs)

        // Setup views
        serverNameInput = view.findViewById(R.id.server_name_input)
        serverUrlInput = view.findViewById(R.id.server_url_input)
        serverUrlLayout = view.findViewById(R.id.server_url_layout)
        errorMessage = view.findViewById(R.id.error_message)
        connectButton = view.findViewById(R.id.connect_button)
        cancelButton = view.findViewById(R.id.cancel_button)
        loadingIndicator = view.findViewById(R.id.loading_indicator)

        // Setup button listeners
        connectButton.setOnClickListener { onConnectClick() }
        cancelButton.setOnClickListener { onCancelClick() }

        // Debounced URL validation
        serverUrlInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                // Cancel any pending validation
                validationRunnable?.let { validationHandler.removeCallbacks(it) }
                
                // Clear error while typing
                if (s?.isNotBlank() == true) {
                    serverUrlLayout.error = null
                }
            }
            override fun afterTextChanged(s: Editable?) {
                // Schedule validation after delay
                validationRunnable?.let { validationHandler.removeCallbacks(it) }
                validationRunnable = Runnable {
                    validateUrlInput()
                }
                validationHandler.postDelayed(validationRunnable!!, validationDelayMs)
            }
        })
        
        // Validate on focus loss (immediate feedback when leaving field)
        serverUrlInput.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                validationRunnable?.let { validationHandler.removeCallbacks(it) }
                validateUrlInput()
            }
        }
    }

    /**
     * Validates URL input and updates error state.
     */
    private fun validateUrlInput() {
        val url = serverUrlInput.text.toString()
        if (url.isBlank()) {
            serverUrlLayout.error = null
            return
        }

        when (val result = UrlValidator.validate(url)) {
            is UrlValidator.ValidationResult.Success -> {
                serverUrlLayout.error = null
            }
            is UrlValidator.ValidationResult.Error -> {
                serverUrlLayout.error = result.message
            }
        }
    }

    /**
     * Handles Connect button click.
     *
     * Validates inputs, performs health check, and saves server if successful.
     * Also acts as Retry button when health check has previously failed.
     */
    private fun onConnectClick() {
        val name = serverNameInput.text.toString().trim()
        val url = serverUrlInput.text.toString().trim()

        // Clear previous errors and reset to normal state
        hideError()
        serverUrlLayout.error = null
        setRetryState(false)

        // Validate name
        if (name.isBlank()) {
            showError("Please enter a server name")
            return
        }

        // Check for duplicate name
        if (repository.isServerNameExists(name)) {
            showError(Constants.Errors.DUPLICATE_NAME)
            return
        }

        // Validate and normalize URL
        val validationResult = UrlValidator.validate(url)
        if (validationResult is UrlValidator.ValidationResult.Error) {
            showError(validationResult.message)
            return
        }

        val normalizedUrl = (validationResult as UrlValidator.ValidationResult.Success).url

        // Perform health check
        performHealthCheck(name, normalizedUrl)
    }

    /**
     * Performs health check on the server.
     *
     * Makes a GET request to /api/health endpoint.
     * On success: Saves server and navigates back.
     * On failure: Shows error message with retry button.
     */
    private fun performHealthCheck(name: String, url: String) {
        Log.d(Constants.Tags.ADD_SERVER, "Performing health check for $url")

        // Show loading state
        setLoadingState(true)

        lifecycleScope.launch {
            try {
                val isHealthy = withContext(Dispatchers.IO) {
                    checkServerHealth(url)
                }

                withContext(Dispatchers.Main) {
                    setLoadingState(false)

                    if (isHealthy) {
                        onHealthCheckSuccess(name, url)
                    } else {
                        // Server returned non-200 status
                        showError(Constants.Errors.SERVER_NOT_RESPONDING)
                        setRetryState(true)
                    }
                }
            } catch (e: Exception) {
                Log.e(Constants.Tags.ADD_SERVER, "Health check failed", e)
                withContext(Dispatchers.Main) {
                    setLoadingState(false)
                    showError(ErrorHandler.getHealthCheckError(e))
                    setRetryState(true)
                }
            }
        }
    }

    /**
     * Checks if the server is healthy by calling /api/health.
     *
     * @param baseUrl Server base URL
     * @return true if health check succeeds (HTTP 200), false otherwise
     */
    private fun checkServerHealth(baseUrl: String): Boolean {
        return try {
            val url = "$baseUrl${Constants.Api.HEALTH_CHECK}"
            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            val response = httpClient.newCall(request).execute()
            val isSuccessful = response.isSuccessful

            Log.d(Constants.Tags.ADD_SERVER, "Health check response: ${response.code}")
            response.close()

            isSuccessful
        } catch (e: Exception) {
            Log.e(Constants.Tags.ADD_SERVER, "Health check exception", e)
            false
        }
    }

    /**
     * Handles successful health check.
     *
     * Saves the server and navigates back to server list.
     */
    private fun onHealthCheckSuccess(name: String, url: String) {
        try {
            val server = repository.addServer(name, url)
            Log.d(Constants.Tags.ADD_SERVER, "Server added: ${server.id}")

            // Navigate back to server list
            findNavController().popBackStack()
        } catch (e: Exception) {
            Log.e(Constants.Tags.ADD_SERVER, "Failed to save server", e)
            showError("Failed to save server: ${e.message}")
        }
    }

    /**
     * Handles Cancel button click.
     */
    private fun onCancelClick() {
        findNavController().popBackStack()
    }

    /**
     * Sets loading state (disables inputs, shows progress indicator).
     */
    private fun setLoadingState(loading: Boolean) {
        serverNameInput.isEnabled = !loading
        serverUrlInput.isEnabled = !loading
        connectButton.isEnabled = !loading
        cancelButton.isEnabled = !loading
        loadingIndicator.visibility = if (loading) View.VISIBLE else View.GONE

        if (loading) {
            connectButton.text = getString(R.string.add_server_testing)
        } else {
            // Text will be set by setRetryState() if needed
            connectButton.text = getString(R.string.add_server_connect_button)
        }
    }
    
    /**
     * Sets retry state (changes Connect button to Retry).
     * 
     * @param retry true to show as Retry button, false for Connect button
     */
    private fun setRetryState(retry: Boolean) {
        if (retry) {
            connectButton.text = getString(R.string.try_again)
        } else {
            connectButton.text = getString(R.string.add_server_connect_button)
        }
    }

    /**
     * Shows error message.
     */
    private fun showError(message: String) {
        errorMessage.text = message
        errorMessage.visibility = View.VISIBLE
    }

    /**
     * Hides error message.
     */
    private fun hideError() {
        errorMessage.visibility = View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        // Cancel any pending validation to avoid memory leaks
        validationRunnable?.let { validationHandler.removeCallbacks(it) }
        validationRunnable = null
    }
}
