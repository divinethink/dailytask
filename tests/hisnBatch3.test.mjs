// tests/hisnBatch3.test.mjs — হিসনুল মুসলিম ব্যাচ ৩ (২৪ অধ্যায়, ৪২ দু'আ): ডেটা অখণ্ডতা; কুরআনের অংশ অ্যাপের কুরআন-ডেটার সাথে মিলিয়ে।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISN_BATCH3 as B } from "../src/legacy/hisnBatch3.js";
import { copyText, buildChapters as buildChaptersAll } from "../src/legacy/hisnCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quran = (n) => JSON.parse(fs.readFileSync(path.join(root, "public/quran/v1/ar", String(n).padStart(3, "0") + ".json"), "utf8")).a;
const skel = (t) => t.replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^ء-ي]/g, "");
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);
const UNVERIFIED = "সূত্র যাচাই হয়নি";

test("ব্যাচ ৩: ২৪ অধ্যায়, ৪২ দু'আ, id অনন্য, প্রতিটিতে আরবি/অর্থ/সূত্র-ঘর আছে", () => {
  assert.equal(B.length, 24);
  assert.equal(all.length, 42);
  assert.deepEqual(B.map((c) => c.id), [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 53, 88, 92, 94, 122, 123, 124, 125, 126, 128, 129]);
  assert.equal(new Set(all.map((d) => d.id)).size, 42);
  assert.equal(new Set(all.map((d) => d.hid)).size, 42);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.bn, d.id);
    assert.ok(d.ref && d.ref.length > 5, d.id + ": সূত্র-ঘর খালি");
    assert.ok(Number.isInteger(d.times) && d.times >= 1, d.id);
    assert.ok(!/\(\(|\)\)/.test(d.ar + (d.arPre || "") + (d.arNote || "")), d.id + ": আরবিতে আবরণ রয়ে গেছে");
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই (শিরোনাম, উচ্চারণ, অর্থ, নোট)", () => {
  for (const c of B) assert.ok(!/[A-Za-z]/.test(c.title), "অধ্যায় " + c.id);
  for (const d of all) for (const k of ["title", "tr", "bn", "note"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("সূত্র: যাচাই-না-হওয়া দু'আ নেই; বাকিতে আসল সূত্র-নম্বর আছে", () => {
  const un = all.filter((d) => d.ref === UNVERIFIED).map((d) => d.hid);
  assert.deepEqual(un, []); // ২৪৭-এ এখন আহমাদ ৩/৪১৯ ও ইবনুস সুন্নী ৬৩৭ বসেছে
  for (const d of all.filter((x) => x.ref !== UNVERIFIED)) assert.ok(/[০-৯]/.test(d.ref), d.id + ": সূত্রে সংখ্যা নেই");
});

test("সূরা হাদীদ ৫৭:৩ অ্যাপের কুরআন-ডেটার সাথে শব্দে-শব্দে মেলে", () => {
  assert.equal(skel(byHid(135).ar), skel(quran(57)[2]));
});

test("পড়ার সংখ্যা: ১৩০ তিনবার, ২৪৩ সাতবার, বাকি ১", () => {
  assert.equal(byHid(130).times, 3);
  assert.equal(byHid(243).times, 7);
  assert.deepEqual(all.filter((d) => d.times !== 1).map((d) => d.hid), [130, 243]);
});

test("নির্দেশ-ভিত্তিক বা হাদিস-বর্ণনার এন্ট্রিতে উচ্চারণ নেই, কিন্তু অর্থ আছে", () => {
  for (const n of [133, 140, 141, 142, 143, 199, 242, 244, 248, 249, 251, 252, 253]) { assert.ok(!byHid(n).tr, "tr " + n); assert.ok(byHid(n).bn.length > 10); }
});

test("১২১ ও ১৩৭ একই দু'আ: আরবি অভিন্ন; ১৩০ তে নাম-স্থান নোট, নির্দেশ আলাদা", () => {
  assert.equal(skel(byHid(121).ar), skel(byHid(137).ar));
  assert.ok(byHid(129).note.includes("নাম") && byHid(130).note.includes("নাম"));
  assert.ok(byHid(243).arPre.includes("بِسْمِ") && !byHid(243).ar.includes("بِسْمِ"));
  assert.ok(byHid(250).arNote.length > 5 && !byHid(250).ar.includes("غَفَرَ"));
});

test("copyText: সূত্র ও আরবি আছে", () => {
  const t = copyText(byHid(154));
  assert.ok(t.includes("সূত্র: ") && t.includes(byHid(154).ar));
});

test("buildChapters: ব্যাচ ১ + ২ + ৩ + অধ্যায় ২৭ — নম্বর অনুযায়ী সাজানো, id অনন্য, ব্যাচ ৩ বাদ দিলেও আগের আচরণ অক্ষত", async () => {
  const { HISN_BATCH1: B1 } = await import("../src/legacy/hisnBatch1.js");
  const { HISN_BATCH2: B2 } = await import("../src/legacy/hisnBatch2.js");
  const { HISN_MORNING_EVENING: M } = await import("../src/legacy/hisnData.js");
  const list = buildChaptersAll(B1, M, B2, B);
  const ids = list.map((c) => c.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(list.flatMap((c) => c.duas.map((d) => d.id))).size, list.flatMap((c) => c.duas).length);
  assert.equal(list.length, buildChaptersAll(B1, M, B2).length + 24);
});
