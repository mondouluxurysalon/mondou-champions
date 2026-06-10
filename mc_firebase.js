// ══════════════════════════════════════════════════════════════
// MONDOU CHAMPIONS — FIREBASE (mc_firebase.js)
// ══════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyB2tk1vJNMVdTixDWPOyc2DuH1G-CmXRHI",
  authDomain: "mondou-champions.firebaseapp.com",
  projectId: "mondou-champions",
  storageBucket: "mondou-champions.firebasestorage.app",
  messagingSenderId: "212358825674",
  appId: "1:212358825674:web:69fc9618ef4f38071d5633"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ─────────────────────────────────────────────────────────────
// MC_DB — leer y escribir en Firestore
// Doc ID con formato fijo → evita duplicados por persona/semana
// ─────────────────────────────────────────────────────────────
const MC_DB = {

  // Si se pasa `date`, calcula la weekKey de ESA fecha (lunes de su semana).
  // Sin argumento, usa hoy → comportamiento original.
  _weekKey(date) {
    const d = date ? new Date(date) : new Date(), dow = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    // Usar fecha LOCAL (no toISOString que es UTC) para evitar desfase de zona horaria
    const y  = mon.getFullYear();
    const m  = String(mon.getMonth() + 1).padStart(2, '0');
    const dy = String(mon.getDate()).padStart(2, '0');
    return `${y}-${m}-${dy}`;
  },

  // Lista de weekKeys recientes, de la semana actual hacia atrás.
  // recentWeeks(6) → [semana actual, -1 sem, -2 sem, ... -5 sem]
  recentWeeks(n = 6) {
    const out = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      out.push(this._weekKey(d));
    }
    return out;
  },

  saveRespA(data) {
    const week = this._weekKey();
    return db.collection('responses_pa')
      .doc(`pa_${data.name}_${week}`)
      .set({ ...data, week });
  },

  saveRespB(data) {
    const week = this._weekKey();
    return db.collection('responses_pb')
      .doc(`pb_${data.name}_${week}`)
      .set({ ...data, week });
  },

  saveNom(data) {
    const week = this._weekKey();
    return db.collection('nominations')
      .doc(`nom_${data.from}_${week}`)
      .set({ ...data, week });
  },

  // `week` opcional → permite consultar una semana específica (selector de periodo en panel.html)
  async getRespA(week) {
    const snap = await db.collection('responses_pa')
      .where('week', '==', week || this._weekKey()).get();
    const out = {};
    snap.forEach(d => { out[d.data().name] = d.data(); });
    return out;
  },

  async getRespB(week) {
    const snap = await db.collection('responses_pb')
      .where('week', '==', week || this._weekKey()).get();
    const out = {};
    snap.forEach(d => { out[d.data().name] = d.data(); });
    return out;
  },

  async getNoms(week) {
    const snap = await db.collection('nominations')
      .where('week', '==', week || this._weekKey()).get();
    return snap.docs.map(d => d.data());
  },

  saveSales(data, week) {
    const w = week || this._weekKey();
    return db.collection('sales')
      .doc(`sales_${w}`)
      .set({ ...data, week: w });
  },

  async getSales(week) {
    const snap = await db.collection('sales')
      .doc(`sales_${week || this._weekKey()}`)
      .get();
    return snap.exists ? snap.data() : null;
  },

  // ── Verificar envíos individuales (anti-reenvío) ─────────────
  async hasRespA(name) {
    const snap = await db.collection('responses_pa')
      .doc(`pa_${name}_${this._weekKey()}`).get();
    return snap.exists;
  },
  async hasRespB(name) {
    const snap = await db.collection('responses_pb')
      .doc(`pb_${name}_${this._weekKey()}`).get();
    return snap.exists;
  },
  async hasNom(name) {
    const snap = await db.collection('nominations')
      .doc(`nom_${name}_${this._weekKey()}`).get();
    return snap.exists;
  },

  // ── Premios de la quincena (Admin configura) ─────────────────
  savePrizes(data, week) {
    const w = week || this._weekKey();
    return db.collection('prizes')
      .doc(`prizes_${w}`)
      .set({ ...data, week: w });
  },

  async getPrizes(week) {
    const snap = await db.collection('prizes')
      .doc(`prizes_${week || this._weekKey()}`)
      .get();
    return snap.exists ? snap.data() : null;
  },

  // ── Recompensas individuales (Admin asigna a cada persona) ────
  saveReward(name, data) {
    const week = this._weekKey();
    return db.collection('rewards')
      .doc(`reward_${name}_${week}`)
      .set({ ...data, name, week, visto: false, ts: new Date().toISOString() });
  },

  async getMyReward(name) {
    const snap = await db.collection('rewards')
      .doc(`reward_${name}_${this._weekKey()}`)
      .get();
    return snap.exists ? snap.data() : null;
  },

  async getAllRewardsThisWeek() {
    const snap = await db.collection('rewards')
      .where('week', '==', this._weekKey()).get();
    return snap.docs.map(d => d.data());
  },

  markRewardSeen(name) {
    const week = this._weekKey();
    return db.collection('rewards')
      .doc(`reward_${name}_${week}`)
      .update({ visto: true });
  },

  // ── Gestión de usuarios (sincronización cross-device) ─────────
  // mc_users/{name}         → usuario extra  { pin,salon,rol,color,piso,active }
  // mc_user_config/settings → { pin_overrides:{}, inactive:[] }

  async getAllExtraUsers() {
    const snap = await db.collection('mc_users').get();
    const active = {}, inactive = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.active !== false) active[d.id] = data;
      else inactive.push(d.id);
    });
    return { active, inactive };
  },

  saveExtraUser(name, data) {
    return db.collection('mc_users').doc(name).set({ ...data, active: true });
  },

  updateExtraUserFields(name, fields) {
    return db.collection('mc_users').doc(name).update(fields);
  },

  async renameExtraUser(oldName, newName, data) {
    await db.collection('mc_users').doc(newName).set({ ...data, active: true });
    return db.collection('mc_users').doc(oldName).delete();
  },

  deleteExtraUser(name) {
    return db.collection('mc_users').doc(name).delete();
  },

  async updateUserPin(name, pin, isBase) {
    if (isBase) {
      const cfg = await this.getUserConfig();
      const ov  = cfg.pin_overrides || {};
      ov[name]  = String(pin);
      return this.saveUserConfig({ ...cfg, pin_overrides: ov });
    }
    return db.collection('mc_users').doc(name).update({ pin: String(pin) });
  },

  async deactivateUser(name, isBase) {
    if (isBase) {
      const cfg = await this.getUserConfig();
      const arr = cfg.inactive || [];
      if (!arr.includes(name)) arr.push(name);
      return this.saveUserConfig({ ...cfg, inactive: arr });
    }
    return db.collection('mc_users').doc(name).update({ active: false });
  },

  async reactivateUser(name, isBase) {
    if (isBase) {
      const cfg = await this.getUserConfig();
      cfg.inactive = (cfg.inactive || []).filter(n => n !== name);
      return this.saveUserConfig(cfg);
    }
    return db.collection('mc_users').doc(name).update({ active: true });
  },

  async getUserConfig() {
    const snap = await db.collection('mc_user_config').doc('settings').get();
    return snap.exists ? snap.data() : { pin_overrides: {}, inactive: [] };
  },

  saveUserConfig(data) {
    return db.collection('mc_user_config').doc('settings').set(data);
  }
};
