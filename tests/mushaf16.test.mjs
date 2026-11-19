// tests/mushaf16.test.mjs — ১৬-লাইন মুসহাফের pure হিসাব + পাঠানো ডেটা-ফাইলের অখণ্ডতা (npm test)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { M16_PAGES, clamp16, sanitizeIndex, pageOfAyah, sanitizePage, bismillahUnderBanner, lineWidthEm, fitFontSize, surahsOnPage, firstAyahOnPage, M16_MIN_SIZE, M16_MAX_SIZE } from "../src/legacy/mushaf16.js";

const DIR = new URL("../public/quran/v1/", import.meta.url);
const readJson = (p) => JSON.parse(fs.readFileSync(new URL(p, DIR), "utf8"));
const pad3 = (n) => String(n).padStart(3, "0");
const index = sanitizeIndex(readJson("mushaf16/index.json"));
const meta = readJson("meta.json");

test("clamp16: সীমার ভেতরে রাখে", () => {
  assert.equal(clamp16(0), 1);
  assert.equal(clamp16(9999), M16_PAGES);
  assert.equal(clamp16("12"), 12);
  assert.equal(clamp16(NaN), 1);
  assert.equal(M16_PAGES, 548);
});

test("sanitizeIndex: অবৈধ ইনডেক্স বাতিল", () => {
  assert.ok(index);
  assert.equal(sanitizeIndex(null), null);
  assert.equal(sanitizeIndex({ v: 1, pages: 548, begin: [] }), null);
  assert.equal(sanitizeIndex({ v: 2, pages: 548, begin: index.begin }), null);
});

test("pageOfAyah: ছোট উদাহরণে সীমা ঠিক", () => {
  const b = [[1, 1], [2, 1], [2, 5], [2, 18]];
  assert.equal(pageOfAyah(b, 1, 7), 1);
  assert.equal(pageOfAyah(b, 2, 4), 2);
  assert.equal(pageOfAyah(b, 2, 5), 3);
  assert.equal(pageOfAyah(b, 114, 6), 4);
});

test("sanitizePage: ভাঙা পৃষ্ঠা বাতিল, ঠিকটা গ্রহণ", () => {
  assert.equal(sanitizePage(null, 1), null);
  assert.equal(sanitizePage({ v: 1, p: 2, l: [["b"]] }, 1), null); // পৃষ্ঠা-নম্বর অমিল
  assert.equal(sanitizePage({ v: 1, p: 1, l: [["x"]] }, 1), null);
  assert.equal(sanitizePage({ v: 1, p: 1, l: [["a", 0, [[1, 1, ""]]]] }, 1), null);
  assert.equal(sanitizePage({ v: 1, p: 1, l: [["s", 115]] }, 1), null);
  const ok = sanitizePage({ v: 1, p: 1, l: [["s", 1], ["a", 1, [[1, 1, "ক খ"]]]] }, 1);
  assert.deepEqual(ok[1].segs[0].words, ["ক", "খ"]);
});

test("fitFontSize / lineWidthEm", () => {
  assert.equal(lineWidthEm([]), 0);
  assert.ok(Math.abs(lineWidthEm([1, 2]) - 3.3) < 1e-9);
  assert.equal(fitFontSize(0, 20), null);
  assert.equal(fitFontSize(340, 0), null);
  assert.equal(fitFontSize(340, 22.6), 14.5);
  assert.equal(fitFontSize(100, 22.6), M16_MIN_SIZE);
  assert.equal(fitFontSize(4000, 10), M16_MAX_SIZE);
});

test("পাঠানো ডেটা: ৫৪৮টি পৃষ্ঠা-ফাইল সবই বৈধ, ১৬ লাইনের বেশি নয়", () => {
  let words = 0;
  for (let p = 1; p <= M16_PAGES; p++) {
    const lines = sanitizePage(readJson("mushaf16/" + pad3(p) + ".json"), p);
    assert.ok(lines, "পৃষ্ঠা " + p);
    assert.ok(lines.length <= 16, "পৃষ্ঠা " + p + " লাইন-সংখ্যা");
    assert.ok(lines.some((l) => l.t === "a"), "পৃষ্ঠা " + p + " আয়াত-লাইন");
    for (const l of lines) if (l.t === "a") for (const g of l.segs) words += g.words.length;
  }
  // ৮৩৬৬৮ শব্দ + ৭২:১৬-এর প্রথম শব্দে ভেতরের ফাঁকা (+১)
  assert.equal(words, 83669);
});

test("পাঠানো ডেটা: ৬২৩৬ আয়াতই আছে, আয়াত ক্রমানুসারে, প্রতিটার শেষ শব্দ আয়াত-চিহ্ন", () => {
  const seen = new Map();
  let prev = [0, 0];
  for (let p = 1; p <= M16_PAGES; p++) {
    for (const l of sanitizePage(readJson("mushaf16/" + pad3(p) + ".json"), p)) {
      if (l.t !== "a") continue;
      for (const g of l.segs) {
        const key = g.s + ":" + g.a;
        assert.ok(g.s > prev[0] || (g.s === prev[0] && g.a >= prev[1]), "ক্রম ভাঙা " + key);
        prev = [g.s, g.a];
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(...g.words);
      }
    }
  }
  assert.equal(seen.size, 6236);
  for (const [key, ws] of seen) {
    assert.ok(ws[ws.length - 1].startsWith("\u06dd"), "শেষ শব্দ আয়াত-চিহ্ন নয়: " + key);
    assert.ok(!/[\u202a-\u202e\u200b\ufeff]/.test(ws.join(" ")), "অদৃশ্য অক্ষর: " + key);
  }
});

test("পাঠানো ডেটা: প্রতিটা আয়াত ar-indopak-dk-এর সাথে হুবহু", () => {
  const seen = new Map();
  for (let p = 1; p <= M16_PAGES; p++) for (const l of sanitizePage(readJson("mushaf16/" + pad3(p) + ".json"), p)) if (l.t === "a") for (const g of l.segs) {
    const k = g.s + ":" + g.a; if (!seen.has(k)) seen.set(k, []); seen.get(k).push(...g.words);
  }
  for (const su of meta.surahs) {
    const ar = readJson("ar-indopak-dk/" + pad3(su.n) + ".json").a;
    for (let a = 1; a <= su.ayahs; a++) {
      assert.equal(seen.get(su.n + ":" + a).slice(0, -1).join(" "), ar[a - 1], su.n + ":" + a);
    }
  }
});

test("pageOfAyah: প্রতিটা আয়াতের পৃষ্ঠায় সেই আয়াতের শব্দ আছে", () => {
  const pageCache = new Map();
  const lines = (p) => { if (!pageCache.has(p)) pageCache.set(p, sanitizePage(readJson("mushaf16/" + pad3(p) + ".json"), p)); return pageCache.get(p); };
  for (const su of meta.surahs) for (let a = 1; a <= su.ayahs; a++) {
    const p = pageOfAyah(index.begin, su.n, a);
    const has = lines(p).some((l) => l.t === "a" && l.segs.some((g) => g.s === su.n && g.a === a));
    assert.ok(has, "আয়াত " + su.n + ":" + a + " পৃষ্ঠা " + p + "-এ নেই");
  }
});

test("পৃষ্ঠার সহায়ক: সূরা-তালিকা, প্রথম আয়াত, বিসমিল্লাহ-নিয়ম", () => {
  const p1 = sanitizePage(readJson("mushaf16/001.json"), 1);
  assert.deepEqual(surahsOnPage(p1), [1]);
  assert.deepEqual(firstAyahOnPage(p1), { s: 1, n: 1 });
  assert.equal(bismillahUnderBanner(p1, 0), false); // ফাতিহা
  const p2 = sanitizePage(readJson("mushaf16/002.json"), 2);
  assert.equal(p2[0].t, "s");
  assert.equal(p2[1].t, "b");
  assert.equal(bismillahUnderBanner(p2, 0), false); // আলাদা বিসমিল্লাহ-লাইন আছে
  assert.equal(bismillahUnderBanner([{ t: "s", s: 3 }, { t: "a", c: 0, segs: [] }], 0), true);
  assert.equal(bismillahUnderBanner([{ t: "s", s: 9 }, { t: "a", c: 0, segs: [] }], 0), false);
});

test("ফাতিহা: ১৬-লাইনের আয়াত-চিহ্নের নম্বর অ্যাপের আয়াত-নম্বরের সমান (বিসমিল্লাহ ১ … ১:৭ একটাই)", () => {
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const ends = new Map();
  const p1 = sanitizePage(readJson("mushaf16/001.json"), 1);
  for (const l of p1) if (l.t === "a") for (const g of l.segs) {
    const m = /^\u06dd([\u0660-\u0669]+)/u.exec(g.words[g.words.length - 1]);
    if (m) ends.set(g.a, [...m[1]].map((c) => AR.indexOf(c)).join(""));
    assert.ok(!g.words.some((w) => /^\u06dd/.test(w) && w !== g.words[g.words.length - 1]), "মাঝে অতিরিক্ত আয়াত-চিহ্ন: ১:" + g.a);
  }
  assert.deepEqual([...ends.entries()], [1, 2, 3, 4, 5, 6, 7].map((n) => [n, String(n)]));
});
