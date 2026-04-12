package com.tregoproviderapp

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.text.InputType
import android.util.Log
import android.util.TypedValue
import android.view.*
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.*
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Floating bubble with full job capture: Voice + Text.
 * States: IDLE → MENU → RECORDING → REVIEW → UPLOADING
 *                     → TEXT_INPUT → UPLOADING
 */
class TregoBubbleService : Service() {

    companion object {
        const val CHANNEL_ID = "trego_bubble_service"
        const val NOTIF_ID = 1002
        private const val TAG = "TregoBubble"
    }

    private enum class State { IDLE, MENU, RECORDING, REVIEW, TEXT_INPUT, UPLOADING }

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var panelView: View? = null
    private val handler = Handler(Looper.getMainLooper())
    private var state = State.IDLE

    // Recording
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var recordingSeconds = 0
    private var durationRunnable: Runnable? = null
    private var pendingTranscription: String? = null

    // Layout refs
    private var bubbleIcon: ImageView? = null
    private var bubbleBg: View? = null

    private val dp = { v: Int -> (v * resources.displayMetrics.density + 0.5f).toInt() }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, buildNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIF_ID, buildNotification())
            }
            showBubble()
            // Start offline queue listener
            TregoOfflineQueue.purgeCorrupted(this)
            TregoOfflineQueue.ensureConnectivityListener(this)
            if (TregoOfflineQueue.count(this) > 0) TregoOfflineQueue.flush(this)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start bubble service: ${e.message}")
            stopSelf()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRecordingIfActive()
        removePanel()
        removeBubble()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Bubble (always visible) ─────────────────────────────────────────────

    private fun showBubble() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val inflater = LayoutInflater.from(this)
        bubbleView = inflater.inflate(R.layout.trego_bubble, null)
        bubbleIcon = bubbleView?.findViewById(R.id.bubble_icon)
        bubbleBg = bubbleView?.findViewById(R.id.bubble_body)

        val params = overlayParams(WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.TOP or Gravity.END; x = dp(16); y = dp(200)
        }

        // Drag + tap
        var initX = 0; var initY = 0; var tx = 0f; var ty = 0f; var moved = false
        bubbleView?.setOnTouchListener { _, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> { initX = params.x; initY = params.y; tx = e.rawX; ty = e.rawY; moved = false; true }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (e.rawX - tx).toInt(); val dy = (e.rawY - ty).toInt()
                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true
                    params.x = initX - dx; params.y = initY + dy
                    try { windowManager?.updateViewLayout(bubbleView, params) } catch (_: Exception) {}
                    true
                }
                MotionEvent.ACTION_UP -> { if (!moved) onBubbleTap(); true }
                else -> false
            }
        }
        windowManager?.addView(bubbleView, params)
    }

    private fun onBubbleTap() {
        when (state) {
            State.IDLE -> showMenu()
            State.MENU -> { removePanel(); state = State.IDLE }
            State.RECORDING -> stopRecordingAndTranscribe()
            else -> {} // ignore taps during upload/review
        }
    }

    // ── Menu panel (Voice / Text) ───────────────────────────────────────────

    private fun showMenu() {
        removePanel()
        state = State.MENU

        val card = buildCard()
        val title = textView("Add a job", 16f, true)
        card.addView(title)

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(12), 0, 0)
        }

        val voiceBtn = pillButton("Voice", "#3b82f6", "#ffffff") {
            removePanel()
            startRecording()
        }
        val textBtn = pillButton("Text", "#1e293b", "#f1f5f9") {
            removePanel()
            showTextInput()
        }

        btnRow.addView(voiceBtn, linParams(1))
        btnRow.addView(Space(this), LinearLayout.LayoutParams(dp(8), 1))
        btnRow.addView(textBtn, linParams(1))
        card.addView(btnRow)

        showPanel(card)
    }

    // ── Voice Recording ─────────────────────────────────────────────────────

    private fun startRecording() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            openApp(); return
        }

        try {
            // Android 14+ requires microphone FGS type while recording from a
            // background service. Without this, MediaRecorder captures silence
            // and Whisper hallucinates "you" / "Thank you" on empty audio.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    startForeground(NOTIF_ID, buildNotification(),
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC or
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
                } catch (e: Exception) {
                    Log.e(TAG, "Could not elevate FGS to microphone: ${e.message}")
                }
            }

            val file = File(cacheDir, "bubble_${System.currentTimeMillis()}.m4a")
            outputFile = file
            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(this)
            else @Suppress("DEPRECATION") MediaRecorder()

            recorder!!.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16_000); setAudioEncodingBitRate(64_000)
                setOutputFile(file.absolutePath); setMaxDuration(60_000)
                prepare(); start()
            }

            state = State.RECORDING; recordingSeconds = 0
            updateBubbleColor("#ef4444")

            // Show recording panel
            val card = buildCard()
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            row.addView(textView("Recording...", 14f, true).apply { setTextColor(Color.parseColor("#ef4444")) })
            val timeLabel = textView("0s", 13f, false)
            row.addView(Space(this), LinearLayout.LayoutParams(0, 1, 1f))
            row.addView(timeLabel)
            card.addView(row)

            val hint = textView("Tap bubble to stop", 12f, false)
            hint.setTextColor(Color.parseColor("#64748b"))
            card.addView(hint)

            showPanel(card)

            // Duration ticker
            durationRunnable = object : Runnable {
                override fun run() {
                    if (state != State.RECORDING) return
                    recordingSeconds++
                    timeLabel.text = "${recordingSeconds}s"
                    handler.postDelayed(this, 1000)
                }
            }
            handler.postDelayed(durationRunnable!!, 1000)
        } catch (e: Exception) {
            Log.e(TAG, "Rec start failed", e)
            recorder?.release(); recorder = null
            downgradeFgsType()
            showToastPanel("Mic error"); state = State.IDLE
        }
    }

    private fun downgradeFgsType() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                startForeground(NOTIF_ID, buildNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } catch (_: Exception) {}
        }
    }

    private fun stopRecordingAndTranscribe() {
        durationRunnable?.let { handler.removeCallbacks(it) }
        try { recorder?.stop() } catch (_: Exception) {}
        recorder?.release(); recorder = null
        downgradeFgsType()
        val file = outputFile ?: run { state = State.IDLE; return }

        if (recordingSeconds < 2) {
            file.delete(); outputFile = null
            showToastPanel("Too short — try again")
            state = State.IDLE; updateBubbleColor("#ffffff"); return
        }

        state = State.UPLOADING; updateBubbleColor("#f59e0b")
        removePanel()
        showProcessingPanel("Transcribing...")

        val svc = this
        Thread {
            val rawText = uploadAndTranscribe(file)
            if (rawText == null) {
                // Save IMMEDIATELY on background thread (don't wait for handler.post)
                Log.d(TAG, "Transcribe failed — queueing audio: ${file.absolutePath}")
                TregoOfflineQueue.enqueueAudio(svc, file.absolutePath)
            }
            handler.post {
                outputFile = null
                if (rawText != null) {
                    file.delete()
                    pendingTranscription = rawText
                    showReviewPanel(rawText)
                } else {
                    showToastPanel("Saved offline")
                    state = State.IDLE; updateBubbleColor("#ffffff")
                }
            }
        }.start()
    }

    // ── Review panel (Send / Redo / Cancel) ──────────────────────────────────

    private fun showReviewPanel(text: String) {
        removePanel()
        state = State.REVIEW; updateBubbleColor("#ffffff")

        val card = buildCard()
        card.addView(textView("Did you say this?", 14f, true))

        val quote = textView("\"$text\"", 13f, false).apply {
            setTextColor(Color.parseColor("#cbd5e1"))
            setPadding(0, dp(8), 0, dp(12))
        }
        card.addView(quote)

        val btnRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        btnRow.addView(pillButton("Send", "#10b981", "#ffffff") {
            removePanel()
            submitJob(text)
        }, linParams(1))
        btnRow.addView(Space(this), LinearLayout.LayoutParams(dp(6), 1))
        btnRow.addView(pillButton("Redo", "#334155", "#f1f5f9") {
            removePanel(); pendingTranscription = null
            state = State.IDLE; startRecording()
        }, linParams(1))
        btnRow.addView(Space(this), LinearLayout.LayoutParams(dp(6), 1))
        btnRow.addView(pillButton("Cancel", "#1e293b", "#ef4444") {
            removePanel(); pendingTranscription = null
            state = State.IDLE; updateBubbleColor("#ffffff")
        }, linParams(1))
        card.addView(btnRow)

        showPanel(card)
    }

    // ── Text input panel ────────────────────────────────────────────────────

    private fun showTextInput() {
        removePanel()
        state = State.TEXT_INPUT; updateBubbleColor("#3b82f6")

        val card = buildCard()
        card.addView(textView("Type your job", 14f, true))

        val input = EditText(this).apply {
            hint = "e.g. Fix pipe, Rua Augusta, João"
            setHintTextColor(Color.parseColor("#64748b"))
            setTextColor(Color.WHITE); textSize = 14f
            minLines = 2; maxLines = 4
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            imeOptions = EditorInfo.IME_FLAG_NO_ENTER_ACTION
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#0f172a")); cornerRadius = dp(8).toFloat()
                setStroke(1, Color.parseColor("#334155"))
            }
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
        card.addView(input, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(8)
        })

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(10), 0, 0)
        }
        btnRow.addView(pillButton("Cancel", "#1e293b", "#94a3b8") {
            removePanel(); state = State.IDLE; updateBubbleColor("#ffffff")
        }, linParams(1))
        btnRow.addView(Space(this), LinearLayout.LayoutParams(dp(8), 1))
        btnRow.addView(pillButton("Send", "#10b981", "#ffffff") {
            val text = input.text.toString().trim()
            if (text.isEmpty()) { input.error = "Type something"; return@pillButton }
            removePanel()
            submitJob(text)
        }, linParams(1))
        card.addView(btnRow)

        showPanel(card, focusable = true)

        // Show keyboard
        handler.postDelayed({
            input.requestFocus()
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager)
                .showSoftInput(input, InputMethodManager.SHOW_IMPLICIT)
        }, 200)
    }

    // ── Submit job ──────────────────────────────────────────────────────────

    private fun submitJob(text: String) {
        val svc = this
        state = State.UPLOADING; updateBubbleColor("#f59e0b")
        showProcessingPanel("Creating job...")

        // Check connectivity — queue offline if no internet
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
        val net = cm.activeNetwork
        val caps = if (net != null) cm.getNetworkCapabilities(net) else null
        val isOnline = caps?.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET) == true

        if (isOnline) {
            TregoJobSubmitter.submitText(svc, text)
            handler.postDelayed({
                removePanel()
                showToastPanel("Job created!")
                TregoPersistentService.notifyJobLogged(svc, text)
                state = State.IDLE; updateBubbleColor("#ffffff")
            }, 1500)
        } else {
            TregoOfflineQueue.enqueueText(svc, text)
            handler.postDelayed({
                removePanel()
                showToastPanel("Saved offline")
                TregoPersistentService.notifyJobLogged(svc, "Saved offline — will sync when connected")
                state = State.IDLE; updateBubbleColor("#ffffff")
            }, 500)
        }
    }

    // ── Upload / transcribe ─────────────────────────────────────────────────

    private fun uploadAndTranscribe(file: File): String? {
        val prefs = getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("auth_token", null) ?: return null
        val apiUrl = prefs.getString("api_url", "https://tregoproviderappmobile.onrender.com") ?: return null

        for (attempt in 1..3) {
            try {
                val boundary = "----Bubble${System.currentTimeMillis()}"
                val conn = (URL("$apiUrl/api/jobs/transcribe").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                    connectTimeout = 30_000; readTimeout = 60_000; doOutput = true
                }
                conn.outputStream.use { out ->
                    out.write("--$boundary\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"${file.name}\"\r\nContent-Type: audio/m4a\r\n\r\n".toByteArray())
                    file.inputStream().use { it.copyTo(out) }
                    out.write("\r\n--$boundary--\r\n".toByteArray())
                }
                val code = conn.responseCode
                if (code !in 200..299) {
                    Log.e(TAG, "Transcribe HTTP $code (attempt $attempt)")
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

    // ── Helpers ──────────────────────────────────────────────────────────────

    private fun stopRecordingIfActive() {
        if (state == State.RECORDING) {
            durationRunnable?.let { handler.removeCallbacks(it) }
            try { recorder?.stop() } catch (_: Exception) {}
            recorder?.release(); recorder = null
            outputFile?.delete()
            downgradeFgsType()
        }
    }

    private fun updateBubbleColor(hex: String) {
        val bg = bubbleBg?.background
        if (bg is GradientDrawable) bg.setColor(Color.parseColor(hex))
    }

    private fun overlayParams(w: Int, h: Int): WindowManager.LayoutParams {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        return WindowManager.LayoutParams(w, h, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT)
    }

    private fun showPanel(view: View, focusable: Boolean = false) {
        removePanel()
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        val flags = if (focusable) 0 else WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT,
            type, flags, PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.BOTTOM; y = dp(20) }
        panelView = view
        windowManager?.addView(view, params)
    }

    private fun removePanel() {
        panelView?.let { try { windowManager?.removeView(it) } catch (_: Exception) {} }
        panelView = null
    }

    private fun removeBubble() {
        bubbleView?.let { try { windowManager?.removeView(it) } catch (_: Exception) {} }
        bubbleView = null
    }

    private fun showProcessingPanel(msg: String) {
        val card = buildCard()
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val bar = ProgressBar(this).apply {
            layoutParams = LinearLayout.LayoutParams(dp(20), dp(20)).apply { marginEnd = dp(10) }
        }
        row.addView(bar); row.addView(textView(msg, 13f, false))
        card.addView(row)
        showPanel(card)
    }

    private fun showToastPanel(msg: String) {
        removePanel()
        val card = buildCard()
        card.addView(textView(msg, 14f, true).apply { gravity = Gravity.CENTER })
        showPanel(card)
        handler.postDelayed({ removePanel() }, 2500)
    }

    private fun buildCard(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1e293b")); cornerRadii = floatArrayOf(
                    dp(16).toFloat(), dp(16).toFloat(), dp(16).toFloat(), dp(16).toFloat(),
                    dp(4).toFloat(), dp(4).toFloat(), dp(4).toFloat(), dp(4).toFloat())
                setStroke(1, Color.parseColor("#334155"))
            }
            setPadding(dp(20), dp(16), dp(20), dp(18))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginStart = dp(16); marginEnd = dp(16) }
        }
    }

    private fun textView(t: String, size: Float, bold: Boolean): TextView {
        return TextView(this).apply {
            text = t; textSize = size; setTextColor(Color.WHITE)
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }
    }

    private fun pillButton(label: String, bgHex: String, textHex: String, onClick: () -> Unit): TextView {
        return TextView(this).apply {
            text = label; textSize = 13f; setTextColor(Color.parseColor(textHex))
            typeface = Typeface.DEFAULT_BOLD; gravity = Gravity.CENTER
            setPadding(dp(16), dp(10), dp(16), dp(10))
            background = GradientDrawable().apply {
                setColor(Color.parseColor(bgHex)); cornerRadius = dp(10).toFloat()
            }
            setOnClickListener { onClick() }
        }
    }

    private fun linParams(weight: Int) = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, weight.toFloat())

    private fun openApp() {
        startActivity(Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        })
    }

    // ── Notification ────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Trego Bubble", NotificationManager.IMPORTANCE_MIN).apply { setShowBadge(false) }
            )
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif_trego)
            .setContentTitle("Trego").setContentText("Tap bubble to record a job")
            .setPriority(NotificationCompat.PRIORITY_MIN).setOngoing(true).build()
    }
}
