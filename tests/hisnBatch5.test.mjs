// tests/hisnBatch5.test.mjs — হিসনুল মুসলিম ব্যাচ ৫ (সামাজিক ও পারিবারিক): ডেটা অখণ্ডতা।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH5 as B } from "../src/legacy/hisnBatch5.js";
import { copyText } from "../src/legacy/hisnCore.js";

const skel = (t) => t.replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^\u0621-\u064A]/g, "");
const has = (text, frag) => skel(text).includes(skel(frag));
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);
const IDS = [47, 48, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 89, 90, 91, 93, 106, 108, 109, 110, 111, 112, 113, 114];

test("ব্যাচ ৫: ২৫ অধ্যায়, ২৭ দু'আ, id অনন্য, আরবি ও অর্থ আছে, আরবিতে আবরণ নেই", () => {
  assert.equal(B.length, 25);
  assert.equal(all.length, 27);
  assert.deepEqual(B.map((c) => c.id), IDS);
  assert.equal(new Set(all.map((d) => d.id)).size, 27);
  assert.equal(new Set(all.map((d) => d.hid)).size, 27);
  assert.equal(B.find((c) => c.id === 108).duas.length, 3);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.bn, d.id);
    assert.ok(Number.isInteger(d.times) && d.times >= 1, d.id);
    assert.ok(!/\(\(|\)\)|\u0640/.test(d.ar + (d.arPre || "") + (d.arNote || "")), d.id + ": আরবিতে আবরণ/টাটউইল রয়ে গেছে");
    assert.equal(typeof d.ref, "string", d.id);
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই (শিরোনাম, উচ্চারণ, অর্থ)", () => {
  for (const c of B) assert.ok(!/[A-Za-z]/.test(c.title), "অধ্যায় " + c.id);
  for (const d of all) for (const k of ["title", "tr", "bn"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("সূত্র দেওয়া থাকলে অর্থবহ; না থাকলে খালি (কার্ডে \"যাচাই হয়নি\")", () => {
  for (const d of all) assert.ok(d.ref === "" || d.ref.length > 5, d.id);
});

test("পড়ার সংখ্যা: বৈঠকের ইস্তিগফার ১০০ বার, বাকি সব ১", () => {
  assert.equal(byHid(195).times, 100);
  assert.ok(has(byHid(195).arPre, "مائة مرة"));
  for (const d of all) if (d.hid !== 195) assert.equal(d.times, 1, d.id);
});

test("নির্দেশ/বর্ণনা arPre-তে আলাদা; দু'আর মূল পাঠ ar-তে", () => {
  assert.ok(has(byHid(146).arPre, "الحسن") && has(byHid(146).ar, "أعيذكما"));
  assert.ok(skel(byHid(195).ar).startsWith(skel("رب اغفر لي")) && !has(byHid(195).ar, "ابن عمر"));
  assert.ok(has(byHid(191).arNote, "بعيرا") && !has(byHid(191).ar, "بعيرا"));
  assert.equal(byHid(145).ar.split("\n").length, 3);
  assert.equal(byHid(218).ar.split("\n").length, 3);
});

test("ঘটনা-নির্ভর/নির্দেশমূলক দু'আ: উচ্চারণ থাকলে আরবির সাথে মেলে (নমুনা)", () => {
  assert.ok(byHid(188).tr.includes("ইয়াহদীকুমুল্লা-হু") && has(byHid(188).ar, "يهديكم الله"));
  assert.ok(has(byHid(204).ar, "وفيك") && byHid(204).tr.includes("ওয়া ফীকা"));
  for (const n of [224, 225, 226, 228, 229]) assert.ok(!byHid(n).tr, "tr " + n);
});

test("copyText: আরবি, অর্থ ও সূত্র-লাইন ঠিক", () => {
  const t = copyText(byHid(196));
  assert.ok(t.includes(byHid(196).ar) && t.includes(byHid(196).bn));
});
