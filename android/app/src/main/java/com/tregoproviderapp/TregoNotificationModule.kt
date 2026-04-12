package com.tregoproviderapp

import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class TregoNotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val CHANNEL_ID               = "trego_jobs_v7"
        const val NOTIFICATION_ID          = 1001

        // Notification button actions — all handled by TregoActionReceiver via getBroadcast()
        const val ACTION_RECORD_VOICE      = "com.tregoproviderapp.ACTION_RECORD_VOICE"
        const val ACTION_RECORD_TEXT       = "com.tregoproviderapp.ACTION_RECORD_TEXT"
        const val ACTION_SHOW_TEXT_MODE    = "com.tregoproviderapp.ACTION_SHOW_TEXT_MODE"
        const val ACTION_SUBMIT_TEXT       = "com.tregoproviderapp.ACTION_SUBMIT_TEXT"
        const val ACTION_CANCEL_TEXT       = "com.tregoproviderapp.ACTION_CANCEL_TEXT"
        const val ACTION_DONE_RECORDING    = "com.tregoproviderapp.ACTION_DONE_RECORDING"
        const val ACTION_CANCEL_RECORDING  = "com.tregoproviderapp.ACTION_CANCEL_RECORDING"
        const val ACTION_CONFIRM_JOB       = "com.tregoproviderapp.ACTION_CONFIRM_JOB"
        const val ACTION_REDO_RECORDING    = "com.tregoproviderapp.ACTION_REDO_RECORDING"
        const val ACTION_NOTIF_DISMISSED   = "com.tregoproviderapp.ACTION_NOTIF_DISMISSED"

        // Aliases kept for back-compat
        const val ACTION_RECORD_JOB        = ACTION_RECORD_VOICE

        const val REMOTE_INPUT_KEY         = "text_input"
        const val PREFS_PENDING_TEXT       = "pending_raw_text"
    }

    override fun getName(): String = "TregoNotification"

    @ReactMethod
    fun setAuthCredentials(token: String, apiUrl: String) {
        TregoJobSubmitter.storeToken(reactContext, token, apiUrl)
    }

    @ReactMethod
    fun showPersistentNotification() {
        val intent = Intent(reactContext, TregoPersistentService::class.java).apply {
            action = TregoPersistentService.ACTION_SHOW
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun hidePersistentNotification() {
        val intent = Intent(reactContext, TregoPersistentService::class.java).apply {
            action = TregoPersistentService.ACTION_HIDE
        }
        reactContext.startService(intent)
        NotificationManagerCompat.from(reactContext).cancel(NOTIFICATION_ID)
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Only ask once — track with SharedPreferences
            val prefs = reactContext.getSharedPreferences("trego_prefs", android.content.Context.MODE_PRIVATE)
            if (prefs.getBoolean("battery_opt_asked", false)) return

            val pm = reactContext.getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
            if (!pm.isIgnoringBatteryOptimizations(reactContext.packageName)) {
                try {
                    val intent = Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = android.net.Uri.parse("package:${reactContext.packageName}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactContext.startActivity(intent)
                } catch (_: Exception) {}
            }
            // Mark as asked regardless of user choice
            prefs.edit().putBoolean("battery_opt_asked", true).apply()
        }
    }

    @ReactMethod
    fun setPostCallThreshold(seconds: Int) {
        reactContext.getSharedPreferences("trego_prefs", android.content.Context.MODE_PRIVATE)
            .edit().putInt("post_call_threshold", seconds).apply()
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    fun emitEvent(eventName: String) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, null)
        } catch (_: Exception) {}
    }
}
