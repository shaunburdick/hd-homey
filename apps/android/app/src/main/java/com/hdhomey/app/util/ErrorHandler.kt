package com.hdhomey.app.util

import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

/**
 * Utility for converting exceptions to user-friendly error messages.
 *
 * Provides context-aware error messages with actionable guidance based on:
 * - Exception type (network, timeout, SSL, etc.)
 * - Operation context (health check, authentication, etc.)
 * - Available recovery options
 *
 * Usage:
 * ```kotlin
 * try {
 *     performHealthCheck()
 * } catch (e: Exception) {
 *     val message = ErrorHandler.getHealthCheckError(e)
 *     showError(message)
 * }
 * ```
 */
object ErrorHandler {

    /**
     * Error context types for more specific messaging.
     */
    enum class Context {
        HEALTH_CHECK,
        AUTHENTICATION,
        CODE_GENERATION,
        AUTHORIZATION_POLLING,
        GENERAL
    }

    /**
     * Get user-friendly error message for health check failures.
     *
     * @param exception The exception that occurred
     * @return Actionable error message
     */
    fun getHealthCheckError(exception: Exception): String {
        return getErrorMessage(exception, Context.HEALTH_CHECK)
    }

    /**
     * Get user-friendly error message for authentication failures.
     *
     * @param exception The exception that occurred
     * @return Actionable error message
     */
    fun getAuthenticationError(exception: Exception): String {
        return getErrorMessage(exception, Context.AUTHENTICATION)
    }

    /**
     * Get user-friendly error message for device code generation.
     *
     * @param exception The exception that occurred
     * @return Actionable error message
     */
    fun getCodeGenerationError(exception: Exception): String {
        return getErrorMessage(exception, Context.CODE_GENERATION)
    }

    /**
     * Get user-friendly error message for authorization polling.
     *
     * @param exception The exception that occurred
     * @return Actionable error message
     */
    fun getPollingError(exception: Exception): String {
        return getErrorMessage(exception, Context.AUTHORIZATION_POLLING)
    }

    /**
     * Get user-friendly error message for general operations.
     *
     * @param exception The exception that occurred
     * @return Actionable error message
     */
    fun getGeneralError(exception: Exception): String {
        return getErrorMessage(exception, Context.GENERAL)
    }

    /**
     * Convert exception to user-friendly message based on context.
     *
     * @param exception The exception that occurred
     * @param context The operation context
     * @return Actionable error message with troubleshooting guidance
     */
    private fun getErrorMessage(exception: Exception, context: Context): String {
        return when (exception) {
            is SocketTimeoutException -> when (context) {
                Context.HEALTH_CHECK -> Constants.Errors.CONNECTION_TIMEOUT
                Context.CODE_GENERATION -> "Code generation timed out. The server might be slow. Try again."
                Context.AUTHORIZATION_POLLING -> "Authorization check timed out. Your network might be slow. Try again."
                else -> Constants.Errors.CONNECTION_TIMEOUT
            }

            is UnknownHostException -> when (context) {
                Context.HEALTH_CHECK -> "Cannot find server at this URL. Check the address and your network connection."
                Context.CODE_GENERATION -> "Cannot reach server. Check the URL and try again."
                Context.AUTHORIZATION_POLLING -> "Lost connection to server. Check your network and try again."
                else -> Constants.Errors.SERVER_UNREACHABLE
            }

            is SSLException -> when (context) {
                Context.HEALTH_CHECK -> "Secure connection failed. The server's security certificate might be invalid."
                else -> "Secure connection error. Check the server's HTTPS configuration."
            }

            is IOException -> when (context) {
                Context.HEALTH_CHECK -> Constants.Errors.SERVER_UNREACHABLE
                Context.CODE_GENERATION -> Constants.Errors.CODE_GENERATION_FAILED
                Context.AUTHORIZATION_POLLING -> Constants.Errors.POLLING_FAILED
                else -> Constants.Errors.NETWORK_ERROR
            }

            else -> when (context) {
                Context.HEALTH_CHECK -> "Health check failed: ${exception.message ?: "Unknown error"}. Try again."
                Context.CODE_GENERATION -> Constants.Errors.CODE_GENERATION_FAILED
                Context.AUTHORIZATION_POLLING -> Constants.Errors.POLLING_FAILED
                Context.AUTHENTICATION -> Constants.Errors.AUTH_FAILED
                else -> Constants.Errors.UNKNOWN_ERROR
            }
        }
    }

    /**
     * Determine if an error is network-related (vs server or authentication error).
     *
     * @param exception The exception to check
     * @return True if error is due to network connectivity
     */
    fun isNetworkError(exception: Exception): Boolean {
        return exception is IOException ||
                exception is SocketTimeoutException ||
                exception is UnknownHostException
    }

    /**
     * Determine if an error is server-related (server returned an error response).
     *
     * @param statusCode HTTP status code (if available)
     * @return True if error is due to server issue
     */
    fun isServerError(statusCode: Int?): Boolean {
        return statusCode != null && statusCode >= 500
    }

    /**
     * Determine if an error is client-related (invalid request, auth failure, etc.).
     *
     * @param statusCode HTTP status code (if available)
     * @return True if error is due to client issue (bad request, auth, etc.)
     */
    fun isClientError(statusCode: Int?): Boolean {
        return statusCode != null && statusCode in 400..499
    }

    /**
     * Get troubleshooting tips for common error scenarios.
     *
     * @param exception The exception that occurred
     * @return List of troubleshooting steps
     */
    fun getTroubleshootingTips(exception: Exception): List<String> {
        return when (exception) {
            is UnknownHostException -> listOf(
                "Verify the server URL is correct",
                "Check if your device is connected to the network",
                "Make sure the server is running",
                "Try using the server's IP address instead of hostname"
            )

            is SocketTimeoutException -> listOf(
                "Check your network connection speed",
                "Verify the server is running and responsive",
                "Try again in a moment"
            )

            is SSLException -> listOf(
                "Check if the server's HTTPS certificate is valid",
                "Try using http:// instead of https:// for testing",
                "Contact your server administrator"
            )

            is IOException -> listOf(
                "Check your network connection",
                "Verify the server URL and port",
                "Make sure the server is running"
            )

            else -> listOf(
                "Check your connection and try again",
                "Verify the server is running",
                "Contact support if the problem persists"
            )
        }
    }
}
