// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-adde.git
//
package de.softopus.add_edashboard

import android.app.Activity
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.util.Log
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

class GpsManager(
    private val activity: Activity,
    private val onData: (String) -> Unit
) {
    private val TAG = "GpsManager"

    private var lastLat = 0.0
    private var lastLon = 0.0
    private var totalKm = 0.0

    private val locationManager =
        activity.getSystemService(android.content.Context.LOCATION_SERVICE)
                as LocationManager

    private val locationListener = object : LocationListener {
        override fun onLocationChanged(loc: Location) {
            val speedKmh = loc.speed * 3.6f
            val display  = if (speedKmh < 2f) 0f else speedKmh

            if (lastLat != 0.0 && display > 0f) {
                totalKm += haversine(lastLat, lastLon, loc.latitude, loc.longitude)
            }
            lastLat = loc.latitude
            lastLon = loc.longitude

            // Locale.US: Punkt statt Komma als Dezimaltrennzeichen
            val json = """{"speed":${"%.1f".format(java.util.Locale.US, display)},"distance":${"%.2f".format(java.util.Locale.US, totalKm)}}"""
            Log.d(TAG, "GPS: $json")
            onData(json)
        }

        // Für ältere Android-Versionen erforderlich
        @Deprecated("Deprecated in API 29")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

        override fun onProviderEnabled(provider: String) {
            Log.d(TAG, "GPS Provider aktiviert: $provider")
        }

        override fun onProviderDisabled(provider: String) {
            Log.w(TAG, "GPS Provider deaktiviert: $provider")
        }
    }

    // ── Starten ───────────────────────────────────────────────────────────────

    fun start() {
        try {
            // GPS_PROVIDER: reiner GPS-Chip — präzise, kein Google
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000L,   // minimale Zeit zwischen Updates in ms
                0f,      // minimale Distanz zwischen Updates in Meter
                locationListener
            )
            Log.d(TAG, "GPS gestartet (native LocationManager)")
        } catch (e: SecurityException) {
            Log.e(TAG, "GPS-Berechtigung fehlt: ${e.message}")
        }
    }

    // ── Stoppen ───────────────────────────────────────────────────────────────

    fun stop() {
        locationManager.removeUpdates(locationListener)
        Log.d(TAG, "GPS gestoppt")
    }

    // ── Distanz zurücksetzen ──────────────────────────────────────────────────

    fun resetDistance() {
        totalKm = 0.0
        lastLat = 0.0
        lastLon = 0.0
    }

    // ── Haversine-Formel: Entfernung in km ────────────────────────────────────

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