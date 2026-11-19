// quranCore.js — কুরআন-রিডারের pure লজিক (Firebase/React-মুক্ত, node --test-যোগ্য)।
// ডেটা-ফাইলের গঠন/উৎস: tools/quran/build.mjs। এখানে শুধু যাচাই, নাম-লেবেল ও "শেষ পাঠ"-এর হিসাব।

import { DEFAULT_FONT, DEFAULT_SCRIPT, isValidScript, scriptById, fontFitsScript, DEFAULT_ALIGN, DEFAULT_GAP, isValidAlign, isValidGap } from "./quranFonts.js";

export const QURAN_BASE = "/quran/v1"; // ডেটা বদলাতে হলে নতুন ফোল্ডার (v2) — sw.js-এর cache-first নিয়মের কারণে।
export const DEFAULT_TRANSLATION = "bn_khan";
export const LAST_READ_MAX = 3;
export const QUICK_SURAHS = [18, 36, 55, 56, 67]; // কাহফ, ইয়াসীন, রহমান, ওয়াকিয়াহ, মুলক
export const PAGE_SIZE = 30; // একসাথে কয়টা আয়াত রেন্ডার হবে

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBnDigits = (n) => String(n).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
export const pad3 = (n) => String(n).padStart(3, "0");

export function surahTypeLabel(t) {
  return t === "m" ? "মাক্কী" : "মাদানী";
}

// বিসমিল্লাহ শিরোনাম-লাইন: ফাতিহায় ১ নম্বর আয়াতই বিসমিল্লাহ, তাওবাহ-য় নেই।
export function showBismillahHeader(surahNo) {
  return surahNo !== 1 && surahNo !== 9;
}

export function refLabel(surah, ayah) {
  return surah.bn + " " + toBnDigits(surah.n) + ":" + toBnDigits(ayah);
}

// আরবি ও অনুবাদ-ফাইল যাচাই করে আয়াত-তালিকা বানায়। গরমিল (সংখ্যা/সূরা) হলে throw —
// ভুল-সারিবদ্ধ আয়াত দেখানোর চেয়ে error-state ভালো।
export function parseSurahPayload(ar, tr, surah) {
  const bad = (m) => { throw new Error("quran data: " + m); };
  if (!ar || ar.s !== surah.n || !Array.isArray(ar.a)) bad("আরবি ফাইল অবৈধ");
  if (!tr || tr.s !== surah.n || !Array.isArray(tr.t)) bad("অনুবাদ ফাইল অবৈধ");
  if (ar.a.length !== surah.ayahs || tr.t.length !== surah.ayahs) bad("আয়াত-সংখ্যা মেলেনি");
  return ar.a.map((text, i) => {
    if (typeof text !== "string" || typeof tr.t[i] !== "string") bad("অবৈধ আয়াত " + (i + 1));
    return { n: i + 1, ar: text, tr: tr.t[i] };
  });
}

// শেষ পাঠ: [{s, a, t}] — সর্বশেষ আগে, প্রতি সূরায় একটা, ≤LAST_READ_MAX; অবৈধ এন্ট্রি বাদ।
export function sanitizeLastRead(raw, surahs) {
  if (!Array.isArray(raw) || !Array.isArray(surahs)) return [];
  const seen = new Set();
  const out = [];
  for (const x of raw) {
    if (!x || !Number.isInteger(x.s) || !Number.isInteger(x.a)) continue;
    const sm = surahs[x.s - 1];
    if (!sm || x.a < 1 || x.a > sm.ayahs || seen.has(x.s)) continue;
    seen.add(x.s);
    out.push({ s: x.s, a: x.a, t: Number.isFinite(x.t) ? x.t : 0 });
  }
  out.sort((p, q) => q.t - p.t);
  return out.slice(0, LAST_READ_MAX);
}

export function pushLastRead(list, s, a, now) {
  const rest = (Array.isArray(list) ? list : []).filter((x) => x && x.s !== s);
  return [{ s, a, t: now }, ...rest].slice(0, LAST_READ_MAX);
}

// ───────── ধাপ ৩: পছন্দ (ফন্ট/থিম/সুইচ), পারা-পৃষ্ঠা-অবস্থান, রেফারেন্স-জাম্প, কপি-টেক্সট ─────────

export const AR_SIZE = { min: 22, max: 48, step: 2, def: 28 };
export const TR_SIZE = { min: 13, max: 26, step: 1, def: 16 };
export const DEFAULT_PREFS = { arSize: AR_SIZE.def, trSize: TR_SIZE.def, showAr: true, showTr: true, theme: 0, mode: "list", arFont: DEFAULT_FONT, arScript: DEFAULT_SCRIPT, arAlign: DEFAULT_ALIGN, arGap: DEFAULT_GAP, wbw: false };

const clampNum = (v, lim) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return lim.def;
  return Math.min(lim.max, Math.max(lim.min, Math.round(n)));
};

// পছন্দ যাচাই: অবৈধ মান → ডিফল্ট। আরবি ও অনুবাদ দুটোই বন্ধ থাকতে পারে না (খালি পর্দা এড়াতে)।
export function sanitizePrefs(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  let showAr = typeof r.showAr === "boolean" ? r.showAr : true;
  const showTr = typeof r.showTr === "boolean" ? r.showTr : true;
  if (!showAr && !showTr) showAr = true;
  const arScript = isValidScript(r.arScript) ? r.arScript : DEFAULT_SCRIPT;
  return {
    arSize: clampNum(r.arSize, AR_SIZE),
    trSize: clampNum(r.trSize, TR_SIZE),
    showAr,
    showTr,
    theme: [0, 1, 2].includes(r.theme) ? r.theme : 0, // 0=সাদা, 1=সেপিয়া, 2=ডার্ক (readerCore THEMES)
    mode: r.mode === "read" ? "read" : "list", // list=আয়াত-তালিকা (অনুবাদসহ), read=অবিচ্ছিন্ন আরবি
    arScript,
    arAlign: isValidAlign(r.arAlign) ? r.arAlign : DEFAULT_ALIGN, // রিডিং/মুসহাফের এলাইন
    arGap: isValidGap(r.arGap) ? r.arGap : DEFAULT_GAP, // লাইন-ফাঁক
    wbw: r.wbw === true, // শব্দে শব্দে অর্থ (ঐচ্ছিক; পুরনো সেভে নেই ⇒ বন্ধ)
    arFont: fontFitsScript(r.arFont, arScript) ? r.arFont : scriptById(arScript).defaultFont, // অজানা বা লেখার সাথে বেমানান ফন্ট → ওই লেখার ডিফল্ট
  };
}

// ── শব্দে শব্দে অর্থ (ইংরেজি) ──
// অর্থ-ফাইল (/quran/v1/wbw-en/NNN.json) = {v:1, s, w:[আয়াত → [শব্দের অর্থ…] | null]}; null = ওই আয়াতের অর্থ-ডেটা অসম্পূর্ণ।
// আরবি শব্দ আলাদা ফাইলে নেই — বিদ্যমান আয়াত-লেখা ফাঁকা দিয়ে ভাগ করে মেলানো হয়।
// শুধু উসমানি ও ইন্দো-পাকে শব্দ-সংখ্যা অর্থ-ডেটার সাথে প্রায় হুবহু মেলে; সরল লেখায় "ইয়া আইয়ুহা" দুই শব্দ হয়ে যায় বলে ৫০০+ আয়াত মেলে না।
export const WBW_SCRIPTS = ["uthmani", "indopak"];
export const wbwSupported = (script) => WBW_SCRIPTS.includes(script);

// আরবি আয়াত + অর্থ-তালিকা → [{ar, en}]। সংখ্যা না মিললে বা তথ্য অবৈধ হলে null (UI তখন সাধারণ আয়াত দেখায়) — ভুল জোড়া দেখানোর চেয়ে না দেখানো নিরাপদ।
export function alignWords(arText, meanings) {
  if (typeof arText !== "string" || !Array.isArray(meanings) || meanings.length === 0) return null;
  const words = arText.split(/\s+/).filter(Boolean);
  if (words.length !== meanings.length) return null;
  const out = [];
  for (let i = 0; i < words.length; i++) {
    if (typeof meanings[i] !== "string" || !meanings[i]) return null;
    out.push({ ar: words[i], en: meanings[i] });
  }
  return out;
}

export function parseWbwPayload(j, surah) {
  if (!j || j.s !== surah.n || !Array.isArray(j.w) || j.w.length !== surah.ayahs) throw new Error("quran data: অর্থ ফাইল অবৈধ");
  return j.w;
}

// লেখার ধরন বদলালে ফন্ট মানানসই না হলে ওই ধরনের ডিফল্ট ফন্ট বসে (পুরনো পছন্দ অক্ষত থাকে)।
export function switchScript(prefs, script) {
  if (!isValidScript(script)) return prefs;
  return { ...prefs, arScript: script, arFont: fontFitsScript(prefs.arFont, script) ? prefs.arFont : scriptById(script).defaultFont };
}

export const PARA_NAMES = [
  "আলিফ লাম মীম", "সাইয়াকূল", "তিলকার রুসুল", "লান তানালূ", "ওয়াল মুহসানাত", "লা ইউহিব্বুল্লাহ",
  "ওয়া ইযা সামিঊ", "ওয়ালাও আন্নানা", "কালাল মালাউ", "ওয়া'লামূ", "ইয়াতাযিরূন", "ওয়ামা মিন দাব্বাহ",
  "ওয়ামা উবাররিউ", "রুবামা", "সুবহানাল্লাযী", "কালা আলাম", "ইকতারাবা", "কাদ আফলাহা",
  "ওয়া কালাল্লাযীনা", "আম্মান খালাক্বা", "উতলু মা উহিয়া", "ওয়া মান ইয়াকনুত", "ওয়া মালিয়া", "ফামান আযলামু",
  "ইলাইহি ইউরাদ্দু", "হা-মীম", "কালা ফামা খাতবুকুম", "কাদ সামিআল্লাহ", "তাবারাকাল্লাযী", "আম্মা",
];

// "২:২৫৫", "2:255", "২/২৫৫", "2 255", "2.255" → {s, a}; অবৈধ/সীমার বাইরে → null।
export function parseRef(input, surahs) {
  if (typeof input !== "string" || !Array.isArray(surahs)) return null;
  const en = input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));
  const m = en.trim().match(/^(\d{1,3})\s*[:/.\-\s]\s*(\d{1,3})$/);
  if (!m) return null;
  const s = Number(m[1]);
  const a = Number(m[2]);
  const sm = surahs[s - 1];
  if (!sm || a < 1 || a > sm.ayahs) return null;
  return { s, a };
}

// meta-র শুরু-বিন্দু ([সূরা, আয়াত]) → দ্রুত খোঁজার কাঠামো।
const gid = (meta, s, a) => meta.surahs[s - 1].start + a - 1;

// আয়াত (s,a) কোন পারা/পৃষ্ঠায় — শুরু-বিন্দুর তালিকায় বাইনারি সার্চ।
function indexIn(meta, starts, s, a) {
  const g = gid(meta, s, a);
  let lo = 0;
  let hi = starts.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (gid(meta, starts[mid][0], starts[mid][1]) <= g) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans + 1;
}
export function locateAyah(meta, s, a) {
  return { juz: indexIn(meta, meta.juz, s, a), page: indexIn(meta, meta.pages, s, a) };
}

// ───────── ধাপ ৬খ: পৃষ্ঠা-মুসহাফ ─────────
export const PAGE_COUNT = 604;
export function clampPage(p) {
  const n = Math.round(Number(p));
  return Number.isFinite(n) ? Math.min(PAGE_COUNT, Math.max(1, n)) : 1;
}

// পৃষ্ঠা p-র আয়াতগুলো ক্রমানুসারে [{s, a}]। শুরু-বিন্দু meta.pages থেকে; শেষ = পরের পৃষ্ঠার শুরুর আগের আয়াত।
export function pageAyahRefs(meta, p) {
  const n = clampPage(p);
  const [s0, a0] = meta.pages[n - 1];
  const last = meta.surahs[meta.surahs.length - 1];
  const endG = n < meta.pages.length ? gid(meta, meta.pages[n][0], meta.pages[n][1]) - 1 : last.start + last.ayahs - 1;
  const out = [];
  let s = s0;
  let a = a0;
  for (let g = gid(meta, s0, a0); g <= endG; g++) {
    out.push({ s, a });
    a += 1;
    if (a > meta.surahs[s - 1].ayahs) { s += 1; a = 1; }
  }
  return out;
}

// UI-র দাগ: কোন আয়াতে পারা/পৃষ্ঠা শুরু, কোনটা সিজদার আয়াত। কী = "সূরা:আয়াত"।
export function buildMarkers(meta) {
  const juz = new Map();
  const page = new Map();
  const sajda = new Set();
  meta.juz.forEach(([s, a], i) => juz.set(s + ":" + a, i + 1));
  meta.pages.forEach(([s, a], i) => page.set(s + ":" + a, i + 1));
  meta.sajdas.forEach(([s, a]) => sajda.add(s + ":" + a));
  return { juz, page, sajda };
}

// আয়াতটি সূরার কত নম্বর রুকুতে (১ থেকে)। meta.rukus = [[সূরা, আয়াত], …] (সূরা-আয়াত ক্রমে); ডেটা না থাকলে ০।
export function rukuOf(meta, s, a) {
  const list = meta && Array.isArray(meta.rukus) ? meta.rukus : [];
  let n = 0;
  for (const r of list) {
    if (r[0] === s && r[1] <= a) n += 1;
    else if (r[0] > s) break;
  }
  return n;
}

// কপি/শেয়ারের লেখা: যা পর্দায় দেখানো হচ্ছে (আরবি/অনুবাদ) তা-ই, শেষে সূত্র।
export function ayahShareText(surah, ayah, prefs, translatorName) {
  const parts = [];
  if (prefs.showAr) parts.push(ayah.ar);
  if (prefs.showTr) parts.push(ayah.tr);
  const src = "— সূরা " + surah.bn + " " + toBnDigits(surah.n) + ":" + toBnDigits(ayah.n) +
    (prefs.showTr && translatorName ? " (অনুবাদ: " + translatorName + ")" : "");
  return parts.join("\n\n") + "\n\n" + src;
}

// ───────── ধাপ ৪: বুকমার্ক ও পছন্দের আয়াত (ক্লাউড-সিঙ্কযোগ্য) ─────────
// এন্ট্রি: { s: সূরা, a: আয়াত, k: "b"(বুকমার্ক) | "f"(পছন্দের), t: সময় }। একই (s,a,k) একবারই।
// এই sanitize-ই একমাত্র যাচাই (Rules শুধু তালিকার আকার বাঁধে)।

export const MARKS_MAX = 300; // firestore.rules-এর সীমার সাথে মিলিয়ে রাখতে হবে
export const MARK_KINDS = ["b", "f"];

export const markKey = (s, a, k) => s + ":" + a + ":" + k;

export function sanitizeMarks(raw, surahs) {
  if (!Array.isArray(raw) || !Array.isArray(surahs)) return [];
  const seen = new Set();
  const out = [];
  for (const x of raw) {
    if (!x || !Number.isInteger(x.s) || !Number.isInteger(x.a) || !MARK_KINDS.includes(x.k)) continue;
    const sm = surahs[x.s - 1];
    if (!sm || x.a < 1 || x.a > sm.ayahs) continue;
    const key = markKey(x.s, x.a, x.k);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ s: x.s, a: x.a, k: x.k, t: Number.isFinite(x.t) ? x.t : 0 });
  }
  out.sort((p, q) => q.t - p.t);
  return out.slice(0, MARKS_MAX);
}

// আছে → সরানো; নেই → যোগ। সীমা পূর্ণ হলে নতুন যোগ হয় না (পুরনোটা চুপচাপ মুছে ফেলা হয় না — ডেটা হারানো নয়)।
export function toggleMark(list, s, a, k, now) {
  const cur = Array.isArray(list) ? list : [];
  const key = markKey(s, a, k);
  if (cur.some((x) => markKey(x.s, x.a, x.k) === key)) {
    return { list: cur.filter((x) => markKey(x.s, x.a, x.k) !== key), added: false, full: false };
  }
  if (cur.length >= MARKS_MAX) return { list: cur, added: false, full: true };
  return { list: [{ s, a, k, t: now }, ...cur], added: true, full: false };
}

// দুই তালিকার মিলন (কোনো এন্ট্রি হারায় না); একই কী-তে নতুন সময়টা থাকে।
export function mergeMarks(a, b, surahs) {
  const best = new Map();
  for (const x of sanitizeMarks(a, surahs).concat(sanitizeMarks(b, surahs))) {
    const key = markKey(x.s, x.a, x.k);
    const old = best.get(key);
    if (!old || x.t > old.t) best.set(key, x);
  }
  return sanitizeMarks([...best.values()], surahs);
}

// শেষ পাঠের মিলন: প্রতি সূরায় নতুনটা, সর্বোচ্চ LAST_READ_MAX।
export function mergeLastRead(a, b, surahs) {
  return sanitizeLastRead(
    [...sanitizeLastRead(a, surahs), ...sanitizeLastRead(b, surahs)].sort((p, q) => q.t - p.t),
    surahs
  );
}

// ক্লাউড-ডক (users/{uid}/quran/state) যাচাই; অবৈধ হলে খালি।
export function sanitizeCloudState(raw, surahs) {
  const r = raw && typeof raw === "object" ? raw : {};
  return { marks: sanitizeMarks(r.marks, surahs), last: sanitizeLastRead(r.last, surahs) };
}

// ───────── ধাপ ৫: সার্চ (আরবি / বাংলা / সূরার নাম) ─────────
// ডেটা নতুন ফাইল ছাড়াই: সব আয়াত একবার মেমোরিতে নিয়ে normalize করা লেখার ওপর খোঁজা (৬২৩৬ আয়াত — তাৎক্ষণিক)।

export const SEARCH_MIN = 2; // এর চেয়ে ছোট প্রশ্নে খোঁজা হয় না
export const SEARCH_LIMIT = 100; // সর্বোচ্চ দেখানো ফল

export const hasArabic = (s) => /[؀-ۿݐ-ݿ]/.test(String(s || ""));

// আরবি: হরকত/কুরআনীয় চিহ্ন/টানা-রেখা/আলিফ বাদ; ইয়া/তা-মারবুতার রূপভেদ এক করা — যাতে হরকত ছাড়া লিখলেও মেলে।
export function normalizeArabic(s) {
  return String(s || "")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/g, "")
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/[ىیئ]/g, "ي") // ى ی ئ → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ک/g, "ك") // ک → ك
    .replace(/\u0627/g, "") // আলিফ বাদ: "العالمين" (খঞ্জর-আলিফ) ও "العلمين" একই হয়ে মেলে
    .replace(/\s+/g, " ")
    .trim();
}

// বাংলা/ইংরেজি: NFC, ZWJ/ZWNJ বাদ, ছোট হাতের অক্ষর, বাড়তি ফাঁকা বাদ।
export function normalizeText(s) {
  return String(s || "").normalize("NFC").replace(/[​-‍﻿]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// সূরার নাম মেলানো (বাংলা/ইংরেজি/অর্থ/আরবি): হাইফেন-ফাঁকা-অ্যাপোস্ট্রফি বাদ দিয়ে।
const squash = (s) => normalizeText(s).replace(/[-'’‘`\s.]/g, "");
export function searchSurahNames(q, surahs) {
  if (!Array.isArray(surahs)) return [];
  const ar = hasArabic(q);
  const key = ar ? normalizeArabic(q).replace(/\s/g, "") : squash(q);
  if (key.length < SEARCH_MIN) return [];
  return surahs.filter((s) => {
    if (ar) return normalizeArabic(s.ar).replace(/\s/g, "").includes(key);
    return squash(s.bn).includes(key) || squash(s.en).includes(key) || squash(s.mean).includes(key);
  });
}

// all[i] = সূরা (i+1)-এর [{n, ar, tr}] → খোঁজার ইনডেক্স।
export function buildSearchIndex(all) {
  const ar = [];
  const tr = [];
  for (const ayahs of all) {
    ar.push(ayahs.map((a) => normalizeArabic(a.ar)));
    tr.push(ayahs.map((a) => normalizeText(a.tr)));
  }
  return { raw: all, ar, tr };
}

// প্রশ্নের প্রতিটা শব্দ থাকতে হবে (AND), ক্রম যাই হোক। ফল কুরআনের ক্রমে।
// আরবি অক্ষর থাকলে আরবি লেখায়, নইলে অনুবাদে খোঁজে।
export function searchIndex(index, q, limit = SEARCH_LIMIT) {
  const arabic = hasArabic(q);
  const norm = arabic ? normalizeArabic(q) : normalizeText(q);
  const tokens = norm.split(" ").filter(Boolean);
  if (!index || norm.replace(/\s/g, "").length < SEARCH_MIN) return { field: arabic ? "ar" : "tr", total: 0, hits: [] };
  const field = arabic ? index.ar : index.tr;
  const hits = [];
  let total = 0;
  for (let si = 0; si < field.length; si++) {
    const list = field[si];
    for (let ai = 0; ai < list.length; ai++) {
      const text = list[ai];
      if (tokens.every((t) => text.includes(t))) {
        total++;
        if (hits.length < limit) hits.push({ s: si + 1, a: ai + 1, ar: index.raw[si][ai].ar, tr: index.raw[si][ai].tr });
      }
    }
  }
  return { field: arabic ? "ar" : "tr", total, hits };
}
