package com.hdhomey.app.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Helper for checking network connectivity status.
 *
 * Provides methods to check if the device has an active network connection,
 * useful for pre-checking before making API calls or streaming requests.
 *
 * ## Usage
 *
 * ```kotlin
 * @Inject lateinit var networkHelper: NetworkConnectivityHelper
 *
 * if (!networkHelper.isNetworkAvailable()) {
 *     showError("No internet connection")
 *     return
 * }
 * ```
 *
 * ## Thread Safety
 *
 * All methods are thread-safe and can be called from any thread.
 * ConnectivityManager is provided by the Android framework and handles
 * synchronization internally.
 *
 * @property context Application context for accessing system services
 */
@Singleton
class NetworkConnectivityHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    private val connectivityManager: ConnectivityManager by lazy {
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    /**
     * Check if the device has an active network connection.
     *
     * Returns true if the device is connected to a network with internet capability.
     * This checks for both WiFi and cellular connections.
     *
     * Note: This only checks if a network connection exists, not if the internet
     * is actually reachable. For full reachability testing, you'd need to make
     * a network request.
     *
     * @return true if network is available, false otherwise
     */
    fun isNetworkAvailable(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        // Check if network has internet capability
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    /**
     * Check if the device is connected to WiFi.
     *
     * Useful for streaming scenarios where you might want to warn users
     * if they're not on WiFi (to avoid cellular data usage).
     *
     * @return true if connected to WiFi, false otherwise
     */
    fun isWifiConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }

    /**
     * Check if the device is connected to cellular data.
     *
     * @return true if connected to cellular, false otherwise
     */
    fun isCellularConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
    }

    /**
     * Get a user-friendly description of the current network status.
     *
     * @return Human-readable network status (e.g., "WiFi", "Cellular", "No connection")
     */
    fun getNetworkStatusDescription(): String {
        return when {
            isWifiConnected() -> "WiFi"
            isCellularConnected() -> "Cellular"
            else -> "No connection"
        }
    }
}
