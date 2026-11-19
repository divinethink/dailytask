// quranData.js — কুরআন-ডেটার data-layer: অ্যাপের নিজের হোস্ট (/quran/v1/…) থেকে on-demand fetch।
// ক্যাশ: ব্রাউজারে in-memory + sw.js-এর আলাদা `quran-v1` cache (অফলাইনে পড়া যায়)।
// ব্যর্থ হলে throw — UI error-state দেখায়; অনির্দিষ্ট loading নয় (timeout + এক বার retry)।
import { QURAN_BASE, DEFAULT_TRANSLATION, pad3, parseSurahPayload, parseWbwPayload, buildSearchIndex } from "./quranCore.js";
import { scriptById, DEFAULT_SCRIPT, fontById } from "./quranFonts.js";
import { validateTafsirPayload } from "./quranTafsir.js";
import { sanitizeIndex, sanitizePage, clamp16, M16_VER } from "./mushaf16.js";

const TIMEOUT_MS = 15000;
let metaPromise = null;
const surahCache = new Map();

// আরবি লেখার ফাইলের ঠিকানা। sw.js কুরআনের ফাইল চিরকাল ক্যাশ রাখে, তাই ডেটা বদলালে scripts-এর `v` বাড়ালে নতুন ঠিকানা হয়ে সবার ফোনে নতুন ফাইল আসে।
const arUrl = (sc, n) => QURAN_BASE + "/" + sc.dir + "/" + pad3(n) + ".json" + (sc.v ? "?v=" + sc.v : "");

async function getJson(url) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastErr;
}

export function loadMeta() {
  if (!metaPromise) {
    metaPromise = getJson(QURAN_BASE + "/meta.json").then((m) => {
      if (!m || !Array.isArray(m.surahs) || m.surahs.length !== 114) throw new Error("quran meta অবৈধ");
      return m;
    });
    metaPromise.catch(() => { metaPromise = null; }); // ব্যর্থ হলে পরেরবার আবার চেষ্টা
  }
  return metaPromise;
}

// surah = meta.surahs[i] ({n, ayahs, …}); ফল = [{n, ar, tr}]
// script = আরবি লেখার ধরন ("simple" ডিফল্ট | "uthmani"); অজানা হলে simple। সার্চ সবসময় simple-এ (নিচে)।
export async function loadSurah(surah, trId = DEFAULT_TRANSLATION, script = DEFAULT_SCRIPT) {
  const sc = scriptById(script) || scriptById(DEFAULT_SCRIPT);
  const key = trId + ":" + sc.id + ":" + surah.n;
  if (surahCache.has(key)) return surahCache.get(key);
  const [ar, tr] = await Promise.all([
    getJson(arUrl(sc, surah.n)),
    getJson(QURAN_BASE + "/tr/" + trId + "/" + pad3(surah.n) + ".json"),
  ]);
  const ayahs = parseSurahPayload(ar, tr, surah);
  surahCache.set(key, ayahs);
  return ayahs;
}

// তাফসির (ইবনে কাসীর, বাংলা): সূরা ধরে on-demand; আয়াত-শিটে "তাফসির" চাপলেই নামে (পুরো-নামানো প্যাকে নেই)।
// সূরা-ফাইল বড় হতে পারে (সর্বোচ্চ ~২.৭ MB), তাই শুধু একবার নামে ও মেমরিতে থাকে; sw.js-এর cache-first-এ অফলাইনেও মেলে।
const tafsirCache = new Map();
export function loadTafsir(surah) {
  const key = surah.n;
  if (!tafsirCache.has(key)) {
    const p = getJson(QURAN_BASE + "/tafsir/ibn-kathir-bn/" + pad3(surah.n) + ".json").then((j) => {
      const ok = validateTafsirPayload(j, surah.n, surah.ayahs);
      if (!ok) throw new Error("তাফসির ফাইল অবৈধ");
      return ok;
    });
    p.catch(() => { tafsirCache.delete(key); }); // ব্যর্থ হলে পরেরবার আবার চেষ্টা
    tafsirCache.set(key, p);
  }
  return tafsirCache.get(key);
}

// ── ১৬-লাইন ইন্দো-পাক মুসহাফ (public/quran/v1/mushaf16) ──
let m16IndexPromise = null;
const m16Pages = new Map();

export function loadMushaf16Index() {
  if (!m16IndexPromise) {
    m16IndexPromise = getJson(QURAN_BASE + "/mushaf16/index.json?v=" + M16_VER).then((raw) => {
      const idx = sanitizeIndex(raw);
      if (!idx) throw new Error("mushaf16 index অবৈধ");
      return idx;
    });
    m16IndexPromise.catch(() => { m16IndexPromise = null; });
  }
  return m16IndexPromise;
}

// ফল = [{t:"s",s} | {t:"b"} | {t:"a", c, segs:[{s,a,words}]}]
export async function loadMushaf16Page(p) {
  const n = clamp16(p);
  if (m16Pages.has(n)) return m16Pages.get(n);
  const lines = sanitizePage(await getJson(QURAN_BASE + "/mushaf16/" + pad3(n) + ".json?v=" + M16_VER), n);
  if (!lines) throw new Error("mushaf16 পৃষ্ঠা অবৈধ: " + n);
  if (m16Pages.size > 40) m16Pages.delete(m16Pages.keys().next().value);
  m16Pages.set(n, lines);
  return lines;
}

// শব্দে শব্দে অর্থ (ইংরেজি): সূরা-ভিত্তিক, on-demand; ফল = প্রতি আয়াতের অর্থ-তালিকা (বা null)। ব্যর্থ হলে throw — UI শুধু অর্থ-ছাড়া সাধারণ আয়াত দেখায়।
// sw.js-এর বিদ্যমান `/quran/v1/` cache-first নিয়মেই অফলাইনে পড়া যায় (একবার খোলা সূরা)। ডেটা শোধরালে `?v=`-এর সংখ্যা বাড়াতে হবে (arUrl-এর মতো)।
const WBW_VER = 1;
const wbwCache = new Map();
export async function loadWbw(surah) {
  if (wbwCache.has(surah.n)) return wbwCache.get(surah.n);
  const w = parseWbwPayload(await getJson(QURAN_BASE + "/wbw-en/" + pad3(surah.n) + ".json?v=" + WBW_VER), surah);
  wbwCache.set(surah.n, w);
  return w;
}

// ── ধাপ ৫: পুরো কুরআন নামানো (অফলাইন) ও সার্চ-ইনডেক্স ──
const QURAN_CACHE = "quran-v1"; // public/sw.js-এর নামের সাথে একই
const PACK_FLAG = "dt_quran_pack";
const CONCURRENCY = 6;
const indexCache = new Map();

// সব সূরা (আরবি + অনুবাদ) নামায়। SW-এর cache-first নিয়মে ফাইলগুলো `quran-v1`-এ জমে — অফলাইনে পড়া যায়।
// একটাও ব্যর্থ হলে throw (যেগুলো নেমেছে সেগুলো থেকে যায়; আবার চাপলে বাকিটা নামে)।
export async function downloadAll(surahs, trId = DEFAULT_TRANSLATION, onProgress, isAlive) {
  const out = new Array(surahs.length);
  let next = 0;
  let done = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < surahs.length) {
      if (isAlive && !isAlive()) return;
      const k = next++;
      try {
        out[k] = await loadSurah(surahs[k], trId);
      } catch (e) {
        failed = true;
        throw e;
      }
      done++;
      if (onProgress) onProgress(done, surahs.length);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (isAlive && !isAlive()) return null;
  try { window.localStorage.setItem(PACK_FLAG, trId); } catch (e) { /* ignore */ }
  return out;
}

// ডিভাইসে সব ফাইল আছে কি? Cache API থাকলে সেটাই প্রমাণ; না থাকলে (পুরনো ব্রাউজার) আগের সফল-নামানোর চিহ্ন।
export async function packComplete(trId = DEFAULT_TRANSLATION) {
  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open(QURAN_CACHE);
      const keys = await cache.keys();
      const re = new RegExp("/quran/v1/(ar/\\d{3}|tr/" + trId + "/\\d{3})\\.json$");
      return keys.filter((r) => re.test(new URL(r.url).pathname)).length >= 228;
    }
  } catch (e) { /* নিচের চিহ্নে ফিরে যাই */ }
  try { return window.localStorage.getItem(PACK_FLAG) === trId; } catch (e) { return false; }
}

// সার্চ-ইনডেক্স (একবার বানিয়ে মেমোরিতে)। ডেটা না নামানো থাকলে এই কলই নামায়।
export function loadSearchIndex(surahs, trId = DEFAULT_TRANSLATION, onProgress, isAlive) {
  if (indexCache.has(trId)) return indexCache.get(trId);
  const p = downloadAll(surahs, trId, onProgress, isAlive).then((all) => (all ? buildSearchIndex(all) : null));
  p.then((idx) => { if (!idx) indexCache.delete(trId); }, () => indexCache.delete(trId));
  indexCache.set(trId, p);
  return p;
}

// বাছা (simple ছাড়া) লেখার ধরন ও ফন্ট আগেভাগে নামানো, যাতে অফলাইনেও চলে। ব্যর্থ হলে false — পড়া আটকায় না (পড়ার সময় আবার চেষ্টা)।
export async function warmScript(surahs, script, fontId, onProgress, isAlive) {
  const sc = scriptById(script);
  if (!sc || sc.id === DEFAULT_SCRIPT) return true;
  try {
    const f = fontById(fontId);
    if (f && f.file) await fetch(f.file);
    let next = 0, done = 0;
    const worker = async () => {
      while (next < surahs.length) {
        if (isAlive && !isAlive()) return;
        const su = surahs[next++];
        const j = await getJson(arUrl(sc, su.n));
        if (!j || j.s !== su.n || !Array.isArray(j.a) || j.a.length !== su.ayahs) throw new Error("quran data: " + sc.id + " সূরা " + su.n);
        done++;
        if (onProgress) onProgress(done, surahs.length);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return true;
  } catch (e) { return false; }
}
