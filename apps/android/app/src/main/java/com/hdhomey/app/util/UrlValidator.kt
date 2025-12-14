package com.hdhomey.app.util

import java.net.URL

/**
 * Utility object for validating and normalizing server URLs.
 *
 * Ensures URLs are properly formatted for HTTP/HTTPS connections,
 * with flexible handling of user input (auto-prepending http:// if missing).
 */
object UrlValidator {

    /**
     * Validates and normalizes a server URL.
     *
     * Performs the following:
     * - Trims whitespace
     * - Auto-prepends "http://" if no protocol specified
     * - Validates URL format (host, optional port, optional path)
     * - Ensures protocol is http:// or https://
     * - Removes trailing slashes
     *
     * @param url User-provided URL string
     * @return ValidationResult with normalized URL or error message
     */
    fun validate(url: String): ValidationResult {
        val trimmed = url.trim()

        if (trimmed.isEmpty()) {
            return ValidationResult.Error("URL cannot be empty")
        }

        // Auto-prepend http:// if no protocol specified
        val withProtocol = if (!trimmed.contains("://")) {
            "http://$trimmed"
        } else {
            trimmed
        }

        // Parse URL
        val parsedUrl = try {
            URL(withProtocol)
        } catch (e: Exception) {
            return ValidationResult.Error("Invalid URL format: ${e.message}")
        }

        // Validate protocol
        if (parsedUrl.protocol !in listOf("http", "https")) {
            return ValidationResult.Error("Only HTTP and HTTPS protocols are supported")
        }

        // Validate host
        if (parsedUrl.host.isNullOrEmpty()) {
            return ValidationResult.Error("URL must include a host (e.g., 192.168.1.100 or example.com)")
        }

        // Reconstruct normalized URL (remove trailing slashes, unnecessary parts)
        val normalized = buildString {
            append(parsedUrl.protocol)
            append("://")
            append(parsedUrl.host)
            if (parsedUrl.port != -1 && parsedUrl.port != parsedUrl.defaultPort) {
                append(":")
                append(parsedUrl.port)
            }
            if (!parsedUrl.path.isNullOrEmpty() && parsedUrl.path != "/") {
                append(parsedUrl.path.trimEnd('/'))
            }
        }

        return ValidationResult.Success(normalized)
    }

    /**
     * Quick check if a URL is valid.
     *
     * @param url URL string to check
     * @return true if valid, false otherwise
     */
    fun isValid(url: String): Boolean {
        return validate(url) is ValidationResult.Success
    }

    /**
     * Extracts the display name from a URL (host + port if non-standard).
     *
     * Useful for suggesting server names.
     *
     * Example: "http://192.168.1.100:3000" → "192.168.1.100:3000"
     *
     * @param url Valid URL string
     * @return Display name, or empty string if invalid
     */
    fun getDisplayName(url: String): String {
        return try {
            val parsedUrl = URL(if (!url.contains("://")) "http://$url" else url)
            buildString {
                append(parsedUrl.host)
                if (parsedUrl.port != -1 && parsedUrl.port != parsedUrl.defaultPort) {
                    append(":")
                    append(parsedUrl.port)
                }
            }
        } catch (e: Exception) {
            ""
        }
    }

    /**
     * Result of URL validation.
     */
    sealed class ValidationResult {
        /**
         * URL is valid.
         *
         * @property url Normalized URL string
         */
        data class Success(val url: String) : ValidationResult()

        /**
         * URL is invalid.
         *
         * @property message Human-readable error message
         */
        data class Error(val message: String) : ValidationResult()
    }
}
