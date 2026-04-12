package com.tregoproviderapp

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.MediaRecorder
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Foreground service that records audio without opening the app.
 * Shows a "Recording… tap to stop" notification.
 * On stop: uploads audio to /api/jobs/voice, updates notification with result.
 */
class TregoRecordingService : Service() {

    companion object {
        const val CHANNEL_ID = "trego_recording"
        const val NOTIF_ID   = 1003
        const val ACTION_STOP = "com.tregoproviderapp.ACTION_STOP_RECORDING"
        private const val TAG = "TregoRecordingService"
        private const val MAX_DURATION_MS = 60_000L  // 60 second cap
    }

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        createChannel()

        // Guard: RECORD_AUDIO must be granted before starting microphone FGS (Android 14+)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "RECORD_AUDIO not granted — stopping service")
            stopSelf()
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, buildRecordingNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIF_ID, buildRecordingNotification())
        }
        startRecording()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopRecordingAndUpload()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        recorder?.release()
        recorder = null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Recording ─────────────────────────────────────────────────────────────

    private fun startRecording() {
        try {
            val file = File(cacheDir, "trego_rec_${System.currentTimeMillis()}.m4a")
            outputFile = file

            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION") MediaRecorder()
            }

            recorder!!.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16_000)
                setAudioEncodingBitRate(64_000)
                setOutputFile(file.absolutePath)
                setMaxDuration(MAX_DURATION_MS.toInt())
                setOnInfoListener { _, what, _ ->
                    if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) {
                        stopRecordingAndUpload()
                    }
                }
                prepare()
                start()
            }

            Log.d(TAG, "Recording started → ${file.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start recording", e)
            stopSelf()
        }
    }

    private fun stopRecordingAndUpload() {
        try {
            recorder?.stop()
        } catch (_: Exception) { }
        recorder?.release()
        recorder = null

        val file = outputFile ?: run { stopSelf(); return }

        // Update notification to uploading state
        showUploading()

        // Upload on background thread
        Thread {
            val rawText = uploadAndTranscribe(file)
            handler.post {
                file.delete()
                if (rawText != null) {
                    // Store pending text so the Confirm action can submit it
                    getSharedPreferences("trego_prefs", Context.MODE_PRIVATE).edit()
                        .putString(TregoNotificationModule.PREFS_PENDING_TEXT, rawText)
                        .apply()
                    showReview(rawText)
                    // Auto-dismiss review after 30 seconds if no action taken
                    handler.postDelayed({ stopSelf() }, 30_000)
                } else {
                    showError()
                    handler.postDelayed({ stopSelf() }, 4_000)
                }
            }
        }.start()
    }

    // ── Upload ─────────────────────────────────────────────────────────────────

    /** Uploads audio to /api/jobs/transcribe (transcribe-only, no job created) and returns raw_text. */
    private fun uploadAndTranscribe(file: File): String? {
        val prefs = getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("auth_token", null) ?: return null
        val apiUrl = prefs.getString("api_url", "https://tregoproviderappmobile.onrender.com") ?: return null

        return try {
            val boundary = "----TregoBoundary${System.currentTimeMillis()}"
            val url = URL("$apiUrl/api/jobs/transcribe")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            conn.connectTimeout = 30_000
            conn.readTimeout = 60_000
            conn.doOutput = true

            conn.outputStream.use { out ->
                val header = "--$boundary\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"${file.name}\"\r\nContent-Type: audio/m4a\r\n\r\n"
                out.write(header.toByteArray())
                file.inputStream().use { it.copyTo(out) }
                out.write("\r\n--$boundary--\r\n".toByteArray())
            }

            val code = conn.responseCode
            if (code !in 200..299) {
                Log.e(TAG, "Transcribe failed: HTTP $code")
                return null
            }

            val body = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            Log.d(TAG, "Transcribe response: $body")

            // Parse raw_text from { "raw_text": "..." }
            org.json.JSONObject(body).optString("raw_text")?.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            Log.e(TAG, "Transcribe failed", e)
            null
        }
    }

    // ── Notification states ────────────────────────────────────────────────────

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Trego Recording", NotificationManager.IMPORTANCE_HIGH)
            ch.setShowBadge(false)
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
    }

    private fun buildRecordingNotification(): Notification {
        val stopIntent = Intent(this, TregoActionReceiver::class.java).apply { action = ACTION_STOP }
        val stopPending = android.app.PendingIntent.getBroadcast(
            this, 10, stopIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle("Recording…")
            .setContentText("Tap Stop when you're done speaking")
            .setColor(0xFF123A7A.toInt())
            .setColorized(true)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPending)
            .build()
    }

    private fun showUploading() {
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentTitle("Processing…")
            .setContentText("Transcribing your voice note")
            .setColor(0xFF123A7A.toInt())
            .setProgress(0, 0, true)
            .setOngoing(true)
            .build()
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIF_ID, notif)
    }

    private fun showReview(rawText: String) {
        // Use getActivity() — broadcast PendingIntents are blocked by some OEMs for FGS notifications
        val confirmIntent = android.app.PendingIntent.getActivity(
            this, 20,
            Intent(this, TregoNotifActionActivity::class.java).apply {
                putExtra(TregoNotifActionActivity.EXTRA_ACTION, TregoNotifActionActivity.ACTION_CONFIRM)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            },
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )
        val redoIntent = android.app.PendingIntent.getActivity(
            this, 21,
            Intent(this, TregoNotifActionActivity::class.java).apply {
                putExtra(TregoNotifActionActivity.EXTRA_ACTION, TregoNotifActionActivity.ACTION_REDO)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            },
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val preview = if (rawText.length > 80) rawText.take(77) + "…" else rawText

        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif_trego)
            .setContentTitle("Did you say this?")
            .setContentText("\"$preview\"")
            .setStyle(NotificationCompat.BigTextStyle().bigText("\"$rawText\""))
            .setColor(0xFF123A7A.toInt())
            .setColorized(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(android.R.drawable.ic_menu_send, "Send it", confirmIntent)
            .addAction(android.R.drawable.ic_menu_rotate, "Redo", redoIntent)
            .build()
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIF_ID, notif)
    }

    private fun showError() {
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Upload failed")
            .setContentText("Please open the app and try again")
            .setColor(0xFFef4444.toInt())
            .setAutoCancel(true)
            .build()
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIF_ID, notif)
    }
}
