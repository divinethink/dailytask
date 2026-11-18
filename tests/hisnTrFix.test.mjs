// tests/hisnTrFix.test.mjs — F_S1 উচ্চারণ কারেকশনের রক্ষাকবচ (অধ্যায় ২৭ ও ব্যাচ ১)।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH1 as B1 } from "../src/legacy/hisnBatch1.js";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";

const all = [...B1.flatMap((c) => c.duas), ...M];
const tr = (id) => all.find((d) => d.id === id).tr;

test("F_S1: ভুল উচ্চারণ ঠিক হয়েছে", () => {
  assert.ok(tr("hm27_01").includes("কুরসিইয়্যুহুস") && tr("hm28_100").includes("কুরসিইয়্যুহুস"));
  for (const id of ["hm27_02", "hm28_99"]) {
    assert.ok(tr(id).includes("ইউওয়াসওয়িসু") && tr(id).includes("ইয়ূলাদ") && !tr(id).includes("ইউওয়াসবিসু"), id);
    assert.equal((tr(id).match(/ক্বুল /g) || []).length, 3, id);
    assert.ok(tr(id).includes("ফালাক্ব") && tr(id).includes("খালাক্ব"), id);
  }
  assert.ok(tr("hm28_108").includes("মু’ওয়িয়া"));
  assert.ok(tr("hm27_06").includes("মালা-ইকাতিকা"));
  assert.ok(tr("hm27_05").includes("ফাইন্নাহূ"));
  assert.ok(tr("hm4_8").includes("‘ইশ") && !tr("hm4_8").includes("‘ঈশ"));
  assert.ok(tr("hm27_20").includes("রিদ্বা নাফসিহী") && !tr("hm27_20").includes("রিদা-য়া"));
});

test("F_S1: ছক অনুযায়ী ض=দ্ব, ق=ক্ব, ط=ত্ব, ث=স", () => {
  assert.ok(tr("hm27_12").includes("ইয়াদ্বুররু"));
  assert.ok(tr("hm27_13").includes("রাদ্বীতু") && tr("hm15_23").includes("রাদ্বীতু"));
  assert.ok(tr("hm10_17").includes("আদ্বিল্লা") && tr("hm10_17").includes("উদ্বাল্লা"));
  assert.ok(tr("hm28_102").includes("ওয়াদ্বা‘তু") && tr("hm28_107").includes("ইক্বদ্বি") && tr("hm28_111").includes("ফাওওয়াদ্বতু"));
  assert.ok(tr("hm30_113").includes("গাদ্বাবিহী") && tr("hm30_113").includes("ইয়াহদ্বুরূন"));
  assert.ok(tr("hm28_101").includes("নুফাররিক্বু"));
  assert.ok(tr("hm12_19").includes("আ‘ত্বিনী") && tr("hm1_4").includes("রা-বিত্বূ"));
  assert.ok(tr("hm2_5").includes("আস সাওবা") && !tr("hm2_5").includes("ছ"));
});
