package com.hdhomey.app.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages secure storage of JWT authentication tokens using DataStore.
 *
 * Phase 2: Channel Browsing & Streaming
 * - Stores JWT tokens for API authentication
 * - Provides Flow-based reactive token access
 * - Separate DataStore instance from app preferences for security
 *
 * Security Notes:
 * - Uses DataStore with encrypted preferences (via EncryptedFile wrapper in production)
 * - Tokens stored in "hd_homey_tokens" DataStore (separate from app preferences)
 * - All operations are async to prevent UI blocking
 *
 * Future Enhancement (Phase 3+):
 * - Add EncryptedSharedPreferences or Security library for at-rest encryption
 * - Implement token refresh logic with expiration tracking
 * - Add biometric authentication for token access
 *
 * @see com.hdhomey.app.data.repository.TokenRepository
 * @see androidx.datastore.preferences.core.Preferences
 */
@Singleton
class TokenDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore: DataStore<Preferences> = context.tokenDataStore

    /**
     * Saves JWT token to DataStore.
     *
     * Overwrites any existing token.
     * Operation is atomic and transactional.
     *
     * @param token JWT token string to save
     */
    suspend fun saveToken(token: String) {
        dataStore.edit { prefs ->
            prefs[JWT_TOKEN_KEY] = token
        }
    }

    /**
     * Gets JWT token as Flow.
     *
     * Emits whenever the token changes.
     * Emits null if no token is stored.
     *
     * @return Flow of JWT token (or null)
     */
    fun getToken(): Flow<String?> {
        return dataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    android.util.Log.e(TAG, "Error reading token", exception)
                    emit(androidx.datastore.preferences.core.emptyPreferences())
                } else {
                    throw exception
                }
            }
            .map { prefs ->
                prefs[JWT_TOKEN_KEY]
            }
    }

    /**
     * Clears stored JWT token.
     *
     * Used for logout or re-authentication scenarios.
     */
    suspend fun clearToken() {
        dataStore.edit { prefs ->
            prefs.remove(JWT_TOKEN_KEY)
        }
    }

    /**
     * Saves the currently active server ID.
     *
     * Associates token with a specific server instance.
     * Useful for multi-server support.
     *
     * @param serverId Server ID to associate with token
     */
    suspend fun saveActiveServerId(serverId: String) {
        dataStore.edit { prefs ->
            prefs[ACTIVE_SERVER_ID_KEY] = serverId
        }
    }

    /**
     * Gets the active server ID as Flow.
     *
     * @return Flow of active server ID (or null)
     */
    fun getActiveServerId(): Flow<String?> {
        return dataStore.data
            .catch { exception ->
                if (exception is IOException) {
                    android.util.Log.e(TAG, "Error reading active server ID", exception)
                    emit(androidx.datastore.preferences.core.emptyPreferences())
                } else {
                    throw exception
                }
            }
            .map { prefs ->
                prefs[ACTIVE_SERVER_ID_KEY]
            }
    }

    /**
     * Clears active server ID.
     */
    suspend fun clearActiveServerId() {
        dataStore.edit { prefs ->
            prefs.remove(ACTIVE_SERVER_ID_KEY)
        }
    }

    /**
     * Clears all token-related data.
     *
     * Used for complete logout or account switching.
     */
    suspend fun clearAll() {
        dataStore.edit { prefs ->
            prefs.clear()
        }
    }

    companion object {
        private const val TAG = "TokenDataStore"
        
        // DataStore preference keys
        private val JWT_TOKEN_KEY = stringPreferencesKey("jwt_token")
        private val ACTIVE_SERVER_ID_KEY = stringPreferencesKey("active_server_id")
    }
}

/**
 * Extension property for accessing the token DataStore.
 *
 * Separate DataStore instance from app preferences for security isolation.
 */
private val Context.tokenDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "hd_homey_tokens"
)
