// quranData.js — কুরআন-ডেটার data-layer: অ্যাপের নিজের হোস্ট (/quran/v1/…) থেকে on-demand fetch।
// ক্যাশ: ব্রাউজারে in-memory + sw.js-এর আলাদা `quran-v1` cache (অফলাইনে পড়া যায়)।
// ব্যর্থ হলে throw — UI error-state দেখায়; অনির্দিষ্ট loading নয় (timeout + এক বার retry)।
import { QURAN_BASE, DEFAULT_TRANSLATION, pad3, parseSurahPayload } from "./quranCore.js";

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
