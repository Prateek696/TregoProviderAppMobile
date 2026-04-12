package com.tregoproviderapp

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle

/**
 * Minimal trampoline activity — fires ACTION_SHOW_TEXT_INPUT to TregoPersistentService
 * which shows the real input as a WindowManager overlay (over home screen, not inside the app).
 */
class TregoTextInputActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val intent = Intent(this, TregoPersistentService::class.java).apply {
            action = TregoPersistentService.ACTION_SHOW_TEXT_INPUT
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        finish()
    }
}
