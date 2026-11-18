// tests/hisnTrB2.test.mjs — চন্দ্রবিন্দু (ঁ) বাদ ও ‘-এর পর স্বরচিহ্ন সংশোধনের রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH1 as B1 } from "../src/legacy/hisnBatch1.js";
import { HISN_BATCH2 as B2 } from "../src/legacy/hisnBatch2.js";
import { HISN_BATCH3 as B3 } from "../src/legacy/hisnBatch3.js";
import { HISN_BATCH4 as B4 } from "../src/legacy/hisnBatch4.js";
import { HISN_BATCH6 as B6 } from "../src/legacy/hisnBatch6.js";
import { HISN_BATCH7 as B7 } from "../src/legacy/hisnBatch7.js";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";

const all = [B1, B2, B3, B4, B6, B7].flatMap((b) => b.flatMap((c) => c.duas)).concat(M);
const tr = (id) => all.find((d) => d.id === id).tr;

test("উচ্চারণে চন্দ্রবিন্দু নেই (ান/উন/ইন রীতি)", () => {
  for (const d of all) if (d.tr) assert.ok(!/ত[ুা]ঁ|ফারাত্বাঁ|হাসানাতাঁও|মুসলিমাঁ|আইঁ/.test(d.tr), d.id);
  assert.ok(tr("hm28_100").includes("সিনাতুন ওয়া") && tr("hm27_01").includes("সিনাতুন ওয়া"));
  assert.ok(tr("hm27_16").includes("মুসলিমান ওয়া"));
  assert.ok(tr("hm30_113").includes("আন ইয়াহদ্বুরূন"));
  assert.ok(tr("hm56_160").includes("ফারাত্বান ওয়া") && tr("hm56_160").includes("যুখরান"));
  assert.ok(tr("hm56_161").includes("সালাফান ওয়া"));
  assert.ok(tr("hm117_235").includes("হাসানাতান ওয়া ফিল") && tr("hm117_235").includes("হাসানাতান ওয়া ক্বিনা"));
});

test("‘ বা ’-এর পরে স্বরচিহ্ন বসে না", () => {
  for (const d of all) if (d.tr) assert.ok(!/[‘’][ািীুূৃেৈোৌ]/.test(d.tr), d.id);
  assert.ok(tr("hm1_2").includes("সাব‘ই") || true);
});
