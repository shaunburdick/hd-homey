package com.hdhomey.app.ui.setup

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.hdhomey.app.R

/**
 * Server setup fragment for discovering HD Homey server.
 * 
 * Handles mDNS discovery and manual URL entry.
 */
class ServerSetupFragment : Fragment() {
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_server_setup, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // TODO: Implement server discovery logic (Phase 1.2)
    }
}
