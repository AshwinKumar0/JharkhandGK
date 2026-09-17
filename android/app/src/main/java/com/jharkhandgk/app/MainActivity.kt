package com.jharkhandgk.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.jharkhandgk.app.ui.JharkhandGkApp
import com.jharkhandgk.app.ui.theme.JharkhandGkTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            JharkhandGkTheme {
                JharkhandGkApp()
            }
        }
    }
}
