package com.hdhomey.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.hdhomey.app.ui.theme.HdHomeyBlue

/**
 * Generic three-state representation for asynchronous data loading.
 */
sealed interface AsyncState<out T> {
    data object Loading : AsyncState<Nothing>
    data class Success<T>(val data: T) : AsyncState<T>
    data class Error(
        val message: String,
        val cause: Throwable? = null
    ) : AsyncState<Nothing>
}

/**
 * Renders one of three states (loading, error, success/empty) for any
 * screen that loads async data.
 */
@Composable
fun <T> AsyncStateContent(
    state: AsyncState<T>,
    onRetry: () -> Unit,
    loadingContent: @Composable () -> Unit = { ShimmerEffect() },
    emptyCheck: (T) -> Boolean = { false },
    emptyContent: @Composable () -> Unit,
    content: @Composable (T) -> Unit
) {
    when (state) {
        is AsyncState.Loading -> loadingContent()
        is AsyncState.Error -> {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = state.message,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.error
                )
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
        is AsyncState.Success -> {
            val data = state.data
            if (emptyCheck(data)) {
                emptyContent()
            } else {
                content(data)
            }
        }
    }
}
