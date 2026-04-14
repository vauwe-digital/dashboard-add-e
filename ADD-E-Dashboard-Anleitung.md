README

# ADD-E Dashboard

Android app for the ADD-E bicycle retrofit system.  
Reads battery data via BLE and tracks speed/distance via GPS with the native Android `LocationManager`\-API

© 2026 softopus | GPL v3 | Not for commercial use without permission

**Note on BLE Protocol**  
The BLE configuration file (ble-config.js) is not included  
in this repository. Contact ADD-E GmbH for access.

## Leistungsmerkmale

**3 Screens per Navigation:**

- **Live** — Echtzeit-Anzeige von Geschwindigkeit, Distanz, Trittfrequenz (Platzhalter) und Fahrzeit
- **Stats** — Durchschnittsgeschwindigkeit, Gesamtkilometer, Maximum, Uhrzeit und Akku-Detailwerte (%, Spannung, Strom, Ah)
- **Verlauf** — Übersicht der letzten Fahrten

**Datenbeschaffung:**

- GPS-basierte Geschwindigkeit und Distanz (Haversine-Formel, Rauschunterdrückung unter 2 km/h)
- BLE-Verbindung zum ADD-E Akku über Nordic UART Service — Ladezustand, Spannung, Strom, verbleibende Kapazität
- Fahrzeit-Timer startet automatisch bei Bewegung
- Echtzeit-Uhr

**Bedienung:**

- Manueller BLE-Verbindungsaufbau per Button
- Automatischer Reconnect bei Verbindungsabbruch (3 Versuche)
- 3 Farbthemen (Teal, Amber, Coral) — persistent gespeichert
- Deutsch/Englisch-Umschaltung

* * *

## Programmiertechniken

**Android (Kotlin):**

- `AppCompatActivity` mit `WebView` als UI-Container
- `BluetoothGatt` / `BluetoothLeScanner` für native BLE-Kommunikation
- GPS (native LocationManager — Google-frei)
- `JavascriptInterface` als Bridge zwischen Kotlin und JavaScript
- `evaluateJavascript()` für Echtzeit-Datenübertragung Kotlin → WebView
- Lifecycle-Management (`onResume`, `onPause`, `onDestroy`)
- Laufzeit-Berechtigungsabfrage (BLE + GPS)
- `Locale.US` für locale-unabhängige JSON-Formatierung

**Web-Frontend (Vanilla JS / HTML / CSS):**

- Dashboard als PWA-fähige Single-Page-App im `assets`\-Ordner
- CSS Custom Properties für Theming mit 3 Farbvarianten
- `localStorage` für persistente Einstellungen (Theme, Sprache, Gesamtkilometer)
- `window.updateGps()` / `window.updateBle()` als Empfangsfunktionen für Kotlin-Daten
- Haversine-Formel in JavaScript für Distanzberechnung (Browser-Fallback)

**Architektur:**

- Strikte Trennung: Kotlin übernimmt Hardware (BLE, GPS), JavaScript übernimmt UI
- Eine gemeinsame HTML-Codebasis — wiederverwendbar für spätere iOS-Version via Capacitor
- Proprietäres ADD-E UART-Protokoll (`<P|...|98.0|...>`) wird in Kotlin geparst und als JSON an das Dashboard übergeben

* * *

## Noch ausstehend

- Trittfrequenz (nach Erhalt der Motorcontroller-Dokumentation von ADD-E)
- Fahrtdaten persistent speichern (Verlaufs-Screen mit echten Daten)
- iOS-Version via Capacitor.js
- NDA und offizielle BLE-Dokumentation von ADD-E

id: 0b07818e4be943ff9294e57d87d93f56
parent_id: 32ce0f6cda404716bd547b6786d87359
created_time: 2026-04-09T13:33:01.495Z
updated_time: 2026-04-14T09:42:00.984Z
is_conflict: 0
latitude: 0.00000000
longitude: 0.00000000
altitude: 0.0000
author: 
source_url: 
is_todo: 0
todo_due: 0
todo_completed: 0
source: joplin-desktop
source_application: net.cozic.joplin-desktop
application_data: 
order: 1775746864052
user_created_time: 2026-04-09T13:33:01.495Z
user_updated_time: 2026-04-14T09:30:00.279Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 0
share_id: 
conflict_original_id: 
master_key_id: 
user_data: 
deleted_time: 1776159720984
type_: 1