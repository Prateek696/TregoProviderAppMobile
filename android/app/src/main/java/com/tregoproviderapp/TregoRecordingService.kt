package com.tregoproviderapp

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
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
        startForeground(NOTIF_ID, buildRecordingNotification())
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
            val success = uploadAudio(file)
            handler.post {
                showResult(success)
                file.delete()
                // Dismiss after 3 seconds
                handler.postDelayed({ stopSelf() }, 3_000)
            }
        }.start()
    }

    // ── Upload ─────────────────────────────────────────────────────────────────

    private fun uploadAudio(file: File): Boolean {
        val prefs = getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("auth_token", null) ?: return false
        val apiUrl = prefs.getString("api_url", "https://tregoproviderappmobile.onrender.com") ?: return false

        return try {
            val boundary = "----TregoBoundary${System.currentTimeMillis()}"
            val url = URL("$apiUrl/api/jobs/voice")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            conn.setRequestProperty("X-Intake-Source", "notification_voice")
            conn.connectTimeout = 30_000
            conn.readTimeout = 30_000
            conn.doOutput = true

            conn.outputStream.use { out ->
                // Part: audio
                val header = "--$boundary\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"${file.name}\"\r\nContent-Type: audio/m4a\r\n\r\n"
                out.write(header.toByteArray())
                file.inputStream().use { it.copyTo(out) }
                out.write("\r\n--$boundary--\r\n".toByteArray())
            }

            val code = conn.responseCode
            conn.disconnect()
            Log.d(TAG, "Upload result: HTTP $code")
            code in 200..299
        } catch (e: Exception) {
            Log.e(TAG, "Upload failed", e)
            false
        }
    }

    // ── Notification states ────────────────────────────────────────────────────

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Trego Recording", NotificationManager.IMPORTANCE_LOW)
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
            .setColor(0xFF3b82f6.toInt())
            .setColorized(true)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPending)
            .build()
    }

    private fun showUploading() {
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentTitle("Processing job…")
            .setContentText("Uploading your voice note")
            .setColor(0xFF3b82f6.toInt())
            .setProgress(0, 0, true)
            .setOngoing(true)
            .build()
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIF_ID, notif)
    }

    private fun showResult(success: Boolean) {
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(if (success) android.R.drawable.checkbox_on_background else android.R.drawable.ic_dialog_alert)
            .setContentTitle(if (success) "Job logged!" else "Upload failed")
            .setContentText(if (success) "Your job is being structured by AI" else "Please open the app and try again")
            .setColor(if (success) 0xFF3b82f6.toInt() else 0xFFef4444.toInt())
            .setAutoCancel(true)
            .build()
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIF_ID, notif)
    }
}
