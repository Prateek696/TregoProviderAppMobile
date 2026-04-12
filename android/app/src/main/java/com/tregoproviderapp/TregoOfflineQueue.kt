package com.tregoproviderapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Native offline queue for audio recordings and text jobs.
 * Saves to SharedPreferences when upload fails.
 * Auto-flushes when connectivity returns.
 */
object TregoOfflineQueue {

    private const val TAG = "TregoOfflineQueue"
    private const val PREFS = "trego_offline_queue"
    private const val KEY_AUDIO = "queued_audio"
    private const val KEY_TEXT = "queued_text"

    private var connectivityCallback: ConnectivityManager.NetworkCallback? = null

    // ── Queue audio file path ───────────────────────────────────────────────

    fun enqueueAudio(context: Context, audioPath: String) {
        val file = File(audioPath)
        if (!file.exists()) {
            Log.e(TAG, "Cannot queue — audio file does not exist: $audioPath")
            return
        }
        // Copy to a persistent location (cache can be cleared by OS)
        val persistDir = File(context.filesDir, "offline_audio")
        persistDir.mkdirs()
        val dest = File(persistDir, file.name)
        file.copyTo(dest, overwrite = true)
        Log.d(TAG, "Audio copied to persistent: ${dest.absolutePath} (${dest.length()} bytes)")

        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_AUDIO, "[]"))
        arr.put(dest.absolutePath)  // Use persistent path, not cache path
        prefs.edit().putString(KEY_AUDIO, arr.toString()).apply()
        Log.d(TAG, "Audio queued: ${dest.absolutePath} (total: ${arr.length()})")
        ensureConnectivityListener(context)
    }

    // ── Queue text job ──────────────────────────────────────────────────────

    fun enqueueText(context: Context, text: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_TEXT, "[]"))
        arr.put(text)
        prefs.edit().putString(KEY_TEXT, arr.toString()).apply()
        Log.d(TAG, "Text queued: ${text.take(50)} (total: ${arr.length()})")
        ensureConnectivityListener(context)
    }

    // ── Count pending items ─────────────────────────────────────────────────

    fun count(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val audio = JSONArray(prefs.getString(KEY_AUDIO, "[]")).length()
        val text = JSONArray(prefs.getString(KEY_TEXT, "[]")).length()
        return audio + text
    }

    // ── Flush all queued items ───────────────────────────────────────────────

    fun flush(context: Context) {
        val pending = count(context)
        if (pending == 0) return

        Log.d(TAG, "Flushing $pending queued items...")

        Thread {
            val tregoPrefs = context.getSharedPreferences("trego_prefs", Context.MODE_PRIVATE)
            val token = tregoPrefs.getString("auth_token", null)
            val apiUrl = tregoPrefs.getString("api_url", "https://tregoproviderappmobile.onrender.com")

            if (token == null || apiUrl == null) {
                Log.w(TAG, "No auth token — cannot flush queue")
                return@Thread
            }

            // Flush audio files
            flushAudio(context, token, apiUrl)

            // Flush text jobs
            flushText(context, token, apiUrl)

            val remaining = count(context)
            Log.d(TAG, "Flush complete. Remaining: $remaining")

            if (remaining > 0) {
                // Some failed — will retry on next connectivity change
            }
        }.start()
    }

    private fun flushAudio(context: Context, token: String, apiUrl: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_AUDIO, "[]"))
        if (arr.length() == 0) return

        val remaining = JSONArray()
        for (i in 0 until arr.length()) {
            val path = arr.getString(i)
            val file = File(path)
            if (!file.exists()) {
                Log.w(TAG, "Audio file missing, dropping: $path")
                continue
            }

            // Drop tiny files (< 4 KB ≈ silent / failed recording)
            if (file.length() < 4_096) {
                Log.w(TAG, "Audio too small (${file.length()}b), dropping: $path")
                file.delete()
                continue
            }

            Log.d(TAG, "Flushing audio: $path (size=${file.length()})")
            val result = submitVoiceJob(file, token, apiUrl)
            when (result) {
                FlushResult.OK -> {
                    file.delete()
                    Log.d(TAG, "Audio synced: $path")
                    TregoPersistentService.notifyJobLogged(context, "Voice job synced")
                }
                FlushResult.AUTH_FAIL, FlushResult.BAD_REQUEST -> {
                    // Permanent failure — drop the file (would never succeed)
                    Log.e(TAG, "Permanent failure ($result), dropping: $path")
                    file.delete()
                }
                FlushResult.RETRY -> {
                    remaining.put(path)
                    Log.w(TAG, "Audio sync transient failure, keeping: $path")
                }
            }
        }
        prefs.edit().putString(KEY_AUDIO, remaining.toString()).apply()
    }

    private fun flushText(context: Context, token: String, apiUrl: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_TEXT, "[]"))
        if (arr.length() == 0) return

        val remaining = JSONArray()
        for (i in 0 until arr.length()) {
            val text = arr.getString(i)
            if (submitTextJob(text, token, apiUrl)) {
                Log.d(TAG, "Text synced: ${text.take(50)}")
                TregoPersistentService.notifyJobLogged(context, text)
            } else {
                remaining.put(text)
                Log.w(TAG, "Text sync failed, keeping: ${text.take(50)}")
            }
        }
        prefs.edit().putString(KEY_TEXT, remaining.toString()).apply()
    }

    // ── Network calls ───────────────────────────────────────────────────────

    private enum class FlushResult { OK, AUTH_FAIL, BAD_REQUEST, RETRY }

    /** Single-call upload to /api/jobs/voice — same path as online recording. */
    private fun submitVoiceJob(file: File, token: String, apiUrl: String): FlushResult {
        var conn: HttpURLConnection? = null
        return try {
            val boundary = "----OfflineSync${System.currentTimeMillis()}"
            conn = (URL("$apiUrl/api/jobs/voice").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                connectTimeout = 30_000; readTimeout = 90_000; doOutput = true
            }
            conn.outputStream.use { out ->
                out.write("--$boundary\r\nContent-Disposition: form-data; name=\"intake_source\"\r\n\r\nbubble_offline\r\n".toByteArray())
                out.write("--$boundary\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"${file.name}\"\r\nContent-Type: audio/m4a\r\n\r\n".toByteArray())
                file.inputStream().use { it.copyTo(out) }
                out.write("\r\n--$boundary--\r\n".toByteArray())
            }
            val code = conn.responseCode
            Log.d(TAG, "submitVoiceJob HTTP $code (${file.name})")
            when (code) {
                in 200..299 -> FlushResult.OK
                401, 403 -> FlushResult.AUTH_FAIL
                400 -> FlushResult.BAD_REQUEST
                else -> FlushResult.RETRY
            }
        } catch (e: Exception) {
            Log.e(TAG, "submitVoiceJob exception: ${e.message}")
            FlushResult.RETRY
        } finally {
            try { conn?.disconnect() } catch (_: Exception) {}
        }
    }

    /** Single text-job submit — kept simple, /api/jobs creates + parses. */
    private fun submitTextJob(text: String, token: String, apiUrl: String): Boolean {
        var conn: HttpURLConnection? = null
        return try {
            conn = (URL("$apiUrl/api/jobs").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 10_000; readTimeout = 30_000; doOutput = true
            }
            val body = JSONObject()
                .put("raw_text", text)
                .put("intake_source", "offline_sync")
                .toString().toByteArray()
            conn.outputStream.use { it.write(body) }
            val code = conn.responseCode
            Log.d(TAG, "submitTextJob HTTP $code")
            code in 200..299
        } catch (e: Exception) {
            Log.e(TAG, "Submit text failed: ${e.message}"); false
        } finally {
            try { conn?.disconnect() } catch (_: Exception) {}
        }
    }

    // ── Connectivity listener ───────────────────────────────────────────────

    fun ensureConnectivityListener(context: Context) {
        if (connectivityCallback != null) return

        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val app = context.applicationContext

        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.d(TAG, "Network available — flushing offline queue")
                flush(app)
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            .build()
        try {
            cm.registerNetworkCallback(request, cb)
            connectivityCallback = cb
            Log.d(TAG, "Connectivity listener registered")
        } catch (e: SecurityException) {
            Log.e(TAG, "Cannot register network callback (missing ACCESS_NETWORK_STATE?): ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "registerNetworkCallback failed: ${e.message}")
        }
    }

    /** Removes any queued audio whose file is missing or too small to contain real audio. */
    fun purgeCorrupted(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY_AUDIO, "[]"))
        if (arr.length() == 0) return
        val kept = JSONArray()
        var dropped = 0
        for (i in 0 until arr.length()) {
            val path = arr.getString(i)
            val f = File(path)
            if (!f.exists() || f.length() < 4_096) {
                if (f.exists()) f.delete()
                dropped++
            } else {
                kept.put(path)
            }
        }
        if (dropped > 0) {
            prefs.edit().putString(KEY_AUDIO, kept.toString()).apply()
            Log.d(TAG, "Purged $dropped corrupted offline audio item(s)")
        }
    }
}
