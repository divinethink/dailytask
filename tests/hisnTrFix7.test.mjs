// tests/hisnTrFix7.test.mjs — ধাপ ৬ (ব্যাচ ৭) উচ্চারণ কারেকশনের রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH7 as B } from "../src/legacy/hisnBatch7.js";

const all = B.flatMap((c) => c.duas);
const tr = (id) => all.find((d) => d.id === id).tr;

test("ব্যাচ ৭ উচ্চারণ: ض=দ্ব, তাশদিদ, ‘-এর পর স্বরচিহ্ন নেই, ওয়াকফ, ইকলাব", () => {
  assert.ok(tr("hm95_206").endsWith("ইল্লা আনত।"));
  assert.ok(tr("hm96_207").includes("মা তারদ্বা") && tr("hm96_207").includes("হাওওয়িন"));
  assert.ok(tr("hm97_208").includes("আদ্বলালনা") && tr("hm97_208").includes("সাব‘ই ওয়া মা আযলালনা"));
  assert.ok(!/[‘’][ািীুূৃেৈোৌ]/.test(tr("hm97_208")));
  assert.ok(tr("hm100_211").endsWith("ওয়াদা-য়ি‘উহ।"));
  assert.ok(tr("hm103_215").includes("সা-মি‘উম বিহামদি") && tr("hm103_215").includes("বালা-য়িহী"));
});
