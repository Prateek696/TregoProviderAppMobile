package com.tregoproviderapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle

/**
 * Transparent no-UI activity that handles notification action buttons.
 * Using getActivity() PendingIntent because broadcast-triggered service starts
 * are blocked by some OEM background-restriction policies.
 * Finishes immediately after acting.
 */
class TregoNotifActionActivity : Activity() {

    companion object {
        const val EXTRA_ACTION   = "notif_action"
        const val ACTION_STOP    = "stop_recording"
        const val ACTION_CONFIRM = "confirm"
        const val ACTION_REDO    = "redo"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        when (intent?.getStringExtra(EXTRA_ACTION)) {
            ACTION_STOP    -> handleStop()
            ACTION_CONFIRM -> handleConfirm()
            ACTION_REDO    -> handleRedo()
        }
        finish()
    }

    private fun handleStop() {
        sendToPersistentService(TregoPersistentService.ACTION_STOP_RECORDING)
    }

    private fun handleConfirm() {
        val prefs   = getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
        val rawText = prefs.getString(TregoNotificationModule.PREFS_PENDING_TEXT, null)
        prefs.edit().remove(TregoNotificationModule.PREFS_PENDING_TEXT).apply()

        if (!rawText.isNullOrBlank()) {
            TregoJobSubmitter.submitText(this, rawText)
            TregoPersistentService.updateNotificationAfterText(this, rawText)
        }
        sendToPersistentService(TregoPersistentService.ACTION_SHOW)
    }

    private fun handleRedo() {
        getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
            .edit().remove(TregoNotificationModule.PREFS_PENDING_TEXT).apply()
        sendToPersistentService(TregoPersistentService.ACTION_START_RECORDING)
    }

    private fun sendToPersistentService(action: String) {
        val intent = Intent(this, TregoPersistentService::class.java).apply {
            this.action = action
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }
}
