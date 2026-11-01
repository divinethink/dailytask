// চালান: node --test tests/   (কোনো dependency লাগে না)
import test from "node:test";
import assert from "node:assert/strict";
import { chunkCount, chunkOfDay, chunkRange, chunkWeekKey, prevChunk, reviewDocId, validateReview, LIMITS } from "../src/legacy/reviewSchema.js";
import { weeklyGap, countFieldTotal, weekdayAverages, weakestWeekdays, bestImprovementAndDrop, goalSuccess, monthDelta } from "../src/legacy/reviewCalc.js";

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
