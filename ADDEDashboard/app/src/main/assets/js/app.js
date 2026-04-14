// ADD-E Dashboard
// Copyright (c) 2026 vauwe-digital / softopus
// Licensed under GNU General Public License v3.0
// https://github.com/vauwe-digital/dashboard-add-e.git

// ── Texte DE / EN ────────────────────────────────────────────────────────────
const LABELS = {
    de: {
        spd:'Geschwindigkeit', dist:'Distanz', cad:'Trittfrequenz', time:'Fahrzeit',
        avgspd:'Ø Geschwindigkeit', totalkm:'Gesamtkilometer', maxspd:'Geschw.-Maximum',
        clock:'Uhrzeit', bat:'Akku', bat2:'Akku',
        voltage:'Spannung', current:'Strom', remaining:'Verbleibend',
        conn:'Verbunden', disc:'Getrennt', scan:'Suche…',
        btnConn:'Verbinden', btnDisc:'Verbindung trennen',
        noPermission:'Berechtigung fehlt',
        live:'▶ Live', stats:'∑ Stats', hist:'≡ Verlauf',
        today:'Heute', noData:'Keine Fahrten',
        rides:'Fahrten', distance:'Distanz', duration:'Fahrzeit',
        avgSpd:'Ø Geschw.', maxSpd:'Max Geschw.', battery:'Akku',
        simBtn:'⚙ Testdaten erstellen',
        simTitle:'Testdaten erstellen',
        simText:'Fahrten 01.01.2025 – heute werden generiert. Vorhandene Daten werden überschrieben.',
        simOk:'Erstellen', simCancel:'Abbrechen',
        clearTitle:'Daten löschen',
        clearText:'Alle Fahrtdaten werden unwiderruflich gelöscht.',
        clearOk:'Löschen', clearCancel:'Abbrechen',
        saved:'Fahrten gespeichert'
    },
    en: {
        spd:'Speed', dist:'Distance', cad:'Cadence', time:'Ride Time',
        avgspd:'Avg Speed', totalkm:'Total Distance', maxspd:'Max Speed',
        clock:'Time', bat:'Battery', bat2:'Battery',
        voltage:'Voltage', current:'Current', remaining:'Remaining',
        conn:'Connected', disc:'Disconnected', scan:'Scanning…',
        btnConn:'Connect', btnDisc:'Disconnect',
        noPermission:'Permission denied',
        live:'▶ Live', stats:'∑ Stats', hist:'≡ History',
        today:'Today', noData:'No rides',
        rides:'Rides', distance:'Distance', duration:'Duration',
        avgSpd:'Avg Speed', maxSpd:'Max Speed', battery:'Battery',
        simBtn:'⚙ Create test data',
        simTitle:'Create test data',
        simText:'Rides from 01.01.2025 to today will be generated. Existing data will be overwritten.',
        simOk:'Create', simCancel:'Cancel',
        clearTitle:'Delete data',
        clearText:'All ride data will be permanently deleted.',
        clearOk:'Delete', clearCancel:'Cancel',
        saved:'rides saved'
    }
};

function getLang() { return localStorage.getItem('adde_lang') || 'de'; }

function applyLabels() {
    const L = LABELS[getLang()];
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set('l-spd', L.spd); set('l-dist', L.dist); set('l-cad', L.cad); set('l-time', L.time);
    set('l-avgspd', L.avgspd); set('l-totalkm', L.totalkm); set('l-maxspd', L.maxspd);
    set('l-clock', L.clock); set('l-bat', L.bat); set('l-bat2', L.bat2);
    set('l-voltage', L.voltage); set('l-current', L.current); set('l-remaining', L.remaining);
    set('nb-live', L.live); set('nb-stats', L.stats); set('nb-hist', L.hist);
    set('hnav-today', L.today);
    const dbtn = document.getElementById('dbtn');
    if (dbtn) dbtn.textContent = dbtn.dataset.status === 'connected' ? L.btnDisc : L.btnConn;
    const lbtn = document.getElementById('lbtn');
    if (lbtn) lbtn.textContent = getLang() === 'de' ? 'EN' : 'DE';
    renderHistContent();
}

window.toggleLang = function() {
    localStorage.setItem('adde_lang', getLang() === 'de' ? 'en' : 'de');
    applyLabels();
};

// ── GPS ───────────────────────────────────────────────────────────────────────
window.updateGps = function(data) {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('v-spd',  d.speed.toFixed(1));
    set('v-dist', d.distance.toFixed(2));
    set('v-totalkm', d.distance.toFixed(1));
    const max = parseFloat(localStorage.getItem('adde_maxspd') || '0');
    if (d.speed > max) {
        localStorage.setItem('adde_maxspd', d.speed);
        set('v-maxspd', d.speed.toFixed(1));
    }
    if (d.speed > 0 && !window._rideTimer) startRideTimer();
    if (d.speed === 0 && window._rideTimer) stopRideTimer();
};

// ── BLE ───────────────────────────────────────────────────────────────────────
window.updateBle = function(data) {
    const L = LABELS[getLang()];
    const dbtn = document.getElementById('dbtn');
    const dot  = document.getElementById('dot');
    const stxt = document.getElementById('stxt');
    if (dbtn) { dbtn.dataset.status = 'connected'; dbtn.textContent = L.btnDisc; }
    if (dot)  dot.className = 'dot';
    if (stxt) stxt.textContent = L.conn;
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    if (d.soc != null) {
        const soc   = Math.round(d.soc);
        const color = soc < 20 ? '#E24B4A' : 'var(--accent)';
        ['v-bat','v-bat2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = soc; });
        const bbar = document.getElementById('bbar');
        if (bbar) { bbar.style.width = soc + '%'; bbar.style.background = color; }
        window._currentBat = soc;
    }
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    if (d.voltage   != null) setEl('v-voltage',   d.voltage.toFixed(2));
    if (d.current   != null) setEl('v-current',   d.current.toFixed(2));
    if (d.remaining != null) setEl('v-remaining', d.remaining.toFixed(2));
};

window.onPermissionDenied = function() {
    const el = document.getElementById('stxt');
    if (el) el.textContent = LABELS[getLang()].noPermission;
};

// ── Verbinden ─────────────────────────────────────────────────────────────────
window.onBtnConnect = function() {
    const L    = LABELS[getLang()];
    const dbtn = document.getElementById('dbtn');
    const dot  = document.getElementById('dot');
    const stxt = document.getElementById('stxt');
    if (typeof NativeBridge !== 'undefined') {
        if (dbtn.dataset.status === 'connected') {
            NativeBridge.stopBle();
            dbtn.dataset.status = 'disconnected';
            dbtn.textContent    = L.btnConn;
            dot.className       = 'dot dis';
            stxt.textContent    = L.disc;
        } else {
            NativeBridge.startBle();
            dot.className    = 'dot scan';
            stxt.textContent = L.scan;
        }
    }
};

// ── Navigation ────────────────────────────────────────────────────────────────
window.showScr = function(name, btn) {
    ['live','stats','hist'].forEach(n => {
        document.getElementById('scr-' + n).style.display = n === name ? 'block' : 'none';
    });
    document.querySelectorAll('.nbtn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    if (name === 'hist') renderHistContent();
};

// ── Fahrtimer ────────────────────────────────────────────────────────────────
let _rideSeconds = 0;
window._rideTimer = null;
window._rideStartBat = null;

function startRideTimer() {
    if (window._rideStartBat == null) window._rideStartBat = window._currentBat || null;
    window._rideTimer = setInterval(() => {
        _rideSeconds++;
        const el = document.getElementById('v-time');
        if (el) el.textContent = fmtTime(_rideSeconds);
    }, 1000);
}

function stopRideTimer() {
    clearInterval(window._rideTimer);
    window._rideTimer = null;
}

function fmtTime(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h > 0 ? String(h).padStart(2,'0') + ':' : '')
        + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
}

function fmtDuration(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Uhrzeit ───────────────────────────────────────────────────────────────────
function updateClock() {
    const n = new Date();
    const el = document.getElementById('v-clock');
    if (el) el.textContent =
        String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
}
updateClock();
setInterval(updateClock, 1000);

// ── Farbthemen ────────────────────────────────────────────────────────────────
const THEMES = {
    teal:  { a:'#1D9E75', bg:'#E1F5EE', mid:'#9FE1CB', tx:'#085041' },
    amber: { a:'#EF9F27', bg:'#FAEEDA', mid:'#FAC775', tx:'#633806' },
    coral: { a:'#D85A30', bg:'#FAECE7', mid:'#F5C4B3', tx:'#4A1B0C' }
};

function applyTheme(name) {
    const th = THEMES[name] || THEMES.teal;
    const r  = document.documentElement;
    r.style.setProperty('--accent',      th.a);
    r.style.setProperty('--accent-bg',   th.bg);
    r.style.setProperty('--accent-mid',  th.mid);
    r.style.setProperty('--accent-text', th.tx);
    document.body.style.background = th.bg;
    localStorage.setItem('adde_theme', name);
    document.querySelectorAll('.tbtn').forEach(b => b.classList.toggle('on', b.dataset.theme === name));
}
window.setTheme = function(name) { applyTheme(name); };

// ── Dialog-Hilfsfunktion ──────────────────────────────────────────────────────
function showDialog(title, text, okLabel, okColor, cancelLabel, onOk) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.5);z-index:999;display:flex;' +
        'align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:24px;
                    margin:20px;max-width:320px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#111;">${title}</div>
            <div style="font-size:13px;color:#666;margin-bottom:20px;line-height:1.5;">${text}</div>
            <div style="display:flex;gap:10px;">
                <button id="dlg-cancel" style="flex:1;padding:10px;border-radius:8px;
                    border:1px solid #ccc;background:#f5f5f5;font-size:14px;
                    cursor:pointer;font-family:inherit;color:#333;">${cancelLabel}</button>
                <button id="dlg-ok" style="flex:1;padding:10px;border-radius:8px;
                    border:none;background:${okColor};color:#fff;font-size:14px;
                    font-weight:600;cursor:pointer;font-family:inherit;">${okLabel}</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('dlg-cancel').onclick = () => document.body.removeChild(overlay);
    document.getElementById('dlg-ok').onclick = () => {
        document.body.removeChild(overlay);
        onOk();
    };
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
        'background:#1D9E75;color:#fff;padding:10px 20px;border-radius:20px;' +
        'font-size:13px;font-weight:600;z-index:999;white-space:nowrap;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

// ── Fahrtdaten ────────────────────────────────────────────────────────────────
function getRides() {
    try { return JSON.parse(localStorage.getItem('adde_rides') || '[]'); } catch { return []; }
}

// ── Simulation ────────────────────────────────────────────────────────────────
window.histSimulate = function() {
    const L = LABELS[getLang()];
    showDialog(L.simTitle, L.simText, L.simOk, '#1D9E75', L.simCancel, runSimulation);
};

function runSimulation() {
    const L = LABELS[getLang()];
    function rnd(min, max) { return Math.random() * (max - min) + min; }
    function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }

    const rides = [];
    const d     = new Date('2025-01-01');
    const end   = new Date('2026-04-11');
    let bat = 100, count = 0;
    const probs = [0.20,0.25,0.40,0.55,0.70,0.80,0.85,0.80,0.70,0.55,0.30,0.20];

    while (d <= end) {
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
        const prob      = probs[d.getMonth()] * (isWeekend ? 1.4 : 1.0);
        if (Math.random() < Math.min(prob, 0.95)) {
            const distKm   = parseFloat(rnd(isWeekend ? 8 : 3, isWeekend ? 35 : 18).toFixed(2));
            const avgSpd   = parseFloat(rnd(16, 26).toFixed(1));
            const maxSpd   = parseFloat((avgSpd + rnd(4, 10)).toFixed(1));
            const durSec   = Math.round((distKm / avgSpd) * 3600);
            const batStart = bat;
            bat = Math.max(10, bat - Math.round(distKm * rnd(0.6, 1.2)));
            if (bat < 30 && Math.random() < 0.8) bat = rndInt(85, 100);
            const hour = isWeekend ? rndInt(8,16) : rndInt(7,18);
            const min  = rndInt(0,59);
            rides.push({
                id:           d.getTime() + count,
                date:         d.toISOString().slice(0,10),
                startTime:    String(hour).padStart(2,'0')+':'+String(min).padStart(2,'0'),
                duration:     durSec,
                distance:     distKm,
                avgSpeed:     avgSpd,
                maxSpeed:     maxSpd,
                batteryStart: batStart,
                batteryEnd:   bat
            });
            count++;
        }
        d.setDate(d.getDate() + 1);
    }

    localStorage.setItem('adde_rides', JSON.stringify(rides));
    renderHistContent();
    showToast(rides.length + ' ' + L.saved);
}

// ── Daten löschen ─────────────────────────────────────────────────────────────
window.histClear = function() {
    const L = LABELS[getLang()];
    showDialog(L.clearTitle, L.clearText, L.clearOk, '#E24B4A', L.clearCancel, () => {
        localStorage.removeItem('adde_rides');
        renderHistContent();
    });
};

// ── Verlauf: Tab-Logik ────────────────────────────────────────────────────────
let _histTab  = 't';
let _histDate = new Date();

window.setHistTab = function(tab, btn) {
    _histTab  = tab;
    _histDate = new Date();
    document.querySelectorAll('.htab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const nav = document.getElementById('hist-nav');
    if (nav) nav.style.display = tab === 'g' ? 'none' : 'flex';
    updateHistNav();
    renderHistContent();
};

window.histNavPrev = function() {
    if      (_histTab === 't') _histDate.setDate(_histDate.getDate() - 1);
    else if (_histTab === 'w') _histDate.setDate(_histDate.getDate() - 7);
    else if (_histTab === 'm') _histDate.setMonth(_histDate.getMonth() - 1);
    else if (_histTab === 'j') _histDate.setFullYear(_histDate.getFullYear() - 1);
    updateHistNav(); renderHistContent();
};

window.histNavNext = function() {
    if      (_histTab === 't') _histDate.setDate(_histDate.getDate() + 1);
    else if (_histTab === 'w') _histDate.setDate(_histDate.getDate() + 7);
    else if (_histTab === 'm') _histDate.setMonth(_histDate.getMonth() + 1);
    else if (_histTab === 'j') _histDate.setFullYear(_histDate.getFullYear() + 1);
    updateHistNav(); renderHistContent();
};

window.histNavToday = function() {
    _histDate = new Date();
    updateHistNav(); renderHistContent();
};

function getMonday(d) {
    const dt = new Date(d), day = dt.getDay() || 7;
    dt.setDate(dt.getDate() - day + 1);
    return dt;
}

function updateHistNav() {
    const lbl = document.getElementById('hnav-label');
    if (!lbl) return;
    const days = getLang() === 'de'
        ? ['So','Mo','Di','Mi','Do','Fr','Sa']
        : ['Su','Mo','Tu','We','Th','Fr','Sa'];
    if      (_histTab === 't') lbl.textContent = _histDate.toISOString().slice(0,10);
    else if (_histTab === 'w') {
        const mon = getMonday(_histDate);
        lbl.textContent = days[mon.getDay()] + ', ' + mon.toISOString().slice(0,10);
    }
    else if (_histTab === 'm') lbl.textContent = _histDate.toISOString().slice(0,7);
    else if (_histTab === 'j') lbl.textContent = String(_histDate.getFullYear());
}

// ── Verlauf: Inhalt rendern ───────────────────────────────────────────────────
function renderHistContent() {
    const el = document.getElementById('hist-content');
    if (!el) return;
    const L     = LABELS[getLang()];
    const rides = getRides();
    let filtered = [];

    if (_histTab === 't') {
        filtered = rides.filter(r => r.date === _histDate.toISOString().slice(0,10));
        el.innerHTML = filtered.length === 0
            ? emptyHtml(L) : filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'w') {
        const mon = getMonday(new Date(_histDate));
        const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
        filtered = rides.filter(r => r.date >= mon.toISOString().slice(0,10)
                                  && r.date <= sun.toISOString().slice(0,10));
        el.innerHTML = filtered.length === 0
            ? emptyHtml(L) : aggCard(filtered, L) + filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'm') {
        filtered = rides.filter(r => r.date.slice(0,7) === _histDate.toISOString().slice(0,7));
        el.innerHTML = filtered.length === 0
            ? emptyHtml(L) : aggCard(filtered, L) + filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'j') {
        filtered = rides.filter(r => r.date.slice(0,4) === String(_histDate.getFullYear()));
        el.innerHTML = filtered.length === 0
            ? emptyHtml(L) : aggCard(filtered, L) + filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'g') {
        el.innerHTML = rides.length === 0
            ? emptyHtml(L) : aggCard(rides, L);
    }
}

function emptyHtml(L) {
    return `
    <div style="text-align:center;padding:24px 0;color:#aaa;font-size:13px;">${L.noData}</div>
    <div style="text-align:center;margin-top:4px;">
      <button onclick="histSimulate()" style="font-size:12px;padding:8px 16px;
        border-radius:8px;border:1px solid #ccc;background:#f5f5f5;
        color:#555;cursor:pointer;font-family:inherit;">${L.simBtn}</button>
    </div>`;
}

function rideCard(r, L) {
    const bat = (r.batteryStart != null && r.batteryEnd != null)
        ? `${r.batteryStart}%→${r.batteryEnd}%` : '--';
    return `
    <div class="hist-row">
      <div class="hist-row-hdr">
        <div class="hist-row-date">${r.date} ${r.startTime||''}</div>
        <div class="hist-row-dist">${r.distance.toFixed(1)} km</div>
      </div>
      <div class="hist-row-stats">
        <div class="hist-stat"><b>${fmtDuration(r.duration)}</b>${L.duration}</div>
        <div class="hist-stat"><b>${r.avgSpeed.toFixed(1)} km/h</b>${L.avgSpd}</div>
        <div class="hist-stat"><b>${r.maxSpeed.toFixed(1)} km/h</b>${L.maxSpd}</div>
        <div class="hist-stat"><b>${bat}</b>${L.battery}</div>
      </div>
    </div>`;
}

function aggCard(rides, L) {
    const totalKm  = rides.reduce((s,r) => s + r.distance, 0);
    const totalSec = rides.reduce((s,r) => s + r.duration, 0);
    const avgSpd   = rides.reduce((s,r) => s + r.avgSpeed, 0) / rides.length;
    const maxSpd   = Math.max(...rides.map(r => r.maxSpeed));
    return `
    <div class="hist-agg" style="margin-bottom:10px;">
      <div class="hist-agg-grid">
        <div class="hist-agg-item">
          <div class="hist-agg-val">${rides.length}</div>
          <div class="hist-agg-lbl">${L.rides}</div>
        </div>
        <div class="hist-agg-item">
          <div class="hist-agg-val">${totalKm.toFixed(1)}</div>
          <div class="hist-agg-lbl">${L.distance} km</div>
        </div>
        <div class="hist-agg-item">
          <div class="hist-agg-val">${fmtDuration(totalSec)}</div>
          <div class="hist-agg-lbl">${L.duration}</div>
        </div>
        <div class="hist-agg-item">
          <div class="hist-agg-val">${avgSpd.toFixed(1)}</div>
          <div class="hist-agg-lbl">${L.avgSpd} km/h</div>
        </div>
        <div class="hist-agg-item" style="grid-column:1/-1;">
          <div class="hist-agg-val">${maxSpd.toFixed(1)}</div>
          <div class="hist-agg-lbl">${L.maxSpd} km/h</div>
        </div>
      </div>
    </div>`;
}

// ── Verlauf: Aktionen ────────────────────────────────────────────────────────
window.histInfo = function() {
    const rides = getRides();
    const L = LABELS[getLang()];
    if (!rides.length) { showToast(L.noData); return; }
    const totalKm  = rides.reduce((s,r) => s + r.distance, 0);
    const totalSec = rides.reduce((s,r) => s + r.duration, 0);
    showDialog(
        '∑ ' + L.rides,
        `${L.rides}: <b>${rides.length}</b><br>
         ${L.distance}: <b>${totalKm.toFixed(1)} km</b><br>
         ${L.duration}: <b>${fmtDuration(totalSec)}</b>`,
        'OK', '#1D9E75', '', () => {}
    );
};

window.histExport = function() {
    const L = LABELS[getLang()];
    const allRides = getRides();
    if (!allRides.length) { showToast(L.noData); return; }

    // Gefilterte Fahrten je nach aktivem Tab
    let rides = [];
    let label = '';

    if (_histTab === 't') {
        const day = _histDate.toISOString().slice(0,10);
        rides = allRides.filter(r => r.date === day);
        label = day;
    } else if (_histTab === 'w') {
        const mon = getMonday(new Date(_histDate));
        const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
        rides = allRides.filter(r => r.date >= mon.toISOString().slice(0,10)
                                  && r.date <= sun.toISOString().slice(0,10));
        label = 'KW_' + mon.toISOString().slice(0,10);
    } else if (_histTab === 'm') {
        const ym = _histDate.toISOString().slice(0,7);
        rides = allRides.filter(r => r.date.slice(0,7) === ym);
        label = ym;
    } else if (_histTab === 'j') {
        const yr = String(_histDate.getFullYear());
        rides = allRides.filter(r => r.date.slice(0,4) === yr);
        label = yr;
    } else if (_histTab === 'g') {
        rides = allRides;
        label = 'Gesamt';
    }

    if (!rides.length) { showToast(L.noData); return; }

    const csv = ['Datum,Uhrzeit,Distanz km,Fahrzeit s,Ø km/h,Max km/h,Akku Start%,Akku Ende%']
        .concat(rides.map(r =>
            `${r.date},${r.startTime||''},${r.distance},${r.duration},` +
            `${r.avgSpeed},${r.maxSpeed},${r.batteryStart||''},${r.batteryEnd||''}`
        )).join('\n');

    localStorage.setItem('adde_csv_export', csv);
    localStorage.setItem('adde_csv_label', label);
    showToast('Exportiere ' + rides.length + ' Fahrten (' + label + ')...');

    if (typeof NativeBridge !== 'undefined') {
        NativeBridge.exportCsv('ready');
    }
};

window.histReport = function() {
    histClear();
};

// ── Init ─────────────────────────────────────────────────────────────────────
localStorage.setItem('adde_lang', 'de');
applyTheme(localStorage.getItem('adde_theme') || 'teal');
updateHistNav();
applyLabels();
