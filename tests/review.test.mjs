// চালান: node --test tests/   (কোনো dependency লাগে না)
import test from "node:test";
import assert from "node:assert/strict";
import { chunkCount, chunkOfDay, chunkRange, chunkWeekKey, prevChunk, reviewDocId, validateReview, LIMITS } from "../src/legacy/reviewSchema.js";
import { weekGlance, weeklyGap, countFieldTotal, weekdayAverages, weakestWeekdays, bestImprovementAndDrop, goalSuccess, monthDelta } from "../src/legacy/reviewCalc.js";
import { elapsedDays, prevMonthOf, buildMonthlyReport, goalSummary, suggestDecisions, fill } from "../src/legacy/reviewMonthly.js";
import { REVIEW_TEXT } from "../src/legacy/reviewText.js";

const base = { memberId: "m-1", weekKey: "2026-11-01", updatedAt: 1 };

test("সপ্তাহ-খণ্ড", () => {
  assert.equal(chunkCount(2026, 10), 5);           // নভেম্বর ৩০ দিন ⇒ ৫ (শেষটা ২ দিনের)
  assert.equal(chunkCount(2026, 1), 4);            // ফেব্রুয়ারি ২৮ ⇒ ৪
  assert.deepEqual(chunkRange(2026, 10, 5), { start: 29, end: 30 });
  assert.deepEqual(chunkRange(2026, 10, 1), { start: 1, end: 7 });
  assert.equal(chunkOfDay(7), 1); assert.equal(chunkOfDay(8), 2); assert.equal(chunkOfDay(30), 5);
  assert.equal(chunkWeekKey(2026, 10, 1), "2026-11-01");
  assert.equal(chunkWeekKey(2026, 10, 5), "2026-11-29");
  assert.deepEqual(prevChunk(2026, 10, 3), { year: 2026, month0: 10, week: 2 });
  assert.deepEqual(prevChunk(2026, 10, 1), { year: 2026, month0: 9, week: 5 });  // অক্টোবর ৩১ ⇒ ৫
  assert.deepEqual(prevChunk(2026, 0, 1), { year: 2025, month0: 11, week: 5 });  // বছর পেরোনো
});
test("reviewDocId", () => assert.equal(reviewDocId("m-1", "2026-11-01"), "m-1_2026-11-01"));

test("validate: ন্যূনতম ঠিক", () => assert.equal(validateReview(base).ok, true));
test("validate: বদ্ধ ঘর/অজানা ফিল্ড বাদ পড়ে", () => {
  const r = validateReview({ ...base, closedRoom: ["x"], junk: 1, goalText: "ok" });
  assert.equal(r.ok, true);
  assert.equal("closedRoom" in r.value, false);
  assert.equal("junk" in r.value, false);
});
test("validate: ভুল ইনপুট প্রত্যাখ্যান", () => {
  assert.equal(validateReview({ ...base, memberId: "a_b" }).ok, false);
  assert.equal(validateReview({ ...base, weekKey: "2026-W44" }).ok, false);
  assert.equal(validateReview({ ...base, goalResult: "yes" }).ok, false);
  assert.equal(validateReview({ ...base, step: 6 }).ok, false);
  assert.equal(validateReview({ ...base, goalText: "x".repeat(LIMITS.goalText + 1) }).ok, false);
  assert.equal(validateReview({ ...base, blockers: Array(9).fill("a") }).ok, false);
  assert.equal(validateReview({ ...base, haqq: [1] }).ok, false);
  assert.equal(validateReview(null).ok, false);
});

test("weekdayAverages: ২টির কম নমুনা ⇒ null", () => {
  const a = weekdayAverages([
    { date: "2026-11-01", score: 80 }, { date: "2026-11-08", score: 70 }, // রবি ×২ ⇒ 75
    { date: "2026-11-02", score: 50 },                                    // সোম ×১ ⇒ null
  ]);
  assert.equal(a[0].avg, 75);
  assert.equal(a[1].avg, null);
  assert.equal(a[1].count, 1);
});
test("weakestWeekdays: মোট গড়ের নিচের সবচেয়ে কমগুলো", () => {
  const avgs = [60, 40, 70, 80, 65, 45, 75].map((avg, weekday) => ({ weekday, count: 3, avg }));
  assert.deepEqual(weakestWeekdays(avgs), [1, 5]);
  assert.deepEqual(weakestWeekdays(avgs.map(a => ({ ...a, avg: 50 }))), []); // সব সমান
  assert.deepEqual(weakestWeekdays([{ weekday: 0, count: 1, avg: null }]), []);
});
test("bestImprovementAndDrop", () => {
  const r = bestImprovementAndDrop([
    { key: "quran", prev: 2, cur: 5 }, { key: "fajr", prev: 6, cur: 3 }, { key: "dhikr", prev: 1, cur: 1 },
  ]);
  assert.equal(r.improvement.key, "quran");
  assert.equal(r.drop.key, "fajr");
  const none = bestImprovementAndDrop([{ key: "a", prev: 1, cur: 1 }]);
  assert.equal(none.improvement, null); assert.equal(none.drop, null);
  const tie = bestImprovementAndDrop([{ key: "b", prev: 0, cur: 2 }, { key: "a", prev: 0, cur: 2 }]);
  assert.equal(tie.improvement.key, "a");
});
test("goalSuccess: null/অজানা গোনা হয় না", () => {
  assert.deepEqual(goalSuccess(["done", "done", "partial", "done", null, "x"]), { done: 3, partial: 1, none: 0, total: 4 });
  assert.deepEqual(goalSuccess(undefined), { done: 0, partial: 0, none: 0, total: 0 });
});
test("monthDelta", () => {
  assert.equal(monthDelta(61, 67), 6);
  assert.equal(monthDelta(67.4, 61.2), -6);
  assert.equal(monthDelta(null, 50), null);
});

test("weeklyGap: বেশি ছুটে যাওয়া আগে, ওজর ও অল্প ডেটা বাদ", () => {
  const fields = [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "d" }];
  const vals = {
    a: [1, 0, 0], b: [1, 1, 0], c: [1, 1, 1], d: [0],
  };
  const days = [0, 1, 2].map(i => ({ day: i + 1, entry: { i } }));
  const rows = weeklyGap({
    days, fields,
    ratioOf: (f, e) => (vals[f.key][e.i] === undefined ? null : vals[f.key][e.i]),
    applies: f => f.key !== "zzz",
    excused: (f, e) => f.key === "b" && e.i === 2,
  });
  assert.deepEqual(rows.map(r => r.key), ["a"]);     // b: ওজর বাদে ২ দিনই পূর্ণ; c পূর্ণ; d ১ দিন
  assert.equal(rows[0].missed, 2); assert.equal(rows[0].avgPct, 33);
});
test("countFieldTotal", () => {
  const r = countFieldTotal([{ entry: { j: 5 } }, { entry: { j: 9 } }, { entry: {} }, { entry: null }], "j", 5);
  assert.deepEqual(r, { sum: 10, possible: 10, days: 2 });
});

// ---------- ধাপ ৩: মাসিক রিপোর্ট ----------
const pad = n => String(n).padStart(2, "0");
const FIELDS = [
  { key: "a", label: "আ", type: "bool" },
  { key: "b", label: "বি", shortLabel: " বি-শর্ট ", type: "bool" },
  { key: "phoneOffBy11", label: "ফোন", shortLabel: "ফোন বন্ধ", type: "bool" },
];
const H = {
  member: {}, allFields: FIELDS,
  fieldApplies: () => true,
  isExcused: (e, k) => !!(e && e.excused && e.excused[k]),
  isFieldExcusable: () => false,
  // বানানো স্কোর: দেওয়া ফিল্ডগুলোর গড় (bool)
  dailyScore: (e, m, fields) => (e ? fields.reduce((t, f) => t + (e[f.key] ? 1 : 0), 0) / fields.length : null),
  ratioOf: (f, e) => (e ? (e[f.key] ? 1 : 0) : null),
};
// days: { 1: {a,b,phoneOffBy11}, ... } ⇒ { "01": entry }
const mk = days => Object.fromEntries(Object.entries(days).map(([d, e]) => [pad(d), e]));
const NOW_MID = new Date(2026, 10, 15);  // নভেম্বর ১৫ (চলমান)
const NOW_LATE = new Date(2026, 11, 20); // ডিসেম্বর ২০ (নভেম্বর সম্পূর্ণ)

test("elapsedDays: ভবিষ্যৎ ০, চলতি = আজ, অতীত = পুরো মাস", () => {
  assert.equal(elapsedDays(2026, 11, NOW_MID), 0);
  assert.equal(elapsedDays(2026, 10, NOW_MID), 15);
  assert.equal(elapsedDays(2026, 9, NOW_MID), 31);
  assert.equal(elapsedDays(2026, 1, new Date(2026, 2, 5)), 28);
});
test("prevMonthOf: বছর পেরোনো", () => {
  assert.deepEqual(prevMonthOf(2026, 0), { year: 2025, month0: 11 });
  assert.deepEqual(prevMonthOf(2026, 10), { year: 2026, month0: 9 });
});
test("fill: placeholder ভরে, অজানা অক্ষত", () => {
  assert.equal(fill("{a}-{b}", { a: "১" }), "১-{b}");
});

test("report: ৩ দিনের কম এন্ট্রিতে ok=false", () => {
  const r = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_MID, curEntries: mk({ 1: { a: 1 }, 2: { a: 1 } }), prevEntries: null, h: H });
  assert.equal(r.ok, false); assert.equal(r.filled, 2);
});
test("report: ভবিষ্যৎ মাসে ok=false", () => {
  const r = buildMonthlyReport({ year: 2026, month0: 11, now: NOW_MID, curEntries: mk({ 1: { a: 1 } }), prevEntries: null, h: H });
  assert.equal(r.ok, false);
});

test("report: গড়, তুলনা ও সপ্তাহ-গড় (আগের মাস ছাড়া)", () => {
  // নভেম্বর ১-৭: সব ৩টাই ঠিক (১০০%), ৮-১২: একটা ঠিক (৩৩%)
  const cur = {};
  for (let d = 1; d <= 7; d++) cur[d] = { a: 1, b: 1, phoneOffBy11: 1 };
  for (let d = 8; d <= 12; d++) cur[d] = { a: 1 };
  const r = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_MID, curEntries: mk(cur), prevEntries: null, h: H });
  assert.equal(r.ok, true);
  assert.equal(r.prev, null); assert.equal(r.delta, null);
  assert.equal(r.filled, 12);
  assert.equal(r.avg, Math.round(((7 * 1 + 5 * (1 / 3)) / 12) * 100)); // 72
  assert.deepEqual(r.weeks.map(w => [w.week, w.count, w.avg]), [[1, 7, 100], [2, 5, 33]]); // ৩য় সপ্তাহ (১৫-২১) শুরু হয়েছে কিন্তু ডেটা নেই ⇒ শেষের ফাঁকা সপ্তাহ বাদ
});

test("report: আগের মাসের তুলনা, চলমান মাসে একই দিন-জানালা", () => {
  // চলতি: ১-১৫ সব ঠিক। আগের (অক্টোবর): ১-১৫ অর্ধেক ঠিক, ১৬-৩১ সব ঠিক (জানালার বাইরে, ধরা পড়বে না)
  const cur = {}, prv = {};
  for (let d = 1; d <= 15; d++) cur[d] = { a: 1, b: 1, phoneOffBy11: 1 };
  for (let d = 1; d <= 15; d++) prv[d] = d % 2 ? { a: 1, b: 1, phoneOffBy11: 1 } : {};
  for (let d = 16; d <= 31; d++) prv[d] = { a: 1, b: 1, phoneOffBy11: 1 };
  const r = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_MID, curEntries: mk(cur), prevEntries: mk(prv), h: H });
  assert.equal(r.partial, true); assert.equal(r.cmp, 15);
  assert.equal(r.avg, 100);
  assert.equal(r.prev.avg, Math.round((8 / 15) * 100)); // ১-১৫: ৮ দিন ১০০%, ৭ দিন ০% ⇒ ৫৩
  assert.equal(r.delta, 100 - 53);
  assert.equal(r.moves.improvement.cur, 15); assert.equal(r.moves.improvement.prev, 8);
  assert.equal(r.moves.drop, null);
});

test("report: সম্পূর্ণ মাসে পুরো আগের মাস ধরা হয়; পতন ও লেবেল trim", () => {
  const cur = {}, prv = {};
  for (let d = 1; d <= 30; d++) {
    cur[d] = { a: 1, b: d <= 10 ? 1 : 0, phoneOffBy11: 1 }; // b: ১০ দিন
    prv[d] = { a: 1, b: 1, phoneOffBy11: 1 };               // b: ৩০ দিন
  }
  const r = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_LATE, curEntries: mk(cur), prevEntries: mk(prv), h: H });
  assert.equal(r.partial, false);
  assert.equal(r.moves.drop.key, "b"); assert.equal(r.moves.drop.label, "বি-শর্ট"); // শুরুর/শেষের স্পেস বাদ
  assert.equal(r.moves.drop.prev, 30); assert.equal(r.moves.drop.cur, 10);
});

test("report: ওজর/অল্প-ডেটার ফিল্ড উন্নতি-পতন থেকে বাদ", () => {
  const Hx = { ...H, isFieldExcusable: f => f.key === "b" };
  const cur = {}, prv = {};
  for (let d = 1; d <= 10; d++) { cur[d] = { a: 1, b: 0, phoneOffBy11: 1 }; prv[d] = { a: 1, b: 1, phoneOffBy11: 1 }; }
  cur[3] = { a: 1, b: 0, phoneOffBy11: 1, excused: { b: true } };
  const r = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_LATE, curEntries: mk(cur), prevEntries: mk(prv), h: Hx });
  assert.equal(r.moves.drop, null); // b-তে ওজর ⇒ তুলনা অন্যায্য ⇒ বাদ
});

test("report: বার-অনুযায়ী দুর্বলতম (≥৩ বারে ডেটা লাগে)", () => {
  // নভেম্বর ২০২৬: ১ = রবি। রবি/সোম/মঙ্গল ×২ সপ্তাহ করে ডেটা; সোমবার দুর্বল
  const cur = {};
  [1, 8].forEach(d => { cur[d] = { a: 1, b: 1, phoneOffBy11: 1 }; });       // রবি ১০০
  [2, 9].forEach(d => { cur[d] = {}; });                                      // সোম ০
  [3, 10].forEach(d => { cur[d] = { a: 1, b: 1, phoneOffBy11: 1 }; });       // মঙ্গল ১০০
  const r = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_LATE, curEntries: mk(cur), prevEntries: null, h: H });
  assert.equal(r.weekdayValid, 3);
  assert.deepEqual(r.weakest, [1]);
  const few = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_LATE, curEntries: mk({ 1: {a:1}, 2: {a:1}, 3: {a:1} }), prevEntries: null, h: H });
  assert.deepEqual(few.weakest, []); // প্রতি বারে ১টি নমুনা ⇒ অপর্যাপ্ত
});

test("report: কখন ভালো থাকেন — ঘুমের ফিল্ড বাদ দিয়ে হিসাব, ≥৫ পয়েন্ট ও ≥৩+৩ দিন", () => {
  const cur = {};
  for (let d = 1; d <= 4; d++) cur[d] = { a: 1, b: 1, phoneOffBy11: 1 };  // yes: বাকি স্কোর ১০০
  for (let d = 5; d <= 8; d++) cur[d] = { a: 1, b: 0 };                   // no: বাকি স্কোর ৫০
  const r = buildMonthlyReport({ year: 2026, month0: 10, now: NOW_LATE, curEntries: mk(cur), prevEntries: null, h: H });
  assert.deepEqual(r.whenGood, { key: "phoneOffBy11", label: "ফোন বন্ধ", diff: 50, yesN: 4, noN: 4 });
  // উল্টো (ফোন বন্ধের দিন খারাপ) ⇒ দেখানো হয় না
  const rev = {};
  for (let d = 1; d <= 4; d++) rev[d] = { a: 0, b: 0, phoneOffBy11: 1 };
  for (let d = 5; d <= 8; d++) rev[d] = { a: 1, b: 1 };
  assert.equal(buildMonthlyReport({ year: 2026, month0: 10, now: NOW_LATE, curEntries: mk(rev), prevEntries: null, h: H }).whenGood, null);
  // দলে ২ দিন ⇒ বাদ
  const small = { 1: { a: 1, b: 1, phoneOffBy11: 1 }, 2: { a: 1, b: 1, phoneOffBy11: 1 }, 3: { a: 1, b: 0 }, 4: { a: 1, b: 0 }, 5: { a: 1, b: 0 } };
  assert.equal(buildMonthlyReport({ year: 2026, month0: 10, now: NOW_LATE, curEntries: mk(small), prevEntries: null, h: H }).whenGood, null);
});

test("goalSummary: সপ্তাহ-ক্রমে, অজানা/অনুপস্থিত গোনা হয় না", () => {
  const g = goalSummary([
    { weekKey: "2026-11-15", goalResult: "partial" }, { weekKey: "2026-11-01", goalResult: "done" },
    { weekKey: "2026-11-08", goalResult: undefined }, { weekKey: "2026-11-22", goalResult: "x" }, null,
  ]);
  assert.deepEqual(g.seq, ["done", "partial"]);
  assert.deepEqual(g.counts, { done: 1, partial: 1, none: 0, total: 2 });
  assert.deepEqual(goalSummary(undefined).counts.total, 0);
});

test("suggestDecisions: সর্বোচ্চ ৩, ব্যক্তিগত লেখা ঢোকে না, চলমান মাসে সংখ্যা ছাড়া", () => {
  const D = REVIEW_TEXT.monthly.decisions;
  const bn = x => "#" + x;
  const names = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
  const full = { ok: true, partial: false, weakest: [1, 5], topGap: null, moves: { drop: { label: "ফজর", prev: 6, cur: 3 }, improvement: { label: "কুরআন" } } };
  const out = suggestDecisions(full, { text: D, toBn: bn, weekdayNames: names });
  assert.deepEqual(out.map(x => x.id), ["drop", "weekday", "keep"]);
  assert.equal(out[0].text, "“ফজর” #3 দিন থেকে অন্তত #6 দিনে ফেরানো");
  assert.match(out[1].text, /সোম ও শুক্র/);
  const part = suggestDecisions({ ...full, partial: true }, { text: D, toBn: bn, weekdayNames: names });
  assert.equal(part[0].text, "“ফজর” গত মাসের মতো নিয়মিত ফেরানো");
  const gap = suggestDecisions({ ok: true, partial: false, weakest: [], moves: {}, topGap: { label: "যিকির", missed: 9 } }, { text: D, toBn: bn, weekdayNames: names });
  assert.deepEqual(gap.map(x => x.id), ["gap"]);
  assert.deepEqual(suggestDecisions({ ok: false }, { text: D, toBn: bn, weekdayNames: names }), []);
});

// সপ্তাহের এক নজর (ধাপ ১)
const gDays = scores => scores.map((s, i) => ({ day: i + 1, entry: s === undefined ? null : { s } }));
const gScore = e => e.s;
test("weekGlance: গড়, সেরা দিন ও এন্ট্রি-সংখ্যা", () => {
  const g = weekGlance({ days: gDays([0.5, 0.8, undefined, 0.8, 0.2]), scoreOf: gScore });
  assert.equal(g.total, 5); assert.equal(g.logged, 4); assert.equal(g.enough, true);
  assert.equal(g.avg, 58);                       // (50+80+80+20)/4 = 57.5 ⇒ 58
  assert.deepEqual(g.best, { day: 2, pct: 80 }); // সমান হলে আগের দিন
  assert.equal(g.delta, null);                   // আগের সপ্তাহ নেই
});
test("weekGlance: কম ডেটায় গড়/সেরা দিন/delta নেই", () => {
  const g = weekGlance({ days: gDays([0.5, 0.9]), prevDays: gDays([0.4, 0.4, 0.4]), scoreOf: gScore });
  assert.equal(g.logged, 2); assert.equal(g.enough, false);
  assert.equal(g.avg, null); assert.equal(g.best, null); assert.equal(g.delta, null);
});
test("weekGlance: আগের সপ্তাহের সাথে delta", () => {
  const g = weekGlance({ days: gDays([0.6, 0.6, 0.9]), prevDays: gDays([0.5, 0.5, 0.5]), scoreOf: gScore });
  assert.equal(g.avg, 70); assert.equal(g.delta, 20);
  assert.equal(weekGlance({ days: gDays([0.6, 0.6, 0.9]), prevDays: gDays([0.5, undefined, 0.5]), scoreOf: gScore }).delta, null); // আগের সপ্তাহে ৩ দিন নেই
});
test("weekGlance: সব দিন সমান হলে সেরা দিন নেই; এন্ট্রিহীন সপ্তাহ নিরাপদ", () => {
  assert.equal(weekGlance({ days: gDays([0.7, 0.7, 0.7]), scoreOf: gScore }).best, null);
  const e = weekGlance({ days: gDays([undefined, undefined]), scoreOf: gScore });
  assert.equal(e.logged, 0); assert.equal(e.avg, null);
  assert.equal(weekGlance({ days: [], scoreOf: gScore }).total, 0);
});
test("REVIEW_TEXT.glance: প্রয়োজনীয় লেখা আছে", () => {
  const G = REVIEW_TEXT.glance;
  assert.equal(G.weekdays.length, 7);
  for (const k of ["title", "vsPrev", "best", "deltaUp", "deltaDown", "deltaSame", "needMore"]) assert.ok(G[k]);
});
