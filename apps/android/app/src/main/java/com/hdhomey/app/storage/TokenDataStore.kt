package com.hdhomey.app.storage

import android.content.Context
import androidx.datastore.preferences.core.edit
import dagger.hilt.android.qualifiers.ApplicationContext
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Top-level DataStore delegate for token storage.
 *
 * Must be declared at file scope — the [preferencesDataStore] delegate only works as a
 * top-level Kotlin property extension on [Context], not as a class member.
 * Stored in a separate file ("hd_homey_tokens") from app preferences for security
 * isolation: if preferences are ever inspected or shared, session tokens remain in
 * their own file.
 */
private val Context.tokenStore by preferencesDataStore(name = TOKEN_STORE_NAME)

/** DataStore file name for the token storage. Shared with [TokenDataStore] companion. */
internal const val TOKEN_STORE_NAME = "hd_homey_tokens"

/**
 * Manages JWT session token persistence using DataStore.
 *
 * Stores the Better-Auth session token used for API authentication. The token is kept
 * in a separate DataStore file from general app preferences ([AppPreferences]) for
 * security isolation: compromising the prefs file does not expose auth tokens and
 * vice-versa.
 *
 * **Storage security model (Phase 2)**
 * DataStore files live in the app's private data directory (`/data/data/<pkg>/`), which
 * Android sandboxes at the OS level. This is equivalent protection to
 * [android.content.SharedPreferences]. Future phases can layer
 * EncryptedDataStore (Jetpack Security) on top for defence-in-depth on rooted devices.
 *
 * **Thread safety**: All suspend operations are coroutine-safe. [getTokenSync] uses
 * [runBlocking] and is intended only for non-coroutine contexts (e.g., OkHttp
 * interceptors). Avoid calling it from a coroutine or the main thread.
 */
@Singleton
class TokenDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {

    /**
     * Reactive stream of the current session token.
     *
     * Emits the stored token string, or `null` when no token is present (e.g., after
     * [clearToken] or on first launch). Consumers can collect this flow to react to
     * login/logout events without polling.
     */
    val token: Flow<String?> = context.tokenStore.data.map { prefs ->
        prefs[KEY_SESSION_TOKEN]
    }

    /**
     * Persists a new session token.
     *
     * Replaces any previously stored token. Called after a successful authentication
     * response from the HD Homey server.
     *
     * @param token The raw JWT / session-cookie value returned by Better-Auth.
     */
    suspend fun saveToken(token: String) {
        context.tokenStore.edit { prefs ->
            prefs[KEY_SESSION_TOKEN] = token
        }
    }

    /**
     * Removes the stored session token.
     *
     * Called on explicit logout or when the server returns 401 and re-authentication
     * is required. After this call, [token] will emit `null`.
     */
    suspend fun clearToken() {
        context.tokenStore.edit { prefs ->
            prefs.remove(KEY_SESSION_TOKEN)
        }
    }

    /**
     * Returns the current token synchronously.
     *
     * Designed for use from non-coroutine contexts such as OkHttp [okhttp3.Interceptor]
     * implementations where suspending is not possible. Internally uses [runBlocking]
     * to bridge the coroutine boundary — **do not call from a coroutine or the main
     * thread** as it will block the caller until the DataStore read completes.
     *
     * @return The stored session token, or `null` if none is present.
     */
    fun getTokenSync(): String? = runBlocking {
        context.tokenStore.data.first()[KEY_SESSION_TOKEN]
    }

    companion object {
        private val KEY_SESSION_TOKEN = stringPreferencesKey("session_token")
    }
}
