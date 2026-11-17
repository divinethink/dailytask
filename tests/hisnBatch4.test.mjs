// tests/hisnBatch4.test.mjs — হিসনুল মুসলিম ব্যাচ ৪ (অধ্যায় ৬৭-৭৬): ডেটা অখণ্ডতা ও তালিকায় যুক্ত হওয়া।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH4 as B } from "../src/legacy/hisnBatch4.js";
import { HISN_BATCH1 as B1 } from "../src/legacy/hisnBatch1.js";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";
import { buildChapters, copyText } from "../src/legacy/hisnCore.js";

const skel = (t) => t.replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[^ء-ي ]/g, "");
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);

test("ব্যাচ ৪: ১০ অধ্যায়, ১৩ দু'আ, id অনন্য, প্রতিটিতে আরবি/অর্থ/সূত্র আছে", () => {
  assert.equal(B.length, 10);
  assert.equal(all.length, 13);
  assert.deepEqual(B.map((c) => c.id), [67, 68, 69, 70, 71, 72, 73, 74, 75, 76]);
  assert.deepEqual(B.map((c) => c.duas.length), [1, 2, 2, 2, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(all.map((d) => d.hid), [175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187]);
  assert.equal(new Set(all.map((d) => d.id)).size, 13);
  for (const c of B) assert.ok(c.title, "অধ্যায়ের নাম " + c.id);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.bn, d.id);
    assert.ok(d.ref && d.ref.length > 5, d.id + ": সূত্র নেই");
    assert.ok(Number.isInteger(d.times) && d.times >= 1, d.id);
    assert.ok(!/[()[\]]/.test(d.ar + (d.arNote || "")), d.id + ": আরবিতে আবরণ রয়ে গেছে");
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই (শিরোনাম, উচ্চারণ, অর্থ, নোট, অধ্যায়ের নাম)", () => {
  for (const c of B) assert.ok(!/[A-Za-z]/.test(c.title), "অধ্যায় " + c.id);
  for (const d of all) for (const k of ["title", "tr", "bn", "note"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("নির্দেশ-ভিত্তিক হাদিস (১৮৫)-এ উচ্চারণ নেই; বাকি সবকটিতে আছে", () => {
  assert.ok(!byHid(185).tr);
  for (const d of all) if (d.hid !== 185) assert.ok(d.tr && d.tr.length > 10, "tr " + d.hid);
});

test("১৮৫: হাদিসের মূল পাঠ ও আরবি টীকা আলাদা, সূত্রে ‘মুসলিম’ আছে", () => {
  const d = byHid(185);
  assert.ok(skel(d.ar).endsWith("فليطعم") && !skel(d.ar).includes("ومعنى"));
  assert.ok(skel(d.arNote).includes("فليدع"));
  assert.ok(d.ref.includes("মুসলিম"));
});

test("১৮১: বন্ধনীর আবরণ সরলেও শব্দগুলো থাকে; ১৮৬ দুইবার বলার পাঠ", () => {
  assert.ok(skel(byHid(181).ar).includes("غير مكفي ولا مودع ولا مستغنى عنه ربنا"));
  assert.equal(skel(byHid(186).ar), "إني صائم إني صائم");
});

test("সূত্রে সংখ্যা: যাচাই-করা ক'টি মূল তথ্য", () => {
  assert.ok(byHid(183).ref.includes("৩/১৬২৬") && byHid(183).ref.includes("২০৫৫"));
  assert.ok(byHid(182).ref.includes("৩/১৬১৫") && byHid(182).ref.includes("২০৪২"));
  assert.ok(byHid(186).ref.includes("১৮৯৪") && byHid(186).ref.includes("১১৫১"));
  assert.ok(byHid(184).ref.includes("৩/৩৬৭") && byHid(184).ref.includes("১/৫৫৬"));
});

test("buildChapters: ব্যাচ ১ + ব্যাচ ৪ + অধ্যায় ২৭, নম্বর অনুযায়ী সাজানো; ব্যাচ ৪ ছাড়াও আগের মতো চলে", () => {
  assert.equal(buildChapters(B1, M).length, 20);
  const list = buildChapters(B1, M, [], [], B);
  assert.equal(list.length, 30);
  const ids = list.map((c) => c.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  assert.equal(new Set(ids).size, 30);
  assert.equal(list.at(-1).id, 76);
  assert.ok(copyText(byHid(176)).includes("সূত্র: ") && copyText(byHid(176)).includes(byHid(176).ar));
});
