import test from "node:test";
import assert from "node:assert/strict";
import { reviewNotices } from "../src/legacy/reviewNotices.js";

const ids = (d) => reviewNotices(d).map((n) => n.id);

test("সাপ্তাহিক নোটিফিকেশন: বৃহস্পতি রাত ৯টা থেকে শনিবার রাত ১১টার মধ্যে", () => {
  assert.deepEqual(ids(new Date(2026, 10, 19, 20, 59)), []);
  assert.equal(ids(new Date(2026, 10, 19, 21, 0)).length, 1);
  assert.equal(ids(new Date(2026, 10, 20, 12, 0)).length, 1);   // শুক্রবার
  assert.equal(ids(new Date(2026, 10, 21, 22, 59)).length, 1);  // শনিবার
  assert.deepEqual(ids(new Date(2026, 10, 21, 23, 0)), []);
  // একই সপ্তাহে id একই (বারবার নতুন হয় না)
  assert.equal(ids(new Date(2026, 10, 19, 21, 5))[0], ids(new Date(2026, 10, 21, 10, 0))[0]);
  assert.match(reviewNotices(new Date(2026, 10, 19, 21, 0))[0].message, /সাপ্তাহিক মুহাসাবা আনলক হয়েছে/);
});

test("মাসিক নোটিফিকেশন: মাসের শেষ দিন রাত ৮টা থেকে পরের মাসের ৩ তারিখ রাত ১১টা", () => {
  const monthly = (d) => ids(d).filter((x) => x.startsWith("local:monthly"));
  assert.deepEqual(monthly(new Date(2026, 10, 30, 19, 59)), []);
  assert.deepEqual(monthly(new Date(2026, 10, 30, 20, 0)), ["local:monthly:2026-11"]);
  assert.deepEqual(monthly(new Date(2026, 11, 2, 10, 0)), ["local:monthly:2026-11"]);
  assert.deepEqual(monthly(new Date(2026, 11, 3, 23, 0)), []);
  assert.deepEqual(monthly(new Date(2027, 0, 2, 9, 0)), ["local:monthly:2026-12"]); // বছর পেরোনো
});
