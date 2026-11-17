// tests/hisnBatch7.test.mjs — হিসনুল মুসলিম ব্যাচ ৭ (সফর, হজ্জ-উমরা, কুরবানি): ডেটা অখণ্ডতা।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH7 as B } from "../src/legacy/hisnBatch7.js";
import { copyText } from "../src/legacy/hisnCore.js";

const skel = (t) => t.replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^\u0621-\u064A]/g, "");
const has = (text, frag) => skel(text).includes(skel(frag));
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);

test("ব্যাচ ৭: ১৮ অধ্যায়, ১৯ দু'আ, id অনন্য, আরবিতে আবরণ নেই", () => {
  assert.equal(B.length, 18);
  assert.equal(all.length, 19);
  assert.ok(!B.some((c) => c.id === 98) && !byHid(209), "অধ্যায় ৯৮ (সহীহ নয়) বাদ থাকবে");
  assert.equal(B.find((c) => c.id === 101).duas.length, 2);
  assert.equal(new Set(all.map((d) => d.id)).size, 19);
  assert.equal(new Set(all.map((d) => d.hid)).size, 19);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.bn, d.id);
    assert.ok(!/\(\(|\)\)|\u0640/.test(d.ar + (d.arPre || "") + (d.arNote || "")), d.id);
    assert.equal(typeof d.ref, "string", d.id);
    assert.ok(d.ref === "" || d.ref.length > 5, d.id);
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই", () => {
  for (const c of B) assert.ok(!/[A-Za-z]/.test(c.title), "অধ্যায় " + c.id);
  for (const d of all) for (const k of ["title", "tr", "bn", "note"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("কাঠামো: ফেরার বাড়তি অংশ arNote-এ; বর্ণনা arPre-তে; হজ্জের বর্ণনামূলক অংশে উচ্চারণ নেই", () => {
  assert.ok(has(byHid(207).arNote, "آيبون") && !has(byHid(207).ar, "آيبون"));
  assert.ok(has(byHid(214).arPre, "جابر") && has(byHid(214).ar, "كبرنا"));
  assert.ok(has(byHid(237).arPre, "قال النبي") && has(byHid(237).ar, "لا اله الا الله"));
  for (const n of [214, 234, 236, 238, 239]) assert.ok(!byHid(n).tr, "tr " + n);
});

test("উচ্চারণের নমুনা আরবির সাথে মেলে", () => {
  assert.ok(byHid(233).tr.includes("লাব্বাইকা") && has(byHid(233).ar, "لبيك"));
  assert.ok(byHid(246).tr.includes("তাক্বাব্বাল") && has(byHid(246).ar, "تقبل"));
  assert.ok(has(byHid(206).ar, "سبحان الذي سخر لنا") && has(byHid(207).ar, "سبحان الذي سخر لنا"));
});

test("copyText: আরবি ও অর্থ আছে", () => {
  const t = copyText(byHid(208));
  assert.ok(t.includes(byHid(208).ar) && t.includes(byHid(208).bn) && t.includes(byHid(208).ref));
});
