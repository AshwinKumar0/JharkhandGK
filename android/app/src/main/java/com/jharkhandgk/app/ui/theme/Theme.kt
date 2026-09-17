package com.jharkhandgk.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF1F6B3A),
    onPrimary = Color.White,
    secondary = Color(0xFFC49A2C),
    onSecondary = Color(0xFF211800),
    tertiary = Color(0xFF326B7C),
    background = Color(0xFFFBFCF8),
    surface = Color.White,
    error = Color(0xFFB3261E)
)

@Composable
fun JharkhandGkTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = MaterialTheme.typography,
        content = content
    )
}
