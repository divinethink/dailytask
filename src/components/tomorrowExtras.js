// "আগামীকাল" কার্ডের ক্রিয়েটর-সম্পাদিত বাড়তি বাক্য(pure ফাংশন — React/DB/network কিছুই ছোঁয় না)।
// Firestore doc: publicToolsContent/homeCard_tomorrow → { homeCardExtras: { items:[...], sleepText } }(additive, নতুন doc)।
// প্রতিটা item: { id, w(-১ = প্রতিদিন, ০=রবি … ৬=শনি = কালকের বার), icon, title, text, src }।
// Defensive read: doc না থাকলে/ভুল গঠনে খালি ফল — কার্ড আগের মতোই চলে।

export const EXTRAS_SECTION_ID = "homeCard_tomorrow";
export const MAX_ITEMS = 40;
export const LIMITS = { icon: 8, title: 80, text: 700, src: 120, sleep: 400 };

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const text = str(raw.text, LIMITS.text);
  if (!text) return null;
  const wn = Number(raw.w);
  const w = Number.isInteger(wn) && wn >= 0 && wn <= 6 ? wn : -1;
  return {
    id: str(raw.id, 60) || "item_" + Math.abs(hash(text)),
    w,
    icon: str(raw.icon, LIMITS.icon) || "🌿",
    title: str(raw.title, LIMITS.title),
    text,
    src: str(raw.src, LIMITS.src),
  };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// raw = Firestore doc data(বা null)। ফেরত: { items, sleepText }
export function normalizeExtras(raw) {
  const src = raw && typeof raw === "object" && raw.homeCardExtras && typeof raw.homeCardExtras === "object" ? raw.homeCardExtras : {};
  const items = (Array.isArray(src.items) ? src.items : []).map(normalizeItem).filter(Boolean).slice(0, MAX_ITEMS);
  return { items, sleepText: str(src.sleepText, LIMITS.sleep) };
}

// ফর্ম থেকে আসা item যাচাই; ভুল থাকলে বাংলা বার্তা, ঠিক থাকলে null
export function validateItem(item) {
  if (!item || !str(item.text, LIMITS.text)) return "বাক্য লিখুন।";
  if (String(item.text).trim().length > LIMITS.text) return "বাক্য অনেক বড়(সর্বোচ্চ " + LIMITS.text + " অক্ষর)।";
  return null;
}

// কালকের বারের জন্য কার্ডে দেখানোর note-তালিকা(প্রতিদিনের আগে, তারপর নির্দিষ্ট বারের)
export function extrasFor(extras, weekday) {
  return extras.items
    .filter((it) => it.w === -1 || it.w === weekday)
    .map((it) => ({ tone: "ibadat", icon: it.icon, title: it.title, text: it.text, src: it.src, extraId: it.id }));
}

export function makeItemId() {
  return "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}
