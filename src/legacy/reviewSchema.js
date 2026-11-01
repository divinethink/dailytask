// reviewSchema.js — সাপ্তাহিক মুহাসাবা (reviews) ডকের একমাত্র validation সোর্স।
// Pure (Firebase/UI ছাড়া)। firestore.rules-এর reviews ব্লকের সীমা এখানকার LIMITS-এর সাথে মেলে।
// "বদ্ধ ঘর" কোনো ফিল্ডে নেই — কখনো সেভ হয় না (এখানে ও rules-এ whitelist-এর বাইরে)।

const REVIEW_SCHEMA_VERSION = 1;
const GOAL_RESULTS = ["done", "partial", "none"];
const LIMITS = {
  goalText: 200, hardMoment: 300, nextGoal: 200, ifText: 200, thenText: 200,
  gratitude: 300, gapKey: 40, listMax: 8, listItem: 40
};
const STRING_FIELDS = ["goalText", "hardMoment", "nextGoal", "ifText", "thenText", "gratitude", "gapKey"];
const LIST_FIELDS = ["blockers", "gapReasons", "haqq"];
const ALLOWED_KEYS = ["v", "memberId", "weekKey", "updatedAt", "step", "done", "goalResult", ...STRING_FIELDS, ...LIST_FIELDS];

const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n) { return String(n).padStart(2, "0"); }

// অ্যাপের সাপ্তাহিক রিফ্লেকশনের মতোই সপ্তাহ = মাসের ৭-দিনের খণ্ড (১-৭, ৮-১৪, ... শেষটা ছোট হতে পারে)।
// weekKey = খণ্ডের প্রথম দিনের তারিখ YYYY-MM-DD (মাস পেরোনো জটিলতা নেই)।
function daysInMonthOf(year, month0) { return new Date(year, month0 + 1, 0).getDate(); }
function chunkCount(year, month0) { return Math.ceil(daysInMonthOf(year, month0) / 7); }
function chunkOfDay(day) { return Math.floor((day - 1) / 7) + 1; }
function chunkRange(year, month0, week) {
  const start = (week - 1) * 7 + 1;
  return { start, end: Math.min(start + 6, daysInMonthOf(year, month0)) };
}
function chunkWeekKey(year, month0, week) {
  return `${year}-${pad2(month0 + 1)}-${pad2((week - 1) * 7 + 1)}`;
}
// আগের খণ্ড: week>1 হলে একই মাসের week-1, নইলে আগের মাসের শেষ খণ্ড।
function prevChunk(year, month0, week) {
  if (week > 1) return { year, month0, week: week - 1 };
  const y = month0 === 0 ? year - 1 : year;
  const m = month0 === 0 ? 11 : month0 - 1;
  return { year: y, month0: m, week: chunkCount(y, m) };
}

function reviewDocId(memberId, weekKey) {
  return `${memberId}_${weekKey}`;
}

// ফেরত: { ok:true, value } বা { ok:false, error }। value = শুধু whitelist-করা ফিল্ড, সীমা মেনে।
function validateReview(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "not_object" };
  const out = {};
  if (typeof input.memberId !== "string" || !input.memberId || input.memberId.includes("_")) return { ok: false, error: "memberId" };
  if (typeof input.weekKey !== "string" || !WEEK_KEY_RE.test(input.weekKey)) return { ok: false, error: "weekKey" };
  out.v = REVIEW_SCHEMA_VERSION;
  out.memberId = input.memberId;
  out.weekKey = input.weekKey;
  if (typeof input.updatedAt !== "number" || !Number.isFinite(input.updatedAt)) return { ok: false, error: "updatedAt" };
  out.updatedAt = input.updatedAt;
  if (input.step !== undefined) {
    if (!Number.isInteger(input.step) || input.step < 1 || input.step > 5) return { ok: false, error: "step" };
    out.step = input.step;
  }
  if (input.done !== undefined) {
    if (typeof input.done !== "boolean") return { ok: false, error: "done" };
    out.done = input.done;
  }
  if (input.goalResult !== undefined) {
    if (!GOAL_RESULTS.includes(input.goalResult)) return { ok: false, error: "goalResult" };
    out.goalResult = input.goalResult;
  }
  for (const k of STRING_FIELDS) {
    if (input[k] === undefined) continue;
    if (typeof input[k] !== "string" || input[k].length > LIMITS[k]) return { ok: false, error: k };
    out[k] = input[k];
  }
  for (const k of LIST_FIELDS) {
    if (input[k] === undefined) continue;
    const a = input[k];
    if (!Array.isArray(a) || a.length > LIMITS.listMax || a.some(s => typeof s !== "string" || s.length > LIMITS.listItem)) return { ok: false, error: k };
    out[k] = a.slice();
  }
  return { ok: true, value: out };
}

export { REVIEW_SCHEMA_VERSION, GOAL_RESULTS, LIMITS, ALLOWED_KEYS, chunkCount, chunkOfDay, chunkRange, chunkWeekKey, prevChunk, reviewDocId, validateReview };
