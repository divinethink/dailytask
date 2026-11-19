// tools/quran/build-mushaf16.mjs — ১৬-লাইন ইন্দো-পাক মুসহাফের পৃষ্ঠা-ডেটা বানানো (একবার চালানো; অ্যাপ চালাতে লাগে না)।
// ব্যবহার: node tools/quran/build-mushaf16.mjs --db <taj-indopak-16-lines.db> --words <digital-khatt-indopak.json (শব্দ-ভিত্তিক)> [--out public/quran/v1]
// উৎস: লাইন-বিন্যাস = "Indopak 16 lines" (৫৪৮ পৃষ্ঠা; প্রতি লাইনের প্রথম-শেষ শব্দ-আইডি); শব্দ = DigitalKhatt IndoPak (ইউনিকোড) — আইডি একই ১–৮৩৬৬৮।
// নিরাপত্তা: প্রতিটা শব্দ-আইডি ঠিক একবার ও ক্রমে; ৬২৩৬ আয়াত সবই আছে; প্রতি আয়াতের শব্দ আগের ar-indopak-dk ডেটার সাথে হুবহু মেলে।
// আউটপুট: mushaf16/NNN.json (৫৪৮টি), mushaf16/index.json, mushaf16/NOTICE.txt, manifest.json-এ mushaf16, tools/quran/integrity-mushaf16.json।
// লাইন-রূপ: ["s", সূরা] সূরা-নাম · ["b"] বিসমিল্লাহ · ["a", মাঝে(0|1), [[সূরা, আয়াত, "শব্দ শব্দ …"], …]] আয়াতের লাইন (আয়াত-অনুযায়ী টুকরো)।
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  if (i === -1 || !process.argv[i + 1]) {
    if (def !== undefined) return def;
    console.error("অনুপস্থিত আর্গুমেন্ট: --" + name);
    process.exit(2);
  }
  return process.argv[i + 1];
}
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const pad3 = (n) => String(n).padStart(3, "0");
const fail = (m) => { console.error("❌ " + m); process.exit(1); };

const OUT = path.resolve(arg("out", "public/quran/v1"));
const meta = JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8"));
const manifestPath = path.join(OUT, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const wordsRaw = fs.readFileSync(arg("words"), "utf8");
const src = JSON.parse(wordsRaw);

// ── শব্দ (আইডি অনুযায়ী) ──
const rows = Object.values(src).sort((a, b) => a.id - b.id);
if (rows.length !== 83668) fail("শব্দ-সংখ্যা ৮৩৬৬৮ নয় (" + rows.length + ")");
const W = new Array(rows.length + 1); // W[id] = { s, a, t }
rows.forEach((r, i) => {
  if (r.id !== i + 1) fail("শব্দ-আইডি ক্রমহীন: " + r.id);
  let t = String(r.text);
  // ১:৭-এর মাঝের চিহ্ন: RLO + ٦ (+ চিহ্ন) → আলাদা শব্দ "۝٦…" (বাকি চিহ্নের মতোই রূপ)
  t = t.replace(/\u202e(\u0666[^\s]*)/u, " \u06dd$1");
  t = t.replace(/[\u200b\ufeff]/g, "").trim();
  if (/[\u202a-\u202e\u2066-\u2069]/.test(t)) fail("অপ্রত্যাশিত bidi-অক্ষর: " + r.location);
  if (!t) fail("খালি শব্দ: " + r.location);
  W[r.id] = { s: +r.surah, a: +r.ayah, w: +r.word, t };
});

// ── লাইন-বিন্যাস ──
const db = new DatabaseSync(path.resolve(arg("db")), { readOnly: true });
const info = db.prepare("select * from info").get();
if (info.number_of_pages !== 548 || info.lines_per_page !== 16) fail("ডিবি ৫৪৮ পৃষ্ঠা/১৬ লাইনের নয়");
const lineRows = db.prepare("select page_number p, line_number n, line_type t, is_centered c, first_word_id f, last_word_id l, surah_number s from pages order by page_number, line_number").all();

const pages = new Map();
let nextId = 1;
const seenAyah = new Set();
const wordsOfAyah = new Map(); // "s:a" → [text…]
const begin = new Array(548).fill(null); // পৃষ্ঠায় যে প্রথম আয়াত *শুরু* হয় ([সূরা, আয়াত]); শুধু আগের পৃষ্ঠার আয়াতের বাকি অংশ থাকলে null
const hasAyahLine = new Set();
for (const r of lineRows) {
  if (!pages.has(r.p)) pages.set(r.p, []);
  const out = pages.get(r.p);
  if (r.t === "surah_name") {
    const s = Number(r.s);
    if (!(s >= 1 && s <= 114)) fail("সূরা-নাম লাইনে সূরা নম্বর ভুল: পৃষ্ঠা " + r.p);
    out.push(["s", s]);
  } else if (r.t === "basmallah") {
    out.push(["b"]);
  } else if (r.t === "ayah") {
    const f = Number(r.f), l = Number(r.l);
    if (f !== nextId || l < f) fail("শব্দ-আইডি ক্রম ভাঙা: পৃষ্ঠা " + r.p + " লাইন " + r.n + " (" + f + "–" + l + ", প্রত্যাশিত " + nextId + ")");
    nextId = l + 1;
    const segs = [];
    for (let id = f; id <= l; id++) {
      const w = W[id];
      const last = segs[segs.length - 1];
      if (last && last[0] === w.s && last[1] === w.a) last[2].push(w.t);
      else segs.push([w.s, w.a, [w.t]]);
      if (w.w === 1 && !begin[r.p - 1]) begin[r.p - 1] = [w.s, w.a];
      const key = w.s + ":" + w.a;
      if (!wordsOfAyah.has(key)) wordsOfAyah.set(key, []);
      wordsOfAyah.get(key).push(w.t);
      seenAyah.add(key);
    }
    hasAyahLine.add(r.p);
    out.push(["a", r.c ? 1 : 0, segs.map((g) => [g[0], g[1], g[2].join(" ")])]);
  } else fail("অচেনা লাইন-ধরন: " + r.t);
}
if (nextId !== 83669) fail("সব শব্দ কভার হয়নি (পরের আইডি " + nextId + ")");
if (pages.size !== 548) fail("৫৪৮ পৃষ্ঠা নয়");
for (let p = 1; p <= 548; p++) if (!hasAyahLine.has(p)) fail("পৃষ্ঠা " + p + "-এ কোনো আয়াত-লাইন নেই");
let prevB = [0, 0];
for (const b of begin) {
  if (!b) continue;
  if (b[0] < prevB[0] || (b[0] === prevB[0] && b[1] <= prevB[1])) fail("পৃষ্ঠার প্রথম-আয়াত ক্রম ভাঙা: " + b.join(":"));
  prevB = b;
}
if (!begin[0] || begin[0].join() !== "1,1") fail("১ম পৃষ্ঠা ১:১ দিয়ে শুরু নয়");
if (seenAyah.size !== 6236) fail("৬২৩৬ আয়াত নেই (" + seenAyah.size + ")");

// ── আগের ar-indopak-dk ডেটার সাথে হুবহু মিল (শেষের আয়াত-চিহ্ন বাদে; ১:৭-এর মাঝের চিহ্ন বাদে) ──
let checked = 0;
for (const su of meta.surahs) {
  const ar = JSON.parse(fs.readFileSync(path.join(OUT, "ar-indopak-dk", pad3(su.n) + ".json"), "utf8")).a;
  for (let a = 1; a <= su.ayahs; a++) {
    const ws = wordsOfAyah.get(su.n + ":" + a);
    if (!ws) fail("আয়াত নেই: " + su.n + ":" + a);
    if (!/^\u06dd/.test(ws[ws.length - 1])) fail("শেষ শব্দ আয়াত-চিহ্ন নয়: " + su.n + ":" + a);
    let mine = ws.slice(0, -1).join(" ");
    if (su.n === 1 && a === 7) mine = mine.replace(/ \u06dd\u0666[^\s]*/u, "");
    if (mine !== ar[a - 1]) fail("ar-indopak-dk-এর সাথে অমিল: " + su.n + ":" + a);
    checked++;
  }
}

// ── লেখা ──
const integrity = {};
fs.mkdirSync(path.join(OUT, "mushaf16"), { recursive: true });
for (let p = 1; p <= 548; p++) {
  const s = JSON.stringify({ v: 1, p, l: pages.get(p) });
  fs.writeFileSync(path.join(OUT, "mushaf16", pad3(p) + ".json"), s);
  integrity["mushaf16/" + pad3(p) + ".json"] = { bytes: Buffer.byteLength(s), sha256: sha(s) };
}
const index = JSON.stringify({ v: 1, pages: 548, lines: 16, begin });
fs.writeFileSync(path.join(OUT, "mushaf16", "index.json"), index);
integrity["mushaf16/index.json"] = { bytes: Buffer.byteLength(index), sha256: sha(index) };
manifest.mushaf16 = {
  layout: "Indopak 16 lines", pages: 548, linesPerPage: 16, text: "indopak-digitalkhatt",
  source: "Taj IndoPak 16-line layout (QUL) + DigitalKhatt IndoPak text", sha256: sha(Object.values(integrity).map((x) => x.sha256).join("")),
};
const manifestStr = JSON.stringify(manifest);
fs.writeFileSync(manifestPath, manifestStr);
const here = path.dirname(new URL(import.meta.url).pathname);
const mainIntPath = path.resolve(here, "integrity.json");
const mainInt = JSON.parse(fs.readFileSync(mainIntPath, "utf8"));
mainInt.files["manifest.json"] = { bytes: Buffer.byteLength(manifestStr), sha256: sha(manifestStr) };
fs.writeFileSync(mainIntPath, JSON.stringify(mainInt, null, 1));
fs.writeFileSync(path.join(OUT, "mushaf16", "NOTICE.txt"), "১৬-লাইন লাইন-বিন্যাস: Taj IndoPak (QUL-এর মাধ্যমে)। লেখা: DigitalKhatt IndoPak (ইউনিকোড, SIL OFL)।\n");
fs.writeFileSync(path.join(here, "integrity-mushaf16.json"), JSON.stringify({ input: sha(wordsRaw), files: integrity }, null, 1));
console.log("✅ ১৬-লাইন মুসহাফ: ৫৪৮ পৃষ্ঠা, " + lineRows.length + " লাইন, ৮৩৬৬৮ শব্দ, " + checked + " আয়াত মিলেছে");
