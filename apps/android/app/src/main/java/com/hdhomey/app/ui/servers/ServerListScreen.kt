package com.hdhomey.app.ui.servers

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.ui.components.AdaptiveValues
import com.hdhomey.app.ui.components.AsyncStateContent
import com.hdhomey.app.ui.components.adaptiveValues
import com.hdhomey.app.ui.navigation.AddServer
import com.hdhomey.app.ui.navigation.Authentication
import com.hdhomey.app.ui.navigation.ChannelList
import com.hdhomey.app.ui.theme.ErrorRed
import com.hdhomey.app.ui.theme.HdHomeyBlue
import com.hdhomey.app.ui.theme.ShimmerHighlight
import com.hdhomey.app.ui.theme.ShimmerPlaceholder
import com.hdhomey.app.ui.theme.SuccessGreen
import com.hdhomey.app.ui.theme.WarningYellow

/**
 * Server list screen composable.
 *
 * Displays all configured HD Homey servers with loading, error, success/empty states.
 * Provides a FAB to add servers and navigates to [Authentication] or [ChannelList]
 * depending on each server's authentication status.
 *
 * Adapts layout to TV vs phone form factors using [AdaptiveValues].
 *
 * @param viewModel The [ServerListViewModel] providing server state and operations.
 * @param navController [NavController] for navigating to related screens.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServerListScreen(
    viewModel: ServerListViewModel,
    navController: NavController
) {
    val asyncState by viewModel.asyncState.collectAsStateWithLifecycle()
    val adaptive = adaptiveValues()
    // Re-evaluated each recomposition — non-blocking in-memory lookup via CurrentServerProvider
    val activeServer = viewModel.getActiveServer()
    var loadingServerId by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Your Servers",
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    IconButton(onClick = { /* Settings — placeholder */ }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate(AddServer) },
                containerColor = HdHomeyBlue,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add Server"
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        // Wrap all states in the scaffold's inner padding (accounts for top bar, FAB, system bars)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            AsyncStateContent(
                state = asyncState,
                onRetry = { viewModel.loadServers() },
                loadingContent = { ServerListLoadingContent(adaptive) },
                emptyCheck = { it.isEmpty() },
                emptyContent = { ServerListEmptyContent(adaptive) },
                content = { servers ->
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(
                            horizontal = adaptive.screenPadding,
                            vertical = adaptive.cardSpacing
                        ),
                        verticalArrangement = Arrangement.spacedBy(adaptive.cardSpacing)
                    ) {
                        items(servers, key = { it.id }) { server ->
                            ServerCard(
                                server = server,
                                isActive = server.id == activeServer?.id,
                                isLoading = server.id == loadingServerId,
                                adaptive = adaptive,
                                onClick = {
                                    loadingServerId = server.id
                                    when {
                                        server.isAuthenticated() -> {
                                            navController.navigate(ChannelList(serverId = server.id))
                                        }
                                        else -> {
                                            navController.navigate(Authentication(serverId = server.id))
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            )
        }
    }
}

// ── Loading State ──────────────────────────────────────────────────────────────

/**
 * Renders 5 shimmer skeleton cards while the server list is loading.
 *
 * Reuses the same shimmer gradient animation as [ShimmerEffect] to maintain a
 * consistent visual appearance across the app.
 */
@Composable
private fun ServerListLoadingContent(adaptive: AdaptiveValues) {
    val transition = rememberInfiniteTransition(label = "server_list_shimmer")
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = adaptive.screenPadding)
            .padding(top = adaptive.cardSpacing)
            .testTag("server_list_loading"),
        verticalArrangement = Arrangement.spacedBy(adaptive.cardSpacing)
    ) {
        repeat(5) {
            ShimmerSkeletonCard(brush)
        }
    }
}

/**
 * A single shimmer skeleton card used during loading state.
 *
 * @param brush The animated shimmer gradient brush to apply to placeholder shapes.
 */
@Composable
private fun ShimmerSkeletonCard(brush: Brush) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(brush)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(16.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(brush)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.5f)
                        .height(12.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(brush)
                )
            }
        }
    }
}

// ── Empty State ────────────────────────────────────────────────────────────────

/**
 * Welcome/empty state shown when no servers are configured.
 *
 * Provides onboarding instructions so users know to tap the + button
 * to add their first HDHomeRun server.
 */
@Composable
private fun ServerListEmptyContent(adaptive: AdaptiveValues) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(adaptive.screenPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome to HD Homey",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Add your first HDHomeRun server to get started.\nTap the + button below to begin.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

// ── Server Card ────────────────────────────────────────────────────────────────

/**
 * A server card displaying connection status and metadata.
 *
 * Layout:
 * - Server name (bold, primary colour)
 * - Server URL (secondary text)
 * - Auth status dot with label (green ● Authenticated / red Error / yellow Pending)
 * - Active badge when this is the currently active server
 * - User info line (username + role) when authenticated
 * - Linear progress indicator shown while the card is being tapped (loading feedback)
 *
 * @param server The server data to display.
 * @param isActive Whether this is the currently active server.
 * @param isLoading Whether a navigation action is in progress for this server.
 * @param adaptive Adaptive layout values for TV vs phone form factor.
 * @param onClick Callback invoked when the card is tapped.
 */
@Composable
private fun ServerCard(
    server: Server,
    isActive: Boolean,
    isLoading: Boolean,
    adaptive: AdaptiveValues,
    onClick: () -> Unit
) {
    val statusColor = when {
        server.isAuthenticated() -> SuccessGreen
        server.isTokenExpired() && server.jwt != null -> ErrorRed
        else -> WarningYellow
    }
    val statusLabel = when {
        server.isAuthenticated() -> "Authenticated"
        server.isTokenExpired() && server.jwt != null -> "Token Expired"
        else -> "Pending"
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(adaptive.cardCornerRadius),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) {
                MaterialTheme.colorScheme.surfaceVariant
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isActive) 8.dp else 2.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(adaptive.cardPadding)
        ) {
            // Loading indicator shown briefly when navigating from this card
            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                    color = HdHomeyBlue,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }

            // ── Header row: server name + active badge ──
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = server.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )

                if (isActive) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = HdHomeyBlue.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = "Active",
                            style = MaterialTheme.typography.labelSmall,
                            color = HdHomeyBlue,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // ── Server URL ──
            Text(
                text = server.url,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            // ── Status row: dot + label + last connected ──
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = statusLabel,
                    style = MaterialTheme.typography.bodySmall,
                    color = statusColor
                )
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = server.getLastConnectedDisplay(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // ── User info (only shown when authenticated) ──
            if (server.isAuthenticated() && server.username != null && server.userRole != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${server.username} · ${server.userRole.replaceFirstChar { it.uppercase() }}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
