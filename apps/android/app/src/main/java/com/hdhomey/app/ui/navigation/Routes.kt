package com.hdhomey.app.ui.navigation

import kotlinx.serialization.Serializable

/** Root screen — displays the list of configured servers. */
@Serializable
object ServerList

/** Add a new server form screen. */
@Serializable
object AddServer

/**
 * Authentication (device code pairing) screen.
 * @property serverId The server ID to authenticate against.
 */
@Serializable
data class Authentication(val serverId: String)

/**
 * Channel list for a given server.
 * @property serverId Optional server ID. Null means "active server".
 */
@Serializable
data class ChannelList(val serverId: String? = null)

/**
 * Video player screen for a specific channel.
 * @property channelId The channel ID (as string for serialization).
 * @property channelName Display name shown in player controls overlay.
 */
@Serializable
data class Player(val channelId: String, val channelName: String)

/** Success screen shown after authentication completes. */
@Serializable
object Success
