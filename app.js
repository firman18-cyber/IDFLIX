/* IDFLIX — logika aplikasi. Routing berbasis hash: #/  #/movies?g=Action  #/search?q=  #/film/id  #/watch/id */
const $ = s => document.querySelector(s);
const I = {
  home:'<path d="M4 11l8-7 8 7v9H4z"/>', film:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', grid:'<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>', heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  play:'<path d="M6 4l14 8-14 8z" fill="currentColor"/>', plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="M5 12l5 5 9-10"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', chev:'<path d="M9 6l6 6-6 6"/>', back:'<path d="M15 6l-6 6 6 6"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', crown:'<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z"/>'
};
const ic = n => `<svg viewBox="0 0 24 24">${I[n]}</svg>`;
const store = {
  get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
};
let films = FILMS;                       // ← ganti dengan data Firebase di loadFilms()
let favs = store.get("idflix:favs", []);
let progress = store.get("idflix:progress", Object.fromEntries(FILMS.filter(f=>f.progress).map(f=>[f.id,f.progress])));
let heroTimer;

const normalize = (id,f) => {
  const t=f.title||"Tanpa Judul", g=Array.isArray(f.genre)?f.genre:String(f.genre||"").split(",").map(x=>x.trim()).filter(Boolean);
  const poster=f.poster||art(t,"#3a3a48","#0f0f16",400,600);
  const rawVideos=f.videos&&typeof f.videos==="object"?f.videos:{};
  const videos=Object.entries(rawVideos).map(([quality,v])=>({
    quality:String(quality),
    videoUrl:typeof v==="string"?v:String(v?.videoUrl||v?.url||""),
    telegramFileId:v?.telegramFileId||v?.fileId||""
  })).filter(v=>v.videoUrl);
  if(!videos.length && f.videoUrl) videos.push({quality:String(f.quality||"Default"),videoUrl:String(f.videoUrl),telegramFileId:f.telegramFileId||""});
  return {id,title:t,year:f.year||"",genre:g.length?g:["Lainnya"],duration:f.duration||"",rating:Number(f.rating)||0,description:f.description||"",videoUrl:videos[0]?.videoUrl||f.videoUrl||"",videos,addedAt:f.addedAt||0,poster,backdrop:f.backdrop||art(t,"#3a3a48","#0f0f16",1280,720)};
};
// Firebase Realtime Database (node "movies"), diisi oleh Telegram Bot.
// Konfigurasi Firebase ini bukan secret; private key/service account tidak pernah diletakkan di frontend.
const IDFLIX_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB2OExLs6ri2bmuI30FnAUGCDC8EVLimk",
  authDomain: "idflix-219d7.firebaseapp.com",
  databaseURL: "https://idflix-219d7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "idflix-219d7",
  storageBucket: "idflix-219d7.firebasestorage.app",
  messagingSenderId: "576659426224",
  appId: "1:576659426224:web:a804b3fded2b17f42de475"
};

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src=src; s.async=true;
    s.onload=resolve; s.onerror=()=>reject(new Error("Gagal memuat Firebase SDK."));
    document.head.appendChild(s);
  });
}

async function ensureFirebase(){
  if(window.firebase?.database) return window.firebase;
  if(!window.firebase) await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
  if(!window.firebase?.database) await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js");
  if(!window.firebase?.database) throw new Error("Firebase Database SDK tidak tersedia.");
  if(!window.firebase.apps?.length) window.firebase.initializeApp(IDFLIX_FIREBASE_CONFIG);
  return window.firebase;
}

async function loadFilms(){
  try{
    const fb = await ensureFirebase();

    return await new Promise(resolve=>{
      let first = true;

      fb.database().ref("movies").on("value", snap=>{
        const firebaseFilms = Object.entries(snap.val() || {})
          .map(([id, f]) => normalize(id, f || {}))
          .sort((a, b) =>
            Number(b.addedAt || 0) - Number(a.addedAt || 0)
          );

        // Jika Firebase punya minimal 1 film,
        // semua dummy otomatis dinonaktifkan.
        films = firebaseFilms.length > 0 ? firebaseFilms : FILMS;

        if(first){
          first = false;
          resolve(films);
        }else if(!location.hash.startsWith("#/watch")){
          router();
        }

      }, err=>{
        console.error("Firebase /movies:", err);

        // Firebase gagal dibaca → dummy tetap menjadi fallback.
        if(first){
          first = false;
          resolve(FILMS);
        }
      });
    });

  }catch(err){
    console.error("Firebase init:", err);

    // Firebase tidak tersedia → dummy fallback.
    return FILMS;
  }
}

function firebaseDebug(){
  const output = document.getElementById("firebaseDebugOutput");

  if(!output) return;

  output.textContent = "🟡 Memeriksa Firebase...\n";

  ensureFirebase()
    .then(fb=>{
      output.textContent +=
        "🟢 Firebase SDK: OK\n" +
        "🟢 Project: " + IDFLIX_FIREBASE_CONFIG.projectId + "\n" +
        "🟢 Database: " + IDFLIX_FIREBASE_CONFIG.databaseURL + "\n\n" +
        "🟡 Membaca /movies...\n";

      return new Promise(resolve=>{
        fb.database().ref("movies").once("value", snap=>{
          const data = snap.val();

          if(data === null){
            output.textContent +=
              "🟡 /movies: KOSONG\n\n" +
              "Firebase berhasil terhubung,\n" +
              "tetapi node /movies tidak memiliki data.\n\n" +
              "📺 Katalog aktif: DUMMY / FALLBACK\n" +
              "📦 films.length: " + films.length;
          }else if(typeof data === "object"){
            const entries = Object.entries(data);

            output.textContent +=
              "🟢 /movies: TERBACA\n" +
              "🎬 Jumlah film: " + entries.length + "\n\n";

            entries.slice(0,20).forEach(([id,f],i)=>{
              output.textContent +=
                `${i+1}. ${f?.title || "Tanpa Judul"}\n` +
                `   ID: ${id}\n\n`;
            });

            output.textContent +=
              "📺 Katalog aktif: " +
              (entries.length > 0 ? "FIREBASE" : "DUMMY / FALLBACK") +
              "\n" +
              "📦 films.length: " + films.length;
          }else{
            output.textContent +=
              "🔴 Format /movies tidak dikenali.";
          }

          resolve();
        },err=>{
          output.textContent +=
            "\n🔴 FIREBASE ERROR\n\n" +
            "Kode: " + (err?.code || "-") + "\n" +
            "Pesan: " + (err?.message || err) + "\n\n" +
            "📺 Katalog aktif: DUMMY / FALLBACK";

          resolve();
        });
      });
    })
    .catch(err=>{
      output.textContent =
        "🔴 FIREBASE INIT ERROR\n\n" +
        "Pesan:\n" +
        (err?.message || err) +
        "\n\n" +
        "📺 Katalog aktif: DUMMY / FALLBACK";
    });
}

function debugPage(){
  return `
    <h1 class="page-title">Firebase Debug</h1>

    <section class="sec">
      <pre
        id="firebaseDebugOutput"
        style="
          white-space:pre-wrap;
          word-break:break-word;
          background:#111;
          color:#fff;
          padding:16px;
          border-radius:12px;
          line-height:1.6;
          font-size:14px;
          overflow:auto;
        "
      >🟡 Menyiapkan pemeriksaan Firebase...</pre>

      <button
        class="btn primary"
        type="button"
        onclick="firebaseDebug()"
        style="margin-top:12px"
      >
        🔄 Cek Lagi
      </button>

      <a
        class="btn ghost"
        href="#/"
        style="margin-top:12px"
      >
        Kembali
      </a>
    </section>
  `;
}

const byId = id => films.find(f=>f.id===id);
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- Komponen ---------- */
const card = (f,opt={}) => `<a class="card ${opt.wide?"wide":""}" href="#/film/${f.id}">
  <div class="poster"><img loading="lazy" src="${opt.wide?f.backdrop:f.poster}" alt="Poster ${esc(f.title)}">
  ${opt.wide?"":`<span class="rate">${ic("star")}${f.rating}</span>`}
  <div class="hov"><span>${ic("play")}</span></div>
  ${opt.bar?`<div class="bar"><i style="width:${Math.round((progress[f.id]||0)*100)}%"></i></div>`:""}</div>
  <h3>${esc(f.title)}</h3><p>${f.year} • ${f.genre[0]}</p></a>`;
const section = (title,body,link) => `<section class="sec"><div class="sec-head"><h2>${title}</h2>${link?`<a href="${link}">Lihat Semua ${ic("chev")}</a>`:""}</div>${body}</section>`;
const row = (list,opt) => `<div class="row">${list.map(f=>card(f,opt)).join("")}</div>`;
const grid = list => `<div class="grid">${list.map(f=>card(f)).join("")}</div>`;
const chips = (active,base) => `<div class="chips">${["Semua",...GENRES].map(g=>`<a class="chip ${(active||"Semua")===g?"on":""}" href="${base}${g==="Semua"?"":"?g="+g}">${g}</a>`).join("")}</div>`;
const empty = (icon,t,d) => `<div class="empty">${ic(icon)}<b>${t}</b>${d}</div>`;
const meta = f => `<div class="meta"><span>${f.year}</span><i></i><span>${f.genre.join(" • ")}</span><i></i><span>${f.duration}</span><i></i><span>★ ${f.rating}</span></div>`;
const favBtn = f => `<button class="btn ghost ${favs.includes(f.id)?"on":""}" data-fav="${f.id}">${ic(favs.includes(f.id)?"check":"plus")} ${favs.includes(f.id)?"Di Favorit":"Tambah ke Favorit"}</button>`;
const tileColors = ["#5b1219","#1b2450","#4d3d0d","#3c1a55","#0d4a45","#4d2a12","#1c3f5c","#5c1a3d","#2b3a1d"];

/* ---------- Halaman ---------- */
function home(){
  if(!films.length) return empty("film","Belum ada film","Kirim video ke Telegram Bot untuk menambahkan film.");
  const top = [...films].sort((a,b)=>b.rating-a.rating).slice(0,5);
  const cont = films.filter(f=>progress[f.id]>0&&progress[f.id]<1);
  const heroHTML = `<section class="hero" id="hero" aria-label="Film unggulan">${heroSlide(top[0])}<div class="dots">${top.map((_,i)=>`<button class="${i?"":"on"}" data-slide="${i}" aria-label="Slide ${i+1}"></button>`).join("")}</div></section>`;
  startHero(top);
  return heroHTML
   + (cont.length?section("Lanjutkan Menonton",row(cont,{wide:1,bar:1}),"#/profile"):"")
   + section("Film Terbaru",row([...films].sort((a,b)=>b.year-a.year)),"#/movies")
   + section("Genre Pilihan",`<div class="chips">${GENRES.map((g,i)=>`<a class="chip" href="#/movies?g=${g}">${g}</a>`).join("")}</div>`)
   + section("Film Populer",row([...films].sort((a,b)=>b.rating-a.rating)),"#/movies");
}
function heroSlide(f){ return `<img class="hero-bg" src="${f.backdrop}" alt=""><div class="hero-body"><span class="badge">FILM TERPOPULER</span><h1>${esc(f.title)}</h1>${meta(f)}<p>${esc(f.description)}</p><div class="actions"><a class="btn primary" href="#/watch/${f.id}">${ic("play")} Tonton Sekarang</a>${favBtn(f)}</div></div>`; }
function startHero(top){
  let i=0; clearInterval(heroTimer);
  const show = n => { i=n; const h=$("#hero"); if(!h) return; const d=h.querySelector(".dots"); h.innerHTML=heroSlide(top[i]); h.appendChild(d);
    d.querySelectorAll("button").forEach((b,k)=>b.classList.toggle("on",k===i)); };
  window.__slide = show;
  heroTimer = setInterval(()=>show((i+1)%top.length),6500);
}
const movies = q => { const g=q.get("g"); const list=g?films.filter(f=>f.genre.includes(g)):films;
  return `<h1 class="page-title">${g||"Semua Film"}</h1><section class="sec">${chips(g,"#/movies")}</section><section class="sec">${list.length?grid(list):empty("film","Belum ada film",`Belum ada film di genre ${g}.`)}</section>`; };
const categories = () => `<h1 class="page-title">Kategori</h1><section class="sec"><div class="tiles">${GENRES.map((g,i)=>`<a class="tile" style="background:linear-gradient(135deg,${tileColors[i%9]},#0d0d14)" href="#/movies?g=${g}">${g}<small>${films.filter(f=>f.genre.includes(g)).length} film</small></a>`).join("")}</div></section>`;
function search(q){
  const term=(q.get("q")||"").trim().toLowerCase();
  const res = term?films.filter(f=>(f.title+" "+f.genre.join(" ")+" "+f.year).toLowerCase().includes(term)):[];
  return `<label class="m-search">${ic("search")}<input id="pageSearch" type="search" value="${esc(q.get("q")||"")}" placeholder="Cari film, judul, atau genre..." autocomplete="off"></label>
  <h1 class="page-title">${term?`Hasil untuk “${esc(q.get("q"))}”`:"Cari Film"}</h1>
  <section class="sec" id="results">${resultsHTML(term,res)}</section>`;
}
const resultsHTML = (term,res) => !term ? `${empty("search","Mulai mencari","Ketik judul, genre, atau tahun rilis film.")}<div class="sec"><div class="sec-head"><h2>Telusuri genre</h2></div>${chips("","#/movies")}</div>`
  : res.length ? grid(res) : empty("search","Tidak ada hasil",`Tidak ada film yang cocok dengan “${esc(term)}”. Coba kata kunci lain.`);
function profile(){
  const fl = films.filter(f=>favs.includes(f.id)), cont = films.filter(f=>progress[f.id]>0);
  return `<h1 class="page-title">Profil</h1>`
   + section("Favorit Saya", fl.length?grid(fl):empty("heart","Belum ada favorit","Tekan “Tambah ke Favorit” pada film untuk menyimpannya di sini."))
   + section("Riwayat Tontonan", cont.length?row(cont,{wide:1,bar:1}):empty("clock","Belum ada riwayat","Film yang kamu tonton akan muncul di sini."));
}
function detail(id){
  const f=byId(id); if(!f) return notFound();
  const rel=films.filter(x=>x.id!==id&&x.genre.some(g=>f.genre.includes(g))).slice(0,8);
  return `<article class="detail"><a class="back" href="javascript:history.back()">${ic("back")} Kembali</a>
  <div class="detail-bg"><img src="${f.backdrop}" alt=""></div>
  <div class="detail-body"><div class="cover"><img src="${f.poster}" alt="Poster ${esc(f.title)}"></div>
  <div class="detail-info"><h1>${esc(f.title)}</h1>${meta(f)}
  <div class="tags">${f.genre.map(g=>`<a class="tag" href="#/movies?g=${g}">${g}</a>`).join("")}</div>
  <p class="desc">${esc(f.description)}</p>
  <div class="actions"><a class="btn primary" href="#/watch/${f.id}">${ic("play")} Tonton</a>${favBtn(f)}</div>
  <div class="facts"><div><small>Tahun</small>${f.year}</div><div><small>Durasi</small>${f.duration}</div><div><small>Rating</small>★ ${f.rating}/10</div><div><small>Genre</small>${f.genre[0]}</div></div></div></div>
  ${rel.length?section("Film Serupa",row(rel)):""}</article>`;
}
function qualityLabel(q){ return String(q).toLowerCase().endsWith("p")?String(q):String(q); }
function qualityControls(f){
  if(!f.videos||f.videos.length<2) return "";
  return `<div class="quality-box"><div class="quality-title">Kualitas Video</div><div class="quality-list">${f.videos.map((v,i)=>`<button type="button" class="quality-btn ${i===0?"on":""}" data-quality="${esc(v.quality)}">${esc(qualityLabel(v.quality))}</button>`).join("")}</div></div>`;
}
function watch(id){
  const f=byId(id); if(!f) return notFound();
  const rel=films.filter(x=>x.id!==id).slice(0,6);
  const first=f.videos?.[0]?.videoUrl||f.videoUrl||"";
  return `<div class="watch"><div><div class="player" id="player"><video id="vid" controls playsinline preload="metadata" poster="${f.backdrop}" src="${first}"></video>
  <button type="button" class="fullscreen-btn" id="fullscreenBtn" aria-label="Layar penuh" title="Layar penuh">⛶</button>
  <div class="err"><div><b>Video tidak dapat diputar</b><br>Periksa koneksi internet atau pilih kualitas video lain.</div></div></div>
  ${qualityControls(f)}
  <div class="watch-info"><h1>${esc(f.title)}</h1>${meta(f)}<p class="desc" style="margin-top:14px">${esc(f.description)}</p>
  <div class="actions">${favBtn(f)}<a class="btn ghost" href="#/film/${f.id}">Detail Film</a></div></div></div>
  <aside class="side-list"><h2>Tonton Berikutnya</h2>${rel.map(x=>`<a class="mini" href="#/film/${x.id}"><div class="th"><img loading="lazy" src="${x.backdrop}" alt=""></div><div><h3>${esc(x.title)}</h3><p>${x.year} • ${x.genre[0]}</p></div></a>`).join("")}</aside></div>`;
}
const notFound = () => empty("film","Film tidak ditemukan",`<br><a class="btn primary" href="#/">Kembali ke Beranda</a>`);

/* ---------- Navigasi ---------- */
const NAV = [["","Beranda","home"],["movies","Film","film"],["search","Cari","search"],["categories","Kategori","grid"],["profile","Profil","user"]];
function renderNav(seg){
  const on = seg==="film"||seg==="watch" ? "" : seg;
  $("#bottomNav").innerHTML = NAV.map(([p,l,i])=>`<a href="#/${p}" class="${on===p?"on":""}" ${on===p?'aria-current="page"':""}>${ic(i)}<span>${l}</span></a>`).join("");
  $("#sidebar").innerHTML = `<a class="logo" href="#/"><svg viewBox="0 0 24 24" style="fill:var(--red);stroke:none"><path d="M4 3l17 9-17 9z"/></svg><span>IDF<b>LIX</b></span></a>`
   + [["","Beranda","home"],["movies","Film","film"],["categories","Kategori","grid"],["profile","Favorit","heart"],["profile","Riwayat","clock"]].map(([p,l,i],k)=>`<a class="side-link ${on===p&&k<4?"on":""}" href="#/${p}">${ic(i)}${l}</a>`).join("")
   + `<div class="side-title">Genre</div>` + GENRES.slice(0,7).map(g=>`<a class="side-link sm" href="#/movies?g=${g}">${g}</a>`).join("")
   + `<div class="side-promo">${ic("crown")}Nikmati pengalaman menonton tanpa batas</div>`;
}
function router(){
  clearInterval(heroTimer);
  const views={
  "":home,
  movies:()=>movies(q),
  categories,
  search:()=>search(q),
  profile,
  film:()=>detail(arg),
  watch:()=>watch(arg),
  debug:debugPage
};
  $("#view").innerHTML = (views[seg]||notFound)();
  renderNav(seg||""); window.scrollTo(0,0);
  const ts=$("#topSearch"); if(seg!=="search") ts.value = ""; else ts.value=q.get("q")||"";
  if(seg==="watch") bindPlayer(byId(arg));
  if(seg==="search" && matchMedia("(max-width:639px)").matches && !q.get("q")) $("#pageSearch")?.focus();
}
function bindPlayer(f){
  if(!f) return;
  const v=$("#vid"), p=$("#player"); let last=0;
  const fsBtn=$("#fullscreenBtn");
  const updateFullscreenUI=()=>{
    if(!fsBtn) return;
    const active=document.fullscreenElement===p || document.webkitFullscreenElement===p;
    fsBtn.textContent=active?"⛶":"⛶";
    fsBtn.setAttribute("aria-label",active?"Keluar dari layar penuh":"Layar penuh");
    fsBtn.title=active?"Keluar dari layar penuh":"Layar penuh";
  };
  const isMobilePlayer=()=>/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||"");
  const lockLandscape=async()=>{
    if(!isMobilePlayer()) return;
    try{
      if(screen.orientation?.lock) await screen.orientation.lock("landscape");
    }catch{}
  };
  const unlockOrientation=async()=>{
    if(!isMobilePlayer()) return;
    try{
      if(screen.orientation?.unlock) screen.orientation.unlock();
    }catch{}
  };
  const toggleFullscreen=async()=>{
    try{
      const active=document.fullscreenElement || document.webkitFullscreenElement;
      if(active){
        if(document.exitFullscreen) await document.exitFullscreen();
        else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
        await unlockOrientation();
        return;
      }
      if(p.requestFullscreen){
        await p.requestFullscreen();
        await lockLandscape();
      }else if(p.webkitRequestFullscreen){
        p.webkitRequestFullscreen();
        await lockLandscape();
      }else if(v.webkitEnterFullscreen){
        v.webkitEnterFullscreen();
      }
    }catch{}
  };
  fsBtn?.addEventListener("click",toggleFullscreen);
  document.addEventListener("fullscreenchange",async()=>{
    updateFullscreenUI();
    const active=document.fullscreenElement===p || document.webkitFullscreenElement===p;
    if(active) await lockLandscape(); else await unlockOrientation();
  });
  document.addEventListener("webkitfullscreenchange",async()=>{
    updateFullscreenUI();
    const active=document.fullscreenElement===p || document.webkitFullscreenElement===p;
    if(active) await lockLandscape(); else await unlockOrientation();
  });
  updateFullscreenUI();
  const setSource=(url,quality,autoplay=false)=>{
    if(!url) return;
    const oldTime=v.currentTime||0;
    v.src=url; v.load();
    v.addEventListener("loadedmetadata",function once(){
      const saved=progress[`${f.id}:${quality}`]??progress[f.id];
      if(saved>0&&saved<.97) v.currentTime=saved*v.duration; else if(oldTime>0&&Number.isFinite(oldTime)) v.currentTime=Math.min(oldTime,v.duration||oldTime);
      if(autoplay) v.play().catch(()=>{});
    },{once:true});
  };
  v.addEventListener("error",()=>p.classList.add("fail"));
  v.addEventListener("loadeddata",()=>p.classList.remove("fail"));
  const buttons=document.querySelectorAll("[data-quality]");
  buttons.forEach(btn=>btn.addEventListener("click",()=>{
    const quality=btn.dataset.quality;
    const item=f.videos.find(x=>String(x.quality)===String(quality));
    if(!item?.videoUrl) return;
    buttons.forEach(b=>b.classList.toggle("on",b===btn));
    const wasPlaying=!v.paused;
    const oldTime=v.currentTime||0;
    setSource(item.videoUrl,quality,wasPlaying);
    if(oldTime>0) v.addEventListener("loadedmetadata",()=>{if(v.duration) v.currentTime=Math.min(oldTime,v.duration)},{once:true});
  }));
  v.addEventListener("timeupdate",()=>{
    if(!v.duration||Date.now()-last<1500) return;
    last=Date.now();
    const active=document.querySelector("[data-quality].on")?.dataset.quality||f.videos?.[0]?.quality||"default";
    progress[`${f.id}:${active}`]=v.currentTime/v.duration;
    progress[f.id]=v.currentTime/v.duration;
    store.set("idflix:progress",progress);
  });
}
function liveSearch(val){
  const on = location.hash.startsWith("#/search");
  const url = "#/search"+(val?"?q="+encodeURIComponent(val):"");
  if(!on){ location.hash=url; return; }
  history.replaceState(null,"",url);            // filter langsung tanpa render ulang input
  const term=val.trim().toLowerCase(), res=term?films.filter(f=>(f.title+" "+f.genre.join(" ")+" "+f.year).toLowerCase().includes(term)):[];
  $("#results").innerHTML = resultsHTML(term,res);
  document.querySelector(".page-title").textContent = term?`Hasil untuk “${val}”`:"Cari Film";
}
document.addEventListener("input",e=>{ if(e.target.id==="topSearch"||e.target.id==="pageSearch"){ const v=e.target.value; liveSearch(v); const o=$("#topSearch"),m=$("#pageSearch"); if(o&&o!==e.target)o.value=v; if(m&&m!==e.target)m.value=v; } });
document.addEventListener("click",e=>{
  const fb=e.target.closest("[data-fav]"), dt=e.target.closest("[data-slide]");
  if(fb){ const id=fb.dataset.fav; favs=favs.includes(id)?favs.filter(x=>x!==id):[...favs,id]; store.set("idflix:favs",favs);
    const f=byId(id); fb.outerHTML=favBtn(f); return; }
  if(dt) window.__slide(+dt.dataset.slide);
});
window.addEventListener("hashchange",router);
loadFilms().then(router);
