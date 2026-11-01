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

// সপ্তাহ শুরু = রবিবার (মক-আপের সাথে মিল)। key = সেই রবিবারের স্থানীয় তারিখ YYYY-MM-DD।
function weekKeyOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

export { REVIEW_SCHEMA_VERSION, GOAL_RESULTS, LIMITS, ALLOWED_KEYS, weekKeyOf, reviewDocId, validateReview };
