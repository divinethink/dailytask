// tests/quranTafsirFm.test.mjs — দ্বিতীয় তাফসির (ফাতহুল মাজীদ): লজিক + আসল ডেটা-ফাইল।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFmIndex, findFmRange, parseFmPayload, fmForAyah, fmRangeNote, fmBlocks } from "../src/legacy/quranTafsirFm.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "quran", "v1", "tafsir", "fathul-majid-bn");
const pad3 = (n) => String(n).padStart(3, "0");

test("index: বৈধ পরিসর রাখে, অবৈধ বাদ দেয়", () => {
  const idx = parseFmIndex({ r: { 1: [[3, 3], [1, 2], [5, 9], ["x", 1], [4], [0, 2]], 2: [[6, 11]], 200: [[1, 1]], foo: [[1, 1]] } });
  assert.deepEqual(idx.get(1), [[1, 2], [3, 3], [5, 9]]);
  assert.deepEqual(idx.get(2), [[6, 11]]);
  assert.equal(idx.has(200), false);
  assert.equal(parseFmIndex(null).size, 0);
});

test("পরিসরের ভেতরের প্রতিটা আয়াত একই ব্যাখ্যা পায়", () => {
  const idx = parseFmIndex({ r: { 2: [[6, 11], [20, 20]] } });
  for (const a of [6, 8, 11]) assert.deepEqual(findFmRange(idx, 2, a), [6, 11]);
  assert.equal(findFmRange(idx, 2, 12), null);
  assert.equal(findFmRange(idx, 1, 1), null);
  assert.equal(findFmRange(null, 2, 6), null);
});

test("সূরা-ফাইল: ভুল সূরা বা গঠনে throw, অবৈধ গ্রুপ বাদ", () => {
  assert.throws(() => parseFmPayload({ s: 3, g: [] }, 2));
  assert.throws(() => parseFmPayload(null, 2));
  const g = parseFmPayload({ s: 2, g: [{ a: [6, 11], t: "<p>ক</p>" }, { a: [1], t: "x" }, { a: [2, 2], t: "  " }, null] }, 2);
  assert.equal(g.length, 1);
  assert.equal(fmForAyah(g, 9).a[0], 6);
  assert.equal(fmForAyah(g, 12), null);
});

test("fmRangeNote: ইবনে কাসীরের লেখার সাথে একই ভাষা", () => {
  const d = (n) => String(n);
  assert.equal(fmRangeNote([6, 11], d), "আয়াত 6–11-এর সম্মিলিত তাফসির");
  assert.equal(fmRangeNote([5, 5], d), "");
  assert.equal(fmRangeNote(null, d), "");
});

test("fmBlocks: p/b/আরবি ঠিক ভাঙে, বিপজ্জনক ট্যাগ লেখা হয়ে যায় না", () => {
  const b = fmBlocks("<p><b>শিরোনাম</b> লেখা &amp; আরও</p><p class='arabic uthmani'>(لَأَقْعُدَنَّ)</p><script>alert(1)</script><p>শেষ <img src=x onerror=1> অংশ</p>");
  assert.equal(b[0].kind, "p");
  assert.deepEqual(b[0].parts.map((x) => x.b), [true, false]);
  assert.equal(b[0].parts[1].t, " লেখা & আরও");
  assert.equal(b[1].kind, "ar");
  assert.equal(b[2].parts[0].t, "alert(1)");
  assert.ok(!JSON.stringify(b).includes("<"));
  assert.deepEqual(fmBlocks(null), []);
  assert.equal(fmBlocks("সাধারণ লেখা")[0].parts[0].t, "সাধারণ লেখা");
});

test("আসল ডেটা: index আর সূরা-ফাইল মেলে; সূরার আয়াত-সীমার ভেতরে; শুধু <p>/<b>", () => {
  const idx = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  const meta = JSON.parse(fs.readFileSync(path.join(root, "public", "quran", "v1", "meta.json"), "utf8"));
  const parsed = parseFmIndex(idx);
  assert.equal(parsed.size, Object.keys(idx.r).length);
  let total = 0;
  for (const [s, ranges] of parsed) {
    const g = parseFmPayload(JSON.parse(fs.readFileSync(path.join(dir, pad3(s) + ".json"), "utf8")), s);
    assert.deepEqual(g.map((x) => x.a), ranges, "সূরা " + s);
    for (const x of g) {
      assert.ok(x.a[1] <= meta.surahs[s - 1].ayahs, "সূরা " + s + " সীমা পেরিয়েছে");
      assert.ok(!/<\s*\/?\s*(?!p\b|b\b)[a-z]/i.test(x.t) && !/script|javascript:|\bon\w+\s*=/i.test(x.t));
      assert.ok(fmBlocks(x.t).length > 0);
    }
    total += g.length;
  }
  assert.equal(total, 205);
});
