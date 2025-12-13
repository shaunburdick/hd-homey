package com.hdhomey.app.ui.servers

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.hdhomey.app.R
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.repository.ServerRepository
import com.hdhomey.app.storage.AppPreferences
import com.hdhomey.app.util.Constants

/**
 * Fragment displaying a list of configured HD Homey servers.
 *
 * Features:
 * - RecyclerView showing all saved servers
 * - Empty state when no servers configured
 * - FloatingActionButton to add new servers
 * - Server selection navigates to authentication or main app
 */
class ServerListFragment : Fragment() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var emptyState: LinearLayout
    private lateinit var addServerFab: FloatingActionButton
    private lateinit var adapter: ServerListAdapter
    private lateinit var repository: ServerRepository

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_server_list, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Initialize repository
        val prefs = AppPreferences.getInstance(requireContext())
        repository = ServerRepository(prefs)

        // Setup views
        recyclerView = view.findViewById(R.id.servers_recycler_view)
        emptyState = view.findViewById(R.id.empty_state)
        addServerFab = view.findViewById(R.id.add_server_fab)

        // Setup RecyclerView
        adapter = ServerListAdapter { server ->
            onServerClick(server)
        }
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter

        // Setup FAB click listener
        addServerFab.setOnClickListener {
            navigateToAddServer()
        }

        // Load servers
        loadServers()
    }

    override fun onResume() {
        super.onResume()
        // Refresh server list when returning from add server or authentication
        loadServers()
    }

    /**
     * Loads all servers from repository and updates the UI.
     */
    private fun loadServers() {
        val servers = repository.getAllServers()
        Log.d(Constants.Tags.SERVER_LIST, "Loaded ${servers.size} servers")

        if (servers.isEmpty()) {
            showEmptyState()
        } else {
            showServerList(servers)
        }
    }

    /**
     * Shows the empty state (no servers configured).
     */
    private fun showEmptyState() {
        recyclerView.visibility = View.GONE
        emptyState.visibility = View.VISIBLE
    }

    /**
     * Shows the server list.
     */
    private fun showServerList(servers: List<Server>) {
        recyclerView.visibility = View.VISIBLE
        emptyState.visibility = View.GONE
        adapter.submitList(servers)
    }

    /**
     * Handles server item click.
     *
     * Logic:
     * - If authenticated and token valid → Set as active, navigate to main app (Phase 2)
     * - If token expired or not authenticated → Navigate to authentication
     */
    private fun onServerClick(server: Server) {
        Log.d(Constants.Tags.SERVER_LIST, "Server clicked: ${server.name} (${server.id})")

        // Set as active server
        repository.setActiveServer(server.id)

        when {
            server.isAuthenticated() -> {
                Log.d(Constants.Tags.SERVER_LIST, "Server is authenticated, token valid")
                // TODO Phase 2: Navigate to main app
                // For now, show a placeholder or re-authenticate
                navigateToAuthentication(server)
            }
            else -> {
                Log.d(Constants.Tags.SERVER_LIST, "Server needs authentication")
                navigateToAuthentication(server)
            }
        }
    }

    /**
     * Navigates to Add Server screen.
     */
    private fun navigateToAddServer() {
        findNavController().navigate(R.id.action_serverList_to_addServer)
    }

    /**
     * Navigates to Authentication screen for the selected server.
     *
     * Passes server ID as argument to authentication fragment.
     */
    private fun navigateToAuthentication(server: Server) {
        val bundle = Bundle().apply {
            putString("serverId", server.id)
        }
        findNavController().navigate(R.id.action_serverList_to_authentication, bundle)
    }
}
