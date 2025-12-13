package com.hdhomey.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Main activity for HD Homey Android app.
 * 
 * Uses single Activity pattern with Fragment navigation.
 * Detects device type (TV/tablet/phone) and applies appropriate theme.
 */
class MainActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Apply TV theme if running on Android TV
        if (isAndroidTv()) {
            setTheme(R.style.Theme_HdHomey_Leanback)
        }
        
        // Navigation will be set up here once we add fragments
    }
    
    /**
     * Check if running on Android TV.
     */
    private fun isAndroidTv(): Boolean {
        return packageManager.hasSystemFeature("android.software.leanback")
    }
}
