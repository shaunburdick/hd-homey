package com.hdhomey.app.storage

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.hdhomey.app.data.model.Server
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Top-level extension property that creates a single DataStore instance per application context.
 *
 * Declared at file scope (not inside the class) so that the [preferencesDataStore] delegate
 * enforces the singleton contract enforced by DataStore — only one instance per name is allowed
 * per process, and the delegate guarantees that.
 */
private val Context.appDataStore: DataStore<Preferences> by preferencesDataStore(
    name = AppPreferences.PREFS_NAME
)

/**
 * Manages persistent application preferences using DataStore Preferences.
 *
 * Handles storage and retrieval of:
 * - List of configured servers (JSON serialisation)
 * - Currently active server ID
 * - Other app-wide settings
 *
 * **API compatibility**: All public methods remain synchronous (returning values directly) so
 * that call-sites written against the original SharedPreferences implementation continue to
 * compile without changes.  Internally each operation delegates to a `suspend` helper and
 * bridges to the calling thread via [runBlocking].
 *
 * **Thread-safety**: DataStore serialises writes internally; the [runBlocking] bridge makes
 * each call blocking on the calling thread but does not introduce data races.
 *
 * **Singleton**: Use [getInstance] to obtain the shared application-scoped instance.
 */
class AppPreferences(context: Context) {

    private val dataStore: DataStore<Preferences> = context.applicationContext.appDataStore

    private val json = Json {
        prettyPrint = false
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    // -------------------------------------------------------------------------
    // Private suspend helpers — actual DataStore operations live here
    // -------------------------------------------------------------------------

    /**
     * Suspend implementation of server persistence.
     *
     * @param servers List of [Server] objects to serialise and store.
     * @return `true` if the write completed without error.
     */
    private suspend fun saveServersInternal(servers: List<Server>): Boolean {
        return try {
            val jsonString = json.encodeToString(servers)
            dataStore.edit { prefs ->
                prefs[KEY_SERVERS] = jsonString
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save servers", e)
            false
        }
    }

    /**
     * Suspend implementation of server loading.
     *
     * @return Deserialised list of [Server] objects, or an empty list on missing/corrupt data.
     */
    private suspend fun loadServersInternal(): List<Server> {
        return try {
            val jsonString = dataStore.data
                .map { prefs -> prefs[KEY_SERVERS] }
                .first()
                ?: return emptyList()
            json.decodeFromString<List<Server>>(jsonString)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load servers", e)
            emptyList()
        }
    }

    /**
     * Suspend implementation for persisting the active server ID.
     *
     * @param serverId Server ID to mark as active, or `null` to clear the selection.
     * @return `true` if the write completed without error.
     */
    private suspend fun setActiveServerIdInternal(serverId: String?): Boolean {
        return try {
            dataStore.edit { prefs ->
                if (serverId != null) {
                    prefs[KEY_ACTIVE_SERVER_ID] = serverId
                } else {
                    prefs.remove(KEY_ACTIVE_SERVER_ID)
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set active server ID", e)
            false
        }
    }

    /**
     * Suspend implementation for reading the active server ID.
     *
     * @return The stored server ID, or `null` if none is set.
     */
    private suspend fun getActiveServerIdInternal(): String? {
        return try {
            dataStore.data
                .map { prefs -> prefs[KEY_ACTIVE_SERVER_ID] }
                .first()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get active server ID", e)
            null
        }
    }

    /**
     * Suspend implementation of full data store wipe.
     *
     * @return `true` if the clear completed without error.
     */
    private suspend fun clearAllInternal(): Boolean {
        return try {
            dataStore.edit { prefs -> prefs.clear() }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear all preferences", e)
            false
        }
    }

    /**
     * Suspend implementation to clear only the active server selection.
     *
     * @return `true` if the remove completed without error.
     */
    private suspend fun clearActiveServerInternal(): Boolean {
        return try {
            dataStore.edit { prefs -> prefs.remove(KEY_ACTIVE_SERVER_ID) }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear active server", e)
            false
        }
    }

    // -------------------------------------------------------------------------
    // Public synchronous API  (preserved for backward compatibility)
    // -------------------------------------------------------------------------

    /**
     * Saves the list of servers to DataStore.
     *
     * Serialises the entire list to JSON and stores it as a single string.
     * Suitable for small-to-medium lists (~10–50 servers).
     *
     * @param servers List of [Server] objects to save.
     * @return `true` if the save was successful.
     */
    fun saveServers(servers: List<Server>): Boolean =
        runBlocking { saveServersInternal(servers) }

    /**
     * Loads the list of servers from DataStore.
     *
     * Deserialises the JSON string back to a list of [Server] objects.
     *
     * @return List of [Server] objects, or an empty list if none saved or on parse error.
     */
    fun loadServers(): List<Server> =
        runBlocking { loadServersInternal() }

    /**
     * Sets the currently active server ID.
     *
     * The active server is the one the user most recently selected or authenticated with.
     *
     * @param serverId Server ID to set as active, or `null` to clear.
     * @return `true` if the save was successful.
     */
    fun setActiveServerId(serverId: String?): Boolean =
        runBlocking { setActiveServerIdInternal(serverId) }

    /**
     * Gets the currently active server ID.
     *
     * @return Active server ID, or `null` if none is set.
     */
    fun getActiveServerId(): String? =
        runBlocking { getActiveServerIdInternal() }

    /**
     * Checks if this is the first launch of the app.
     *
     * Used to determine whether to show onboarding or skip to server list.
     *
     * @return `true` if no servers are configured (first launch).
     */
    fun isFirstLaunch(): Boolean = loadServers().isEmpty()

    /**
     * Clears all stored data.
     *
     * Useful for logout, reset, or testing scenarios.
     *
     * @return `true` if the clear was successful.
     */
    fun clearAll(): Boolean = runBlocking { clearAllInternal() }

    /**
     * Clears only the active server ID.
     *
     * Keeps server configurations intact but resets the selection.
     *
     * @return `true` if the clear was successful.
     */
    fun clearActiveServer(): Boolean = runBlocking { clearActiveServerInternal() }

    companion object {
        internal const val PREFS_NAME = "hd_homey_prefs"
        private const val TAG = "AppPreferences"

        // DataStore preference keys
        private val KEY_SERVERS = stringPreferencesKey("servers")
        private val KEY_ACTIVE_SERVER_ID = stringPreferencesKey("active_server_id")

        @Volatile
        private var INSTANCE: AppPreferences? = null

        /**
         * Gets the singleton instance, creating it if necessary.
         *
         * Thread-safe via double-checked locking.
         *
         * @param context Any [Context]; [applicationContext] is used internally to prevent leaks.
         * @return The application-scoped [AppPreferences] singleton.
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
