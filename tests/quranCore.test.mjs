// tests/quranCore.test.mjs — কুরআন-রিডারের pure লজিক + আসল ডেটা-ফাইলে runtime-validator।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  toBnDigits, pad3, surahTypeLabel, showBismillahHeader, refLabel, parseSurahPayload,
  sanitizeLastRead, pushLastRead, LAST_READ_MAX, QUICK_SURAHS,
  DEFAULT_PREFS, AR_SIZE, TR_SIZE, sanitizePrefs, PARA_NAMES, parseRef, locateAyah, buildMarkers, ayahShareText,
} from "../src/legacy/quranCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "public", "quran", "v1");
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(DIR, rel), "utf8"));
const meta = rd("meta.json");

test("toBnDigits / pad3", () => {
  assert.equal(toBnDigits(2), "২");
  assert.equal(toBnDigits("255"), "২৫৫");
  assert.equal(toBnDigits(114), "১১৪");
  assert.equal(pad3(7), "007");
  assert.equal(pad3(114), "114");
});

test("surahTypeLabel ও বিসমিল্লাহ-শিরোনাম নিয়ম", () => {
  assert.equal(surahTypeLabel("m"), "মাক্কী");
  assert.equal(surahTypeLabel("d"), "মাদানী");
  assert.equal(showBismillahHeader(1), false);
  assert.equal(showBismillahHeader(9), false);
  assert.equal(showBismillahHeader(2), true);
  assert.equal(showBismillahHeader(114), true);
});

test("refLabel", () => {
  assert.equal(refLabel({ n: 2, bn: "আল-বাকারা" }, 255), "আল-বাকারা ২:২৫৫");
});

test("দ্রুত-লিংকের সূরা বৈধ", () => {
  QUICK_SURAHS.forEach((n) => assert.ok(meta.surahs[n - 1] && meta.surahs[n - 1].bn));
});

test("parseSurahPayload: গরমিলে throw", () => {
  const sm = { n: 1, ayahs: 2 };
  assert.deepEqual(parseSurahPayload({ s: 1, a: ["أ", "ب"] }, { s: 1, t: ["ক", "খ"] }, sm), [
    { n: 1, ar: "أ", tr: "ক" }, { n: 2, ar: "ب", tr: "খ" },
  ]);
  assert.throws(() => parseSurahPayload({ s: 1, a: ["أ"] }, { s: 1, t: ["ক", "খ"] }, sm));
  assert.throws(() => parseSurahPayload({ s: 2, a: ["أ", "ب"] }, { s: 1, t: ["ক", "খ"] }, sm));
  assert.throws(() => parseSurahPayload({ s: 1, a: ["أ", 5] }, { s: 1, t: ["ক", "খ"] }, sm));
  assert.throws(() => parseSurahPayload(null, null, sm));
});

test("আসল ডেটা: ১১৪ সূরার সবকটা runtime-validator পার করে (মোট ৬২৩৬ আয়াত)", () => {
  let total = 0;
  for (const sm of meta.surahs) {
    const list = parseSurahPayload(rd("ar/" + pad3(sm.n) + ".json"), rd("tr/bn_khan/" + pad3(sm.n) + ".json"), sm);
    assert.equal(list.length, sm.ayahs);
    total += list.length;
  }
  assert.equal(total, 6236);
});

test("sanitizeLastRead: অবৈধ বাদ, প্রতি সূরায় একটা, নতুন আগে, ≤৩", () => {
  const raw = [
    { s: 2, a: 255, t: 5 }, { s: 2, a: 1, t: 9 }, // একই সূরা: প্রথমটা থাকে (ইনপুট-ক্রম)
    { s: 1, a: 8, t: 8 },     // ১ সূরায় ৭ আয়াত → বাদ
    { s: 200, a: 1, t: 1 },   // অবৈধ সূরা
    { s: 18, a: 10, t: 7 }, { s: 36, a: 1, t: 6 }, { s: 67, a: 1, t: 4 },
    null, "x", { s: "2", a: 1 },
  ];
  const out = sanitizeLastRead(raw, meta.surahs);
  assert.equal(out.length, LAST_READ_MAX);
  assert.deepEqual(out.map((x) => x.s), [18, 36, 2]);
  assert.deepEqual(sanitizeLastRead("abc", meta.surahs), []);
  assert.deepEqual(sanitizeLastRead([{ s: 1, a: 1, t: 1 }], null), []);
});

test("pushLastRead: একই সূরা সামনে আসে, ৩-এর বেশি নয়", () => {
  let l = [];
  l = pushLastRead(l, 1, 1, 1);
  l = pushLastRead(l, 2, 5, 2);
  l = pushLastRead(l, 3, 5, 3);
  l = pushLastRead(l, 4, 5, 4);
  assert.deepEqual(l.map((x) => x.s), [4, 3, 2]);
  l = pushLastRead(l, 2, 100, 5);
  assert.deepEqual(l.map((x) => [x.s, x.a]), [[2, 100], [4, 5], [3, 5]]);
  assert.deepEqual(pushLastRead(null, 5, 1, 1), [{ s: 5, a: 1, t: 1 }]);
});

test("sanitizePrefs: ডিফল্ট, সীমা, দুটোই বন্ধ হওয়া আটকানো", () => {
  assert.deepEqual(sanitizePrefs(null), DEFAULT_PREFS);
  assert.deepEqual(sanitizePrefs("x"), DEFAULT_PREFS);
  const p = sanitizePrefs({ arSize: 999, trSize: 1, showAr: false, showTr: false, theme: 7 });
  assert.equal(p.arSize, AR_SIZE.max);
  assert.equal(p.trSize, TR_SIZE.min);
  assert.equal(p.showAr, true); // দুটোই false হলে আরবি ফেরে
  assert.equal(p.theme, 0);
  assert.equal(sanitizePrefs({ showAr: false, showTr: true, theme: 2 }).showAr, false);
  assert.equal(sanitizePrefs({ theme: 2 }).theme, 2);
  assert.equal(sanitizePrefs({ arSize: "abc" }).arSize, AR_SIZE.def);
});

test("পারার নাম ৩০টি", () => {
  assert.equal(PARA_NAMES.length, 30);
  PARA_NAMES.forEach((n) => assert.ok(n && n.length > 2));
});

test("parseRef: বাংলা/ইংরেজি/আরবি অঙ্ক, বিভিন্ন বিভাজক; অবৈধ → null", () => {
  const S = meta.surahs;
  assert.deepEqual(parseRef("২:২৫৫", S), { s: 2, a: 255 });
  assert.deepEqual(parseRef("2:255", S), { s: 2, a: 255 });
  assert.deepEqual(parseRef(" 36 / 1 ", S), { s: 36, a: 1 });
  assert.deepEqual(parseRef("18.10", S), { s: 18, a: 10 });
  assert.deepEqual(parseRef("٢:٢٥٥", S), { s: 2, a: 255 });
  assert.deepEqual(parseRef("114 6", S), { s: 114, a: 6 });
  assert.equal(parseRef("2:287", S), null); // বাকারায় ২৮৬
  assert.equal(parseRef("115:1", S), null);
  assert.equal(parseRef("0:1", S), null);
  assert.equal(parseRef("2:0", S), null);
  assert.equal(parseRef("বাকারা", S), null);
  assert.equal(parseRef("", S), null);
  assert.equal(parseRef(null, S), null);
});

test("locateAyah: পারা ও পৃষ্ঠা (মাদানী ৬০৪)", () => {
  assert.deepEqual(locateAyah(meta, 1, 1), { juz: 1, page: 1 });
  assert.equal(locateAyah(meta, 2, 141).juz, 1);
  assert.equal(locateAyah(meta, 2, 142).juz, 2);
  assert.equal(locateAyah(meta, 2, 252).juz, 2);
  assert.equal(locateAyah(meta, 2, 253).juz, 3);
  assert.equal(locateAyah(meta, 2, 255).page, 42); // আয়াতুল কুরসী
  assert.deepEqual(locateAyah(meta, 114, 6), { juz: 30, page: 604 });
  // প্রতিটা পারা/পৃষ্ঠার শুরু-বিন্দু নিজেই নিজের নম্বর দেয়
  meta.juz.forEach(([s, a], i) => assert.equal(locateAyah(meta, s, a).juz, i + 1));
  meta.pages.forEach(([s, a], i) => assert.equal(locateAyah(meta, s, a).page, i + 1));
});

test("buildMarkers: ৩০ পারা, ৬০৪ পৃষ্ঠা, ১৫ সিজদা", () => {
  const m = buildMarkers(meta);
  assert.equal(m.juz.size, 30);
  assert.equal(m.page.size, 604);
  assert.equal(m.sajda.size, 15);
  assert.equal(m.juz.get("2:142"), 2);
  assert.ok(m.sajda.has("7:206"));
  assert.ok(m.sajda.has("96:19"));
});

test("ayahShareText: দৃশ্যমান অংশই যায়, সূত্র সহ", () => {
  const sm = { n: 2, bn: "আল-বাকারা" };
  const ay = { n: 255, ar: "AR", tr: "TR" };
  const both = ayahShareText(sm, ay, { showAr: true, showTr: true }, "মুহিউদ্দীন খান");
  assert.equal(both, "AR\n\nTR\n\n— সূরা আল-বাকারা ২:২৫৫ (অনুবাদ: মুহিউদ্দীন খান)");
  assert.equal(ayahShareText(sm, ay, { showAr: true, showTr: false }, "ক"), "AR\n\n— সূরা আল-বাকারা ২:২৫৫");
  assert.equal(ayahShareText(sm, ay, { showAr: false, showTr: true }, ""), "TR\n\n— সূরা আল-বাকারা ২:২৫৫");
});
