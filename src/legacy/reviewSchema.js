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

// সপ্তাহ = শুক্রবার থেকে বৃহস্পতিবার (বৃহস্পতিবার রাতে মুহাসাবা, শুক্রবারে নতুন শুরু)।
// সপ্তাহ সেই মাসের, যে মাসে তার বৃহস্পতিবার পড়ে (বৃহস্পতিবার ৩ তারিখ হলেও সেটা নতুন মাসের ১ম সপ্তাহ)।
// তাই সপ্তাহ মাস পেরোতে পারে। chunkRange-এর start/end = সেই মাসের দিন-সংখ্যা ধরে (start ≤ 0 মানে আগের মাসের দিন)।
// week = chunkCount+1 হলে পরের মাসের ১ম সপ্তাহ (মাসের শেষে চলতি সপ্তাহ দেখানোর জন্য)।
// weekKey = সপ্তাহের শুক্রবারের তারিখ YYYY-MM-DD।
const DAY_MS = 86400000;
function daysInMonthOf(year, month0) { return new Date(year, month0 + 1, 0).getDate(); }
function firstThursday(year, month0) { return 1 + ((4 - new Date(year, month0, 1).getDay()) + 7) % 7; }
function chunkCount(year, month0) { return Math.floor((daysInMonthOf(year, month0) - firstThursday(year, month0)) / 7) + 1; }
function chunkRange(year, month0, week) {
  const end = firstThursday(year, month0) + (week - 1) * 7;
  return { start: end - 6, end };
}
function chunkWeekKey(year, month0, week) {
  const d = new Date(year, month0, chunkRange(year, month0, week).start);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
// যেকোনো তারিখ → তার সপ্তাহ { year, month0, week } (সপ্তাহ যে মাসের)।
function chunkOfDate(date) {
  const thu = new Date(date.getFullYear(), date.getMonth(), date.getDate() + ((4 - date.getDay() + 7) % 7));
  const y = thu.getFullYear(), m = thu.getMonth();
  return { year: y, month0: m, week: Math.floor((thu.getDate() - firstThursday(y, m)) / 7) + 1 };
}
// মাসের ১ তারিখ ধরে আজ কততম দিন (আগের মাস হলে ≤ ০, পরের মাস হলে > মাসের দিন)। দিন-সংখ্যার সাথে সরাসরি তুলনা চলে।
function dayRelToday(year, month0, now) {
  return Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(year, month0, 1)) / DAY_MS) + 1;
}
// সপ্তাহের শুক্রবার আজ বা আগে হলে সপ্তাহ শুরু হয়েছে।
function chunkStarted(year, month0, week, now) {
  return chunkRange(year, month0, week).start <= dayRelToday(year, month0, now);
}
// ছাপা রিপোর্টের দিন-পরিসর [start,end]-এ যে সপ্তাহের বৃহস্পতিবার পড়ে সেই সপ্তাহ (না থাকলে 0)।
function chunkOfRange(year, month0, start, end) {
  for (let k = 1; k <= chunkCount(year, month0); k++) {
    const th = chunkRange(year, month0, k).end;
    if (th >= start && th <= end) return k;
  }
  return 0;
}
// আগের সপ্তাহ: week>1 হলে একই মাসের week-1, নইলে আগের মাসের শেষ সপ্তাহ।
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

export { REVIEW_SCHEMA_VERSION, GOAL_RESULTS, LIMITS, ALLOWED_KEYS, chunkCount, chunkOfDate, chunkRange, chunkWeekKey, chunkStarted, chunkOfRange, dayRelToday, prevChunk, reviewDocId, validateReview };
