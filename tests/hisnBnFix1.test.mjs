// tests/hisnBnFix1.test.mjs — অনুবাদ যাচাই ধাপ ১ (সকাল-সন্ধ্যা, অধ্যায় ২৭) রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";

const bn = (id) => M.find((d) => d.id === id).bn;

test("অধ্যায় ২৭ অনুবাদ: আরবিতে থাকা আশ্রয়-প্রার্থনা ও বিসমিল্লাহর অর্থ আছে", () => {
  assert.ok(bn("hm27_01").startsWith("আমি বিতাড়িত শয়তান থেকে আল্লাহর আশ্রয় চাই।"));
  assert.ok(bn("hm27_02").startsWith("প্রতিটি সূরার আগে: পরম করুণাময়, অতি দয়ালু আল্লাহর নামে।"));
});

test("অধ্যায় ২৭ অনুবাদ: ইখলাসের কালিমা ও ‘আদাদা খালক্বিহী’-র ভাষা", () => {
  assert.ok(bn("hm27_16").includes("ইখলাসের কালিমার ওপর") && !bn("hm27_16").includes("একনিষ্ঠ ইখলাসের"));
  assert.ok(bn("hm27_20").includes("সৃষ্টির সংখ্যার সমান") && !bn("hm27_20").includes("সংখ্যা পরিমাণ"));
});
