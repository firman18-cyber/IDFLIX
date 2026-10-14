/* IDFLIX — video player (F-05, F-06, F-09, F-10, F-11, F-12).
   Bergantung pada helper global dari app.js: $, ic, esc, qualityLabel, store,
   progressMeta, saveProgressMeta, markWatched, nextFilmFor, byId. */
"use strict";

let hlsLoader = null;
function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (hlsLoader) return hlsLoader;
  hlsLoader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js";
    s.onload = () => resolve(window.Hls);
    s.onerror = () => { hlsLoader = null; reject(new Error("hls.js gagal dimuat")); };
    document.head.appendChild(s);
  });
  return hlsLoader;
}

const QUALITY_NEED_MBPS = { "360p": .7, "480p": 1.2, "720p": 2.8, "1080p": 5, "1440p": 9, "2160p": 16 };
const QUALITY_WIDTH = { "360p": 640, "480p": 854, "720p": 1280, "1080p": 1920, "1440p": 2560, "2160p": 3840 };
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/* Pilih kualitas awal untuk mode Auto (MP4 multi-kualitas). `list` sudah urut naik. */
function pickAutoQuality(list) {
  if (list.length <= 1) return 0;
  const conn = navigator.connection || {};
  const coarse = matchMedia("(pointer:coarse)").matches;
  const dpr = window.devicePixelRatio || 1;
  const cap = Math.max(innerWidth, innerHeight) * dpr * 1.1;
  let mbps = Number(conn.downlink) || (coarse ? 4 : 10);
  if (conn.saveData) mbps = Math.min(mbps, 1.5);
  if (/2g/.test(conn.effectiveType || "")) mbps = Math.min(mbps, .6);
  else if (conn.effectiveType === "3g") mbps = Math.min(mbps, 1.5);
  let best = 0;
  list.forEach((v, i) => {
    const need = QUALITY_NEED_MBPS[v.quality];
    const w = QUALITY_WIDTH[v.quality];
    if (need == null) return;
    if (need <= mbps * .7 && (!w || w <= cap)) best = i;
  });
  return best;
}

const isHlsSource = item =>
  !!item && (/\.m3u8(\?|#|$)/i.test(item.videoUrl) || /^(hls|m3u8)$/i.test(String(item.format || "")));

function bindPlayer(f) {
  if (!f) return;
  const v = $("#vid"), p = $("#player");
  if (!v || !p) return;

  const el = id => p.querySelector("#" + id);
  const playBtn = el("playBtn"), seek = el("seekBar"), seekFill = el("seekFill"),
    seekBuffer = el("seekBuffer"), seekTip = el("seekTip"), seekWrap = p.querySelector(".seek-wrap"),
    curEl = el("playerCurrentTime"), durEl = el("playerDuration"), badge = el("qualityBadge"),
    muteBtn = el("muteBtn"), volume = el("volumeBar"), volumeWrap = el("volumeWrap"),
    loading = el("playerLoading"), fsBtn = el("fullscreenBtn"), ccBtn = el("ccBtn"),
    pipBtn = el("pipBtn"), settingsWrap = el("settingsWrap"), settingsBtn = el("settingsBtn"),
    settingsBody = el("settingsBody"), settingsPopup = el("settingsPopup"),
    subOverlay = el("subOverlay"), toastEl = el("playerToast"), skipL = el("skipL"), skipR = el("skipR"),
    nextCard = el("nextCard"), errMsg = el("errMsg"), playerBack = el("playerBack");

  const cleanups = [];
  const on = (target, ev, fn, opt) => { target.addEventListener(ev, fn, opt); cleanups.push(() => target.removeEventListener(ev, fn, opt)); };
  const track = (name, props) => window.IDFLIX_ANALYTICS && IDFLIX_ANALYTICS.track(name, Object.assign({ movieId: f.id, q: activeQuality }, props));

  const prefs = store.get("idflix:player", {});
  const savePrefs = () => store.set("idflix:player", prefs);

  const videos = Array.isArray(f.videos) ? f.videos.filter(x => x && x.videoUrl) : [];
  let activeIdx = 0, activeQuality = videos[0]?.quality || "default";
  let autoMode = prefs.quality ? prefs.quality === "auto" : true;
  let hls = null, hlsLevels = [], hlsLevel = -1;
  let subOn = false, subTrackEl = null, subSize = prefs.subSize || "m", subBg = prefs.subBg || "semi";
  let display = prefs.display || "fit", brightness = Number(prefs.brightness) || 100;
  let hideTimer = null, toastTimer = null, watchdog = null, seekDragging = false, volumeDragging = false;
  let seekFrom = 0, lastSave = 0, lastTick = 0, playedSecs = 0, watchedMarked = false;
  let stalls = [], pendingStart = 0, nextDismissed = false, ended = false, failures = 0;

  /* ---------- util ---------- */
  const fmt = t => {
    if (!Number.isFinite(t) || t < 0) return "0:00";
    const s = String(Math.floor(t % 60)).padStart(2, "0"), m = Math.floor(t / 60), h = Math.floor(m / 60);
    return h ? `${h}:${String(m % 60).padStart(2, "0")}:${s}` : `${m}:${s}`;
  };
  const toast = (msg, ms = 1600) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), ms);
  };
  const duration = () => (Number.isFinite(v.duration) ? v.duration : 0);

  /* ---------- progres (F-06) ---------- */
  const savePosition = () => {
    const d = duration();
    if (!d || !Number.isFinite(v.currentTime)) return;
    saveProgressMeta(f.id, ended ? d : v.currentTime, d, activeQuality);
    lastSave = Date.now();
  };
  const savedStart = () => {
    const m = progressMeta[f.id];
    return m && m.d > 0 && m.t > 5 && m.t / m.d < .99 ? m.t : 0;
  };

  /* ---------- tampilan kontrol ---------- */
  const closePopups = () => {
    volumeWrap?.classList.remove("open");
    settingsWrap?.classList.remove("open");
    settingsBtn?.setAttribute("aria-expanded", "false");
  };
  const clearHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } };
  const scheduleHide = () => {
    clearHide();
    if (!v.paused && !settingsWrap?.classList.contains("open")) {
      hideTimer = setTimeout(() => { p.classList.remove("controls-visible"); closePopups(); }, 3000);
    }
  };
  const showControls = () => { p.classList.add("controls-visible"); scheduleHide(); };
  const hideControls = () => { p.classList.remove("controls-visible"); closePopups(); clearHide(); };
  const toggleControls = () => (p.classList.contains("controls-visible") ? hideControls() : showControls());

  const updateTime = () => {
    const d = duration(), c = Number.isFinite(v.currentTime) ? v.currentTime : 0;
    if (seek && !seekDragging) seek.value = d ? Math.round(c / d * 1000) : 0;
    if (seekFill) seekFill.style.width = (d ? Math.min(100, c / d * 100) : 0) + "%";
    if (curEl) curEl.textContent = fmt(c);
    if (durEl) durEl.textContent = fmt(d);
    updateBuffer();
  };
  const updateBuffer = () => {
    const d = duration();
    if (!seekBuffer || !d) return;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime + .5 && v.buffered.end(i) >= end) end = v.buffered.end(i);
    }
    seekBuffer.style.width = Math.min(100, end / d * 100) + "%";
  };
  const updatePlayUI = () => {
    if (!playBtn) return;
    playBtn.innerHTML = v.paused ? ic("play") : ic("pause");
    playBtn.setAttribute("aria-label", v.paused ? "Putar" : "Jeda");
    playBtn.title = v.paused ? "Putar" : "Jeda";
    p.classList.toggle("paused", v.paused);
  };
  const updateMuteUI = () => {
    if (!muteBtn) return;
    const muted = v.muted || v.volume === 0;
    muteBtn.innerHTML = muted ? ic("volumeOff") : ic("volumeOn");
    muteBtn.setAttribute("aria-label", muted ? "Nyalakan suara" : "Bisukan");
    muteBtn.title = muted ? "Nyalakan suara" : "Bisukan";
    if (volume && !volumeDragging) volume.value = muted ? 0 : v.volume;
  };

  /* ---------- seek ---------- */
  const seekTo = (t, method) => {
    const d = duration();
    const from = v.currentTime;
    v.currentTime = Math.max(0, Math.min(d || Infinity, t));
    ended = false;
    updateTime();
    track("seek", { from: Math.round(from), to: Math.round(v.currentTime), method });
  };
  const skipBy = (delta, method) => {
    seekTo(v.currentTime + delta, method);
    const hint = delta < 0 ? skipL : skipR;
    if (hint) {
      hint.classList.remove("show"); void hint.offsetWidth; hint.classList.add("show");
    }
    showControls();
  };

  /* ---------- subtitle (overlay sendiri agar ukuran/latar bisa diatur) ---------- */
  const subtitleFor = quality => {
    const item = videos.find(x => String(x.quality) === String(quality));
    const raw = item?.subtitle;
    if (!raw) return null;
    if (typeof raw === "string") return { url: raw, language: "id", label: "Indonesia" };
    const lang = raw.language || raw.lang || "id";
    const url = raw.url || raw.src || raw.subtitleUrl ||
      ((raw.fileId || raw.file_id) && `${POSTER_WORKER}/subtitle/${encodeURIComponent(String(f.id))}/${encodeURIComponent(String(quality))}`) || "";
    if (!url) return null;
    return { url, language: lang, label: raw.label || (String(lang).toLowerCase() === "id" ? "Indonesia" : String(lang)) };
  };
  const renderCue = () => {
    if (!subOverlay) return;
    const tt = subTrackEl?.track;
    const cues = tt && tt.activeCues ? [...tt.activeCues] : [];
    subOverlay.replaceChildren(...cues.map(c => {
      const d = document.createElement("div");
      d.appendChild(c.getCueAsHTML());
      return d;
    }));
  };
  const removeSubtitle = () => {
    subTrackEl?.remove();
    subTrackEl = null;
    subOverlay?.replaceChildren();
  };
  const applySubtitle = enabled => {
    subOn = !!enabled;
    removeSubtitle();
    updateCcUI();
    if (!subOn) return;
    const meta = subtitleFor(activeQuality);
    if (!meta) { subOn = false; updateCcUI(); return; }
    const t = document.createElement("track");
    t.kind = "subtitles"; t.label = meta.label; t.srclang = meta.language; t.src = meta.url;
    v.appendChild(t);
    subTrackEl = t;
    const bind = () => {
      if (!t.track) return;
      t.track.mode = document.pictureInPictureElement === v ? "showing" : "hidden";
      t.track.addEventListener("cuechange", renderCue);
    };
    bind();
    t.addEventListener("load", renderCue, { once: true });
  };
  const applySubtitleStyle = () => {
    if (!subOverlay) return;
    subOverlay.dataset.size = subSize;
    subOverlay.dataset.bg = subBg;
  };
  const updateCcUI = () => {
    if (!ccBtn) return;
    const has = !!subtitleFor(activeQuality);
    ccBtn.hidden = !has;
    ccBtn.classList.toggle("on", subOn);
    ccBtn.setAttribute("aria-pressed", String(subOn));
    ccBtn.setAttribute("aria-label", subOn ? "Matikan subtitle" : "Nyalakan subtitle");
    ccBtn.title = subOn ? "Matikan subtitle (C)" : "Nyalakan subtitle (C)";
  };

  /* ---------- tampilan video ---------- */
  const applyDisplay = () => {
    p.classList.toggle("video-fill", display === "fill");
    p.classList.toggle("video-stretch", display === "stretch");
    v.style.filter = brightness === 100 ? "" : `brightness(${brightness / 100})`;
  };

  /* ---------- sumber video: MP4 / HLS ---------- */
  const destroyHls = () => { if (hls) { try { hls.destroy(); } catch (e) {} hls = null; } hlsLevels = []; hlsLevel = -1; };
  const failPlayback = (code, detail) => {
    clearTimeout(watchdog);
    loading?.classList.remove("on");
    p.classList.add("fail");
    failures++;
    track("error", { code: String(code || "unknown"), detail: detail ? String(detail).slice(0, 60) : undefined });
    hideControls();
  };
  const armWatchdog = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => { if (v.readyState < 2) failPlayback("timeout"); }, 25000);
  };
  const setSource = async (idx, { autoplay = false, startAt = 0 } = {}) => {
    const item = videos[idx];
    if (!item) { failPlayback("no_source"); return; }
    activeIdx = idx;
    activeQuality = item.quality;
    pendingStart = startAt;
    ended = false;
    p.classList.remove("fail");
    nextCard?.classList.remove("on");
    loading?.classList.add("on");
    destroyHls();
    removeSubtitle();
    armWatchdog();
    if (badge) badge.textContent = autoMode && videos.length > 1 ? `Auto · ${qualityLabel(activeQuality)}` : qualityLabel(activeQuality);

    const start = () => { if (autoplay) v.play().catch(() => {}); };
    const once = () => {
      if (pendingStart > 0) { try { v.currentTime = Math.min(pendingStart, Math.max(0, duration() - .5)); } catch (e) {} }
      pendingStart = 0;
      if (subOn) applySubtitle(true);
      updateCcUI();
      start();
    };
    v.addEventListener("loadedmetadata", once, { once: true });

    if (isHlsSource(item)) {
      if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = item.videoUrl;
        v.load();
        return;
      }
      try {
        const Hls = await loadHls();
        if (!Hls || !Hls.isSupported()) throw new Error("HLS tidak didukung");
        if (videos[activeIdx] !== item) return;
        hls = new Hls({ capLevelToPlayerSize: true, startPosition: startAt > 0 ? startAt : -1 });
        let netRetries = 0, mediaRetried = false;
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hlsLevels = hls.levels.map((l, i) => ({ i, label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}k` }));
          hlsLevel = -1;
          if (videos.length === 1 && autoMode === false && prefs.hlsLevel != null) hls.currentLevel = prefs.hlsLevel;
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
          const l = hls.levels[d.level];
          if (l && badge && videos.length === 1) badge.textContent = hlsLevel === -1 ? `Auto · ${l.height ? l.height + "p" : "HD"}` : (l.height ? l.height + "p" : "HD");
        });
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR && netRetries++ < 2) { hls.startLoad(); return; }
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRetried) { mediaRetried = true; hls.recoverMediaError(); return; }
          failPlayback("hls_" + d.type, d.details);
        });
        hls.loadSource(item.videoUrl);
        hls.attachMedia(v);
      } catch (e) {
        failPlayback("hls_load", e && e.message);
      }
      return;
    }
    v.src = item.videoUrl;
    v.load();
  };

  /* Turunkan kualitas otomatis bila sering buffering (hanya mode Auto, MP4). */
  const maybeDowngrade = () => {
    if (!autoMode || videos.length < 2 || isHlsSource(videos[activeIdx]) || activeIdx === 0) return;
    const now = Date.now();
    stalls = stalls.filter(t => now - t < 60000);
    stalls.push(now);
    if (stalls.length >= 3) {
      stalls = [];
      const wasPlaying = !v.paused;
      savePosition();
      track("quality_change", { from: activeQuality, to: videos[activeIdx - 1].quality, reason: "auto_downgrade" });
      setSource(activeIdx - 1, { autoplay: wasPlaying, startAt: v.currentTime });
      toast(`Jaringan lambat, kualitas diturunkan ke ${qualityLabel(videos[activeIdx].quality)}`, 2600);
    }
  };

  const changeQuality = value => {
    const wasPlaying = !v.paused;
    const prev = activeQuality;
    const t = v.currentTime;
    savePosition();
    if (value === "auto") {
      autoMode = true;
      prefs.quality = "auto";
      savePrefs();
      if (videos.length === 1 && hls) { hls.currentLevel = -1; hlsLevel = -1; }
      else {
        const idx = pickAutoQuality(videos);
        if (idx !== activeIdx) setSource(idx, { autoplay: wasPlaying, startAt: t });
        else if (badge) badge.textContent = `Auto · ${qualityLabel(activeQuality)}`;
      }
    } else if (value.startsWith("lvl:")) {
      const lv = Number(value.slice(4));
      autoMode = false; hlsLevel = lv;
      prefs.quality = "manual"; prefs.hlsLevel = lv; savePrefs();
      if (hls) hls.currentLevel = lv;
      if (badge && hlsLevels[lv]) badge.textContent = hlsLevels[lv].label;
    } else {
      const idx = videos.findIndex(x => String(x.quality) === value);
      if (idx < 0) return;
      autoMode = false;
      prefs.quality = value; savePrefs();
      if (idx !== activeIdx) setSource(idx, { autoplay: wasPlaying, startAt: t });
    }
    track("quality_change", { from: prev, to: value, reason: "manual" });
  };

  /* ---------- panel Pengaturan ---------- */
  const seg = (name, items, current) => `<div class="seg" role="group">${items.map(([val, label]) =>
    `<button type="button" class="seg-btn${String(current) === String(val) ? " on" : ""}" data-set="${name}" data-val="${esc(val)}" aria-pressed="${String(current) === String(val)}">${esc(label)}</button>`).join("")}</div>`;
  const renderSettings = () => {
    if (!settingsBody) return;
    const sub = subtitleFor(activeQuality);
    let qualityItems;
    if (videos.length === 1 && hlsLevels.length > 1) {
      qualityItems = [["auto", "Auto"], ...[...hlsLevels].sort((a, b) => b.i - a.i).map(l => [`lvl:${l.i}`, l.label])];
    } else if (videos.length > 1) {
      qualityItems = [["auto", "Auto"], ...[...videos].reverse().map(x => [String(x.quality), qualityLabel(x.quality)])];
    } else {
      qualityItems = [];
    }
    const qCurrent = autoMode ? "auto" : (videos.length === 1 && hlsLevel >= 0 ? `lvl:${hlsLevel}` : String(activeQuality));
    settingsBody.innerHTML = `
      <div class="settings-section"><div class="settings-label">Tampilan</div>
        ${seg("display", [["fit", "Fit"], ["fill", "Fill"], ["stretch", "Stretch"]], display)}
        <label class="range-row"><span>Kecerahan</span><input type="range" id="brightnessBar" min="50" max="150" step="5" value="${brightness}" aria-label="Kecerahan"></label>
      </div>
      <div class="settings-section"><div class="settings-label">Subtitle</div>
        ${sub ? seg("sub", [["off", "Nonaktif"], ["on", sub.label]], subOn ? "on" : "off") : `<div class="settings-empty">Subtitle tidak tersedia</div>`}
        ${sub ? `<div class="sub-label">Ukuran</div>${seg("subsize", [["s", "Kecil"], ["m", "Sedang"], ["l", "Besar"]], subSize)}
        <div class="sub-label">Latar teks</div>${seg("subbg", [["none", "Tanpa"], ["semi", "Transparan"], ["solid", "Solid"]], subBg)}` : ""}
      </div>
      ${qualityItems.length ? `<div class="settings-section"><div class="settings-label">Resolusi</div>${seg("quality", qualityItems, qCurrent)}</div>` : ""}
      <div class="settings-section"><div class="settings-label">Kecepatan</div>
        ${seg("speed", SPEEDS.map(s => [s, s === 1 ? "Normal" : s + "×"]), v.playbackRate)}
      </div>`;
  };
  const openSettings = () => {
    volumeWrap?.classList.remove("open");
    renderSettings();
    // Batasi tinggi panel sesuai ruang di dalam player (player kecil / landscape HP).
    const bar = el("playerControls");
    const room = p.clientHeight - (bar ? bar.offsetHeight : 90) - 24;
    if (settingsPopup) settingsPopup.style.maxHeight = Math.max(150, Math.min(420, room)) + "px";
    settingsWrap?.classList.add("open");
    settingsBtn?.setAttribute("aria-expanded", "true");
    p.classList.add("controls-visible");
    clearHide();
  };
  const closeSettings = () => { closePopups(); scheduleHide(); };

  on(settingsBtn, "click", e => { e.stopPropagation(); settingsWrap.classList.contains("open") ? closeSettings() : openSettings(); });
  on(settingsPopup, "click", e => {
    e.stopPropagation();
    const b = e.target.closest("[data-set]");
    if (!b) return;
    const val = b.dataset.val;
    switch (b.dataset.set) {
      case "display": display = val; prefs.display = val; applyDisplay(); break;
      case "sub": applySubtitle(val === "on"); break;
      case "subsize": subSize = val; prefs.subSize = val; applySubtitleStyle(); break;
      case "subbg": subBg = val; prefs.subBg = val; applySubtitleStyle(); break;
      case "quality": changeQuality(val); break;
      case "speed": v.playbackRate = Number(val); break;
    }
    savePrefs();
    renderSettings();
  });
  on(settingsPopup, "input", e => {
    if (e.target.id === "brightnessBar") {
      brightness = Number(e.target.value);
      prefs.brightness = brightness;
      savePrefs();
      applyDisplay();
    }
  });
  on(document, "click", e => { if (settingsWrap?.classList.contains("open") && !settingsWrap.contains(e.target)) closeSettings(); });

  /* ---------- fullscreen & PiP ---------- */
  const isMobileUA = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  const fsActive = () => document.fullscreenElement === p || document.webkitFullscreenElement === p;
  const lockLandscape = async () => { if (isMobileUA()) try { await screen.orientation?.lock?.("landscape"); } catch (e) {} };
  const unlockOrientation = async () => { if (isMobileUA()) try { screen.orientation?.unlock?.(); } catch (e) {} };
  const updateFsUI = () => {
    if (!fsBtn) return;
    fsBtn.setAttribute("aria-label", fsActive() ? "Keluar dari layar penuh" : "Layar penuh");
    fsBtn.title = (fsActive() ? "Keluar dari layar penuh" : "Layar penuh") + " (F)";
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else document.webkitExitFullscreen?.();
        await unlockOrientation();
      } else if (p.requestFullscreen) { await p.requestFullscreen(); await lockLandscape(); }
      else if (p.webkitRequestFullscreen) { p.webkitRequestFullscreen(); await lockLandscape(); }
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    } catch (e) {}
  };
  const onFsChange = async () => { updateFsUI(); fsActive() ? await lockLandscape() : await unlockOrientation(); };
  on(document, "fullscreenchange", onFsChange);
  on(document, "webkitfullscreenchange", onFsChange);

  const pipSupported = !!(document.pictureInPictureEnabled && !v.disablePictureInPicture) || typeof v.webkitSetPresentationMode === "function";
  if (pipBtn) pipBtn.hidden = !pipSupported;
  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v.requestPictureInPicture && document.pictureInPictureEnabled) await v.requestPictureInPicture();
      else if (v.webkitSetPresentationMode) v.webkitSetPresentationMode(v.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
    } catch (e) {}
  };
  // Di jendela PiP, subtitle bawaan browser dipakai (overlay kita tidak ikut terbawa).
  on(v, "enterpictureinpicture", () => { if (subTrackEl?.track) subTrackEl.track.mode = "showing"; subOverlay?.replaceChildren(); });
  on(v, "leavepictureinpicture", () => { if (subTrackEl?.track) subTrackEl.track.mode = "hidden"; });

  /* ---------- kartu "Berikutnya" (F-10) ---------- */
  const nextFilm = nextFilmFor(f);
  const showNext = () => {
    if (!nextCard || !nextFilm || nextDismissed) return;
    nextCard.classList.add("on");
  };
  if (nextCard && nextFilm) {
    nextCard.innerHTML = `
      <img src="${esc(nextFilm.backdrop)}" alt="">
      <div class="next-info"><small>Berikutnya</small><b>${esc(nextFilm.title)}</b>
        <div class="next-actions"><a class="next-play" href="#/watch/${esc(nextFilm.id)}">${ic("play")} Putar</a>
        <button type="button" class="next-close" aria-label="Tutup">Nanti</button></div></div>`;
    on(nextCard, "click", e => {
      e.stopPropagation();
      if (e.target.closest(".next-close")) { nextDismissed = true; nextCard.classList.remove("on"); }
    });
  }

  /* ---------- gestur: ketuk 1× / ketuk 2× ---------- */
  const IGNORE = ".player-controls, .player-topbar, .center-controls, .player-btn, .settings-popup, .volume-popup, .next-card, .err, input, button, a";
  let lastTap = { t: 0, side: 0 }, tapTimer = null;
  on(p, "click", e => {
    if (!(e.target instanceof Element) || e.target.closest(IGNORE)) return;
    const r = p.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const side = x < .35 ? -1 : x > .65 ? 1 : 0;
    const now = Date.now();
    if (side && lastTap.side === side && now - lastTap.t < 300) {
      clearTimeout(tapTimer);
      lastTap = { t: now, side };
      skipBy(side * 10, "double_tap");
      return;
    }
    lastTap = { t: now, side };
    clearTimeout(tapTimer);
    const single = () => (matchMedia("(pointer:coarse)").matches ? toggleControls() : showControls());
    if (side) tapTimer = setTimeout(single, 280); else single();
  });
  // Hanya mouse/pen. Jangan pakai `mousemove`: di layar sentuh browser mengirimnya sebagai
  // event sintetis tepat sebelum `click`, sehingga ketuk 1× malah langsung menyembunyikan kontrol.
  on(p, "pointermove", e => { if (e.pointerType !== "touch") showControls(); }, { passive: true });
  on(p, "focusin", () => showControls());

  /* ---------- tombol & slider ---------- */
  const togglePlay = () => (v.paused ? v.play().catch(() => {}) : v.pause());
  on(playBtn, "click", () => { togglePlay(); showControls(); });
  on(muteBtn, "click", () => {
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = .7;
    updateMuteUI(); showControls();
  });
  on(volume, "pointerdown", () => { volumeDragging = true; });
  ["pointerup", "pointercancel"].forEach(ev => on(volume, ev, () => { volumeDragging = false; }));
  on(volume, "input", () => { v.volume = Number(volume.value); v.muted = v.volume === 0; updateMuteUI(); showControls(); });
  on(fsBtn, "click", () => { toggleFullscreen(); showControls(); });
  on(pipBtn, "click", () => { togglePip(); showControls(); });
  on(ccBtn, "click", () => { applySubtitle(!subOn); showControls(); });
  on(playerBack, "click", e => { e.stopPropagation(); history.length > 1 ? history.back() : (location.hash = "#/"); });

  on(seek, "pointerdown", () => { seekDragging = true; seekFrom = v.currentTime; showControls(); });
  ["pointerup", "pointercancel"].forEach(ev => on(seek, ev, () => { seekDragging = false; }));
  on(seek, "input", () => {
    if (duration()) v.currentTime = Number(seek.value) / 1000 * duration();
    ended = false;
    if (seekFill) seekFill.style.width = Number(seek.value) / 10 + "%";
    updateTime(); showControls();
  });
  on(seek, "change", () => track("seek", { from: Math.round(seekFrom), to: Math.round(v.currentTime), method: "slider" }));
  // Pratinjau waktu saat hover (desktop)
  on(seekWrap, "pointermove", e => {
    if (!seekTip || e.pointerType === "touch" || !duration()) return;
    const r = seekWrap.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seekTip.textContent = fmt(ratio * duration());
    seekTip.style.left = ratio * 100 + "%";
    seekTip.classList.add("on");
  });
  on(seekWrap, "pointerleave", () => seekTip?.classList.remove("on"));

  /* ---------- keyboard (F-11) ---------- */
  on(document, "keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
    if (tag === "INPUT" && t.type !== "range") return;
    if (tag === "BUTTON" && (e.key === " " || e.key === "Enter")) return; // biarkan klik bawaan
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    let handled = true;
    switch (k) {
      case " ": case "k": togglePlay(); break;
      case "ArrowLeft": skipBy(-5, "keyboard"); break;
      case "ArrowRight": skipBy(5, "keyboard"); break;
      case "ArrowUp": v.muted = false; v.volume = Math.min(1, v.volume + .05); updateMuteUI(); toast(`Volume ${Math.round(v.volume * 100)}%`); break;
      case "ArrowDown": v.volume = Math.max(0, v.volume - .05); updateMuteUI(); toast(`Volume ${Math.round(v.volume * 100)}%`); break;
      case "m": v.muted = !v.muted; updateMuteUI(); toast(v.muted ? "Suara dimatikan" : "Suara dinyalakan"); break;
      case "f": toggleFullscreen(); break;
      case "c": if (subtitleFor(activeQuality)) { applySubtitle(!subOn); toast(subOn ? "Subtitle aktif" : "Subtitle mati"); } else toast("Subtitle tidak tersedia"); break;
      case "Escape": if (settingsWrap?.classList.contains("open")) closeSettings(); else handled = false; break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); showControls(); }
  });

  /* ---------- event video ---------- */
  on(v, "play", () => { updatePlayUI(); scheduleHide(); lastTick = 0; track("play", { t: Math.round(v.currentTime) }); });
  on(v, "pause", () => {
    updatePlayUI(); clearHide(); p.classList.add("controls-visible");
    if (!v.ended) { savePosition(); track("pause", { t: Math.round(v.currentTime) }); }
  });
  on(v, "waiting", () => { loading?.classList.add("on"); if (!v.seeking && v.readyState < 3 && !v.paused) maybeDowngrade(); });
  on(v, "playing", () => { loading?.classList.remove("on"); clearTimeout(watchdog); failures = 0; updatePlayUI(); });
  on(v, "canplay", () => { loading?.classList.remove("on"); clearTimeout(watchdog); p.classList.remove("fail"); });
  on(v, "loadedmetadata", updateTime);
  on(v, "progress", updateBuffer);
  on(v, "durationchange", updateTime);
  on(v, "ratechange", () => { if (v.playbackRate !== 1) toast(`Kecepatan ${v.playbackRate}×`); });
  on(v, "volumechange", updateMuteUI);
  on(v, "error", () => {
    if (hls) return; // hls.js menangani error-nya sendiri
    failPlayback(v.error && v.error.code, v.error && v.error.message);
  });
  on(v, "timeupdate", () => {
    updateTime();
    const now = Date.now(), d = duration();
    if (!v.paused && !v.seeking) {
      if (lastTick) playedSecs += Math.min(2, (now - lastTick) / 1000);
      lastTick = now;
      if (!watchedMarked && playedSecs >= 60) { watchedMarked = true; markWatched(f.id); }
      if (now - lastSave >= 10000) savePosition();
    } else lastTick = 0;
    if (d > 30 && d - v.currentTime <= 15 && !v.ended) showNext();
  });
  on(v, "ended", () => {
    ended = true;
    savePosition();
    track("ended", { d: Math.round(duration()) });
    updatePlayUI();
    p.classList.add("controls-visible");
    showNext();
  });

  /* ---------- error: Coba lagi & Laporkan (F-09) ---------- */
  on(p.querySelector(".err"), "click", async e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "retry") {
      const t = v.currentTime || savedStart();
      setSource(activeIdx, { autoplay: true, startAt: t });
    } else if (b.dataset.act === "report") {
      b.disabled = true;
      const res = await IDFLIX_SYNC.report(f.id, "broken-link", activeQuality);
      const msg = { ok: "Terima kasih, laporan terkirim.", duplicate: "Laporan untuk video ini sudah kami terima.", offline: "Laporan belum bisa dikirim. Coba lagi nanti.", error: "Laporan belum bisa dikirim. Coba lagi nanti." }[res];
      if (errMsg) errMsg.textContent = msg;
      if (res === "offline" || res === "error") b.disabled = false;
    }
  });

  /* ---------- simpan saat keluar ---------- */
  const flush = () => savePosition();
  on(document, "visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  on(window, "pagehide", flush);

  window.__playerCleanup = () => {
    flush();
    clearTimeout(watchdog); clearTimeout(hideTimer); clearTimeout(toastTimer); clearTimeout(tapTimer);
    cleanups.forEach(fn => fn());
    destroyHls();
    unlockOrientation();
  };

  /* ---------- mulai ---------- */
  applyDisplay();
  applySubtitleStyle();
  updatePlayUI(); updateMuteUI(); updateFsUI(); updateTime(); updateCcUI();
  p.classList.add("controls-visible");

  let startIdx = 0;
  if (videos.length > 1) {
    if (!autoMode && prefs.quality && prefs.quality !== "manual") {
      const i = videos.findIndex(x => String(x.quality) === String(prefs.quality));
      startIdx = i >= 0 ? i : pickAutoQuality(videos);
      if (i < 0) autoMode = true;
    } else {
      autoMode = true;
      startIdx = pickAutoQuality(videos);
    }
  }
  const resume = savedStart();
  if (resume > 0) toast(`Dilanjutkan dari ${fmt(resume)}`, 2200);
  setSource(startIdx, { autoplay: false, startAt: resume });
}
