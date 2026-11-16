// tests/quranCore.test.mjs — কুরআন-রিডারের pure লজিক + আসল ডেটা-ফাইলে runtime-validator।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  toBnDigits, pad3, surahTypeLabel, showBismillahHeader, refLabel, parseSurahPayload,
  sanitizeLastRead, pushLastRead, LAST_READ_MAX, QUICK_SURAHS,
} from "../src/legacy/quranCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "public", "quran", "v1");
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(DIR, rel), "utf8"));
const meta = rd("meta.json");

test("toBnDigits / pad3", () => {
  assert.equal(toBnDigits(2), "২");
  assert.equal(toBnDigits("255"), "২৫৫");
  assert.equal(toBnDigits(114), "১১৪");
  assert.equal(pad3(7), "007");
  assert.equal(pad3(114), "114");
});

test("surahTypeLabel ও বিসমিল্লাহ-শিরোনাম নিয়ম", () => {
  assert.equal(surahTypeLabel("m"), "মাক্কী");
  assert.equal(surahTypeLabel("d"), "মাদানী");
  assert.equal(showBismillahHeader(1), false);
  assert.equal(showBismillahHeader(9), false);
  assert.equal(showBismillahHeader(2), true);
  assert.equal(showBismillahHeader(114), true);
});

test("refLabel", () => {
  assert.equal(refLabel({ n: 2, bn: "আল-বাকারা" }, 255), "আল-বাকারা ২:২৫৫");
});

test("দ্রুত-লিংকের সূরা বৈধ", () => {
  QUICK_SURAHS.forEach((n) => assert.ok(meta.surahs[n - 1] && meta.surahs[n - 1].bn));
});

test("parseSurahPayload: গরমিলে throw", () => {
  const sm = { n: 1, ayahs: 2 };
  assert.deepEqual(parseSurahPayload({ s: 1, a: ["أ", "ب"] }, { s: 1, t: ["ক", "খ"] }, sm), [
    { n: 1, ar: "أ", tr: "ক" }, { n: 2, ar: "ب", tr: "খ" },
  ]);
  assert.throws(() => parseSurahPayload({ s: 1, a: ["أ"] }, { s: 1, t: ["ক", "খ"] }, sm));
  assert.throws(() => parseSurahPayload({ s: 2, a: ["أ", "ب"] }, { s: 1, t: ["ক", "খ"] }, sm));
  assert.throws(() => parseSurahPayload({ s: 1, a: ["أ", 5] }, { s: 1, t: ["ক", "খ"] }, sm));
  assert.throws(() => parseSurahPayload(null, null, sm));
});

test("আসল ডেটা: ১১৪ সূরার সবকটা runtime-validator পার করে (মোট ৬২৩৬ আয়াত)", () => {
  let total = 0;
  for (const sm of meta.surahs) {
    const list = parseSurahPayload(rd("ar/" + pad3(sm.n) + ".json"), rd("tr/bn_khan/" + pad3(sm.n) + ".json"), sm);
    assert.equal(list.length, sm.ayahs);
    total += list.length;
  }
  assert.equal(total, 6236);
});

test("sanitizeLastRead: অবৈধ বাদ, প্রতি সূরায় একটা, নতুন আগে, ≤৩", () => {
  const raw = [
    { s: 2, a: 255, t: 5 }, { s: 2, a: 1, t: 9 }, // একই সূরা: প্রথমটা থাকে (ইনপুট-ক্রম)
    { s: 1, a: 8, t: 8 },     // ১ সূরায় ৭ আয়াত → বাদ
    { s: 200, a: 1, t: 1 },   // অবৈধ সূরা
    { s: 18, a: 10, t: 7 }, { s: 36, a: 1, t: 6 }, { s: 67, a: 1, t: 4 },
    null, "x", { s: "2", a: 1 },
  ];
  const out = sanitizeLastRead(raw, meta.surahs);
  assert.equal(out.length, LAST_READ_MAX);
  assert.deepEqual(out.map((x) => x.s), [18, 36, 2]);
  assert.deepEqual(sanitizeLastRead("abc", meta.surahs), []);
  assert.deepEqual(sanitizeLastRead([{ s: 1, a: 1, t: 1 }], null), []);
});

test("pushLastRead: একই সূরা সামনে আসে, ৩-এর বেশি নয়", () => {
  let l = [];
  l = pushLastRead(l, 1, 1, 1);
  l = pushLastRead(l, 2, 5, 2);
  l = pushLastRead(l, 3, 5, 3);
  l = pushLastRead(l, 4, 5, 4);
  assert.deepEqual(l.map((x) => x.s), [4, 3, 2]);
  l = pushLastRead(l, 2, 100, 5);
  assert.deepEqual(l.map((x) => [x.s, x.a]), [[2, 100], [4, 5], [3, 5]]);
  assert.deepEqual(pushLastRead(null, 5, 1, 1), [{ s: 5, a: 1, t: 1 }]);
});
