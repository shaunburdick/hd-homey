package com.hdhomey.app.ui.servers

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.PopupMenu
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.ItemTouchHelper
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
 * - Long-press for context menu (edit/delete)
 * - Swipe-to-delete gesture
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
        adapter = ServerListAdapter(
            onServerClick = { server -> onServerClick(server) },
            onServerLongClick = { server, view -> onServerLongClick(server, view) }
        )
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter
        
        // Setup swipe-to-delete
        setupSwipeToDelete()

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
     * Handles server item long click.
     * Shows context menu with edit/delete options.
     * 
     * @return true to consume the long click event
     */
    private fun onServerLongClick(server: Server, view: View): Boolean {
        Log.d(Constants.Tags.SERVER_LIST, "Server long-clicked: ${server.name}")
        
        val popup = PopupMenu(requireContext(), view)
        popup.inflate(R.menu.server_context_menu)
        
        popup.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_edit -> {
                    // TODO: Implement edit functionality (navigate to edit screen)
                    Log.d(Constants.Tags.SERVER_LIST, "Edit server: ${server.name}")
                    true
                }
                R.id.action_delete -> {
                    confirmDelete(server)
                    true
                }
                else -> false
            }
        }
        
        popup.show()
        return true
    }
    
    /**
     * Sets up swipe-to-delete gesture for server items.
     */
    private fun setupSwipeToDelete() {
        val itemTouchHelper = ItemTouchHelper(object : ItemTouchHelper.SimpleCallback(
            0, // No drag directions
            ItemTouchHelper.LEFT or ItemTouchHelper.RIGHT // Swipe left or right
        ) {
            override fun onMove(
                recyclerView: RecyclerView,
                viewHolder: RecyclerView.ViewHolder,
                target: RecyclerView.ViewHolder
            ): Boolean {
                return false // We don't support moving items
            }
            
            override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
                val position = viewHolder.bindingAdapterPosition
                if (position == RecyclerView.NO_POSITION) return
                
                val server = adapter.currentList[position]
                
                // Show confirmation dialog
                confirmDelete(server) {
                    // If user cancels, restore the item
                    adapter.notifyItemChanged(position)
                }
            }
        })
        
        itemTouchHelper.attachToRecyclerView(recyclerView)
    }
    
    /**
     * Shows confirmation dialog before deleting a server.
     * 
     * @param server Server to delete
     * @param onCancel Optional callback if user cancels
     */
    private fun confirmDelete(server: Server, onCancel: (() -> Unit)? = null) {
        AlertDialog.Builder(requireContext())
            .setTitle("Delete Server?")
            .setMessage("Are you sure you want to delete \"${server.name}\"? This will remove all saved authentication data.")
            .setPositiveButton("Delete") { _, _ ->
                deleteServer(server)
            }
            .setNegativeButton("Cancel") { _, _ ->
                onCancel?.invoke()
            }
            .setOnCancelListener {
                onCancel?.invoke()
            }
            .show()
    }
    
    /**
     * Deletes a server from the repository.
     */
    private fun deleteServer(server: Server) {
        val success = repository.removeServer(server.id)
        if (success) {
            Log.d(Constants.Tags.SERVER_LIST, "Server deleted: ${server.name}")
            loadServers() // Refresh the list
        } else {
            Log.e(Constants.Tags.SERVER_LIST, "Failed to delete server: ${server.name}")
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
