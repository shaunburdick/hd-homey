package com.hdhomey.app.data.repository

import com.hdhomey.app.storage.TokenDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for JWT token operations.
 *
 * Phase 2: Channel Browsing & Streaming
 * - Manages JWT token storage and retrieval
 * - Provides Flow-based reactive token access
 * - Handles token lifecycle (save, get, clear, refresh)
 *
 * Architecture:
 * - Data layer abstraction over TokenDataStore
 * - Used by AuthInterceptor to add tokens to API requests
 * - Used by ViewModels/Use Cases for authentication state
 *
 * Future Enhancement (Phase 3+):
 * - Implement automatic token refresh before expiration
 * - Add token validation (expiry check, signature verification)
 * - Implement secure token rotation
 * - Add refresh token support
 *
 * @see com.hdhomey.app.storage.TokenDataStore
 * @see com.hdhomey.app.api.interceptors.AuthInterceptor
 */
@Singleton
class TokenRepository @Inject constructor(
    private val tokenDataStore: TokenDataStore
) {
    /**
     * Saves JWT token.
     *
     * Stores the token securely in DataStore.
     * Overwrites any existing token.
     *
     * @param token JWT token string
     */
    suspend fun saveToken(token: String) {
        tokenDataStore.saveToken(token)
    }

    /**
     * Gets JWT token as Flow.
     *
     * Reactive stream that emits whenever the token changes.
     * Emits null if no token is stored.
     *
     * Use this in ViewModels for reactive authentication state.
     *
     * @return Flow of JWT token (or null)
     */
    fun getTokenFlow(): Flow<String?> {
        return tokenDataStore.getToken()
    }

    /**
     * Gets JWT token synchronously.
     *
     * Blocking call - use only when necessary (e.g., in interceptors).
     * Prefer getTokenFlow() for reactive use cases.
     *
     * @return JWT token string, or null if not stored
     */
    suspend fun getToken(): String? {
        return tokenDataStore.getToken().first()
    }

    /**
     * Checks if a valid token exists.
     *
     * @return true if token is stored
     */
    suspend fun hasToken(): Boolean {
        return getToken() != null
    }

    /**
     * Clears stored JWT token.
     *
     * Used for logout or re-authentication.
     */
    suspend fun clearToken() {
        tokenDataStore.clearToken()
    }

    /**
     * Saves the active server ID.
     *
     * Associates the current token with a specific server.
     * Useful for multi-server support.
     *
     * @param serverId Server ID to associate
     */
    suspend fun saveActiveServerId(serverId: String) {
        tokenDataStore.saveActiveServerId(serverId)
    }

    /**
     * Gets the active server ID as Flow.
     *
     * @return Flow of active server ID (or null)
     */
    fun getActiveServerIdFlow(): Flow<String?> {
        return tokenDataStore.getActiveServerId()
    }

    /**
     * Gets the active server ID synchronously.
     *
     * @return Active server ID, or null
     */
    suspend fun getActiveServerId(): String? {
        return tokenDataStore.getActiveServerId().first()
    }

    /**
     * Clears all token-related data.
     *
     * Complete logout - removes token and server association.
     */
    suspend fun clearAll() {
        tokenDataStore.clearAll()
    }

    /**
     * Refreshes the JWT token (placeholder for Phase 3+).
     *
     * Future implementation:
     * - Call refresh token API endpoint
     * - Validate new token
     * - Save new token to DataStore
     * - Return success/failure
     *
     * @return Result with new token or error
     */
    suspend fun refreshToken(): Result<String> {
        // TODO: Implement token refresh in Phase 3
        // - Call POST /api/auth/refresh with current token
        // - Parse response for new token
        // - Save new token
        // - Return Result.success(newToken) or Result.failure(error)
        return Result.failure(NotImplementedError("Token refresh not implemented yet"))
    }
}
