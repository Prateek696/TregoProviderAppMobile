package com.tregoproviderapp

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class TregoBubbleModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TregoBubble"

    /** Returns true if SYSTEM_ALERT_WINDOW permission is granted */
    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactContext))
    }

    /** Opens the system settings screen to grant overlay permission */
    @ReactMethod
    fun requestOverlayPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactContext.packageName}")
        ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        reactContext.startActivity(intent)
    }

    /** Start the floating bubble foreground service */
    @ReactMethod
    fun showBubble() {
        if (!Settings.canDrawOverlays(reactContext)) return
        try {
            val intent = Intent(reactContext, TregoBubbleService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (e: Exception) {
            android.util.Log.e("TregoBubble", "Failed to start bubble: ${e.message}")
        }
    }

    /** Stop the floating bubble */
    @ReactMethod
    fun hideBubble() {
        val intent = Intent(reactContext, TregoBubbleService::class.java)
        reactContext.stopService(intent)
    }
}
