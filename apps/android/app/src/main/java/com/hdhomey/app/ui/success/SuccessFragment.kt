package com.hdhomey.app.ui.success

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.hdhomey.app.R

/**
 * Success fragment shown after successful authentication.
 * 
 * Displays server name, username, and role with a success animation,
 * then allows user to return to the server list.
 */
class SuccessFragment : Fragment() {
    
    private lateinit var successIcon: ImageView
    private lateinit var titleText: TextView
    private lateinit var messageText: TextView
    private lateinit var serverInfoText: TextView
    private lateinit var doneButton: Button
    private lateinit var viewChannelsButton: Button
    
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
        successIcon = view.findViewById(R.id.success_icon)
        titleText = view.findViewById(R.id.text_title)
        messageText = view.findViewById(R.id.text_message)
        serverInfoText = view.findViewById(R.id.text_server_info)
        doneButton = view.findViewById(R.id.button_done)
        viewChannelsButton = view.findViewById(R.id.button_view_channels)
        
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
        
        // Animate the success screen
        animateSuccess()
        
        // Done button navigates back to server list
        doneButton.setOnClickListener {
            findNavController().navigate(R.id.action_success_to_serverList)
        }
        
        // View Channels button navigates forward to the channel browser.
        // tunerId defaults to -1, which triggers auto-detection of the first available tuner.
        viewChannelsButton.setOnClickListener {
            findNavController().navigate(R.id.action_success_to_channelList)
        }
    }
    
    /**
     * Animates the success screen elements with a staggered fade-in and scale effect.
     */
    private fun animateSuccess() {
        val duration = 400L
        val stagger = 100L
        
        // Icon animation: scale and fade in with overshoot
        val iconScale = AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(successIcon, "scaleX", 0.5f, 1f),
                ObjectAnimator.ofFloat(successIcon, "scaleY", 0.5f, 1f),
                ObjectAnimator.ofFloat(successIcon, "alpha", 0f, 1f)
            )
            this.duration = duration
            interpolator = OvershootInterpolator()
        }
        
        // Title animation: fade in
        val titleFade = ObjectAnimator.ofFloat(titleText, "alpha", 0f, 1f).apply {
            this.duration = duration
            interpolator = DecelerateInterpolator()
            startDelay = stagger
        }
        
        // Message animation: fade in
        val messageFade = ObjectAnimator.ofFloat(messageText, "alpha", 0f, 1f).apply {
            this.duration = duration
            interpolator = DecelerateInterpolator()
            startDelay = stagger * 2
        }
        
        // Server info animation: fade in
        val serverInfoFade = ObjectAnimator.ofFloat(serverInfoText, "alpha", 0f, 1f).apply {
            this.duration = duration
            interpolator = DecelerateInterpolator()
            startDelay = stagger * 3
        }
        
        // Button animation: fade in
        val buttonFade = ObjectAnimator.ofFloat(doneButton, "alpha", 0f, 1f).apply {
            this.duration = duration
            interpolator = DecelerateInterpolator()
            startDelay = stagger * 4
        }
        
        // View Channels button animation: fade in after doneButton
        val viewChannelsFade = ObjectAnimator.ofFloat(viewChannelsButton, "alpha", 0f, 1f).apply {
            this.duration = duration
            interpolator = DecelerateInterpolator()
            startDelay = stagger * 5
        }
        
        // Play all animations together
        AnimatorSet().apply {
            playTogether(iconScale, titleFade, messageFade, serverInfoFade, buttonFade, viewChannelsFade)
            start()
        }
    }
}
