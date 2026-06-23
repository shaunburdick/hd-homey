package com.hdhomey.app

import android.os.Bundle
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import com.hdhomey.app.storage.AppPreferences
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main activity for HD Homey Android app.
 *
 * Uses single Activity pattern with Fragment navigation.
 * Detects device type (TV/tablet/phone) and applies appropriate theme.
 *
 * Phase 1.4: Routes to appropriate screen based on app state:
 * - First launch (no servers) → AddServerFragment
 * - Has servers → ServerListFragment (default)
 * 
 * Back button behavior:
 * - From ServerListFragment → Exits app
 * - From other screens → Standard back navigation
 */
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Apply TV theme if running on Android TV
        if (isAndroidTv()) {
            setTheme(R.style.Theme_HdHomey_Leanback)
        }

        // Set up initial navigation based on app state
        if (savedInstanceState == null) {
            setupInitialNavigation()
        }

        // Set up back button behavior
        setupBackButtonHandling()
    }

    /**
     * Sets up initial navigation destination based on whether servers exist.
     *
     * If no servers exist → Navigate to AddServerFragment ("Add Your First Server")
     * If servers exist → Stay on ServerListFragment (default start destination)
     */
    private fun setupInitialNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
            ?: return

        val navController = navHostFragment.navController
        val preferences = AppPreferences.getInstance(this)

        // Check if any servers exist
        val servers = preferences.loadServers()

        if (servers.isEmpty()) {
            // First launch - no servers configured
            // Navigate to AddServerFragment
            navController.navigate(R.id.addServerFragment)
        }
        // else: Stay on default startDestination (ServerListFragment)
    }

    /**
     * Sets up back button handling to ensure proper navigation behavior.
     * 
     * When on ServerListFragment, back button exits the app.
     * This prevents confusing navigation (back to AddServerFragment, etc.)
     */
    private fun setupBackButtonHandling() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
            ?: return

        val navController = navHostFragment.navController

        // Handle back button press
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // If we're on the ServerListFragment (start destination), exit app
                if (navController.currentDestination?.id == R.id.serverListFragment) {
                    finish()
                } else {
                    // Otherwise, use default back navigation
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        })
    }

    /**
     * Check if running on Android TV.
     */
    private fun isAndroidTv(): Boolean {
        return packageManager.hasSystemFeature("android.software.leanback")
    }
}
