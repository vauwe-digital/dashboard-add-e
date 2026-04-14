// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-add-e.git

// store.js — Gerätespeicherung und Fahrtdaten

const KEY_DEVICE = 'adde_device_id';
const KEY_TOTAL  = 'adde_total_km';
const KEY_LANG   = 'adde_lang';
const KEY_THEME  = 'adde_theme';

export function saveDevice(id)   { localStorage.setItem(KEY_DEVICE, id); }
export function loadDevice()     { return localStorage.getItem(KEY_DEVICE); }
export function clearDevice()    { localStorage.removeItem(KEY_DEVICE); }

export function saveTotalKm(km)  { localStorage.setItem(KEY_TOTAL, km.toFixed(3)); }
export function loadTotalKm()    { return parseFloat(localStorage.getItem(KEY_TOTAL) || '0'); }

export function saveLang(lang)   { localStorage.setItem(KEY_LANG, lang); }
export function loadLang()       { return localStorage.getItem(KEY_LANG) || 'de'; }

export function saveTheme(name)  { localStorage.setItem(KEY_THEME, name); }
export function loadTheme()      { return localStorage.getItem(KEY_THEME) || 'teal'; }
