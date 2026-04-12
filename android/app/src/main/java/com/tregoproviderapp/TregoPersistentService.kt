package com.tregoproviderapp

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.RemoteViews
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.IconCompat
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar

class TregoPersistentService : Service() {

    companion object {
        const val ACTION_SHOW            = "SHOW"
        const val ACTION_HIDE            = "HIDE"
        const val ACTION_START_RECORDING = "START_RECORDING"
        const val ACTION_STOP_RECORDING  = "STOP_RECORDING"
        const val ACTION_SHOW_TEXT_INPUT = "SHOW_TEXT_INPUT"   // kept for overlay fallback

        private const val TAG             = "TregoPersistentService"
        private const val MAX_DURATION_MS = 60_000L

        // ── Greeting ─────────────────────────────────────────────────────────────

        private fun getGreeting(): String {
            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            return when {
                hour in 5..11  -> "Good Morning ☀️, ready to take a job?"
                hour in 12..16 -> "Good Afternoon 🌤️, let's get productive!"
                hour in 17..21 -> "Good Evening 🌙, any jobs to schedule?"
                else           -> "Still working late? 🌌 Add a quick job."
            }
        }

        // ── Icon helper ───────────────────────────────────────────────────────────

        private fun drawableToBitmap(context: Context, drawableId: Int, sizeDp: Int): Bitmap {
            val px = (sizeDp * context.resources.displayMetrics.density + 0.5f).toInt()
            val bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
            ContextCompat.getDrawable(context, drawableId)?.apply {
                setBounds(0, 0, px, px); draw(Canvas(bmp))
            }
            return bmp
        }

        // ── Broadcast PendingIntent helper ────────────────────────────────────────

        private fun bc(context: Context, reqCode: Int, action: String): PendingIntent =
            PendingIntent.getBroadcast(
                context, reqCode,
                Intent(context, TregoActionReceiver::class.java).apply { this.action = action },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

        private fun bcMutable(context: Context, reqCode: Int, action: String): PendingIntent =
            PendingIntent.getBroadcast(
                context, reqCode,
                Intent(context, TregoActionReceiver::class.java).apply { this.action = action },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )

        // ── STATE 1: Normal / default notification ────────────────────────────────

        fun buildNormalNotification(context: Context): Notification {
            val openApp = PendingIntent.getActivity(
                context, 0,
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val hasMic = ContextCompat.checkSelfPermission(
                context, Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED

            // Voice: broadcast (service already running, so startService() works from receiver)
            val voiceIntent = if (hasMic) {
                bc(context, 1, TregoNotificationModule.ACTION_RECORD_VOICE)
            } else {
                PendingIntent.getActivity(
                    context, 1,
                    Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("request_mic_permission", true)
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            }

            // Text: broadcast → receiver switches notification to text-input state
            val textIntent = bc(context, 2, TregoNotificationModule.ACTION_SHOW_TEXT_MODE)

            val collapsed = RemoteViews(context.packageName, R.layout.notification_collapsed)
            val expanded  = RemoteViews(context.packageName, R.layout.notification_expanded)

            val greeting = getGreeting()
            collapsed.setTextViewText(R.id.notif_greeting, greeting)
            expanded.setTextViewText(R.id.notif_greeting, greeting)
            // System small icon shows the Trego logo — no duplicate needed in expanded view

            expanded.setImageViewBitmap(R.id.ic_voice,    drawableToBitmap(context, R.drawable.ic_mic,  16))
            expanded.setImageViewBitmap(R.id.ic_text_btn, drawableToBitmap(context, R.drawable.ic_text, 16))

            expanded.setOnClickPendingIntent(R.id.btn_voice, voiceIntent)
            expanded.setOnClickPendingIntent(R.id.btn_text,  textIntent)

            // System action buttons (fallback / power-user path)
            val remoteInput = RemoteInput.Builder(TregoNotificationModule.REMOTE_INPUT_KEY)
                .setLabel("Describe the job…").build()

            val dismissedIntent = bc(context, 99, TregoNotificationModule.ACTION_NOTIF_DISMISSED)
            return NotificationCompat.Builder(context, TregoNotificationModule.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notif_trego)
                .setDeleteIntent(dismissedIntent)
                .setColor(Color.parseColor("#123A7A"))
                .setColorized(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setCustomContentView(collapsed)
                .setCustomBigContentView(expanded)
                .setContentIntent(openApp)
                .setOngoing(true)
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .addAction(NotificationCompat.Action.Builder(
                    R.drawable.ic_mic, "Voice", voiceIntent).build())
                .addAction(NotificationCompat.Action.Builder(
                    R.drawable.ic_text, "Text",
                    bcMutable(context, 3, TregoNotificationModule.ACTION_RECORD_TEXT))
                    .addRemoteInput(remoteInput).build())
                .build().also {
                    it.flags = it.flags or
                        Notification.FLAG_NO_CLEAR or
                        Notification.FLAG_ONGOING_EVENT
                }
        }

        // ── STATE 2: Text-input mode ──────────────────────────────────────────────

        fun buildTextModeNotification(context: Context): Notification {
            val remoteInput = RemoteInput.Builder(TregoNotificationModule.REMOTE_INPUT_KEY)
                .setLabel("Type your job…").build()

            val sendIntent  = bcMutable(context, 10, TregoNotificationModule.ACTION_SUBMIT_TEXT)
            val backIntent  = bc(context, 11, TregoNotificationModule.ACTION_CANCEL_TEXT)

            val expanded = RemoteViews(context.packageName, R.layout.notification_text_mode)
            expanded.setOnClickPendingIntent(R.id.btn_back_text, backIntent)

            return NotificationCompat.Builder(context, TregoNotificationModule.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notif_trego)
                .setColor(Color.parseColor("#123A7A"))
                .setColorized(true)
                .setStyle(NotificationCompat.DecoratedCustomViewStyle())
                .setCustomBigContentView(expanded)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                // "Send →" system action with RemoteInput — this is how Android does inline text
                .addAction(NotificationCompat.Action.Builder(
                    R.drawable.ic_text, "✏️ Type & Send →", sendIntent)
                    .addRemoteInput(remoteInput).build())
                .build()
        }

        // ── STATE 3: Recording mode ───────────────────────────────────────────────

        private const val REC_CHANNEL_ID = "trego_recording"

        fun buildRecordingNotification(context: Context): Notification {
            // Ensure dedicated recording channel exists (max priority, no sound)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (mgr.getNotificationChannel(REC_CHANNEL_ID) == null) {
                    mgr.createNotificationChannel(
                        NotificationChannel(REC_CHANNEL_ID, "Recording", NotificationManager.IMPORTANCE_HIGH).apply {
                            setShowBadge(false); enableVibration(false); setSound(null, null)
                            description = "Active recording — cannot be dismissed"
                        }
                    )
                }
            }

            val doneIntent   = bc(context, 20, TregoNotificationModule.ACTION_DONE_RECORDING)
            val cancelIntent = bc(context, 21, TregoNotificationModule.ACTION_CANCEL_RECORDING)

            val expanded = RemoteViews(context.packageName, R.layout.notification_recording)
            expanded.setImageViewBitmap(
                R.id.ic_recording_mic, drawableToBitmap(context, R.drawable.ic_mic, 20))
            expanded.setOnClickPendingIntent(R.id.btn_done_recording,   doneIntent)
            expanded.setOnClickPendingIntent(R.id.btn_cancel_recording, cancelIntent)

            val notif = NotificationCompat.Builder(context, REC_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notif_trego)
                .setColor(Color.parseColor("#DC2626"))  // Red for recording
                .setColorized(true)
                .setCustomBigContentView(expanded)
                .setOngoing(true)                       // prevents swipe dismiss
                .setAutoCancel(false)                   // prevents tap dismiss
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .addAction(NotificationCompat.Action.Builder(
                    android.R.drawable.ic_media_pause, "Done", doneIntent).build())
                .addAction(NotificationCompat.Action.Builder(
                    android.R.drawable.ic_delete, "Cancel", cancelIntent).build())
                .build()

            // Extra flags: truly non-clearable
            notif.flags = notif.flags or
                Notification.FLAG_NO_CLEAR or
                Notification.FLAG_ONGOING_EVENT

            return notif
        }

        // ── STATE 4: Review (Did you say this?) ───────────────────────────────────

        fun buildReviewNotification(context: Context, rawText: String): Notification {
            val confirmIntent = bc(context, 22, TregoNotificationModule.ACTION_CONFIRM_JOB)
            val redoIntent    = bc(context, 23, TregoNotificationModule.ACTION_REDO_RECORDING)

            return NotificationCompat.Builder(context, TregoNotificationModule.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notif_trego)
                .setContentTitle("Did you say this?")
                .setStyle(NotificationCompat.BigTextStyle().bigText("\"$rawText\""))
                .setColor(Color.parseColor("#123A7A"))
                .setColorized(true)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .addAction(NotificationCompat.Action.Builder(
                    android.R.drawable.ic_menu_send, "Send it", confirmIntent).build())
                .addAction(NotificationCompat.Action.Builder(
                    android.R.drawable.ic_menu_rotate, "Redo", redoIntent).build())
                .build()
        }

        // ── Job logged confirmation — keeps last 6 notifications ─────────────────

        private const val MAX_JOB_NOTIFS = 6
        private const val NOTIF_BASE_ID = 2000
        private val activeNotifIds = mutableListOf<Int>()
        private var notifCounter = 0

        fun notifyJobLogged(context: Context, text: String) {
            val nm = NotificationManagerCompat.from(context)

            // Generate unique ID
            val id = NOTIF_BASE_ID + (notifCounter++ % 100)

            // Remove oldest if we have 6 already
            activeNotifIds.add(id)
            while (activeNotifIds.size > MAX_JOB_NOTIFS) {
                val oldId = activeNotifIds.removeAt(0)
                nm.cancel(oldId)
            }

            val notif = NotificationCompat.Builder(context, TregoNotificationModule.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notif_trego)
                .setColor(Color.parseColor("#123A7A"))
                .setContentTitle("Job logged!")
                .setContentText("\"${text.take(60)}\"")
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setGroup("trego_jobs")
                .build()
            nm.notify(id, notif)

            // Summary notification (groups them under one header)
            if (activeNotifIds.size > 1) {
                val summary = NotificationCompat.Builder(context, TregoNotificationModule.CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_notif_trego)
                    .setColor(Color.parseColor("#123A7A"))
                    .setContentTitle("Trego")
                    .setContentText("${activeNotifIds.size} jobs logged")
                    .setGroup("trego_jobs")
                    .setGroupSummary(true)
                    .setAutoCancel(true)
                    .build()
                nm.notify(NOTIF_BASE_ID - 1, summary)
            }
        }

        // ── Immediate UI helpers (called by receiver for instant feedback) ────────

        fun notifyTextMode(context: Context) {
            NotificationManagerCompat.from(context).notify(
                TregoNotificationModule.NOTIFICATION_ID,
                buildTextModeNotification(context)
            )
        }

        fun notifyRecordingState(context: Context) {
            NotificationManagerCompat.from(context).notify(
                TregoNotificationModule.NOTIFICATION_ID,
                buildRecordingNotification(context)
            )
        }

        // Legacy alias
        fun updateNotificationAfterText(context: Context, text: String) = notifyJobLogged(context, text)
    }

    // ── Instance ─────────────────────────────────────────────────────────────────

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private val handler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var textOverlayView: View? = null

    // Post-call detection
    private var telephonyManager: android.telephony.TelephonyManager? = null
    private var callListener: android.telephony.PhoneStateListener? = null
    private var wasInCall = false
    private var callStartTime = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ensureChannel()
        applyNormalState()
        // Start offline queue connectivity listener
        TregoOfflineQueue.ensureConnectivityListener(this)
        if (TregoOfflineQueue.count(this) > 0) {
            TregoOfflineQueue.flush(this)
        }
        // Start post-call listener
        startCallListener()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_HIDE -> {
                stopForeground(true)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START_RECORDING -> if (recorder == null) startRecording()
            ACTION_STOP_RECORDING  -> stopRecordingAndUpload()
            ACTION_SHOW_TEXT_INPUT -> showTextOverlay()
            else                   -> applyNormalState()   // ACTION_SHOW or default
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        recorder?.release()
        recorder = null
        removeTextOverlay()
        stopCallListener()
        stopForeground(true)
    }

    // ── Survive app kill — always restart so notification persists ──────────
    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "App killed — restarting persistent service")
        val restartIntent = Intent(applicationContext, TregoPersistentService::class.java).apply {
            action = ACTION_SHOW
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartIntent)
        } else {
            startService(restartIntent)
        }
    }

    // ── Post-call detection ────────────────────────────────────────────────────

    @Suppress("DEPRECATION")
    private fun startCallListener() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED) {
            Log.d(TAG, "READ_PHONE_STATE not granted — skipping call listener")
            return
        }

        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as android.telephony.TelephonyManager

        callListener = object : android.telephony.PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                when (state) {
                    android.telephony.TelephonyManager.CALL_STATE_OFFHOOK -> {
                        // Call started (answered)
                        wasInCall = true
                        callStartTime = System.currentTimeMillis()
                        Log.d(TAG, "Call started")
                    }
                    android.telephony.TelephonyManager.CALL_STATE_IDLE -> {
                        if (wasInCall) {
                            // Call ended — check duration
                            wasInCall = false
                            val durationSec = ((System.currentTimeMillis() - callStartTime) / 1000).toInt()
                            Log.d(TAG, "Call ended — duration: ${durationSec}s")
                            checkPostCallThreshold(durationSec, phoneNumber)
                        }
                    }
                }
            }
        }

        telephonyManager?.listen(callListener, android.telephony.PhoneStateListener.LISTEN_CALL_STATE)
        Log.d(TAG, "Post-call listener started")
    }

    private fun stopCallListener() {
        callListener?.let {
            telephonyManager?.listen(it, android.telephony.PhoneStateListener.LISTEN_NONE)
        }
        callListener = null
        telephonyManager = null
    }

    private fun checkPostCallThreshold(durationSec: Int, phoneNumber: String?) {
        val prefs = getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
        val threshold = prefs.getInt("post_call_threshold", 30)

        if (durationSec < threshold) {
            Log.d(TAG, "Call too short (${durationSec}s < ${threshold}s) — no prompt")
            return
        }

        // Look up contact name from call log
        val contactName = getContactName(phoneNumber)
        val displayName = contactName ?: phoneNumber ?: "Unknown"

        Log.d(TAG, "Post-call prompt: $displayName (${durationSec}s)")
        showPostCallNotification(displayName, durationSec)
    }

    private fun getContactName(phoneNumber: String?): String? {
        if (phoneNumber == null) return null
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED) return null

        return try {
            val uri = android.net.Uri.withAppendedPath(
                android.provider.ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                android.net.Uri.encode(phoneNumber)
            )
            contentResolver.query(uri, arrayOf(android.provider.ContactsContract.PhoneLookup.DISPLAY_NAME),
                null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0) else null
            }
        } catch (_: Exception) { null }
    }

    private fun showPostCallNotification(contactName: String, durationSec: Int) {
        val openIntent = PendingIntent.getActivity(
            this, 200,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("post_call_client", contactName)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val nm = NotificationManagerCompat.from(this)
        val notif = NotificationCompat.Builder(this, TregoNotificationModule.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif_trego)
            .setColor(Color.parseColor("#10b981"))
            .setContentTitle("Just finished a call?")
            .setContentText("${durationSec}s call with $contactName — tap to log a job")
            .setAutoCancel(true)
            .setContentIntent(openIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()
        nm.notify(TregoNotificationModule.NOTIFICATION_ID + 20, notif)
    }

    // ── Normal state ─────────────────────────────────────────────────────────────

    private fun applyNormalState() {
        // Stop any in-progress recording
        if (recorder != null) {
            try { recorder?.stop() } catch (_: Exception) {}
            recorder?.release()
            recorder = null
            outputFile?.delete()
            outputFile = null
        }

        startForegroundCompat(buildNormalNotification(this), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    }

    // ── Recording ────────────────────────────────────────────────────────────────

    private fun startRecording() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "RECORD_AUDIO not granted")
            return
        }

        // Switch foreground type to microphone + update notification
        startForegroundCompat(buildRecordingNotification(this),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)

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
                    if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED)
                        handler.post { stopRecordingAndUpload() }
                }
                prepare()
                start()
            }
            Log.d(TAG, "Recording started → ${file.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Recording failed to start", e)
            recorder?.release()
            recorder = null
            applyNormalState()
        }
    }

    private fun stopRecordingAndUpload() {
        try { recorder?.stop() } catch (_: Exception) {}
        recorder?.release()
        recorder = null

        val file = outputFile ?: run { applyNormalState(); return }
        outputFile = null

        // Show processing state while uploading
        val processingNotif = NotificationCompat.Builder(this, TregoNotificationModule.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentTitle("Processing…")
            .setContentText("Transcribing your voice note")
            .setColor(Color.parseColor("#123A7A"))
            .setColorized(true)
            .setProgress(0, 0, true)
            .setOngoing(true)
            .build()
        startForegroundCompat(processingNotif, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)

        val svc = this
        Thread {
            val rawText = uploadAndTranscribe(file)
            if (rawText == null) {
                // Save IMMEDIATELY on background thread
                Log.d(TAG, "Transcribe failed — queueing audio: ${file.absolutePath}")
                TregoOfflineQueue.enqueueAudio(svc, file.absolutePath)
            }
            handler.post {
                if (rawText != null) {
                    file.delete()
                    svc.getSharedPreferences("trego_prefs", Context.MODE_PRIVATE).edit()
                        .putString(TregoNotificationModule.PREFS_PENDING_TEXT, rawText)
                        .apply()
                    startForegroundCompat(
                        buildReviewNotification(svc, rawText),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                    )
                } else {
                    notifyJobLogged(svc, "Saved offline — will sync when connected")
                    applyNormalState()
                }
            }
        }.start()
    }

    // ── Upload ───────────────────────────────────────────────────────────────────

    private fun uploadAndTranscribe(file: File): String? {
        val prefs  = getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
        val token  = prefs.getString("auth_token", null) ?: return null
        val apiUrl = prefs.getString("api_url", "https://tregoproviderappmobile.onrender.com") ?: return null

        // Retry up to 3 times with backoff (handles temporary DNS/network failures)
        for (attempt in 1..3) {
            try {
                val boundary = "----TregoBoundary${System.currentTimeMillis()}"
                val conn = (URL("$apiUrl/api/jobs/transcribe").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                    connectTimeout = 30_000
                    readTimeout    = 60_000
                    doOutput       = true
                }
                conn.outputStream.use { out ->
                    out.write("--$boundary\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"${file.name}\"\r\nContent-Type: audio/m4a\r\n\r\n".toByteArray())
                    file.inputStream().use { it.copyTo(out) }
                    out.write("\r\n--$boundary--\r\n".toByteArray())
                }
                val code = conn.responseCode
                if (code !in 200..299) {
                    val errBody = try { conn.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { "no body" }
                    Log.e(TAG, "Transcribe HTTP $code (attempt $attempt): $errBody")
                    if (attempt < 3) { Thread.sleep(attempt * 2000L); continue }
                    return null
                }
                val body = conn.inputStream.bufferedReader().readText()
                conn.disconnect()
                Log.d(TAG, "Transcribe OK (attempt $attempt): ${body.take(200)}")
                return org.json.JSONObject(body).optString("raw_text")?.takeIf { it.isNotBlank() }
            } catch (e: Exception) {
                Log.e(TAG, "Transcribe attempt $attempt failed: ${e.message}")
                if (attempt < 3) { Thread.sleep(attempt * 2000L) } else return null
            }
        }
        return null
    }

    // ── Text overlay (WindowManager fallback if needed) ───────────────────────────

    private fun showTextOverlay() {
        if (textOverlayView != null) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) return

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val dp = { v: Int -> (v * resources.displayMetrics.density + 0.5f).toInt() }

        val root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#99000000")) }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1e293b"))
            setPadding(dp(16), dp(20), dp(16), dp(32))
        }
        val title = TextView(this).apply {
            text = "Add a job"; textSize = 16f; setTextColor(Color.WHITE)
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(dp(4), 0, 0, dp(12))
        }
        val input = EditText(this).apply {
            hint = "Describe the job…"; setHintTextColor(Color.parseColor("#64748b"))
            setTextColor(Color.WHITE); textSize = 14f; minLines = 2; maxLines = 5
            isSingleLine = false; imeOptions = EditorInfo.IME_FLAG_NO_ENTER_ACTION
            background = GradientDrawable().apply { setColor(Color.parseColor("#0f172a")); cornerRadius = dp(8).toFloat() }
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
        val btnRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.END; setPadding(0, dp(16), 0, 0) }
        val cancelBtn = Button(this).apply {
            text = "Cancel"; setTextColor(Color.parseColor("#94a3b8")); setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener { removeTextOverlay() }
        }
        val submitBtn = Button(this).apply {
            text = "Log job"; setTextColor(Color.WHITE)
            background = GradientDrawable().apply { setColor(Color.parseColor("#3b82f6")); cornerRadius = dp(8).toFloat() }
            setPadding(dp(20), dp(8), dp(20), dp(8))
            setOnClickListener {
                val text = input.text.toString().trim()
                if (text.isEmpty()) { input.error = "Please describe the job"; return@setOnClickListener }
                (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(input.windowToken, 0)
                TregoJobSubmitter.submitText(this@TregoPersistentService, text)
                notifyJobLogged(this@TregoPersistentService, text)
                removeTextOverlay()
            }
        }
        btnRow.addView(cancelBtn); btnRow.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(dp(8), 1) }); btnRow.addView(submitBtn)
        card.addView(title); card.addView(input); card.addView(btnRow)
        root.addView(card, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM))
        textOverlayView = root

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                          else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        windowManager?.addView(root, WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            overlayType, WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.BOTTOM })

        handler.postDelayed({
            input.requestFocus()
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(input, InputMethodManager.SHOW_IMPLICIT)
        }, 200)
    }

    private fun removeTextOverlay() {
        textOverlayView?.let { try { windowManager?.removeView(it) } catch (_: Exception) {} }
        textOverlayView = null
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private fun startForegroundCompat(notif: Notification, type: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(TregoNotificationModule.NOTIFICATION_ID, notif, type)
        } else {
            startForeground(TregoNotificationModule.NOTIFICATION_ID, notif)
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(TregoNotificationModule.CHANNEL_ID) == null) {
                manager.createNotificationChannel(
                    NotificationChannel(
                        TregoNotificationModule.CHANNEL_ID,
                        "Trego Job Capture",
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        setShowBadge(false)
                        enableVibration(false)
                        setSound(null, null)
                    }
                )
            }
        }
    }
}
