// tools/quran/build.mjs — কুরআনের ডেটা-ফাইল বানানোর স্ক্রিপ্ট (একবার চালানো হয়; অ্যাপ চালাতে লাগে না)।
// ব্যবহার (উৎস-ফাইল repo-তে commit করা হয় না, তাই পথ দিতে হয়):
//   node tools/quran/build.mjs --tanzil <ar.tanzil.quran-simple.txt/content.json> \
//        --bn <quran-json/dist/quran_bn.json> --xcheck <quran-json/dist/quran.json> \
//        --meta <quran-meta package ফোল্ডার (dist/hafs.js আছে)> [--out public/quran/v1]
// উৎস:
//   আরবি পাঠ  = Tanzil.net (Simple 1.0.2, CC BY 3.0) — অপরিবর্তিত; এখানে একটা অক্ষরও বদলানো হয় না।
//   বাংলা     = মুহিউদ্দীন খান (Tanzil.net bn.bengali), quran-json 3.1.2 হয়ে।
//   পারা/পৃষ্ঠা/রুকু/সিজদা = quran-meta 7 (MIT, Hafs/মাদানী ৬০৪ পৃষ্ঠা)।
//   আলাদা আরবি উৎস (quran-json) শুধু ক্রস-চেকে; আউটপুটে যায় না।
//   Tanzil-এর ১ম আয়াতে জুড়ে থাকা বিসমিল্লাহ-প্রিফিক্স আলাদা করা হয় (নিচে ব্যাখ্যা); আর কোনো পরিবর্তন নেই।
// আউটপুট: ar/NNN.json, tr/<id>/NNN.json, meta.json, manifest.json, translations.json
//   + tools/quran/integrity.json (SHA-256 তালিকা; অ্যাপে যায় না)।
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

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
const writeJson = (p, obj) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const s = JSON.stringify(obj);
  fs.writeFileSync(p, s);
  return s;
};

const OUT = path.resolve(arg("out", "public/quran/v1"));
const tanzilPath = arg("tanzil");
const bnPath = arg("bn");
const xPath = arg("xcheck");
const metaDir = path.resolve(arg("meta"));

const tanzilRaw = fs.readFileSync(tanzilPath, "utf8");
const bnRaw = fs.readFileSync(bnPath, "utf8");
const xRaw = fs.readFileSync(xPath, "utf8");
const tanzil = JSON.parse(tanzilRaw); // ৬২৩৬ স্ট্রিং, ক্রমানুসারে
const bn = JSON.parse(bnRaw); // ১১৪ সূরা × verses[]
const xc = JSON.parse(xRaw);
const Q = await import(pathToFileURL(path.join(metaDir, "dist/hafs.js")).href);

const fail = (m) => { console.error("❌ " + m); process.exit(1); };
if (!Array.isArray(tanzil) || tanzil.length !== 6236) fail("Tanzil: ৬২৩৬ আয়াত নেই (" + (tanzil && tanzil.length) + ")");
if (bn.length !== 114 || xc.length !== 114) fail("বাংলা/ক্রস-চেক উৎসে ১১৪ সূরা নেই");

// আয়াত-সংখ্যা: তিনটি স্বাধীন উৎস (quran-meta, quran-json বাংলা, quran-json আরবি) একমত হতে হবে।
const counts = [];
for (let s = 1; s <= 114; s++) {
  const c = Q.getAyahCountInSurah(s);
  if (bn[s - 1].verses.length !== c || xc[s - 1].verses.length !== c || bn[s - 1].id !== s) fail("সূরা " + s + ": আয়াত-সংখ্যা মিলছে না");
  counts.push(c);
}
if (counts.reduce((a, b) => a + b, 0) !== 6236) fail("মোট আয়াত ৬২৩৬ নয়");

// Tanzil-এর এই ফাইলে সূরা ২–১১৪ (তাওবাহ বাদে) প্রথম আয়াতের আগে বিসমিল্লাহ জুড়ে আছে (যেমন ২:১ = "বিসমিল্লাহ… আলিফ-লাম-মীম")।
// বিসমিল্লাহ আয়াত-সংখ্যায় পড়ে না; UI তা সূরার শিরোনাম-লাইন হিসেবে দেখাবে। তাই প্রিফিক্সটা (ফাতিহার ১ নম্বর আয়াতের
// হুবহু মিল থাকলে তবেই) কেটে আলাদা করা হয়। বাকি টেক্সট একটা অক্ষরও বদলায় না।
const BISMILLAH = tanzil[0];
let bismillahStripped = 0;
{
  let k = 0;
  for (let s = 1; s <= 114; s++) {
    if (s !== 1 && s !== 9) {
      if (!tanzil[k].startsWith(BISMILLAH + " ")) fail("সূরা " + s + ": প্রত্যাশিত বিসমিল্লাহ-প্রিফিক্স নেই");
      tanzil[k] = tanzil[k].slice(BISMILLAH.length + 1);
      bismillahStripped++;
    } else if (s === 9 && tanzil[k].startsWith(BISMILLAH)) fail("সূরা ৯-এ বিসমিল্লাহ থাকার কথা নয়");
    k += counts[s - 1];
  }
}

// ক্রস-চেক: হরকত/চিহ্ন বাদ দিয়ে অক্ষর-কাঠামো দুই উৎসে সমান কিনা (শুধু সতর্কতা-সংকেত, আউটপুট বদলায় না)।
// Tanzil Simple আর quran-json-এর আরবি লিপি-রীতি আলাদা (যেমন "الصلاة" বনাম "ٱلصَّلَوٰةَ"), তাই শুধু শক্ত ব্যঞ্জনবর্ণ মেলানো হয়।
// অবশিষ্ট ছোট অমিল রসম-রীতির পার্থক্য (যেমন يبسط/يبصط, "الليل"-এ লামের সংখ্যা) — আউটপুট এতে প্রভাবিত নয়।
const skel = (t) =>
  t.normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[\u0640\u200B-\u200F]/g, "")
    .replace(/[\u0671\u0622\u0623\u0625\u0621\u0670\u0627\u0624\u0626\u0648\u0649\u064A\u06E5\u06E6\u06E5\u06E6\u06DE\u06E9\u06FD\u0629]/g, "")
    .replace(/[\s\u06D6-\u06ED\u0653\u06DD]/g, "");
let g = 0;
const skelDiffs = [];
for (let s = 1; s <= 114; s++) {
  for (let a = 1; a <= counts[s - 1]; a++, g++) {
    if (skel(tanzil[g]) !== skel(xc[s - 1].verses[a - 1].text)) skelDiffs.push(s + ":" + a);
  }
}

// ফাইল লেখা
const integrity = {};
const record = (rel, str) => { integrity[rel] = { bytes: Buffer.byteLength(str), sha256: sha(str) }; };
g = 0;
for (let s = 1; s <= 114; s++) {
  const ar = tanzil.slice(g, g + counts[s - 1]);
  g += counts[s - 1];
  const tr = bn[s - 1].verses.map((v) => v.translation);
  if (ar.some((x) => typeof x !== "string" || !x) || tr.some((x) => typeof x !== "string" || !x)) fail("সূরা " + s + ": খালি আয়াত/অনুবাদ");
  record("ar/" + pad3(s) + ".json", writeJson(path.join(OUT, "ar", pad3(s) + ".json"), { v: 1, s, a: ar }));
  record("tr/bn_khan/" + pad3(s) + ".json", writeJson(path.join(OUT, "tr", "bn_khan", pad3(s) + ".json"), { v: 1, s, t: tr }));
}

// মেটাডেটা: প্রতিটা আয়াতের মেটা থেকে পারা/পৃষ্ঠা/রুকু/সিজদার শুরু-বিন্দু।
const BN_NAMES = [
  "আল-ফাতিহা","আল-বাকারা","আলে ইমরান","আন-নিসা","আল-মায়িদাহ","আল-আনআম","আল-আরাফ","আল-আনফাল","আত-তাওবাহ","ইউনুস",
  "হুদ","ইউসুফ","আর-রাদ","ইবরাহীম","আল-হিজর","আন-নাহল","বনী ইসরাঈল","আল-কাহফ","মারইয়াম","ত্বোয়া-হা",
  "আল-আম্বিয়া","আল-হাজ্জ","আল-মুমিনূন","আন-নূর","আল-ফুরকান","আশ-শুআরা","আন-নামল","আল-কাসাস","আল-আনকাবূত","আর-রূম",
  "লুকমান","আস-সাজদাহ","আল-আহযাব","সাবা","ফাতির","ইয়াসীন","আস-সাফফাত","সোয়াদ","আয-যুমার","গাফির",
  "ফুসসিলাত","আশ-শূরা","আয-যুখরুফ","আদ-দুখান","আল-জাসিয়া","আল-আহকাফ","মুহাম্মাদ","আল-ফাতহ","আল-হুজুরাত","ক্বাফ",
  "আয-যারিয়াত","আত-তূর","আন-নাজম","আল-ক্বামার","আর-রহমান","আল-ওয়াকিয়াহ","আল-হাদীদ","আল-মুজাদালাহ","আল-হাশর","আল-মুমতাহিনাহ",
  "আস-সাফ","আল-জুমুআ","আল-মুনাফিকূন","আত-তাগাবুন","আত-তালাক","আত-তাহরীম","আল-মুলক","আল-কালাম","আল-হাক্কাহ","আল-মাআরিজ",
  "নূহ","আল-জিন","আল-মুযযাম্মিল","আল-মুদ্দাসসির","আল-ক্বিয়ামাহ","আদ-দাহর","আল-মুরসালাত","আন-নাবা","আন-নাযিআত","আবাসা",
  "আত-তাকবীর","আল-ইনফিতার","আল-মুতাফফিফীন","আল-ইনশিকাক","আল-বুরূজ","আত-তারিক","আল-আ'লা","আল-গাশিয়াহ","আল-ফাজর","আল-বালাদ",
  "আশ-শামস","আল-লাইল","আদ-দুহা","আশ-শারহ","আত-তীন","আল-আলাক","আল-কদর","আল-বায়্যিনাহ","আয-যিলযাল","আল-আদিয়াত",
  "আল-ক্বারিআহ","আত-তাকাসুর","আল-আসর","আল-হুমাযাহ","আল-ফীল","কুরাইশ","আল-মাউন","আল-কাওসার","আল-কাফিরূন","আন-নাসর",
  "আল-লাহাব","আল-ইখলাস","আল-ফালাক","আন-নাস",
];
if (BN_NAMES.length !== 114) fail("বাংলা সূরা-নাম ১১৪টি নয়");

const juz = [], pages = [], rukus = [], sajdas = [];
const surahStart = [];
for (let id = 1; id <= 6236; id++) {
  const m = Q.getAyahMeta(id);
  const pos = [m.surah, m.ayah];
  if (m.ayah === 1) surahStart[m.surah] = id;
  if (m.isStartOfJuz) juz.push(pos);
  if (m.isStartOfPage) pages.push(pos);
  if (m.isStartOfRuku) rukus.push(pos);
  if (m.isSajdahAyah) sajdas.push(pos);
}
const surahs = bn.map((x, i) => ({
  n: x.id,
  ar: x.name,
  en: x.transliteration,
  bn: BN_NAMES[i],
  mean: x.translation, // বাংলা অর্থ (quran-json)
  type: x.type === "meccan" ? "m" : "d", // m = মাক্কী, d = মাদানী
  ayahs: counts[i],
  start: surahStart[x.id], // গ্লোবাল আয়াত-নম্বর (১..৬২৩৬)
}));
const meta = { v: 1, surahs, juz, pages, rukus, sajdas };
record("meta.json", writeJson(path.join(OUT, "meta.json"), meta));

// অনুবাদ-রেজিস্ট্রি: নতুন অনুবাদ = tr/<id>/ ফোল্ডার + এখানে এক এন্ট্রি।
const translations = {
  v: 1,
  default: "bn_khan",
  items: [
    {
      id: "bn_khan",
      lang: "bn",
      name: "মুহিউদ্দীন খান",
      nameEn: "Muhiuddin Khan",
      source: "Tanzil.net (bn.bengali)",
      sourceUrl: "https://tanzil.net/trans/bn.bengali",
      licenseStatus: "unverified",
    },
  ],
};
record("translations.json", writeJson(path.join(OUT, "translations.json"), translations));

const arabicAll = tanzil.join("\n"); // প্রিফিক্স-আলাদা করার পরের চূড়ান্ত পাঠ
const manifest = {
  v: 1,
  dataVersion: "1",
  counts: { surahs: 114, ayahs: 6236, juz: juz.length, pages: pages.length, rukus: rukus.length, sajdas: sajdas.length },
  arabic: {
    script: "tanzil-simple",
    source: "Tanzil.net",
    sourceUrl: "https://tanzil.net",
    version: "1.0.2",
    license: "CC BY 3.0",
    sha256: sha(arabicAll),
    bismillahSeparated: true, // সূরা ২–১১৪ (৯ বাদে): আয়াত ১ থেকে বিসমিল্লাহ-প্রিফিক্স বাদ; UI শিরোনামে দেখায়
    bismillah: BISMILLAH,
  },
  structure: "Hafs / মাদানী ৬০৪ পৃষ্ঠা (quran-meta 7, MIT)",
};
record("manifest.json", writeJson(path.join(OUT, "manifest.json"), manifest));

// Tanzil-এর শর্ত: কপিরাইট-ব্লক অক্ষত রেখে সাথে রাখতে হবে।
const lic = [
  "# Tanzil Quran Text (Simple, version 1.0.2)",
  "# Copyright (C) 2008-2010 Tanzil.net",
  "# License: Creative Commons Attribution 3.0",
  "#",
  "# - Permission is granted to copy and distribute verbatim copies of this text, but CHANGING IT IS NOT ALLOWED.",
  "# - This quran text can be used in any website or application, provided its source (Tanzil.net) is clearly",
  "#   indicated, and a link is made to http://tanzil.net to enable users to keep track of changes.",
  "# - This copyright notice shall be included in all verbatim copies of the text, and shall be reproduced",
  "#   appropriately in all files derived from or containing substantial portion of this text.",
  "#",
  "# Please check updates at: http://tanzil.net/updates/",
  "",
].join("\n");
fs.writeFileSync(path.join(OUT, "ar", "LICENSE-TANZIL.txt"), lic);

const intPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "integrity.json");
fs.writeFileSync(intPath, JSON.stringify({
  inputs: { tanzil: sha(tanzilRaw), bn: sha(bnRaw), xcheck: sha(xRaw) },
  files: integrity,
}, null, 1));

const totalBytes = Object.values(integrity).reduce((a, f) => a + f.bytes, 0);
console.log("✅ সম্পন্ন: ২২৮টি সূরা-ফাইল + meta/manifest/translations");
console.log("   মোট আকার (অসংকুচিত): " + (totalBytes / 1024).toFixed(0) + " KB");
console.log("   পারা " + juz.length + ", পৃষ্ঠা " + pages.length + ", রুকু " + rukus.length + ", সিজদা " + sajdas.length);
console.log("   বিসমিল্লাহ-প্রিফিক্স আলাদা করা হয়েছে: " + bismillahStripped + " সূরায় (প্রত্যাশিত ১১২)");
console.log("   আরবি ক্রস-চেক (ব্যঞ্জনবর্ণ) অমিল: " + skelDiffs.length + " / ৬২৩৬ (রসম-রীতির পার্থক্য প্রত্যাশিত)");
