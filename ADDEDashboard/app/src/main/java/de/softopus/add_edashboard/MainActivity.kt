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
        webView.addJavascriptInterface(Bridge(this), "NativeBridge")

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        }

        webView.clearCache(true)
        webView.clearHistory()

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                webViewReady = true
                if (hasPermissions()) { gpsManager.start(); startForegroundTracking() }
            }
        }

        webView.loadUrl("file:///android_asset/index.html")

        bleManager = BleManager(
            activity    = this,
            onData      = { json   -> sendToJS("updateBle", json) },
            onCadence   = { rpm    -> sendToJS("updateCadence", "{\"cadence\":$rpm}") },
            onCscStatus = { status -> sendToJS("updateCscStatus", "\"$status\"") }
        )

        gpsManager = GpsManager(this) { json -> sendToJS("updateGps", json) }
        checkAndRequestPermissions()
    }

    private fun startForegroundTracking() {
        if (!TrackingService.isRunning)
            startForegroundService(Intent(this, TrackingService::class.java))
    }

    private fun startServiceSync() {
        stopServiceSync()
        syncHandler = Handler(Looper.getMainLooper())
        syncRunnable = object : Runnable {
            override fun run() {
                if (webViewReady && TrackingService.isRunning) {
                    val json = "{\"speed\":${"%.1f".format(java.util.Locale.US, TrackingService.currentSpeed)}," +
                            "\"distance\":${"%.2f".format(java.util.Locale.US, TrackingService.currentDistance)}," +
                            "\"seconds\":${TrackingService.currentSeconds}}"
                    sendToJS("updateFromService", json)
                }
                syncHandler?.postDelayed(this, 1000)
            }
        }
        syncHandler?.postDelayed(syncRunnable!!, 1000)
    }

    private fun stopServiceSync() {
        syncRunnable?.let { syncHandler?.removeCallbacks(it) }
        syncHandler = null; syncRunnable = null
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_IMPORT_CSV && resultCode == Activity.RESULT_OK) {
            val uri = data?.data ?: return
            try {
                val csv = contentResolver.openInputStream(uri)?.bufferedReader()?.readText() ?: return
                val escaped = csv.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "")
                sendToJS("importCsvData", "\"$escaped\"")
            } catch (e: Exception) {
                sendToJS("showToast", "\"Import-Fehler: ${e.message}\"")
            }
        }
    }

    internal fun sendToJS(functionName: String, json: String) {
        runOnUiThread {
            if (webViewReady) webView.evaluateJavascript("window.$functionName($json)", null)
        }
    }

    internal fun hasPermissions() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("InlinedApi")
    internal fun checkAndRequestPermissions() {
        val missing = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) ActivityCompat.requestPermissions(this, missing.toTypedArray(), REQUEST_PERMISSIONS)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                if (webViewReady) { gpsManager.start(); startForegroundTracking() }
            } else sendToJS("onPermissionDenied", "{}")
        }
    }

    override fun onResume() {
        super.onResume()
        if (hasPermissions() && webViewReady) { gpsManager.start(); startForegroundTracking() }
        startServiceSync()
    }

    override fun onPause()   { super.onPause();   gpsManager.stop(); stopServiceSync() }
    override fun onDestroy() {
        super.onDestroy()
        bleManager.disconnect(); bleManager.disconnectCsc()
        gpsManager.stop(); stopServiceSync()
        stopService(Intent(this, TrackingService::class.java))
        webView.destroy()
    }
}

@Suppress("unused")
class Bridge(private val context: MainActivity) {

    @JavascriptInterface fun startBle() { if (context.hasPermissions()) context.bleManager.scan() else context.checkAndRequestPermissions() }
    @JavascriptInterface fun stopBle()  { context.bleManager.disconnect() }
    @JavascriptInterface fun startCsc() { if (context.hasPermissions()) context.bleManager.scanCsc() else context.checkAndRequestPermissions() }
    @JavascriptInterface fun stopCsc()  { context.bleManager.disconnectCsc() }
    @JavascriptInterface fun startGps() { if (context.hasPermissions()) context.gpsManager.start() }
    @JavascriptInterface fun stopGps()  { context.gpsManager.stop() }
    @JavascriptInterface fun getAppVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun resetService() {
        TrackingService.resetRequested  = true
        TrackingService.currentSeconds  = 0
        TrackingService.currentDistance = 0.0
        TrackingService.currentSpeed    = 0f
    }

    @JavascriptInterface
    fun importCsv() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply { type = "*/*"; addCategory(Intent.CATEGORY_OPENABLE) }
        context.startActivityForResult(Intent.createChooser(intent, "CSV-Datei auswählen"), MainActivity.REQUEST_IMPORT_CSV)
    }

    @JavascriptInterface
    fun exportCsv(signal: String) {
        Handler(Looper.getMainLooper()).post {
            context.webView.evaluateJavascript("localStorage.getItem('adde_csv_label')") { labelRaw ->
                val label = labelRaw?.removeSurrounding("\"") ?: "export"
                context.webView.evaluateJavascript("localStorage.getItem('adde_csv_export')") { csv ->
                    if (csv == null || csv == "null") return@evaluateJavascript
                    val csvClean = csv.removeSurrounding("\"").replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\")
                    try {
                        val fileName = "adde_${label}_${System.currentTimeMillis()}.csv"
                        val downloads = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
                        downloads.mkdirs()
                        java.io.File(downloads, fileName).writeText(csvClean, Charsets.UTF_8)
                        context.webView.evaluateJavascript("localStorage.removeItem('adde_csv_export')", null)
                        context.webView.evaluateJavascript("localStorage.removeItem('adde_csv_label')", null)
                        context.webView.evaluateJavascript("window.showToast('✓ Gespeichert: $fileName')", null)
                    } catch (e: Exception) {
                        context.webView.evaluateJavascript("window.showToast('Fehler: ${e.message}')", null)
                    }
                }
            }
        }
    }
}