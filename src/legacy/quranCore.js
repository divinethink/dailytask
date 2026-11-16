// quranCore.js — কুরআন-রিডারের pure লজিক (Firebase/React-মুক্ত, node --test-যোগ্য)।
// ডেটা-ফাইলের গঠন/উৎস: tools/quran/build.mjs। এখানে শুধু যাচাই, নাম-লেবেল ও "শেষ পাঠ"-এর হিসাব।

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
