package com.hdhomey.app.ui.success

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.hdhomey.app.R

/**
 * Success fragment shown after successful authentication.
 * 
 * Placeholder until Phase 2 (channel browsing) is implemented.
 */
class SuccessFragment : Fragment() {
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_success, container, false)
    }
}
