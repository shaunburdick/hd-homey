package com.hdhomey.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.hdhomey.app.ui.navigation.AppNavHost
import com.hdhomey.app.ui.theme.HdHomeyTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main activity for HD Homey Android app.
 *
 * Uses single Activity pattern with Compose navigation.
 * Theme and TV detection handled internally by [HdHomeyTheme].
 * Navigation graph managed by [AppNavHost].
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HdHomeyTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavHost()
                }
            }
        }
    }
}
