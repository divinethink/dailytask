// tools/quran/build-indopak.mjs — IndoPak আরবি লেখার ডেটা-ফাইল বানানো (একবার চালানো; অ্যাপ চালাতে লাগে না)। ধাপ ৬গ-৩।
// ব্যবহার: node tools/quran/build-indopak.mjs --src <digital-khatt-indopak-ayah-by-ayah-script.json (আয়াত-ভিত্তিক, "সূরা:আয়াত" → {text})> [--out public/quran/v1]
// উৎস: DigitalKhatt IndoPak লেখা (ইউনিকোড; ফন্টও DigitalKhatt IndoPak, SIL OFL) — অপরিবর্তিত; শুধু (১) শেষের আয়াত-চিহ্ন "۝"+নম্বর+থামার-চিহ্ন বাদ (নম্বর অ্যাপ নিজে আঁকে), (২) ১:৭-এর ভেতরের ٦ চিহ্নের অদৃশ্য RLO (U+202E, ফন্টে নেই) বদলে বাকি সব চিহ্নের মতো "۝٦", (৩) অদৃশ্য U+200B/U+FEFF বাদ।
// নিরাপত্তা: ৬২৩৬ আয়াত, শেষ নম্বর = আয়াত-নম্বর (ফাতিহা ছাড়া; নিচে), প্রতি সূরার সংখ্যা meta.json-এর সাথে মিল,
//   Uthmani-র সাথে ব্যঞ্জনবর্ণ-কাঠামো মিল (জ্ঞাত রসম-পার্থক্য ছাড়া অমিল থাকলে ডেটা নেওয়া হয় না)।
// আউটপুট: ar-indopak-dk/NNN.json, ar-indopak-dk/NOTICE.txt, manifest.json-এ arabicIndopak, tools/quran/integrity-indopak.json।
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
if (Object.keys(src).length !== 6236) fail("৬২৩৬ আয়াত নেই (" + Object.keys(src).length + ")");

const DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => DIGITS[+d]);
// ফাতিহা: এই লেখা বিসমিল্লাহকে গোনে না এবং শেষ আয়াত দুই ভাগ করে (৬ ও ৭)। তাই অ্যাপের ১:১…১:৭-এর শেষ নম্বর যথাক্রমে: (নেই), ১, ২, ৩, ৪, ৫, ৭ (১:৭-এর ভেতরে ৬)।
const FATIHA_END = ["", "١", "٢", "٣", "٤", "٥", "٧"];

const per = [];
for (const su of meta.surahs) {
  const ar = [];
  for (let a = 1; a <= su.ayahs; a++) {
    const row = src[su.n + ":" + a];
    if (!row || typeof row.text !== "string") fail("আয়াত নেই: " + su.n + ":" + a);
    // শেষে: "۝" + (নম্বর) + (ঐচ্ছিক থামার-চিহ্ন)
    const m = /\s*\u06dd([\u0660-\u0669]*)[^\s\u06dd\u0660-\u0669]*$/u.exec(row.text);
    if (!m) fail("শেষে আয়াত-চিহ্ন নেই: " + su.n + ":" + a);
    const want = su.n === 1 ? FATIHA_END[a - 1] : toArabicDigits(a);
    if (m[1] !== want) fail("আয়াত-নম্বর অমিল: " + su.n + ":" + a + " (লেখায় " + m[1] + ", প্রত্যাশিত " + want + ")");
    let t = row.text.slice(0, m.index);
    // শুধু ১:৭-এর ভেতরের চিহ্ন: RLO + ٦ → "۝٦" (বাকি সব চিহ্নের মতো একই রূপ)
    if (su.n === 1 && a === 7) {
      if (!/\u202e\u0666/.test(t)) fail("১:৭-এর ভেতরের ٦ চিহ্ন পাওয়া যায়নি");
      t = t.replace("\u202e\u0666", " \u06dd\u0666");
    }
    t = t.replace(/[\u200b\ufeff]/g, "").trim();
    if (/[\u202e\u202d\u202a-\u202c\u2066-\u2069]/.test(t)) fail("অপ্রত্যাশিত bidi-নিয়ন্ত্রণ অক্ষর: " + su.n + ":" + a);
    if (!t) fail("খালি আয়াত " + su.n + ":" + a);
    ar.push(t);
  }
  if (ar.length !== su.ayahs) fail("সূরা " + su.n + ": আয়াত-সংখ্যা অমিল");
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
  .replace(/[\s\u0660-\u0669\u06D6-\u06ED\u0653\u06DD\u0654\u0655\u0674\u0670]/g, "").replace(/(.)\1+/g, "$1");
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
fs.mkdirSync(path.join(OUT, "ar-indopak-dk"), { recursive: true });
for (const su of meta.surahs) {
  const s = JSON.stringify({ v: 1, s: su.n, a: per[su.n - 1] });
  fs.writeFileSync(path.join(OUT, "ar-indopak-dk", pad3(su.n) + ".json"), s);
  integrity["ar-indopak-dk/" + pad3(su.n) + ".json"] = { bytes: Buffer.byteLength(s), sha256: sha(s) };
}
manifest.arabicIndopak = {
  script: "indopak-digitalkhatt", source: "DigitalKhatt IndoPak (Unicode text)", sourceUrl: "https://github.com/DigitalKhatt/digitalkhatt.org",
  license: "SIL OFL 1.1 (NOTICE.txt)", sha256: sha(per.flat().join("\n")), bismillahSeparated: true, bismillah: BISMILLAH,
};
const manifestStr = JSON.stringify(manifest);
fs.writeFileSync(manifestPath, manifestStr);
const here = path.dirname(new URL(import.meta.url).pathname);
const mainIntPath = path.resolve(here, "integrity.json");
const mainInt = JSON.parse(fs.readFileSync(mainIntPath, "utf8"));
mainInt.files["manifest.json"] = { bytes: Buffer.byteLength(manifestStr), sha256: sha(manifestStr) };
fs.writeFileSync(mainIntPath, JSON.stringify(mainInt, null, 1));
fs.writeFileSync(path.join(OUT, "ar-indopak-dk", "NOTICE.txt"), "IndoPak লেখা: DigitalKhatt (ইউনিকোড)। ফন্ট: DigitalKhatt IndoPak, SIL Open Font License 1.1 (../fonts/LICENSE-OFL.txt)।\n");
fs.writeFileSync(path.join(here, "integrity-indopak.json"), JSON.stringify({ input: sha(rawStr), files: integrity }, null, 1));
console.log("✅ IndoPak: ১১৪ সূরা-ফাইল, ৬২৩৬ আয়াত");
console.log("   ব্যঞ্জনবর্ণ অমিল (Uthmani-র সাথে): " + diffs.length + " (" + diffs.join(",") + ") | sha256 " + manifest.arabicIndopak.sha256.slice(0, 12) + "…");
