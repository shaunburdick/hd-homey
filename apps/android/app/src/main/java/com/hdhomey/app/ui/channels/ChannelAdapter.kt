package com.hdhomey.app.ui.channels

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.hdhomey.app.R
import com.hdhomey.app.ui.channels.model.ChannelUiModel

/**
 * RecyclerView adapter for channel list.
 *
 * Displays channels with D-pad navigation support for Android TV.
 * Uses DiffUtil for efficient list updates.
 *
 * ## Features
 *
 * - D-pad navigation (focus handling)
 * - Click/Enter to select channel
 * - Favorite star indicator
 * - HD badge indicator
 * - Efficient updates via DiffUtil
 * - Accessibility support
 *
 * ## Usage
 *
 * ```kotlin
 * val adapter = ChannelAdapter { channel ->
 *     viewModel.onChannelSelected(channel)
 * }
 * recyclerView.adapter = adapter
 *
 * // Update list
 * adapter.submitList(channels)
 * ```
 *
 * @property onChannelClick Callback when user selects a channel
 */
class ChannelAdapter(
    private val onChannelClick: (ChannelUiModel) -> Unit
) : ListAdapter<ChannelUiModel, ChannelAdapter.ChannelViewHolder>(ChannelDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChannelViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_channel, parent, false)
        return ChannelViewHolder(view, onChannelClick)
    }

    override fun onBindViewHolder(holder: ChannelViewHolder, position: Int) {
        val channel = getItem(position)
        holder.bind(channel)
    }

    /**
     * ViewHolder for channel list item.
     *
     * Manages view binding and click handling for a single channel.
     *
     * @property itemView Root view of the list item
     * @property onChannelClick Callback for channel selection
     */
    class ChannelViewHolder(
        itemView: View,
        private val onChannelClick: (ChannelUiModel) -> Unit
    ) : RecyclerView.ViewHolder(itemView) {

        private val channelNumber: TextView = itemView.findViewById(R.id.channelNumber)
        private val channelName: TextView = itemView.findViewById(R.id.channelName)
        private val favoriteIcon: ImageView = itemView.findViewById(R.id.favoriteIcon)
        private val hdBadge: TextView = itemView.findViewById(R.id.hdBadge)

        /**
         * Bind channel data to views.
         *
         * @param channelUiModel Channel UI model with preference flags
         */
        fun bind(channelUiModel: ChannelUiModel) {
            val channel = channelUiModel.channel

            // Set channel number and name
            channelNumber.text = channel.number
            channelName.text = channel.name

            // Show favorite star if favorited
            favoriteIcon.visibility = if (channelUiModel.isFavorite) {
                View.VISIBLE
            } else {
                View.GONE
            }

            // Show HD badge if HD channel
            hdBadge.visibility = if (channel.isHd) {
                View.VISIBLE
            } else {
                View.GONE
            }

            // Set click listener
            itemView.setOnClickListener {
                onChannelClick(channelUiModel)
            }

            // Set content description for accessibility
            itemView.contentDescription = channelUiModel.contentDescription

            // Request focus for first item (helps with D-pad navigation)
            if (bindingAdapterPosition == 0) {
                itemView.requestFocus()
            }
        }
    }

    /**
     * DiffUtil callback for efficient list updates.
     *
     * Compares old and new lists to determine minimal changes.
     * RecyclerView only updates changed items, improving performance.
     */
    private class ChannelDiffCallback : DiffUtil.ItemCallback<ChannelUiModel>() {
        /**
         * Check if items represent the same channel.
         *
         * Uses channel ID for identity comparison.
         */
        override fun areItemsTheSame(
            oldItem: ChannelUiModel,
            newItem: ChannelUiModel
        ): Boolean {
            return oldItem.channel.id == newItem.channel.id
        }

        /**
         * Check if item contents are the same.
         *
         * Compares all fields to detect changes.
         * If true, view is not rebound (optimization).
         */
        override fun areContentsTheSame(
            oldItem: ChannelUiModel,
            newItem: ChannelUiModel
        ): Boolean {
            return oldItem == newItem
        }
    }
}
