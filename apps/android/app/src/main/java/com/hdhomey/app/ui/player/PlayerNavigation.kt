package com.hdhomey.app.ui.player

/**
 * Navigation events for the video player screen.
 *
 * This sealed interface represents one-time navigation actions
 * that should be consumed by the UI layer (Activity/Fragment).
 * Events are emitted via SharedFlow for single consumption.
 */
sealed interface PlayerNavigation {
    /**
     * Navigate back to the previous screen (channel list).
     * Emitted when user presses back button or playback completes.
     */
    data object NavigateBack : PlayerNavigation

    /**
     * Show an error message to the user.
     * Typically displayed as a Toast or Snackbar.
     *
     * @property message User-friendly error message to display
     */
    data class ShowError(
        val message: String
    ) : PlayerNavigation

    /**
     * Show a session expired dialog and navigate to login.
     * Emitted when the user's authentication token expires (401/403).
     */
    data object SessionExpired : PlayerNavigation
}
