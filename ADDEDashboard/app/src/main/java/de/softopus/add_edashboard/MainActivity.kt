// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-adde.git
//
package de.softopus.add_edashboard

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
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

    companion object {
        private const val REQUEST_PERMISSIONS = 100
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    }

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
                if (hasPermissions()) gpsManager.start()
            }
        }

        // 4. URL laden
        webView.loadUrl("file:///android_asset/index.html")

        bleManager = BleManager(this) { json -> sendToJS("updateBle", json) }
        gpsManager = GpsManager(this) { json -> sendToJS("updateGps", json) }

        checkAndRequestPermissions()
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
                if (webViewReady) gpsManager.start()
            } else {
                sendToJS("onPermissionDenied", "{}")
            }
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onResume() {
        super.onResume()
        if (hasPermissions() && webViewReady) gpsManager.start()
    }

    override fun onPause() {
        super.onPause()
        gpsManager.stop()
    }

    override fun onDestroy() {
        super.onDestroy()
        bleManager.disconnect()
        gpsManager.stop()
        webView.destroy()
    }
}

// ── Bridge: JavaScript → Kotlin ───────────────────────────────────────────────

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
    fun exportCsv(signal: String) {
        android.util.Log.d("MainActivity", "exportCsv Signal: $signal")
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        handler.post {
            android.util.Log.d("MainActivity", "Handler läuft")

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

                    android.util.Log.d("MainActivity",
                        "CSV erste Zeile: ${csvClean.lines().firstOrNull()}")

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

                        // localStorage bereinigen
                        context.webView.evaluateJavascript(
                            "localStorage.removeItem('adde_csv_export')", null)
                        context.webView.evaluateJavascript(
                            "localStorage.removeItem('adde_csv_label')", null)

                        // Erfolg anzeigen
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