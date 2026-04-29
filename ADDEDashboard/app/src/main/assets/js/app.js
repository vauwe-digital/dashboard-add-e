// ── Texte DE / EN ────────────────────────────────────────────────────────────
const LABELS = {
    de: {
        spd:'Geschwindigkeit', dist:'Distanz', cad:'Trittfrequenz', time:'Fahrzeit',
        avgspd:'Ø Geschwindigkeit', totalkm:'Gesamtkilometer', maxspd:'Geschw.-Maximum',
        clock:'Uhrzeit', bat:'Akku', bat2:'Akku',
        voltage:'Spannung', current:'Strom', remaining:'Verbleibend',
        conn:'Verbunden', disc:'Getrennt', scan:'Suche…',
        btnConn:'Verbinden', btnDisc:'Verbindung trennen',
        btnCscConn:'Cadence verbinden', btnCscDisc:'Cadence trennen',
        noPermission:'Berechtigung fehlt',
        live:'▶ Live', stats:'∑ Stats', hist:'≡ Verlauf',
        today:'Heute', noData:'Keine Fahrten',
        rides:'Fahrten', distance:'Distanz', duration:'Fahrzeit',
        avgSpd:'Ø Geschw.', maxSpd:'Max Geschw.', battery:'Akku',
        avgCad:'Ø Trittf.',
        start:'Start', pause:'Pause', stop:'Stop', resume:'Weiter',
        stopTitle:'Fahrt beenden',
        stopText:'Fahrt wirklich beenden und speichern?',
        stopOk:'Ja', stopCancel:'Nein',
        stopMinDist:'Mindestdistanz 0.05 km nicht erreicht',
        statusSaved:'Fahrt gespeichert',
        simBtn:'⚙ Testdaten erstellen',
        simTitle:'Testdaten erstellen',
        simText:'Fahrten 01.01.2025 – heute werden generiert. Vorhandene Daten werden überschrieben.',
        simOk:'Erstellen', simCancel:'Abbrechen',
        clearTitle:'Daten löschen',
        clearText:'Alle Fahrtdaten werden unwiderruflich gelöscht.',
        clearOk:'Löschen', clearCancel:'Abbrechen',
        saved:'Fahrten gespeichert',
        importTitle:'CSV importieren',
        importText:'Die CSV-Datei wird mit vorhandenen Daten zusammengeführt. Duplikate werden übersprungen.',
        importOk:'Importieren', importCancel:'Abbrechen',
        btHint:'Bluetooth eingeschaltet?',
        cscNotFound:'Kein Cadence-Sensor gefunden',
        bleRetryHint:'BLE benötigt evtl. mehrere Versuche'
    },
    en: {
        spd:'Speed', dist:'Distance', cad:'Cadence', time:'Ride Time',
        avgspd:'Avg Speed', totalkm:'Total Distance', maxspd:'Max Speed',
        clock:'Time', bat:'Battery', bat2:'Battery',
        voltage:'Voltage', current:'Current', remaining:'Remaining',
        conn:'Connected', disc:'Disconnected', scan:'Scanning…',
        btnConn:'Connect', btnDisc:'Disconnect',
        btnCscConn:'Connect Cadence', btnCscDisc:'Disconnect Cadence',
        noPermission:'Permission denied',
        live:'▶ Live', stats:'∑ Stats', hist:'≡ History',
        today:'Today', noData:'No rides',
        rides:'Rides', distance:'Distance', duration:'Duration',
        avgSpd:'Avg Speed', maxSpd:'Max Speed', battery:'Battery',
        avgCad:'Avg Cadence',
        start:'Start', pause:'Pause', stop:'Stop', resume:'Resume',
        stopTitle:'End ride',
        stopText:'Really end and save this ride?',
        stopOk:'Yes', stopCancel:'No',
        stopMinDist:'Minimum distance 0.05 km not reached',
        statusSaved:'Ride saved',
        simBtn:'⚙ Create test data',
        simTitle:'Create test data',
        simText:'Rides from 01.01.2025 to today will be generated. Existing data will be overwritten.',
        simOk:'Create', simCancel:'Cancel',
        clearTitle:'Delete data',
        clearText:'All ride data will be permanently deleted.',
        clearOk:'Delete', clearCancel:'Cancel',
        saved:'rides saved',
        importTitle:'Import CSV',
        importText:'The CSV file will be merged with existing data. Duplicates will be skipped.',
        importOk:'Import', importCancel:'Cancel',
        btHint:'Bluetooth turned on?',
        cscNotFound:'No cadence sensor found',
        bleRetryHint:'BLE may need several attempts'
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
    set('l-start', L.start); set('l-pause', L.pause); set('l-stop', L.stop);
    const dbtn = document.getElementById('dbtn');
    if (dbtn) dbtn.textContent = dbtn.dataset.status === 'connected' ? L.btnDisc : L.btnConn;
    const cscbtn = document.getElementById('cscbtn');
    if (cscbtn) cscbtn.textContent = cscbtn.dataset.status === 'connected' ? L.btnCscDisc : L.btnCscConn;
    const lbtn = document.getElementById('lbtn');
    if (lbtn) lbtn.textContent = getLang() === 'de' ? 'EN' : 'DE';
    updateRideUI();
    renderHistContent();
}

window.toggleLang = function() {
    localStorage.setItem('adde_lang', getLang() === 'de' ? 'en' : 'de');
    applyLabels();
};

// ── Fahrt-Steuerung ───────────────────────────────────────────────────────────
let _rideState    = 'idle';
let _rideSeconds  = 0;
let _rideDist     = 0.0;
let _rideMaxSpd   = 0.0;
let _rideAvgSpd   = 0.0;
let _rideSpeeds   = [];
let _rideCadences = [];
let _rideStartBat = null;
let _rideStartTime= null;
window._rideTimer   = null;
window._lastSvcDist = null;

function updateRideUI() {
    const L        = LABELS[getLang()];
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnStop  = document.getElementById('btn-stop');
    const startLbl = document.getElementById('l-start');
    const pauseLbl = document.getElementById('l-pause');
    if (!btnStart) return;
    if (_rideState === 'idle') {
        btnStart.disabled = false; btnPause.disabled = true; btnStop.disabled = true;
        if (startLbl) startLbl.textContent = L.start;
        if (pauseLbl) pauseLbl.textContent = L.pause;
    } else if (_rideState === 'running') {
        btnStart.disabled = true; btnPause.disabled = false; btnStop.disabled = false;
    } else if (_rideState === 'paused') {
        btnStart.disabled = false; btnPause.disabled = true; btnStop.disabled = false;
        if (startLbl) startLbl.textContent = L.resume;
    }
}

window.rideStart = function() {
    stopRideTimer();
    if (_rideState === 'idle') {
        _rideSeconds        = 0;
        _rideDist           = 0.0;
        _rideMaxSpd         = 0.0;
        _rideAvgSpd         = 0.0;
        _rideSpeeds         = [];
        _rideCadences       = [];
        _rideStartBat       = window._currentBat || null;
        _rideStartTime      = new Date();
        window._lastSvcDist = null;
        // Notiz-Feld leeren
        const noteEl = document.getElementById('ride-note');
        if (noteEl) noteEl.value = '';
        localStorage.removeItem('adde_current_note');
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('v-spd', '0.0'); set('v-dist', '0.00'); set('v-time', '00:00');
        set('v-maxspd', '0.0'); set('v-avgspd', '0.0'); set('v-cad', '0');
    }
    _rideState = 'running';
    startRideTimer();
    updateRideUI();
};

window.ridePause = function() {
    if (_rideState !== 'running') return;
    _rideState = 'paused';
    window._lastSvcDist = null;
    stopRideTimer();
    updateRideUI();
};

window.rideStop = function() {
    if (_rideState === 'idle') return;
    const L = LABELS[getLang()];
    if (_rideDist < 0.05) {
        showToast(L.stopMinDist);
        _rideState = 'idle';
        stopRideTimer();
        updateRideUI();
        return;
    }
    showDialog(L.stopTitle, L.stopText, L.stopOk, '#E24B4A', L.stopCancel, () => {
        stopRideTimer();
        saveCurrentRide();
        _rideState = 'idle'; _rideSeconds = 0; _rideDist = 0.0;
        _rideMaxSpd = 0.0; _rideAvgSpd = 0.0; _rideSpeeds = []; _rideCadences = [];
        window._lastSvcDist = null;
        if (typeof NativeBridge !== 'undefined') NativeBridge.resetService();
        // TrackingService zurücksetzen
        if (typeof NativeBridge !== 'undefined') NativeBridge.resetService();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('v-spd', '0.0'); set('v-dist', '0.00'); set('v-time', '00:00');
        set('v-maxspd', '0.0'); set('v-avgspd', '0.0'); set('v-cad', '0');
        const sl = document.getElementById('l-start');
        if (sl) sl.textContent = L.start;
        updateRideUI();
        showToast('✓ ' + L.statusSaved);
        renderHistContent();

        // Sicherheitsnetz: nach 1.5s nochmals auf 0 setzen
        setTimeout(() => {
            if (_rideState === 'idle') {
                const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
                s('v-time', '00:00'); s('v-dist', '0.00'); s('v-spd', '0.0');
            }
        }, 1500);
    });
};

function saveCurrentRide() {
    if (!_rideStartTime) return;
    const avgCad = _rideCadences.length
        ? _rideCadences.reduce((a,v) => a+v, 0) / _rideCadences.length : 0;
    const note = localStorage.getItem('adde_current_note') || '';
    const ride = {
        id:           _rideStartTime.getTime(),
        date:         _rideStartTime.toISOString().slice(0,10),
        startTime:    String(_rideStartTime.getHours()).padStart(2,'0') + ':' +
                      String(_rideStartTime.getMinutes()).padStart(2,'0'),
        duration:     _rideSeconds,
        distance:     parseFloat(_rideDist.toFixed(2)),
        avgSpeed:     parseFloat(_rideAvgSpd.toFixed(1)),
        maxSpeed:     parseFloat(_rideMaxSpd.toFixed(1)),
        avgCadence:   parseFloat(avgCad.toFixed(0)),
        note:         note.trim(),
        batteryStart: _rideStartBat,
        batteryEnd:   window._currentBat || null
    };
    const rides = getRides();
    rides.push(ride);
    rides.sort((a,b) => a.date.localeCompare(b.date));
    localStorage.setItem('adde_rides', JSON.stringify(rides));
    localStorage.removeItem('adde_current_note');
}

// ── GPS ───────────────────────────────────────────────────────────────────────
window.updateGps = function(data) {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    const el = document.getElementById('v-spd');
    if (el) el.textContent = d.speed.toFixed(1);
};

// ── Service-Sync ──────────────────────────────────────────────────────────────
window.updateFromService = function(data) {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // Geschwindigkeit immer anzeigen
    set('v-spd', d.speed.toFixed(1));

    // Zeit/Distanz/Stats nur wenn Fahrt aktiv
    if (_rideState !== 'running') return;
        if (window._lastSvcDist == null) window._lastSvcDist = d.distance;
        const delta = Math.max(0, d.distance - window._lastSvcDist);
        window._lastSvcDist = d.distance;
        _rideDist += delta;
        set('v-dist', _rideDist.toFixed(2));

        if (d.seconds > _rideSeconds) {
            _rideSeconds = d.seconds;
            set('v-time', fmtTime(_rideSeconds));
        }

        if (d.speed > _rideMaxSpd) {
            _rideMaxSpd = d.speed;
            set('v-maxspd', _rideMaxSpd.toFixed(1));
        }

        // Ø Geschwindigkeit aus Distanz/Zeit — zuverlässig auch im Hintergrund
        if (_rideSeconds > 0 && _rideDist > 0) {
            _rideAvgSpd = (_rideDist / _rideSeconds) * 3600;
            set('v-avgspd', _rideAvgSpd.toFixed(1));
        }
};

// ── Cadence ───────────────────────────────────────────────────────────────────
window.updateCadence = function(data) {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    const el = document.getElementById('v-cad');
    if (el) el.textContent = d.cadence;
    // Nur während Fahrt und bei Bewegung sammeln — Pause wird ausgeschlossen
    if (_rideState === 'running' && d.cadence > 0) {
        _rideCadences.push(d.cadence);
    }
};

// ── BLE ───────────────────────────────────────────────────────────────────────
window.updateBle = function(data) {
    const L = LABELS[getLang()];
    const dbtn = document.getElementById('dbtn');
    const dot  = document.getElementById('dot');
    const stxt = document.getElementById('stxt');
    // Animation stoppen sobald verbunden
    if (dbtn) dbtn.classList.remove('scanning');
    stopScanAnimation();
    if (dbtn) { dbtn.dataset.status = 'connected'; dbtn.textContent = L.btnDisc; }
    if (dot)  dot.className = 'dot';
    if (stxt) stxt.textContent = L.conn;
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    if (d.soc != null) {
        const soc = Math.round(d.soc), color = soc < 20 ? '#E24B4A' : 'var(--accent)';
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

// ── CSC Status ────────────────────────────────────────────────────────────────
window.updateCscStatus = function(status) {
    const L      = LABELS[getLang()];
    const cscbtn = document.getElementById('cscbtn');
    if (!cscbtn) return;
    cscbtn.classList.remove('scanning');
    if (status === 'connected') {
        cscbtn.dataset.status = 'connected';
        cscbtn.textContent    = L.btnCscDisc;
    } else if (status === 'timeout') {
        cscbtn.dataset.status = 'disconnected';
        cscbtn.textContent    = L.btnCscConn;
        showToast(L.cscNotFound);
    } else {
        cscbtn.dataset.status = 'disconnected';
        cscbtn.textContent    = L.btnCscConn;
        const el = document.getElementById('v-cad');
        if (el) el.textContent = '0';
    }
};

// ── Wake Lock (Display aktiv halten) ──────────────────────────────────────────
window._wakeLockOn = false;

window.toggleWakeLock = function() {
    window._wakeLockOn = !window._wakeLockOn;
    const btn = document.getElementById('wakelock-btn');
    if (btn) {
        if (window._wakeLockOn) {
            // AN: groß, gelb, leuchtend
            btn.style.opacity    = '1';
            btn.style.filter     = 'none';
            btn.style.textShadow = '0 0 8px #FFD600';
            btn.title = getLang() === 'de' ? 'Display: aktiv' : 'Screen: on';
        } else {
            // AUS: gedimmt, grau
            btn.style.opacity    = '0.35';
            btn.style.filter     = 'grayscale(1)';
            btn.style.textShadow = 'none';
            btn.title = getLang() === 'de' ? 'Display: Ruhemodus' : 'Screen: sleep';
        }
    }
    if (typeof NativeBridge !== 'undefined') {
        NativeBridge.setWakeLock(window._wakeLockOn);
    }
    showToast(window._wakeLockOn
        ? (getLang() === 'de' ? '☀ Display bleibt aktiv' : '☀ Screen stays on')
        : (getLang() === 'de' ? '💤 Display: Ruhemodus'  : '💤 Screen: sleep mode'));
};

// ── Scan-Animation ────────────────────────────────────────────────────────────
let _scanDotTimer   = null;
let _scanHintTimer  = null;

function startScanAnimation(textElId) {
    let dots = 0;
    const el = document.getElementById(textElId);
    _scanDotTimer = setInterval(() => {
        dots = (dots + 1) % 4;
        if (el) el.textContent = 'Suche' + '.'.repeat(dots);
    }, 400);

    // Nach 5 Sekunden Hinweis anzeigen: BLE benötigt evtl. mehrere Versuche
    _scanHintTimer = setTimeout(() => {
        showToast(LABELS[getLang()].bleRetryHint);
    }, 5000);
}

function stopScanAnimation() {
    clearInterval(_scanDotTimer);
    clearTimeout(_scanHintTimer);
    _scanDotTimer  = null;
    _scanHintTimer = null;
}

// ── Verbinden ADD-E ───────────────────────────────────────────────────────────
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
            dbtn.classList.remove('scanning');
            stopScanAnimation();
        } else if (dbtn.dataset.status === 'scanning') {
            showToast(getLang() === 'de' ? 'Suche läuft…' : 'Scanning…');
        } else {
            showToast(L.btHint);
            dbtn.dataset.status = 'scanning';
            dbtn.classList.add('scanning');
            NativeBridge.startBle();
            dot.className = 'dot scan';
            startScanAnimation('stxt');

            setTimeout(() => {
                if (dbtn.dataset.status !== 'connected') {
                    dbtn.dataset.status = 'disconnected';
                    dbtn.classList.remove('scanning');
                    stopScanAnimation();
                    dot.className    = 'dot dis';
                    stxt.textContent = L.disc;
                    dbtn.textContent = L.btnConn;
                    showToast(getLang() === 'de' ? 'ADD-E nicht gefunden' : 'ADD-E not found');
                }
            }, 31000);
        }
    }
};

// ── Verbinden CSC ─────────────────────────────────────────────────────────────
window.onBtnCscConnect = function() {
    const L      = LABELS[getLang()];
    const cscbtn = document.getElementById('cscbtn');
    if (typeof NativeBridge !== 'undefined') {
        if (cscbtn.dataset.status === 'connected') {
            NativeBridge.stopCsc();
            cscbtn.dataset.status = 'disconnected';
            cscbtn.textContent    = L.btnCscConn;
            cscbtn.classList.remove('scanning');
            const el = document.getElementById('v-cad');
            if (el) el.textContent = '0';
        } else if (cscbtn.dataset.status === 'scanning') {
            showToast(getLang() === 'de' ? 'Suche läuft…' : 'Scanning…');
        } else {
            showToast(L.btHint);
            cscbtn.dataset.status = 'scanning';
            cscbtn.classList.add('scanning');
            NativeBridge.startCsc();
            cscbtn.textContent = 'Suche...';

            // Hinweis nach 5 Sekunden
            setTimeout(() => {
                if (cscbtn.dataset.status === 'scanning') {
                    showToast(L.bleRetryHint);
                }
            }, 5000);

            setTimeout(() => {
                if (cscbtn.dataset.status !== 'connected') {
                    cscbtn.dataset.status = 'disconnected';
                    cscbtn.classList.remove('scanning');
                    cscbtn.textContent    = L.btnCscConn;
                    showToast(L.cscNotFound);
                }
            }, 31000);
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
function startRideTimer() {
    if (window._rideTimer) return;
    window._rideTimer = setInterval(() => {
        if (_rideState !== 'running') return;
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
    const n = new Date(), el = document.getElementById('v-clock');
    if (el) el.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
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

// ── Dialog + Toast ────────────────────────────────────────────────────────────
function showDialog(title, text, okLabel, okColor, cancelLabel, onOk) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:24px;margin:20px;
                    max-width:320px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
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
    document.getElementById('dlg-ok').onclick = () => { document.body.removeChild(overlay); onOk(); };
}

window.showToast = function(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
        'background:#1D9E75;color:#fff;padding:10px 20px;border-radius:20px;' +
        'font-size:13px;font-weight:600;z-index:999;white-space:nowrap;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
};

// ── Notiz ────────────────────────────────────────────────────────────────────
window.saveNote = function() {
    const el = document.getElementById('ride-note');
    if (el) localStorage.setItem('adde_current_note', el.value);
};

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
    const rides = [], d = new Date('2025-01-01'), end = new Date('2026-04-11');
    let bat = 100, count = 0;
    const probs = [0.20,0.25,0.40,0.55,0.70,0.80,0.85,0.80,0.70,0.55,0.30,0.20];
    while (d <= end) {
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
        const prob = probs[d.getMonth()] * (isWeekend ? 1.4 : 1.0);
        if (Math.random() < Math.min(prob, 0.95)) {
            const distKm = parseFloat(rnd(isWeekend ? 8 : 3, isWeekend ? 35 : 18).toFixed(2));
            const avgSpd = parseFloat(rnd(16, 26).toFixed(1));
            const maxSpd = parseFloat((avgSpd + rnd(4, 10)).toFixed(1));
            const durSec = Math.round((distKm / avgSpd) * 3600);
            const batStart = bat;
            bat = Math.max(10, bat - Math.round(distKm * rnd(0.6, 1.2)));
            if (bat < 30 && Math.random() < 0.8) bat = rndInt(85, 100);
            const hour = isWeekend ? rndInt(8,16) : rndInt(7,18);
            const min  = rndInt(0,59);
            rides.push({
                id: d.getTime() + count, date: d.toISOString().slice(0,10),
                startTime: String(hour).padStart(2,'0')+':'+String(min).padStart(2,'0'),
                duration: durSec, distance: distKm, avgSpeed: avgSpd, maxSpeed: maxSpd,
                avgCadence: rndInt(70, 95),   // simulierte Trittfrequenz
                batteryStart: batStart, batteryEnd: bat
            });
            count++;
        }
        d.setDate(d.getDate() + 1);
    }
    localStorage.setItem('adde_rides', JSON.stringify(rides));
    renderHistContent();
    window.showToast(rides.length + ' ' + L.saved);
}

// ── CSV-Import ────────────────────────────────────────────────────────────────
window.histImport = function() {
    const L = LABELS[getLang()];
    showDialog(L.importTitle, L.importText, L.importOk, '#1D9E75', L.importCancel, () => {
        if (typeof NativeBridge !== 'undefined') NativeBridge.importCsv();
    });
};

window.importCsvData = function(csvRaw) {
    const csv   = typeof csvRaw === 'string' ? csvRaw : String(csvRaw);
    const clean = csv.charCodeAt(0) === 0xFEFF ? csv.slice(1) : csv;
    const sep   = clean.includes(';') ? ';' : ',';
    const lines = clean.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) { window.showToast('CSV leer oder ungültig'); return; }
    const toFloat = s => parseFloat((s || '0').trim().replace(',', '.')) || 0;
    const toInt   = s => parseInt((s || '0').trim().replace(',', '.'))   || 0;
    const imported = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep);
        if (cols.length < 6) continue;
        const ride = {
            id:           new Date(cols[0]?.trim()).getTime() + i,
            date:         cols[0]?.trim() || '',
            startTime:    cols[1]?.trim() || '',
            distance:     toFloat(cols[2]),
            duration:     toInt(cols[3]),
            avgSpeed:     toFloat(cols[4]),
            maxSpeed:     toFloat(cols[5]),
            batteryStart: cols[6] ? toInt(cols[6]) : null,
            batteryEnd:   cols[7] ? toInt(cols[7]) : null,
            avgCadence:   cols[8] ? toInt(cols[8]) : null,
            note:         cols[9] ? cols[9].trim() : ''
        };
        if (ride.date && ride.distance > 0) imported.push(ride);
    }
    if (!imported.length) { window.showToast('Keine gültigen Fahrten gefunden'); return; }
    const existing    = getRides();
    const existingIds = new Set(existing.map(r => r.date + r.startTime));
    const newRides    = imported.filter(r => !existingIds.has(r.date + r.startTime));
    const merged      = [...existing, ...newRides].sort((a,b) => a.date.localeCompare(b.date));
    localStorage.setItem('adde_rides', JSON.stringify(merged));
    window.showToast('✓ ' + newRides.length + ' Fahrten importiert' +
        (imported.length - newRides.length > 0 ? ' (' + (imported.length - newRides.length) + ' Duplikate)' : ''));
    renderHistContent();
};

// ── Daten löschen ─────────────────────────────────────────────────────────────
window.histClear = function() {
    const L = LABELS[getLang()];
    showDialog(L.clearTitle, L.clearText, L.clearOk, '#E24B4A', L.clearCancel, () => {
        localStorage.removeItem('adde_rides'); renderHistContent();
    });
};

// ── Verlauf: Tab-Logik ────────────────────────────────────────────────────────
let _histTab  = 't';
let _histDate = new Date();

window.setHistTab = function(tab, btn) {
    _histTab = tab; _histDate = new Date();
    document.querySelectorAll('.htab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const nav = document.getElementById('hist-nav');
    if (nav) nav.style.display = tab === 'g' ? 'none' : 'flex';
    updateHistNav(); renderHistContent();
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

window.histNavToday = function() { _histDate = new Date(); updateHistNav(); renderHistContent(); };

function getMonday(d) {
    const dt = new Date(d), day = dt.getDay() || 7;
    dt.setDate(dt.getDate() - day + 1); return dt;
}

function updateHistNav() {
    const lbl = document.getElementById('hnav-label');
    if (!lbl) return;
    const days = getLang() === 'de'
        ? ['So','Mo','Di','Mi','Do','Fr','Sa']
        : ['Su','Mo','Tu','We','Th','Fr','Sa'];
    if      (_histTab === 't') lbl.textContent = _histDate.toISOString().slice(0,10);
    else if (_histTab === 'w') { const mon = getMonday(_histDate); lbl.textContent = days[mon.getDay()] + ', ' + mon.toISOString().slice(0,10); }
    else if (_histTab === 'm') lbl.textContent = _histDate.toISOString().slice(0,7);
    else if (_histTab === 'j') lbl.textContent = String(_histDate.getFullYear());
}

// ── Verlauf: Inhalt rendern ───────────────────────────────────────────────────
function renderHistContent() {
    const el = document.getElementById('hist-content');
    if (!el) return;
    const L = LABELS[getLang()], rides = getRides();
    let filtered = [];
    if (_histTab === 't') {
        filtered = rides.filter(r => r.date === _histDate.toISOString().slice(0,10));
        el.innerHTML = filtered.length === 0 ? emptyHtml(L) : filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'w') {
        const mon = getMonday(new Date(_histDate)); const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
        filtered = rides.filter(r => r.date >= mon.toISOString().slice(0,10) && r.date <= sun.toISOString().slice(0,10));
        el.innerHTML = filtered.length === 0 ? emptyHtml(L) : aggCard(filtered, L) + filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'm') {
        filtered = rides.filter(r => r.date.slice(0,7) === _histDate.toISOString().slice(0,7));
        el.innerHTML = filtered.length === 0 ? emptyHtml(L) : aggCard(filtered, L) + filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'j') {
        filtered = rides.filter(r => r.date.slice(0,4) === String(_histDate.getFullYear()));
        el.innerHTML = filtered.length === 0 ? emptyHtml(L) : aggCard(filtered, L) + filtered.map(r => rideCard(r, L)).join('');
    } else if (_histTab === 'g') {
        el.innerHTML = rides.length === 0 ? emptyHtml(L) : aggCard(rides, L);
    }
}

function emptyHtml(L) {
    return `<div style="text-align:center;padding:24px 0;color:#aaa;font-size:13px;">${L.noData}</div>
    <div style="text-align:center;margin-top:4px;">
      <button onclick="histSimulate()" style="font-size:12px;padding:8px 16px;border-radius:8px;
        border:1px solid #ccc;background:#f5f5f5;color:#555;cursor:pointer;font-family:inherit;">
        ${L.simBtn}</button></div>`;
}

function rideCard(r, L) {
    const bat = (r.batteryStart != null && r.batteryEnd != null) ? `${r.batteryStart}%→${r.batteryEnd}%` : '--';
    const cad = r.avgCadence ? `${r.avgCadence} rpm` : '--';
    const noteHtml = r.note ? `<div style="margin-top:6px;font-size:11px;color:#888;
        background:#FFFDE7;border-radius:6px;padding:4px 8px;">
        ✏ ${r.note}</div>` : '';
    return `<div class="hist-row">
      <div class="hist-row-hdr">
        <div class="hist-row-date">${r.date} ${r.startTime||''}</div>
        <div class="hist-row-dist">${r.distance.toFixed(1)} km</div>
      </div>
      <div class="hist-row-stats">
        <div class="hist-stat"><b>${fmtDuration(r.duration)}</b>${L.duration}</div>
        <div class="hist-stat"><b>${r.avgSpeed.toFixed(1)} km/h</b>${L.avgSpd}</div>
        <div class="hist-stat"><b>${r.maxSpeed.toFixed(1)} km/h</b>${L.maxSpd}</div>
        <div class="hist-stat"><b>${bat}</b>${L.battery}</div>
        <div class="hist-stat"><b>${cad}</b>${L.avgCad}</div>
      </div>
      ${noteHtml}
    </div>`;
}

function aggCard(rides, L) {
    const totalKm  = rides.reduce((s,r) => s + r.distance, 0);
    const totalSec = rides.reduce((s,r) => s + r.duration, 0);
    const avgSpd   = rides.reduce((s,r) => s + r.avgSpeed, 0) / rides.length;
    const maxSpd   = Math.max(...rides.map(r => r.maxSpeed));
    const cadRides = rides.filter(r => r.avgCadence > 0);
    const avgCad   = cadRides.length ? cadRides.reduce((s,r) => s + r.avgCadence, 0) / cadRides.length : 0;
    return `<div class="hist-agg" style="margin-bottom:10px;"><div class="hist-agg-grid">
        <div class="hist-agg-item"><div class="hist-agg-val">${rides.length}</div><div class="hist-agg-lbl">${L.rides}</div></div>
        <div class="hist-agg-item"><div class="hist-agg-val">${totalKm.toFixed(1)}</div><div class="hist-agg-lbl">${L.distance} km</div></div>
        <div class="hist-agg-item"><div class="hist-agg-val">${fmtDuration(totalSec)}</div><div class="hist-agg-lbl">${L.duration}</div></div>
        <div class="hist-agg-item"><div class="hist-agg-val">${avgSpd.toFixed(1)}</div><div class="hist-agg-lbl">${L.avgSpd} km/h</div></div>
        <div class="hist-agg-item"><div class="hist-agg-val">${maxSpd.toFixed(1)}</div><div class="hist-agg-lbl">${L.maxSpd} km/h</div></div>
        ${avgCad > 0 ? `<div class="hist-agg-item"><div class="hist-agg-val">${avgCad.toFixed(0)}</div><div class="hist-agg-lbl">${L.avgCad} rpm</div></div>` : ''}
    </div></div>`;
}

// ── Verlauf: Aktionen ────────────────────────────────────────────────────────
window.histInfo = function() {
    const rides = getRides(), L = LABELS[getLang()];
    if (!rides.length) { window.showToast(L.noData); return; }
    const totalKm  = rides.reduce((s,r) => s + r.distance, 0);
    const totalSec = rides.reduce((s,r) => s + r.duration, 0);
    showDialog('∑ ' + L.rides,
        `${L.rides}: <b>${rides.length}</b><br>${L.distance}: <b>${totalKm.toFixed(1)} km</b><br>${L.duration}: <b>${fmtDuration(totalSec)}</b>`,
        'OK', '#1D9E75', '', () => {});
};

window.histExport = function() {
    const rides = getRides(), L = LABELS[getLang()];
    if (!rides.length) { window.showToast(L.noData); return; }
    let filtered = [], label = '';
    if (_histTab === 't') { const day = _histDate.toISOString().slice(0,10); filtered = rides.filter(r => r.date === day); label = day; }
    else if (_histTab === 'w') { const mon = getMonday(new Date(_histDate)); const sun = new Date(mon); sun.setDate(sun.getDate() + 6); filtered = rides.filter(r => r.date >= mon.toISOString().slice(0,10) && r.date <= sun.toISOString().slice(0,10)); label = 'KW_' + mon.toISOString().slice(0,10); }
    else if (_histTab === 'm') { const ym = _histDate.toISOString().slice(0,7); filtered = rides.filter(r => r.date.slice(0,7) === ym); label = ym; }
    else if (_histTab === 'j') { const yr = String(_histDate.getFullYear()); filtered = rides.filter(r => r.date.slice(0,4) === yr); label = yr; }
    else { filtered = rides; label = 'Gesamt'; }
    if (!filtered.length) { window.showToast(L.noData); return; }
    const csv = ['Datum,Uhrzeit,Distanz km,Fahrzeit s,Ø km/h,Max km/h,Akku Start%,Akku Ende%,Ø rpm,Notiz']
        .concat(filtered.map(r =>
            `${r.date},${r.startTime||''},${r.distance},${r.duration},${r.avgSpeed},${r.maxSpeed},${r.batteryStart||''},${r.batteryEnd||''},${r.avgCadence||''},${(r.note||'').replace(/,/g, ';')}`
        )).join('\n');
    localStorage.setItem('adde_csv_export', csv);
    localStorage.setItem('adde_csv_label', label);
    window.showToast('Exportiere ' + filtered.length + ' Fahrten (' + label + ')...');
    if (typeof NativeBridge !== 'undefined') NativeBridge.exportCsv('ready');
};

window.histReport = function() { histClear(); };

// ── Init ─────────────────────────────────────────────────────────────────────
localStorage.setItem('adde_lang', 'de');
applyTheme(localStorage.getItem('adde_theme') || 'teal');
updateHistNav();
applyLabels();