package com.hdhomey.app.data.provider

import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.repository.ServerRepository
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory holder for the currently active HD Homey server.
 *
 * Provides a fast, atomic source of truth for "which server is active right now"
 * without hitting [AppPreferences] / DataStore on every API call. The in-memory
 * value is updated on server switch and falls back to [ServerRepository] on first
 * access (cold start).
 *
 * ## Why this exists
 *
 * Previously, the active server was read from [AppPreferences] synchronously via
 * [ServerRepository.getActiveServer], which internally calls [runBlocking] on
 * DataStore. The [CurrentServerProvider] avoids that blocking read on the API
 * hot path by caching the active server in memory.
 *
 * ## Thread safety
 *
 * All mutations go through an `@Volatile` field and are atomic. Reads are
 * lock-free. The [switchToServer] method first persists to the repository, then
 * updates the in-memory field — if the persistence fails, the field is NOT
 * updated and the caller receives `false`.
 *
 * @property serverRepository Repository that persists server configuration.
 */
@Singleton
class CurrentServerProvider @Inject constructor(
    private val serverRepository: ServerRepository
) {

    @Volatile
    private var activeServer: Server? = null

    /**
     * Returns the currently active [Server], or `null` if none is set.
     *
     * On first call (cold start), falls back to the repository. Subsequent
     * calls return the in-memory value without hitting DataStore.
     */
    fun getActiveServer(): Server? {
        val cached = activeServer
        if (cached != null) return cached
        return serverRepository.getActiveServer().also { activeServer = it }
    }

    /**
     * Returns the URL of the active server, or `null`.
     *
     * Convenience shortcut for [getActiveServer]?.url.
     */
    fun getActiveServerUrl(): String? = getActiveServer()?.url

    /**
     * Returns the JWT of the active server, or `null`.
     *
     * Convenience shortcut for [getActiveServer]?.jwt.
     */
    fun getActiveServerJwt(): String? = getActiveServer()?.jwt

    /**
     * Switches the active server to the one identified by [serverId].
     *
     * 1. Persists the change via [ServerRepository.setActiveServer].
     * 2. If persistence succeeds, updates the in-memory cache.
     * 3. Returns `true` if the server was found and updated.
     *
     * @param serverId The ID of the server to make active.
     * @return `true` if the switch succeeded.
     */
    fun switchToServer(serverId: String): Boolean {
        val success = serverRepository.setActiveServer(serverId)
        if (success) {
            activeServer = serverRepository.getServerById(serverId)
        }
        return success
    }

    /**
     * Invalidates the in-memory cache.
     *
     * The next call to [getActiveServer] will re-read from the repository.
     * Useful after repository-side changes (e.g., server deletion).
     */
    fun invalidate() {
        activeServer = null
    }
}
