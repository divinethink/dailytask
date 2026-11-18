// tests/hisnBnFix2.test.mjs — অনুবাদ যাচাই ধাপ ২ (ব্যাচ ১) রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH1 as B } from "../src/legacy/hisnBatch1.js";

const bn = (id) => B.flatMap((c) => c.duas).find((d) => d.id === id).bn;

test("ব্যাচ ১ অনুবাদ: أماتنا = মৃত্যু দেওয়া", () => {
  assert.ok(bn("hm1_1").includes("আমাদের মৃত্যু দেওয়ার পর জীবিত করেছেন"));
});
