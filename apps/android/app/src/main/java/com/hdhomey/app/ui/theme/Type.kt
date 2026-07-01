package com.hdhomey.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Standard phone/tablet typography. */
val PhoneTypography = Typography(
    displayLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 36.sp,
        lineHeight = 44.sp,
        letterSpacing = (-0.25).sp
    ),
    displayMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        lineHeight = 38.sp
    ),
    headlineLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 28.sp
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp
    ),
    bodySmall = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
    labelSmall = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    )
)

/**
 * Android TV typography with larger sizes for 10-foot UI.
 * Increases headline, title, and body sizes per DESIGN.md §2.2.
 */
fun tvTypography(): Typography = PhoneTypography.copy(
    displayLarge = PhoneTypography.displayLarge.copy(fontSize = 96.sp),
    displayMedium = PhoneTypography.displayMedium.copy(fontSize = 48.sp),
    headlineLarge = PhoneTypography.headlineLarge.copy(fontSize = 48.sp),
    headlineMedium = PhoneTypography.headlineMedium.copy(fontSize = 32.sp),
    titleLarge = PhoneTypography.titleLarge.copy(fontSize = 32.sp),
    titleMedium = PhoneTypography.titleMedium.copy(fontSize = 24.sp),
    bodyLarge = PhoneTypography.bodyLarge.copy(fontSize = 20.sp),
    bodyMedium = PhoneTypography.bodyMedium.copy(fontSize = 18.sp)
)
