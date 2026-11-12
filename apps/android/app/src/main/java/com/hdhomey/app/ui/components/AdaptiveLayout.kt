package com.hdhomey.app.ui.components

import android.content.res.Configuration
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp

/**
 * Adaptive values that change based on TV vs phone/tablet form factor.
 *
 * Provides standardised spacing, card corner radii, and text size multipliers
 * that align with DESIGN.md §9 (Platform-Specific Adaptations).
 */
@Stable
data class AdaptiveValues(
    val screenPadding: androidx.compose.ui.unit.Dp,
    val cardPadding: androidx.compose.ui.unit.Dp,
    val cardSpacing: androidx.compose.ui.unit.Dp,
    val cardCornerRadius: androidx.compose.ui.unit.Dp,
    val contentSpacing: androidx.compose.ui.unit.Dp
)

val AdaptivePhone = AdaptiveValues(
    screenPadding = 16.dp,
    cardPadding = 16.dp,
    cardSpacing = 8.dp,
    cardCornerRadius = 8.dp,
    contentSpacing = 16.dp
)

val AdaptiveTv = AdaptiveValues(
    screenPadding = 48.dp,
    cardPadding = 24.dp,
    cardSpacing = 16.dp,
    cardCornerRadius = 12.dp,
    contentSpacing = 32.dp
)

val LocalAdaptiveValues = staticCompositionLocalOf { AdaptivePhone }

/**
 * Returns the current [AdaptiveValues] based on the device configuration.
 */
@Composable
fun adaptiveValues(): AdaptiveValues {
    val isTv = LocalConfiguration.current.uiMode and
        Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION
    return if (isTv) AdaptiveTv else AdaptivePhone
}
