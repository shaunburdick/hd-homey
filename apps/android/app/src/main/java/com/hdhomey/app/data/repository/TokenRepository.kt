package com.hdhomey.app.data.repository

import com.hdhomey.app.storage.TokenDataStore
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for JWT session token operations.
 *
 * Provides a clean API for reading, saving, and clearing the Better-Auth
 * session token used for API authentication. Delegates persistence to
 * TokenDataStore (encrypted DataStore).
 *
 * **Note:** With the introduction of per-server API clients in Phase 2, the
 * session token is now stored in each [Server.jwt] field rather than in a
 * global token store. This repository is retained for backward compatibility
 * with the device-code authentication flow and may be removed in a future
 * cleanup.
 */
@Singleton
class TokenRepository @Inject constructor(
    private val tokenDataStore: TokenDataStore
) {
    /**
     * Observable stream of the current token.
     * Emits null when no token is stored or on logout.
     */
    val token: Flow<String?> = tokenDataStore.token

    /**
     * Persists a new session token.
     */
    suspend fun saveToken(token: String) {
        tokenDataStore.saveToken(token)
    }

    /**
     * Clears the session token — used on logout or re-auth.
     */
    suspend fun clearToken() {
        tokenDataStore.clearToken()
    }

    /**
     * Synchronous read of the current token.
     * Used by AuthInterceptor (OkHttp interceptor runs on OkHttp's thread, not coroutine).
     */
    fun getTokenSync(): String? {
        return tokenDataStore.getTokenSync()
    }

    /**
     * Returns true if a token is currently stored.
     */
    fun hasToken(): Boolean {
        return getTokenSync() != null
    }
}
