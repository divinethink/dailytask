// quranTafsirFm.js — দ্বিতীয় তাফসির (ফাতহুল মাজীদ, বাংলা) এর pure অংশ (Firebase/React-মুক্ত)।
// ইবনে কাসীরের (quranTafsir.js) মতো পূর্ণ নয়: শুধু কিছু আয়াতে ব্যাখ্যা আছে, তাই আলাদা গঠন ও আলাদা ফাইল।
// ডেটা: /quran/v1/tafsir/fathul-majid-bn/ — index.json (কোন আয়াতে আছে) + সূরা-ভিত্তিক NNN.json {s, g:[{a:[শুরু,শেষ], t:html}]}।
// একটা ব্যাখ্যা কয়েক আয়াতের হলে ওই পরিসরের প্রতিটা আয়াতে একই ব্যাখ্যা খোলে। HTML কখনো সরাসরি বসানো হয় না।
import { QURAN_BASE } from "./quranCore.js";

export const FM_ID = "fathul-majid-bn";
export const FM_NAME = "তাফসীর ফাতহুল মাজীদ";
export const FM_BASE = QURAN_BASE + "/tafsir/" + FM_ID;

const isInt = (x) => Number.isInteger(x);

// index.json → Map<সূরা, [[from,to]…]>। অবৈধ অংশ বাদ; কিছুই বৈধ না হলে খালি Map।
export function parseFmIndex(raw) {
  const out = new Map();
  if (!raw || typeof raw !== "object" || !raw.r || typeof raw.r !== "object") return out;
  for (const key of Object.keys(raw.r)) {
    const s = Number(key);
    if (!isInt(s) || s < 1 || s > 114 || !Array.isArray(raw.r[key])) continue;
    const list = [];
    for (const r of raw.r[key]) {
      if (Array.isArray(r) && r.length === 2 && isInt(r[0]) && isInt(r[1]) && r[0] >= 1 && r[1] >= r[0]) list.push([r[0], r[1]]);
    }
    list.sort((p, q) => p[0] - q[0]);
    if (list.length) out.set(s, list);
  }
  return out;
}

// আয়াত কোন পরিসরে পড়ে; না থাকলে null।
export function findFmRange(index, s, a) {
  const list = index && index.get ? index.get(s) : null;
  if (!list) return null;
  for (const r of list) if (a >= r[0] && a <= r[1]) return r;
  return null;
}

// সূরা-ফাইল যাচাই: ভুল সূরা বা গঠনে throw (UI error-state দেখায়); অবৈধ গ্রুপ বাদ।
export function parseFmPayload(raw, s) {
  if (!raw || raw.s !== s || !Array.isArray(raw.g)) throw new Error("তাফসির ফাইল অবৈধ: সূরা " + s);
  return raw.g.filter((g) => g && Array.isArray(g.a) && g.a.length === 2 && isInt(g.a[0]) && isInt(g.a[1]) && typeof g.t === "string" && g.t.trim());
}

export function fmForAyah(groups, a) {
  if (!Array.isArray(groups)) return null;
  return groups.find((g) => a >= g.a[0] && a <= g.a[1]) || null;
}

// ইবনে কাসীরের লেখার সাথে একই ভাষা: "আয়াত ৬–১১-এর সম্মিলিত তাফসির"; একক আয়াতে খালি।
export function fmRangeNote(range, toDigits) {
  if (!range || range[0] === range[1]) return "";
  return "আয়াত " + toDigits(range[0]) + "–" + toDigits(range[1]) + "-এর সম্মিলিত তাফসির";
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'", "&nbsp;": " ", "&#39;": "'" };
const decode = (t) => t.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] || m);

// HTML → [{kind:"p"|"ar", parts:[{t, b}]}]। অন্য সব ট্যাগ ফেলে দেওয়া হয়; লেখা সবসময় plain text।
// "ar" = আরবি আয়াত-অনুচ্ছেদ (class="arabic"), যাতে আরবি ফন্টে ডান-থেকে-বামে আঁকা যায়।
export function fmBlocks(html) {
  const blocks = [];
  if (typeof html !== "string") return blocks;
  let cur = null;
  let bold = false;
  const open = (kind) => { cur = { kind, parts: [] }; };
  const close = () => {
    if (cur && cur.parts.some((p) => p.t.trim())) blocks.push(cur);
    cur = null;
  };
  const re = /<(\/?)(p|b)\b([^>]*)>|<[^>]*>|([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[2]) {
      if (m[2].toLowerCase() === "p") {
        close();
        if (!m[1]) open(/\barabic\b/i.test(m[3] || "") ? "ar" : "p");
      } else bold = !m[1];
    } else if (m[4] !== undefined) {
      const t = decode(m[4]);
      if (!t) continue;
      if (!cur) open("p");
      cur.parts.push({ t, b: bold });
    }
  }
  close();
  return blocks;
}
