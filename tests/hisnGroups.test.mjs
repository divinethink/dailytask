// tests/hisnGroups.test.mjs — অধ্যায়-গ্রুপ: প্রতিটা অধ্যায় ঠিক একটা গ্রুপে, কিছু হারায় না।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_GROUPS, groupChapters } from "../src/legacy/hisnGroups.js";
import { buildChapters } from "../src/legacy/hisnCore.js";
import { HISN_MORNING_EVENING } from "../src/legacy/hisnData.js";
import { HISN_BATCH1 } from "../src/legacy/hisnBatch1.js";
import { HISN_BATCH2 } from "../src/legacy/hisnBatch2.js";
import { HISN_BATCH3 } from "../src/legacy/hisnBatch3.js";
import { HISN_BATCH4 } from "../src/legacy/hisnBatch4.js";
import { HISN_BATCH5 } from "../src/legacy/hisnBatch5.js";
import { HISN_BATCH6 } from "../src/legacy/hisnBatch6.js";
import { HISN_BATCH7 } from "../src/legacy/hisnBatch7.js";
import { HISN_BATCH8 } from "../src/legacy/hisnBatch8.js";

const chapters = buildChapters(HISN_BATCH1, HISN_MORNING_EVENING, HISN_BATCH2, HISN_BATCH3, HISN_BATCH4, HISN_BATCH5, HISN_BATCH6, HISN_BATCH7, HISN_BATCH8);

test("একই অধ্যায় দুই গ্রুপে নেই", () => {
  const all = HISN_GROUPS.flatMap((g) => g.ids);
  assert.equal(new Set(all).size, all.length);
});

test("বাস্তব ডেটার প্রতিটা অধ্যায় ঠিক একবার, 'অন্যান্য' খালি", () => {
  const groups = groupChapters(chapters);
  const ids = groups.flatMap((g) => g.chapters.map((c) => c.id));
  assert.equal(ids.length, chapters.length);
  assert.equal(new Set(ids).size, chapters.length);
  assert.equal(groups.find((g) => g.key === "other"), undefined);
});

test("গ্রুপে থাকা প্রতিটা id ডেটায় আছে (ভুল id নেই)", () => {
  const have = new Set(chapters.map((c) => c.id));
  for (const g of HISN_GROUPS) for (const id of g.ids) assert.ok(have.has(id), "অজানা id " + id);
});

test("নতুন অধ্যায় 'অন্যান্য'-এ আসে, হারায় না", () => {
  const extra = [...chapters, { id: 9999, title: "নতুন", duas: [] }];
  const groups = groupChapters(extra);
  const other = groups.find((g) => g.key === "other");
  assert.deepEqual(other.chapters.map((c) => c.id), [9999]);
});

test("খালি ইনপুটে খালি ফল", () => {
  assert.deepEqual(groupChapters([]), []);
});
