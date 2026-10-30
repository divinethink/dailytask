// লেবেল ম্যানেজ (ধাপ গ, owner-approved) — pure logic, React/DB নেই।
// family-স্তরের ঐচ্ছিক doc "field_overrides": { [fieldKey]: { label?: string, hidden?: true } }।
// রিনেম = label override; "ডিলিট" = hidden(archive) — এন্ট্রির পুরনো ডেটা কখনো মোছা হয় না, যেকোনো সময় ফেরানো যায়।
// না থাকলে/অবৈধ হলে ডিফল্ট = আগের আচরণ হুবহু।

export const MAX_LABEL_LENGTH = 80;
export const MAX_OVERRIDES = 200;

const isObj = v => typeof v === "object" && v !== null && !Array.isArray(v);

/** সেভ-করা মান → বৈধ map। অবৈধ এন্ট্রি বাদ; label ছাঁটা ও দৈর্ঘ্য-সীমিত। */
export function sanitizeOverrides(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  let n = 0;
  for (const key of Object.keys(raw)) {
    if (n >= MAX_OVERRIDES) break;
    const v = raw[key];
    if (!isObj(v) || typeof key !== "string" || key.length === 0 || key.length > 60) continue;
    const e = {};
    if (typeof v.label === "string") {
      const l = v.label.trim().slice(0, MAX_LABEL_LENGTH);
      if (l) e.label = l;
    }
    if (v.hidden === true) e.hidden = true;
    if (e.label !== undefined || e.hidden) {
      out[key] = e;
      n++;
    }
  }
  return out;
}

/** ফিল্ড-তালিকায় override প্রয়োগ: লুকানো বাদ, রিনেম করা label/shortLabel বদল। মূল তালিকা অপরিবর্তিত। */
export function applyOverrides(fields, overrides) {
  const ov = overrides || {};
  return (fields || []).filter(f => !(ov[f.key] && ov[f.key].hidden)).map(f => {
    const o = ov[f.key];
    return o && o.label ? { ...f, label: o.label, shortLabel: o.label } : f;
  });
}

/** label বদল। খালি বা মূল label-এর সমান হলে override মুছে যায়(hidden থাকলে অক্ষত)। নতুন map ফেরত। */
export function setLabel(overrides, key, label, originalLabel) {
  const next = { ...overrides };
  const cur = { ...(next[key] || {}) };
  const l = (label || "").trim().slice(0, MAX_LABEL_LENGTH);
  if (!l || l === originalLabel) delete cur.label;
  else cur.label = l;
  if (cur.label === undefined && !cur.hidden) delete next[key];
  else next[key] = cur;
  return next;
}

export function setHidden(overrides, key, hidden) {
  const next = { ...overrides };
  const cur = { ...(next[key] || {}) };
  if (hidden) cur.hidden = true;
  else delete cur.hidden;
  if (cur.label === undefined && !cur.hidden) delete next[key];
  else next[key] = cur;
  return next;
}

export function sameOverrides(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
