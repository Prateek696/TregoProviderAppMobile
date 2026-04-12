package com.tregoproviderapp

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat

/**
 * Handles ALL notification button taps via broadcasts.
 *
 * Key design: the persistent service is ALWAYS running, so we use startService()
 * (not startForegroundService()) to send it commands. startService() is always
 * allowed when a FGS is running. We also call nm.notify() for immediate UI updates.
 */
class TregoActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {

            // ── Default state buttons ────────────────────────────────────────────

            TregoNotificationModule.ACTION_RECORD_VOICE -> {
                if (!hasMic(context)) return
                // Immediately show recording UI, then tell service to start recording
                TregoPersistentService.notifyRecordingState(context)
                sendToService(context, TregoPersistentService.ACTION_START_RECORDING)
            }

            TregoNotificationModule.ACTION_SHOW_TEXT_MODE -> {
                // Switch notification to text-input state — no service call needed
                TregoPersistentService.notifyTextMode(context)
            }

            // ── Text mode buttons ────────────────────────────────────────────────

            TregoNotificationModule.ACTION_SUBMIT_TEXT -> {
                val results = RemoteInput.getResultsFromIntent(intent)
                val text = results?.getCharSequence(TregoNotificationModule.REMOTE_INPUT_KEY)
                    ?.toString()?.trim()
                if (!text.isNullOrEmpty()) {
                    TregoJobSubmitter.submitText(context, text)
                    TregoPersistentService.notifyJobLogged(context, text)
                    // Restore normal state after 3 s
                    Handler(Looper.getMainLooper()).postDelayed({
                        sendToService(context, TregoPersistentService.ACTION_SHOW)
                    }, 3_000)
                }
            }

            TregoNotificationModule.ACTION_CANCEL_TEXT -> {
                sendToService(context, TregoPersistentService.ACTION_SHOW)
            }

            // ── Recording state buttons ──────────────────────────────────────────

            TregoNotificationModule.ACTION_DONE_RECORDING -> {
                // Service stops recording, transcribes, shows review
                sendToService(context, TregoPersistentService.ACTION_STOP_RECORDING)
            }

            TregoNotificationModule.ACTION_CANCEL_RECORDING -> {
                // Service stops recording and restores normal state
                sendToService(context, TregoPersistentService.ACTION_SHOW)
            }

            // ── Review state buttons ─────────────────────────────────────────────

            TregoNotificationModule.ACTION_CONFIRM_JOB -> {
                val prefs   = context.getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
                val rawText = prefs.getString(TregoNotificationModule.PREFS_PENDING_TEXT, null)
                prefs.edit().remove(TregoNotificationModule.PREFS_PENDING_TEXT).apply()

                if (!rawText.isNullOrBlank()) {
                    TregoJobSubmitter.submitText(context, rawText)
                    TregoPersistentService.notifyJobLogged(context, rawText)
                    Handler(Looper.getMainLooper()).postDelayed({
                        sendToService(context, TregoPersistentService.ACTION_SHOW)
                    }, 3_000)
                } else {
                    sendToService(context, TregoPersistentService.ACTION_SHOW)
                }
            }

            TregoNotificationModule.ACTION_REDO_RECORDING -> {
                context.getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
                    .edit().remove(TregoNotificationModule.PREFS_PENDING_TEXT).apply()
                TregoPersistentService.notifyRecordingState(context)
                sendToService(context, TregoPersistentService.ACTION_START_RECORDING)
            }

            // ── System events ────────────────────────────────────────────────────

            TregoNotificationModule.ACTION_NOTIF_DISMISSED -> {
                // Notification was swiped away — restart the foreground service
                val i = Intent(context, TregoPersistentService::class.java).apply {
                    action = TregoPersistentService.ACTION_SHOW
                }
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(i)
                } else {
                    context.startService(i)
                }
            }

            // Legacy inline-reply from system action button
            TregoNotificationModule.ACTION_RECORD_TEXT -> {
                val results = RemoteInput.getResultsFromIntent(intent)
                val text = results?.getCharSequence(TregoNotificationModule.REMOTE_INPUT_KEY)
                    ?.toString()?.trim()
                if (!text.isNullOrEmpty()) {
                    TregoJobSubmitter.submitText(context, text)
                    TregoPersistentService.notifyJobLogged(context, text)
                    Handler(Looper.getMainLooper()).postDelayed({
                        sendToService(context, TregoPersistentService.ACTION_SHOW)
                    }, 3_000)
                }
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /** Send a command to TregoPersistentService which is always running as a FGS. */
    private fun sendToService(context: Context, action: String) {
        context.startService(Intent(context, TregoPersistentService::class.java).apply {
            this.action = action
        })
    }

    private fun hasMic(context: Context) =
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
}
