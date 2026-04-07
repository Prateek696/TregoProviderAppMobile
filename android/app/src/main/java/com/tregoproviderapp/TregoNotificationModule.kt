package com.tregoproviderapp

import android.content.Context
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
        const val CHANNEL_ID          = "trego_jobs_v4"
        const val NOTIFICATION_ID     = 1001
        const val ACTION_RECORD_VOICE = "com.tregoproviderapp.ACTION_RECORD_VOICE"
        const val ACTION_RECORD_TEXT  = "com.tregoproviderapp.ACTION_RECORD_TEXT"
        const val ACTION_RECORD_JOB   = ACTION_RECORD_VOICE
        const val REMOTE_INPUT_KEY    = "text_input"

        fun updateNotificationAfterText(context: Context, submittedText: String) {
            val nm = NotificationManagerCompat.from(context)

            // 1. Re-post the persistent notification with same ID to clear the RemoteInput spinner
            nm.notify(NOTIFICATION_ID, TregoPersistentService.buildNotification(context))

            // 2. Post a brief "Job logged!" confirmation notification
            val logged = androidx.core.app.NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentTitle("Job logged!")
                .setContentText("\"${submittedText.take(60)}\"")
                .setAutoCancel(true)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .build()
            nm.notify(NOTIFICATION_ID + 10, logged)
        }
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

    // Required by NativeEventEmitter on JS side
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    fun emitEvent(eventName: String) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, null)
        } catch (_: Exception) { }
    }
}
