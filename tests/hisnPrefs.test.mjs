// tests/hisnPrefs.test.mjs — হিসন পাঠের পছন্দ: যাচাই, আকার বদল, অন-অফ।
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHisnView, stepArSize, toggleView } from "../src/legacy/hisnPrefs.js";
import { AR_SIZE } from "../src/legacy/quranCore.js";

test("খালি/অবৈধ ইনপুটে ডিফল্ট; আকার কুরআন-রিডারের মান থেকে শুরু", () => {
  assert.deepEqual(sanitizeHisnView(null), { arSize: AR_SIZE.def, showAr: true, showTr: true, showBn: true });
  assert.equal(sanitizeHisnView(undefined, 34).arSize, 34);
  assert.equal(sanitizeHisnView("x", 34).arSize, 34);
  assert.equal(sanitizeHisnView({ arSize: "abc" }, 30).arSize, 30);
});

test("আকার সীমায় আটকায়; সেভ-করা মান ডিফল্টের চেয়ে অগ্রাধিকার পায়", () => {
  assert.equal(sanitizeHisnView({ arSize: 999 }).arSize, AR_SIZE.max);
  assert.equal(sanitizeHisnView({ arSize: 1 }).arSize, AR_SIZE.min);
  assert.equal(sanitizeHisnView({ arSize: 40 }, 28).arSize, 40);
});

test("তিনটাই বন্ধ হলে আরবি চালু হয়; ভুল টাইপ উপেক্ষিত", () => {
  const v = sanitizeHisnView({ showAr: false, showTr: false, showBn: false });
  assert.equal(v.showAr, true);
  assert.equal(sanitizeHisnView({ showTr: "no" }).showTr, true);
});

test("stepArSize: ধাপে বাড়ে/কমে, সীমা পেরোয় না", () => {
  const v = sanitizeHisnView({ arSize: 28 });
  assert.equal(stepArSize(v, 1).arSize, 28 + AR_SIZE.step);
  assert.equal(stepArSize(v, -1).arSize, 28 - AR_SIZE.step);
  assert.equal(stepArSize({ ...v, arSize: AR_SIZE.max }, 1).arSize, AR_SIZE.max);
  assert.equal(stepArSize({ ...v, arSize: AR_SIZE.min }, -1).arSize, AR_SIZE.min);
});

test("toggleView: শেষ চালু অংশ বন্ধ হয় না, অচেনা key অপরিবর্তিত", () => {
  let v = sanitizeHisnView(null);
  v = toggleView(v, "showTr");
  assert.equal(v.showTr, false);
  v = toggleView(v, "showBn");
  assert.equal(v.showBn, false);
  const same = toggleView(v, "showAr");
  assert.equal(same.showAr, true); // শেষটা বন্ধ করা যায়নি
  assert.equal(toggleView(v, "bogus"), v);
});
