package com.hdhomey.app.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute

@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = ServerList,
        modifier = Modifier.fillMaxSize()
    ) {
        composable<ServerList> {
            PlaceholderScreen("Server List")
        }

        composable<AddServer> {
            PlaceholderScreen("Add Server")
        }

        composable<Authentication> { backStackEntry ->
            val route: Authentication = backStackEntry.toRoute()
            PlaceholderScreen("Authentication (${route.serverId})")
        }

        composable<ChannelList> { backStackEntry ->
            val route: ChannelList = backStackEntry.toRoute()
            PlaceholderScreen("Channel List (${route.serverId ?: "active"})")
        }

        composable<Player> { backStackEntry ->
            val route: Player = backStackEntry.toRoute()
            PlaceholderScreen("Player: ${route.channelName}")
        }

        composable<Success> {
            PlaceholderScreen("Success")
        }
    }
}

/**
 * Temporary placeholder screen used during migration — displays the screen
 * name centered on screen. Replaced by real screen composables in Waves 1-3.
 */
@Composable
private fun PlaceholderScreen(name: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onBackground
        )
    }
}
