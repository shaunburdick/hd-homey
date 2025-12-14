package com.hdhomey.app.ui.success

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.hdhomey.app.R

/**
 * Success fragment shown after successful authentication.
 * 
 * Displays server name, username, and role, then allows user to
 * return to the server list.
 */
class SuccessFragment : Fragment() {
    
    private lateinit var titleText: TextView
    private lateinit var messageText: TextView
    private lateinit var serverInfoText: TextView
    private lateinit var doneButton: Button
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_success, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Initialize views
        titleText = view.findViewById(R.id.text_title)
        messageText = view.findViewById(R.id.text_message)
        serverInfoText = view.findViewById(R.id.text_server_info)
        doneButton = view.findViewById(R.id.button_done)
        
        // Get arguments
        val serverName = arguments?.getString("serverName") ?: "HD Homey"
        val username = arguments?.getString("username") ?: "Unknown User"
        val role = arguments?.getString("role") ?: "viewer"
        
        // Display server and user info
        val roleCapitalized = role.replaceFirstChar { it.uppercase() }
        serverInfoText.text = getString(
            R.string.success_authenticated_as,
            username,
            roleCapitalized,
            serverName
        )
        
        // Done button navigates back to server list
        doneButton.setOnClickListener {
            findNavController().navigate(R.id.action_success_to_serverList)
        }
    }
}
