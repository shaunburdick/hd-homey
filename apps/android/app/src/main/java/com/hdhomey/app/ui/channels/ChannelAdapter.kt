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
import com.hdhomey.app.domain.model.ChannelWithMetadata

/**
 * RecyclerView adapter for displaying channels with D-pad navigation support.
 *
 * Uses [ListAdapter] with [DiffUtil] for efficient, diff-driven updates that avoid
 * full-list redraws. Exposes a click callback for channel selection, which the host
 * Fragment uses to trigger stream playback.
 *
 * @param onChannelClick Invoked when the user selects a channel row. Receives the
 *   full [ChannelWithMetadata] so the caller has access to both the channel entity
 *   and its current favourite/hidden state.
 */
class ChannelAdapter(
    private val onChannelClick: (ChannelWithMetadata) -> Unit
) : ListAdapter<ChannelWithMetadata, ChannelAdapter.ChannelViewHolder>(ChannelDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChannelViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_channel, parent, false)
        return ChannelViewHolder(view, onChannelClick)
    }

    override fun onBindViewHolder(holder: ChannelViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    /**
     * ViewHolder for a single channel row in the list.
     *
     * Binds [ChannelWithMetadata] data to the item layout views:
     * - Channel number → [R.id.channel_number]
     * - Channel name   → [R.id.channel_name]
     * - HD badge       → [R.id.hd_badge] (visible only when [com.hdhomey.app.domain.model.Channel.isHd] is true)
     * - Favourite icon → [R.id.favorite_icon] (visible only when [ChannelWithMetadata.isFavorite] is true)
     *
     * D-pad focusability is controlled via XML attributes on `item_channel.xml`; no
     * additional focus handling is required here.
     */
    class ChannelViewHolder(
        itemView: View,
        private val onChannelClick: (ChannelWithMetadata) -> Unit
    ) : RecyclerView.ViewHolder(itemView) {

        private val channelNumber: TextView = itemView.findViewById(R.id.channel_number)
        private val channelName: TextView = itemView.findViewById(R.id.channel_name)
        private val favoriteIcon: ImageView = itemView.findViewById(R.id.favorite_icon)
        private val hdBadge: TextView = itemView.findViewById(R.id.hd_badge)

        /** Holds the most recently bound item so the click lambda captures the latest value. */
        private var currentChannel: ChannelWithMetadata? = null

        /**
         * Binds [channel] data to this ViewHolder's views and wires the click listener.
         *
         * @param channel The [ChannelWithMetadata] to display.
         */
        fun bind(channel: ChannelWithMetadata) {
            currentChannel = channel

            channelNumber.text = channel.channel.number
            channelName.text = channel.channel.name

            // HD badge — visible only for HD channels.
            hdBadge.visibility = if (channel.channel.isHd) View.VISIBLE else View.GONE

            // Favourite icon — visible when the user has starred this channel.
            // When a star/star_outline drawable is available in a future phase,
            // swap to using different resources for filled vs. outline states:
            //   favoriteIcon.setImageResource(
            //       if (channel.isFavorite) R.drawable.ic_star_filled else R.drawable.ic_star_outline
            //   )
            favoriteIcon.visibility = if (channel.isFavorite) View.VISIBLE else View.GONE

            itemView.setOnClickListener {
                currentChannel?.let { onChannelClick(it) }
            }
        }
    }

    /**
     * [DiffUtil.ItemCallback] for [ChannelWithMetadata].
     *
     * Identity is based on [com.hdhomey.app.domain.model.Channel.id] so the adapter
     * can detect moves and removes without comparing full object graphs. Equality
     * delegates to the data-class structural equality so any metadata change (e.g., a
     * favourite toggle) triggers a targeted rebind rather than a full redraw.
     */
    private class ChannelDiffCallback : DiffUtil.ItemCallback<ChannelWithMetadata>() {
        override fun areItemsTheSame(
            oldItem: ChannelWithMetadata,
            newItem: ChannelWithMetadata
        ): Boolean = oldItem.channel.id == newItem.channel.id

        override fun areContentsTheSame(
            oldItem: ChannelWithMetadata,
            newItem: ChannelWithMetadata
        ): Boolean = oldItem == newItem
    }
}
