// tests/hisnBatch1.test.mjs — হিসনুল মুসলিম ব্যাচ ১ (অধ্যায় ১-১৫, ২৮-৩১): ডেটা অখণ্ডতা; কুরআনের অংশ অ্যাপের কুরআন-ডেটার সাথে মিলিয়ে।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISN_BATCH1 as B } from "../src/legacy/hisnBatch1.js";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";
import { buildChapters, copyText } from "../src/legacy/hisnCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quran = (n) => JSON.parse(fs.readFileSync(path.join(root, "public/quran/v1/ar", String(n).padStart(3, "0") + ".json"), "utf8")).a;
const skel = (t) => t.replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^ء-ي]/g, "");
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);

test("ব্যাচ ১: ১৯ অধ্যায়, ৪৩ দু'আ, id অনন্য, প্রতিটিতে আরবি/অর্থ/সূত্র আছে", () => {
  assert.equal(B.length, 19);
  assert.equal(all.length, 43);
  assert.deepEqual(B.map((c) => c.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 28, 29, 30, 31]);
  assert.equal(new Set(all.map((d) => d.id)).size, 43);
  assert.equal(new Set(all.map((d) => d.hid)).size, 43);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.bn, d.id);
    assert.ok(d.ref && d.ref.length > 5, d.id + ": সূত্র নেই");
    assert.ok(Number.isInteger(d.times) && d.times >= 1, d.id);
    assert.ok(!/\(\(|\)\)/.test(d.ar + (d.arPre || "") + (d.arNote || "")), d.id + ": আরবিতে আবরণ রয়ে গেছে");
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই (শিরোনাম, উচ্চারণ, অর্থ)", () => {
  for (const d of all) for (const k of ["title", "tr", "bn"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("কুরআনের অংশ অ্যাপের কুরআন-ডেটার সাথে শব্দে-শব্দে মেলে (২:২৫৫, ২:২৮৫-২৮৬, ৩:১৯০-২০০, ইখলাস-ফালাক-নাস)", () => {
  assert.equal(skel(byHid(100).ar), skel(quran(2)[254]));
  assert.equal(skel(byHid(101).ar), skel(quran(2).slice(284, 286).join("")));
  assert.equal(skel(byHid(4).ar), skel(quran(3).slice(189, 200).join("")));
  const s = skel(byHid(99).ar);
  const idx = [112, 113, 114].map((n) => s.indexOf(skel(quran(n).join(""))));
  assert.ok(idx.every((i) => i >= 0) && idx[0] < idx[1] && idx[1] < idx[2], "তিন সূরা ক্রমে পাওয়া যায়নি");
});

test("পড়ার সংখ্যা: তিনবার করার দু'আগুলো, এবং বিশেষ ক্ষেত্রে ১", () => {
  assert.equal(byHid(99).times, 3);
  assert.equal(byHid(114).times, 3);
  assert.equal(byHid(106).times, 1); // ৩৩+৩৩+৩৪ — note/অর্থে আছে
  assert.ok(byHid(106).bn.includes("৩৩") && byHid(106).bn.includes("৩৪"));
});

test("আযান-অধ্যায়ের নির্দেশ-ভিত্তিক দু'আ (২২, ২৪, ২৬) ও স্বপ্ন (১১৪, ১১৫)-এ উচ্চারণ নেই, কিন্তু অর্থ আছে", () => {
  for (const n of [22, 24, 26, 110, 114, 115]) { assert.ok(!byHid(n).tr, "tr " + n); assert.ok(byHid(n).bn.length > 10); }
});

test("ডান-পা/বাম-পা নির্দেশ arPre-তে আলাদা; দু'আর মূল পাঠে নয়", () => {
  assert.ok(byHid(20).arPre.includes("الْيُمْنَى") && !byHid(20).ar.includes("الْيُمْنَى"));
  assert.ok(byHid(21).arPre.includes("الْيُسْرَى") && !byHid(21).ar.includes("الْيُسْرَى"));
});

test("buildChapters: ব্যাচ ১ + অধ্যায় ২৭, নম্বর অনুযায়ী সাজানো; copyText-এ সূত্র আছে", () => {
  const list = buildChapters(B, M);
  assert.equal(list.length, 20);
  assert.deepEqual(list.map((c) => c.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 27, 28, 29, 30, 31]);
  assert.equal(list.find((c) => c.id === 27).duas.length, 24);
  assert.ok(copyText(byHid(102)).includes("সূত্র: ") && copyText(byHid(102)).includes(byHid(102).ar));
});

test("সকাল-সন্ধ্যার ১১ নম্বর দু'আ: উচ্চারণ আরবির 'শারাকিহী'-র সাথে মেলে (শিরকিহী নয়)", () => {
  const d = M.find((x) => x.hid === 85);
  assert.ok(d.ar.includes("وَشَرَكِهِ") && d.tr.includes("শারাকিহী") && !d.tr.includes("শিরকিহী"));
});
