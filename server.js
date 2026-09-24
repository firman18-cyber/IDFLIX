// Telegram Bot -> Firebase Realtime Database, plus proxy stream (token bot tidak pernah sampai ke browser).
const { Telegraf } = require("telegraf");
const admin = require("firebase-admin");
const http = require("http");
const { Readable } = require("stream");
const env = process.env;

admin.initializeApp({ credential: admin.credential.applicationDefault(), databaseURL: env.FIREBASE_DB_URL });
const db = admin.database();
const bot = new Telegraf(env.BOT_TOKEN);
const admins = (env.ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const url = fileId => `${env.PUBLIC_URL}/file/${fileId}`;
const HELP = "Kirim video dengan caption:\nJudul | Tahun | Genre1,Genre2 | Durasi | Rating | Deskripsi\n\nContoh:\nDune: Part Two | 2024 | Sci-Fi,Action | 2j 46m | 8.6 | Paul bersatu dengan Fremen...\n\nPoster/backdrop: kirim foto dengan caption\nposter <id>  atau  backdrop <id>\n\n/list  – daftar film\n/hapus <id>  – hapus film";

bot.use((ctx, next) => admins.includes(String(ctx.from?.id)) ? next() : ctx.reply("Kamu tidak punya akses."));
bot.start(ctx => ctx.reply(HELP));
bot.command("list", async ctx => {
  const v = (await db.ref("movies").get()).val() || {};
  ctx.reply(Object.entries(v).map(([id, f]) => `${id} — ${f.title} (${f.year})`).join("\n") || "Belum ada film.");
});
bot.command("hapus", async ctx => {
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Format: /hapus <id>");
  await db.ref("movies/" + id).remove(); ctx.reply("Dihapus: " + id);
});

bot.on(["video", "document"], async ctx => {
  const m = ctx.message, file = m.video || m.document;
  if (m.document && !(file.mime_type || "").startsWith("video/")) return ctx.reply("File ini bukan video.");
  const [title, year, genre, duration, rating, ...desc] = (m.caption || "").split("|").map(s => s.trim());
  if (!title || !year) return ctx.reply(HELP);
  const id = slug(title) + "-" + year;
  const ref = db.ref("movies/" + id), old = (await ref.get()).val() || {};
  await ref.update({
    title, year: Number(year) || year, genre: (genre || "").split(",").map(s => s.trim()).filter(Boolean),
    duration: duration || "", rating: Number(rating) || 0, description: desc.join("|").trim(),
    telegramFileId: file.file_id, videoUrl: url(file.file_id), addedAt: old.addedAt || admin.database.ServerValue.TIMESTAMP
  });
  const big = file.file_size > 20 * 1024 * 1024 ? "\n⚠️ File > 20 MB: butuh Local Bot API Server agar bisa di-stream." : "";
  ctx.reply(`✅ Tersimpan: ${id}${big}\nTambah poster: kirim foto dengan caption "poster ${id}"`);
});

bot.on("photo", async ctx => {
  const [kind, id] = (ctx.message.caption || "").trim().split(/\s+/);
  if (!["poster", "backdrop"].includes(kind) || !id) return ctx.reply('Caption foto: "poster <id>" atau "backdrop <id>"');
  if (!(await db.ref("movies/" + id).get()).exists()) return ctx.reply("ID film tidak ditemukan. Cek /list");
  const p = ctx.message.photo.at(-1);
  await db.ref("movies/" + id).update({ [kind]: url(p.file_id) });
  ctx.reply(`✅ ${kind} diperbarui untuk ${id}`);
});

// Proxy: /file/<file_id> -> file Telegram (mendukung Range agar video bisa di-seek)
http.createServer(async (req, res) => {
  const m = req.url.match(/^\/file\/([\w-]+)/);
  res.setHeader("Access-Control-Allow-Origin", env.ALLOW_ORIGIN || "*");
  if (!m) { res.writeHead(404); return res.end(); }
  try {
    const link = String(await bot.telegram.getFileLink(m[1]));
    const up = await fetch(link, { headers: req.headers.range ? { Range: req.headers.range } : {} });
    const h = { "cache-control": "public, max-age=86400", "accept-ranges": "bytes" };
    for (const k of ["content-length", "content-range"]) if (up.headers.get(k)) h[k] = up.headers.get(k);
    h["content-type"] = /\.(mp4|m4v)$/i.test(link) ? "video/mp4" : /\.(jpe?g)$/i.test(link) ? "image/jpeg" : up.headers.get("content-type") || "application/octet-stream";
    res.writeHead(up.status, h); Readable.fromWeb(up.body).pipe(res);
  } catch (e) { res.writeHead(502); res.end("Gagal mengambil file dari Telegram"); }
}).listen(env.PORT || 3000, () => console.log("Proxy siap di port", env.PORT || 3000));

bot.launch().then(() => console.log("Bot aktif"));
process.once("SIGINT", () => bot.stop("SIGINT")); process.once("SIGTERM", () => bot.stop("SIGTERM"));
