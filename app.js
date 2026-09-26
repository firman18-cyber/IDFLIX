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
  replay10:'<path d="M7.5 6.5A7 7 0 1 0 6 17"/><path d="M7.5 3v3.5H4"/><text x="12" y="16" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none">10</text>',
  forward10:'<path d="M16.5 6.5A7 7 0 1 1 18 17"/><path d="M16.5 3v3.5H20"/><text x="12" y="16" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none">10</text>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M19 13.2a7.4 7.4 0 0 0 0-2.4l1.5-1.1-1.8-3.1-1.8.7a7.6 7.6 0 0 0-2.1-1.2L14.5 4h-5l-.3 2.1A7.6 7.6 0 0 0 7.1 7.3l-1.8-.7-1.8 3.1L5 10.8a7.4 7.4 0 0 0 0 2.4l-1.5 1.1 1.8 3.1 1.8-.7a7.6 7.6 0 0 0 2.1 1.2l.3 2.1h5l.3-2.1a7.6 7.6 0 0 0 2.1-1.2l1.8.7 1.8-3.1z"/>',
  captions:'<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M7 12h4M13 12h4M7 15h3M14 15h3"/>',
  chevronDown:'<path d="M7 10l5 5 5-5"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>'

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

let favs = store.get(
  "idflix:favs",
  []
);

let progress = store.get(
  "idflix:progress",
  Object.fromEntries(
    FILMS
      .filter(f=>f.progress)
      .map(f=>[f.id,f.progress])
  )
);

let heroTimer;

const POSTER_WORKER =
  "https://idflix-bot1.firman-uke29.workers.dev";

/* =========================================================
   DATA
========================================================= */

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

  const poster =
    f.poster ||
    (
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

      videoUrl:
        typeof v === "string"
          ? v
          : String(
              v?.videoUrl ||
              v?.url ||
              ""
            ),

      telegramFileId:
        v?.telegramFileId ||
        v?.fileId ||
        "",

      subtitle:
        v?.subtitle ||
        null
    }))
    .filter(v=>v.videoUrl);

  /*
   * Kompatibilitas data lama
   */

  if(!videos.length && f.videoUrl){

    videos.push({
      quality:String(
        f.quality ||
        "Default"
      ),

      videoUrl:String(
        f.videoUrl
      ),

      telegramFileId:
        f.telegramFileId ||
        ""
    });

  }

  return {

    id,

    title:t,

    year:f.year || "",

    genre:
      g.length
        ? g
        : ["Lainnya"],

    duration:
      f.duration || "",

    rating:
      Number(f.rating) || 0,

    description:
      f.description || "",

    videoUrl:
      videos[0]?.videoUrl ||
      f.videoUrl ||
      "",

    videos,

    addedAt:
      f.addedAt || 0,

    /*
     * Jika backdrop kosong,
     * otomatis gunakan poster.
     */

    poster,

    backdrop:
      f.backdrop ||
      poster,

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

  firebase.initializeApp(c);

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
                  (progress[f.id] || 0) *
                  100
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

  <p>
    ${f.year} • ${f.genre[0]}
  </p>

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

  const cont =
    films.filter(
      f =>
        progress[f.id] > 0 &&
        progress[f.id] < 1
    );

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

  const list =
    g
      ? films.filter(
          f =>
            f.genre.includes(g)
        )
      : films;

  return `

<h1 class="page-title">
  ${g || "Semua Film"}
</h1>

<section class="sec">

  ${chips(g,"#/movies")}

</section>

<section class="sec">

  ${
    list.length
      ? grid(list)
      : empty(
          "film",
          "Belum ada film",
          `Belum ada film di genre ${g}.`
        )
  }

</section>

`;

};


/* =========================================================
   CATEGORY
========================================================= */

const categories = () => `

<h1 class="page-title">
  Kategori
</h1>

<section class="sec">

  <div class="tiles">

    ${
      GENRES
        .map(
          (g,i)=>`

            <a
              class="tile"
              style="
                background:
                linear-gradient(
                  135deg,
                  ${tileColors[i%9]},
                  #0d0d14
                )
              "
              href="#/movies?g=${g}"
            >

              ${g}

              <small>
                ${
                  films.filter(
                    f =>
                      f.genre.includes(g)
                  ).length
                }
                film
              </small>

            </a>

          `
        )
        .join("")
    }

  </div>

</section>

`;


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

<h1 class="page-title">

  ${
    term
      ? `Hasil untuk “${esc(q.get("q"))}”`
      : "Cari Film"
  }

</h1>

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

    ? `

      ${empty(
        "search",
        "Mulai mencari",
        "Ketik judul, genre, atau tahun rilis film."
      )}

      <div class="sec">

        <div class="sec-head">
          <h2>
            Telusuri genre
          </h2>
        </div>

        ${chips("","#/movies")}

      </div>

    `

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

  const cont =
    films.filter(
      f =>
        progress[f.id] > 0
    );

  return `

<h1 class="page-title">
  Profil
</h1>

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
          Tonton
        </a>

        ${favBtn(f)}

      </div>

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
  return "";
}


/* =========================================================
   WATCH PAGE
========================================================= */

function watch(id){

  const f = byId(id);

  if(!f)
    return notFound();

  const rel =
    films
      .filter(
        x =>
          x.id!==id
      )
      .slice(0,6);

  const first =
    f.videos?.[0]?.videoUrl ||
    f.videoUrl ||
    "";

  return `

<div class="watch">

  <div>

    <div
      class="player"
      id="player"
    >

      <video
        id="vid"
        playsinline
        preload="metadata"
        poster="${f.backdrop}"
        src="${first}"
      ></video>

      <div
        class="player-dim"
        id="playerDim"
        aria-hidden="true"
      ></div>

      <div class="player-topbar" id="playerTopbar">
        <button
          type="button"
          class="player-back"
          id="playerBack"
          aria-label="Kembali"
          title="Kembali"
        >
          ${ic("back")}
        </button>
        <div class="player-brand" aria-label="IDFLIX">
          <span class="brand-id">ID</span><span class="brand-flix">FLIX</span>
        </div>
        <span class="player-top-divider" aria-hidden="true"></span>
        <div class="player-title">${esc(f.title)}</div>
      </div>

      <div
        class="center-controls"
        id="centerControls"
      >
        <button
          type="button"
          class="center-btn play-center"
          id="playBtn"
          aria-label="Putar"
          title="Putar"
        >
          ${ic("play")}
        </button>
      </div>

      <div
        class="player-loading"
        id="playerLoading"
        aria-hidden="true"
      >
        <span></span>
      </div>

      <div
        class="player-controls"
        id="playerControls"
      >
        <div class="seek-wrap">
          <span class="seek-track"></span>
          <span class="seek-fill" id="seekFill"></span>
          <input
            class="seek"
            id="seekBar"
            type="range"
            min="0"
            max="1000"
            value="0"
            step="1"
            aria-label="Posisi video"
          >
        </div>

        <div class="player-bottom-row">
          <div class="player-left-controls">
            <button
              type="button"
              class="player-btn player-skip-btn"
              id="rewindBtn"
              aria-label="Mundur 10 detik"
              title="Mundur 10 detik"
            >
              ${ic("replay10")}
            </button>

            <button
              type="button"
              class="player-btn player-skip-btn"
              id="forwardBtn"
              aria-label="Maju 10 detik"
              title="Maju 10 detik"
            >
              ${ic("forward10")}
            </button>

            <span class="player-time" id="playerTime">0:00 / 0:00</span>
          </div>

          <div class="player-right-controls">
            <div class="volume-wrap" id="volumeWrap">
              <button
                type="button"
                class="player-btn"
                id="muteBtn"
                aria-label="Bisukan"
                title="Bisukan"
              >
                ${ic("volumeOn")}
              </button>

              <div class="volume-popup" id="volumePopup">
                <input
                  class="volume"
                  id="volumeBar"
                  type="range"
                  min="0"
                  max="1"
                  value="1"
                  step="0.01"
                  aria-label="Volume"
                >
              </div>
            </div>

            <span class="player-divider" aria-hidden="true"></span>

            <div class="settings-wrap" id="settingsWrap">
              <button
                type="button"
                class="player-btn"
                id="settingsBtn"
                aria-label="Pengaturan"
                title="Pengaturan"
                aria-expanded="false"
              >
                ${ic("settings")}
              </button>

              <div class="settings-popup" id="settingsPopup" role="dialog" aria-label="Pengaturan video">
                <div class="settings-heading">Pengaturan</div>

                <div class="settings-section">
                  <div class="settings-label">Subtitle</div>
                  <div class="settings-options" id="subtitleOptions"></div>
                </div>

                <div class="settings-section">
                  <div class="settings-label">Kualitas</div>
                  <div class="settings-options" id="qualityOptions"></div>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="player-btn"
              id="fullscreenBtn"
              aria-label="Layar penuh"
              title="Layar penuh"
            >
              ${ic("expand")}
            </button>
          </div>
        </div>
      </div>

      <div class="err">

        <div>

          <b>
            Video tidak dapat diputar
          </b>

          <br>

          Periksa koneksi internet atau pilih kualitas video lain.

        </div>

      </div>

    </div>


    <div class="watch-info">

      <h1>
        ${esc(f.title)}
      </h1>

      ${meta(f)}

      <p
        class="desc"
        style="margin-top:14px"
      >
        ${esc(f.description)}
      </p>

      <div class="actions">

        ${favBtn(f)}

        <a
          class="btn ghost"
          href="#/film/${f.id}"
        >
          Detail Film
        </a>

      </div>

    </div>

  </div>

  <aside class="side-list">

    <h2>
      Tonton Berikutnya
    </h2>

    ${
      rel
        .map(
          x=>`

            <a
              class="mini"
              href="#/watch/${x.id}"
            >

              <div class="th">

                <img
                  loading="lazy"
                  src="${x.backdrop}"
                  alt=""
                >

              </div>

              <div>

                <h3>
                  ${esc(x.title)}
                </h3>

                <p>
                  ${x.year} • ${x.genre[0]}
                </p>

              </div>

            </a>

          `
        )
        .join("")
    }

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

  const [
    seg,
    arg
  ] =
    path.split("/");

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

    watch:
      () =>
        watch(arg)

  };

  $("#view").innerHTML =
    (
      views[seg] ||
      notFound
    )();

  renderNav(
    seg || ""
  );

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
    bindPlayer(
      byId(arg)
    );

  if(
    seg==="search" &&
    matchMedia(
      "(max-width:639px)"
    ).matches &&
    !q.get("q")
  ){

    $("#pageSearch")
      ?.focus();

  }

}


/* =========================================================
   CUSTOM VIDEO PLAYER
========================================================= */

function bindPlayer(f){

  if(!f)
    return;

  const v =
    $("#vid");

  const p =
    $("#player");

  if(!v || !p)
    return;

  const playBtn =
    $("#playBtn");

  const seek =
    $("#seekBar");

  const seekFill =
    $("#seekFill");

  const timeEl =
    $("#playerTime");

  const muteBtn =
    $("#muteBtn");

  const volume =
    $("#volumeBar");

  const loading =
    $("#playerLoading");

  const fsBtn =
    $("#fullscreenBtn");

  const dim =
    $("#playerDim");

  const centerControls =
    $("#centerControls");

  const rewindBtn =
    $("#rewindBtn");

  const forwardBtn =
    $("#forwardBtn");

  const volumeWrap =
    $("#volumeWrap");

  const settingsWrap =
    $("#settingsWrap");

  const settingsBtn =
    $("#settingsBtn");

  const settingsPopup =
    $("#settingsPopup");

  const qualityOptions =
    $("#qualityOptions");

  const subtitleOptions =
    $("#subtitleOptions");

  const playerBack =
    $("#playerBack");

  const controlsBar =
    $("#playerControls");

  let lastSave = 0;

  let hideTimer = null;

  let seekDragging = false;

  let volumeDragging = false;

  let activeQuality =
    f.videos?.[0]?.quality ||
    "default";

  let subtitleEnabled = false;


  /* -------------------------
     Time
  ------------------------- */

  const fmt = t => {

    if(
      !Number.isFinite(t) ||
      t<0
    )
      return "0:00";

    const sec =
      Math.floor(
        t % 60
      )
      .toString()
      .padStart(
        2,
        "0"
      );

    const min =
      Math.floor(
        t / 60
      );

    const hrs =
      Math.floor(
        min / 60
      );

    return hrs

      ? hrs +
        ":" +
        String(
          min % 60
        ).padStart(
          2,
          "0"
        ) +
        ":" +
        sec

      : min +
        ":" +
        sec;

  };


  const updateTime = () => {

    const d =
      Number.isFinite(
        v.duration
      )
        ? v.duration
        : 0;

    const c =
      Number.isFinite(
        v.currentTime
      )
        ? v.currentTime
        : 0;

    if(
      seek &&
      !seekDragging
    ){

      seek.value =
        d
          ? Math.round(
              c / d * 1000
            )
          : 0;

    }

    if(seekFill){

      seekFill.style.width =
        (
          d
            ? Math.min(
                100,
                c / d * 100
              )
            : 0
        ) + "%";

    }

    if(timeEl){

      timeEl.textContent =
        fmt(c) +
        " / " +
        fmt(d);

    }

  };


  /* -------------------------
     Play UI
  ------------------------- */

  const updatePlayUI = () => {

    if(!playBtn)
      return;

    playBtn.innerHTML =
      v.paused
        ? ic("play")
        : ic("pause");

    playBtn.setAttribute(
      "aria-label",
      v.paused
        ? "Putar"
        : "Jeda"
    );

    playBtn.title =
      v.paused
        ? "Putar"
        : "Jeda";

    p.classList.toggle(
      "paused",
      v.paused
    );

  };


  /* -------------------------
     Mute UI
  ------------------------- */

  const updateMuteUI = () => {

    if(!muteBtn)
      return;

    const muted =
      v.muted ||
      v.volume===0;

    muteBtn.innerHTML =
      muted
        ? ic("volumeOff")
        : ic("volumeOn");

    muteBtn.setAttribute(
      "aria-label",
      muted
        ? "Nyalakan suara"
        : "Bisukan"
    );

    muteBtn.title =
      muted
        ? "Nyalakan suara"
        : "Bisukan";

    if(
      volume &&
      !volumeDragging
    ){

      volume.value =
        muted
          ? 0
          : v.volume;

    }

  };


  /* -------------------------
     Visibilitas kontrol
     (auto-hide + klik area
     kosong)
  ------------------------- */

  const closeVolumePopup = () =>
    volumeWrap?.classList.remove(
      "open"
    );

  const closeSettingsPopup = () => {
    settingsWrap?.classList.remove("open");
    settingsBtn?.setAttribute("aria-expanded", "false");
  };

  const clearHideTimer = () => {

    if(hideTimer){

      clearTimeout(hideTimer);

      hideTimer = null;

    }

  };

  const scheduleHide = () => {

    clearHideTimer();

    if(!v.paused){

      hideTimer = setTimeout(
        () => {

          p.classList.remove(
            "controls-visible"
          );

          closeVolumePopup();
          closeSettingsPopup();

        },
        3000
      );

    }

  };

  const showControls = () => {

    p.classList.add(
      "controls-visible"
    );

    scheduleHide();

  };

  const hideControls = () => {

    p.classList.remove(
      "controls-visible"
    );

    closeVolumePopup();
    closeSettingsPopup();

    clearHideTimer();

  };

  /*
   * Reset timer auto-hide
   * setiap ada interaksi
   * dengan kontrol.
   */

  const keepAlive = () => {

    p.classList.add(
      "controls-visible"
    );

    scheduleHide();

  };

  const toggleControls = () => {

    closeVolumePopup();
    closeSettingsPopup();

    p.classList.contains(
      "controls-visible"
    )
      ? hideControls()
      : showControls();

  };


  /* -------------------------
     Settings
  ------------------------- */

  const getSubtitleMeta = quality => {

    const item =
      f.videos?.find(
        x =>
          String(x.quality) ===
          String(quality)
      );

    const raw =
      item?.subtitle ||
      null;

    if(!raw)
      return null;

    if(typeof raw === "string"){
      return {
        url:raw,
        language:"id",
        label:"Indonesia"
      };
    }

    const url =
      raw.url ||
      raw.src ||
      raw.subtitleUrl ||
      ((raw.fileId || raw.file_id) &&
        `${POSTER_WORKER}/subtitle/${encodeURIComponent(String(f.id))}/${encodeURIComponent(String(quality))}`) ||
      "";

    if(!url)
      return null;

    return {
      url,
      language:raw.language || raw.lang || "id",
      label:raw.label || (String(raw.language || raw.lang || "id").toLowerCase()==="id" ? "Indonesia" : String(raw.language || raw.lang)),
      format:raw.format || "vtt"
    };
  };

  const getCurrentSubtitle = () =>
    getSubtitleMeta(activeQuality);

  const renderQualityOptions = () => {

    if(!qualityOptions)
      return;

    const items =
      Array.isArray(f.videos)
        ? f.videos.filter(x => x?.videoUrl)
        : [];

    if(!items.length){
      qualityOptions.innerHTML =
        `<div class="settings-empty">Tidak tersedia</div>`;
      return;
    }

    qualityOptions.innerHTML =
      items.map(item => `
        <button
          type="button"
          class="settings-option ${String(item.quality)===String(activeQuality) ? "on" : ""}"
          data-settings-quality="${esc(item.quality)}"
        >
          <span>${esc(qualityLabel(item.quality))}</span>
          ${String(item.quality)===String(activeQuality) ? ic("check") : ""}
        </button>
      `).join("");
  };

  const renderSubtitleOptions = () => {

    if(!subtitleOptions)
      return;

    const meta = getCurrentSubtitle();

    subtitleOptions.innerHTML = `
      <button
        type="button"
        class="settings-option subtitle-option ${meta ? "" : "on"}"
        data-subtitle="off"
      >
        <span>Nonaktif</span>
        ${meta ? "" : ic("check")}
      </button>
      ${meta ? `
        <button
          type="button"
          class="settings-option subtitle-option on"
          data-subtitle="on"
        >
          <span>${esc(meta.label || "Indonesia")}</span>
          ${ic("check")}
        </button>
      ` : `
        <div class="settings-empty">Subtitle tidak tersedia</div>
      `}
    `;
  };

  const removeSubtitleTrack = () => {
    v.querySelectorAll("track[data-idflix-subtitle]")
      .forEach(track => track.remove());
  };

  const applySubtitle = enabled => {

    subtitleEnabled = !!enabled;

    removeSubtitleTrack();

    if(!subtitleEnabled)
      return;

    const meta = getCurrentSubtitle();

    if(!meta?.url)
      return;

    const track =
      document.createElement("track");

    track.kind = "subtitles";
    track.label = meta.label || "Indonesia";
    track.srclang = meta.language || "id";
    track.src = meta.url;
    track.default = true;
    track.dataset.idflixSubtitle = "1";

    v.appendChild(track);

    try{
      [...v.textTracks].forEach(t => {
        t.mode = "hidden";
      });
      const latest = v.textTracks[v.textTracks.length - 1];
      if(latest)
        latest.mode = "showing";
    }catch{}
  };

  const openSettings = () => {
    closeVolumePopup();
    renderQualityOptions();
    renderSubtitleOptions();
    settingsWrap?.classList.add("open");
    settingsBtn?.setAttribute("aria-expanded", "true");
    keepAlive();
  };

  const toggleSettings = () => {
    if(settingsWrap?.classList.contains("open"))
      closeSettingsPopup();
    else
      openSettings();
  };

  settingsBtn?.addEventListener("click", e => {
    e.stopPropagation();
    toggleSettings();
  });

  settingsPopup?.addEventListener("click", e => {
    e.stopPropagation();

    const qualityBtn =
      e.target.closest("[data-settings-quality]");

    if(qualityBtn){
      const quality =
        qualityBtn.dataset.settingsQuality;

      const item =
        f.videos?.find(
          x => String(x.quality)===String(quality)
        );

      if(!item?.videoUrl)
        return;

      const wasPlaying = !v.paused;
      saveProgress();
      activeQuality = quality;

      setSource(
        item.videoUrl,
        quality,
        wasPlaying
      );

      renderQualityOptions();
      renderSubtitleOptions();
      applySubtitle(subtitleEnabled && !!getCurrentSubtitle());
      closeSettingsPopup();
      keepAlive();
      return;
    }

    const subtitleBtn =
      e.target.closest("[data-subtitle]");

    if(subtitleBtn){
      const enabled =
        subtitleBtn.dataset.subtitle === "on";

      applySubtitle(enabled);
      renderSubtitleOptions();
      closeSettingsPopup();
      keepAlive();
    }
  });

  playerBack?.addEventListener("click", e => {
    e.stopPropagation();
    if(history.length > 1)
      history.back();
    else
      location.hash = "#/";
  });

  /* -------------------------
     Fullscreen
  ------------------------- */

  const updateFullscreenUI =
    () => {

      if(!fsBtn)
        return;

      const active =
        document.fullscreenElement===p ||
        document.webkitFullscreenElement===p;

      fsBtn.innerHTML =
        ic("expand");

      fsBtn.setAttribute(
        "aria-label",
        active
          ? "Keluar dari layar penuh"
          : "Layar penuh"
      );

      fsBtn.title =
        active
          ? "Keluar dari layar penuh"
          : "Layar penuh";

    };


  const isMobile =
    () =>
      /Android|iPhone|iPad|iPod|Mobile/i
        .test(
          navigator.userAgent || ""
        );


  const lockLandscape =
    async () => {

      if(!isMobile())
        return;

      try{

        if(
          screen.orientation?.lock
        ){

          await screen.orientation.lock(
            "landscape"
          );

        }

      }catch{}

    };


  const unlockOrientation =
    async () => {

      if(!isMobile())
        return;

      try{

        if(
          screen.orientation?.unlock
        ){

          screen.orientation.unlock();

        }

      }catch{}

    };


  const toggleFullscreen =
    async () => {

      try{

        const active =
          document.fullscreenElement ||
          document.webkitFullscreenElement;

        if(active){

          if(
            document.exitFullscreen
          ){

            await document.exitFullscreen();

          }else if(
            document.webkitExitFullscreen
          ){

            document.webkitExitFullscreen();

          }

          await unlockOrientation();

          return;

        }

        if(
          p.requestFullscreen
        ){

          await p.requestFullscreen();

          await lockLandscape();

        }else if(
          p.webkitRequestFullscreen
        ){

          p.webkitRequestFullscreen();

          await lockLandscape();

        }else if(
          v.webkitEnterFullscreen
        ){

          v.webkitEnterFullscreen();

        }

      }catch{}

    };


  /* -------------------------
     Save Progress
  ------------------------- */

  const saveProgress =
    () => {

      if(
        !v.duration ||
        !Number.isFinite(
          v.currentTime
        )
      )
        return;

      const value =
        Math.max(
          0,
          Math.min(
            1,
            v.currentTime /
            v.duration
          )
        );

      progress[
        f.id +
        ":" +
        activeQuality
      ] = value;

      /*
       * Global progress
       * digunakan card resume.
       */

      progress[f.id] =
        value;

      store.set(
        "idflix:progress",
        progress
      );

    };


  /* -------------------------
     Restore Progress
  ------------------------- */

  const restoreProgress =
    () => {

      if(!v.duration)
        return;

      const saved =
        progress[
          f.id +
          ":" +
          activeQuality
        ] ??
        progress[f.id] ??
        0;

      if(
        saved>0 &&
        saved<.99
      ){

        v.currentTime =
          Math.min(
            saved *
            v.duration,

            v.duration -
            .1
          );

      }

      updateTime();

    };


  /* -------------------------
     Source
  ------------------------- */

  const setSource =
    (
      url,
      quality,
      autoplay=false
    ) => {

      if(!url)
        return;

      activeQuality =
        quality ||
        "default";

      loading?.classList.add(
        "on"
      );

      p.classList.remove(
        "fail"
      );

      v.src = url;

      v.load();

      v.addEventListener(
        "loadedmetadata",

        () => {

          restoreProgress();

          loading?.classList.remove(
            "on"
          );

          if(autoplay){

            v.play()
              .catch(
                ()=>{}
              );

          }

        },

        {
          once:true
        }
      );

    };


  /* -------------------------
     Events
  ------------------------- */

  const togglePlay = () =>
    v.paused
      ? v.play().catch(()=>{})
      : v.pause();

  playBtn?.addEventListener(
    "click",
    () => {

      togglePlay();

      keepAlive();

    }
  );


  rewindBtn?.addEventListener(
    "click",
    () => {

      v.currentTime =
        Math.max(
          0,
          v.currentTime - 10
        );

      updateTime();

      keepAlive();

    }
  );


  forwardBtn?.addEventListener(
    "click",
    () => {

      v.currentTime =
        Math.min(
          v.duration ||
          Infinity,

          v.currentTime + 10
        );

      updateTime();

      keepAlive();

    }
  );


  /*
   * Klik area kosong video
   * (bukan tombol) hanya
   * toggle tampilan navigasi,
   * tidak play/pause.
   */

  v.addEventListener(
    "click",
    toggleControls
  );

  dim?.addEventListener(
    "click",
    toggleControls
  );

  /*
   * Klik di dalam kelompok
   * kontrol tidak dianggap
   * klik area kosong.
   */

  centerControls?.addEventListener(
    "click",
    e =>
      e.stopPropagation()
  );

  controlsBar?.addEventListener(
    "click",
    e =>
      e.stopPropagation()
  );


  seek?.addEventListener(
    "pointerdown",
    () => {

      seekDragging = true;

      keepAlive();

    }
  );

  [
    "pointerup",
    "pointercancel"
  ].forEach(
    ev =>
      seek?.addEventListener(
        ev,
        () => {

          seekDragging = false;

        }
      )
  );

  seek?.addEventListener(
    "input",
    () => {

      if(v.duration){

        v.currentTime =
          (
            Number(
              seek.value
            ) / 1000
          ) *
          v.duration;

      }

      if(seekFill){

        seekFill.style.width =
          (
            Number(
              seek.value
            ) / 10
          ) + "%";

      }

      updateTime();

      keepAlive();

    }
  );


  muteBtn?.addEventListener(
    "click",
    () => {

      v.muted =
        !v.muted;

      if(
        !v.muted &&
        v.volume===0
      ){

        v.volume=.7;

      }

      updateMuteUI();

      closeSettingsPopup();
      volumeWrap?.classList.toggle(
        "open"
      );

      keepAlive();

    }
  );


  volume?.addEventListener(
    "pointerdown",
    () => {

      volumeDragging = true;

    }
  );

  [
    "pointerup",
    "pointercancel"
  ].forEach(
    ev =>
      volume?.addEventListener(
        ev,
        () => {

          volumeDragging = false;

        }
      )
  );

  volume?.addEventListener(
    "input",
    () => {

      v.volume =
        Number(
          volume.value
        );

      v.muted =
        v.volume===0;

      updateMuteUI();

      keepAlive();

    }
  );


  fsBtn?.addEventListener(
    "click",
    () => {

      toggleFullscreen();

      keepAlive();

    }
  );


  v.addEventListener(
    "play",
    () => {

      updatePlayUI();

      scheduleHide();

    }
  );

  v.addEventListener(
    "pause",
    () => {

      updatePlayUI();

      clearHideTimer();

      p.classList.add(
        "controls-visible"
      );

    }
  );


  v.addEventListener(
    "loadedmetadata",
    () => {

      restoreProgress();

      updatePlayUI();

      updateMuteUI();

      updateTime();

    }
  );


  v.addEventListener(
    "loadeddata",
    () => {

      p.classList.remove(
        "fail"
      );

      loading?.classList.remove(
        "on"
      );

    }
  );


  v.addEventListener(
    "waiting",
    () =>
      loading?.classList.add(
        "on"
      )
  );


  v.addEventListener(
    "playing",
    () => {

      loading?.classList.remove(
        "on"
      );

      updatePlayUI();

    }
  );


  v.addEventListener(
    "canplay",
    () =>
      loading?.classList.remove(
        "on"
      )
  );


  v.addEventListener(
    "error",
    () => {

      loading?.classList.remove(
        "on"
      );

      p.classList.add(
        "fail"
      );

    }
  );


  v.addEventListener(
    "timeupdate",
    () => {

      updateTime();

      if(
        Date.now() -
        lastSave >=
        1000
      ){

        lastSave =
          Date.now();

        saveProgress();

      }

    }
  );


  v.addEventListener(
    "ended",
    () => {

      progress[
        f.id +
        ":" +
        activeQuality
      ] = 1;

      progress[f.id] =
        1;

      store.set(
        "idflix:progress",
        progress
      );

      updatePlayUI();

    }
  );


  /* -------------------------
     Fullscreen events
  ------------------------- */

  document.addEventListener(
    "fullscreenchange",
    async () => {

      updateFullscreenUI();

      const active =
        document.fullscreenElement===p ||
        document.webkitFullscreenElement===p;

      if(active)
        await lockLandscape();
      else
        await unlockOrientation();

    }
  );


  document.addEventListener(
    "webkitfullscreenchange",
    async () => {

      updateFullscreenUI();

      const active =
        document.fullscreenElement===p ||
        document.webkitFullscreenElement===p;

      if(active)
        await lockLandscape();
      else
        await unlockOrientation();

    }
  );


  /* -------------------------
     Quality
     Handled by Settings popup.
  ------------------------- */

  renderQualityOptions();
  renderSubtitleOptions();
  applySubtitle(!!getCurrentSubtitle());

  updatePlayUI();

  updateMuteUI();

  updateFullscreenUI();

  updateTime();

  /*
   * Video mulai dalam
   * keadaan paused,
   * jadi navigasi tampil
   * dari awal.
   */

  p.classList.add(
    "controls-visible"
  );

  loading?.classList.add(
    "on"
  );

}


/* =========================================================
   SEARCH
========================================================= */

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
      term
        ? `Hasil untuk “${val}”`
        : "Cari Film";

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

      liveSearch(v);

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

      favs =
        favs.includes(id)
          ? favs.filter(
              x=>x!==id
            )
          : [
              ...favs,
              id
            ];

      store.set(
        "idflix:favs",
        favs
      );

      const f =
        byId(id);

      if(f)
        fb.outerHTML =
          favBtn(f);

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

loadFilms()
  .then(router);