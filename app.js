/* IDFLIX — logika aplikasi. Routing berbasis hash:
   #/
   #/movies?g=Action
   #/search?q=
   #/film/id
   #/watch/id
*/

const $ = s => document.querySelector(s);

const I = {
  home:'<path d="M4 11l8-7 8 7v9H4z"/>',
  film:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  play:'<path d="M6 4l14 8-14 8z" fill="currentColor"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',
  back:'<path d="M15 6l-6 6 6 6"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  crown:'<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
  volumeOn:'<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.3 8.7a5 5 0 010 6.6"/><path d="M19 6a9 9 0 010 12"/>',
  volumeOff:'<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>',
  expand:'<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>',
  replay10:'<path d="M20 5l-8 7 8 7z" fill="currentColor"/><path d="M13 5l-8 7 8 7z" fill="currentColor"/>',
  forward10:'<path d="M4 5l8 7-8 7z" fill="currentColor"/><path d="M11 5l8 7-8 7z" fill="currentColor"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M19 13.2a7.4 7.4 0 0 0 0-2.4l1.5-1.1-1.8-3.1-1.8.7a7.6 7.6 0 0 0-2.1-1.2L14.5 4h-5l-.3 2.1A7.6 7.6 0 0 0 7.1 7.3l-1.8-.7-1.8 3.1L5 10.8a7.4 7.4 0 0 0 0 2.4l-1.5 1.1 1.8 3.1 1.8-.7a7.6 7.6 0 0 0 2.1 1.2l.3 2.1h5l.3-2.1a7.6 7.6 0 0 0 2.1-1.2l1.8.7 1.8-3.1z"/>'
  ,cc:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.4 10.2a2.4 2.4 0 1 0 0 3.6M17.4 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  pip:'<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor"/>'
};

const ic = n => `<svg viewBox="0 0 24 24">${I[n]}</svg>`;

const store = {
  get:(k,d)=>{
    try{
      return JSON.parse(localStorage.getItem(k)) ?? d;
    }catch{
      return d;
    }
  },

  set:(k,v)=>{
    try{
      localStorage.setItem(k,JSON.stringify(v));
    }catch{}
  }
};

let films = FILMS;

let favs = store.get("idflix:favs", []);
let favTimes = store.get("idflix:favts", {});

/* Progres tonton (PRD 5): {t, d, q, updatedAt} per film.
   `progress` = fraksi turunan (t/d) untuk bar kartu dan rail Lanjutkan. */
let progressMeta = store.get("idflix:progress2", {});
let progress = {};

const rebuildProgress = () => {
  progress = {};
  Object.entries(progressMeta).forEach(([id, m]) => {
    if (m && m.d > 0) progress[id] = Math.max(0, Math.min(1, m.t / m.d));
  });
};
rebuildProgress();

/* ---------- Series: progres per episode ---------- */
const progKey = (f, ep) => (f.isSeries && ep ? `${f.id}:${ep.id}` : f.id);
const metaFrac = m => (m && m.d > 0 ? Math.max(0, Math.min(1, m.t / m.d)) : 0);

function latestEp(f){
  let best = null;
  (f.episodes || []).forEach(ep => {
    const m = progressMeta[progKey(f, ep)];
    if(m && (!best || (m.updatedAt || 0) > (best.m.updatedAt || 0))) best = { ep, m };
  });
  return best;
}

/* Episode yang diputar saat tombol Tonton/Lanjutkan ditekan. */
function resumeEp(f){
  if(!f.isSeries) return null;
  const l = latestEp(f);
  if(!l) return f.episodes[0] || null;
  if(metaFrac(l.m) < .99) return l.ep;
  return f.episodes[f.episodes.indexOf(l.ep) + 1] || l.ep;
}

const lastWatchedAt = f =>
  f.isSeries ? (latestEp(f)?.m.updatedAt || 0) : (progressMeta[f.id]?.updatedAt || 0);

/* Fraksi progres untuk bar kartu (series: episode terakhir yang belum selesai). */
const filmProgress = f => {
  if(!f.isSeries) return progress[f.id] || 0;
  const l = latestEp(f);
  const fr = l ? metaFrac(l.m) : 0;
  return fr < .99 ? fr : 0;
};

/* Tampil di rail "Lanjutkan Menonton". */
const isContinuing = f => {
  if(!f.isSeries){
    const p = progress[f.id] || 0;
    return p > 0 && p < 1;
  }
  const l = latestEp(f);
  if(!l) return false;
  return metaFrac(l.m) < .99 || f.episodes.indexOf(l.ep) < f.episodes.length - 1;
};

/* Objek siap-putar untuk player: film atau satu episode dari series. */
function playableFor(f, epId){
  if(!f) return null;
  let ep = null;
  if(f.isSeries) ep = f.episodes.find(e => e.id === epId) || resumeEp(f);
  const p = {
    ...f,
    ep,
    epId: ep ? ep.id : null,
    key: progKey(f, ep),
    videos: ep ? ep.videos : f.videos,
    thumb: (ep && ep.thumb) || f.backdrop
  };
  p.next = nextFor(p);
  return p;
}

/* Berikutnya: episode selanjutnya, atau film lain bila sudah episode terakhir. */
function nextFor(p){
  if(p.isSeries && p.ep){
    const n = p.episodes[p.episodes.indexOf(p.ep) + 1];
    if(n) return {
      href: `#/watch/${encodeURIComponent(p.id)}/${encodeURIComponent(n.id)}`,
      title: `${n.label}${n.title ? " · " + n.title : ""}`,
      image: n.thumb || p.backdrop
    };
  }
  const n = nextFilmFor(p);
  return n ? { href: `#/watch/${encodeURIComponent(n.id)}`, title: n.title, image: n.backdrop } : null;
}

function episodeRow(f, ep, highlight){
  const fr = metaFrac(progressMeta[progKey(f, ep)]);
  const done = fr >= .99;
  return `
<a class="ep${highlight ? " on" : ""}" href="#/watch/${encodeURIComponent(f.id)}/${encodeURIComponent(ep.id)}"${highlight ? ' aria-current="true"' : ""}>
  <div class="ep-thumb">
    <img loading="lazy" src="${esc(ep.thumb)}" alt="">
    ${fr > 0 && !done ? `<div class="bar"><i style="width:${Math.round(fr * 100)}%"></i></div>` : ""}
  </div>
  <div class="ep-info">
    <b>${esc(ep.label)}${ep.title ? ` · ${esc(ep.title)}` : ""}</b>
    <small>${[ep.duration, done ? "Selesai" : "", highlight ? "Sedang diputar" : ""].filter(Boolean).map(esc).join(" • ")}</small>
  </div>
</a>`;
}

function episodesSection(f, curEpId, compact){
  if(!f.episodes.length)
    return `<section class="eps"><div class="eps-head"><h2>Episode</h2></div><p class="eps-empty">Belum ada episode.</p></section>`;
  const cur = curEpId || resumeEp(f)?.id;
  const curSeason = f.episodes.find(e => e.id === cur)?.season ?? f.seasons[0];
  const tabs = f.seasons.length > 1
    ? `<div class="season-tabs" role="tablist">${f.seasons.map(n =>
        `<button type="button" role="tab" class="chip${n === curSeason ? " on" : ""}" data-season="${n}" aria-selected="${n === curSeason}">Musim ${n}</button>`).join("")}</div>`
    : "";
  const lists = f.seasons.map(n =>
    `<div class="ep-list" data-season-list="${n}"${n === curSeason ? "" : " hidden"}>${
      f.episodes.filter(e => e.season === n).map(e => episodeRow(f, e, !!curEpId && e.id === curEpId)).join("")
    }</div>`).join("");
  return `
<section class="eps${compact ? " compact" : ""}">
  <div class="eps-head"><h2>Episode</h2><span>${f.episodes.length} Eps</span></div>
  ${tabs}
  ${lists}
</section>`;
}

function saveProgressMeta(id, t, d, q){
  if(!(d > 0) || !(t >= 0)) return;
  // Abaikan posisi awal (<5 dtk) agar tidak menimpa progres lama saat film hanya dibuka sebentar.
  if(t < 5 && d - t > 5) return;
  const meta = { t: Math.round(t), d: Math.round(d), q: String(q || ""), updatedAt: Date.now() };
  progressMeta[id] = meta;
  rebuildProgress();
  store.set("idflix:progress2", progressMeta);
  window.IDFLIX_SYNC && IDFLIX_SYNC.saveProgress(id, meta);
}

/* Film dianggap "ditonton" setelah diputar >= 60 detik. */
function markWatched(id){
  const w = store.get("idflix:watched", []);
  if(!w.includes(id)){
    w.push(id);
    store.set("idflix:watched", w);
  }
}

/* Film berikutnya: utamakan yang segenre dan belum selesai. */
function nextFilmFor(f){
  const others = films.filter(x => x.id !== f.id);
  const unfinished = x => !(progress[x.id] >= .99);
  const sameGenre = others.filter(x => unfinished(x) && x.genre.some(g => f.genre.includes(g)));
  return sameGenre[0] || others.find(unfinished) || others[0] || null;
}

/* Gabungkan data lokal dengan akun anonim (UID yang sama dipakai ulang tiap kunjungan). */
async function syncAccount(){
  const S = window.IDFLIX_SYNC;
  if(!S) return;
  await S.ready;
  if(!S.state.uid) return;
  const cloud = await S.pull();
  const cf = cloud.favorites || {}, cp = cloud.progress || {};
  const pushFav = {}, pushProg = {};

  Object.entries(cf).forEach(([id, ts]) => {
    if(!favs.includes(id)) favs.push(id);
    favTimes[id] = favTimes[id] || ts;
  });
  favs.forEach(id => {
    favTimes[id] = favTimes[id] || Date.now();
    if(!(id in cf)) pushFav[id] = favTimes[id];
  });

  Object.entries(cp).forEach(([id, m]) => {
    const local = progressMeta[id];
    if(!local || (m.updatedAt || 0) > (local.updatedAt || 0)) progressMeta[id] = m;
  });
  Object.entries(progressMeta).forEach(([id, m]) => {
    const c = cp[id];
    if(!c || (m.updatedAt || 0) > (c.updatedAt || 0)) pushProg[id] = m;
  });

  store.set("idflix:favs", favs);
  store.set("idflix:favts", favTimes);
  store.set("idflix:progress2", progressMeta);
  rebuildProgress();
  S.pushAll(pushFav, pushProg);

  const h = location.hash;
  if(!h.startsWith("#/watch") && (h === "" || h === "#/" || h.startsWith("#/profile"))) router();
}

let heroTimer;

const POSTER_WORKER =
  "https://idflix-bot1.firman-uke29.workers.dev";

/*
 * Endpoint streaming Telegram dipisahkan dari URL poster.
 * Ubah satu konfigurasi ini jika domain backend streaming berubah.
 * URL eksternal dan URL streaming absolut yang lama tetap dipertahankan.
 */
const STREAM_BASE_URL = String(
  window.IDFLIX_STREAM_BASE_URL ||
  "https://idflix-teleplay-nodejs.dockhosting.dev"
).trim().replace(/\/+$/, "");

const QUALITY_ORDER = ["360p","480p","720p","1080p","1440p","2160p"];
const qualityRank = q => {
  const i = QUALITY_ORDER.indexOf(String(q).toLowerCase());
  return i < 0 ? 99 : i;
};

function resolveVideoUrl(rawUrl){
  const raw = String(rawUrl || "").trim();
  if(!raw) return "";

  // URL eksternal atau URL absolut lama tidak diubah.
  if(/^https?:\/\//i.test(raw) || /^blob:/i.test(raw) || /^data:/i.test(raw)){
    return raw;
  }

  // Format path eksplisit: /stream/819?token=... atau stream/819?token=...
  if(/^\/?stream\//i.test(raw)){
    return `${STREAM_BASE_URL}/${raw.replace(/^\/+/, "")}`;
  }

  // Format relatif yang disepakati: 819?token=...
  // ID hanya diterima sebagai satu segmen path; query dipertahankan.
  const match = raw.match(/^([^/?#]+)(\?[^#]*)?(#.*)?$/);
  if(match){
    const id = match[1];
    const query = match[2] || "";
    const hash = match[3] || "";
    return `${STREAM_BASE_URL}/stream/${encodeURIComponent(id)}${query}${hash}`;
  }

  // Fallback untuk path relatif yang tidak dikenal.
  return raw;
}

/* =========================================================
   DATA
========================================================= */

/* Series: movies/<id>/episodes/<epId> = {season, number, title, description?, duration?,
   thumbnail?|thumbnailFileId?, videos:{quality:{videoUrl,...}}}. Lihat SERIES.md. */
const mapVideos = raw => Object.entries(raw && typeof raw === "object" ? raw : {})
  .map(([quality, v]) => ({
    quality: String(quality),
    videoUrl: resolveVideoUrl(typeof v === "string" ? v : String(v?.videoUrl || v?.url || "")),
    telegramFileId: v?.telegramFileId || v?.fileId || "",
    format: String(v?.format || ""),
    provider: String(v?.provider || ""),
    subtitle: v?.subtitle || null
  }))
  .filter(v => v.videoUrl)
  .sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality));

function normEpisodes(filmId, raw, fallbackThumb){
  if(!raw || typeof raw !== "object") return [];
  const entries = Array.isArray(raw) ? raw.map((e, i) => [String(i), e]) : Object.entries(raw);
  const list = entries
    .filter(([, e]) => e && typeof e === "object")
    .map(([id, e], i) => {
      let videos = mapVideos(e.videos);
      if(!videos.length && (e.videoUrl || e.url)){
        videos = [{
          quality: String(e.quality || "Default"),
          videoUrl: resolveVideoUrl(e.videoUrl || e.url),
          telegramFileId: e.telegramFileId || "",
          format: String(e.format || ""),
          provider: String(e.provider || ""),
          subtitle: e.subtitle || null
        }];
      }
      const thumb =
        (typeof e.thumbnail === "string" && e.thumbnail.trim()) ||
        (typeof e.poster === "string" && e.poster.trim()) ||
        (e.thumbnailFileId ? `${POSTER_WORKER}/poster/${encodeURIComponent(String(e.thumbnailFileId))}` : "") ||
        fallbackThumb;
      return {
        id: String(id),
        season: Number(e.season) || 1,
        number: Number(e.number ?? e.episode) || i + 1,
        title: String(e.title || ""),
        description: String(e.description || ""),
        duration: String(e.duration || ""),
        thumb,
        videos
      };
    });
  list.sort((a, b) => a.season - b.season || a.number - b.number);
  const multi = new Set(list.map(e => e.season)).size > 1;
  list.forEach(e => { e.label = multi ? `S${e.season} Eps ${e.number}` : `Eps ${e.number}`; });
  return list;
}

const normalize = (id,f) => {

  const t = f.title || "Tanpa Judul";

  const g = Array.isArray(f.genre)
    ? f.genre
    : String(f.genre || "")
        .split(",")
        .map(x=>x.trim())
        .filter(Boolean);

  /*
   * Poster:
   * 1. poster
   * 2. posterFileId melalui Worker
   * 3. placeholder
   */

  /*
   * Artwork dipisahkan dengan tegas:
   * - posterFileId -> poster portrait untuk card/detail cover
   * - backdrop/backdropFileId -> backdrop landscape untuk hero/detail background
   *
   * Worker saat ini menyediakan endpoint /poster/<fileId>, sedangkan
   * backdropFileId belum punya endpoint proxy tersendiri. Karena itu
   * backdropFileId hanya disimpan sebagai metadata dan backdrop memakai
   * URL f.backdrop bila memang tersedia. Jika tidak ada, fallback ke poster.
   */

  const poster =
    (typeof f.poster === "string" && f.poster.trim())
      ? f.poster.trim()
      : (
          f.posterFileId
            ? `${POSTER_WORKER}/poster/${encodeURIComponent(String(f.posterFileId))}`
            : art(
                t,
                "#3a3a48",
                "#0f0f16",
                400,
                600
              )
        );

  const backdropFileId =
    f.backdropFileId
      ? String(f.backdropFileId)
      : "";

  const backdrop =
    (typeof f.backdrop === "string" && f.backdrop.trim())
      ? f.backdrop.trim()
      : (
          backdropFileId
            ? `${POSTER_WORKER}/backdrop/${encodeURIComponent(backdropFileId)}`
            : poster
        );

  /*
   * Video:
   *
   * videos:
   * {
   *   "720p": {
   *      videoUrl: "https://..."
   *   }
   * }
   */

  const rawVideos =
    f.videos &&
    typeof f.videos === "object"
      ? f.videos
      : {};

  const videos = Object.entries(rawVideos)
    .map(([quality,v])=>({
      quality:String(quality),

      videoUrl: resolveVideoUrl(
        typeof v === "string"
          ? v
          : String(
              v?.videoUrl ||
              v?.url ||
              ""
            )
      ),

      telegramFileId:
        v?.telegramFileId ||
        v?.fileId ||
        "",

      format: String(v?.format || ""),

      provider: String(v?.provider || ""),

      subtitle:
        v?.subtitle ||
        null
    }))
    .filter(v=>v.videoUrl)
    .sort((a,b)=>qualityRank(a.quality)-qualityRank(b.quality));

  /*
   * Kompatibilitas data lama
   */

  if(!videos.length && f.videoUrl){

    videos.push({
      quality:String(
        f.quality ||
        "Default"
      ),

      videoUrl:resolveVideoUrl(
        f.videoUrl
      ),

      telegramFileId:
        f.telegramFileId ||
        ""
    });

  }

  const episodes = normEpisodes(id, f.episodes, backdrop);
  const isSeries = f.type === "series" || episodes.length > 0;
  const seasons = [...new Set(episodes.map(e => e.season))];

  return {
    id,
    title:t,
    type: isSeries ? "series" : "movie",
    isSeries,
    episodes,
    seasons,

    year:f.year || "",

    genre:
      g.length
        ? g
        : ["Lainnya"],

    duration:
      f.duration ||
      (isSeries
        ? (episodes.length
            ? (seasons.length > 1 ? `${seasons.length} Musim · ${episodes.length} Eps` : `${episodes.length} Eps`)
            : "Serial")
        : ""),

    rating:
      Number(f.rating) || 0,

    description:
      f.description || "",

    videoUrl:
      videos[0]?.videoUrl ||
      resolveVideoUrl(f.videoUrl) ||
      "",

    videos,

    addedAt:
      f.addedAt || 0,

    /* Artwork tetap terpisah. */

    poster,

    backdrop,

    backdropFileId,

    /*
     * Support:
     * trailerUrl
     * trailer
     * previewUrl
     */

    trailerUrl:
      String(
        f.trailerUrl ||
        f.trailer ||
        f.previewUrl ||
        ""
      )
  };
};


films = FILMS.map(f => normalize(f.id, f));

/* =========================================================
   FIREBASE
========================================================= */

async function loadFilms(){

  const c =
    window.FIREBASE_CONFIG;

  if(
    !window.firebase ||
    !c ||
    /PROJECT/.test(
      c.databaseURL ||
      "PROJECT"
    )
  ){
    return films;
  }

  if(window.IDFLIX_SYNC) IDFLIX_SYNC.initApp();
  else if(!firebase.apps.length) firebase.initializeApp(c);

  return new Promise(resolve=>{

    let first = true;

    firebase
      .database()
      .ref("movies")
      .on(
        "value",
        snap=>{

          films =
            Object.entries(
              snap.val() || {}
            )
            .map(
              ([id,f]) =>
                normalize(id,f)
            )
            .sort(
              (a,b)=>
                b.addedAt -
                a.addedAt
            );

          if(first){

            first = false;

            resolve(films);

          }else if(
            !location.hash.startsWith(
              "#/watch"
            )
          ){

            router();

          }

        },

        ()=>{

          if(first){

            first = false;

            resolve(films);

          }

        }
      );

  });

}

const byId =
  id =>
    films.find(
      f=>f.id===id
    );

const esc = s =>
  String(s).replace(
    /[&<>"]/g,
    c=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;"
    }[c])
  );


/* =========================================================
   COMPONENT
========================================================= */

/*
 * Card biasa SELALU memakai poster portrait.
 * Hanya card.wide (mis. Lanjutkan Menonton) yang memakai backdrop landscape.
 */
const card = (
  f,
  opt={}
) => `

<a
  class="card ${opt.wide?"wide":""}"
  href="${
    opt.watch
      ? "#/watch/"
      : "#/film/"
  }${f.id}"
>

  <div class="poster">

    <img
      loading="lazy"
      class="card-image"
      src="${
        opt.wide
          ? f.backdrop
          : f.poster
      }"
      alt="Poster ${esc(f.title)}"
    >

    ${
      opt.wide
        ? ""
        : `
          <span class="rate">
            ${ic("star")}
            ${f.rating}
          </span>
        `
    }

    <div class="hov">
      <span>
        ${ic("play")}
      </span>
    </div>

    ${
      opt.bar
        ? `
          <div class="bar">
            <i
              style="
                width:${Math.round(
                  filmProgress(f) * 100
                )}%
              "
            ></i>
          </div>
        `
        : ""
    }

  </div>

  <h3>
    ${esc(f.title)}
  </h3>

  <p>${f.year} • ${f.isSeries ? "Series • " : ""}${f.genre[0]}</p>

</a>
`;

const section = (
  title,
  body,
  link
) => `

<section class="sec">

  <div class="sec-head">

    <h2>
      ${title}
    </h2>

    ${
      link
        ? `
          <a href="${link}">
            Lihat Semua
            ${ic("chev")}
          </a>
        `
        : ""
    }

  </div>

  ${body}

</section>
`;

const row = (
  list,
  opt={}
) => `

<div class="row">

  ${list
    .map(
      f=>card(f,opt)
    )
    .join("")}

</div>
`;

const grid = list => `

<div class="grid">

  ${list
    .map(f=>card(f))
    .join("")}

</div>
`;

const chips = (
  active,
  base
) => `

<div class="chips">

  ${
    ["Semua",...GENRES]
      .map(
        g=>`

        <a
          class="chip ${
            (active || "Semua")===g
              ? "on"
              : ""
          }"
          href="${
            base
          }${
            g==="Semua"
              ? ""
              : "?g="+g
          }"
        >
          ${g}
        </a>

      `
      )
      .join("")
  }

</div>
`;

const empty = (
  icon,
  t,
  d
) => `

<div class="empty">

  ${ic(icon)}

  <b>
    ${t}
  </b>

  ${d}

</div>
`;

const meta = f => `

<div class="meta">

  <span>
    ${f.year}
  </span>

  <i></i>

  <span>
    ${f.genre.join(" • ")}
  </span>

  <i></i>

  <span>
    ${f.duration}
  </span>

  <i></i>

  <span>
    ★ ${f.rating}
  </span>

</div>
`;

const favBtn = f => `

<button
  class="btn ghost ${
    favs.includes(f.id)
      ? "on"
      : ""
  }"
  data-fav="${f.id}"
>

  ${
    ic(
      favs.includes(f.id)
        ? "check"
        : "plus"
    )
  }

  ${
    favs.includes(f.id)
      ? "Di Favorit"
      : "Tambah ke Favorit"
  }

</button>
`;

const tileColors = [
  "#5b1219",
  "#1b2450",
  "#4d3d0d",
  "#3c1a55",
  "#0d4a45",
  "#4d2a12",
  "#1c3f5c",
  "#5c1a3d",
  "#2b3a1d"
];


/* Banner halus "Simpan progresmu" setelah 3 film ditonton (PRD 4). */
function saveBanner(){
  const watched = store.get("idflix:watched", []).length;
  const hiddenAt = store.get("idflix:bannerHide", 0);
  if(watched < 3 || Date.now() - hiddenAt < 7 * 864e5) return "";
  return `
<div class="save-banner" role="note">
  <div>
    <b>Simpan progresmu</b>
    <span>Kamu masuk sebagai Tamu. Favorit dan riwayat tontonan bisa hilang jika data browser dihapus atau kamu pindah perangkat. Fitur simpan ke akun segera hadir.</span>
  </div>
  <button type="button" class="banner-close" data-dismiss-banner aria-label="Tutup">Nanti</button>
</div>`;
}

/* Skeleton saat film dimuat (F-02). */
function skeleton(){
  const cards = n => Array.from({length:n},()=>`<div class="sk-card"><div class="sk sk-poster"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>`).join("");
  return `
<div class="skeleton-page" aria-busy="true" aria-label="Memuat">
  <div class="sk sk-hero"></div>
  <div class="sk sk-title"></div>
  <div class="sk-row">${cards(7)}</div>
  <div class="sk sk-title"></div>
  <div class="sk-row">${cards(7)}</div>
</div>`;
}

/* =========================================================
   HOME
========================================================= */

function home(){

  if(!films.length){

    return empty(
      "film",
      "Belum ada film",
      "Kirim video ke Telegram Bot untuk menambahkan film."
    );

  }

  const top =
    [...films]
      .sort(
        (a,b)=>
          b.rating -
          a.rating
      )
      .slice(0,5);

  const cont = films.filter(isContinuing).sort((a, b) => lastWatchedAt(b) - lastWatchedAt(a));

  const heroHTML = `

<section
  class="hero"
  id="hero"
  aria-label="Film unggulan"
>

  ${heroSlide(top[0])}

  <div class="dots">

    ${
      top
        .map(
          (_,i)=>`

            <button
              class="${i?"":"on"}"
              data-slide="${i}"
              aria-label="Slide ${i+1}"
            ></button>

          `
        )
        .join("")
    }

  </div>

</section>
`;

  startHero(top);

  return (

    heroHTML

    +

    saveBanner()

    +

    (
      cont.length
        ? section(
            "Lanjutkan Menonton",
            row(
              cont,
              {
                wide:1,
                bar:1,
                watch:1
              }
            ),
            "#/profile"
          )
        : ""
    )

    +

    section(
      "Film Terbaru",
      row(
        [...films].sort(
          (a,b)=>
            b.year-a.year
        )
      ),
      "#/movies"
    )

    +

    section(
      "Genre Pilihan",
      `
      <div class="chips">

        ${
          GENRES
            .map(
              g=>`

                <a
                  class="chip"
                  href="#/movies?g=${g}"
                >
                  ${g}
                </a>

              `
            )
            .join("")
        }

      </div>
      `
    )

    +

    section(
      "Film Populer",
      row(
        [...films].sort(
          (a,b)=>
            b.rating-a.rating
        )
      ),
      "#/movies"
    )

  
    +
    GENRES
      .map(g => [g, films.filter(f => f.genre.includes(g))])
      .filter(([, list]) => list.length >= 2)
      .slice(0, 5)
      .map(([g, list]) =>
        section(g, row(list), "#/movies?g=" + encodeURIComponent(g))
      )
      .join("")
);

}


function heroSlide(f){

  return `

<img
  class="hero-bg"
  src="${f.backdrop}"
  alt=""
>

<div class="hero-body">

  <span class="badge">
    FILM TERPOPULER
  </span>

  <h1>
    ${esc(f.title)}
  </h1>

  ${meta(f)}

  <p>
    ${esc(f.description)}
  </p>

  <div class="actions">

    <a
      class="btn primary"
      href="#/watch/${f.id}"
    >
      ${ic("play")}
      Tonton Sekarang
    </a>

    ${favBtn(f)}

  </div>

</div>
`;

}


function startHero(top){

  let i = 0;

  clearInterval(heroTimer);

  const show = n => {

    i = n;

    const h = $("#hero");

    if(!h)return;

    const d =
      h.querySelector(".dots");

    h.innerHTML =
      heroSlide(top[i]);

    h.appendChild(d);

    d
      .querySelectorAll("button")
      .forEach(
        (b,k)=>
          b.classList.toggle(
            "on",
            k===i
          )
      );

  };

  window.__slide = show;

  heroTimer =
    setInterval(
      () =>
        show(
          (i+1) %
          top.length
        ),
      6500
    );

}


/* =========================================================
   MOVIES
========================================================= */

const movies = q => {
  const g = q.get("g");
  const t = ["film", "series"].includes(q.get("t")) ? q.get("t") : "all";
  const so = ["rating", "az"].includes(q.get("s")) ? q.get("s") : "new";

  let list = g ? films.filter(f => f.genre.includes(g)) : films.slice();
  if(t === "film") list = list.filter(f => !f.isSeries);
  if(t === "series") list = list.filter(f => f.isSeries);

  const sorters = {
    new: (a, b) => (b.addedAt - a.addedAt) || ((Number(b.year) || 0) - (Number(a.year) || 0)),
    rating: (a, b) => b.rating - a.rating,
    az: (a, b) => a.title.localeCompare(b.title, "id")
  };
  list.sort(sorters[so]);

  const href = patch => {
    const o = { t, s: so, ...patch };
    const p = new URLSearchParams();
    if(g) p.set("g", g);
    if(o.t !== "all") p.set("t", o.t);
    if(o.s !== "new") p.set("s", o.s);
    const qs = p.toString();
    return "#/movies" + (qs ? "?" + qs : "");
  };
  const chip = (label, on, h) => `<a class="chip${on ? " on" : ""}" href="${h}">${label}</a>`;
  const what = t === "series" ? "series" : "film";

  return `
${g ? `<a class="back-link" href="#/categories">${ic("back")} Semua kategori</a>` : ""}
<h1 class="page-title">${g ? esc(g) : "Semua Film"}</h1>
<section class="sec filters">
  <div class="chips" role="group" aria-label="Jenis">
    ${[["all", "Semua"], ["film", "Film"], ["series", "Series"]].map(([v, l]) => chip(l, t === v, href({ t: v }))).join("")}
  </div>
  <div class="chips sort" role="group" aria-label="Urutkan">
    <span class="sort-label">Urutkan</span>
    ${[["new", "Terbaru"], ["rating", "Rating"], ["az", "A–Z"]].map(([v, l]) => chip(l, so === v, href({ s: v }))).join("")}
  </div>
</section>
<section class="sec">
  ${list.length
    ? grid(list)
    : empty("film", "Belum ada " + what, g ? `Belum ada ${what} di genre ${esc(g)}.` : `Belum ada ${what}.`)}
</section>
`;
};

/* =========================================================
   CATEGORY
========================================================= */

const categories = () => {
  const names = [...new Set([...GENRES, ...films.flatMap(f => f.genre)])];
  const items = names
    .map((g, i) => ({ g, i, n: films.filter(f => f.genre.includes(g)).length }))
    .filter(x => x.n > 0);
  return `
<h1 class="page-title">Kategori</h1>
<section class="sec">
  ${items.length
    ? `<div class="tiles">${items.map(({ g, i, n }) => `
      <a class="tile" style="background:linear-gradient(135deg,${tileColors[i % 9]},#0d0d14)" href="#/movies?g=${encodeURIComponent(g)}">
        <span class="tile-name">${esc(g)}</span>
        <small>${n} judul</small>
      </a>`).join("")}</div>`
    : empty("film", "Belum ada kategori", "Kategori muncul setelah ada film.")}
</section>
`;
};


/* =========================================================
   SEARCH
========================================================= */

function search(q){

  const term =
    (q.get("q") || "")
      .trim()
      .toLowerCase();

  const res =
    term
      ? films.filter(
          f =>
            (
              f.title +
              " " +
              f.genre.join(" ") +
              " " +
              f.year
            )
            .toLowerCase()
            .includes(term)
        )
      : [];

  return `

<label class="m-search">

  ${ic("search")}

  <input
    id="pageSearch"
    type="search"
    value="${esc(q.get("q") || "")}"
    placeholder="Cari film, judul, atau genre..."
    autocomplete="off"
  >

</label>

<div class="sec search-genres">
  <div class="sec-head"><h2>Genre</h2></div>
  ${chips("","#/movies")}
</div>

<h1 class="page-title">${term ? `Hasil untuk “${esc(q.get("q"))}”` : ""}</h1>

<section
  class="sec"
  id="results"
>

  ${resultsHTML(term,res)}

</section>

`;

}


const resultsHTML = (
  term,
  res
) =>

  !term
    ? `<p class="search-hint">${ic("search")}<span>Ketik judul, genre, atau tahun rilis film.</span></p>`

    : res.length

      ? grid(res)

      : empty(
          "search",
          "Tidak ada hasil",
          `Tidak ada film yang cocok dengan “${esc(term)}”. Coba kata kunci lain.`
        );


/* =========================================================
   PROFILE
========================================================= */

function profile(){

  const fl =
    films.filter(
      f =>
        favs.includes(f.id)
    );

  const cont = films.filter(f => lastWatchedAt(f) > 0).sort((a, b) => lastWatchedAt(b) - lastWatchedAt(a));

  return `

<h1 class="page-title">
  Profil
</h1>

<div class="profile-head">
  <div class="profile-avatar">${ic("user")}</div>
  <div>
    <b>Pengguna <span class="guest-pill">Tamu</span></b>
    <p>Favorit dan riwayat tersimpan di akun anonim perangkat ini. Data bisa hilang jika data browser dihapus atau kamu pindah perangkat.</p>
  </div>
</div>


${section(
  "Favorit Saya",

  fl.length
    ? grid(fl)
    : empty(
        "heart",
        "Belum ada favorit",
        "Tekan “Tambah ke Favorit” pada film untuk menyimpannya di sini."
      )
)}

${section(
  "Riwayat Tontonan",

  cont.length
    ? row(
        cont,
        {
          wide:1,
          bar:1,
          watch:1
        }
      )
    : empty(
        "clock",
        "Belum ada riwayat",
        "Film yang kamu tonton akan muncul di sini."
      )
)}

`;

}


/* =========================================================
   DETAIL
========================================================= */

const hasResume = f =>
  f.isSeries ? !!latestEp(f) : (progress[f.id] > .01 && progress[f.id] < .99);
const resumeLabel = f => {
  if(!hasResume(f)) return "Tonton Sekarang";
  const e = f.isSeries ? resumeEp(f) : null;
  return e ? `Lanjutkan ${e.label}` : "Lanjutkan";
};
const resumeBar = f => {
  const p = filmProgress(f);
  return p > .01 && p < .99
    ? `<div class="resume-bar" aria-label="Sudah ditonton ${Math.round(p * 100)}%"><i style="width:${Math.round(p * 100)}%"></i></div>`
    : "";
};

function detail(id){

  const f = byId(id);

  if(!f)
    return notFound();

  const rel =
    films
      .filter(
        x =>
          x.id!==id &&
          x.genre.some(
            g =>
              f.genre.includes(g)
          )
      )
      .slice(0,8);

  return `

<article class="detail">

  <a
    class="back"
    href="javascript:history.back()"
  >
    ${ic("back")}
    Kembali
  </a>

  <div class="detail-bg">

    <img
      src="${f.backdrop}"
      alt=""
    >

  </div>

  <div class="detail-body">

    <div class="cover">

      <img
        src="${f.poster}"
        alt="Poster ${esc(f.title)}"
      >

    </div>

    <div class="detail-info">

      <h1>
        ${esc(f.title)}
      </h1>

      ${meta(f)}

      <div class="tags">

        ${
          f.genre
            .map(
              g=>`

                <a
                  class="tag"
                  href="#/movies?g=${g}"
                >
                  ${g}
                </a>

              `
            )
            .join("")
        }

      </div>

      <p class="desc">
        ${esc(f.description)}
      </p>

      <div class="actions">

        <a
          class="btn primary"
          href="#/watch/${f.id}"
        >
          ${ic("play")}
          ${resumeLabel(f)}
        </a>
        ${favBtn(f)}
      </div>
      ${resumeBar(f)}
      ${f.isSeries ? episodesSection(f, null) : ""}

      ${
        f.trailerUrl
          ? `

            <div class="trailer">

              <div class="trailer-head">

                <h2>
                  Trailer / Preview
                </h2>

              </div>

              <div class="trailer-box">

                <video
                  playsinline
                  preload="metadata"
                  poster="${f.backdrop}"
                  src="${esc(f.trailerUrl)}"
                  controls
                ></video>

              </div>

            </div>

          `
          : ""
      }

      <div class="facts">

        <div>
          <small>
            Tahun
          </small>
          ${f.year}
        </div>

        <div>
          <small>
            Durasi
          </small>
          ${f.duration}
        </div>

        <div>
          <small>
            Rating
          </small>
          ★ ${f.rating}/10
        </div>

        <div>
          <small>
            Genre
          </small>
          ${f.genre[0]}
        </div>

      </div>

    </div>

  </div>

  ${
    rel.length
      ? section(
          "Film Serupa",
          row(rel)
        )
      : ""
  }

</article>

`;

}


/* =========================================================
   QUALITY
========================================================= */

function qualityLabel(q){

  return String(q)
    .toLowerCase()
    .endsWith("p")
      ? String(q)
      : String(q);

}


function qualityControls(f){

  if(
    !f.videos ||
    f.videos.length < 2
  )
    return "";

  return `

<div class="quality-box">

  <div class="quality-title">
    Kualitas Video
  </div>

  <div class="quality-list">

    ${
      f.videos
        .map(
          (v,i)=>`

            <button
              type="button"
              class="quality-btn ${
                i===0
                  ? "on"
                  : ""
              }"
              data-quality="${esc(v.quality)}"
            >
              ${esc(
                qualityLabel(
                  v.quality
                )
              )}
            </button>

          `
        )
        .join("")
    }

  </div>

</div>

`;

}


/* =========================================================
   WATCH PAGE
========================================================= */

function watch(id, epId){

  const f = byId(id);

  if(!f)
    return notFound();

  const cur = playableFor(f, epId);

  const rel = films.filter(x => x.id!==id).slice(0,6);

  return `

<div class="watch">

  <div>

    <div class="player" id="player">

      <video id="vid" playsinline preload="metadata" poster="${esc(cur.thumb)}"></video>

      <div class="player-dim" id="playerDim" aria-hidden="true"></div>

      <div class="sub-overlay" id="subOverlay" data-size="m" data-bg="semi" aria-hidden="true"></div>

      <div class="skip-hint left" id="skipL" aria-hidden="true">${ic("replay10")}<span>10 dtk</span></div>
      <div class="skip-hint right" id="skipR" aria-hidden="true"><span>10 dtk</span>${ic("forward10")}</div>
      <div class="player-toast" id="playerToast" role="status" aria-live="polite"></div>

      <div class="player-topbar" id="playerTopbar">
        <button type="button" class="player-back" id="playerBack" aria-label="Kembali" title="Kembali">${ic("back")}</button>
        <div class="player-titleblock">
          <div class="player-title">${esc(f.title)}</div>
          <div class="player-episode">${esc(cur.ep ? `${cur.ep.label}${cur.ep.title ? " · " + cur.ep.title : ""}` : (f.episodeInfo || (f.year ? `Film · ${f.year}` : "Film")))}</div>
        </div>
      </div>

      <div class="center-controls" id="centerControls">
        <button type="button" class="center-btn play-center" id="playBtn" aria-label="Putar" title="Putar">${ic("play")}</button>
      </div>

      <div class="player-loading" id="playerLoading" aria-hidden="true"><span></span></div>

      <div class="next-card" id="nextCard"></div>

      <div class="player-controls" id="playerControls">
        <div class="progress-row">
          <span class="player-current-time" id="playerCurrentTime">0:00</span>
          <div class="seek-wrap">
            <span class="seek-track"></span>
            <span class="seek-buffer" id="seekBuffer"></span>
            <span class="seek-fill" id="seekFill"></span>
            <span class="seek-tip" id="seekTip" aria-hidden="true">0:00</span>
            <input class="seek" id="seekBar" type="range" min="0" max="1000" value="0" step="1" aria-label="Posisi video">
          </div>
          <span class="player-duration" id="playerDuration">0:00</span>
        </div>
        <div class="player-bottom-row">
          <div class="player-left-controls">
            <span class="quality-badge" id="qualityBadge">${esc(f.videos?.[0]?.quality || "HD")}</span>
          </div>
          <div class="player-right-controls">
            <button type="button" class="player-btn" id="ccBtn" aria-label="Nyalakan subtitle" title="Subtitle (C)" aria-pressed="false" hidden>${ic("cc")}</button>
            <div class="volume-wrap" id="volumeWrap">
              <button type="button" class="player-btn" id="muteBtn" aria-label="Bisukan" title="Bisukan (M)">${ic("volumeOn")}</button>
              <div class="volume-popup" id="volumePopup">
                <input class="volume" id="volumeBar" type="range" min="0" max="1" value="1" step="0.01" aria-label="Volume">
              </div>
            </div>
            <div class="settings-wrap" id="settingsWrap">
              <button type="button" class="player-btn" id="settingsBtn" aria-label="Pengaturan" title="Pengaturan" aria-expanded="false">${ic("settings")}</button>
              <div class="settings-popup" id="settingsPopup" role="dialog" aria-label="Pengaturan video">
                <div class="settings-heading">Pengaturan</div>
                <div id="settingsBody"></div>
              </div>
            </div>
            <button type="button" class="player-btn" id="pipBtn" aria-label="Picture-in-Picture" title="Picture-in-Picture" hidden>${ic("pip")}</button>
            <button type="button" class="player-btn" id="fullscreenBtn" aria-label="Layar penuh" title="Layar penuh (F)">${ic("expand")}</button>
          </div>
        </div>
      </div>

      <div class="err" role="alert">
        <div>
          <b>Video tidak dapat diputar</b>
          <p id="errMsg">Periksa koneksi internet atau pilih resolusi lain di Pengaturan.</p>
          <div class="err-actions">
            <button type="button" class="btn primary" data-act="retry">Coba lagi</button>
            <button type="button" class="btn ghost" data-act="report">Laporkan link rusak</button>
          </div>
        </div>
      </div>
    </div>

    <div class="watch-info">
      <h1>${esc(f.title)}</h1>
      ${cur.ep ? `<div class="now-ep"><b>${esc(cur.ep.label)}</b>${cur.ep.title ? ` · ${esc(cur.ep.title)}` : ""}</div>` : ""}
      ${meta(f)}
      <p class="desc" style="margin-top:14px">${esc((cur.ep && cur.ep.description) || f.description)}</p>
      <div class="actions">
        ${favBtn(f)}
        <a class="btn ghost" href="#/film/${f.id}">Detail Film</a>
      </div>
    </div>
  </div>

  <aside class="side-list${f.isSeries ? " side-eps" : ""}">
    ${f.isSeries ? episodesSection(f, cur.epId, true) : `
    <h2>Tonton Berikutnya</h2>
    ${rel.map(x=>`
      <a class="mini" href="#/watch/${x.id}">
        <div class="th"><img loading="lazy" src="${x.backdrop}" alt=""></div>
        <div>
          <h3>${esc(x.title)}</h3>
          <p>${x.year} • ${x.genre[0]}</p>
        </div>
      </a>`).join("")}`}
  </aside>

</div>
`;
}

const notFound = () =>
  empty(
    "film",
    "Film tidak ditemukan",
    `<br><a class="btn primary" href="#/">Kembali ke Beranda</a>`
  );


/* =========================================================
   NAVIGATION
========================================================= */

const NAV = [
  ["","Beranda","home"],
  ["movies","Film","film"],
  ["search","Cari","search"],
  ["categories","Kategori","grid"],
  ["profile","Profil","user"]
];


function renderNav(seg){

  const on =
    seg==="film" ||
    seg==="watch"
      ? ""
      : seg;

  $("#bottomNav").innerHTML =
    NAV
      .map(
        ([p,l,i])=>`

          <a
            href="#/${p}"
            class="${on===p?"on":""}"
            ${
              on===p
                ? 'aria-current="page"'
                : ""
            }
          >

            ${ic(i)}

            <span>
              ${l}
            </span>

          </a>

        `
      )
      .join("");

  $("#sidebar").innerHTML =

    `
    <a
      class="logo"
      href="#/"
    >

      <svg
        viewBox="0 0 24 24"
        style="
          fill:var(--red);
          stroke:none
        "
      >
        <path
          d="M4 3l17 9-17 9z"
        />
      </svg>

      <span>
        IDF<b>LIX</b>
      </span>

    </a>
    `

    +

    [
      ["","Beranda","home"],
      ["movies","Film","film"],
      ["categories","Kategori","grid"],
      ["profile","Favorit","heart"],
      ["profile","Riwayat","clock"]
    ]
    .map(
      ([p,l,i],k)=>`

        <a
          class="side-link ${
            on===p && k<4
              ? "on"
              : ""
          }"
          href="#/${p}"
        >

          ${ic(i)}
          ${l}

        </a>

      `
    )
    .join("")

    +

    `
      <div class="side-title">
        Genre
      </div>
    `

    +

    GENRES
      .slice(0,7)
      .map(
        g=>`

          <a
            class="side-link sm"
            href="#/movies?g=${g}"
          >
            ${g}
          </a>

        `
      )
      .join("")

    +

    `
      <div class="side-promo">
        ${ic("crown")}
        Nikmati pengalaman menonton tanpa batas
      </div>
    `;

}


/* =========================================================
   ROUTER
========================================================= */

function router(){

  if(window.__playerCleanup){
    window.__playerCleanup();
    window.__playerCleanup = null;
  }

  clearInterval(heroTimer);

  const [
    path,
    qs
  ] =
    location.hash
      .slice(2)
      .split("?");

  const q =
    new URLSearchParams(
      qs || ""
    );

  const [seg, arg, arg2raw] = path.split("/");
  const arg2 = arg2raw ? decodeURIComponent(arg2raw) : undefined;

  const views = {

    "":home,

    movies:
      () =>
        movies(q),

    categories,

    search:
      () =>
        search(q),

    profile,

    film:
      () =>
        detail(arg),

    watch: () => watch(arg, arg2)

  };

  $("#view").innerHTML =
    (
      views[seg] ||
      notFound
    )();

  renderNav(seg === "movies" && q.get("g") ? "categories" : (seg || ""));

  window.scrollTo(
    0,
    0
  );

  const ts =
    $("#topSearch");

  if(seg!=="search")
    ts.value="";
  else
    ts.value =
      q.get("q") || "";

  if(seg==="watch")
    bindPlayer(playableFor(byId(arg), arg2));

  if(
    seg==="search" &&
    matchMedia(
      "(max-width:699px)"
    ).matches &&
    !q.get("q")
  ){

    $("#pageSearch")
      ?.focus();

  }

}


/* Player: lihat player.js */


/* =========================================================
   SEARCH
========================================================= */

let searchTimer;

function liveSearch(val){

  const on =
    location.hash.startsWith(
      "#/search"
    );

  const url =
    "#/search" +
    (
      val
        ? "?q=" +
          encodeURIComponent(val)
        : ""
    );

  if(!on){

    location.hash =
      url;

    return;

  }

  history.replaceState(
    null,
    "",
    url
  );

  const term =
    val
      .trim()
      .toLowerCase();

  const res =
    term
      ? films.filter(
          f =>
            (
              f.title +
              " " +
              f.genre.join(" ") +
              " " +
              f.year
            )
            .toLowerCase()
            .includes(term)
        )
      : [];

  $("#results").innerHTML =
    resultsHTML(
      term,
      res
    );

  document
    .querySelector(
      ".page-title"
    )
    .textContent =
      term ? `Hasil untuk “${val}”` : "";

}


document.addEventListener(
  "input",
  e => {

    if(
      e.target.id==="topSearch" ||
      e.target.id==="pageSearch"
    ){

      const v =
        e.target.value;

      clearTimeout(searchTimer);
      searchTimer = setTimeout(
        () => liveSearch(v),
        250
      );

      const o =
        $("#topSearch");

      const m =
        $("#pageSearch");

      if(
        o &&
        o!==e.target
      )
        o.value=v;

      if(
        m &&
        m!==e.target
      )
        m.value=v;

    }

  }
);


/* =========================================================
   GLOBAL CLICK
========================================================= */

document.addEventListener(
  "click",
  e => {

    const fb =
      e.target.closest(
        "[data-fav]"
      );

    const dt =
      e.target.closest(
        "[data-slide]"
      );

    if(fb){

      const id =
        fb.dataset.fav;

      const adding = !favs.includes(id);

      favs = adding
        ? [...favs, id]
        : favs.filter(x=>x!==id);

      if(adding) favTimes[id] = Date.now();
      else delete favTimes[id];

      store.set("idflix:favs", favs);
      store.set("idflix:favts", favTimes);

      window.IDFLIX_SYNC &&
        IDFLIX_SYNC.setFavorite(id, adding, favTimes[id]);

      const f =
        byId(id);

      if(f)
        fb.outerHTML =
          favBtn(f);

      return;

    }
    const seasonBtn = e.target.closest("[data-season]");
    if(seasonBtn){
      const box = seasonBtn.closest(".eps");
      box.querySelectorAll("[data-season]").forEach(b => {
        const on = b === seasonBtn;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", String(on));
      });
      box.querySelectorAll("[data-season-list]").forEach(l => {
        l.hidden = l.dataset.seasonList !== seasonBtn.dataset.season;
      });
      return;
    }

    if(e.target.closest("[data-dismiss-banner]")){
      store.set("idflix:bannerHide", Date.now());
      e.target.closest(".save-banner")?.remove();
      return;
    }


    if(dt)
      window.__slide(
        +dt.dataset.slide
      );

  }
);


/* =========================================================
   START
========================================================= */

window.addEventListener(
  "hashchange",
  router
);

/* Skeleton langsung tampil; login anonymous berjalan paralel dengan pemuatan film. */
if(!location.hash.startsWith("#/watch")){
  $("#view").innerHTML = skeleton();
}

loadFilms()
  .then(router);

if(window.IDFLIX_SYNC){
  IDFLIX_SYNC.start().then(syncAccount);
}
