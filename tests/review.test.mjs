// চালান: node --test tests/   (কোনো dependency লাগে না)
import test from "node:test";
import assert from "node:assert/strict";
import { weekKeyOf, reviewDocId, validateReview, LIMITS } from "../src/legacy/reviewSchema.js";
import { weekdayAverages, weakestWeekdays, bestImprovementAndDrop, goalSuccess, monthDelta } from "../src/legacy/reviewCalc.js";

const base = { memberId: "m-1", weekKey: "2026-11-01", updatedAt: 1 };

test("weekKeyOf: রবিবার-শুরু", () => {
  assert.equal(weekKeyOf(new Date(2026, 10, 1)), "2026-11-01");   // রবি
  assert.equal(weekKeyOf(new Date(2026, 10, 7)), "2026-11-01");   // শনি
  assert.equal(weekKeyOf(new Date(2026, 10, 8)), "2026-11-08");   // পরের রবি
  assert.equal(weekKeyOf(new Date(2027, 0, 2)), "2026-12-27");    // বছর পেরোনো
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
