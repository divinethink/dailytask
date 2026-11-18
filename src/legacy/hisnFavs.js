// hisnFavs.js — হিসনুল মুসলিমের ⭐ প্রিয় দু'আ ও "সর্বশেষ পড়া"। শুধু ডিভাইসের localStorage-এ;
// Firestore/Rules/schema-য় কিছু লেখা হয় না। pure অংশ node --test-যোগ্য; শেষে read/write (অনুপলব্ধ হলে নীরবে খালি)।
// প্রিয় = দু'আর id-র তালিকা (নতুন আগে)। ডেটা থেকে কোনো দু'আ সরে গেলে সেটা শুধু দেখানো হয় না; তালিকা থেকে মোছা হয় না।

const FAV_KEY = "dt_hisn_favs";
const LAST_KEY = "dt_hisn_last";
export const MAX_FAVS = 300;

export function sanitizeFavs(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const x of raw) {
    if (typeof x !== "string" || !x || x.length > 40 || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= MAX_FAVS) break;
  }
  return out;
}

export const isFav = (favs, id) => favs.includes(id);

// আছে → সরে; নেই → সবার আগে যোগ। সীমা পার হলে সবচেয়ে পুরনোটা বাদ।
export function toggleFav(favs, id) {
  if (typeof id !== "string" || !id) return favs;
  if (favs.includes(id)) return favs.filter((x) => x !== id);
  return [id, ...favs].slice(0, MAX_FAVS);
}

// প্রিয় id → দেখানোর তালিকা [{chapterId, chapterTitle, duaId, title}] (ডেটায় না থাকা id বাদ, ক্রম অপরিবর্তিত)।
export function resolveFavs(chapters, favs) {
  if (!Array.isArray(chapters)) return [];
  const byId = new Map();
  for (const c of chapters) for (const d of c.duas || []) if (!byId.has(d.id)) byId.set(d.id, { chapterId: c.id, chapterTitle: c.title, duaId: d.id, title: d.title });
  return favs.map((id) => byId.get(id)).filter(Boolean);
}

// সর্বশেষ পড়া: {chapterId:number, duaId:string|null}; অবৈধ হলে null।
export function sanitizeLast(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = Number(raw.chapterId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return { chapterId: id, duaId: typeof raw.duaId === "string" && raw.duaId ? raw.duaId : null };
}

// সর্বশেষ পড়া অধ্যায়টা ডেটায় থাকলে {chapterId, duaId, title}; নইলে null।
export function resolveLast(chapters, last) {
  const l = sanitizeLast(last);
  if (!l || !Array.isArray(chapters)) return null;
  const c = chapters.find((x) => x.id === l.chapterId);
  return c ? { chapterId: c.id, duaId: l.duaId, title: c.title } : null;
}

export function readFavs() {
  try { const raw = window.localStorage.getItem(FAV_KEY); return sanitizeFavs(raw ? JSON.parse(raw) : []); } catch (e) { return []; }
}
export function writeFavs(favs) {
  try { window.localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) { /* ignore */ }
}
export function readLast() {
  try { const raw = window.localStorage.getItem(LAST_KEY); return sanitizeLast(raw ? JSON.parse(raw) : null); } catch (e) { return null; }
}
export function writeLast(last) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify(last)); } catch (e) { /* ignore */ }
}
