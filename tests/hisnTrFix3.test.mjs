// tests/hisnTrFix3.test.mjs — ধাপ ৩ (ব্যাচ ৩) উচ্চারণ কারেকশনের রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH3 as B } from "../src/legacy/hisnBatch3.js";

const all = B.flatMap((c) => c.duas);
const tr = (id) => all.find((d) => d.id === id).tr;

test("ব্যাচ ৩ উচ্চারণ: ض=দ্ব, ق=ক্ব, ط=ত্ব", () => {
  const t = tr("hm34_120");
  for (const w of ["মা-দ্বিন", "ক্বাদ্বা-উক", "খালক্বিক", "ক্বুরআ-না", "গাইবি"]) assert.ok(t.includes(w), w);
  assert.ok(tr("hm35_123").includes("ত্বারফাতা") && tr("hm36_127").includes("‘আদ্বুদী"));
  assert.ok(tr("hm37_129").includes("ইয়াফরুত্বা") && tr("hm37_129").includes("ইয়াত্বগা"));
  assert.ok(tr("hm40_135").includes("বা-ত্বিনু") && tr("hm124_243").includes("ক্বুদরাতিহী"));
  assert.ok(tr("hm94_205").includes("ত্বাইরা ইল্লা ত্বাইরুক"));
  assert.ok(tr("hm128_247").includes("ইয়াত্বরুক্বু"));
});

test("ব্যাচ ৩ উচ্চারণ: ওয়াকফে সাকিন (আনত, শি’ত, রুসুলিহ)", () => {
  assert.ok(tr("hm35_123").endsWith("ইল্লা আনত।") && tr("hm37_129").endsWith("ইল্লা আনত।"));
  assert.ok(tr("hm39_132").endsWith("বিমা শি’ত।") && tr("hm40_134").endsWith("রুসুলিহ।"));
});
