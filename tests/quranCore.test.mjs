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
  MARKS_MAX, markKey, sanitizeMarks, toggleMark, mergeMarks, mergeLastRead, sanitizeCloudState,
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

// ───────── ধাপ ৪: বুকমার্ক / পছন্দ ─────────
const S = meta.surahs;

test("sanitizeMarks: অবৈধ বাদ, ডুপ্লিকেট এক, নতুন আগে, সীমা ৩০০", () => {
  const raw = [
    { s: 2, a: 255, k: "b", t: 5 },
    { s: 2, a: 255, k: "b", t: 9 }, // ডুপ্লিকেট
    { s: 2, a: 255, k: "f", t: 7 }, // ভিন্ন ধরন — আলাদা এন্ট্রি
    { s: 2, a: 287, k: "b", t: 1 }, // আয়াত সীমার বাইরে
    { s: 115, a: 1, k: "b", t: 1 }, // সূরা অবৈধ
    { s: 1, a: 1, k: "x", t: 1 }, // ধরন অবৈধ
    { s: "2", a: 1, k: "b", t: 1 }, // ধরন-ভুল
    null, 5,
    { s: 1, a: 1, k: "b" }, // t নেই → ০
  ];
  const out = sanitizeMarks(raw, S);
  assert.deepEqual(out.map((x) => markKey(x.s, x.a, x.k)), ["2:255:f", "2:255:b", "1:1:b"]);
  assert.deepEqual(sanitizeMarks("x", S), []);
  assert.deepEqual(sanitizeMarks([], null), []);
  const many = Array.from({ length: 400 }, (_, i) => ({ s: 2, a: (i % 286) + 1, k: i < 286 ? "b" : "f", t: i }));
  assert.equal(sanitizeMarks(many, S).length, MARKS_MAX);
});

test("toggleMark: যোগ, সরানো, সীমা পূর্ণ হলে যোগ হয় না কিন্তু কিছু মোছেও না", () => {
  let r = toggleMark([], 2, 255, "b", 10);
  assert.equal(r.added, true);
  assert.deepEqual(r.list, [{ s: 2, a: 255, k: "b", t: 10 }]);
  r = toggleMark(r.list, 2, 255, "f", 11); // ভিন্ন ধরন
  assert.equal(r.list.length, 2);
  r = toggleMark(r.list, 2, 255, "b", 12); // সরানো
  assert.equal(r.added, false);
  assert.deepEqual(r.list.map((x) => x.k), ["f"]);
  const full = Array.from({ length: MARKS_MAX }, (_, i) => ({ s: 2, a: (i % 286) + 1, k: i < 286 ? "b" : "f", t: i }));
  const blocked = toggleMark(full, 3, 1, "b", 99);
  assert.equal(blocked.full, true);
  assert.equal(blocked.list, full);
  assert.equal(toggleMark(full, 2, 1, "b", 99).list.length, MARKS_MAX - 1); // পূর্ণ থাকলেও সরানো চলে
});

test("mergeMarks: দুই দিকের কিছুই হারায় না; একই কী-তে নতুন সময়", () => {
  const a = [{ s: 2, a: 1, k: "b", t: 5 }, { s: 3, a: 1, k: "f", t: 1 }];
  const b = [{ s: 2, a: 1, k: "b", t: 8 }, { s: 4, a: 1, k: "b", t: 2 }];
  const m = mergeMarks(a, b, S);
  assert.equal(m.length, 3);
  assert.equal(m.find((x) => x.s === 2).t, 8);
  assert.deepEqual(mergeMarks(a, null, S).length, 2);
});

test("mergeLastRead: প্রতি সূরায় নতুনটা, সর্বোচ্চ ৩", () => {
  const a = [{ s: 2, a: 10, t: 5 }, { s: 18, a: 1, t: 1 }];
  const b = [{ s: 2, a: 99, t: 9 }, { s: 36, a: 1, t: 3 }, { s: 55, a: 1, t: 2 }];
  const m = mergeLastRead(a, b, S);
  assert.equal(m.length, LAST_READ_MAX);
  assert.deepEqual(m[0], { s: 2, a: 99, t: 9 });
  assert.deepEqual(m.map((x) => x.s), [2, 36, 55]);
});

test("sanitizeCloudState: নষ্ট ডক খালি হয়ে যায়, ভালো অংশ টিকে থাকে", () => {
  assert.deepEqual(sanitizeCloudState(null, S), { marks: [], last: [] });
  assert.deepEqual(sanitizeCloudState("x", S), { marks: [], last: [] });
  const c = sanitizeCloudState({ marks: [{ s: 1, a: 1, k: "b", t: 1 }, { s: 0, a: 0, k: "b" }], last: [{ s: 1, a: 3, t: 2 }] }, S);
  assert.equal(c.marks.length, 1);
  assert.equal(c.last.length, 1);
});

test("firestore.rules-এর সীমা quranCore-এর সাথে মেলে (marks ≤ MARKS_MAX)", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  const blk = rules.slice(rules.indexOf("match /users/{uid}/quran/{docId}"));
  assert.ok(blk.includes("marks.size() <= " + MARKS_MAX));
});
