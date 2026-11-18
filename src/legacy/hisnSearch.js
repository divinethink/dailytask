// hisnSearch.js — হিসনুল মুসলিমের অধ্যায় ও দু'আর শিরোনামে খোঁজা (pure, node --test-যোগ্য)।
// লেখা মেলানোর আগে সমান করা হয়: ইউনিকোড NFC, ছোট হাতের অক্ষর, অ্যাপোস্ট্রফি/ZWJ/ZWNJ বাদ।
// তাই "দুআ", "দু'আ", "দু‘আ" একই ধরা হয়; "দোয়া" লিখলেও "দু'আ" মেলে। ডেটা-ফাইলে কোনো বদল নেই।

const DROP = /[​-‍﻿'’‘ʻʼ`´]/;
const SPACE = /\s/;

// একটা অক্ষরের সমান-করা রূপ ("" = বাদ)।
function normChar(ch) {
  if (DROP.test(ch)) return "";
  if (SPACE.test(ch)) return " ";
  return ch.toLowerCase();
}

// text-কে NFC করে সমান-করা স্ট্রিং + প্রতিটা সমান-করা অক্ষর মূল NFC-লেখার কোন অবস্থান থেকে এসেছে তার তালিকা।
function normalize(text) {
  const src = String(text == null ? "" : text).normalize("NFC");
  let norm = "";
  const map = [];
  for (let i = 0; i < src.length; i++) {
    const piece = normChar(src[i]);
    for (let k = 0; k < piece.length; k++) { norm += piece[k]; map.push(i); }
  }
  return { src, norm, map };
}

export const normalizeText = (s) => normalize(s).norm.replace(/\s+/g, " ").trim();

// প্রচলিত বানান-ভেদ: "দোয়া" ↔ "দুআ" (অ্যাপোস্ট্রফি বাদ দেওয়ার পর)।
const VARIANTS = [["দোয়া", "দুআ"]];

function tokenVariants(token) {
  const set = new Set([token]);
  for (const [a, b] of VARIANTS) {
    if (token.includes(a)) set.add(token.split(a).join(b));
    if (token.includes(b)) set.add(token.split(b).join(a));
  }
  return [...set];
}

// প্রশ্ন → শব্দের তালিকা, প্রতিটার বানান-ভেদসহ। ফাঁকা হলে []।
export function queryTokens(query) {
  const q = normalizeText(query);
  if (!q) return [];
  return q.split(" ").map(tokenVariants);
}

export const MIN_QUERY_LEN = 2; // সমান-করা প্রশ্নের ন্যূনতম দৈর্ঘ্য; ১ অক্ষরে প্রায় সবই মেলে

export function isSearchable(query) {
  return normalizeText(query).length >= MIN_QUERY_LEN;
}

// শব্দগুলোর সবকটা মিললে সত্য; ফেরত: মিলের অবস্থান-সূচক (ছোট = শুরুর দিকে মিল), না মিললে -1।
function matchScore(norm, tokens) {
  let best = Infinity;
  for (const variants of tokens) {
    let at = -1;
    for (const v of variants) {
      const i = norm.indexOf(v);
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    if (at < 0) return -1;
    if (at < best) best = at;
  }
  return best === Infinity ? -1 : best;
}

// chapters = buildChapters(...)-এর ফল। ফেরত:
// { chapters: [{id, title}], duas: [{chapterId, chapterTitle, duaId, title}] } — শিরোনামে মিল, শুরুর দিকের মিল আগে।
export function searchHisn(chapters, query) {
  const tokens = queryTokens(query);
  const out = { chapters: [], duas: [] };
  if (!isSearchable(query) || !Array.isArray(chapters)) return out;
  const chHits = [];
  const duaHits = [];
  for (const c of chapters) {
    const cs = matchScore(normalizeText(c.title), tokens);
    if (cs >= 0) chHits.push({ s: cs, id: c.id, title: c.title });
    for (const d of c.duas || []) {
      const ds = matchScore(normalizeText(d.title), tokens);
      if (ds >= 0) duaHits.push({ s: ds, chapterId: c.id, chapterTitle: c.title, duaId: d.id, title: d.title });
    }
  }
  // sort স্থিতিশীল: একই স্কোরে অধ্যায়ের মূল ক্রম থাকে।
  out.chapters = chHits.sort((a, b) => a.s - b.s).map(({ id, title }) => ({ id, title }));
  out.duas = duaHits.sort((a, b) => a.s - b.s).map(({ chapterId, chapterTitle, duaId, title }) => ({ chapterId, chapterTitle, duaId, title }));
  return out;
}

// মিলে যাওয়া অংশ হাইলাইটের জন্য: text → [{text, hit}] (জোড়া লাগালে মূল NFC-লেখাই ফেরে)।
export function highlightParts(text, query) {
  const { src, norm, map } = normalize(text);
  const tokens = queryTokens(query);
  if (!tokens.length || !src) return [{ text: src, hit: false }];
  const marks = new Array(src.length).fill(false);
  let any = false;
  for (const variants of tokens) {
    for (const v of variants) {
      let from = 0;
      for (;;) {
        const i = norm.indexOf(v, from);
        if (i < 0) break;
        // সমান-করা [i, i+len) → মূল লেখার প্রথম থেকে শেষ অক্ষর (মাঝের বাদ-পড়া অক্ষরসহ)।
        const a = map[i];
        const b = map[i + v.length - 1];
        for (let k = a; k <= b; k++) marks[k] = true;
        any = true;
        from = i + Math.max(1, v.length);
      }
    }
  }
  if (!any) return [{ text: src, hit: false }];
  const parts = [];
  let cur = "";
  let curHit = marks[0];
  for (let i = 0; i < src.length; i++) {
    if (marks[i] !== curHit) { parts.push({ text: cur, hit: curHit }); cur = ""; curHit = marks[i]; }
    cur += src[i];
  }
  parts.push({ text: cur, hit: curHit });
  return parts;
}
