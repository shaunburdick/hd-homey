package com.hdhomey.app.ui.servers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.hdhomey.app.ui.components.AsyncState
import com.hdhomey.app.ui.components.adaptiveValues
import com.hdhomey.app.ui.theme.ErrorRed
import com.hdhomey.app.ui.theme.HdHomeyBlue

/**
 * Internal phase tracker for the server-add form workflow.
 *
 * Distinguishes between idle, connection testing, and server-save phases
 * so the [LaunchedEffect] reacting to [AddServerViewModel.connectionState]
 * transitions can correctly determine the next action without ambiguity.
 */
private enum class FormPhase {
    /** No operation in progress — initial state or after cancellation. */
    IDLE,

    /** [AddServerViewModel.testConnection] is in flight. */
    TESTING_CONNECTION,

    /** Server health check passed — [AddServerViewModel.saveServer] is being called. */
    SAVING_SERVER
}

/**
 * Server-add form screen composable.
 *
 * Provides a two-field form (name + URL) with inline validation, connection
 * testing via the HDHomeRun health endpoint, and server persistence. The user
 * flow is:
 *
 * 1. Fill in server name and URL (URL pre-filled with `"http://"`).
 * 2. Tap **Connect** to run a health check.
 * 3. On success, the server is saved and the screen navigates back to the
 *    server list. On failure, an inline error is displayed.
 *
 * Adapts layout to TV vs phone form factors using [AdaptiveValues] and
 * applies D-pad focus-change tracking via [Modifier.onFocusChanged] for
 * TV remote compatibility.
 *
 * @param viewModel The [AddServerViewModel]; defaults to [hiltViewModel] injection.
 * @param navController [NavController] for navigating back to [ServerList].
 */
@Composable
fun AddServerScreen(
    viewModel: AddServerViewModel = hiltViewModel(),
    navController: NavController
) {
    // ── Form field state ───────────────────────────────────────────────────────
    var serverName by remember { mutableStateOf("") }
    var serverUrl by remember { mutableStateOf("http://") }
    var nameError by remember { mutableStateOf<String?>(null) }
    var urlError by remember { mutableStateOf<String?>(null) }
    var connectionError by remember { mutableStateOf<String?>(null) }
    var formPhase by remember { mutableStateOf(FormPhase.IDLE) }

    val connectionState by viewModel.connectionState.collectAsStateWithLifecycle()
    val adaptive = adaptiveValues()

    // ── TV D-pad focus tracking ────────────────────────────────────────────────
    // These variables are captured by onFocusChanged closures below and used
    // to drive custom focus visuals on TV; the delegates keep the state alive.
    var isNameFocused by remember { mutableStateOf(false) }
    var isUrlFocused by remember { mutableStateOf(false) }

    // ── React to connection state transitions ──────────────────────────────────
    //
    // The ViewModel's connectionState transitions through Loading → Success/Error.
    // We use a formPhase enum to disambiguate the meaning of each transition:
    //
    //   IDLE               → ignore Success(false) (initial / reset)
    //   TESTING_CONNECTION → health check in flight
    //     • Success(true)  → switch to SAVING_SERVER, call saveServer()
    //     • Success(false) → server responded non-2xx → show error
    //     • Error(msg)     → network failure → show error
    //   SAVING_SERVER      → saveServer() in flight
    //     • Success(false) → save completed → navigate back
    //     • Error(msg)     → save failed (e.g. duplicate name) → show error
    //
    LaunchedEffect(connectionState) {
        when (connectionState) {
            is AsyncState.Loading -> {
                if (formPhase == FormPhase.IDLE) {
                    formPhase = FormPhase.TESTING_CONNECTION
                    connectionError = null
                }
            }

            is AsyncState.Error -> {
                if (formPhase == FormPhase.TESTING_CONNECTION ||
                    formPhase == FormPhase.SAVING_SERVER
                ) {
                    formPhase = FormPhase.IDLE
                    connectionError = (connectionState as AsyncState.Error).message
                }
            }

            is AsyncState.Success -> {
                val isHealthy = (connectionState as AsyncState.Success<Boolean>).data
                when (formPhase) {
                    FormPhase.TESTING_CONNECTION -> {
                        if (isHealthy) {
                            formPhase = FormPhase.SAVING_SERVER
                            viewModel.saveServer(serverName.trim(), serverUrl)
                        } else {
                            formPhase = FormPhase.IDLE
                            connectionError = "Server responded but health check failed"
                        }
                    }

                    FormPhase.SAVING_SERVER -> {
                        formPhase = FormPhase.IDLE
                        if (!isHealthy) {
                            navController.popBackStack()
                        }
                        // isHealthy == true should not occur during save
                    }

                    FormPhase.IDLE -> { /* ignore — initial or reset */ }
                }
            }
        }
    }

    // ── Derived state ──────────────────────────────────────────────────────────
    val isLoading = formPhase == FormPhase.TESTING_CONNECTION ||
        formPhase == FormPhase.SAVING_SERVER

    val connectButtonLabel = when (formPhase) {
        FormPhase.TESTING_CONNECTION -> "Testing connection\u2026"
        FormPhase.SAVING_SERVER -> "Saving\u2026"
        FormPhase.IDLE -> "Connect"
    }

    // ── Callbacks ──────────────────────────────────────────────────────────────

    /**
     * Handles URL field changes: updates state, clears stale connection results,
     * re-validates the URL in real time, and resets the form phase if a test
     * was in flight.
     */
    fun onUrlChange(newUrl: String) {
        serverUrl = newUrl
        viewModel.resetConnectionState()
        urlError = viewModel.validateUrl(newUrl)
        connectionError = null
        if (formPhase != FormPhase.IDLE) {
            formPhase = FormPhase.IDLE
        }
    }

    /**
     * Handles server-name field changes.
     */
    fun onNameChange(newName: String) {
        serverName = newName
        nameError = null
    }

    /**
     * Validates form fields and starts the connection test.
     *
     * Both fields are validated before the request is dispatched. Previous
     * connection errors are cleared so the new result is always fresh.
     */
    val onConnect: () -> Unit = {
        val nameTrimmed = serverName.trim()
        val urlValidationErr = viewModel.validateUrl(serverUrl)

        when {
            nameTrimmed.isEmpty() -> {
                nameError = "Server name is required"
            }
            urlValidationErr != null -> {
                urlError = urlValidationErr
            }
            else -> {
                nameError = null
                urlError = null
                connectionError = null
                viewModel.testConnection(serverUrl)
            }
        }
    }

    // ── UI ─────────────────────────────────────────────────────────────────────

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = adaptive.screenPadding)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top spacing
            Spacer(modifier = Modifier.height(adaptive.contentSpacing))

            // ── Title ──────────────────────────────────────────────────────────
            Text(
                text = "Add Server",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            // ── Instructions ───────────────────────────────────────────────────
            Text(
                text = "Enter your HDHomeRun server details to get started.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(adaptive.contentSpacing))

            // ── Server Name field ──────────────────────────────────────────────
            OutlinedTextField(
                value = serverName,
                onValueChange = ::onNameChange,
                label = { Text("Server Name") },
                isError = nameError != null,
                supportingText = if (nameError != null) {
                    @Composable { Text(text = nameError!!, color = MaterialTheme.colorScheme.error) }
                } else {
                    null
                },
                singleLine = true,
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { isNameFocused = it.isFocused }
                    .testTag("server_name_field")
            )

            Spacer(modifier = Modifier.height(adaptive.cardSpacing))

            // ── Server URL field ───────────────────────────────────────────────
            OutlinedTextField(
                value = serverUrl,
                onValueChange = ::onUrlChange,
                label = { Text("Server URL") },
                isError = urlError != null,
                supportingText = {
                    if (urlError != null) {
                        Text(
                            text = urlError!!,
                            color = MaterialTheme.colorScheme.error
                        )
                    } else {
                        Text(
                            text = "e.g., http://192.168.1.100:3000",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                singleLine = true,
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { isUrlFocused = it.isFocused }
                    .testTag("server_url_field")
            )

            // ── Connection error ───────────────────────────────────────────────
            if (connectionError != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = connectionError!!,
                    color = ErrorRed,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // ── Loading / progress indicator ───────────────────────────────────
            if (isLoading) {
                Spacer(modifier = Modifier.height(adaptive.cardSpacing))
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = HdHomeyBlue,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(adaptive.contentSpacing))

            // ── Connect button ─────────────────────────────────────────────────
            Button(
                onClick = onConnect,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = HdHomeyBlue
                )
            ) {
                Text(text = connectButtonLabel)
            }

            Spacer(modifier = Modifier.height(adaptive.cardSpacing))

            // ── Cancel button ──────────────────────────────────────────────────
            OutlinedButton(
                onClick = { navController.popBackStack() },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading
            ) {
                Text(text = "Cancel")
            }

            // Bottom spacing
            Spacer(modifier = Modifier.height(adaptive.contentSpacing))
        }
    }
}
