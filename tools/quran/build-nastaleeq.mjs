// tools/quran/build-nastaleeq.mjs — "নাস্তালিক (KFGQPC)" আরবি লেখার ডেটা-ফাইল বানানো (একবার চালানো; অ্যাপ চালাতে লাগে না)।
// ব্যবহার: node tools/quran/build-nastaleeq.mjs --src <qpc-nastaleeq.json (শব্দ-ভিত্তিক, "সূরা:আয়াত:শব্দ" → {text})> [--out public/quran/v1]
// উৎস: QUL (Tarteel) "QPC Nastaleeq script - Word by Word" — KFGQPC Nastaleeq ফন্টের নিজস্ব জোড়া লেখা, অপরিবর্তিত। শুধু: (১) প্রতি আয়াতের শেষ শব্দ (আয়াত-নম্বর চিহ্ন) বাদ — নম্বর অ্যাপ নিজে আঁকে, (২) U+00A0 → সাধারণ ফাঁকা, (৩) শব্দগুলো ফাঁকা দিয়ে জোড়া।
// নিরাপত্তা: ৬২৩৬ আয়াত, প্রতি সূরার সংখ্যা meta.json-এর সাথে মিল, শব্দ-ক্রম অবিচ্ছিন্ন, শেষ শব্দ সত্যিই নম্বর-চিহ্ন, ব্যঞ্জনবর্ণ-কাঠামো Uthmani-র সাথে মিল (জ্ঞাত পার্থক্য ছাড়া অমিল থাকলে ডেটা নেওয়া হয় না)।
// আউটপুট: ar-nastaleeq/NNN.json, ar-nastaleeq/NOTICE.txt, manifest.json-এ arabicNastaleeq, tools/quran/integrity-nastaleeq.json।
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

// শব্দ → আয়াত (ফাইলের ক্রমে ভরসা নয়; কী ধরে সাজানো)
const words = new Map();
for (const v of Object.values(src)) {
  if (!v || typeof v.text !== "string") fail("অবৈধ শব্দ-সারি");
  const s = +v.surah, a = +v.ayah, w = +v.word;
  if (!(s >= 1 && a >= 1 && w >= 1)) fail("অবৈধ সংখ্যা: " + v.location);
  const k = s + ":" + a;
  if (!words.has(k)) words.set(k, []);
  words.get(k).push([w, v.text]);
}
const DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => DIGITS[+d]);
// শেষ শব্দ = আয়াত-নম্বর (আরবি অঙ্ক) + ঐচ্ছিক থামার-চিহ্ন (Arabic Presentation Forms-এর অক্ষর)।
const END = /^([\u0660-\u0669]+)[\uFB50-\uFDFF\u06D6-\u06DC\u0615-\u061A]*$/u;

const per = [];
for (const su of meta.surahs) {
  const ar = [];
  for (let a = 1; a <= su.ayahs; a++) {
    const ws = words.get(su.n + ":" + a);
    if (!ws) fail("আয়াত নেই: " + su.n + ":" + a);
    ws.sort((x, y) => x[0] - y[0]);
    if (!ws.every((x, i) => x[0] === i + 1)) fail("শব্দ-ক্রমে ফাঁক: " + su.n + ":" + a);
    const last = ws[ws.length - 1][1];
    const m = END.exec(last);
    if (!m) fail("শেষ শব্দ আয়াত-নম্বর নয়: " + su.n + ":" + a);
    if (m[1] !== toArabicDigits(a)) fail("আয়াত-নম্বর অমিল: " + su.n + ":" + a + " (লেখায় " + m[1] + ")");
    const t = ws.slice(0, -1).map((x) => x[1].replace(/\u00a0/g, " ").trim()).filter(Boolean).join(" ").replace(/ {2,}/g, " ").trim();
    if (!t) fail("খালি আয়াত " + su.n + ":" + a);
    if (/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(t)) fail("অপ্রত্যাশিত অদৃশ্য/bidi অক্ষর: " + su.n + ":" + a);
    ar.push(t);
  }
  if (ar.length !== su.ayahs) fail("সূরা " + su.n + ": আয়াত-সংখ্যা অমিল");
  per.push(ar);
}
if (per.flat().length !== 6236) fail("মোট আয়াত ৬২৩৬ নয়");
if (words.size !== 6236) fail("উৎসে বাড়তি আয়াত আছে: " + words.size);

const BISMILLAH = per[0][0];
for (let n = 2; n <= 114; n++) if (per[n - 1][0].includes(BISMILLAH)) fail("সূরা " + n + "-এ বিসমিল্লাহ জোড়া আছে");

// ব্যঞ্জনবর্ণ-কাঠামো (Uthmani-র সাথে) — build-indopak.mjs-এর একই নিয়ম।
// এই লেখায় থামার-চিহ্ন (ওয়াকফ) Presentation-Forms অক্ষর (U+FB50–FDFF); NFKD-তে এগুলো আসল অক্ষরে ভাঙে, তাই আগেই বাদ।
const skel = (t) => t.replace(/[\uFB50-\uFDFF]/g, "").normalize("NFKD").replace(/[\p{Mn}\p{Cf}\uE000-\uF8FF]/gu, "").replace(/[\u0640\u2002\u2003]/g, "")
  .replace(/[\u066E\u06D2\u06CC\u0649]/g, "\u064A").replace(/\u06AA|\u06A9/g, "\u0643").replace(/[\u0629\u06C3\u06C1\u06BE]/g, "\u0647")
  .replace(/[\u0671\u0622\u0623\u0625\u0621\u0627\u0624\u0626\u0648\u064A\u06E5\u06E6\u0647]/g, "")
  .replace(/[\s\u0660-\u0669\u06D6-\u06ED\u0653\u06DD\u0654\u0655\u0674\u0670]/g, "").replace(/(.)\1+/g, "$1");
const diffs = [];
for (const su of meta.surahs) {
  const u = JSON.parse(fs.readFileSync(path.join(OUT, "ar-uthmani", pad3(su.n) + ".json"), "utf8")).a;
  if (u.length !== per[su.n - 1].length) fail("সূরা " + su.n + ": Uthmani-র সাথে আয়াত-সংখ্যা অমিল");
  u.forEach((x, i) => { if (!(su.n === 1 && i === 0) && skel(x) !== skel(per[su.n - 1][i])) diffs.push(su.n + ":" + (i + 1)); });
}
// জ্ঞাত রসম-পার্থক্য: ৭২:১৬ (أن لو / ألو) — IndoPak ধাপেও একই।
const EXPECTED = ["72:16"];
if (diffs.join() !== EXPECTED.join()) fail("ব্যঞ্জনবর্ণ-অমিল (" + diffs.length + "): " + diffs.slice(0, 20).join(", "));

const integrity = {};
fs.mkdirSync(path.join(OUT, "ar-nastaleeq"), { recursive: true });
for (const su of meta.surahs) {
  const s = JSON.stringify({ v: 1, s: su.n, a: per[su.n - 1] });
  fs.writeFileSync(path.join(OUT, "ar-nastaleeq", pad3(su.n) + ".json"), s);
  integrity["ar-nastaleeq/" + pad3(su.n) + ".json"] = { bytes: Buffer.byteLength(s), sha256: sha(s) };
}
manifest.arabicNastaleeq = {
  script: "nastaleeq-qpc", source: "QUL (Tarteel) — QPC Nastaleeq script (Word by Word), KFGQPC", sourceUrl: "https://qul.tarteel.ai/resources",
  license: "KFGQPC (অপরিবর্তিত রাখার শর্তে; NOTICE.txt)", sha256: sha(per.flat().join("\n")), bismillahSeparated: true, bismillah: BISMILLAH,
};
const manifestStr = JSON.stringify(manifest);
fs.writeFileSync(manifestPath, manifestStr);
const here = path.dirname(new URL(import.meta.url).pathname);
const mainIntPath = path.resolve(here, "integrity.json");
const mainInt = JSON.parse(fs.readFileSync(mainIntPath, "utf8"));
mainInt.files["manifest.json"] = { bytes: Buffer.byteLength(manifestStr), sha256: sha(manifestStr) };
fs.writeFileSync(mainIntPath, JSON.stringify(mainInt, null, 1));
fs.writeFileSync(path.join(OUT, "ar-nastaleeq", "NOTICE.txt"), "নাস্তালিক লেখা: QUL (Tarteel) QPC Nastaleeq, KFGQPC (মদীনা) — শব্দ জোড়া ও আয়াত-নম্বর বাদ ছাড়া অপরিবর্তিত। ফন্ট: ../fonts/NOTICE-fonts.txt।\n");
fs.writeFileSync(path.join(here, "integrity-nastaleeq.json"), JSON.stringify({ input: sha(rawStr), files: integrity }, null, 1));
console.log("✅ Nastaleeq: ১১৪ সূরা-ফাইল, ৬২৩৬ আয়াত");
console.log("   ব্যঞ্জনবর্ণ অমিল (Uthmani-র সাথে): " + diffs.length + " | sha256 " + manifest.arabicNastaleeq.sha256.slice(0, 12) + "…");
