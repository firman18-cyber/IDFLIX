# Series & Episode (Eps) — struktur data

Film biasa tidak berubah. Sebuah item di `movies/<id>` otomatis menjadi **series**
bila punya `episodes` (atau `"type": "series"`).

```json
movies/lastofus: {
  "title": "The Last of Us",
  "type": "series",
  "poster": "...", "backdrop": "...", "genre": ["Drama"], "year": 2023, "rating": 8.8,
  "description": "...",
  "episodes": {
    "s1e1": {
      "season": 1,
      "number": 1,
      "title": "Judul episode",
      "description": "Opsional",
      "duration": "81m",
      "thumbnail": "https://... (opsional; atau thumbnailFileId lewat Worker /poster/<fileId>)",
      "videos": {
        "720p": { "videoUrl": "...", "provider": "...", "format": "mp4", "subtitle": { "url": "https://.../s1e1.vtt", "language": "id" } },
        "480p": { "videoUrl": "..." }
      }
    }
  }
}
```

- `episodes` boleh berupa objek (kunci bebas, mis. `s1e1`; hindari `. # $ [ ] /`) atau array.
- Urutan: musim lalu nomor episode. `season` default 1, `number` default urutan.
- `videos` per episode sama persis dengan `videos` film (360p–2160p, MP4 atau HLS).
  Episode lama-gaya `videoUrl` + `quality` langsung di episode juga terbaca.
- Satu musim → label "Eps 3"; lebih dari satu musim → "S2 Eps 3" dan muncul tab Musim.
- **Subtitle lewat Worker** (`fileId`): untuk episode, app meminta
  `GET /subtitle/<filmId>/<quality>?ep=<epId>`. Worker perlu mendukung query `ep`
  (atau isi `subtitle.url` langsung per episode, yang sudah langsung bekerja).

## Progres
Progres disimpan per episode di `users/<uid>/progress/<filmId>:<epId>` ({t,d,q,updatedAt}).
Aturan database yang ada sudah cukup. Rail "Lanjutkan Menonton" menampilkan series satu kali,
dan tombol "Lanjutkan Eps N" membuka episode terakhir yang belum selesai (atau episode
berikutnya bila episode terakhir sudah tamat).

## Rute
`#/watch/<filmId>` (series: membuka episode lanjutan) dan `#/watch/<filmId>/<epId>`.
Kartu "Berikutnya" di player menampilkan episode selanjutnya; di episode terakhir
diganti rekomendasi film lain.
