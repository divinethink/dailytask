// tests/hisnBatch8.test.mjs — হিসনুল মুসলিম ব্যাচ ৮ (অধ্যায় ১০৭, ১৩০-১৩২): ডেটা অখণ্ডতা ও buildChapters-এ সংযোগ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH8 as B } from "../src/legacy/hisnBatch8.js";
import { HISN_BATCH1 as B1 } from "../src/legacy/hisnBatch1.js";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";
import { buildChapters, copyText } from "../src/legacy/hisnCore.js";

// হরকত-নিরপেক্ষ তুলনা (লেখার হরকত-ক্রমের ভিন্নতা এড়াতে)
const skel = (t) => t.replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^ء-ي]/g, "");
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);

test("ব্যাচ ৮: ৪ অধ্যায়, ১৯ দু'আ, id অনন্য, প্রতিটিতে আরবি/অর্থ/সূত্র আছে", () => {
  assert.deepEqual(B.map((c) => c.id), [107, 130, 131, 132]);
  assert.deepEqual(B.map((c) => c.duas.length), [5, 12, 1, 1]);
  assert.equal(all.length, 19);
  assert.equal(new Set(all.map((d) => d.id)).size, 19);
  assert.deepEqual(all.map((d) => d.hid), [219, 220, 221, 222, 223, ...Array.from({ length: 12 }, (_, i) => 254 + i), 266, 267]);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.bn, d.id);
    assert.ok(d.ref && d.ref.length > 5, d.id + ": সূত্র নেই");
    assert.ok(Number.isInteger(d.times) && d.times >= 1, d.id);
    assert.ok(!/\(\(|\)\)/.test(d.ar + (d.arPre || "") + (d.arNote || "")), d.id + ": আরবিতে আবরণ রয়ে গেছে");
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই (শিরোনাম, উচ্চারণ, অর্থ, টীকা)", () => {
  for (const c of B) assert.ok(!/[A-Za-z]/.test(c.title), "অধ্যায় " + c.id);
  for (const d of all) for (const k of ["title", "tr", "bn", "note"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("পড়ার সংখ্যা: ১০০ (২৫৪, ২৫৮), ১০ (২৫৫, আরবি অনুযায়ী), বাকি ১", () => {
  assert.equal(byHid(254).times, 100);
  assert.equal(byHid(258).times, 100);
  assert.equal(byHid(255).times, 10);
  for (const d of all) if (![254, 255, 258].includes(d.hid)) assert.equal(d.times, 1, d.id);
  assert.ok(skel(byHid(255).ar).includes(skel("أربعة أنفس")) && byHid(255).bn.includes("দশবার"));
});

test("উচ্চারণ শুধু পড়ার মতো যিকর/দু'আয়; ফযীলত-বর্ণনা (২১৯-২২৩, ২৬৬, ২৬৭)-তে নেই", () => {
  for (const n of [219, 220, 221, 222, 223, 266, 267]) assert.ok(!byHid(n).tr, "tr " + n);
  for (const n of [254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265]) assert.ok(byHid(n).tr && byHid(n).tr.length > 8, "tr " + n);
});

test("আরবি আলাদা: arPre/ar/arNote — মূল পাঠে আবরণ নেই, বর্ণনা arPre-তে", () => {
  assert.ok(skel(byHid(219).arPre).includes(skel("قال النبي")) && skel(byHid(219).ar).startsWith(skel("من صلى")));
  assert.ok(skel(byHid(263).arPre).includes(skel("أسلم")) && skel(byHid(263).ar).startsWith(skel("اللهم اغفر")));
  assert.ok(skel(byHid(266).arNote).includes(skel("بيمينه")));
  assert.ok(skel(byHid(267).ar).startsWith(skel("إذا كان جنح الليل")));
});

test("সূত্রে মূল উৎসের নাম আছে (বুখারি/মুসলিম/তিরমিযী/আবু দাউদ/আহমাদ/নাসাঈ…)", () => {
  for (const d of all) assert.ok(/বুখারি|মুসলিম|তিরমিযী|আবু দাউদ|আহমাদ|নাসাঈ|ইবনু মাজাহ/.test(d.ref), d.id);
  assert.ok(byHid(259).ref.includes("৩৪৬৪"));
  assert.ok(byHid(223).ref.includes("২০৪১"));
});

test("buildChapters: ব্যাচ ৮ যুক্ত হয়, নম্বর অনুযায়ী সাজানো; আগের ডাকও অপরিবর্তিত", () => {
  const list = buildChapters(B1, M, [], [], [], [], [], [], B);
  assert.ok(list.length >= 24);
  const ids = list.map((c) => c.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  for (const c of B) assert.ok(ids.includes(c.id), "অধ্যায় " + c.id);
  assert.ok(ids.includes(27) && ids.includes(1));
  assert.equal(buildChapters(B1, M).length, 20);
  assert.ok(copyText(byHid(257)).includes("সূত্র: ") && copyText(byHid(257)).includes("(১ বার)") === false);
});
