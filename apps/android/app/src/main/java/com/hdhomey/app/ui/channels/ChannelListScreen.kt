package com.hdhomey.app.ui.channels

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.hdhomey.app.ui.components.AdaptiveValues
import com.hdhomey.app.ui.components.ChannelCard
import com.hdhomey.app.ui.components.adaptiveValues
import com.hdhomey.app.ui.navigation.Player
import com.hdhomey.app.ui.theme.HdHomeyBlue
import com.hdhomey.app.ui.theme.ShimmerHighlight
import com.hdhomey.app.ui.theme.ShimmerPlaceholder

/**
 * Channel list screen composable.
 *
 * Displays all channels for the currently selected tuner with loading, error,
 * empty (no channels), and success states. Supports pull-to-refresh and an
 * explicit refresh action in the top app bar.
 *
 * Adapts layout to TV vs phone form factors using [AdaptiveValues].
 *
 * The ViewModel is injected via [hiltViewModel], leveraging Hilt's Compose
 * navigation integration for scoped lifecycle management. A caller-provided
 * [onToggleFavorite] callback allows the parent to handle favourite toggling
 * when the appropriate API endpoint is wired in a future phase.
 *
 * @param viewModel The [ChannelListViewModel] providing channel list state.
 * @param navController [NavController] for navigating to the player screen.
 * @param onToggleFavorite Callback invoked when a channel's favourite star is
 *   tapped; receives the channel ID as a string. Defaults to no-op.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChannelListScreen(
    viewModel: ChannelListViewModel = hiltViewModel(),
    navController: NavController,
    onToggleFavorite: (channelId: String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val adaptive = adaptiveValues()
    val isRefreshing = uiState is ChannelListUiState.Loading

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = when (val state = uiState) {
                            is ChannelListUiState.Success -> state.tunerName
                            else -> "Channels"
                        },
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(onClick = { viewModel.retryLoad() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh channels"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (val state = uiState) {
                is ChannelListUiState.Loading -> {
                    Box(modifier = Modifier.testTag("channel_list_loading")) {
                        ChannelListLoadingContent(adaptive)
                    }
                }

                is ChannelListUiState.Error -> {
                    ChannelListErrorContent(
                        message = state.message,
                        isRetryable = state.isRetryable,
                        onRetry = { viewModel.retryLoad() }
                    )
                }

                is ChannelListUiState.Empty -> {
                    ChannelListEmptyContent(adaptive)
                }

                is ChannelListUiState.Success -> {
                    androidx.compose.material3.pulltorefresh.PullToRefreshBox(
                        isRefreshing = isRefreshing,
                        onRefresh = { viewModel.retryLoad() },
                        modifier = Modifier.fillMaxSize()
                    ) {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(
                                horizontal = adaptive.screenPadding,
                                vertical = adaptive.cardSpacing
                            ),
                            verticalArrangement = Arrangement.spacedBy(adaptive.cardSpacing)
                        ) {
                            items(
                                items = state.channels,
                                key = { it.channel.id }
                            ) { channel ->
                                ChannelCard(
                                    channelNumber = channel.channel.number,
                                    channelName = channel.channel.name,
                                    isHd = channel.channel.isHd,
                                    isFavorite = channel.isFavorite,
                                    logoUrl = null,
                                    onFavoriteToggle = {
                                        onToggleFavorite(channel.channel.id.toString())
                                    },
                                    onClick = {
                                        navController.navigate(
                                            Player(
                                                channelId = channel.channel.id.toString(),
                                                channelName = channel.channel.name
                                            )
                                        )
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Loading State ──────────────────────────────────────────────────────────────

/**
 * Renders 5 shimmer skeleton cards while the channel list is loading.
 *
 * Each skeleton card mimics the channel card layout (channel number, logo,
 * name, and favourite star placeholders) to provide a smooth visual
 * transition when the real data arrives.
 */
@Composable
private fun ChannelListLoadingContent(adaptive: AdaptiveValues) {
    val transition = rememberInfiniteTransition(label = "channel_list_shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_translate"
    )

    val brush = Brush.linearGradient(
        colors = listOf(
            ShimmerPlaceholder,
            ShimmerHighlight,
            ShimmerPlaceholder
        ),
        start = Offset.Zero,
        end = Offset(x = translateAnim, y = translateAnim)
    )

    AnimatedVisibility(
        visible = true,
        enter = fadeIn(animationSpec = tween(150)),
        exit = fadeOut(animationSpec = tween(150))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = adaptive.screenPadding)
                .padding(top = adaptive.cardSpacing),
            verticalArrangement = Arrangement.spacedBy(adaptive.cardSpacing)
        ) {
            repeat(5) {
                ChannelShimmerSkeletonCard(brush, adaptive)
            }
        }
    }
}

/**
 * A single shimmer skeleton card that mirrors the visual layout of [ChannelCard].
 *
 * @param brush The animated shimmer gradient brush applied to placeholder shapes.
 * @param adaptive Adaptive layout values for TV vs phone form factor.
 */
@Composable
private fun ChannelShimmerSkeletonCard(brush: Brush, adaptive: AdaptiveValues) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(adaptive.cardCornerRadius),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(adaptive.cardPadding),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Channel number placeholder (64dp wide to match the real card)
            Box(
                modifier = Modifier
                    .width(64.dp)
                    .height(32.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Channel logo circular placeholder (40dp to match ChannelCard)
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(brush)
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Channel name text placeholder
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(16.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )

            // Favourite star placeholder
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .padding(start = 8.dp)
                    .clip(CircleShape)
                    .background(brush)
            )
        }
    }
}

// ── Error State ────────────────────────────────────────────────────────────────

/**
 * Error state displayed when channel loading fails.
 *
 * Shows the error message and, for retryable errors, a "Try Again" button
 * that invokes [onRetry].
 *
 * @param message Human-readable error description.
 * @param isRetryable Whether a retry button should be shown.
 * @param onRetry Callback invoked when the retry button is tapped.
 */
@Composable
private fun ChannelListErrorContent(
    message: String,
    isRetryable: Boolean,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error
        )

        if (isRetryable) {
            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(
                    containerColor = HdHomeyBlue
                )
            ) {
                Text("Try Again")
            }
        }
    }
}

// ── Empty State ────────────────────────────────────────────────────────────────

/**
 * Empty state shown when no channels were found for the current tuner.
 *
 * Displays a centred "No channels found" message with a brief explanation.
 */
@Composable
private fun ChannelListEmptyContent(adaptive: AdaptiveValues) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(adaptive.screenPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "No channels found",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "This tuner has no available channels.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}
