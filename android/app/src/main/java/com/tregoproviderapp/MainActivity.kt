package com.tregoproviderapp

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "TregoProviderApp"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleIntent(it) }
    }

    private fun handleIntent(intent: Intent) {
        val action = intent.action ?: return
        val eventName = when (action) {
            TregoNotificationModule.ACTION_RECORD_VOICE -> "TregoRecordVoice"
            TregoNotificationModule.ACTION_RECORD_TEXT  -> "TregoRecordText"
            else -> return
        }
        // Post to main thread — React context may not be ready yet at onCreate
        mainHandler.post {
            try {
                val app = application as MainApplication
                val ctx = app.reactHost.currentReactContext ?: return@post
                ctx.getNativeModule(TregoNotificationModule::class.java)?.emitEvent(eventName)
            } catch (_: Exception) { }
        }
    }

    private val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())
}
