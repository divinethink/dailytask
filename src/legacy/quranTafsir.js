// quranTafsir.js — তাফসির-ডেটার pure লজিক (নেটওয়ার্ক/React নেই)।
// ফাইলের গঠন: { v:1, s:সূরা, g:[[শুরু-আয়াত, শেষ-আয়াত, "<p>…<b>…</b>…</p>"], …] } — g সূরার সব আয়াত পরপর ঢাকে।

export const TAFSIR_ID = "ibn_kathir_bn";
export const TAFSIR_NAME = "তাফসীরে ইবনে কাসীর";

// ফাইল অবৈধ হলে null; নইলে সেটাই ফেরে।
export function validateTafsirPayload(p, surahN, ayahCount) {
  if (!p || p.v !== 1 || p.s !== surahN || !Array.isArray(p.g) || !p.g.length) return null;
  let next = 1;
  for (const e of p.g) {
    if (!Array.isArray(e) || e.length !== 3 || !Number.isInteger(e[0]) || !Number.isInteger(e[1]) || typeof e[2] !== "string") return null;
    if (e[0] !== next || e[1] < e[0]) return null;
    next = e[1] + 1;
  }
  return next - 1 === ayahCount ? p : null;
}

// আয়াত-নম্বরের তাফসির-ভাগ: { from, to, html } অথবা null।
export function findTafsir(payload, ayahNo) {
  if (!payload || !Array.isArray(payload.g)) return null;
  for (const [from, to, html] of payload.g) if (ayahNo >= from && ayahNo <= to) return { from, to, html };
  return null;
}

const ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (m) => ENT[m]);

// নিরাপদ পার্সার (innerHTML নয়): <p> = অনুচ্ছেদ, <b> = গাঢ়; অন্য সব ট্যাগ বাদ।
// ফল = [[{t, b}, …], …] (অনুচ্ছেদ → টুকরো); খালি অনুচ্ছেদ বাদ।
export function tafsirBlocks(html) {
  const src = String(html || "");
  const paras = /<p[\s>]/i.test(src) ? src.split(/<\/?p\b[^>]*>/i) : [src];
  const out = [];
  for (const para of paras) {
    const segs = [];
    let bold = false;
    for (const part of para.split(/(<\/?b\b[^>]*>|<[^>]*>)/i)) {
      if (!part) continue;
      if (/^<b\b/i.test(part)) { bold = true; continue; }
      if (/^<\/b\b/i.test(part)) { bold = false; continue; }
      if (part[0] === "<") continue;
      const t = decode(part);
      if (t.trim() || (segs.length && t)) segs.push({ t, b: bold });
    }
    if (segs.some((x) => x.t.trim())) out.push(segs);
  }
  return out;
}

// "আয়াত ৫–৭-এর সম্মিলিত তাফসির" লেখা; একক আয়াতে খালি।
export function tafsirRangeNote(item, toDigits) {
  if (!item || item.from === item.to) return "";
  return "আয়াত " + toDigits(item.from) + "–" + toDigits(item.to) + "-এর সম্মিলিত তাফসির";
}
