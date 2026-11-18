// tests/hisnTrFix4.test.mjs — ধাপ ৪ (ব্যাচ ৪): ط=ত্ব কারেকশনের রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH4 as B } from "../src/legacy/hisnBatch4.js";

const all = B.flatMap((c) => c.duas);
const tr = (id) => all.find((d) => d.id === id).tr;

test("ব্যাচ ৪ উচ্চারণ: ط=ত্ব", () => {
  assert.ok(tr("hm69_179").includes("আত্ব‘ইমনা"));
  assert.ok(tr("hm70_180").includes("আত্ব‘আমানী") && tr("hm70_181").includes("ত্বাইয়্যিবান"));
  assert.ok(tr("hm72_183").includes("আত্ব‘ইম মান আত্ব‘আমানী"));
  assert.ok(tr("hm73_184").includes("আফত্বারা") && tr("hm73_184").includes("ত্বা‘আ-মাকুমুল"));
  for (const d of all) assert.ok(!/আত‘|আফতারা|তাইয়্যিব/.test(d.tr || ""), d.id);
});
