package com.hdhomey.app.ui.theme

import android.content.res.Configuration
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalConfiguration

private val HdHomeyDarkColorScheme = darkColorScheme(
    primary = HdHomeyBlue,
    onPrimary = TextPrimary,
    primaryContainer = HdHomeyBlueDark,
    secondary = HdHomeyBlue,
    background = BackgroundDark,
    onBackground = TextPrimary,
    surface = SurfaceDark,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceDarkElevated,
    onSurfaceVariant = TextSecondary,
    outline = ColorBorder,
    error = ErrorRed,
    onError = TextPrimary,
    errorContainer = ErrorContainer
)

private val HdHomeyExtendedColors = ExtendedColors(
    success = SuccessGreen,
    successContainer = SuccessContainer,
    warning = WarningYellow,
    warningContainer = WarningContainer,
    info = InfoBlue,
    infoContainer = InfoContainer,
    textTertiary = TextTertiary,
    textDisabled = TextDisabled
)

@Composable
fun HdHomeyTheme(
    isTv: Boolean = LocalConfiguration.current.uiMode and
        Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION,
    content: @Composable () -> Unit
) {
    val typography = if (isTv) tvTypography() else PhoneTypography

    CompositionLocalProvider(
        LocalExtendedColors provides HdHomeyExtendedColors
    ) {
        MaterialTheme(
            colorScheme = HdHomeyDarkColorScheme,
            typography = typography,
            shapes = HdHomeyShapes,
            content = content
        )
    }
}
