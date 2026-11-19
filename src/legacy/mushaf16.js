// mushaf16.js — ১৬-লাইন ইন্দো-পাক মুসহাফের pure হিসাব ও যাচাই (Firebase/React/DOM-মুক্ত; node --test-যোগ্য)।
// ডেটা-রূপ (tools/quran/build-mushaf16.mjs): পৃষ্ঠা = { v:1, p, l:[ ["s",সূরা] | ["b"] | ["a", মাঝে(0|1), [[সূরা, আয়াত, "শব্দ শব্দ …"], …]] ] }।
// ইনডেক্স = { v:1, pages:548, lines:16, begin:[[সূরা, আয়াত] × ৫৪৮] } — begin[p-1] = ওই পৃষ্ঠায় যে প্রথম আয়াত শুরু হয়।

export const M16_PAGES = 548;
// sw.js কুরআনের ফাইল চিরকাল ক্যাশ রাখে; mushaf16 ডেটা বদলালে এই সংখ্যা বাড়ালে ঠিকানা নতুন হয়ে সবার ফোনে নতুন ফাইল আসে।
export const M16_VER = "2";
export const M16_GAP_EM = 0.3; // শব্দের মধ্যে ন্যূনতম ফাঁক (em) — মাপ ও CSS দুই জায়গায় একই
export const M16_MIN_SIZE = 12;
export const M16_MAX_SIZE = 40;

export function clamp16(p) {
  const n = Math.trunc(Number(p));
  return Number.isFinite(n) ? Math.min(M16_PAGES, Math.max(1, n)) : 1;
}

export function sanitizeIndex(raw) {
  if (!raw || raw.v !== 1 || raw.pages !== M16_PAGES || !Array.isArray(raw.begin) || raw.begin.length !== M16_PAGES) return null;
  const ok = raw.begin.every((b) => Array.isArray(b) && b.length === 2 && Number.isInteger(b[0]) && Number.isInteger(b[1]) && b[0] >= 1 && b[0] <= 114 && b[1] >= 1);
  return ok ? { pages: M16_PAGES, begin: raw.begin } : null;
}

// একটা আয়াত (সূরা, আয়াত) কোন পৃষ্ঠায় শুরু হয়। begin = sanitizeIndex(...).begin
export function pageOfAyah(begin, s, a) {
  let lo = 0, hi = begin.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = begin[mid];
    if (b[0] < s || (b[0] === s && b[1] <= a)) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans + 1;
}

// পৃষ্ঠার ডেটা যাচাই — অচেনা/ভাঙা হলে null (UI error-state দেখায়)
export function sanitizePage(raw, p) {
  if (!raw || raw.v !== 1 || raw.p !== p || !Array.isArray(raw.l) || raw.l.length < 1 || raw.l.length > 20) return null;
  const lines = [];
  for (const ln of raw.l) {
    if (!Array.isArray(ln)) return null;
    if (ln[0] === "s") {
      if (!Number.isInteger(ln[1]) || ln[1] < 1 || ln[1] > 114) return null;
      lines.push({ t: "s", s: ln[1] });
    } else if (ln[0] === "b") {
      lines.push({ t: "b" });
    } else if (ln[0] === "a") {
      if (!Array.isArray(ln[2]) || ln[2].length < 1) return null;
      const segs = [];
      for (const g of ln[2]) {
        if (!Array.isArray(g) || !Number.isInteger(g[0]) || !Number.isInteger(g[1]) || typeof g[2] !== "string" || !g[2]) return null;
        segs.push({ s: g[0], a: g[1], words: g[2].split(" ").filter(Boolean) });
      }
      lines.push({ t: "a", c: ln[1] ? 1 : 0, segs });
    } else return null;
  }
  return lines;
}

// সূরার শিরোনাম-লাইনের নিচে বিসমিল্লাহ আলাদা লাইনে আছে কিনা (না থাকলে শিরোনামের নিচে নিজে বসাতে হবে; ফাতিহা/তাওবায় নেই)
export function bismillahUnderBanner(lines, i) {
  const ln = lines[i];
  if (!ln || ln.t !== "s" || ln.s === 1 || ln.s === 9) return false;
  const next = lines[i + 1];
  return !(next && next.t === "b");
}

// লাইনের স্বাভাবিক প্রস্থ (em): প্রতিটা শব্দের প্রস্থ (em) + শব্দের মাঝের ন্যূনতম ফাঁক
export function lineWidthEm(wordEms) {
  if (!wordEms.length) return 0;
  return wordEms.reduce((x, y) => x + y, 0) + (wordEms.length - 1) * M16_GAP_EM;
}

// সবচেয়ে চওড়া লাইনটা পর্দার প্রস্থে ধরাতে ফন্ট-সাইজ (px); প্রস্থ অজানা/অসম্ভব হলে null
export function fitFontSize(availPx, maxLineEm) {
  if (!(availPx > 0) || !(maxLineEm > 0)) return null;
  const raw = Math.floor((availPx / maxLineEm) * 0.99 * 2) / 2;
  return Math.min(M16_MAX_SIZE, Math.max(M16_MIN_SIZE, raw));
}

// পৃষ্ঠার সূরা-নাম তালিকা (শিরোনামে দেখানোর জন্য; ক্রমানুযায়ী, অনন্য)
export function surahsOnPage(lines) {
  const out = [];
  for (const ln of lines) {
    if (ln.t === "s") { if (!out.includes(ln.s)) out.push(ln.s); }
    else if (ln.t === "a") for (const g of ln.segs) if (!out.includes(g.s)) out.push(g.s);
  }
  return out;
}

// পৃষ্ঠার প্রথম আয়াত (অবস্থান সংরক্ষণ ও মোড-বদলের জন্য)
export function firstAyahOnPage(lines) {
  for (const ln of lines) if (ln.t === "a") return { s: ln.segs[0].s, n: ln.segs[0].a };
  return null;
}
