import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  countsOf, posToIdx, idxToPos, makePlan, sanitizePlan, todayPortion, markDone, undoDone,
  setPerDay, statsOf, perDayForDays, planKey, HIFZ_KEY, KHATAM_KEY, totalOf, makeGoto, readGoto, clampPerDay, GOTO_TTL_MS,
} from "../src/legacy/hifzPlan.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(fs.readFileSync(path.join(root, "public", "quran", "v1", "meta.json"), "utf8"));
const C = countsOf(meta.surahs);

test("posToIdx/idxToPos ঘুরে মেলে; অবৈধ -1/null", () => {
  assert.equal(C.length, 114);
  assert.equal(posToIdx(C, 1, 1), 0);
  assert.equal(posToIdx(C, 2, 1), C[0]);
  assert.deepEqual(idxToPos(C, C[0]), { s: 2, a: 1 });
  const last = C.reduce((x, y) => x + y, 0) - 1;
  assert.deepEqual(idxToPos(C, last), { s: 114, a: C[113] });
  assert.equal(idxToPos(C, last + 1), null);
  assert.equal(posToIdx(C, 2, 0), -1);
  assert.equal(posToIdx(C, 2, C[1] + 1), -1);
  assert.equal(posToIdx(C, 115, 1), -1);
  assert.equal(posToIdx([], 1, 1), -1);
});

test("makePlan: উল্টো/অবৈধ পরিসর null; perDay সীমায়", () => {
  assert.equal(makePlan(C, { s: 2, a: 5 }, { s: 2, a: 4 }, 5, 1), null);
  assert.equal(makePlan(C, { s: 2, a: 5 }, { s: 200, a: 1 }, 5, 1), null);
  assert.equal(makePlan(C, null, { s: 2, a: 4 }, 5, 1), null);
  assert.equal(makePlan(C, { s: 1, a: 1 }, { s: 1, a: 7 }, 0, 1).perDay, 1);
  assert.equal(clampPerDay(99999), 1000);
  assert.equal(clampPerDay("x"), 5);
});

test("আজকের পাঠ সূরা পেরিয়ে যায়, শেষে ছোট হয়, শেষ হলে null", () => {
  // ফাতিহা (৭) + বাকারার প্রথম ৩, দৈনিক ৫
  let p = makePlan(C, { s: 1, a: 1 }, { s: 2, a: 3 }, 5, 1);
  assert.equal(totalOf(p, C), 10);
  assert.deepEqual(todayPortion(p, C), { from: { s: 1, a: 1 }, to: { s: 1, a: 5 }, n: 5 });
  p = markDone(p, C);
  assert.equal(p.done, 5);
  assert.deepEqual(todayPortion(p, C), { from: { s: 1, a: 6 }, to: { s: 2, a: 3 }, n: 5 });
  p = markDone(p, C);
  assert.equal(todayPortion(p, C), null);
  assert.equal(markDone(p, C), p); // শেষে আর বাড়ে না
  assert.equal(statsOf(p, C).finished, true);
});

test("ছোট শেষ-ধাপ: ১০ আয়াত, দৈনিক ৪ → ৪,৪,২", () => {
  let p = makePlan(C, { s: 114, a: 1 }, { s: 114, a: 6 }, 4, 1);
  assert.equal(todayPortion(p, C).n, 4);
  p = markDone(p, C);
  assert.equal(todayPortion(p, C).n, 2);
  p = markDone(p, C);
  assert.equal(p.done, 6);
});

test("undo একবারই; setPerDay অগ্রগতি অক্ষত", () => {
  let p = makePlan(C, { s: 1, a: 1 }, { s: 1, a: 7 }, 3, 1);
  p = markDone(p, C);
  p = undoDone(p);
  assert.equal(p.done, 0);
  assert.equal(undoDone(p).done, 0);
  p = markDone(p, C);
  const q = setPerDay(p, 2);
  assert.equal(q.done, 3);
  assert.equal(q.perDay, 2);
});

test("statsOf", () => {
  let p = makePlan(C, { s: 1, a: 1 }, { s: 1, a: 7 }, 3, 1);
  p = markDone(p, C);
  assert.deepEqual(statsOf(p, C), { total: 7, done: 3, remaining: 4, percent: 42, daysLeft: 2, finished: false });
});

test("sanitizePlan: অবৈধ → null; done সীমায়; last done-এর বেশি নয়", () => {
  assert.equal(sanitizePlan(null, C), null);
  assert.equal(sanitizePlan({ from: { s: 0, a: 1 }, to: { s: 1, a: 1 } }, C), null);
  const p = sanitizePlan({ from: { s: 1, a: 1 }, to: { s: 1, a: 7 }, perDay: 3, done: 99, last: 50 }, C);
  assert.equal(p.done, 7);
  assert.equal(p.last, 7);
  assert.equal(sanitizePlan({ from: { s: 1, a: 1 }, to: { s: 1, a: 7 }, done: -4 }, C).done, 0);
});

test("হ্যান্ডঅফ: তাজা ও বৈধ হলেই; পুরনো/ভবিষ্যৎ/অবৈধ null", () => {
  const g = makeGoto(2, 6, 1000);
  assert.deepEqual(readGoto(g, C, 1000 + 5), { s: 2, a: 6 });
  assert.equal(readGoto(g, C, 1000 + GOTO_TTL_MS + 1), null);
  assert.equal(readGoto(g, C, 900), null);
  assert.equal(readGoto({ s: 2, a: 9999, t: 1000 }, C, 1001), null);
  assert.equal(readGoto(null, C, 1), null);
});

test("খতম: পুরো কুরআন ৩০ দিনে → দৈনিক ২০৮; পরিসর ৬২৩৬ আয়াত", () => {
  const total = C.reduce((x, y) => x + y, 0);
  assert.equal(total, 6236);
  assert.equal(perDayForDays(total, 30), 208);
  assert.equal(perDayForDays(total, 0), 5);
  const p = makePlan(C, { s: 1, a: 1 }, { s: 114, a: C[113] }, 208, 1);
  assert.equal(totalOf(p, C), 6236);
  assert.equal(statsOf(p, C).daysLeft, 30);
  assert.equal(planKey("khatam"), KHATAM_KEY);
  assert.equal(planKey("hifz"), HIFZ_KEY);
  assert.notEqual(KHATAM_KEY, HIFZ_KEY);
});
