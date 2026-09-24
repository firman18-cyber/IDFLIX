// Data dummy. Bentuk objek sama dengan dokumen Firestore, jadi nanti cukup ganti
// FILMS dengan hasil getDocs(collection(db,"movies")) di app.js (fungsi loadFilms).
const V = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/";
const GENRES = ["Action","Comedy","Drama","Horror","Romance","Thriller","Sci-Fi","Animation","Documentary"];

// Placeholder gambar (SVG). Ganti dengan URL asli / Firebase Storage kapan saja.
function art(title, c1, c2, w, h) {
  const words = title.split(" "), lines = [""];
  words.forEach(t => { const l = lines[lines.length-1]; (l + t).length > 11 && l ? lines.push(t) : lines[lines.length-1] = (l + " " + t).trim(); });
  const size = w > h ? 64 : 44, x = w > h ? 60 : w/2, anchor = w > h ? "start" : "middle", y0 = h*(w > h ? .5 : .62);
  const txt = lines.slice(0,3).map((l,i)=>`<text x="${x}" y="${y0+i*size*1.05}" text-anchor="${anchor}" font-family="Arial Black,Impact,sans-serif" font-size="${size}" fill="#fff" fill-opacity=".92">${l.replace(/&/g,"&amp;")}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><radialGradient id="r" cx=".7" cy=".3" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/>${txt}</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
const mk = (id,title,year,genre,duration,rating,description,video,c1,c2,progress=0) => ({
  id, title, year, genre, duration, rating, description, videoUrl: V + video, progress,
  poster: art(title,c1,c2,400,600), backdrop: art(title,c1,c2,1280,720)
});

const FILMS = [
  mk("dune2","Dune: Part Two",2024,["Sci-Fi","Action"],"2j 46m",8.6,"Paul Atreides bersatu dengan Fremen untuk membalas dendam terhadap para penindas yang menghancurkan keluarganya.","BigBuckBunny.mp4","#e8742a","#3a1408",.6),
  mk("wick4","John Wick 4",2023,["Action","Thriller"],"2j 49m",7.7,"John Wick kembali beraksi setelah diburu oleh organisasi kriminal berbahaya yang ingin menghabisinya.","ElephantsDream.mp4","#1c2233","#7a0d14"),
  mk("batman","The Batman",2022,["Action","Thriller"],"2j 56m",7.8,"Di tahun kedua memerangi kejahatan, Batman menelusuri korupsi Gotham dan teka-teki seorang pembunuh berantai.","ForBiggerBlazes.mp4","#7a0d14","#120508",.4),
  mk("interstellar","Interstellar",2014,["Sci-Fi","Drama"],"2j 49m",8.7,"Sekelompok penjelajah menembus lubang cacing demi mencari rumah baru bagi umat manusia.","Sintel.mp4","#9fb8c8","#1d2a36",.3),
  mk("oppen","Oppenheimer",2023,["Drama"],"3j 0m",8.3,"Kisah J. Robert Oppenheimer dan perlombaan menciptakan bom atom pertama di dunia.","TearsOfSteel.mp4","#c2410c","#3b0d02",.5),
  mk("godzilla","Godzilla x Kong: The New Empire",2024,["Action","Sci-Fi"],"1j 55m",6.0,"Dua monster raksasa bersatu menghadapi ancaman tersembunyi yang mengancam dunia mereka.","ForBiggerEscapes.mp4","#a63d8f","#1b1440"),
  mk("fallguy","The Fall Guy",2024,["Action","Comedy"],"2j 6m",7.0,"Seorang stuntman pensiun ditarik kembali ke lokasi syuting untuk mencari bintang film yang hilang.","ForBiggerFun.mp4","#f2c318","#2a6fb0"),
  mk("lastofus","The Last of Us",2023,["Drama","Horror"],"Serial",8.8,"Dua penyintas melintasi Amerika pasca-pandemi demi menjaga harapan terakhir umat manusia.","ForBiggerJoyrides.mp4","#4a5a48","#0f1411"),
  mk("marvels","The Marvels",2023,["Action","Sci-Fi"],"1j 45m",5.6,"Tiga pahlawan super saling bertukar tempat setiap kali menggunakan kekuatan mereka.","ForBiggerMeltdowns.mp4","#7c3aed","#1e1b4b"),
  mk("joker2","Joker: Folie à Deux",2024,["Drama","Thriller"],"2j 18m",5.2,"Arthur Fleck menjalani perawatan di Arkham dan bertemu cinta yang tak terduga.","SubaruOutbackOnStreetAndDirt.mp4","#b91c1c","#111827"),
  mk("nightfall","Nightfall Manor",2023,["Horror"],"1j 38m",6.7,"Keluarga muda pindah ke rumah tua di pegunungan dan mulai mendengar bisikan dari dinding.","VolkswagenGTIReview.mp4","#3f1d5e","#09040f"),
  mk("paperhearts","Paper Hearts",2022,["Romance","Comedy"],"1j 52m",7.1,"Dua penulis surat lawas saling jatuh cinta tanpa pernah bertemu langsung.","WeAreGoingOnBullrun.mp4","#f472b6","#7f1d1d"),
  mk("skyfarm","Sky Farm",2024,["Animation","Comedy"],"1j 34m",7.9,"Seekor domba kecil bermimpi menanam kebun di atas awan bersama sahabat-sahabatnya.","WhatCarCanYouGetForAGrand.mp4","#38bdf8","#4338ca"),
  mk("deepblue","Deep Blue Silence",2021,["Documentary"],"1j 29m",8.0,"Menyelami palung laut terdalam bersama para ilmuwan yang mencari kehidupan tak dikenal.","BigBuckBunny.mp4","#0e7490","#020617")
];
