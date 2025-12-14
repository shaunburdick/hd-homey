package com.hdhomey.app.storage

import android.content.Context
import android.content.SharedPreferences
import com.hdhomey.app.data.model.Server
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.builtins.ListSerializer

/**
 * Manages persistent application preferences using SharedPreferences.
 *
 * Handles storage and retrieval of:
 * - List of configured servers (JSON serialization)
 * - Currently active server ID
 * - Other app-wide settings
 *
 * Thread-safe: All write operations use commit() synchronously.
 * For large datasets, consider using Room database instead.
 */
class AppPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    private val json = Json {
        prettyPrint = false
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    /**
     * Saves the list of servers to SharedPreferences.
     *
     * Serializes the entire list to JSON and stores it as a single string.
     * This is suitable for small-to-medium lists (~10-50 servers).
     *
     * @param servers List of Server objects to save
     * @return true if save was successful
     */
    fun saveServers(servers: List<Server>): Boolean {
        return try {
            val json = json.encodeToString(servers)
            prefs.edit()
                .putString(KEY_SERVERS, json)
                .commit()
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to save servers", e)
            false
        }
    }

    /**
     * Loads the list of servers from SharedPreferences.
     *
     * Deserializes the JSON string back to a list of Server objects.
     *
     * @return List of Server objects, or empty list if none saved or parse error
     */
    fun loadServers(): List<Server> {
        return try {
            val jsonString = prefs.getString(KEY_SERVERS, null) ?: return emptyList()
            json.decodeFromString<List<Server>>(jsonString)
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to load servers", e)
            emptyList()
        }
    }

    /**
     * Sets the currently active server ID.
     *
     * The active server is the one the user most recently selected or authenticated with.
     *
     * @param serverId Server ID to set as active, or null to clear
     * @return true if save was successful
     */
    fun setActiveServerId(serverId: String?): Boolean {
        return prefs.edit()
            .putString(KEY_ACTIVE_SERVER_ID, serverId)
            .commit()
    }

    /**
     * Gets the currently active server ID.
     *
     * @return Active server ID, or null if none set
     */
    fun getActiveServerId(): String? {
        return prefs.getString(KEY_ACTIVE_SERVER_ID, null)
    }

    /**
     * Checks if this is the first launch of the app.
     *
     * Used to determine whether to show onboarding or skip to server list.
     *
     * @return true if first launch (no servers configured)
     */
    fun isFirstLaunch(): Boolean {
        return loadServers().isEmpty()
    }

    /**
     * Clears all stored data.
     *
     * Useful for logout, reset, or testing scenarios.
     *
     * @return true if clear was successful
     */
    fun clearAll(): Boolean {
        return prefs.edit().clear().commit()
    }

    /**
     * Clears only the active server ID.
     *
     * Keeps server configurations but resets selection.
     *
     * @return true if clear was successful
     */
    fun clearActiveServer(): Boolean {
        return prefs.edit().remove(KEY_ACTIVE_SERVER_ID).commit()
    }

    companion object {
        private const val TAG = "AppPreferences"
        private const val PREFS_NAME = "hd_homey_prefs"
        private const val KEY_SERVERS = "servers"
        private const val KEY_ACTIVE_SERVER_ID = "active_server_id"

        /**
         * Singleton instance for app-wide access.
         *
         * Initialize once in Application class or MainActivity.
         */
        @Volatile
        private var INSTANCE: AppPreferences? = null

        /**
         * Gets the singleton instance, creating it if necessary.
         *
         * Thread-safe double-checked locking.
         *
         * @param context Application context (will use applicationContext)
         * @return AppPreferences singleton instance
         */
        fun getInstance(context: Context): AppPreferences {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AppPreferences(context.applicationContext).also {
                    INSTANCE = it
                }
            }
        }
    }
}
