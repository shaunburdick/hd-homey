package com.hdhomey.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val HdHomeyShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),   // badges, tags
    small = RoundedCornerShape(4.dp),        // small buttons
    medium = RoundedCornerShape(8.dp),       // cards, inputs, buttons
    large = RoundedCornerShape(12.dp),       // dialogs, TV cards
    extraLarge = RoundedCornerShape(16.dp)   // bottom sheets
)
