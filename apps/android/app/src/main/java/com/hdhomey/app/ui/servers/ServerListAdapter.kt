package com.hdhomey.app.ui.servers

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.hdhomey.app.R
import com.hdhomey.app.data.model.Server

/**
 * RecyclerView adapter for displaying a list of configured HD Homey servers.
 *
 * Uses ListAdapter with DiffUtil for efficient updates.
 * Supports item click callbacks for server selection.
 */
class ServerListAdapter(
    private val onServerClick: (Server) -> Unit
) : ListAdapter<Server, ServerListAdapter.ServerViewHolder>(ServerDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ServerViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_server, parent, false)
        return ServerViewHolder(view, onServerClick)
    }

    override fun onBindViewHolder(holder: ServerViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    /**
     * ViewHolder for server items.
     */
    class ServerViewHolder(
        itemView: View,
        private val onServerClick: (Server) -> Unit
    ) : RecyclerView.ViewHolder(itemView) {

        private val serverName: TextView = itemView.findViewById(R.id.server_name)
        private val serverUrl: TextView = itemView.findViewById(R.id.server_url)
        private val serverStatus: TextView = itemView.findViewById(R.id.server_status)
        private val serverLastConnected: TextView = itemView.findViewById(R.id.server_last_connected)
        private val serverUserInfo: TextView = itemView.findViewById(R.id.server_user_info)

        fun bind(server: Server) {
            serverName.text = server.name
            serverUrl.text = server.url
            serverLastConnected.text = server.getLastConnectedDisplay()

            // Set authentication status
            when {
                server.isAuthenticated() -> {
                    serverStatus.text = itemView.context.getString(R.string.server_authenticated)
                    serverStatus.setTextColor(itemView.context.getColor(R.color.success_green))
                    
                    // Show user info if authenticated
                    if (server.username != null && server.userRole != null) {
                        serverUserInfo.text = "${server.username} (${server.userRole.capitalize()})"
                        serverUserInfo.visibility = View.VISIBLE
                    } else {
                        serverUserInfo.visibility = View.GONE
                    }
                }
                server.isTokenExpired() && server.jwt != null -> {
                    serverStatus.text = itemView.context.getString(R.string.server_token_expired)
                    serverStatus.setTextColor(itemView.context.getColor(R.color.warning_yellow))
                    serverUserInfo.visibility = View.GONE
                }
                else -> {
                    serverStatus.text = itemView.context.getString(R.string.server_not_authenticated)
                    serverStatus.setTextColor(itemView.context.getColor(R.color.text_secondary))
                    serverUserInfo.visibility = View.GONE
                }
            }

            // Set click listener
            itemView.setOnClickListener {
                onServerClick(server)
            }
        }

        private fun String.capitalize(): String {
            return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }
    }

    /**
     * DiffUtil callback for efficient list updates.
     *
     * Compares servers by ID for identity, and by content for equality.
     */
    private class ServerDiffCallback : DiffUtil.ItemCallback<Server>() {
        override fun areItemsTheSame(oldItem: Server, newItem: Server): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Server, newItem: Server): Boolean {
            return oldItem == newItem
        }
    }
}
