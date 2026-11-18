// tests/hisnSearch.test.mjs — অধ্যায়/দু'আর শিরোনামে সার্চ ও হাইলাইট।
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeText, isSearchable, searchHisn, highlightParts } from "../src/legacy/hisnSearch.js";
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

const real = buildChapters(HISN_BATCH1, HISN_MORNING_EVENING, HISN_BATCH2, HISN_BATCH3, HISN_BATCH4, HISN_BATCH5, HISN_BATCH6, HISN_BATCH7, HISN_BATCH8);

const sample = [
  { id: 1, title: "ঘুম থেকে জেগে ওঠার সময়ের যিকর", duas: [{ id: "a1", title: "ঘুম থেকে উঠে আলহামদুলিল্লাহ" }, { id: "a2", title: "রুকূ'র দু'আ" }] },
  { id: 2, title: "খাওয়ার দু'আ", duas: [{ id: "b1", title: "খাওয়ার শুরুতে" }, { id: "b2", title: "খাওয়ার শেষে দু'আ" }] },
];

test("normalizeText: অ্যাপোস্ট্রফি, ZWJ, বাড়তি ফাঁকা বাদ; ছোট হাতের", () => {
  assert.equal(normalizeText("দু'আ"), "দুআ");
  assert.equal(normalizeText("দু‘আ"), "দুআ");
  assert.equal(normalizeText("দু’আ"), "দুআ");
  assert.equal(normalizeText("  খাওয়ার   আগে "), "খাওয়ার আগে");
  assert.equal(normalizeText("ABC"), "abc");
  assert.equal(normalizeText("র‍ে"), "রে");
  assert.equal(normalizeText(null), "");
});

test("য় (একক কোড বনাম য+নুকতা) একই ধরা হয়", () => {
  assert.equal(normalizeText("খাওয়া"), normalizeText("খাওয়া"));
  const r = searchHisn(sample, "খাওয়া");
  assert.equal(r.chapters.length, 1);
});

test("isSearchable: ১ অক্ষর বা ফাঁকা নয়", () => {
  assert.equal(isSearchable(""), false);
  assert.equal(isSearchable(" "), false);
  assert.equal(isSearchable("খ"), false);
  assert.equal(isSearchable("খা"), true);
});

test("ছোট প্রশ্নে কিছু ফেরে না", () => {
  const r = searchHisn(sample, "খ");
  assert.deepEqual(r, { chapters: [], duas: [] });
});

test("অধ্যায় ও দু'আর শিরোনামে মেলে", () => {
  const r = searchHisn(sample, "খাওয়া");
  assert.deepEqual(r.chapters.map((c) => c.id), [2]);
  assert.deepEqual(r.duas.map((d) => d.duaId), ["b1", "b2"]);
  assert.equal(r.duas[0].chapterId, 2);
  assert.equal(r.duas[0].chapterTitle, "খাওয়ার দু'আ");
});

test("একাধিক শব্দ: সবকটা মিলতে হবে", () => {
  const r = searchHisn(sample, "খাওয়ার শেষে");
  assert.deepEqual(r.duas.map((d) => d.duaId), ["b2"]);
  assert.deepEqual(r.chapters, []);
});

test("'দোয়া', 'দুআ', \"দু'আ\" একই ফল দেয়", () => {
  const a = searchHisn(sample, "দোয়া");
  const b = searchHisn(sample, "দুআ");
  const c = searchHisn(sample, "দু'আ");
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
  assert.deepEqual(a.duas.map((d) => d.duaId), ["a2", "b2"]);
  assert.deepEqual(a.chapters.map((x) => x.id), [2]);
});

test("না মিললে খালি", () => {
  assert.deepEqual(searchHisn(sample, "হজ্জের"), { chapters: [], duas: [] });
});

test("শুরুর দিকের মিল আগে আসে", () => {
  const list = [{ id: 1, title: "x", duas: [{ id: "p", title: "শেষে খাওয়ার" }, { id: "q", title: "খাওয়ার শুরু" }] }];
  assert.deepEqual(searchHisn(list, "খাওয়ার").duas.map((d) => d.duaId), ["q", "p"]);
});

test("অদ্ভুত ইনপুটে ভাঙে না", () => {
  assert.deepEqual(searchHisn(null, "খাওয়া"), { chapters: [], duas: [] });
  assert.deepEqual(searchHisn([{ id: 1, title: "খাওয়া" }], "খাওয়া").chapters.length, 1);
  assert.deepEqual(searchHisn(sample, undefined), { chapters: [], duas: [] });
});

test("highlightParts: জোড়া লাগালে মূল লেখাই ফেরে, মিল অংশ hit", () => {
  const t = "খাওয়ার শেষে দু'আ";
  const parts = highlightParts(t, "খাওয়া");
  assert.equal(parts.map((p) => p.text).join(""), t);
  assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["খাওয়া"]);
});

test("highlightParts: অ্যাপোস্ট্রফিসহ লেখায় 'দুআ' হাইলাইট পুরো \"দু'আ\"", () => {
  const t = "রুকূ'র দু'আ";
  const parts = highlightParts(t, "দুআ");
  assert.equal(parts.map((p) => p.text).join(""), t);
  assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["দু'আ"]);
  const alt = highlightParts(t, "দোয়া");
  assert.deepEqual(alt.filter((p) => p.hit).map((p) => p.text), ["দু'আ"]);
});

test("highlightParts: না মিললে/ফাঁকা প্রশ্নে একটাই অংশ, hit নয়", () => {
  assert.deepEqual(highlightParts("খাওয়া", "হজ্জ"), [{ text: "খাওয়া", hit: false }]);
  assert.deepEqual(highlightParts("খাওয়া", ""), [{ text: "খাওয়া", hit: false }]);
  assert.deepEqual(highlightParts("", "খাওয়া"), [{ text: "", hit: false }]);
});

test("highlightParts: একাধিক শব্দ ও একাধিক জায়গা", () => {
  const parts = highlightParts("খাওয়ার আগে ও খাওয়ার পরে", "খাওয়ার পরে");
  assert.equal(parts.map((p) => p.text).join(""), "খাওয়ার আগে ও খাওয়ার পরে");
  assert.equal(parts.filter((p) => p.hit).length, 3);
});

test("বাস্তব ডেটা: 'খাওয়া' লিখলে ফল আসে, প্রতিটা ফল আসল অধ্যায়/দু'আর সাথে মেলে", () => {
  const r = searchHisn(real, "খাওয়া");
  assert.ok(r.chapters.length > 0);
  assert.ok(r.duas.length > 0);
  for (const c of r.chapters) assert.ok(real.some((x) => x.id === c.id && x.title === c.title));
  for (const d of r.duas) {
    const ch = real.find((x) => x.id === d.chapterId);
    assert.ok(ch && ch.duas.some((x) => x.id === d.duaId && x.title === d.title));
  }
});

test("বাস্তব ডেটা: 'দোয়া' ও \"দু'আ\" একই ফল", () => {
  assert.deepEqual(searchHisn(real, "দোয়া"), searchHisn(real, "দু'আ"));
});

test("বাস্তব ডেটা: প্রতিটা অধ্যায়ের নিজের পুরো শিরোনামে খুঁজলে সেই অধ্যায় পাওয়া যায়", () => {
  for (const c of real) {
    if (!isSearchable(c.title)) continue;
    const r = searchHisn(real, c.title);
    assert.ok(r.chapters.some((x) => x.id === c.id), "অধ্যায় " + c.id + " পাওয়া যায়নি");
  }
});
