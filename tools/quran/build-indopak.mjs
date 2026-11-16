// tools/quran/build-indopak.mjs — IndoPak আরবি লেখার ডেটা-ফাইল বানানো (একবার চালানো; অ্যাপ চালাতে লাগে না)। ধাপ ৬গ-৩।
// ব্যবহার: node tools/quran/build-indopak.mjs --src <indopak.json (শব্দ-ভিত্তিক, "সূরা:আয়াত:শব্দ" → {text})> [--out public/quran/v1]
// উৎস: QuranWBW-এর IndoPak লেখা (QUL-এর মাধ্যমে পাওয়া) — অপরিবর্তিত; শুধু শব্দগুলো ফাঁকা দিয়ে জোড়া, আয়াত-শেষের নম্বর-শব্দ বাদ, আর অদৃশ্য U+200B/U+FEFF বাদ (ফন্টে নেই; কিছু ফোনে বাক্স দেখায়) (নম্বর অ্যাপ নিজে আঁকে)।
// নিরাপত্তা: ৬২৩৬ আয়াত, শব্দের ক্রম, নম্বর-শব্দ = আয়াত-নম্বর, প্রতি সূরার সংখ্যা meta.json-এর সাথে মিল,
//   Uthmani-র সাথে ব্যঞ্জনবর্ণ-কাঠামো মিল (জ্ঞাত রসম-পার্থক্য ছাড়া অমিল থাকলে ডেটা নেওয়া হয় না)।
// আউটপুট: ar-indopak/NNN.json, ar-indopak/NOTICE.txt, manifest.json-এ arabicIndopak, tools/quran/integrity-indopak.json।
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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
const rawStr = fs.readFileSync(arg("src"), "utf8");
const src = JSON.parse(rawStr);
const meta = JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8"));
const manifestPath = path.join(OUT, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// শব্দ → আয়াত
const rows = Object.values(src).sort((a, b) => a.id - b.id);
if (rows.length !== 83668) fail("শব্দ-সংখ্যা ৮৩৬৬৮ নয় (" + rows.length + ")");
const words = new Map(); // "s:a" → [text]
for (const r of rows) {
  const key = r.surah + ":" + r.ayah;
  if (!words.has(key)) words.set(key, []);
  const arr = words.get(key);
  if (+r.word !== arr.length + 1) fail("শব্দের ক্রম ভাঙা: " + r.location);
  if (typeof r.text !== "string" || !r.text) fail("খালি শব্দ: " + r.location);
  arr.push(r.text);
}
if (words.size !== 6236) fail("৬২৩৬ আয়াত নেই (" + words.size + ")");

const DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => DIGITS[+d]);

const per = [];
for (const su of meta.surahs) {
  const ar = [];
  for (let a = 1; a <= su.ayahs; a++) {
    const w = words.get(su.n + ":" + a);
    if (!w) fail("আয়াত নেই: " + su.n + ":" + a);
    const last = w[w.length - 1];
    if (last !== toArabicDigits(a)) fail("শেষ শব্দ আয়াত-নম্বর নয়: " + su.n + ":" + a + " (" + last + ")");
    // U+200B (ZWSP) ও U+FEFF ফন্টে নেই — কিছু ফোনে বাক্স (▯) দেখায়। অদৃশ্য অক্ষর, তাই বাদ; হরফ/চিহ্ন অক্ষত।
    const t = w.slice(0, -1).join(" ").replace(/[\u200b\ufeff]/g, "").trim();
    if (w.length < 2 || !t.trim()) fail("খালি আয়াত " + su.n + ":" + a);
    ar.push(t);
  }
  if (words.size && ar.length !== su.ayahs) fail("সূরা " + su.n + ": আয়াত-সংখ্যা অমিল");
  per.push(ar);
}
if (per.flat().length !== 6236) fail("মোট আয়াত ৬২৩৬ নয়");

// বিসমিল্লাহ = ফাতিহার ১ম আয়াত (বাকি সূরায় লেখায় জোড়া নেই; ৯ নম্বরে তো নেই-ই)।
const BISMILLAH = per[0][0].replace(/[\u200b\u200f\u2002\u2003\ufeff]/g, "").trim();
for (let n = 2; n <= 114; n++) if (per[n - 1][0].includes(BISMILLAH)) fail("সূরা " + n + "-এ বিসমিল্লাহ জোড়া আছে");

// ব্যঞ্জনবর্ণ-কাঠামো (Uthmani-র সাথে): হরকত/চিহ্ন/আলিফ-ইয়া-ওয়াও-হামযা-হে-জাতীয় বাদ; IndoPak-এর বিশেষ অক্ষর (ٮ হামযার আসন, ھ, ڪ, ے) একই শ্রেণিতে।
const skel = (t) => t.normalize("NFKD").replace(/[\p{Mn}\p{Cf}\uE000-\uF8FF]/gu, "").replace(/[\u0640\u2002\u2003]/g, "")
  .replace(/[\u066E\u06D2\u06CC\u0649]/g, "\u064A").replace(/\u06AA|\u06A9/g, "\u0643").replace(/[\u0629\u06C3\u06C1\u06BE]/g, "\u0647")
  .replace(/[\u0671\u0622\u0623\u0625\u0621\u0627\u0624\u0626\u0648\u064A\u06E5\u06E6\u0647]/g, "")
  .replace(/[\s\u06D6-\u06ED\u0653\u06DD\u0654\u0655\u0674\u0670]/g, "").replace(/(.)\1+/g, "$1");
const diffs = [];
for (const su of meta.surahs) {
  const u = JSON.parse(fs.readFileSync(path.join(OUT, "ar-uthmani", pad3(su.n) + ".json"), "utf8")).a;
  if (u.length !== per[su.n - 1].length) fail("সূরা " + su.n + ": Uthmani-র সাথে আয়াত-সংখ্যা অমিল");
  u.forEach((x, i) => { if (!(su.n === 1 && i === 0) && skel(x) !== skel(per[su.n - 1][i])) diffs.push(su.n + ":" + (i + 1)); });
}
// জ্ঞাত রসম-পার্থক্য: ৭২:১৬ (أن لو / ألو) — আগের ধাপেও একই পার্থক্য ধরা পড়েছে।
const EXPECTED = ["72:16"];
if (diffs.join() !== EXPECTED.join()) fail("প্রত্যাশিত নয় এমন ব্যঞ্জনবর্ণ-অমিল: " + diffs.slice(0, 15).join(", "));

// লেখা
const integrity = {};
fs.mkdirSync(path.join(OUT, "ar-indopak"), { recursive: true });
for (const su of meta.surahs) {
  const s = JSON.stringify({ v: 1, s: su.n, a: per[su.n - 1] });
  fs.writeFileSync(path.join(OUT, "ar-indopak", pad3(su.n) + ".json"), s);
  integrity["ar-indopak/" + pad3(su.n) + ".json"] = { bytes: Buffer.byteLength(s), sha256: sha(s) };
}
manifest.arabicIndopak = {
  script: "indopak-quranwbw", source: "QuranWBW.com (IndoPak text)", sourceUrl: "https://quranwbw.com",
  license: "অ-বাণিজ্যিক ব্যবহারের অনুমতি (NOTICE.txt)", sha256: sha(per.flat().join("\n")), bismillahSeparated: true, bismillah: BISMILLAH,
};
const manifestStr = JSON.stringify(manifest);
fs.writeFileSync(manifestPath, manifestStr);
const here = path.dirname(new URL(import.meta.url).pathname);
const mainIntPath = path.resolve(here, "integrity.json");
const mainInt = JSON.parse(fs.readFileSync(mainIntPath, "utf8"));
mainInt.files["manifest.json"] = { bytes: Buffer.byteLength(manifestStr), sha256: sha(manifestStr) };
fs.writeFileSync(mainIntPath, JSON.stringify(mainInt, null, 1));
fs.writeFileSync(path.join(OUT, "ar-indopak", "NOTICE.txt"), "শুধু অ-বাণিজ্যিক (ব্যক্তিগত) হিসেবে ব্যবহার হচ্ছে।\n");
fs.writeFileSync(path.join(here, "integrity-indopak.json"), JSON.stringify({ input: sha(rawStr), files: integrity }, null, 1));
console.log("✅ IndoPak: ১১৪ সূরা-ফাইল, ৬২৩৬ আয়াত");
console.log("   ব্যঞ্জনবর্ণ অমিল (Uthmani-র সাথে): " + diffs.length + " (" + diffs.join(",") + ") | sha256 " + manifest.arabicIndopak.sha256.slice(0, 12) + "…");
