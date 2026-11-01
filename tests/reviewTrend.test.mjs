// চালান: node --test tests/   (কোনো dependency লাগে না)
import test from "node:test";
import assert from "node:assert/strict";
import { buildTrend, trendOf, tierOf, threeMonths, monthValue } from "../src/legacy/reviewTrend.js";
import { REVIEW_TEXT } from "../src/legacy/reviewText.js";

const pad2 = n => String(n).padStart(2, "0");
const fBool = (key, extra = {}) => ({ key, label: key, type: "bool", ...extra });
const h = (fields, over = {}) => ({
  member: { gender: "male" }, allFields: fields,
  fieldApplies: (f, m) => !f.appliesTo || f.appliesTo === m.gender,
  isFieldExcusable: f => !!f.excusable,
  isExcused: (e, k) => !!(e && e.excused && e.excused[k]),
  ratioOf: (f, e) => (e ? (e[f.key] ? 1 : 0) : null),
  ...over
});
// দিনের তালিকা: n দিন, তার মধ্যে hit দিন true
const month = (key, n, hit, extra = {}) => {
  const m = {};
  for (let d = 1; d <= n; d++) m[pad2(d)] = { [key]: d <= hit, ...extra };
  return m;
};
const groups = [{ id: "a", label: "ক", keys: ["x", "y"] }, { id: "b", label: "খ", keys: [] }];
const NOW = new Date(2026, 10, 20); // ২০ নভেম্বর ২০২৬ (নভেম্বর চলমান)

test("threeMonths: জানুয়ারি/ডিসেম্বর সীমা", () => {
  assert.deepEqual(threeMonths(2026, 0), [{ year: 2025, month0: 10 }, { year: 2025, month0: 11 }, { year: 2026, month0: 0 }]);
  assert.deepEqual(threeMonths(2026, 11), [{ year: 2026, month0: 9 }, { year: 2026, month0: 10 }, { year: 2026, month0: 11 }]);
  assert.deepEqual(threeMonths(2026, 1)[0], { year: 2025, month0: 11 });
});

test("tierOf: ক্যালেন্ডারের চার রঙের সীমা", () => {
  assert.equal(tierOf(0.85), "great"); assert.equal(tierOf(0.849), "good");
  assert.equal(tierOf(0.6), "good"); assert.equal(tierOf(0.59), "mid");
  assert.equal(tierOf(0.35), "mid"); assert.equal(tierOf(0.34), "low");
  assert.equal(tierOf(0), "low"); assert.equal(tierOf(null), "none");
});

test("ধারা: ↑ ↓ → এবং সীমা (±১০)", () => {
  const v = (...p) => p.map(x => (x === null ? null : { pct: x }));
  assert.equal(trendOf(v(72, 78, 85)).dir, "up");   // +১৩, টানা
  assert.equal(trendOf(v(72, 78, 85)).kind, "rising");
  assert.equal(trendOf(v(70, 60, 80)).kind, "risingSome");
  assert.equal(trendOf(v(75, 60, 52)).dir, "down");
  assert.equal(trendOf(v(75, 60, 52)).kind, "falling");
  assert.equal(trendOf(v(50, 70, 55)).dir, "flat");
  assert.equal(trendOf(v(60, 60, 70)).dir, "up");     // ঠিক +১০ ⇒ ↑
  assert.equal(trendOf(v(70, 60, 60)).dir, "down");   // ঠিক −১০ ⇒ ↓
  assert.equal(trendOf(v(60, 60, 69)).dir, "flat");   // +৯ ⇒ →
  assert.equal(trendOf(v(90, 92, 91)).kind, "steadyGreat");
  assert.equal(trendOf(v(58, 62, 60)).kind, "steady");
  assert.equal(trendOf(v(null, 70, 76)).dir, "flat"); // দুই মাস, +৬
  assert.equal(trendOf(v(null, null, 70)).kind, "few");
  assert.equal(trendOf(v(null, null, null)).dir, null);
});

test("কম ডেটা: ৩ দিনের কম ⇒ null, ঠিক ৩ ⇒ বৈধ", () => {
  const f = fBool("x");
  assert.equal(monthValue(month("x", 2, 2), 30, f, h([f])), null);
  assert.deepEqual(monthValue(month("x", 3, 3), 30, f, h([f])), { pct: 100, tier: "great", days: 3 });
  assert.equal(monthValue(null, 30, f, h([f])), null);
  assert.equal(monthValue(month("x", 5, 5), 0, f, h([f])), null); // ভবিষ্যৎ মাস
});

test("ওজর: ওজরের দিন গণনার বাইরে", () => {
  const f = fBool("x", { excusable: true });
  const e = {};
  for (let d = 1; d <= 10; d++) e[pad2(d)] = d <= 5 ? { x: true } : { x: false, excused: { x: true } };
  const r = monthValue(e, 30, f, h([f]));
  assert.equal(r.pct, 100); assert.equal(r.days, 5);
  // ওজর-অযোগ্য ফিল্ডে ওজর চিহ্ন উপেক্ষিত
  const g = fBool("x", { excusable: false });
  assert.equal(monthValue(e, 30, g, h([g])).pct, 50);
});

test("চলমান মাস: শুধু পেরোনো দিন গোনা হয়", () => {
  const f = fBool("x"); const hh = h([f]);
  const cur = month("x", 25, 25); // ২০ তারিখের পরের ৫ দিন (ভবিষ্যৎ) এ ডেটা থাকলেও ধরা হবে না
  for (let d = 21; d <= 25; d++) cur[pad2(d)] = { x: false };
  const t = buildTrend({ year: 2026, month0: 10, now: NOW, entriesByMonth: [month("x", 30, 20), month("x", 31, 25), cur], h: hh, groups });
  assert.equal(t.sections[0].rows[0].vals[2].pct, 100); // ২১–২৫ বাদ
  assert.equal(t.sections[0].rows[0].vals[2].days, 20);
});

test("কাস্টম লেবেল বাদ, লিঙ্গ-নির্দিষ্ট ফিল্ড বাদ", () => {
  const fs = [fBool("x"), fBool("custom_1", { isCustom: true }), fBool("mt_1", { isCustom: true, isMemberTask: true }), fBool("fem", { appliesTo: "female" })];
  const all = [month("x", 31, 20), month("x", 30, 20), month("x", 20, 20)];
  const by = fs.map(f => f.key).map(k => all.map(m => { const o = {}; for (const d in m) o[d] = { ...m[d], [k]: true }; return o; }));
  const merged = [0, 1, 2].map(i => { const o = {}; for (const d in all[i]) o[d] = { x: true, custom_1: true, mt_1: true, fem: true }; return o; });
  const t = buildTrend({ year: 2026, month0: 10, now: NOW, entriesByMonth: merged, h: h(fs), groups });
  const keys = t.sections.flatMap(s => s.rows.map(r => r.key));
  assert.deepEqual(keys, ["x"]);
});

test("গ্রুপ, সবচেয়ে উন্নতি, মনোযোগ (সর্বোচ্চ ৩, শেষ মাস ৪০%-এর নিচে)", () => {
  const fs = ["x", "y", "p", "q", "r", "s"].map(k => fBool(k));
  // x: ৩০→৭৫ (↑ +৪৫); y: ৯০ স্থির; p: ৮০→৩০ (↓); q: ৫০→৩৫ (↓ ১৫); r: ৩৮ স্থির (<৪০); s: ২০ স্থির (<৪০)
  const pct = { x: [30, 50, 75], y: [90, 90, 90], p: [80, 60, 30], q: [50, 40, 35], r: [38, 38, 38], s: [20, 20, 20] };
  const by = [0, 1, 2].map(i => {
    const o = {};
    for (let d = 1; d <= 20; d++) {
      const e = {};
      for (const k of Object.keys(pct)) e[k] = d <= pct[k][i] / 5; // ২০ দিনে pct = দিন×৫
      o[pad2(d)] = e;
    }
    return o;
  });
  const t = buildTrend({ year: 2026, month0: 10, now: new Date(2026, 11, 5), entriesByMonth: by, h: h(fs), groups });
  assert.equal(t.sections.length, 2);
  assert.deepEqual(t.sections[0].rows.map(r => r.key), ["x", "y"]);
  assert.deepEqual(t.sections[1].rows.map(r => r.key), ["p", "q", "r", "s"]); // গ্রুপ-বহির্ভূত ⇒ শেষ গ্রুপ
  assert.equal(t.best.key, "x");
  assert.equal(t.best.from.pct, 30); assert.equal(t.best.to.pct, 75);
  assert.equal(t.attention.length, 3);
  assert.deepEqual(t.attention.map(r => r.key), ["s", "p", "q"]); // শেষ মাসের মান কম আগে: ২০, ৩০, ৩৫ ; r (৩৮) সীমার বাইরে কাটা
});

test("নতুন সদস্য: কোনো ডেটা নেই ⇒ ok=false", () => {
  const f = fBool("x");
  const t = buildTrend({ year: 2026, month0: 10, now: NOW, entriesByMonth: [{}, {}, {}], h: h([f]), groups });
  assert.equal(t.ok, false); assert.equal(t.best, null); assert.deepEqual(t.attention, []);
});

test("আগের মাস আনা ব্যর্থ (null) ⇒ নির্বাচিত মাস তবুও চলে, বাকি \"—\"", () => {
  const f = fBool("x");
  const t = buildTrend({ year: 2026, month0: 10, now: NOW, entriesByMonth: [null, null, month("x", 20, 18)], h: h([f]), groups });
  const r = t.sections[0].rows[0];
  assert.equal(r.vals[0], null); assert.equal(r.vals[1], null); assert.equal(r.vals[2].pct, 90);
  assert.equal(r.kind, "few"); assert.equal(r.dir, null);
});

test("জানুয়ারি নির্বাচিত: মাস-সীমা পেরোনো", () => {
  const f = fBool("x");
  const t = buildTrend({ year: 2026, month0: 0, now: new Date(2026, 4, 1), entriesByMonth: [month("x", 30, 15), month("x", 31, 20), month("x", 31, 31)], h: h([f]), groups });
  assert.deepEqual(t.months.map(m => [m.year, m.month0]), [[2025, 10], [2025, 11], [2026, 0]]);
  assert.deepEqual(t.sections[0].rows[0].vals.map(v => v.pct), [50, 65, 100]);
});

test("ভবিষ্যৎ মাস নির্বাচিত ⇒ ওই মাস \"—\"", () => {
  const f = fBool("x");
  const t = buildTrend({ year: 2026, month0: 11, now: NOW, entriesByMonth: [month("x", 30, 25), month("x", 30, 25), month("x", 31, 31)], h: h([f]), groups });
  assert.equal(t.sections[0].rows[0].vals[2], null);
});

test("লেখা: সব মন্তব্য-কী ও মাসের ১২টা ছোট নাম আছে", () => {
  const T = REVIEW_TEXT.trend;
  for (const k of ["rising", "risingSome", "falling", "fallingSome", "steadyGreat", "steady", "few"]) assert.ok(T.comment[k], k);
  assert.equal(T.monthShort.length, 12);
  for (const k of ["great", "good", "mid", "low", "none"]) assert.ok(T.legend[k]);
});
