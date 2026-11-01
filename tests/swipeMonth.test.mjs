// চালান: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { swipeDelta, shiftMonthCursor } from "../src/legacy/swipeMonth.js";

test("swipeDelta: দিক ও থ্রেশহোল্ড", () => {
  assert.equal(swipeDelta(80, 5), -1); // বাম→ডান = আগের মাস
  assert.equal(swipeDelta(-80, 5), 1); // ডান→বাম = পরের মাস
  assert.equal(swipeDelta(40, 0), 0); // খুব ছোট
  assert.equal(swipeDelta(-59, 0), 0);
  assert.equal(swipeDelta(90, 80), 0); // বেশি উল্লম্ব = স্ক্রল
  assert.equal(swipeDelta(-100, 60), 1);
});

test("shiftMonthCursor: বছর-সীমা", () => {
  assert.deepEqual(shiftMonthCursor({ year: 2026, month0: 0 }, -1), { year: 2025, month0: 11 });
  assert.deepEqual(shiftMonthCursor({ year: 2026, month0: 11 }, 1), { year: 2027, month0: 0 });
  assert.deepEqual(shiftMonthCursor({ year: 2026, month0: 10 }, -1), { year: 2026, month0: 9 });
  assert.deepEqual(shiftMonthCursor({ year: 2026, month0: 10 }, 1), { year: 2026, month0: 11 });
});
