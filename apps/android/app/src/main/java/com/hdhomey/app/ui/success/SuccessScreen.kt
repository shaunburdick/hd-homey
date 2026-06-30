package com.hdhomey.app.ui.success

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.hdhomey.app.ui.components.adaptiveValues
import com.hdhomey.app.ui.navigation.ChannelList
import com.hdhomey.app.ui.navigation.ServerList
import com.hdhomey.app.ui.theme.SuccessGreen

/**
 * Confirmation screen displayed after successful device code authentication.
 *
 * Shows a success checkmark icon, the connected server name, and two action
 * buttons: "View Channels" navigates to [ChannelList] for this server (clearing
 * the back stack up to [ServerList]), and "Back to Servers" returns to the
 * server selection screen with a clean back stack.
 *
 * Adapts layout to TV vs phone form factors using [adaptiveValues] — TV screens
 * receive wider horizontal margins (48 dp) and automatically inherit the
 * larger TV typography from [HdHomeyTheme].
 *
 * @param serverName Display name of the successfully connected server.
 * @param serverId The server ID used to navigate to [ChannelList].
 * @param navController [NavController] for navigating to related screens.
 */
@Composable
fun SuccessScreen(
    serverName: String,
    serverId: String,
    navController: NavController
) {
    val adaptive = adaptiveValues()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = adaptive.screenPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // ── Success checkmark ───────────────────────────────────────────
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = "Authentication successful",
            modifier = Modifier.size(64.dp),
            tint = SuccessGreen
        )

        Spacer(modifier = Modifier.height(24.dp))

        // ── Title ───────────────────────────────────────────────────────
        Text(
            text = "You're Connected!",
            style = MaterialTheme.typography.displayMedium.copy(fontSize = 32.sp),
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(8.dp))

        // ── Server info ─────────────────────────────────────────────────
        Text(
            text = "Connected to $serverName",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        // ── View Channels button ────────────────────────────────────────
        Button(
            onClick = {
                navController.navigate(ChannelList(serverId = serverId)) {
                    popUpTo<ServerList>()
                }
            }
        ) {
            Text("View Channels")
        }

        Spacer(modifier = Modifier.height(12.dp))

        // ── Back to Servers button ──────────────────────────────────────
        OutlinedButton(
            onClick = {
                navController.navigate(ServerList) {
                    popUpTo<ServerList> { inclusive = true }
                }
            }
        ) {
            Text("Back to Servers")
        }
    }
}
