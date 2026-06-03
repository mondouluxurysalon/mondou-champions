// ══════════════════════════════════════════════════════════════
// MONDOU CHAMPIONS — MÓDULO CENTRAL (mc_core.js)
// Incluido en todos los archivos HTML vía <script src="mc_core.js">
// ══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1. BASE DE USUARIOS
//    PIN = cumpleaños DDMM (ej: 15 de marzo = 1503)
//    rol: "A" = estilista, "B" = operación, "ADMIN" = dueña
// ─────────────────────────────────────────────────────────────
const MC_USERS = {

  // ── COLIMA ────────────────────────────────────────────────
  "Adri":  { pin:"0000", salon:"Colima",     rol:"A", color:"#7C3AED", piso:6000 },
  "Adai":  { pin:"0000", salon:"Colima",     rol:"A", color:"#2563EB", piso:6000 },
  "Karla": { pin:"0000", salon:"Colima",     rol:"A", color:"#D97706", piso:6000 },
  "Mery":  { pin:"0000", salon:"Colima",     rol:"A", color:"#6B7280", piso:5000 },
  "Ale":   { pin:"0000", salon:"Colima",     rol:"A", color:"#E24B4A", piso:6000 },
  "Edna":  { pin:"0000", salon:"Colima",     rol:"B", color:"#C9963B", piso:9000 },
  "Gaby":  { pin:"0000", salon:"Colima",     rol:"B", color:"#888888", piso:7500 },

  // ── SAN PEDRO ─────────────────────────────────────────────
  // Agrega aquí el equipo de San Pedro:
  // "Nombre": { pin:"DDMM", salon:"San Pedro", rol:"A", color:"#HEX", piso:0000 },

  // ── MANZANILLO ────────────────────────────────────────────
  // Agrega aquí el equipo de Manzanillo:
  // "Nombre": { pin:"DDMM", salon:"Manzanillo", rol:"A", color:"#HEX", piso:0000 },

  // ── ADMINISTRACIÓN (tú) ───────────────────────────────────
  "Admin": { pin:"0000", salon:"Todas",      rol:"ADMIN", color:"#C9963B", piso:0 },
};

// ─────────────────────────────────────────────────────────────
// 1b. CLAVES BASE (para distinguir usuarios originales de los
//     agregados vía config.html + localStorage)
// ─────────────────────────────────────────────────────────────
const MC_BASE_KEYS = new Set(Object.keys(MC_USERS));

// Snapshot limpio del estado base — usado por MC_Users.init() para reset
const _MC_BASE_STATE = {};
Object.keys(MC_USERS).forEach(k => { _MC_BASE_STATE[k] = { ...MC_USERS[k] }; });

// ─────────────────────────────────────────────────────────────
// MC_Users — alta/baja/edición sin tocar mc_core.js
//   · mc_extra_users  → personas nuevas completas
//   · mc_pin_overrides → PINs editados de usuarios base
// ─────────────────────────────────────────────────────────────
const MC_Users = {

  // meta = piso × 10 × 1.17, redondeado al millar más cercano
  calcMeta(piso) {
    return Math.round(piso * 10 * 1.17 / 1000) * 1000;
  },

  _getExtras() {
    try { return JSON.parse(localStorage.getItem('mc_extra_users') || '{}'); } catch(e) { return {}; }
  },

  _getPinOverrides() {
    try { return JSON.parse(localStorage.getItem('mc_pin_overrides') || '{}'); } catch(e) { return {}; }
  },

  // Agregar o actualizar usuario extra (desde config.html)
  add(name, salon, rol, color, piso, pin) {
    if (!name.trim()) return false;
    const extras = this._getExtras();
    extras[name.trim()] = { pin: String(pin), salon, rol, color, piso: Number(piso) };
    try {
      localStorage.setItem('mc_extra_users', JSON.stringify(extras));
      MC_USERS[name.trim()] = extras[name.trim()];
      return true;
    } catch(e) { return false; }
  },

  // Eliminar usuario — solo extras, nunca los base
  remove(name) {
    if (MC_BASE_KEYS.has(name)) return false;
    const extras = this._getExtras();
    delete extras[name];
    try {
      localStorage.setItem('mc_extra_users', JSON.stringify(extras));
      delete MC_USERS[name];
      return true;
    } catch(e) { return false; }
  },

  // Cambiar PIN (funciona para base y extras)
  updatePin(name, pin) {
    if (MC_BASE_KEYS.has(name)) {
      const ov = this._getPinOverrides();
      ov[name] = String(pin);
      localStorage.setItem('mc_pin_overrides', JSON.stringify(ov));
    } else {
      const ex = this._getExtras();
      if (ex[name]) { ex[name].pin = String(pin); localStorage.setItem('mc_extra_users', JSON.stringify(ex)); }
    }
    if (MC_USERS[name]) MC_USERS[name].pin = String(pin);
  },

  // Cambiar piso de usuario extra (base se edita en mc_core.js)
  updatePiso(name, piso) {
    if (MC_BASE_KEYS.has(name)) return;
    const ex = this._getExtras();
    if (ex[name]) {
      ex[name].piso = Number(piso);
      localStorage.setItem('mc_extra_users', JSON.stringify(ex));
      if (MC_USERS[name]) MC_USERS[name].piso = Number(piso);
    }
  },

  // Renombrar usuario extra — copia al nuevo nombre y borra el viejo
  rename(oldName, newName) {
    const n = newName.trim();
    if (!n || MC_BASE_KEYS.has(oldName)) return false;
    if (MC_USERS[n]) return false; // nombre ya existe
    const ex = this._getExtras();
    if (!ex[oldName]) return false;
    ex[n] = { ...ex[oldName] };
    delete ex[oldName];
    try {
      localStorage.setItem('mc_extra_users', JSON.stringify(ex));
      MC_USERS[n] = MC_USERS[oldName];
      delete MC_USERS[oldName];
      return true;
    } catch(e) { return false; }
  },

  // Desactivar — oculta al usuario en toda la app (base o extra)
  deactivate(name) {
    try {
      const set = this._getInactive();
      set.add(name);
      localStorage.setItem('mc_inactive_users', JSON.stringify([...set]));
      delete MC_USERS[name];
      return true;
    } catch(e) { return false; }
  },

  // Reactivar — vuelve a aparecer (requiere reload para usuarios base)
  reactivate(name) {
    try {
      const set = this._getInactive();
      set.delete(name);
      localStorage.setItem('mc_inactive_users', JSON.stringify([...set]));
      const ex = this._getExtras();
      if (ex[name]) MC_USERS[name] = ex[name];
      return true;
    } catch(e) { return false; }
  },

  _getInactive() {
    try { return new Set(JSON.parse(localStorage.getItem('mc_inactive_users') || '[]')); } catch(e) { return new Set(); }
  },

  // ── Sincronización Firestore (cross-device) ───────────────────
  _ready: false,

  async init() {
    if (this._ready) return;

    // 1. Caché en sessionStorage (5 min) — evita re-fetch en cada página
    try {
      const raw = sessionStorage.getItem('mc_users_cache');
      if (raw) {
        const c = JSON.parse(raw);
        if (Date.now() - c.ts < 300000) {
          this._applyFull(c.extras || {}, c.extrasInactive || [], c.pinOverrides || {}, c.inactive || []);
          this._ready = true;
          return;
        }
      }
    } catch(e) {}

    // 2. Cargar de Firestore
    try {
      if (typeof MC_DB !== 'undefined') {
        const [allExtras, cfg] = await Promise.all([
          MC_DB.getAllExtraUsers(),
          MC_DB.getUserConfig()
        ]);
        const payload = {
          ts:             Date.now(),
          extras:         allExtras.active   || {},
          extrasInactive: allExtras.inactive || [],
          pinOverrides:   cfg.pin_overrides  || {},
          inactive:       cfg.inactive       || []
        };
        try { sessionStorage.setItem('mc_users_cache', JSON.stringify(payload)); } catch(e) {}
        this._applyFull(payload.extras, payload.extrasInactive, payload.pinOverrides, payload.inactive);
      } else {
        this._applyLocalStorage();
      }
    } catch(e) {
      console.warn('[MC] Firestore no disponible, usando localStorage:', e.message);
      this._applyLocalStorage();
    }

    this._ready = true;
  },

  _applyFull(extras, extrasInactive, pinOverrides, inactive) {
    // 1. Resetear MC_USERS al estado base limpio
    Object.keys(MC_USERS).forEach(k => delete MC_USERS[k]);
    Object.keys(_MC_BASE_STATE).forEach(k => { MC_USERS[k] = { ..._MC_BASE_STATE[k] }; });
    // 2. Quitar extras desactivados (active:false en Firestore)
    extrasInactive.forEach(n => delete MC_USERS[n]);
    // 3. Agregar extras activos de Firestore
    Object.entries(extras).forEach(([n, u]) => {
      if (!MC_BASE_KEYS.has(n)) MC_USERS[n] = u;
    });
    // 4. Aplicar overrides de PIN a usuarios base
    Object.entries(pinOverrides).forEach(([n, p]) => {
      if (MC_USERS[n]) MC_USERS[n].pin = String(p);
    });
    // 5. Quitar usuarios base desactivados
    inactive.forEach(n => delete MC_USERS[n]);
  },

  _applyLocalStorage() {
    try { Object.assign(MC_USERS, JSON.parse(localStorage.getItem('mc_extra_users') || '{}')); } catch(e) {}
    try {
      const ov = JSON.parse(localStorage.getItem('mc_pin_overrides') || '{}');
      Object.entries(ov).forEach(([n, p]) => { if (MC_USERS[n]) MC_USERS[n].pin = p; });
    } catch(e) {}
    try {
      const inactive = new Set(JSON.parse(localStorage.getItem('mc_inactive_users') || '[]'));
      inactive.forEach(n => delete MC_USERS[n]);
    } catch(e) {}
  },

  invalidateCache() {
    try { sessionStorage.removeItem('mc_users_cache'); } catch(e) {}
    this._ready = false;
  }
};

// ─────────────────────────────────────────────────────────────
// Aplicar extras + overrides + desactivados de localStorage
// (se ejecuta una sola vez al cargar mc_core.js)
// ─────────────────────────────────────────────────────────────
(function _applyLocalStorage() {
  try {
    const extras = JSON.parse(localStorage.getItem('mc_extra_users') || '{}');
    Object.assign(MC_USERS, extras);
  } catch(e) {}
  try {
    const ov = JSON.parse(localStorage.getItem('mc_pin_overrides') || '{}');
    Object.entries(ov).forEach(([name, pin]) => { if (MC_USERS[name]) MC_USERS[name].pin = pin; });
  } catch(e) {}
  // Quitar usuarios desactivados de la memoria
  try {
    const inactive = new Set(JSON.parse(localStorage.getItem('mc_inactive_users') || '[]'));
    inactive.forEach(name => { delete MC_USERS[name]; });
  } catch(e) {}
})();

// ─────────────────────────────────────────────────────────────
// 2. GESTIÓN DE SESIÓN
//    Versión v2 para evitar conflictos con sesiones antiguas
//    Duración: 7 días
// ─────────────────────────────────────────────────────────────
const MC_SESSION_KEY  = 'mc_session_v2';
const MC_SESSION_DAYS = 7;

const MC_Session = {

  // Crear sesión al hacer login exitoso
  create(name) {
    const u = MC_USERS[name];
    if (!u) return false;
    const data = {
      v: 2,
      name,
      salon:  u.salon,
      rol:    u.rol,
      color:  u.color,
      piso:   u.piso,
      expires: Date.now() + MC_SESSION_DAYS * 864e5
    };
    try {
      localStorage.setItem(MC_SESSION_KEY, JSON.stringify(data));
      return data;
    } catch(e) { return false; }
  },

  // Obtener sesión activa (null si no hay o expiró)
  get() {
    try {
      const raw = localStorage.getItem(MC_SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      // Validar versión, expiración y que el usuario aún existe
      if (s.v !== 2) { this.clear(); return null; }
      if (Date.now() > s.expires) { this.clear(); return null; }
      if (!MC_USERS[s.name]) { this.clear(); return null; }
      return s;
    } catch(e) { this.clear(); return null; }
  },

  // Destruir sesión (logout)
  clear() {
    try { localStorage.removeItem(MC_SESSION_KEY); } catch(e) {}
  },

  // Requiere sesión activa — si no hay, redirige al login
  require() {
    const s = this.get();
    if (!s) { window.location.href = 'login.html'; return null; }
    return s;
  },

  // Requiere rol específico — si no coincide, redirige al menú
  requireRole(rol) {
    const s = this.require();
    if (!s) return null;
    if (s.rol !== rol) { window.location.href = 'menu.html'; return null; }
    return s;
  }
};

// ─────────────────────────────────────────────────────────────
// 3. REGISTRO DE ENVÍOS SEMANALES
//    Guarda qué forms ha enviado cada usuario esta semana
//    La clave usa el lunes de la semana para ser estable
// ─────────────────────────────────────────────────────────────
const MC_Submitted = {

  // Clave única por form + usuario + semana (fecha LOCAL para evitar desfase UTC)
  _key(form, userName) {
    const d   = new Date();
    const dow = d.getDay(); // 0=Dom
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const y  = mon.getFullYear();
    const m  = String(mon.getMonth() + 1).padStart(2, '0');
    const dy = String(mon.getDate()).padStart(2, '0');
    const week = `${y}-${m}-${dy}`;
    return `mc_sub_${form}_${userName}_${week}`;
  },

  // Marcar como enviado (llamar desde el propio form)
  mark(form, userName) {
    try { localStorage.setItem(this._key(form, userName), '1'); } catch(e) {}
  },

  // Verificar si ya envió esta semana
  check(form, userName) {
    try { return localStorage.getItem(this._key(form, userName)) === '1'; } catch(e) { return false; }
  }
};

// ─────────────────────────────────────────────────────────────
// 4. HELPERS DE UI
// ─────────────────────────────────────────────────────────────
const MC_UI = {

  SALON_ICONS: { "Colima":"🌴", "San Pedro":"🏙️", "Manzanillo":"🌊", "Todas":"🏢" },
  DAYS_ES:  ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],
  MONTHS_ES:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],

  salonIcon(salon) { return this.SALON_ICONS[salon] || '✦'; },

  todayString() {
    const d = new Date();
    return `${this.DAYS_ES[d.getDay()]} ${d.getDate()} de ${this.MONTHS_ES[d.getMonth()]}`;
  },

  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  },

  weekRange() {
    const d   = new Date();
    const dow = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sat = new Date(mon); sat.setDate(mon.getDate() + 5);
    const fmt = x => `${x.getDate()} ${this.MONTHS_ES[x.getMonth()]}`;
    return `${fmt(mon)} — ${fmt(sat)}`;
  },

  isSaturday() { return new Date().getDay() === 6; },

  // Compañeros nominables: mismo salón, diferente nombre
  nominees(myName) {
    // Nominaciones all-vs-all: cualquier compañera sin importar sucursal
    return Object.entries(MC_USERS)
      .filter(([n, u]) => n !== myName && u.rol !== 'ADMIN')
      .map(([n, u]) => ({ name: n, color: u.color, rol: u.rol, salon: u.salon }));
  },

  // Usuarios del mismo salón para mostrar en panel
  teamBySalon(salon) {
    return Object.entries(MC_USERS)
      .filter(([, u]) => u.salon === salon || salon === 'Todas')
      .map(([n, u]) => ({ name: n, ...u }));
  }
};
