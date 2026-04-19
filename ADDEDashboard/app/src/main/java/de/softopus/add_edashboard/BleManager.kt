// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-add-e.git

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
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.UUID

class BleManager(
    private val activity: Activity,
    private val onData: (String) -> Unit,
    private val onCadence: ((Int) -> Unit)? = null,
    private val onCscStatus: ((String) -> Unit)? = null
) {
    private val TAG = "BleManager"

    private val bluetoothManager =
        activity.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter = bluetoothManager.adapter
    private var gatt: BluetoothGatt?    = null
    private var gattCsc: BluetoothGatt? = null

    private val buffer  = StringBuilder()
    private val handler = Handler(Looper.getMainLooper())
    private var parseJob: Runnable?      = null
    private var cadenceResetJob: Runnable? = null

    // ── ADD-E Akku: Nordic UART Service ──────────────────────────────────────
    private val NUS_SERVICE = UUID.fromString("6e400001-b5a3-f393-e0a9-e50e24dcca9e")
    private val NUS_TX      = UUID.fromString("6e400003-b5a3-f393-e0a9-e50e24dcca9e")
    private val CCCD        = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    // ── CSC Cadence Sensor: Bluetooth SIG Standard ───────────────────────────
    private val CSC_SERVICE = UUID.fromString("00001816-0000-1000-8000-00805f9b34fb")
    private val CSC_CHAR    = UUID.fromString("00002a5b-0000-1000-8000-00805f9b34fb")

    private var lastCrankRevs = -1
    private var lastCrankTime = -1

    // ── Scan-Einstellungen: niedrige Latenz für schnelle Erkennung ────────────
    private val scanSettings = ScanSettings.Builder()
        .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
        .build()

    // ── Scan ADD-E ────────────────────────────────────────────────────────────

    fun scan() {
        Log.d(TAG, "Starte BLE-Scan (ADD-E)...")
        bluetoothAdapter.bluetoothLeScanner.startScan(null, scanSettings, scanCallback)
        handler.postDelayed({
            bluetoothAdapter.bluetoothLeScanner.stopScan(scanCallback)
            if (gatt == null) Log.d(TAG, "ADD-E Scan Timeout")
        }, 30000)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val name = result.device.name ?: return
            Log.d(TAG, "Gefunden: '$name' RSSI:${result.rssi}")
            if (name.contains("add-e", ignoreCase = true) ||
                name.contains("adde",  ignoreCase = true)) {
                bluetoothAdapter.bluetoothLeScanner.stopScan(this)
                connect(result.device)
            }
        }
        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "ADD-E Scan fehlgeschlagen: $errorCode")
        }
    }

    // ── Scan CSC ──────────────────────────────────────────────────────────────

    fun scanCsc() {
        Log.d(TAG, "Starte BLE-Scan (CSC)...")
        bluetoothAdapter.bluetoothLeScanner.startScan(null, scanSettings, scanCscCallback)
        handler.postDelayed({
            bluetoothAdapter.bluetoothLeScanner.stopScan(scanCscCallback)
            if (gattCsc == null) {
                Log.d(TAG, "CSC Scan Timeout")
                onCscStatus?.invoke("timeout")
            }
        }, 30000)
    }

    private val scanCscCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val uuids = result.scanRecord?.serviceUuids ?: return
            if (uuids.any { it.uuid == CSC_SERVICE }) {
                Log.d(TAG, "CSC Sensor gefunden: ${result.device.name}")
                bluetoothAdapter.bluetoothLeScanner.stopScan(this)
                connectCsc(result.device)
            }
        }
        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "CSC Scan fehlgeschlagen: $errorCode")
            onCscStatus?.invoke("timeout")
        }
    }

    // ── ADD-E Verbinden ───────────────────────────────────────────────────────

    private fun connect(device: BluetoothDevice) {
        Log.d(TAG, "Verbinde ADD-E: ${device.name}")
        gatt = device.connectGatt(activity, false, gattCallback)
    }

    private val gattCallback = object : BluetoothGattCallback() {

        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when {
                newState == BluetoothProfile.STATE_CONNECTED -> {
                    Log.d(TAG, "ADD-E verbunden — MTU anfordern")
                    g.requestMtu(512)
                }
                status != BluetoothGatt.GATT_SUCCESS -> {
                    // Fehlschlag beim ersten Versuch — GATT schließen und retry
                    Log.w(TAG, "GATT Fehler status=$status — retry in 500ms")
                    g.close()
                    gatt = null
                    handler.postDelayed({ connect(g.device) }, 500)
                }
                else -> {
                    Log.d(TAG, "ADD-E getrennt")
                    buffer.clear()
                    parseJob?.let { handler.removeCallbacks(it) }
                    gatt?.close()
                    gatt = null
                }
            }
        }

        override fun onMtuChanged(g: BluetoothGatt, mtu: Int, status: Int) {
            Log.d(TAG, "MTU: $mtu")
            g.discoverServices()
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) return
            val ch = g.getService(NUS_SERVICE)?.getCharacteristic(NUS_TX) ?: return
            g.setCharacteristicNotification(ch, true)
            handler.postDelayed({
                val desc = ch.getDescriptor(CCCD) ?: return@postDelayed
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    g.writeDescriptor(desc, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                } else {
                    @Suppress("DEPRECATION")
                    desc.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    @Suppress("DEPRECATION")
                    g.writeDescriptor(desc)
                }
                Log.d(TAG, "ADD-E Notifications aktiviert")
            }, 500)
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(
            g: BluetoothGatt, ch: BluetoothGattCharacteristic
        ) { processChunk(ch.value.toString(Charsets.UTF_8)) }

        override fun onCharacteristicChanged(
            g: BluetoothGatt, ch: BluetoothGattCharacteristic, value: ByteArray
        ) { processChunk(value.toString(Charsets.UTF_8)) }
    }

    // ── CSC Verbinden ─────────────────────────────────────────────────────────

    private fun connectCsc(device: BluetoothDevice) {
        Log.d(TAG, "Verbinde CSC: ${device.name}")
        gattCsc = device.connectGatt(activity, false, gattCscCallback)
    }

    private val gattCscCallback = object : BluetoothGattCallback() {

        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    Log.d(TAG, "CSC verbunden")
                    g.discoverServices()
                    handler.post { onCscStatus?.invoke("connected") }
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    Log.d(TAG, "CSC getrennt")
                    gattCsc = null
                    lastCrankRevs = -1
                    lastCrankTime = -1
                    cadenceResetJob?.let { handler.removeCallbacks(it) }
                    handler.post { onCscStatus?.invoke("disconnected") }
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) return
            val ch = g.getService(CSC_SERVICE)?.getCharacteristic(CSC_CHAR) ?: run {
                Log.e(TAG, "CSC Characteristic nicht gefunden"); return
            }
            g.setCharacteristicNotification(ch, true)
            handler.postDelayed({
                val desc = ch.getDescriptor(CCCD) ?: return@postDelayed
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    g.writeDescriptor(desc, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                } else {
                    @Suppress("DEPRECATION")
                    desc.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    @Suppress("DEPRECATION")
                    g.writeDescriptor(desc)
                }
                Log.d(TAG, "CSC Notifications aktiviert")
            }, 500)
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(
            g: BluetoothGatt, ch: BluetoothGattCharacteristic
        ) { parseCscPacket(ch.value) }

        override fun onCharacteristicChanged(
            g: BluetoothGatt, ch: BluetoothGattCharacteristic, value: ByteArray
        ) { parseCscPacket(value) }
    }

    // ── ADD-E Protokoll-Parser ────────────────────────────────────────────────

    private fun processChunk(chunk: String) {
        synchronized(buffer) { buffer.append(chunk) }
        parseJob?.let { handler.removeCallbacks(it) }
        parseJob = Runnable {
            val collected = synchronized(buffer) { val s = buffer.toString(); buffer.clear(); s }
            val pattern   = Regex("<P\\|[^<]+")
            pattern.findAll(collected).toList().lastOrNull()?.value
                ?.let { parsePacket(it)?.let { json -> onData(json) } }
        }
        handler.postDelayed(parseJob!!, 2000)
    }

    private fun parsePacket(raw: String): String? {
        val fields  = raw.removePrefix("<").removeSuffix(">").trim().split("|")
        if (fields[0] != "P" || fields.size < 13) return null
        val voltage   = fields[2].toFloatOrNull() ?: 0f
        val aField    = fields.find { it.startsWith("A:") }
        val rcField   = fields.find { it.startsWith("RC:") }
        val fcField   = fields.find { it.startsWith("FC:") }
        val fwField   = fields.find { it.startsWith("FW") }
        val fcIndex   = fields.indexOfFirst { it.startsWith("FC:") }
        val soc       = if (fcIndex != -1 && fcIndex + 1 < fields.size)
            fields[fcIndex + 1].toFloatOrNull() ?: return null
        else return null
        val current   = aField?.substring(2)?.toFloatOrNull()  ?: 0f
        val remaining = rcField?.substring(3)?.toFloatOrNull() ?: 0f
        val full      = fcField?.substring(3)?.toFloatOrNull() ?: 0f
        val firmware  = fwField ?: ""
        return """{"soc":${"%.1f".format(java.util.Locale.US, soc)},"voltage":${"%.2f".format(java.util.Locale.US, voltage)},"current":${"%.2f".format(java.util.Locale.US, current)},"remaining":${"%.2f".format(java.util.Locale.US, remaining)},"full":${"%.2f".format(java.util.Locale.US, full)},"firmware":"$firmware"}"""
    }

    // ── CSC Protokoll-Parser ──────────────────────────────────────────────────
    // Bluetooth SIG CSC Measurement (0x2A5B):
    // Byte 0: Flags (Bit 1 = Crank data vorhanden)
    // Byte 1+2: Cumulative Crank Revolutions (uint16)
    // Byte 3+4: Last Crank Event Time (uint16, 1/1024 Sek.)

    private fun parseCscPacket(value: ByteArray) {
        if (value.size < 5) return
        if (value[0].toInt() and 0xFF and 0x02 == 0) return

        val crankRevs = (value[1].toInt() and 0xFF) or ((value[2].toInt() and 0xFF) shl 8)
        val crankTime = (value[3].toInt() and 0xFF) or ((value[4].toInt() and 0xFF) shl 8)

        if (lastCrankRevs >= 0 && lastCrankTime >= 0) {
            val revDiff  = (crankRevs - lastCrankRevs + 65536) % 65536
            val timeDiff = (crankTime - lastCrankTime + 65536) % 65536
            if (timeDiff > 0 && revDiff > 0) {
                val rpm = (revDiff * 1024 * 60) / timeDiff
                Log.d(TAG, "Cadence: $rpm rpm")
                onCadence?.invoke(rpm)
            } else if (revDiff == 0) {
                // Keine Bewegung — sofort 0 senden
                Log.d(TAG, "Cadence: 0 rpm (Stillstand)")
                onCadence?.invoke(0)
            }
        }

        lastCrankRevs = crankRevs
        lastCrankTime = crankTime

        // Timer als Fallback
        cadenceResetJob?.let { handler.removeCallbacks(it) }
        cadenceResetJob = Runnable {
            Log.d(TAG, "Cadence Stillstand → 0 rpm")
            onCadence?.invoke(0)
        }
        handler.postDelayed(cadenceResetJob!!, 3000)
    }

    // ── Trennen ───────────────────────────────────────────────────────────────

    fun disconnect() {
        parseJob?.let { handler.removeCallbacks(it) }
        gatt?.disconnect()
        gatt?.close()
        gatt = null
        buffer.clear()
        Log.d(TAG, "ADD-E getrennt")
    }

    fun disconnectCsc() {
        cadenceResetJob?.let { handler.removeCallbacks(it) }
        gattCsc?.disconnect()
        gattCsc?.close()
        gattCsc = null
        lastCrankRevs = -1
        lastCrankTime = -1
        Log.d(TAG, "CSC getrennt")
    }
}