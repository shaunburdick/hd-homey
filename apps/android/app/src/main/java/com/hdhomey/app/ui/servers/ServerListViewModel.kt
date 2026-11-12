package com.hdhomey.app.ui.servers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.provider.CurrentServerProvider
import com.hdhomey.app.data.repository.ServerRepository
import com.hdhomey.app.ui.components.AsyncState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * ViewModel for the server list screen.
 *
 * Manages loading, refreshing, and deleting HD Homey server configurations.
 * Exposes the server list as an [AsyncState] via [StateFlow] so the UI layer
 * can reactively render loading, success (with data), and error states.
 *
 * The active server is obtained from [CurrentServerProvider] rather than from
 * [ServerRepository] directly, avoiding synchronous DataStore reads on the
 * UI thread.
 *
 * @property serverRepository Repository that persists server configurations.
 * @property currentServerProvider In-memory holder for the currently active server.
 */
@HiltViewModel
class ServerListViewModel @Inject constructor(
    private val serverRepository: ServerRepository,
    private val currentServerProvider: CurrentServerProvider
) : ViewModel() {

    private val _asyncState = MutableStateFlow<AsyncState<List<Server>>>(AsyncState.Loading)

    /**
     * Observable async state for the server list.
     *
     * Starts as [AsyncState.Loading] and transitions to [AsyncState.Success]
     * or [AsyncState.Error] after [loadServers] completes.
     */
    val asyncState: StateFlow<AsyncState<List<Server>>> = _asyncState.asStateFlow()

    init {
        loadServers()
    }

    /**
     * Loads all configured servers from the repository.
     *
     * Transitions to [AsyncState.Loading] immediately, then to
     * [AsyncState.Success] with the server list on success,
     * or [AsyncState.Error] if an exception occurs.
     */
    fun loadServers() {
        _asyncState.value = AsyncState.Loading

        viewModelScope.launch {
            try {
                val servers = withContext(Dispatchers.IO) {
                    serverRepository.getAllServers()
                }
                _asyncState.value = AsyncState.Success(servers)
            } catch (e: Exception) {
                _asyncState.value = AsyncState.Error(
                    message = e.message ?: "Failed to load servers"
                )
            }
        }
    }

    /**
     * Refreshes the server list by re-fetching from the repository.
     *
     * Functionally equivalent to [loadServers] but semantically distinct —
     * use this when re-loading after a mutation (e.g., adding or editing a
     * server) to communicate intent in calling code.
     */
    fun refreshServers() {
        loadServers()
    }

    /**
     * Deletes a server by ID and refreshes the list.
     *
     * Does NOT show a confirmation dialog — the caller (Fragment / Compose UI)
     * is responsible for prompting the user before invoking this method.
     *
     * If the deleted server was the active server, [CurrentServerProvider] handles
     * clearing the in-memory cache automatically.
     *
     * @param id The ID of the server to delete.
     */
    fun deleteServer(id: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    serverRepository.removeServer(id)
                }

                // Invalidate the in-memory cache if the deleted server was active
                val activeServer = currentServerProvider.getActiveServer()
                if (activeServer?.id == id) {
                    currentServerProvider.invalidate()
                }

                // Reload the list
                loadServers()
            } catch (e: Exception) {
                _asyncState.value = AsyncState.Error(
                    message = e.message ?: "Failed to delete server"
                )
            }
        }
    }

    /**
     * Returns the currently active server, or `null` if none is set.
     *
     * Delegates to [CurrentServerProvider.getActiveServer] for the in-memory
     * cached value — no blocking I/O.
     */
    fun getActiveServer(): Server? {
        return currentServerProvider.getActiveServer()
    }
}
