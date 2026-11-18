// tests/hisnTrFix8.test.mjs — ধাপ ৬ (ব্যাচ ৮) উচ্চারণ কারেকশনের রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH8 as B } from "../src/legacy/hisnBatch8.js";

const all = B.flatMap((c) => c.duas);
const tr = (id) => all.find((d) => d.id === id).tr;

test("ব্যাচ ৮ উচ্চারণ: ক্ব, ث=স, ওয়াকফ, আরবির কাসরা", () => {
  for (const id of ["hm130_7", "hm130_9", "hm130_12"]) assert.ok(tr(id).includes("ক্বুওওয়াতা"), id);
  assert.ok(tr("hm130_1").endsWith("বিহামদিহ।") && tr("hm130_6").endsWith("বিহামদিহ।"));
  assert.ok(tr("hm130_9").includes("কাসীরা") && tr("hm130_9").includes("লাহ। আল্লা-হু"));
  assert.ok(tr("hm130_10").startsWith("আল্লা-হুম্মাগফিরি লী"));
});
