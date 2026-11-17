// tests/hisnBatch6.test.mjs — হিসনুল মুসলিম ব্যাচ ৬ (অসুস্থতা, মৃত্যু, আবহাওয়া): ডেটা অখণ্ডতা ও সূত্র।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH6 as B } from "../src/legacy/hisnBatch6.js";
import { copyText } from "../src/legacy/hisnCore.js";

const skel = (t) => t.replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^ء-ي]/g, "");
const has = (text, frag) => skel(text).includes(skel(frag));
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);

test("ব্যাচ ৬: ১৭ অধ্যায়, ২৭ দু'আ, id অনন্য, আরবিতে আবরণ নেই", () => {
  assert.equal(B.length, 17);
  assert.equal(all.length, 27);
  assert.equal(new Set(all.map((d) => d.id)).size, 27);
  assert.equal(new Set(all.map((d) => d.hid)).size, 27);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.bn, d.id);
    assert.ok(!/\(\(|\)\)|ـ/.test(d.ar + (d.arPre || "") + (d.arNote || "")), d.id);
    assert.equal(typeof d.ref, "string", d.id);
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই", () => {
  for (const c of B) assert.ok(!/[A-Za-z]/.test(c.title), "অধ্যায় " + c.id);
  for (const d of all) for (const k of ["title", "tr", "bn", "note"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("সংখ্যা ও কাঠামো: ১৪৮ নম্বর ৭ বার; ১৪৯/১৫৩ হাদিস-বর্ণনা (উচ্চারণ নেই); ১৫১-এ নির্দেশ arPre-তে", () => {
  assert.equal(byHid(148).times, 7);
  assert.ok(has(byHid(148).arNote, "سبع مرات") && !has(byHid(148).ar, "سبع"));
  assert.ok(!byHid(149).tr && !byHid(153).tr);
  assert.ok(has(byHid(149).arPre, "قال النبي") && has(byHid(149).ar, "خرافة الجنة"));
  assert.ok(has(byHid(151).arPre, "ويقول") && has(byHid(151).ar, "للموت سكرات") && !has(byHid(151).ar, "جعل النبي"));
  assert.ok(has(byHid(160).ar, "ابراهيم") && has(byHid(160).ar, "فحسن"));
});

test("উচ্চারণের নমুনা আরবির সাথে মেলে", () => {
  assert.ok(byHid(163).tr.includes("সুন্নাতি") && has(byHid(163).ar, "سنة رسول الله"));
  assert.ok(byHid(168).tr.includes("রা‘দু") && has(byHid(168).ar, "الرعد"));
  assert.ok(byHid(173).tr.includes("মুতিরনা") && has(byHid(173).ar, "مطرنا"));
});

test("copyText ঠিক", () => {
  const t = copyText(byHid(150));
  assert.ok(t.includes(byHid(150).ar) && t.includes(byHid(150).bn));
});

test("প্রতিটি দু'আর সূত্র আছে; সাহাবী/তাবেয়ীর আমল স্পষ্ট চিহ্নিত", () => {
  for (const d of all) assert.ok(d.ref.length > 5, d.id);
  for (const n of [160, 161, 168]) assert.match(byHid(n).ref, /আমল/);
  assert.match(byHid(150).ref, /৪৪৩৫/);
  assert.match(byHid(165).ref, /৯৭৫/);
});
