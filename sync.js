/* IDFLIX — login anonymous (F-01) + sinkronisasi Favorit/Progres (F-06, F-07).
   Aplikasi tetap berjalan penuh dengan localStorage bila Firebase/Auth tidak tersedia.
   Struktur data (lihat database.rules.json):
     users/<uid>/favorites/<movieId>: timestamp
     users/<uid>/progress/<movieId>: {t, d, q, updatedAt}
     reports/<pushId>: {movieId, type, quality?, uid, createdAt}                       */
(function () {
  "use strict";

  const state = { uid: null, db: null, ready: false, enabled: false };
  let resolveReady;
  const ready = new Promise(r => { resolveReady = r; });

  function configured() {
    const c = window.FIREBASE_CONFIG;
    return !!(window.firebase && c && !/PROJECT/.test(c.databaseURL || "PROJECT"));
  }

  function initApp() {
    if (!configured()) return false;
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    return true;
  }

  // Login senyap. UID disimpan Firebase di IndexedDB dan dipakai ulang di kunjungan berikutnya.
  async function start() {
    if (!initApp() || !firebase.auth) { resolveReady(state); return state; }
    state.db = firebase.database();
    state.enabled = true;
    try {
      const auth = firebase.auth();
      const user = await new Promise(resolve => {
        const off = auth.onAuthStateChanged(u => { off(); resolve(u); });
      });
      state.uid = (user || (await auth.signInAnonymously()).user).uid;
    } catch (e) {
      // Provider Anonymous belum diaktifkan, offline, atau diblokir: lanjut mode lokal.
      console.warn("[IDFLIX] Login anonymous gagal, memakai penyimpanan lokal.", e && e.code);
      state.uid = null;
    }
    state.ready = true;
    resolveReady(state);
    return state;
  }

  const userRef = path => state.db.ref("users/" + state.uid + (path ? "/" + path : ""));
  const online = () => state.enabled && state.uid && state.db;
  const safeId = id => String(id).replace(/[.#$\[\]\/]/g, "_");

  // Ambil data cloud sekali (dipakai untuk merge dengan data lokal saat startup).
  async function pull() {
    if (!online()) return { favorites: {}, progress: {} };
    try {
      const [f, p] = await Promise.all([userRef("favorites").get(), userRef("progress").get()]);
      return { favorites: f.val() || {}, progress: p.val() || {} };
    } catch (e) {
      console.warn("[IDFLIX] Gagal membaca data akun.", e && e.code);
      return { favorites: {}, progress: {} };
    }
  }

  function setFavorite(id, on, ts) {
    if (!online()) return;
    const ref = userRef("favorites/" + safeId(id));
    (on ? ref.set(ts || Date.now()) : ref.remove()).catch(() => {});
  }

  function saveProgress(id, meta) {
    if (!online() || !meta) return;
    userRef("progress/" + safeId(id))
      .set({ t: Math.round(meta.t), d: Math.round(meta.d), q: String(meta.q || "").slice(0, 16), updatedAt: meta.updatedAt || Date.now() })
      .catch(() => {});
  }

  // Dorong banyak entri sekaligus (merge awal).
  function pushAll(favorites, progress) {
    if (!online()) return;
    const up = {};
    Object.entries(favorites || {}).forEach(([id, ts]) => { up["favorites/" + safeId(id)] = ts; });
    Object.entries(progress || {}).forEach(([id, m]) => {
      up["progress/" + safeId(id)] = { t: Math.round(m.t), d: Math.round(m.d), q: String(m.q || "").slice(0, 16), updatedAt: m.updatedAt || Date.now() };
    });
    if (Object.keys(up).length) userRef().update(up).catch(() => {});
  }

  // Laporan link rusak / takedown. Satu laporan per film+kualitas+tipe per 6 jam per perangkat.
  async function report(movieId, type, quality) {
    const key = "idflix:rep:" + type + ":" + movieId + ":" + (quality || "");
    try {
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last < 6 * 3600 * 1000) return "duplicate";
    } catch (e) {}
    await ready;
    if (!online()) return "offline";
    try {
      const rec = { movieId: String(movieId), type, uid: state.uid, createdAt: Date.now() };
      if (quality) rec.quality = String(quality).slice(0, 16);
      await state.db.ref("reports").push(rec);
      try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
      return "ok";
    } catch (e) {
      return "error";
    }
  }

  window.IDFLIX_SYNC = { ready, state, start, pull, setFavorite, saveProgress, pushAll, report, initApp };
})();
