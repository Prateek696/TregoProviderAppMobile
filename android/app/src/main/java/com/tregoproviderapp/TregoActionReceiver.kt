package com.tregoproviderapp

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.RemoteInput

/**
 * Handles notification action button taps without opening the app.
 *
 * Voice → starts TregoRecordingService (records inline, uploads when done)
 * Text  → reads RemoteInput text → posts to backend directly via TregoJobSubmitter
 */
class TregoActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {

            TregoNotificationModule.ACTION_RECORD_VOICE -> {
                val serviceIntent = Intent(context, TregoRecordingService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }

            TregoNotificationModule.ACTION_RECORD_TEXT -> {
                val results = RemoteInput.getResultsFromIntent(intent)
                val text = results?.getCharSequence(TregoNotificationModule.REMOTE_INPUT_KEY)
                    ?.toString()?.trim()
                if (!text.isNullOrEmpty()) {
                    TregoJobSubmitter.submitText(context, text)
                    // Update notification to confirm
                    TregoNotificationModule.updateNotificationAfterText(context, text)
                }
            }
        }
    }
}
