// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-adde.git

// ble.js — BLE-Verbindung zum ADD-E Akku (Nordic UART Service)

import { saveDevice, loadDevice } from './store.js';

// Nordic UART Service UUIDs
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify (Gerät → App)

let deviceId    = null;
let _onData     = null;
let _onStatus   = null;
let reconnecting = false;

/**
 * Manueller Scan: zeigt Geräteliste an, Nutzer wählt ADD-E
 * onData({ soc, voltage, remaining })
 * onStatus('scanning' | 'connected' | 'disconnected' | 'error')
 */
export async function scanAndConnect(onData, onStatus) {
  _onData   = onData;
  _onStatus = onStatus;

  try {
    await BleClient.initialize();
    onStatus('scanning');

    const device = await BleClient.requestDevice({
      services: [NUS_SERVICE],
      optionalServices: []
    });

    deviceId = device.deviceId;
    saveDevice(deviceId);
    await doConnect();
  } catch (err) {
    console.error('BLE Scan-Fehler:', err);
    onStatus('error');
  }
}

/**
 * Automatischer Reconnect beim App-Start mit gespeichertem Gerät
 * Gibt true zurück wenn erfolgreich
 */
export async function autoReconnect(onData, onStatus) {
  const saved = loadDevice();
  if (!saved) return false;

  _onData   = onData;
  _onStatus = onStatus;
  deviceId  = saved;

  try {
    await BleClient.initialize();
    onStatus('scanning');
    await doConnect();
    return true;
  } catch (err) {
    console.warn('Auto-Reconnect fehlgeschlagen:', err.message);
    onStatus('disconnected');
    return false;
  }
}

export async function disconnect() {
  reconnecting = false;
  if (deviceId) {
    try { await BleClient.disconnect(deviceId); } catch {}
  }
  _onStatus && _onStatus('disconnected');
}

// ─── Intern ─────────────────────────────────────────────────────────────────

async function doConnect() {
  await BleClient.connect(deviceId, () => handleDisconnect());

  await BleClient.startNotifications(
    deviceId, NUS_SERVICE, NUS_TX_CHAR,
    (value) => {
      const raw    = new TextDecoder().decode(value);
      const parsed = parsePacket(raw);
      if (parsed && _onData) _onData(parsed);
    }
  );

  reconnecting = false;
  _onStatus && _onStatus('connected');
}

async function handleDisconnect() {
  if (reconnecting) return;
  reconnecting = true;
  _onStatus && _onStatus('disconnected');

  // 3 Versuche mit wachsender Wartezeit: 1s, 2s, 3s
  for (let i = 1; i <= 3; i++) {
    await delay(1000 * i);
    if (!reconnecting) return;          // manuell getrennt → abbrechen
    _onStatus && _onStatus('scanning');
    try {
      await doConnect();
      return;
    } catch {
      console.warn(`Reconnect Versuch ${i} fehlgeschlagen`);
    }
  }

  reconnecting = false;
  _onStatus && _onStatus('disconnected');
}

const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * Parst ein ADD-E Paket:
 * <P|300|24.81|4.13(0)|4.14(0)|...|A:0.01|RC:11.77|FC:12.06|98.0|AT1|FW115|0|0>
 *
 * Gibt zurück: { soc, voltage, current, remaining, full, firmware }
 */
export function parsePacket(raw) {
  const match = raw.match(/<(.+?)>/);
  if (!match) return null;

  const fields = match[1].split('|');
  if (fields[0] !== 'P' || fields.length < 10) return null;

  const soc      = parseFloat(fields[9]);           // Ladezustand in %
  const voltage  = parseFloat(fields[2]);           // Gesamtspannung in V

  const aField   = fields.find(f => f.startsWith('A:'));
  const rcField  = fields.find(f => f.startsWith('RC:'));
  const fcField  = fields.find(f => f.startsWith('FC:'));
  const fwField  = fields.find(f => f.startsWith('FW'));

  return {
    soc:       isNaN(soc)     ? null : soc,
    voltage:   isNaN(voltage) ? null : voltage,
    current:   aField  ? parseFloat(aField.slice(2))  : null,  // A
    remaining: rcField ? parseFloat(rcField.slice(3)) : null,  // Ah
    full:      fcField ? parseFloat(fcField.slice(3)) : null,  // Ah
    firmware:  fwField ? fwField : null
  };
}
