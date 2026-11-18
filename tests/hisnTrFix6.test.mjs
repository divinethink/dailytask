// tests/hisnTrFix6.test.mjs — ধাপ ৬ (ব্যাচ ৬) উচ্চারণ কারেকশনের রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH6 as B } from "../src/legacy/hisnBatch6.js";

const all = B.flatMap((c) => c.duas);
const tr = (id) => all.find((d) => d.id === id).tr;

test("ব্যাচ ৬ উচ্চারণ: ক্ব দ্বিত্ব, ض=দ্ব, ط=ত্ব, ‘ ও সুকুন", () => {
  assert.ok(tr("hm51_150").includes("আলহিক্বনী"));
  assert.ok(tr("hm54_155").includes("নাওওয়ির"));
  assert.ok(tr("hm55_156").includes("নাক্বক্বিহী") && tr("hm55_156").includes("নাক্বক্বাইতা") && tr("hm55_156").includes("আবইয়াদ্বা"));
  assert.ok(tr("hm55_157").includes("তুদ্বিল্লানা"));
  assert.ok(tr("hm55_158").includes("হাক্বক্ব।"));
  assert.ok(tr("hm55_159").includes("ফাতাজাওয়ায ‘আনহু"));
  assert.ok(tr("hm56_160").includes("শাফী‘আম") && tr("hm56_160").includes("সাক্বক্বিল") && tr("hm56_160").includes("আফরা-ত্বিনা"));
  assert.ok(tr("hm65_173").startsWith("মুত্বিরনা বিফাদ্বলিল্লা-হি"));
  assert.ok(tr("hm66_174").includes("বুত্বূনিল"));
});
