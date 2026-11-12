package com.hdhomey.app.ui.components

import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.hdhomey.app.ui.theme.HdHomeyBlue
import com.hdhomey.app.ui.theme.SurfaceDark
import com.hdhomey.app.ui.theme.TextPrimary
import com.hdhomey.app.ui.theme.TextSecondary

/**
 * A reusable card composable for displaying a channel item in a channel list.
 *
 * Supports both phone and Android TV form factors:
 * - **Phone**: 8dp card corner radius, clickable with ripple
 * - **TV**: 12dp card corner radius, D-pad focus with elevation change
 *
 * Layout (row-based, left to right):
 * 1. Channel number — bold 32sp
 * 2. Channel logo — 40dp×40dp circular `AsyncImage` (Coil), fallback [Icons.Default.Tv]
 * 3. Channel name — bold 16sp, single-line ellipsized
 * 4. HD badge — accent-blue chip with "HD" label (only when [isHd] is true)
 * 5. Favorite star — toggleable [IconButton] with filled/outline star icons
 *
 * @param channelNumber  The guide number string (e.g., "2.1", "4.2")
 * @param channelName    The display name of the channel (e.g., "CBS", "NBC")
 * @param isHd           Whether the channel broadcasts in HD
 * @param isFavorite     Whether the user has favourited this channel
 * @param logoUrl        Optional URL for the channel logo image
 * @param onFavoriteToggle  Callback invoked when the favourite star is tapped
 * @param onClick        Callback invoked when the card body is tapped
 * @param modifier       Optional [Modifier] applied to the root card
 */
@Composable
fun ChannelCard(
    channelNumber: String,
    channelName: String,
    isHd: Boolean,
    isFavorite: Boolean,
    logoUrl: String?,
    onFavoriteToggle: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isTv = LocalConfiguration.current.uiMode and
        Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION
    val cornerRadius = if (isTv) 12.dp else 8.dp
    var isFocused by remember { mutableStateOf(false) }

    Card(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (isTv) {
                    Modifier.onFocusChanged { isFocused = it.isFocused }
                } else {
                    Modifier
                }
            ),
        shape = RoundedCornerShape(cornerRadius),
        colors = CardDefaults.cardColors(
            containerColor = SurfaceDark
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isTv && isFocused) 8.dp else 2.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 1. Channel number — bold 32sp
            Text(
                text = channelNumber,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                fontSize = 32.sp,
                color = TextPrimary,
                modifier = Modifier.width(64.dp)
            )

            // 2. Channel logo — 40dp×40dp circular AsyncImage with fallback
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(SurfaceDark, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (logoUrl != null) {
                    AsyncImage(
                        model = logoUrl,
                        contentDescription = channelName,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Tv,
                        contentDescription = channelName,
                        modifier = Modifier.size(24.dp),
                        tint = TextSecondary
                    )
                }
            }

            // 3. Channel name — bold 16sp, ellipsize=end, maxLines=1
            Text(
                text = channelName,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 12.dp, end = 8.dp)
            )

            // 4. HD badge — accent chip with "HD" text
            if (isHd) {
                Box(
                    modifier = Modifier
                        .background(
                            color = HdHomeyBlue,
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "HD",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // 5. Favorite star toggle
            IconButton(onClick = onFavoriteToggle) {
                Icon(
                    imageVector = if (isFavorite) Icons.Default.Star else Icons.Outlined.StarBorder,
                    contentDescription = if (isFavorite) {
                        "Remove $channelName from favorites"
                    } else {
                        "Add $channelName to favorites"
                    },
                    tint = if (isFavorite) HdHomeyBlue else TextSecondary
                )
            }
        }
    }
}
