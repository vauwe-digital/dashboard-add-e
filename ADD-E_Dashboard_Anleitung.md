# ADD-E Dashboard — Benutzeranleitung v1.0

**Android-App für das ADD-E Fahrrad-Nachrüstsystem · softopus · April 2026**

---

## 1. Übersicht

Die ADD-E Dashboard App zeigt Fahrtdaten Ihres ADD-E Nachrüstsystems in Echtzeit an. Geschwindigkeit und Distanz werden per GPS ermittelt, der Akkustand wird per Bluetooth (BLE) direkt vom ADD-E Akku gelesen.

| Datenquelle | Parameter |
|---|---|
| GPS | Geschwindigkeit · Distanz · Fahrzeit |
| BLE (Akku) | Ladezustand % · Spannung V · Strom A · Kapazität Ah |
| Motorcontroller | Trittfrequenz rpm *(in Vorbereitung)* |

---

## 2. Erste Schritte

### 2.1 App starten

Beim ersten Start fragt die App nach Berechtigungen für **Standort** und **Bluetooth** — beide bestätigen. GPS startet automatisch sobald die Berechtigungen erteilt sind.

### 2.2 BLE-Verbindung herstellen

1. ADD-E Akku einschalten
2. Im Live-Screen auf „Verbinden" tippen
3. Gerät „add-e P300-xxxx" auswählen
4. Statusanzeige wechselt auf grün „Verbunden"
5. Akkustand erscheint im Stats-Screen

> **Tipp:** Bei Verbindungsabbruch versucht die App automatisch 3× zu reconnecten.

---

## 3. Die drei Screens

Navigation über die Tab-Leiste am unteren Bildschirmrand: **▶ Live · ∑ Stats · ≡ Verlauf**

### ▶ Live-Screen

| Anzeige | Beschreibung | Quelle |
|---|---|---|
| Geschwindigkeit | Aktuelle Fahrgeschwindigkeit in km/h | GPS |
| Distanz | Zurückgelegte Strecke dieser Fahrt in km | GPS |
| Trittfrequenz | Pedalumdrehungen pro Minute *(in Vorb.)* | BLE |
| Fahrzeit | Zeitdauer der aktuellen Fahrt | intern |

### ∑ Stats-Screen

| Anzeige | Beschreibung | Quelle |
|---|---|---|
| Ø Geschwindigkeit | Durchschnitt der aktuellen Fahrt | GPS |
| Gesamtkilometer | Akkumulierte Distanz seit App-Start | GPS |
| Geschw.-Maximum | Höchstgeschwindigkeit dieser Fahrt | GPS |
| Uhrzeit | Aktuelle Systemzeit | intern |
| Akku % | Ladezustand mit Balkenanzeige | BLE |
| Spannung | Akkuspannung in Volt | BLE |
| Strom | Aktueller Stromfluss in Ampere | BLE |
| Verbleibend | Verbleibende Kapazität in Ah | BLE |

### ≡ Verlauf-Screen

Zeigt gespeicherte Fahrten in fünf Zeiträumen an:

| Tab | Zeitraum | Navigation |
|---|---|---|
| T | Ein einzelner Tag | ◄ ► blättern, Heute-Button |
| W | Eine Kalenderwoche (Mo–So) | ◄ ► blättern, Heute-Button |
| M | Ein Kalendermonat | ◄ ► blättern, Heute-Button |
| J | Ein Kalenderjahr | ◄ ► blättern, Heute-Button |
| Gesamt | Alle gespeicherten Fahrten | Keine Navigation |

**Angezeigte Werte pro Fahrt:**
Datum · Uhrzeit · Distanz km · Fahrzeit · Ø Geschwindigkeit · Max. Geschwindigkeit · Akkustand Start→Ende

**Aggregierte Werte (W / M / J / Gesamt):**
Anzahl Fahrten · Gesamtdistanz km · Gesamtfahrzeit · Ø Geschwindigkeit · Max. Geschwindigkeit

**Aktionszeile:**

| Symbol | Funktion |
|---|---|
| ℹ Info | Zusammenfassung des gewählten Zeitraums |
| ⬇ Export | CSV-Datei in Downloads speichern (gefiltert nach aktivem Tab) |
| ⬆ Import | Bearbeitete CSV-Datei zurückladen und mit vorhandenen Daten zusammenführen |
| ≡ Löschen | Alle Fahrtdaten nach Bestätigung löschen |

---

## 4. CSV-Export und Bearbeitung

### 4.1 Export

Der Export speichert die Fahrtdaten des **aktiven Tabs** gefiltert als CSV-Datei im Downloads-Ordner des Geräts.

> **Dateiname:** `adde_[Zeitraum]_[Timestamp].csv`  
> **Beispiel:** `adde_2026-04_1744500000000.csv`

### 4.2 CSV-Datei bearbeiten

Die exportierte CSV-Datei kann am PC bearbeitet und bereinigt werden.

> ⚠️ **Wichtig:** CSV-Dateien **nicht mit Microsoft Excel** bearbeiten.  
> Excel interpretiert Dezimalzahlen mit Punkt (z. B. `6.47`) automatisch als Datum (`06.04.`) und beschädigt die Daten unwiederbringlich.

**Empfohlene Editoren:**

| Editor | Hinweis |
|---|---|
| **Notepad++** | Ideal — öffnet CSV exakt wie sie ist, keine Auto-Formatierung |
| **LibreOffice Calc** | Beim Öffnen: Trennzeichen = Komma, Dezimal = Punkt wählen |
| **VS Code** | Reiner Texteditor, keine Formatierung |

**CSV-Format (Spaltenreihenfolge beibehalten):**

| Spalte | Inhalt | Beispiel |
|---|---|---|
| Datum | YYYY-MM-DD | `2026-04-12` |
| Uhrzeit | HH:MM | `08:15` |
| Distanz km | Dezimalzahl mit Punkt | `8.32` |
| Fahrzeit s | Ganzzahl in Sekunden | `1452` |
| Ø km/h | Dezimalzahl mit Punkt | `20.6` |
| Max km/h | Dezimalzahl mit Punkt | `31.2` |
| Akku Start% | Ganzzahl | `97` |
| Akku Ende% | Ganzzahl | `89` |

### 4.3 CSV-Import

Nach der Bearbeitung kann die CSV-Datei wieder in die App geladen werden:

1. Im Verlauf-Screen auf ⬆ (Import) tippen
2. Bestätigen
3. CSV-Datei im Datei-Browser auswählen
4. Neue Fahrten werden mit vorhandenen zusammengeführt
5. Duplikate (gleiche Datum + Uhrzeit) werden automatisch übersprungen

> **Toast-Meldung nach Import:** `✓ 45 Fahrten importiert (3 Duplikate)`

---

## 5. Einstellungen

### 5.1 Farbthema

Drei Farbvarianten über die Farbpunkte oben rechts wählbar. Die Auswahl wird gespeichert und beim nächsten Start übernommen.

| Farbe | Beschreibung |
|---|---|
| 🟢 Teal (Standard) | Grün — standard Tageslicht |
| 🟡 Amber | Gelb — hoher Kontrast bei Sonnenlicht |
| 🔴 Coral | Orange-Rot — alternative Ansicht |

### 5.2 Sprache

Über den Button **EN / DE** oben rechts zwischen Deutsch und Englisch wechseln. Alle Bezeichnungen, Statusmeldungen und Verlauf-Texte werden sofort umgestellt.

---

## 7. Testdaten

Im Verlauf-Screen erscheint der Button **⚙ Testdaten erstellen** wenn noch keine Fahrten gespeichert sind. Er generiert simulierte Fahrten vom 01.01.2025 bis heute mit realistischen Sommer/Winter-Mustern.

> Testdaten können jederzeit über das ≡-Icon (Löschen) entfernt werden.

---

## 8. Hinweise

| Thema | Beschreibung |
|---|---|
| GPS-Genauigkeit | GPS-Geschwindigkeit unter 2 km/h wird als 0 angezeigt (Rauschunterdrückung im Stand). |
| Display aus | GPS und Fahrzeit laufen im Hintergrund weiter (Foreground Service). In der Statusleiste erscheint die aktuelle Geschwindigkeit und Distanz. |
| BLE Reconnect | Bei Verbindungsabbruch versucht die App automatisch 3× mit steigender Wartezeit (1s, 2s, 3s) zu reconnecten. |
| Akkuprotokoll | Das ADD-E Gerät sendet alle ~1 Sekunde: Spannung, Zellspannungen, Strom, Kapazität und Ladezustand. |
| Trittfrequenz | Wird nach Erhalt der Protokolldokumentation vom Motorcontroller in einem späteren Update ergänzt. |

---

*ADD-E Dashboard · softopus · de.softopus.add_edashboard · Version 1.0 · April 2026*
