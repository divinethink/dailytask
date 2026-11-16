// quranData.js — কুরআন-ডেটার data-layer: অ্যাপের নিজের হোস্ট (/quran/v1/…) থেকে on-demand fetch।
// ক্যাশ: ব্রাউজারে in-memory + sw.js-এর আলাদা `quran-v1` cache (অফলাইনে পড়া যায়)।
// ব্যর্থ হলে throw — UI error-state দেখায়; অনির্দিষ্ট loading নয় (timeout + এক বার retry)।
import { QURAN_BASE, DEFAULT_TRANSLATION, pad3, parseSurahPayload, buildSearchIndex } from "./quranCore.js";

const TIMEOUT_MS = 15000;
let metaPromise = null;
const surahCache = new Map();

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
export async function loadSurah(surah, trId = DEFAULT_TRANSLATION) {
  const key = trId + ":" + surah.n;
  if (surahCache.has(key)) return surahCache.get(key);
  const [ar, tr] = await Promise.all([
    getJson(QURAN_BASE + "/ar/" + pad3(surah.n) + ".json"),
    getJson(QURAN_BASE + "/tr/" + trId + "/" + pad3(surah.n) + ".json"),
  ]);
  const ayahs = parseSurahPayload(ar, tr, surah);
  surahCache.set(key, ayahs);
  return ayahs;
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
