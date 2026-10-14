/* IDFLIX — analytics dasar (F-12).
   Event: play, pause, seek, error, quality_change, ended.
   Tanpa data pribadi: hanya movieId, kualitas, posisi, dan UID anonim (opsional).
   Pengiriman: set window.IDFLIX_ANALYTICS_URL (endpoint POST JSON, mis. route di Cloudflare Worker).
   Tanpa URL, event hanya masuk antrean memori + console.debug saat ?debug=1 — tidak ada data keluar. */
(function () {
  "use strict";
  const queue = [];
  const MAX = 200;
  const debug = /[?&]debug=1\b/.test(location.search) || /[?&]debug=1\b/.test(location.hash);
  const session = Math.random().toString(36).slice(2, 10);

  function endpoint() { return String(window.IDFLIX_ANALYTICS_URL || "").trim(); }

  function flush() {
    const url = endpoint();
    if (!url || !queue.length) return;
    const batch = queue.splice(0, queue.length);
    const body = JSON.stringify({ events: batch });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) return;
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    } catch (e) {}
  }

  function track(name, props) {
    const uid = window.IDFLIX_SYNC && window.IDFLIX_SYNC.state && window.IDFLIX_SYNC.state.uid;
    const ev = Object.assign({ name, ts: Date.now(), session, uid: uid || null }, props || {});
    queue.push(ev);
    if (queue.length > MAX) queue.shift();
    if (debug) console.debug("[IDFLIX:analytics]", ev);
  }

  setInterval(flush, 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);

  window.IDFLIX_ANALYTICS = { track, flush, queue };
})();
