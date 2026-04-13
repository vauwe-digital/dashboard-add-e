// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-adde.gitpackage de.softopus.add_edashboard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

class TrackingService : Service() {

    private val TAG        = "TrackingService"
    private val CHANNEL_ID = "adde_tracking"
    private val NOTIF_ID   = 1

    private lateinit var locationManager: LocationManager
    private var totalKm     = 0.0
    private var lastLat     = 0.0
    private var lastLon     = 0.0
    private var rideSeconds = 0
    private var timerThread: Thread? = null

    companion object {
        var currentSpeed    = 0f
        var currentDistance = 0.0
        var currentSeconds  = 0
        var isRunning       = false
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        startForeground(NOTIF_ID, buildNotification())
        startGps()
        startTimer()
        isRunning = true
        Log.d(TAG, "TrackingService gestartet")
    }

    override fun onDestroy() {
        super.onDestroy()
        stopGps()
        timerThread?.interrupt()
        isRunning = false
        Log.d(TAG, "TrackingService gestoppt")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── GPS mit nativer LocationManager-API ───────────────────────────────────

    private val locationListener = object : LocationListener {
        override fun onLocationChanged(loc: Location) {
            val speedKmh = loc.speed * 3.6f
            currentSpeed = if (speedKmh < 2f) 0f else speedKmh

            if (lastLat != 0.0 && currentSpeed > 0f) {
                totalKm += haversine(lastLat, lastLon, loc.latitude, loc.longitude)
                currentDistance = totalKm
            }
            lastLat = loc.latitude
            lastLon = loc.longitude

            // Benachrichtigung aktualisieren
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(NOTIF_ID, buildNotification())
        }

        @Deprecated("Deprecated in API 29")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

        override fun onProviderEnabled(provider: String) {
            Log.d(TAG, "Provider aktiviert: $provider")
        }

        override fun onProviderDisabled(provider: String) {
            Log.w(TAG, "Provider deaktiviert: $provider")
        }
    }

    private fun startGps() {
        try {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000L,  // min. Zeit in ms
                0f,     // min. Distanz in m
                locationListener
            )
            Log.d(TAG, "GPS gestartet")
        } catch (e: SecurityException) {
            Log.e(TAG, "GPS-Berechtigung fehlt: ${e.message}")
        }
    }

    private fun stopGps() {
        locationManager.removeUpdates(locationListener)
        Log.d(TAG, "GPS gestoppt")
    }

    // ── Timer ─────────────────────────────────────────────────────────────────

    private fun startTimer() {
        timerThread = Thread {
            while (!Thread.interrupted()) {
                if (currentSpeed > 0f) {
                    rideSeconds++
                    currentSeconds = rideSeconds
                }
                try {
                    Thread.sleep(1000)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }
        timerThread?.start()
    }

    // ── Benachrichtigung ──────────────────────────────────────────────────────

    private fun buildNotification(): Notification {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "ADD-E Tracking",
                    NotificationManager.IMPORTANCE_LOW
                )
            )
        }
        val speed = "%.1f".format(java.util.Locale.US, currentSpeed)
        val km    = "%.2f".format(java.util.Locale.US, currentDistance)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ADD-E Dashboard")
            .setContentText("$speed km/h  ·  $km km")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
    }

    // ── Haversine-Formel ──────────────────────────────────────────────────────

    private fun haversine(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R    = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a    = sin(dLat / 2).pow(2) +
                cos(Math.toRadians(lat1)) *
                cos(Math.toRadians(lat2)) *
                sin(dLon / 2).pow(2)
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
    }
}