// hifzPlan.js — কুরআন হিফজ প্ল্যানারের pure হিসাব (Firebase/React-মুক্ত, node --test-যোগ্য)।
// প্ল্যান = একটা পরিসর (সূরা:আয়াত → সূরা:আয়াত), দৈনিক লক্ষ্য (আয়াত) ও এ পর্যন্ত মুখস্থ আয়াত-সংখ্যা।
// counts = ১১৪টা সূরার আয়াত-সংখ্যার তালিকা (meta.surahs থেকে)। তারিখ-নির্ভর নয়, অগ্রগতি-নির্ভর।

export const HIFZ_KEY = "dt_hifz_plan";
export const KHATAM_KEY = "dt_khatam_plan"; // খতম (তিলাওয়াত) প্ল্যান — হিফজের থেকে আলাদা, একই হিসাব
export const planKey = (mode) => (mode === "khatam" ? KHATAM_KEY : HIFZ_KEY);
export const GOTO_KEY = "dt_quran_goto"; // প্ল্যানার → কুরআন ট্যাবে "এই আয়াতে খুলুন"-এর হ্যান্ডঅফ
export const GOTO_TTL_MS = 60000;
export const PER_DAY = { min: 1, max: 1000, def: 5 };

// "N দিনে শেষ" — দৈনিক লক্ষ্য = মোট ÷ দিন (উপরের দিকে গোল)।
export function perDayForDays(total, days) {
  if (!isInt(total) || total < 1 || !isInt(days) || days < 1) return PER_DAY.def;
  return clampPerDay(Math.ceil(total / days));
}

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

// ── দিনভিত্তিক লগ: log[YYYY-MM-DD] = সেদিন রেকর্ড-করা আয়াত। একই দিনের জমা এক জায়গায় ⇒ ডাবল গণনা/ভুল ধাপ ধরা যায়। ──
export const LOG_MAX_DAYS = 400; // Rules-এর সীমার সাথে মেলে
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export function localDateKey(d) {
  const x = d instanceof Date ? d : new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  return x.getFullYear() + "-" + p2(x.getMonth() + 1) + "-" + p2(x.getDate());
}
export function sanitizeLog(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const keys = Object.keys(raw).filter((k) => DAY_RE.test(k) && isInt(raw[k]) && raw[k] >= 1 && raw[k] <= 6236).sort().slice(-LOG_MAX_DAYS);
  for (const k of keys) out[k] = raw[k];
  return out;
}
const addLog = (plan, dayKey, m) => {
  if (typeof dayKey !== "string" || !DAY_RE.test(dayKey)) return {};
  const log = sanitizeLog({ ...(plan.log || {}), [dayKey]: ((plan.log && plan.log[dayKey]) || 0) + m });
  return { log, lastDay: dayKey };
};
export const todayCount = (plan, dayKey) => (plan.log && plan.log[dayKey]) || 0;

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
  const log = sanitizeLog(raw.log);
  if (Object.keys(log).length) p.log = log; // ঐচ্ছিক: দিনভিত্তিক লগ; না থাকলে ফিল্ডই থাকে না (আগের আকার অক্ষত)
  if (p.log && typeof raw.lastDay === "string" && DAY_RE.test(raw.lastDay)) p.lastDay = raw.lastDay;
  return p;
}

// Firestore-এর member-ডকের quranPlans ও ফোনের পুরনো প্ল্যান মিলিয়ে চূড়ান্ত প্ল্যান ঠিক করা।
// remote বৈধ হলে সেটাই জেতে; নইলে ফোনের প্ল্যান (আগে একবারও সিংক না হয়ে থাকলে) ক্লাউডে তোলা হয় (upload)।
// synced[mode]=true মানে এই ডিভাইস আগেই সিংক হয়েছে — তখন remote-এ নেই মানে অন্য ডিভাইসে মোছা, ফোনের বাসি কপি আর তোলা হয় না।
export function planMigration(remoteRaw, localPlans, synced, counts) {
  const out = { plans: { khatam: null, hifz: null }, upload: [] };
  const remote = remoteRaw && typeof remoteRaw === "object" ? remoteRaw : {};
  for (const m of ["khatam", "hifz"]) {
    const r = sanitizePlan(remote[m], counts);
    const l = localPlans && localPlans[m] ? localPlans[m] : null;
    if (r) out.plans[m] = r;
    else if (l && !(synced && synced[m])) { out.plans[m] = l; out.upload.push(m); }
  }
  return out;
}

// আজকের পাঠ: এ পর্যন্ত মুখস্থের পরের perDay আয়াত (পরিসরের শেষে ছোট হতে পারে)। শেষ হলে null।
export function todayPortion(plan, counts) {
  const total = totalOf(plan, counts);
  if (plan.done >= total) return null;
  const base = posToIdx(counts, plan.from.s, plan.from.a);
  const n = Math.min(plan.perDay, total - plan.done);
  return { from: idxToPos(counts, base + plan.done), to: idxToPos(counts, base + plan.done + n - 1), n };
}

export function markDone(plan, counts, dayKey) {
  const p = todayPortion(plan, counts);
  if (!p) return plan;
  return { ...plan, done: plan.done + p.n, last: p.n, ...addLog(plan, dayKey, p.n) };
}

// আসলে n আয়াত পড়া/মুখস্থ হলে সেটাই বসানো (লক্ষ্যের চেয়ে কম/বেশি); n বাকির বেশি হলে বাকিটুকুই ধরা। অবৈধ n হলে প্ল্যান অপরিবর্তিত।
export function markDoneN(plan, counts, n, dayKey) {
  const remaining = totalOf(plan, counts) - plan.done;
  const k = Math.round(Number(n));
  if (!Number.isFinite(k) || k < 1 || remaining < 1) return plan;
  const m = Math.min(k, remaining);
  return { ...plan, done: plan.done + m, last: m, ...addLog(plan, dayKey, m) };
}

// n আয়াত বসালে শেষ পড়া আয়াত কোনটা হবে (প্রিভিউর জন্য); অবৈধ হলে null।
export function posAfterN(plan, counts, n) {
  const remaining = totalOf(plan, counts) - plan.done;
  const k = Math.min(Math.round(Number(n)), remaining);
  if (!Number.isFinite(k) || k < 1) return null;
  return idxToPos(counts, posToIdx(counts, plan.from.s, plan.from.a) + plan.done + k - 1);
}

// শেষ ধাপ বাতিল (ভুল টিপ ঠিক করতে); একবারই।
export function undoDone(plan) {
  if (!plan.last) return plan;
  const next = { ...plan, done: Math.max(0, plan.done - plan.last), last: 0 };
  if (plan.lastDay && plan.log && plan.log[plan.lastDay]) {
    const left = plan.log[plan.lastDay] - plan.last;
    const log = { ...plan.log };
    if (left > 0) log[plan.lastDay] = left; else delete log[plan.lastDay];
    if (Object.keys(log).length) next.log = log; else delete next.log;
  }
  delete next.lastDay;
  return next;
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
