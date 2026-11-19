// hifzPlan.js — কুরআন হিফজ প্ল্যানারের pure হিসাব (Firebase/React-মুক্ত, node --test-যোগ্য)।
// প্ল্যান = একটা পরিসর (সূরা:আয়াত → সূরা:আয়াত), দৈনিক লক্ষ্য (আয়াত) ও এ পর্যন্ত মুখস্থ আয়াত-সংখ্যা।
// counts = ১১৪টা সূরার আয়াত-সংখ্যার তালিকা (meta.surahs থেকে)। তারিখ-নির্ভর নয়, অগ্রগতি-নির্ভর।

export const HIFZ_KEY = "dt_hifz_plan";
export const GOTO_KEY = "dt_quran_goto"; // প্ল্যানার → কুরআন ট্যাবে "এই আয়াতে খুলুন"-এর হ্যান্ডঅফ
export const GOTO_TTL_MS = 60000;
export const PER_DAY = { min: 1, max: 100, def: 5 };

const isInt = (x) => Number.isInteger(x);

export const countsOf = (surahs) => (Array.isArray(surahs) ? surahs.map((s) => s.ayahs) : []);

// (সূরা, আয়াত) → ১১৪ সূরা জুড়ে ০-ভিত্তিক ক্রমিক নম্বর। অবৈধ হলে -1।
export function posToIdx(counts, s, a) {
  if (!Array.isArray(counts) || counts.length !== 114 || !isInt(s) || !isInt(a)) return -1;
  if (s < 1 || s > 114 || a < 1 || a > counts[s - 1]) return -1;
  let idx = 0;
  for (let i = 0; i < s - 1; i++) idx += counts[i];
  return idx + a - 1;
}

export function idxToPos(counts, idx) {
  if (!Array.isArray(counts) || counts.length !== 114 || !isInt(idx) || idx < 0) return null;
  let rest = idx;
  for (let i = 0; i < 114; i++) {
    if (rest < counts[i]) return { s: i + 1, a: rest + 1 };
    rest -= counts[i];
  }
  return null;
}

export function clampPerDay(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return PER_DAY.def;
  return Math.min(PER_DAY.max, Math.max(PER_DAY.min, v));
}

// নতুন প্ল্যান; পরিসর অবৈধ/উল্টো হলে null।
export function makePlan(counts, from, to, perDay, now) {
  const i = posToIdx(counts, from && from.s, from && from.a);
  const j = posToIdx(counts, to && to.s, to && to.a);
  if (i < 0 || j < 0 || j < i) return null;
  return { v: 1, from: { s: from.s, a: from.a }, to: { s: to.s, a: to.a }, perDay: clampPerDay(perDay), done: 0, last: 0, createdAt: isInt(now) ? now : 0 };
}

export const totalOf = (plan, counts) => posToIdx(counts, plan.to.s, plan.to.a) - posToIdx(counts, plan.from.s, plan.from.a) + 1;

// সংরক্ষিত মান যাচাই; অবৈধ হলে null (কখনো crash নয়)।
export function sanitizePlan(raw, counts) {
  if (!raw || typeof raw !== "object" || !raw.from || !raw.to) return null;
  const p = makePlan(counts, raw.from, raw.to, raw.perDay, raw.createdAt);
  if (!p) return null;
  const total = totalOf(p, counts);
  const done = isInt(raw.done) ? raw.done : 0;
  p.done = Math.min(total, Math.max(0, done));
  p.last = isInt(raw.last) ? Math.min(p.done, Math.max(0, raw.last)) : 0;
  return p;
}

// আজকের পাঠ: এ পর্যন্ত মুখস্থের পরের perDay আয়াত (পরিসরের শেষে ছোট হতে পারে)। শেষ হলে null।
export function todayPortion(plan, counts) {
  const total = totalOf(plan, counts);
  if (plan.done >= total) return null;
  const base = posToIdx(counts, plan.from.s, plan.from.a);
  const n = Math.min(plan.perDay, total - plan.done);
  return { from: idxToPos(counts, base + plan.done), to: idxToPos(counts, base + plan.done + n - 1), n };
}

export function markDone(plan, counts) {
  const p = todayPortion(plan, counts);
  if (!p) return plan;
  return { ...plan, done: plan.done + p.n, last: p.n };
}

// শেষ ধাপ বাতিল (ভুল টিপ ঠিক করতে); একবারই।
export function undoDone(plan) {
  if (!plan.last) return plan;
  return { ...plan, done: Math.max(0, plan.done - plan.last), last: 0 };
}

export function setPerDay(plan, n) {
  return { ...plan, perDay: clampPerDay(n) };
}

export function statsOf(plan, counts) {
  const total = totalOf(plan, counts);
  const remaining = Math.max(0, total - plan.done);
  return { total, done: plan.done, remaining, percent: total ? Math.floor((plan.done * 100) / total) : 0, daysLeft: Math.ceil(remaining / plan.perDay), finished: remaining === 0 };
}

// হ্যান্ডঅফ: লিখনের সময় {s,a,t}; পড়ার সময় তাজা (TTL-এর ভেতরে) ও বৈধ হলে {s,a}, নইলে null।
export function makeGoto(s, a, now) { return { s, a, t: now }; }
export function readGoto(raw, counts, now) {
  if (!raw || !isInt(raw.s) || !isInt(raw.a) || !isInt(raw.t)) return null;
  if (now - raw.t > GOTO_TTL_MS || now < raw.t) return null;
  if (posToIdx(counts, raw.s, raw.a) < 0) return null;
  return { s: raw.s, a: raw.a };
}
