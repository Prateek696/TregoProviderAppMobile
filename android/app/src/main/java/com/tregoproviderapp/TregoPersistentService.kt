package com.tregoproviderapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput

class TregoPersistentService : Service() {

    companion object {
        const val ACTION_SHOW = "SHOW"
        const val ACTION_HIDE = "HIDE"

        fun buildNotification(context: Context): Notification {
            val openApp = PendingIntent.getActivity(
                context, 0,
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val voiceIntent = PendingIntent.getBroadcast(
                context, 1,
                Intent(context, TregoActionReceiver::class.java).apply {
                    action = TregoNotificationModule.ACTION_RECORD_VOICE
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val remoteInput = RemoteInput.Builder(TregoNotificationModule.REMOTE_INPUT_KEY)
                .setLabel("Describe the job…")
                .build()

            val textIntent = PendingIntent.getBroadcast(
                context, 2,
                Intent(context, TregoActionReceiver::class.java).apply {
                    action = TregoNotificationModule.ACTION_RECORD_TEXT
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )

            val voiceAction = NotificationCompat.Action.Builder(
                android.R.drawable.ic_btn_speak_now, "🎤 Voice", voiceIntent
            ).build()

            val textAction = NotificationCompat.Action.Builder(
                android.R.drawable.ic_menu_edit, "✏️ Text", textIntent
            ).addRemoteInput(remoteInput).build()

            return NotificationCompat.Builder(context, TregoNotificationModule.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentTitle("Trego — Log a job")
                .setContentText("Tap Voice or Text to capture without opening the app")
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .bigText("Tap Voice to record a job, or Text to type it — no need to open the app.")
                )
                .setContentIntent(openApp)
                .setOngoing(true)
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .addAction(voiceAction)
                .addAction(textAction)
                .build()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ensureChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_HIDE) {
            stopForeground(true)
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(TregoNotificationModule.NOTIFICATION_ID, buildNotification(this))
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(true)
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(TregoNotificationModule.CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    TregoNotificationModule.CHANNEL_ID,
                    "Trego Job Capture",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Persistent shortcut to log jobs"
                    setShowBadge(false)
                    enableVibration(false)
                    setSound(null, null)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }
}
