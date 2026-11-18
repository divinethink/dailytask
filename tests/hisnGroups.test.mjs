// tests/hisnGroups.test.mjs — অধ্যায়-গ্রুপ: প্রতিটা অধ্যায় ঠিক একটা গ্রুপে, কিছু হারায় না।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_GROUPS, QUICK_CHIPS, GROUP_ICONS, GROUP_EXTRAS, withExtras, groupChapters, flatChapterIds, neighbors, groupOf, chapterBySwipe } from "../src/legacy/hisnGroups.js";
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

test("দ্রুত-যান চিপের প্রতিটা id ডেটায় আছে", () => {
  const have = new Set(chapters.map((c) => c.id));
  for (const c of QUICK_CHIPS) assert.ok(have.has(c.id), "অজানা চিপ id " + c.id);
});

test("আগের/পরের অধ্যায়: প্রান্তে null, মাঝে ঠিক প্রতিবেশী", () => {
  const groups = groupChapters(chapters);
  const ids = flatChapterIds(groups);
  assert.equal(ids.length, chapters.length);
  assert.deepEqual(neighbors(groups, ids[0]), { prev: null, next: ids[1] });
  assert.deepEqual(neighbors(groups, ids[ids.length - 1]), { prev: ids[ids.length - 2], next: null });
  assert.deepEqual(neighbors(groups, ids[5]), { prev: ids[4], next: ids[6] });
  assert.deepEqual(neighbors(groups, -1), { prev: null, next: null });
});

test("groupOf: অধ্যায়ের গ্রুপ খোঁজে", () => {
  const groups = groupChapters(chapters);
  assert.equal(groupOf(groups, 28).key, "dailyRest");
  assert.equal(groupOf(groups, 17).key, "salah");
  assert.equal(groupOf(groups, 424242), null);
});

test("সোয়াইপ-দিশা: -১ আগের, +১ পরের, ০/প্রান্তে null", () => {
  const groups = groupChapters(chapters);
  const ids = flatChapterIds(groups);
  assert.equal(chapterBySwipe(groups, ids[3], -1), ids[2]);
  assert.equal(chapterBySwipe(groups, ids[3], 1), ids[4]);
  assert.equal(chapterBySwipe(groups, ids[3], 0), null);
  assert.equal(chapterBySwipe(groups, ids[0], -1), null);
  assert.equal(chapterBySwipe(groups, ids[ids.length - 1], 1), null);
});

const ITEMS = ["fullDayAmol", "jumuahAmol", "dhikr", "dua", "duaAcceptance", "deathReminder"].map((key) => ({ key, icon: "list", label: key }));

test("বাড়তি আইটেম নির্ধারিত গ্রুপে বসে, কিছু হারায় না, ক্রম অটুট", () => {
  const gs = withExtras(groupChapters(chapters), ITEMS);
  const got = gs.flatMap((g) => g.extras.map((x) => x.key));
  assert.deepEqual([...got].sort(), ITEMS.map((i) => i.key).sort());
  assert.deepEqual(gs.find((g) => g.key === "virtue").extras.map((x) => x.key), ["dhikr", "dua", "duaAcceptance"]);
  assert.deepEqual(gs.find((g) => g.key === "dailyRest").extras.map((x) => x.key), ["fullDayAmol"]);
  assert.equal(gs.find((g) => g.key === "other"), undefined);
});

test("অজানা আইটেম 'অন্যান্য'-এ; ডেটা না এলেও টুল-গ্রুপ আসে; আইকন সবার আছে", () => {
  const odd = withExtras(groupChapters(chapters), [{ key: "newTool", icon: "list", label: "x" }]);
  assert.deepEqual(odd[odd.length - 1].extras.map((x) => x.key), ["newTool"]);
  const bare = withExtras([], ITEMS);
  assert.equal(bare.reduce((n, g) => n + g.extras.length, 0), ITEMS.length);
  assert.deepEqual(bare.map((g) => g.key), ["dailyRest", "salah", "illDeath", "virtue"]);
  assert.ok(HISN_GROUPS.every((g) => GROUP_ICONS[g.key]));
  assert.ok(Object.values(GROUP_EXTRAS).flat().every((k) => ITEMS.some((i) => i.key === k)));
});
