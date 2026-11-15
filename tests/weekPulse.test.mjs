// চালান: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { buildWeekPulse, lineKind, pickVariant, phaseOf, gapRepeat, clip } from "../src/legacy/weekPulse.js";
import { REVIEW_TEXT } from "../src/legacy/reviewText.js";
import { sanitizeCards, defaultCards } from "../src/legacy/homeLayout.js";

const e = r => ({ r });
const mk = (arr) => arr.map(x => ({ entry: x === null ? null : e(x) }));
const run = (arr, todayIdx, extra = {}) => buildWeekPulse({ days: mk(arr), todayIdx, ratioOf: x => x.r, excusedOf: x => !!x.ex, ...extra });

test("weekPulse: দিনের অবস্থা ও গণনা", () => {
  const p = run([1, 0.5, 0, null, null, null, null], 2);
  assert.deepEqual(p.cells.map(c => c.state), ["full", "part", "miss", "future", "future", "future", "future"]);
  assert.equal(p.full, 1); assert.equal(p.part, 1); assert.equal(p.counted, 3); assert.equal(p.left, 4);
  assert.equal(p.cells[2].isToday, true);
});

test("weekPulse: আজ এন্ট্রি নেই = pending; আগের দিন এন্ট্রি নেই = empty (ছুটে যাওয়া ধরা হয় না)", () => {
  const p = run([null, 1, null, null, null, null, null], 2);
  assert.equal(p.cells[0].state, "empty"); assert.equal(p.cells[2].state, "pending");
  assert.equal(p.counted, 1);
});

test("weekPulse: টানা পূর্ণ দিন; আজ বাকি থাকলে গতকাল থেকে গোনা", () => {
  assert.equal(run([1, 1, 1, null, null, null, null], 3).streak, 3);
  assert.equal(run([1, 0, 1, 1, null, null, null], 3).streak, 2);
  assert.equal(run([1, 1, 1, 1, null, null, null], 3).streak, 4);
});

test("weekPulse: ওজর-দিন টানা ধারা ভাঙে না ও গণনায় আসে না", () => {
  const p = buildWeekPulse({ days: [{ entry: e(1) }, { entry: { r: 0, ex: true } }, { entry: e(1) }, { entry: null }, { entry: null }, { entry: null }, { entry: null }], todayIdx: 2, ratioOf: x => x.r, excusedOf: x => !!x.ex });
  assert.equal(p.cells[1].state, "excused"); assert.equal(p.streak, 2); assert.equal(p.counted, 2);
});

test("weekPulse: slip = গতকাল ছুটেছে ও আজ এখনো হয়নি", () => {
  assert.equal(run([1, 0, null, null, null, null, null], 2).slip, true);
  assert.equal(run([1, 0.4, null, null, null, null, null], 2).slip, true);
  assert.equal(run([1, 0, 1, null, null, null, null], 2).slip, false);
  assert.equal(run([1, 1, null, null, null, null, null], 2).slip, false);
  assert.equal(run([null, null, null, null, null, null, null], 0).slip, false);
});

test("weekPulse: অবৈধ ইনপুটে null", () => {
  assert.equal(buildWeekPulse({ days: [], todayIdx: 0 }), null);
  assert.equal(run([1, 1, 1, 1, 1, 1, 1], 7), null);
  assert.equal(run([1, 1, 1, 1, 1, 1, 1], -1), null);
});

test("weekPulse: পর্যায় ও বার্তার ধরন", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(phaseOf), ["plan", "plan", "mid", "mid", "push", "push", "review"]);
  assert.equal(lineKind(run([null, null, null, null, null, null, null], 0), false), "plan");
  assert.equal(lineKind(run([1, 1, 1, null, null, null, null], 2), false), "done");
  assert.equal(lineKind(run([1, 0, null, null, null, null, null], 2), false), "slip");
  assert.equal(lineKind(run([1, 1, 1, 1, 1, 1, 0], 6), false), "review");
  assert.equal(lineKind(run([1, 1, 1, 1, 1, 1, 0], 6), true), "reviewDone");
  assert.equal(lineKind(null, false), "");
});

test("weekPulse: বার্তা দিনভেদে বদলায়, নির্ধারিত (একই ইনপুটে একই), সীমার ভেতরে", () => {
  const seen = new Set();
  for (let i = 0; i < 6; i++) seen.add(pickVariant(3, "2026-11-13", i));
  assert.ok(seen.size > 1);
  assert.equal(pickVariant(3, "2026-11-13", 2), pickVariant(3, "2026-11-13", 2));
  for (let i = 0; i < 7; i++) { const v = pickVariant(3, "2026-11-20", i); assert.ok(v >= 0 && v < 3); }
  assert.equal(pickVariant(0, "x", 1), 0);
});

test("weekPulse: টেক্সট-তালিকা সম্পূর্ণ ও প্রতিটা ধরনে অন্তত একটা বার্তা", () => {
  const T = REVIEW_TEXT.pulse;
  for (const k of ["plan", "mid", "push", "slip", "done", "review", "reviewDone"]) assert.ok(Array.isArray(T.lines[k]) && T.lines[k].length >= 1, k);
  for (const s of ["full", "part", "miss", "empty", "excused", "pending", "future"]) assert.ok(s in T.cellMark, s);
  assert.equal(T.weekdaysShort.length, 7);
});

test("weekPulse: clip", () => {
  assert.equal(clip("  abc ", 10), "abc");
  assert.equal(clip("abcdefghij", 5).length, 5);
});

test("weekPulse কার্ড: পুরনো সেভ-করা লেআউটে 'monthly'-র ঠিক পরে বসে(ডিফল্ট ক্রম: মাসিক ওভারভিউ → সপ্তাহের ফোকাস → আজ/আগামীকাল → সাপ্তাহিক); ডিফল্টে স্থির", () => {
  const saved = defaultCards("below").filter(c => c.id !== "weekPulse");
  const out = sanitizeCards("below", saved).map(c => c.id);
  assert.equal(out.indexOf("weekPulse"), out.indexOf("monthly") + 1);
  const dflt = defaultCards("below").map(c => c.id);
  assert.deepEqual(dflt.slice(dflt.indexOf("monthly"), dflt.indexOf("weekly") + 1), ["monthly", "weekPulse", "tomorrow", "weekly"]);
  assert.equal(defaultCards("below").find(c => c.id === "weekPulse").fold, "fixed");
});

test("gapRepeat: টানা সপ্তাহ ও প্রধান কারণ", () => {
  const r = (gapKey, gapReasons) => ({ gapKey, gapReasons });
  const a = gapRepeat([r("dawah", ["company"]), r("dawah", ["company", "lazy"]), r("quran", [])], "dawah");
  assert.equal(a.weeks, 2); assert.equal(a.reason, "company");
  assert.equal(gapRepeat([r("dawah", ["lazy"]), r("dawah", ["tired"])], "dawah").reason, "");
  assert.equal(gapRepeat([r("dawah", ["lazy"])], "dawah").reason, "lazy");
  assert.equal(gapRepeat([null, r("dawah", [])], "dawah").weeks, 0);
  assert.equal(gapRepeat([r("quran", [])], "dawah").weeks, 0);
  assert.equal(gapRepeat(null, "dawah").weeks, 0);
  assert.equal(gapRepeat([r("dawah", "x")], "dawah").weeks, 1);
});

test("ঘাটতি কার্ড মোছা: পুরনো সেভ-করা লেআউটে weeklyGaps থাকলে বাদ যায়, বাকি অক্ষত", () => {
  const saved = [{ id: "weekly", visible: true, fold: "open" }, { id: "weeklyGaps", visible: true, fold: "open" }, { id: "trend", visible: false, fold: "closed" }];
  const out = sanitizeCards("below", saved);
  assert.ok(!out.some(c => c.id === "weeklyGaps"));
  assert.equal(out.find(c => c.id === "trend").visible, false);
});

test("আজকের ফোকাস কার্ড মোছা: সেভ-করা লেআউটে 'focus' থাকলে বাদ, 'weekPulse' ও বাকি অক্ষত", () => {
  const saved = [{ id: "streak", visible: true, fold: "fixed" }, { id: "focus", visible: true, fold: "fixed" }, { id: "weekPulse", visible: true, fold: "fixed" }];
  const out = sanitizeCards("below", saved).map(c => c.id);
  assert.ok(!out.includes("focus")); assert.ok(out.includes("weekPulse")); assert.ok(out.includes("streak"));
});
