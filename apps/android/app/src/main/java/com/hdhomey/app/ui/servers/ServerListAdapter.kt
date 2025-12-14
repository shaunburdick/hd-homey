package com.hdhomey.app.ui.servers

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
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
 * Supports item click and long-click callbacks for server selection and management.
 * Highlights the currently active server with a badge and elevated appearance.
 */
class ServerListAdapter(
    private val onServerClick: (Server) -> Unit,
    private val onServerLongClick: (Server, View) -> Boolean
) : ListAdapter<Server, ServerListAdapter.ServerViewHolder>(ServerDiffCallback()) {
    
    private var activeServerId: String? = null
    
    /**
     * Sets the active server ID to highlight it in the list.
     */
    fun setActiveServerId(serverId: String?) {
        activeServerId = serverId
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ServerViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_server, parent, false)
        return ServerViewHolder(view, onServerClick, onServerLongClick)
    }

    override fun onBindViewHolder(holder: ServerViewHolder, position: Int) {
        val server = getItem(position)
        val isActive = server.id == activeServerId
        holder.bind(server, isActive)
    }
    
    /**
     * Shows loading indicator for a specific server item.
     */
    fun showLoadingForPosition(position: Int) {
        notifyItemChanged(position, PAYLOAD_SHOW_LOADING)
    }
    
    /**
     * Hides loading indicator for a specific server item.
     */
    fun hideLoadingForPosition(position: Int) {
        notifyItemChanged(position, PAYLOAD_HIDE_LOADING)
    }
    
    override fun onBindViewHolder(holder: ServerViewHolder, position: Int, payloads: MutableList<Any>) {
        if (payloads.isEmpty()) {
            super.onBindViewHolder(holder, position, payloads)
        } else {
            for (payload in payloads) {
                when (payload) {
                    PAYLOAD_SHOW_LOADING -> holder.showLoading()
                    PAYLOAD_HIDE_LOADING -> holder.hideLoading()
                }
            }
        }
    }
    
    companion object {
        private const val PAYLOAD_SHOW_LOADING = "show_loading"
        private const val PAYLOAD_HIDE_LOADING = "hide_loading"
    }

    /**
     * ViewHolder for server items.
     * Displays server information and highlights active server.
     */
    class ServerViewHolder(
        itemView: View,
        private val onServerClick: (Server) -> Unit,
        private val onServerLongClick: (Server, View) -> Boolean
    ) : RecyclerView.ViewHolder(itemView) {

        private val serverCard: androidx.cardview.widget.CardView = itemView.findViewById(R.id.server_card)
        private val serverName: TextView = itemView.findViewById(R.id.server_name)
        private val serverUrl: TextView = itemView.findViewById(R.id.server_url)
        private val serverStatus: TextView = itemView.findViewById(R.id.server_status)
        private val serverLastConnected: TextView = itemView.findViewById(R.id.server_last_connected)
        private val serverUserInfo: TextView = itemView.findViewById(R.id.server_user_info)
        private val loadingIndicator: ProgressBar = itemView.findViewById(R.id.server_loading_indicator)
        private val activeBadge: TextView = itemView.findViewById(R.id.server_active_badge)
        
        private var currentServer: Server? = null
        
        /**
         * Shows the loading indicator.
         */
        fun showLoading() {
            loadingIndicator.visibility = View.VISIBLE
        }
        
        /**
         * Hides the loading indicator.
         */
        fun hideLoading() {
            loadingIndicator.visibility = View.GONE
        }

        fun bind(server: Server, isActive: Boolean) {
            currentServer = server
            serverName.text = server.name
            serverUrl.text = server.url
            serverLastConnected.text = server.getLastConnectedDisplay()
            
            // Show/hide active badge and adjust card appearance
            if (isActive) {
                activeBadge.visibility = View.VISIBLE
                serverCard.setCardBackgroundColor(itemView.context.getColor(R.color.surface_dark_elevated))
                serverCard.cardElevation = 8f
            } else {
                activeBadge.visibility = View.GONE
                serverCard.setCardBackgroundColor(itemView.context.getColor(R.color.surface_dark))
                serverCard.cardElevation = 4f
            }

            // Set authentication status
            when {
                server.isAuthenticated() -> {
                    serverStatus.text = itemView.context.getString(R.string.server_authenticated)
                    serverStatus.setTextColor(itemView.context.getColor(R.color.success_green))
                    
                    // Show user info if authenticated
                    if (server.username != null && server.userRole != null) {
                        serverUserInfo.text = itemView.context.getString(
                            R.string.server_user_info,
                            server.username,
                            server.userRole.capitalize()
                        )
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

            // Set click listeners
            itemView.setOnClickListener {
                currentServer?.let { onServerClick(it) }
            }
            
            itemView.setOnLongClickListener {
                currentServer?.let { onServerLongClick(it, itemView) } ?: false
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
