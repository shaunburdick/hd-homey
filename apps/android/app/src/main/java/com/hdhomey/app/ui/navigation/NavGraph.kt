package com.hdhomey.app.ui.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.hdhomey.app.data.repository.ServerRepository
import com.hdhomey.app.ui.auth.AuthenticationScreen
import com.hdhomey.app.ui.channels.ChannelListScreen
import com.hdhomey.app.ui.player.PlayerScreen
import com.hdhomey.app.ui.servers.AddServerScreen
import com.hdhomey.app.ui.servers.ServerListScreen
import com.hdhomey.app.ui.servers.ServerListViewModel
import com.hdhomey.app.ui.success.SuccessScreen
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent

/**
 * Hilt [EntryPoint] for resolving singleton dependencies needed by navigation
 * composables that require repository lookups before rendering (e.g., resolving
 * a server name from a server ID in the [Authentication] route).
 */
@EntryPoint
@InstallIn(SingletonComponent::class)
interface NavGraphEntryPoint {
    fun serverRepository(): ServerRepository
}

/**
 * Root navigation host for the HD Homey app.
 *
 * Defines the full screen-level navigation graph using type-safe serializable
 * routes (see [Routes.kt]). Each route maps to its corresponding Compose screen
 * composable.
 *
 * Screens requiring Hilt ViewModels resolve them via [hiltViewModel], leveraging
 * Hilt's Compose navigation integration for scoped lifecycle management.
 *
 * @param navController The [NavHostController]; defaults to [rememberNavController].
 */
@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = ServerList,
        modifier = Modifier.fillMaxSize()
    ) {
        // ── Server List ────────────────────────────────────────────────────
        composable<ServerList> {
            val viewModel: ServerListViewModel = hiltViewModel()
            ServerListScreen(
                viewModel = viewModel,
                navController = navController
            )
        }

        // ── Add Server ─────────────────────────────────────────────────────
        composable<AddServer> {
            AddServerScreen(
                navController = navController
            )
        }

        // ── Authentication (Device Code Pairing) ───────────────────────────
        composable<Authentication> { backStackEntry ->
            val route: Authentication = backStackEntry.toRoute()
            val context = LocalContext.current

            // Resolve the server name from the repository so the screen can
            // display "Pair with <server name>" in its title. Uses a Hilt
            // EntryPoint for singleton access from the composable layer.
            var resolvedServerName by remember { mutableStateOf("") }

            LaunchedEffect(route.serverId) {
                val entryPoint = EntryPointAccessors.fromApplication(
                    context.applicationContext,
                    NavGraphEntryPoint::class.java
                )
                resolvedServerName = entryPoint.serverRepository()
                    .getServerById(route.serverId)?.name ?: ""
            }

            AuthenticationScreen(
                serverId = route.serverId,
                serverName = resolvedServerName.ifEmpty { "Server" },
                onBack = { navController.popBackStack() },
                onAuthorized = { serverId, serverName ->
                    navController.navigate(
                        Success(serverId = serverId, serverName = serverName)
                    ) {
                        popUpTo<ServerList>()
                    }
                }
            )
        }

        // ── Channel List ───────────────────────────────────────────────────
        composable<ChannelList> {
            ChannelListScreen(
                navController = navController
            )
        }

        // ── Video Player ───────────────────────────────────────────────────
        composable<Player> { backStackEntry ->
            val route: Player = backStackEntry.toRoute()
            PlayerScreen(
                channelId = route.channelId,
                channelName = route.channelName,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ── Success (Post-Authentication) ──────────────────────────────────
        composable<Success> { backStackEntry ->
            val route: Success = backStackEntry.toRoute()
            SuccessScreen(
                serverName = route.serverName,
                serverId = route.serverId,
                navController = navController
            )
        }
    }
}
