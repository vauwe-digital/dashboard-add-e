// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-adde.git

package de.softopus.add_edashboard

import android.app.Activity
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.UUID

class BleManager(
    private val activity: Activity,
    private val onData: (String) -> Unit
) {
    private val TAG = "BleManager"

    private val bluetoothManager =
        activity.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter = bluetoothManager.adapter
    private var gatt: BluetoothGatt? = null

    private val buffer  = StringBuilder()
    private val handler = Handler(Looper.getMainLooper())
    private var parseJob: Runnable? = null

    private val NUS_SERVICE = UUID.fromString("6e400001-b5a3-f393-e0a9-e50e24dcca9e")
    private val NUS_TX      = UUID.fromString("6e400003-b5a3-f393-e0a9-e50e24dcca9e")
    private val CCCD        = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    // ── Scan ─────────────────────────────────────────────────────────────────

    fun scan() {
        Log.d(TAG, "Starte BLE-Scan...")
        bluetoothAdapter.bluetoothLeScanner.startScan(scanCallback)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val name = result.device.name ?: return
            Log.d(TAG, "Gerät gefunden: $name")
            if (name.contains("add-e", ignoreCase = true) ||
                name.contains("adde",  ignoreCase = true)) {
                bluetoothAdapter.bluetoothLeScanner.stopScan(this)
                connect(result.device)
            }
        }
        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "Scan fehlgeschlagen: $errorCode")
        }
    }

    // ── Verbinden ─────────────────────────────────────────────────────────────

    private fun connect(device: BluetoothDevice) {
        Log.d(TAG, "Verbinde mit ${device.name}...")
        gatt = device.connectGatt(activity, false, gattCallback)
    }

    private val gattCallback = object : BluetoothGattCallback() {

        // Schritt 1: Verbunden → MTU erhöhen
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    Log.d(TAG, "Verbunden — fordere MTU 512 an")
                    g.requestMtu(512)
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    Log.d(TAG, "Verbindung getrennt")
                    buffer.clear()
                    parseJob?.let { handler.removeCallbacks(it) }
                    gatt = null
                }
            }
        }

        // Schritt 2: MTU bestätigt → Service-Discovery starten
        override fun onMtuChanged(g: BluetoothGatt, mtu: Int, status: Int) {
            Log.d(TAG, "MTU geändert auf: $mtu (status=$status)")
            g.discoverServices()
        }

        // Schritt 3: Services gefunden → Notifications aktivieren
        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "Service-Discovery fehlgeschlagen: $status")
                return
            }
            val characteristic = g.getService(NUS_SERVICE)
                ?.getCharacteristic(NUS_TX) ?: return

            g.setCharacteristicNotification(characteristic, true)

            handler.postDelayed({
                val descriptor = characteristic.getDescriptor(CCCD) ?: return@postDelayed
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    g.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                } else {
                    @Suppress("DEPRECATION")
                    descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    @Suppress("DEPRECATION")
                    g.writeDescriptor(descriptor)
                }
                Log.d(TAG, "Notifications aktiviert")
            }, 500)
        }

        // Schritt 4a: Daten empfangen — Android 12 und älter
        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(
            g: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic
        ) {
            val chunk = characteristic.value.toString(Charsets.UTF_8)
            Log.d(TAG, "Chunk alt (${chunk.length}): $chunk")
            processChunk(chunk)
        }

        // Schritt 4b: Daten empfangen — Android 13+
        override fun onCharacteristicChanged(
            g: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray
        ) {
            val chunk = value.toString(Charsets.UTF_8)
            Log.d(TAG, "Chunk neu (${chunk.length}): $chunk")
            processChunk(chunk)
        }
    }

    // ── Chunk verarbeiten ─────────────────────────────────────────────────────

    private fun processChunk(chunk: String) {
        synchronized(buffer) { buffer.append(chunk) }
        parseJob?.let { handler.removeCallbacks(it) }
        parseJob = Runnable {
            val collected = synchronized(buffer) {
                val s = buffer.toString()
                buffer.clear()
                s
            }
            Log.d(TAG, "=== Buffer (${collected.length} Zeichen) ===")
            Log.d(TAG, collected)
            Log.d(TAG, "=== Ende Buffer ===")
            parseBuffer(collected)
        }
        handler.postDelayed(parseJob!!, 500)
    }

    // ── Buffer parsen ─────────────────────────────────────────────────────────

    private fun parseBuffer(raw: String) {
        Log.d(TAG, "parseBuffer aufgerufen")
        Log.d(TAG, "Raw: $raw")

        // Direkttest: enthält der String 'FC:'?
        Log.d(TAG, "Enthält FC: ${raw.contains("FC:")}")
        Log.d(TAG, "Enthält <P: ${raw.contains("<P")}")

        // Vereinfachter Regex — kein > am Ende erforderlich
        val pattern = Regex("<P\\|[^<]+")
        val matches = pattern.findAll(raw).toList()
        Log.d(TAG, "Gefundene Pakete: ${matches.size}")

        if (matches.isNotEmpty()) {
            val last = matches.last().value
            Log.d(TAG, "Verwende Paket: $last")
            parsePacket(last)?.let { json ->
                Log.d(TAG, "JSON: $json")
                onData(json)
            }
        } else {
            Log.w(TAG, "Kein Paket gefunden in: $raw")
        }
    }

    // ── Trennen ───────────────────────────────────────────────────────────────

    fun disconnect() {
        parseJob?.let { handler.removeCallbacks(it) }
        gatt?.disconnect()
        gatt?.close()
        gatt = null
        buffer.clear()
        Log.d(TAG, "BLE getrennt")
    }

    // ── Protokoll-Parser ──────────────────────────────────────────────────────
    // Format: <P|300|24.81|4.13(0)|4.13(0)|4.13(0)|4.13(0)|4.13(0)|4.13(0)|A:0.01|RC:11.77|FC:12.06|97.0|AT1|FW115|0|0>

    private fun parsePacket(raw: String): String? {
        val cleaned = raw.removePrefix("<").removeSuffix(">").trim()
        val fields  = cleaned.split("|")

        Log.d(TAG, "Felder (${fields.size}): ${fields.joinToString()}")
        if (fields[0] != "P" || fields.size < 13) return null

        val voltage   = fields[2].toFloatOrNull() ?: 0f
        val aField    = fields.find { it.startsWith("A:") }
        val rcField   = fields.find { it.startsWith("RC:") }
        val fcField   = fields.find { it.startsWith("FC:") }
        val fwField   = fields.find { it.startsWith("FW") }

        // SOC ist das Feld direkt nach FC:
        val fcIndex = fields.indexOfFirst { it.startsWith("FC:") }
        val soc     = if (fcIndex != -1 && fcIndex + 1 < fields.size)
            fields[fcIndex + 1].toFloatOrNull() ?: return null
        else return null

        val current   = aField?.substring(2)?.toFloatOrNull()  ?: 0f
        val remaining = rcField?.substring(3)?.toFloatOrNull() ?: 0f
        val full      = fcField?.substring(3)?.toFloatOrNull() ?: 0f
        val firmware  = fwField ?: ""

        Log.d(TAG, "SOC=$soc Voltage=$voltage Current=$current")

        return """{"soc":${"%.1f".format(java.util.Locale.US, soc)},"voltage":${"%.2f".format(java.util.Locale.US, voltage)},"current":${"%.2f".format(java.util.Locale.US, current)},"remaining":${"%.2f".format(java.util.Locale.US, remaining)},"full":${"%.2f".format(java.util.Locale.US, full)},"firmware":"$firmware"}"""
    }
}