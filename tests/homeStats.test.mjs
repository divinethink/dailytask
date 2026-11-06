import test from "node:test";
import assert from "node:assert/strict";
import { rangeScore, monthStatsOf, weekSummaryOf, yesterdayEntryOf, yesterdayMissingOf } from "../src/legacy/homeStats.js";

const pad2 = (n) => String(n).padStart(2, "0");
const dateKey = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();
const dailyScore = (e) => (e ? e.s : null);
const h = { pad2, dateKey, daysInMonth, dailyScore };

// আগের App()-এর হুবহু কোড (রেফারেন্স) — নতুন ফাংশনের সাথে মিলিয়ে দেখা হয়।
function refMonthStats(monthEntries, year, month0) {
  const total = daysInMonth(year, month0);
  let filled = 0, scoreSum = 0;
  for (let d = 1; d <= total; d++) {
    const s = dailyScore(monthEntries[pad2(d)]);
    if (s !== null) { filled += 1; scoreSum += s; }
  }
  const avg = filled ? scoreSum / filled : 0;
  return { total, filled, avgPct: Math.round(avg * 100) };
}

function rnd(seed) { let x = seed; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; }

test("monthStatsOf = আগের হিসাব (র‍্যান্ডম ডেটা)", () => {
  const r = rnd(7);
  for (let t = 0; t < 200; t++) {
    const entries = {};
    for (let d = 1; d <= 31; d++) if (r() < 0.5) entries[pad2(d)] = { s: r() };
    const y = 2026, m0 = Math.floor(r() * 12);
    assert.deepEqual(monthStatsOf({ entries, year: y, month0: m0 }, h), refMonthStats(entries, y, m0));
  }
});

test("monthStatsOf: এন্ট্রি না থাকলে avgPct ০", () => {
  assert.deepEqual(monthStatsOf({ entries: {}, year: 2026, month0: 10 }, h), { total: 30, filled: 0, avgPct: 0 });
});

test("rangeScore: শুধু এন্ট্রি-থাকা দিন গোনে", () => {
  const e = { "02": { s: 0.5 }, "03": { s: 1 } };
  assert.deepEqual(rangeScore(e, 1, 7, null, null, h), { filled: 2, scoreSum: 1.5 });
});

test("weekSummaryOf: এন্ট্রি না থাকলে null; থাকলে গড়/দিন-সংখ্যা", () => {
  assert.equal(weekSummaryOf({ start: 1, end: 7 }, {}, null, null, h), null);
  const e = { "01": { s: 0.8 }, "04": { s: 0.6 } };
  assert.deepEqual(weekSummaryOf({ start: 1, end: 7 }, e, null, null, h), { avgPct: 70, filled: 2, totalDays: 7 });
  assert.deepEqual(weekSummaryOf({ start: 29, end: 30 }, { "29": { s: 1 } }, null, null, h), { avgPct: 100, filled: 1, totalDays: 2 });
});

const now = new Date(2026, 10, 6); // ৬ নভেম্বর ২০২৬
const cur = { year: 2026, month0: 10 };

test("yesterdayEntryOf: শর্ত মিললে গতকালের এন্ট্রি, নইলে null", () => {
  const e = { "05": { s: 1 } };
  assert.deepEqual(yesterdayEntryOf({ viewDate: now, cursor: cur, entries: e, now }, h), { s: 1 });
  assert.equal(yesterdayEntryOf({ viewDate: new Date(2026, 10, 3), cursor: cur, entries: e, now }, h), null); // আজকের দিন দেখছি না
  assert.equal(yesterdayEntryOf({ viewDate: now, cursor: { year: 2026, month0: 9 }, entries: e, now }, h), null); // অন্য মাস
  assert.equal(yesterdayEntryOf({ viewDate: new Date(2026, 10, 1), cursor: cur, entries: e, now: new Date(2026, 10, 1) }, h), null); // ১ তারিখ
  assert.equal(yesterdayEntryOf({ viewDate: now, cursor: cur, entries: null, now }, h), null);
  assert.equal(yesterdayEntryOf({ viewDate: now, cursor: cur, entries: {}, now }, h), null);
});

test("yesterdayMissingOf: মাসে এন্ট্রি আছে কিন্তু গতকালের নেই", () => {
  assert.equal(yesterdayMissingOf({ viewDate: now, cursor: cur, entries: { "02": { s: 1 } }, now }, h), true);
  assert.equal(yesterdayMissingOf({ viewDate: now, cursor: cur, entries: { "05": { s: 1 } }, now }, h), false);
  assert.equal(yesterdayMissingOf({ viewDate: now, cursor: cur, entries: {}, now }, h), false); // নতুন সদস্যকে বিরক্ত নয়
  assert.equal(yesterdayMissingOf({ viewDate: now, cursor: cur, entries: null, now }, h), false);
  assert.equal(yesterdayMissingOf({ viewDate: new Date(2026, 10, 3), cursor: cur, entries: { "02": {} }, now }, h), false);
});
