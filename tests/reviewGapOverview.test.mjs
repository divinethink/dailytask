// চালান: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { buildGapOverview } from "../src/legacy/reviewGapOverview.js";
import { REVIEW_TEXT } from "../src/legacy/reviewText.js";
import { sanitizeCards } from "../src/legacy/homeLayout.js";

const rv = (weekKey, extra) => ({ memberId: "m1", weekKey, updatedAt: 1, ...extra });

test("gapOverview: সারাংশ, বারবার আসা ঘাটতি, কারণ-গণনা", () => {
  const ov = buildGapOverview({
    year: 2026, month0: 10, now: new Date(2026, 10, 19),
    reviews: [
      rv("2026-10-30", { gapKey: "dawah", gapReasons: ["lazy", "company"], goalResult: "none", done: true }),
      rv("2026-11-06", { gapKey: "dawah", gapReasons: ["lazy"], goalResult: "partial" }),
      rv("2026-11-13", { gapKey: "quranPages", gapReasons: [], goalResult: "done" })
    ]
  });
  assert.equal(ov.total, 3);
  assert.equal(ov.filled, 3);
  assert.equal(ov.gapCount, 3);
  assert.deepEqual(ov.topGaps[0], { id: "dawah", count: 2 });
  assert.deepEqual(ov.recurring, ["dawah"]);
  assert.deepEqual(ov.topReasons[0], { id: "lazy", count: 2 });
  assert.deepEqual(ov.goal, { done: 1, partial: 1, none: 1 });
  assert.equal(ov.weeks[0].startDate.getDate(), 30); // ৩০ অক্টোবর
  assert.equal(ov.weeks[0].endDate.getDate(), 5);
});

test("gapOverview: ভবিষ্যতের সপ্তাহ বাদ; লেখা না থাকলে hasReview=false", () => {
  const ov = buildGapOverview({ year: 2026, month0: 10, now: new Date(2026, 10, 9), reviews: [rv("2026-11-06", { gapKey: "dawah" })] });
  assert.equal(ov.total, 2);
  assert.equal(ov.weeks[0].hasReview, false);
  assert.equal(ov.weeks[1].hasGap, true);
  assert.deepEqual(ov.recurring, []);
});

test("gapOverview: খালি/অবৈধ ইনপুটে ক্র্যাশ নেই", () => {
  const ov = buildGapOverview({ year: 2026, month0: 10, now: new Date(2026, 9, 1), reviews: null });
  assert.equal(ov.total, 0);
  assert.equal(ov.gapCount, 0);
  const ov2 = buildGapOverview({ year: 2026, month0: 10, now: new Date(2026, 10, 7), reviews: [rv("2026-10-30", { gapReasons: "x", blockers: 5 })] });
  assert.deepEqual(ov2.weeks[0].reasons, []);
});

test("weeklyGaps কার্ড: পুরনো সেভ-করা লেআউটে 'weekly'-র ঠিক পরে বসে; লেখা আছে", () => {
  const saved = [{ id: "weekly", visible: true, fold: "open" }, { id: "monthlyReport", visible: true, fold: "open" }];
  const out = sanitizeCards("below", saved).map(c => c.id);
  assert.ok(out.indexOf("weeklyGaps") === out.indexOf("weekly") + 1);
  assert.ok(REVIEW_TEXT.gapOverview.title);
});
