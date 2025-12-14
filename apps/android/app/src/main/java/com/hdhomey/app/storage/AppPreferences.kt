package com.hdhomey.app.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.hdhomey.app.data.model.Server
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages persistent application preferences using DataStore.
 *
 * Migrated from SharedPreferences to DataStore for Phase 2.
 * Provides both synchronous (backward compatible) and async (Flow-based) APIs.
 *
 * Handles storage and retrieval of:
 * - List of configured servers (JSON serialization)
 * - Currently active server ID
 * - Other app-wide settings
 *
 * Thread-safe: DataStore handles all synchronization internally.
 * All writes are transactional and atomic.
 *
 * Migration: Data from SharedPreferences is automatically migrated
 * on first access via SharedPreferencesMigration.
 *
 * Phase 2: Injected via Hilt for dependency injection.
 *
 * @see androidx.datastore.preferences.core.Preferences
 */
@Singleton
class AppPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    private val json = Json {
        prettyPrint = false
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    /**
     * Saves the list of servers to DataStore.
     *
     * Serializes the entire list to JSON and stores it as a single string.
     * This is suitable for small-to-medium lists (~10-50 servers).
     *
     * Synchronous API for backward compatibility with Phase 1 code.
     * Use saveServersAsync() for non-blocking operation.
     *
     * @param servers List of Server objects to save
     * @return true if save was successful
     */
    fun saveServers(servers: List<Server>): Boolean {
        return try {
            runBlocking {
                saveServersAsync(servers)
            }
            true
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to save servers", e)
            false
        }
    }

    /**
     * Saves servers asynchronously (recommended for Phase 2+).
     *
     * @param servers List of Server objects to save
     */
    suspend fun saveServersAsync(servers: List<Server>) {
        val jsonString = json.encodeToString(servers)
        dataStore.edit { prefs ->
            prefs[KEY_SERVERS] = jsonString
        }
    }

    /**
     * Loads the list of servers from DataStore.
     *
     * Deserializes the JSON string back to a list of Server objects.
     *
     * Synchronous API for backward compatibility with Phase 1 code.
     * Use loadServersFlow() for reactive Flow-based operation.
     *
     * @return List of Server objects, or empty list if none saved or parse error
     */
    fun loadServers(): List<Server> {
        return try {
            runBlocking {
                loadServersFlow().first()
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to load servers", e)
            emptyList()
        }
    }

    /**
     * Loads servers as Flow (recommended for Phase 2+).
     *
     * Reactive stream that emits whenever servers change.
     *
     * @return Flow of server lists
     */
    fun loadServersFlow(): Flow<List<Server>> {
        return dataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    android.util.Log.e(TAG, "Error reading preferences", exception)
                    emit(androidx.datastore.preferences.core.emptyPreferences())
                } else {
                    throw exception
                }
            }
            .map { prefs ->
                val jsonString = prefs[KEY_SERVERS]
                if (jsonString != null) {
                    try {
                        json.decodeFromString<List<Server>>(jsonString)
                    } catch (e: Exception) {
                        android.util.Log.e(TAG, "Failed to parse servers JSON", e)
                        emptyList()
                    }
                } else {
                    emptyList()
                }
            }
    }

    /**
     * Sets the currently active server ID.
     *
     * The active server is the one the user most recently selected or authenticated with.
     *
     * Synchronous API for backward compatibility.
     *
     * @param serverId Server ID to set as active, or null to clear
     * @return true if save was successful
     */
    fun setActiveServerId(serverId: String?): Boolean {
        return try {
            runBlocking {
                setActiveServerIdAsync(serverId)
            }
            true
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to set active server ID", e)
            false
        }
    }

    /**
     * Sets active server ID asynchronously (recommended for Phase 2+).
     *
     * @param serverId Server ID to set as active, or null to clear
     */
    suspend fun setActiveServerIdAsync(serverId: String?) {
        dataStore.edit { prefs ->
            if (serverId != null) {
                prefs[KEY_ACTIVE_SERVER_ID] = serverId
            } else {
                prefs.remove(KEY_ACTIVE_SERVER_ID)
            }
        }
    }

    /**
     * Gets the currently active server ID.
     *
     * Synchronous API for backward compatibility.
     *
     * @return Active server ID, or null if none set
     */
    fun getActiveServerId(): String? {
        return try {
            runBlocking {
                getActiveServerIdFlow().first()
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to get active server ID", e)
            null
        }
    }

    /**
     * Gets active server ID as Flow (recommended for Phase 2+).
     *
     * @return Flow of active server ID (or null)
     */
    fun getActiveServerIdFlow(): Flow<String?> {
        return dataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    android.util.Log.e(TAG, "Error reading preferences", exception)
                    emit(androidx.datastore.preferences.core.emptyPreferences())
                } else {
                    throw exception
                }
            }
            .map { prefs ->
                prefs[KEY_ACTIVE_SERVER_ID]
            }
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
     * Synchronous API for backward compatibility.
     *
     * @return true if clear was successful
     */
    fun clearAll(): Boolean {
        return try {
            runBlocking {
                clearAllAsync()
            }
            true
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to clear preferences", e)
            false
        }
    }

    /**
     * Clears all data asynchronously (recommended for Phase 2+).
     */
    suspend fun clearAllAsync() {
        dataStore.edit { prefs ->
            prefs.clear()
        }
    }

    /**
     * Clears only the active server ID.
     *
     * Keeps server configurations but resets selection.
     *
     * Synchronous API for backward compatibility.
     *
     * @return true if clear was successful
     */
    fun clearActiveServer(): Boolean {
        return try {
            runBlocking {
                clearActiveServerAsync()
            }
            true
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to clear active server", e)
            false
        }
    }

    /**
     * Clears active server asynchronously (recommended for Phase 2+).
     */
    suspend fun clearActiveServerAsync() {
        dataStore.edit { prefs ->
            prefs.remove(KEY_ACTIVE_SERVER_ID)
        }
    }

    companion object {
        private const val TAG = "AppPreferences"
        
        // DataStore preference keys
        private val KEY_SERVERS = stringPreferencesKey("servers")
        private val KEY_ACTIVE_SERVER_ID = stringPreferencesKey("active_server_id")

        /**
         * Legacy singleton support for Phase 1 code.
         * 
         * Note: In Phase 2, prefer Hilt injection:
         * ```kotlin
         * @Inject lateinit var appPreferences: AppPreferences
         * ```
         *
         * This method is maintained for backward compatibility during migration.
         */
        @Volatile
        private var INSTANCE: AppPreferences? = null

        /**
         * Gets the singleton instance (legacy method).
         *
         * For Phase 2 code, use Hilt injection instead.
         *
         * @param context Application context
         * @return AppPreferences instance
         */
        fun getInstance(context: Context): AppPreferences {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AppPreferences(context.preferencesDataStore).also {
                    INSTANCE = it
                }
            }
        }
    }
}

/**
 * Extension property for accessing the preferences DataStore.
 *
 * Automatically migrates data from SharedPreferences on first access.
 */
private val Context.preferencesDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "hd_homey_prefs"
)
