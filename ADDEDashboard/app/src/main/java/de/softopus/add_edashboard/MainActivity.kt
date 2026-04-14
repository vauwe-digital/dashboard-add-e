// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-add-e.git
//

package de.softopus.add_edashboard

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    internal lateinit var webView: WebView
    internal lateinit var bleManager: BleManager
    internal lateinit var gpsManager: GpsManager
    internal var webViewReady = false

    private var syncHandler: Handler? = null
    private var syncRunnable: Runnable? = null

    companion object {
        private const val REQUEST_PERMISSIONS = 100
        const val REQUEST_IMPORT_CSV          = 101
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)

        // 1. Bridge ZUERST registrieren
        webView.addJavascriptInterface(Bridge(this), "NativeBridge")

        // 2. Settings
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }

        // 3. WebViewClient
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                android.util.Log.d("MainActivity", "WebView fertig geladen")
                webViewReady = true
                if (hasPermissions()) {
                    gpsManager.start()
                    startForegroundTracking()
                }
            }
        }

        // 4. URL laden
        webView.loadUrl("file:///android_asset/index.html")

        bleManager = BleManager(this) { json -> sendToJS("updateBle", json) }
        gpsManager = GpsManager(this) { json -> sendToJS("updateGps", json) }

        checkAndRequestPermissions()
    }

    // ── Foreground Service ────────────────────────────────────────────────────

    private fun startForegroundTracking() {
        if (!TrackingService.isRunning) {
            startForegroundService(Intent(this, TrackingService::class.java))
        }
    }

    // ── Service-Sync ──────────────────────────────────────────────────────────

    private fun startServiceSync() {
        stopServiceSync()
        syncHandler = Handler(Looper.getMainLooper())
        syncRunnable = object : Runnable {
            override fun run() {
                if (webViewReady && TrackingService.isRunning) {
                    val sec  = TrackingService.currentSeconds
                    val spd  = TrackingService.currentSpeed
                    val dist = TrackingService.currentDistance
                    val json = "{\"speed\":${"%.1f".format(java.util.Locale.US, spd)}," +
                            "\"distance\":${"%.2f".format(java.util.Locale.US, dist)}," +
                            "\"seconds\":$sec}"
                    sendToJS("updateFromService", json)
                }
                syncHandler?.postDelayed(this, 1000)
            }
        }
        syncHandler?.postDelayed(syncRunnable!!, 1000)
    }

    private fun stopServiceSync() {
        syncRunnable?.let { syncHandler?.removeCallbacks(it) }
        syncHandler = null
        syncRunnable = null
    }

    // ── CSV-Import: Dateiauswahl-Ergebnis ─────────────────────────────────────

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_IMPORT_CSV && resultCode == Activity.RESULT_OK) {
            val uri = data?.data ?: return
            try {
                val csv = contentResolver.openInputStream(uri)
                    ?.bufferedReader()
                    ?.readText() ?: return
                android.util.Log.d("MainActivity", "CSV importiert: ${csv.length} Zeichen")

                // Sonderzeichen escapen für JavaScript-String
                val escaped = csv
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "")

                sendToJS("importCsvData", "\"$escaped\"")

            } catch (e: Exception) {
                android.util.Log.e("MainActivity", "Import-Fehler: ${e.message}")
                sendToJS("showToast", "\"Import-Fehler: ${e.message}\"")
            }
        }
    }

    // ── JavaScript aufrufen ───────────────────────────────────────────────────

    internal fun sendToJS(functionName: String, json: String) {
        runOnUiThread {
            if (webViewReady) {
                webView.evaluateJavascript("window.$functionName($json)", null)
            }
        }
    }

    // ── Berechtigungen ────────────────────────────────────────────────────────

    internal fun hasPermissions() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("InlinedApi")
    internal fun checkAndRequestPermissions() {
        val missing = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), REQUEST_PERMISSIONS)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                if (webViewReady) {
                    gpsManager.start()
                    startForegroundTracking()
                }
            } else {
                sendToJS("onPermissionDenied", "{}")
            }
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onResume() {
        super.onResume()
        if (hasPermissions() && webViewReady) {
            gpsManager.start()
            startForegroundTracking()
        }
        startServiceSync()
    }

    override fun onPause() {
        super.onPause()
        gpsManager.stop()
        stopServiceSync()
    }

    override fun onDestroy() {
        super.onDestroy()
        bleManager.disconnect()
        gpsManager.stop()
        stopServiceSync()
        stopService(Intent(this, TrackingService::class.java))
        webView.destroy()
    }
}

// ── Bridge: JavaScript → Kotlin ───────────────────────────────────────────────

@Suppress("unused")
class Bridge(private val context: MainActivity) {

    @JavascriptInterface
    fun startBle() {
        if (context.hasPermissions()) context.bleManager.scan()
        else context.checkAndRequestPermissions()
    }

    @JavascriptInterface
    fun stopBle() {
        context.bleManager.disconnect()
    }

    @JavascriptInterface
    fun startGps() {
        if (context.hasPermissions()) context.gpsManager.start()
    }

    @JavascriptInterface
    fun stopGps() {
        context.gpsManager.stop()
    }

    @JavascriptInterface
    fun getAppVersion(): String {
        return BuildConfig.VERSION_NAME
    }

    @JavascriptInterface
    fun importCsv() {
        android.util.Log.d("MainActivity", "importCsv aufgerufen")
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        context.startActivityForResult(
            Intent.createChooser(intent, "CSV-Datei auswählen"),
            MainActivity.REQUEST_IMPORT_CSV
        )
    }

    @JavascriptInterface
    fun exportCsv(signal: String) {
        android.util.Log.d("MainActivity", "exportCsv Signal: $signal")
        val handler = Handler(Looper.getMainLooper())
        handler.post {
            // Zuerst Label lesen
            context.webView.evaluateJavascript(
                "localStorage.getItem('adde_csv_label')"
            ) { labelRaw ->
                val label = labelRaw?.removeSurrounding("\"") ?: "export"
                android.util.Log.d("MainActivity", "CSV Label: $label")

                // Dann CSV-Daten lesen
                context.webView.evaluateJavascript(
                    "localStorage.getItem('adde_csv_export')"
                ) { csv ->
                    android.util.Log.d("MainActivity", "CSV Länge: ${csv?.length}")
                    if (csv == null || csv == "null") {
                        android.util.Log.e("MainActivity", "CSV leer")
                        return@evaluateJavascript
                    }
                    val csvClean = csv.removeSurrounding("\"")
                        .replace("\\n", "\n")
                        .replace("\\\"", "\"")
                        .replace("\\\\", "\\")

                    try {
                        val fileName = "adde_${label}_${System.currentTimeMillis()}.csv"
                        val downloads = android.os.Environment
                            .getExternalStoragePublicDirectory(
                                android.os.Environment.DIRECTORY_DOWNLOADS)
                        downloads.mkdirs()
                        val file = java.io.File(downloads, fileName)
                        file.writeText(csvClean, Charsets.UTF_8)
                        android.util.Log.d("MainActivity",
                            "CSV gespeichert: ${file.absolutePath} (${file.length()} bytes)")

                        context.webView.evaluateJavascript(
                            "localStorage.removeItem('adde_csv_export')", null)
                        context.webView.evaluateJavascript(
                            "localStorage.removeItem('adde_csv_label')", null)
                        context.webView.evaluateJavascript(
                            "window.showToast('✓ Gespeichert: $fileName')", null)

                    } catch (e: Exception) {
                        android.util.Log.e("MainActivity", "CSV-Fehler: ${e.message}")
                        context.webView.evaluateJavascript(
                            "window.showToast('Fehler: ${e.message}')", null)
                    }
                }
            }
        }
    }
}