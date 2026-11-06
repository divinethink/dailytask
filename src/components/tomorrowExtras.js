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

// অন্তর্নির্মিত(কোডে লেখা) বার্তার স্থির আইডি: মূল শিরোনাম থেকে। শিরোনাম না বদলালে আইডি একই থাকে।
export function builtinId(title) {
  return "b_" + Math.abs(hash(String(title || "")));
}

const BUILTIN_ID_RE = /^b_\d+$/;
const MAX_OVERRIDES = 80;

// অন্তর্নির্মিত বার্তার বদল: { hidden:true } = লুকানো; নয়তো নতুন লেখা। ভুল গঠনে null(= মূল লেখাই থাকে)
function normalizeOverride(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.hidden === true) return { hidden: true };
  const text = str(raw.text, LIMITS.text);
  if (!text) return null;
  return { hidden: false, icon: str(raw.icon, LIMITS.icon) || "🌿", title: str(raw.title, LIMITS.title), text, src: str(raw.src, LIMITS.src) };
}

// raw = Firestore doc data(বা null)। ফেরত: { items, sleepText, overrides }
export function normalizeExtras(raw) {
  const src = raw && typeof raw === "object" && raw.homeCardExtras && typeof raw.homeCardExtras === "object" ? raw.homeCardExtras : {};
  const items = (Array.isArray(src.items) ? src.items : []).map(normalizeItem).filter(Boolean).slice(0, MAX_ITEMS);
  const overrides = {};
  const ro = src.overrides && typeof src.overrides === "object" && !Array.isArray(src.overrides) ? src.overrides : {};
  Object.keys(ro).slice(0, MAX_OVERRIDES).forEach((id) => {
    if (!BUILTIN_ID_RE.test(id)) return;
    const o = normalizeOverride(ro[id]);
    if (o) overrides[id] = o;
  });
  return { items, sleepText: str(src.sleepText, LIMITS.sleep), overrides };
}

// ফর্ম থেকে অন্তর্নির্মিত বার্তার বদল তৈরি(যাচাইসহ)
export function makeOverride(form) {
  return normalizeOverride({ hidden: false, icon: form && form.icon, title: form && form.title, text: form && form.text, src: form && form.src });
}

// কার্ডের note-তালিকায় বদল প্রয়োগ: লুকানো বাদ, বদলানো লেখা বসে। id-হীন note(রোজার সময় ইত্যাদি) অপরিবর্তিত।
// textFn: আজ-মোডে "কাল"→"আজ" রূপান্তরের জন্য(ঐচ্ছিক)
export function applyOverrides(notes, overrides, textFn) {
  const ov = overrides || {};
  const f = typeof textFn === "function" ? textFn : (x) => x;
  const out = [];
  (notes || []).forEach((n) => {
    const o = n && n.id ? ov[n.id] : null;
    if (!o) return out.push(n);
    if (o.hidden) return;
    out.push({ ...n, icon: o.icon, title: f(o.title), text: f(o.text), src: o.src });
  });
  return out;
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

// বার্তার লেখাকে বুলেটে ভাগ: "।"-তে শেষ হওয়া বাক্য ধরে। ২টির কম হলে খালি তালিকা(= বুলেট নয়, সাধারণ অনুচ্ছেদ)।
export function splitBullets(text) {
  if (typeof text !== "string") return [];
  const parts = (text.match(/[^।]+।?/g) || []).map((x) => x.trim()).filter(Boolean);
  return parts.length >= 2 ? parts : [];
}

// প্রতিদিনের আমল(সব দিনে দেখায়, "ঘুমের আগে"-র ওপরে) ও ঘুমের আগের বাড়তি আমল।
export const DAILY_AMOL = [
  "প্রতি ওয়াক্ত ফরজ সালাতের পর আয়াতুল কুরসি ও তাসবীহ পাঠ করা।",
  "ইস্তেগফার ও মাসনূন যিকিরে মত্ত থাকা।",
  "মানুষের সাথে সদ্ব্যবহার ও সহযোগিতা করা।",
];
export const SLEEP_EXTRA = "ঘুমের আগে সবাইকে ক্ষমা করে দেওয়া।";
