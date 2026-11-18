// hisnPrefs.js — হিসনুল মুসলিম পাঠের ডিভাইস-লোকাল পছন্দ: আরবির আকার, আরবি/উচ্চারণ/অর্থ অন-অফ।
// pure অংশ (sanitize/step/toggle) node --test-যোগ্য; শেষে localStorage read/write (অনুপলব্ধ হলে নীরবে ডিফল্ট)।
// আরবি ফন্ট কুরআন-রিডারের পছন্দ থেকেই (hisnCore.hisnArabicFont); এখানে শুধু আকার ও দৃশ্যমানতা।
import { AR_SIZE } from "./quranCore.js";

const KEY = "dt_hisn_view";

const clampSize = (v, def) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(AR_SIZE.max, Math.max(AR_SIZE.min, Math.round(n)));
};

// অবৈধ/অনুপস্থিত মান → ডিফল্ট। তিনটা অংশই বন্ধ থাকতে পারে না (খালি পর্দা এড়াতে) — তখন আরবি চালু।
// defaultArSize = কুরআন-রিডারের আরবি-আকার (প্রথমবার সেটাই শুরুর মান)।
export function sanitizeHisnView(raw, defaultArSize = AR_SIZE.def) {
  const r = raw && typeof raw === "object" ? raw : {};
  const def = clampSize(defaultArSize, AR_SIZE.def);
  const out = {
    arSize: clampSize(r.arSize === undefined ? def : r.arSize, def),
    showAr: typeof r.showAr === "boolean" ? r.showAr : true,
    showTr: typeof r.showTr === "boolean" ? r.showTr : true,
    showBn: typeof r.showBn === "boolean" ? r.showBn : true,
  };
  if (!out.showAr && !out.showTr && !out.showBn) out.showAr = true;
  return out;
}

// dir = +1 (বড়) / -1 (ছোট); সীমা AR_SIZE.min..max।
export function stepArSize(view, dir) {
  const next = Math.min(AR_SIZE.max, Math.max(AR_SIZE.min, view.arSize + (dir > 0 ? AR_SIZE.step : -AR_SIZE.step)));
  return { ...view, arSize: next };
}

// key = "showAr" | "showTr" | "showBn"; শেষ চালু অংশটা বন্ধ করা যায় না (অপরিবর্তিত ফেরে)।
export function toggleView(view, key) {
  if (!["showAr", "showTr", "showBn"].includes(key)) return view;
  const next = { ...view, [key]: !view[key] };
  if (!next.showAr && !next.showTr && !next.showBn) return view;
  return next;
}

export function readHisnView(defaultArSize) {
  try {
    const raw = window.localStorage.getItem(KEY);
    return sanitizeHisnView(raw ? JSON.parse(raw) : null, defaultArSize);
  } catch (e) {
    return sanitizeHisnView(null, defaultArSize);
  }
}

export function writeHisnView(view) {
  try { window.localStorage.setItem(KEY, JSON.stringify(view)); } catch (e) { /* ignore */ }
}
