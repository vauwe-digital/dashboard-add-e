// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-adde.git

// gps.js — GPS-Geschwindigkeit und Distanzberechnung

let watchId   = null;
let lastCoord = null;
let totalDist = 0;   // in km, akkumuliert über die aktuelle Fahrt

/**
 * Startet GPS-Überwachung.
 * onUpdate({ speed: km/h, distance: km })
 */
export function startGPS(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError && onError('GPS nicht verfügbar');
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, speed } = pos.coords;

      // speed in m/s → km/h; unter 2 km/h wird als 0 behandelt (Rauschen im Stand)
      const rawKmh = speed != null ? speed * 3.6 : 0;
      const displaySpeed = rawKmh < 2 ? 0 : rawKmh;

      // Distanz nur addieren wenn Bewegung erkannt
      if (lastCoord && displaySpeed > 0) {
        totalDist += haversine(lastCoord, { latitude, longitude });
      }
      lastCoord = { latitude, longitude };

      onUpdate({ speed: displaySpeed, distance: totalDist });
    },
    (err) => {
      const msg = {
        1: 'GPS-Berechtigung verweigert',
        2: 'GPS-Position nicht verfügbar',
        3: 'GPS-Timeout'
      }[err.code] || 'GPS-Fehler';
      onError && onError(msg);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );
}

export function stopGPS() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/** Distanz für neue Fahrt zurücksetzen */
export function resetDistance() {
  totalDist = 0;
  lastCoord = null;
}

/** Aktuelle Gesamtdistanz abrufen */
export function getDistance() { return totalDist; }

/** Haversine-Formel: Entfernung zwischen zwei Koordinaten in km */
function haversine(a, b) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.latitude  - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude))
    * Math.cos(toRad(b.latitude))
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
