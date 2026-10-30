// তাযকিরাহ ম্যানেজ (ধাপ খ, owner-approved) — pure logic, React/DB নেই।
// family-স্তরের ঐচ্ছিক doc "tazkirah_custom": { items: [{id,type,text,ref}], hidden: [বিল্ট-ইন id] }।
// বিল্ট-ইন বাণী কখনো মোছা/বদলানো হয় না — শুধু লুকানো যায়(ফিরিয়ে আনা যায়)।
// না থাকলে/অবৈধ হলে ডিফল্ট = আগের আচরণ হুবহু(pickInspiration == getDailyInspiration)।

export const TYPES = ["ayat", "hadith", "quote"];
export const TYPE_LABEL = { ayat: "আয়াত", hadith: "হাদীস", quote: "উক্তি" };
export const MAX_TEXT = 500;
export const MAX_REF = 100;
export const MAX_ITEMS = 100;
export const MAX_HIDDEN = 300;

const isObj = v => typeof v === "object" && v !== null && !Array.isArray(v);

/** বিল্ট-ইন বাণীর স্থির id — টেক্সটের hash থেকে(তালিকার ক্রম বদলালেও "লুকানো" ঠিক থাকে)। */
export function builtinId(item) {
  const s = String((item && item.text) || "");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return "b" + h.toString(36);
}

export function emptyData() {
  return { items: [], hidden: [] };
}

/** সেভ-করা মান → বৈধ data। অবৈধ আইটেম বাদ; টেক্সট ছাঁটা ও দৈর্ঘ্য-সীমিত; ডুপ্লিকেট id বাদ। */
export function sanitizeTazkirah(raw) {
  const out = emptyData();
  if (!isObj(raw)) return out;
  const seen = new Set();
  if (Array.isArray(raw.items)) {
    for (const it of raw.items.slice(0, MAX_ITEMS)) {
      if (!isObj(it) || typeof it.id !== "string" || !it.id || it.id.length > 40 || seen.has(it.id)) continue;
      const text = typeof it.text === "string" ? it.text.trim().slice(0, MAX_TEXT) : "";
      if (!text) continue;
      seen.add(it.id);
      out.items.push({
        id: it.id,
        type: TYPES.includes(it.type) ? it.type : "quote",
        text,
        ref: typeof it.ref === "string" ? it.ref.trim().slice(0, MAX_REF) : ""
      });
    }
  }
  if (Array.isArray(raw.hidden)) {
    const hs = new Set();
    for (const h of raw.hidden.slice(0, MAX_HIDDEN)) {
      if (typeof h === "string" && h && h.length <= 40) hs.add(h);
    }
    out.hidden = [...hs];
  }
  return out;
}

export function newItemId() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function sameData(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isHidden(data, builtin) {
  return data.hidden.includes(builtinId(builtin));
}

export function setBuiltinHidden(data, builtin, hidden) {
  const id = builtinId(builtin);
  const rest = data.hidden.filter(x => x !== id);
  return { ...data, hidden: hidden ? [...rest, id] : rest };
}

// নিজের বাণীগুলো বিল্ট-ইনের মাঝে সমান দূরত্বে বসানো — যাতে নতুন বাণী মাসের পর মাস পিছনে পড়ে না থেকে ঘুরে ঘুরে আসে।
function mixEvenly(base, extra) {
  if (!extra.length) return base;
  const out = [...base];
  extra.forEach((x, k) => {
    const pos = Math.round(((k + 1) * (base.length + 1)) / (extra.length + 1)) + k;
    out.splice(Math.min(pos, out.length), 0, x);
  });
  return out;
}

/** আজকের বাণী। কোনো কাস্টম/লুকানো না থাকলে আগের getDailyInspiration()-এর হুবহু ফল। */
export function pickInspiration(date, builtins, data) {
  const d = data || emptyData();
  const hidden = new Set(d.hidden);
  let shownBuiltins = builtins.filter(b => !hidden.has(builtinId(b)));
  if (shownBuiltins.length === 0 && d.items.length === 0) shownBuiltins = builtins; // সব লুকালেও কার্ড কখনো ফাঁকা নয়
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  const type = TYPES[dayOfYear % 3];
  const pool = [...shownBuiltins, ...d.items];
  let list = mixEvenly(
    shownBuiltins.filter(i => i.type === type),
    d.items.filter(i => i.type === type)
  );
  if (list.length === 0) list = mixEvenly(shownBuiltins, d.items);
  if (list.length === 0) list = pool;
  return list[Math.floor(dayOfYear / 3) % list.length];
}
