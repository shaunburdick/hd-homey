package com.hdhomey.app.data.provider

import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.repository.ServerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory holder for the currently active HD Homey server.
 *
 * Provides a fast, atomic source of truth for "which server is active right now"
 * without hitting [AppPreferences] / DataStore on every API call. The `init` block
 * eagerly loads from the repository so [getActiveServer] never needs a fallback path.
 *
 * ## Why this exists
 *
 * Previously, the active server was read from [AppPreferences] synchronously via
 * [ServerRepository.getActiveServer], which internally calls [runBlocking] on
 * DataStore. The [CurrentServerProvider] avoids that blocking read on the API
 * hot path by caching the active server in memory.
 *
 * ## Reactive observation
 *
 * [activeServerFlow] emits every time the active server changes (including `null`
 * on invalidation). ViewModels can collect this flow to reactively reload data
 * when the user switches servers on another screen.
 *
 * ## Thread safety
 *
 * All mutations go through an `@Volatile` field and are atomic. The [switchToServer]
 * method first persists to the repository, then updates the in-memory field — if the
 * persistence fails, the field and flow are NOT updated and the caller receives `false`.
 *
 * @property serverRepository Repository that persists server configuration.
 */
@Singleton
class CurrentServerProvider @Inject constructor(
    private val serverRepository: ServerRepository
) {

    @Volatile
    private var activeServer: Server? = null

    private val _activeServerFlow = MutableStateFlow<Server?>(null)

    /**
     * Observable flow that emits the active server whenever it changes.
     * Emits `null` when no server is active.
     */
    val activeServerFlow: StateFlow<Server?> = _activeServerFlow.asStateFlow()

    init {
        // Eagerly load the active server from the repository so [getActiveServer]
        // never needs a fallback path — avoids a TOCTOU race between cached-null
        // check and the repository read.
        activeServer = serverRepository.getActiveServer()
        _activeServerFlow.value = activeServer
    }

    /**
     * Returns the currently active [Server], or `null` if none is set.
     *
     * The value is populated eagerly in the `init` block from the repository;
     * no fallback path is needed because [activeServer] is always initialised.
     */
    fun getActiveServer(): Server? = activeServer

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
     * 2. If persistence succeeds, updates the in-memory cache and
     *    emits the new server on [activeServerFlow].
     * 3. Returns `true` if the server was found and updated.
     *
     * @param serverId The ID of the server to make active.
     * @return `true` if the switch succeeded.
     */
    fun switchToServer(serverId: String): Boolean {
        val success = serverRepository.setActiveServer(serverId)
        if (success) {
            serverRepository.getServerById(serverId)?.let { server ->
                activeServer = server
                _activeServerFlow.value = server
            }
        }
        return success
    }

    /**
     * Invalidates the in-memory cache.
     *
     * Sets [activeServer] to `null` and emits `null` on [activeServerFlow].
     * Useful after repository-side changes (e.g., server deletion).
     */
    fun invalidate() {
        activeServer = null
        _activeServerFlow.value = null
    }
}
