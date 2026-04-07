package com.tregoproviderapp

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Submits a text job directly to the backend from a BroadcastReceiver (no app open needed).
 * Reads auth token from SharedPreferences (stored at login time).
 */
object TregoJobSubmitter {

    private const val TAG = "TregoJobSubmitter"
    private const val PREFS = "trego_prefs"

    fun submitText(context: Context, text: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val token = prefs.getString("auth_token", null)
        val apiUrl = prefs.getString("api_url", "https://tregoproviderappmobile.onrender.com")
        if (token == null) {
            Log.w(TAG, "No auth token stored — cannot submit offline text job")
            return
        }

        Thread {
            var conn: HttpURLConnection? = null
            try {
                val url = URL("$apiUrl/api/jobs")
                conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.setRequestProperty("Content-Type", "application/json")
                conn.connectTimeout = 10_000
                conn.readTimeout = 10_000
                conn.doOutput = true

                val body = JSONObject()
                    .put("raw_text", text)
                    .put("intake_source", "notification_text")
                    .toString()
                    .toByteArray(Charsets.UTF_8)

                conn.outputStream.use { it.write(body) }

                val code = conn.responseCode
                Log.d(TAG, "Text job submitted — HTTP $code")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to submit text job", e)
            } finally {
                conn?.disconnect()
            }
        }.start()
    }

    fun storeToken(context: Context, token: String, apiUrl: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString("auth_token", token)
            .putString("api_url", apiUrl)
            .apply()
    }
}
