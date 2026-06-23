package com.hdhomey.app.player

import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes

/**
 * Helper for creating Media3 [MediaItem] instances from HD Homey HLS stream URLs.
 *
 * HLS streams use the HLS content type, which tells ExoPlayer to use
 * [androidx.media3.exoplayer.hls.HlsMediaSource] internally.
 *
 * Note: In practice, ExoPlayer can auto-detect HLS from the .m3u8 extension
 * in the URL. This helper makes the content type explicit for clarity and
 * allows adding custom headers (e.g., cookies) in the future.
 */
object HdHomeyMediaSource {

    /**
     * Create a [MediaItem] for an HLS stream URL.
     *
     * @param hlsUrl Full HLS playlist URL with HMAC token
     * @return [MediaItem] configured for HLS playback
     */
    fun fromHlsUrl(hlsUrl: String): MediaItem {
        return MediaItem.Builder()
            .setUri(hlsUrl)
            .setMimeType(MimeTypes.APPLICATION_M3U8)
            .build()
    }
}
