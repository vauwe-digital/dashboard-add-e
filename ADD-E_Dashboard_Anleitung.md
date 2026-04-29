# ADD-E Dashboard — Benutzeranleitung v1.1

**Android-App für das ADD-E Fahrrad-Nachrüstsystem · softopus · April 2026**

---

## 1. Übersicht

Die ADD-E Dashboard App zeigt Fahrtdaten Ihres ADD-E Nachrüstsystems in Echtzeit an. Geschwindigkeit und Distanz werden per GPS ermittelt, der Akkustand wird per Bluetooth (BLE) direkt vom ADD-E Akku gelesen.

| Datenquelle | Parameter |
|---|---|
| GPS | Geschwindigkeit · Distanz · Fahrzeit |
| BLE (Akku) | Ladezustand % · Spannung V · Strom A · Kapazität Ah |
| BLE (CSC-Sensor) | Trittfrequenz rpm · Ø Trittfrequenz |

---

## 2. Erste Schritte

### 2.1 App starten

Beim ersten Start fragt die App nach Berechtigungen für **Standort** und **Bluetooth** — beide bestätigen. GPS startet automatisch sobald die Berechtigungen erteilt sind.

### 2.2 BLE-Verbindung herstellen

**ADD-E Akku:**

1. ADD-E Akku einschalten
2. Im Live-Screen auf „Verbinden" tippen
3. Statusanzeige wechselt auf grün „Verbunden"
4. Akkustand erscheint im Stats-Screen

**CSC Cadence-Sensor (optional):**

1. CSC-Sensor am Pedal befestigen und aktivieren
2. Im Live-Screen auf „Cadence verbinden" tippen
3. Sensor wird automatisch erkannt (Suche max. 30 Sek.)
4. Button wechselt auf „Cadence trennen"
5. Trittfrequenz erscheint im Live-Screen

> **Tipp:** Bluetooth eingeschaltet? Die App zeigt einen Hinweis beim Verbindungsversuch.  
> **Tipp:** Während der Suche pulsiert der Verbinden-Button blau und der Statustext animiert sich. Nach 5 Sekunden erscheint der Hinweis „BLE benötigt evtl. mehrere Versuche" — das ist normal.  
> **Tipp:** Bei Verbindungsabbruch erneut auf „Verbinden" tippen — beim zweiten Versuch verbindet sich der Akku schneller.

---

## 3. Die drei Screens

Navigation über die Tab-Leiste am unteren Bildschirmrand: **▶ Live · ∑ Stats · ≡ Verlauf**

### ▶ Live-Screen

| Anzeige | Beschreibung | Quelle |
|---|---|---|
| Geschwindigkeit | Aktuelle Fahrgeschwindigkeit in km/h | GPS |
| Distanz | Zurückgelegte Strecke dieser Fahrt in km | GPS |
| Trittfrequenz | Aktuelle Pedalumdrehungen pro Minute | BLE (CSC) |
| Fahrzeit | Zeitdauer der aktuellen Fahrt | intern |

**Fahrt-Steuerung:**

| Button | Farbe | Funktion |
|---|---|---|
| ▶ Start | Grün | Neue Fahrt beginnen — alle Zähler auf 0 |
| ⏸ Pause | Gelb | Fahrt unterbrechen — Zähler eingefroren |
| ▶ Weiter | Grün | Nach Pause fortsetzen — Zähler läuft weiter |
| ■ Stop | Rot | Sicherheitsabfrage Ja/Nein → Ja: Fahrt speichern und Zähler auf 0 zurücksetzen |

> **Mehrere Touren pro Tag** möglich — nach jedem Stop können neue Fahrten gestartet werden. Alle Touren werden separat im Verlauf gespeichert.

> **Mindestdistanz:** Fahrten unter 0.05 km werden nicht gespeichert.

### ∑ Stats-Screen

| Anzeige | Beschreibung | Quelle |
|---|---|---|
| Ø Geschwindigkeit | Durchschnitt der aktuellen Fahrt | GPS |
| Gesamtkilometer | Akkumulierte Distanz seit App-Start | GPS |
| Geschw.-Maximum | Höchstgeschwindigkeit dieser Fahrt | GPS |
| Ø Trittfrequenz | Durchschnittliche Trittfrequenz der Fahrt | BLE (CSC) |
| Uhrzeit | Aktuelle Systemzeit | intern |
| Akku % | Ladezustand mit Balkenanzeige | BLE |
| Spannung | Akkuspannung in Volt | BLE |
| Strom | Aktueller Stromfluss in Ampere | BLE |
| Verbleibend | Verbleibende Kapazität in Ah | BLE |

> Die Ø Trittfrequenz wird nur bei aktiver Fahrt (State: **läuft**) gesammelt — Pause-Zeiten und Stillstand werden ausgeschlossen.

**Notiz-Feld:**
Unter den BLE-Kacheln befindet sich ein gelbes Eingabefeld für eine kurze Notiz zur aktuellen Fahrt (z.B. `Einkauf`, `Besuch`, `Regen`). Die Notiz wird beim STOP automatisch mit der Fahrt gespeichert und erscheint gelb hervorgehoben im Verlauf.

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
Datum · Uhrzeit · Distanz km · Fahrzeit · Ø Geschwindigkeit · Max. Geschwindigkeit · Akkustand Start→Ende · Ø Trittfrequenz · Notiz *(gelb, falls vorhanden)*

**Aggregierte Werte (W / M / J / Gesamt):**
Anzahl Fahrten · Gesamtdistanz km · Gesamtfahrzeit · Ø Geschwindigkeit · Max. Geschwindigkeit · Ø Trittfrequenz

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
| Ø rpm | Ganzzahl | `82` |
| Notiz | Freitext | `Einkauf` |

> Kommas in Notizen werden beim Export automatisch durch Semikolon ersetzt.

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

### 5.3 Display aktiv halten (Wake Lock)

Der **☀-Button** oben rechts neben den Farbpunkten steuert ob das Display in den Ruhemodus geht:

| Zustand | Symbol | Verhalten |
|---|---|---|
| **Aus** (Standard) | ☀ grau gedimmt | Display geht normal in Ruhemodus |
| **An** | ☀ leuchtend gelb | Display bleibt dauerhaft aktiv |

> Nützlich während der Fahrt — verhindert dass das Display ausgeht wenn die App aktiv genutzt wird.

---

## 6. Testdaten

Im Verlauf-Screen erscheint der Button **⚙ Testdaten erstellen** wenn noch keine Fahrten gespeichert sind. Er generiert simulierte Fahrten vom 01.01.2025 bis heute mit realistischen Sommer/Winter-Mustern.

> Testdaten können jederzeit über das ≡-Icon (Löschen) entfernt werden.

---

## 7. Hinweise

| Thema | Beschreibung |
|---|---|
| GPS-Genauigkeit | GPS-Geschwindigkeit unter 2 km/h wird als 0 angezeigt (Rauschunterdrückung im Stand). |
| Display aus | GPS und Fahrzeit laufen im Hintergrund weiter (Foreground Service). In der Statusleiste erscheint die aktuelle Geschwindigkeit und Distanz. |
| BLE Verbindung | Während der Suche pulsiert der Button blau und der Text animiert sich. Nach 5 Sek. Hinweis „BLE benötigt evtl. mehrere Versuche" — das ist ein bekanntes Android-Verhalten beim ersten Verbindungsaufbau. |
| BLE Reconnect | Bei Verbindungsabbruch erneut auf „Verbinden" tippen — beim zweiten Versuch verbindet sich der Akku schneller (Android BLE-Cache). |
| Akkuprotokoll | Das ADD-E Gerät sendet alle ~1 Sekunde: Spannung, Zellspannungen, Strom, Kapazität und Ladezustand. |
| Trittfrequenz Stillstand | Bei Stillstand (keine Pedalumdrehungen) wird die Anzeige nach 3 Sekunden automatisch auf 0 gesetzt. |
| CSC Scan-Timeout | Die Suche nach dem Cadence-Sensor läuft maximal 30 Sekunden. Bei Timeout erscheint „Kein Cadence-Sensor gefunden". |
| Notiz | Die Notiz wird beim STOP mit der Fahrt gespeichert. Im CSV-Export erscheint sie in Spalte 10 und kann mit Notepad++ nachbearbeitet werden. |

---

## 8. Kompatibler Cadence-Sensor

Die App unterstützt alle Bluetooth-Cadence-Sensoren die den **Bluetooth SIG CSC-Standard** (Cycling Speed and Cadence, Service UUID `0x1816`) verwenden.

**Empfohlene Sensoren:**

| Sensor | Preis | Hinweis |
|---|---|---|
| **CycPlus C3** | ~12 € | Günstig, CSC-konform |
| **Magene S3+** | ~15 € | Bewährt, sehr zuverlässig |
| **Wahoo RPM Cadence** | ~40 € | Premium, sehr stabil |
| **Garmin Cadence Sensor 2** | ~40 € | CSC-konform |

> ⚠️ Beim Kauf auf **„Bluetooth"** oder **„BLE"** achten — reine ANT+-Sensoren funktionieren nicht.

**Montage:** Sensor am Kurbelarm befestigen — die App erkennt ihn automatisch beim Scan.

---

*ADD-E Dashboard · softopus · de.softopus.add_edashboard · Version 1.1 · April 2026*
