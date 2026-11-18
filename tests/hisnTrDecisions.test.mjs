// tests/hisnTrDecisions.test.mjs — Owner-সিদ্ধান্ত অনুযায়ী উচ্চারণ: ظ=য, ওয়াকফে সাকিন, ar-এর সাথে মেলানো শা’নিয়া/ওয়ুস‘আহা।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH1 as B1 } from "../src/legacy/hisnBatch1.js";
import { HISN_BATCH2 as B2 } from "../src/legacy/hisnBatch2.js";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";

const all = [...B1.flatMap((c) => c.duas), ...B2.flatMap((c) => c.duas), ...M];
const tr = (id) => all.find((d) => d.id === id).tr;

test("ظ = য: ‘আজীম/‘আজামা আর নেই", () => {
  for (const d of all) assert.ok(!/‘আজীম|‘আজামা/.test(d.tr), d.id);
  for (const id of ["hm27_01", "hm27_09", "hm1_2", "hm13_20", "hm28_100", "hm28_107", "hm25_71"]) assert.ok(tr(id).includes("‘আযীম"), id);
  assert.ok(tr("hm27_10").includes("বি‘আযামাতিকা"));
});

test("ওয়াকফ: বাক্যের শেষে হ্রস্ব হরকত নেই (১৭ স্থান)", () => {
  const end = (id) => ({ endsWith: (x) => tr(id).includes(x) });
  assert.ok(end("hm27_03").endsWith("মা বা‘দাহ।") && end("hm27_15").endsWith("মা বা‘দাহ।"));
  assert.ok(end("hm27_05").endsWith("ইল্লা আনত।") && end("hm27_06").endsWith("রাসূলুক।"));
  assert.equal((tr("hm27_08").match(/ইল্লা আনত।/g) || []).length, 2);
  assert.ok(end("hm27_17").endsWith("বিহামদিহ।") && end("hm27_20").endsWith("কালিমা-তিহ।") && end("hm27_22").endsWith("ইলাইহ।"));
  assert.ok(end("hm1_3").endsWith("বিযিকরিহ।") && end("hm3_6").endsWith("লাহ।") && end("hm7_11").endsWith("গুফরা-নাক।"));
  assert.ok(end("hm9_15").endsWith("ইলাইক।") && end("hm10_17").endsWith("‘আলাইয়্য।") && end("hm11_18").endsWith("আহলিহ।"));
  assert.ok(tr("hm28_107").includes("বিনা-সিয়াতিহ।") && end("hm28_111").endsWith("আরসালত।"));
});

test("ar-এর সাথে মেলানো: শা’নিয়া কুল্লাহূ, ইল্লা ওয়ুস‘আহা", () => {
  assert.ok(tr("hm27_14").includes("শা’নিয়া কুল্লাহূ"));
  assert.ok(tr("hm28_101").includes("ইল্লা ওয়ুস‘আহা"));
});
