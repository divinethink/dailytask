// tests/quran.test.mjs — কুরআনের ডেটা-অখণ্ডতা (public/quran/v1)। `npm test`-এর অংশ।
// এখানের সংখ্যা-তালিকা বিল্ড-স্ক্রিপ্টের উৎস থেকে স্বাধীনভাবে লেখা; ডেটা বদলালে/নষ্ট হলে টেস্ট ভাঙবে।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "public", "quran", "v1");
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(DIR, rel), "utf8"));
const pad3 = (n) => String(n).padStart(3, "0");

// প্রতি সূরার আয়াত-সংখ্যা (হাফস, মোট ৬২৩৬)।
const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];
// ৩০ পারার শুরু [সূরা, আয়াত]।
const JUZ_STARTS = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

const manifest = rd("manifest.json");
const meta = rd("meta.json");
const registry = rd("translations.json");

test("আয়াত-সংখ্যার তালিকা নিজেই সঠিক: ১১৪ সূরা, মোট ৬২৩৬", () => {
  assert.equal(AYAH_COUNTS.length, 114);
  assert.equal(AYAH_COUNTS.reduce((a, b) => a + b, 0), 6236);
});

test("আরবি: ১১৪ ফাইল, প্রতি সূরার আয়াত-সংখ্যা মিলছে, কোনো আয়াত খালি নয়", () => {
  for (let s = 1; s <= 114; s++) {
    const d = rd("ar/" + pad3(s) + ".json");
    assert.equal(d.s, s);
    assert.equal(d.a.length, AYAH_COUNTS[s - 1], "সূরা " + s);
    d.a.forEach((t, i) => assert.ok(typeof t === "string" && t.length > 0, s + ":" + (i + 1)));
  }
});

test("আরবি: চূড়ান্ত পাঠের SHA-256 manifest-এর সাথে মেলে (অপরিবর্তিত প্রমাণ)", () => {
  const all = [];
  for (let s = 1; s <= 114; s++) all.push(...rd("ar/" + pad3(s) + ".json").a);
  assert.equal(all.length, 6236);
  const h = crypto.createHash("sha256").update(all.join("\n")).digest("hex");
  assert.equal(h, manifest.arabic.sha256);
});

test("বিসমিল্লাহ: ফাতিহার ১ নম্বর আয়াত; অন্য সূরার আয়াতে আর জোড়া নেই; তাওবাহ-য় নেই", () => {
  const bis = manifest.arabic.bismillah;
  assert.ok(bis && bis.startsWith("بِسْمِ"));
  assert.equal(rd("ar/001.json").a[0], bis);
  for (let s = 2; s <= 114; s++) {
    const first = rd("ar/" + pad3(s) + ".json").a[0];
    assert.ok(!first.startsWith(bis), "সূরা " + s + " ১ম আয়াতে বিসমিল্লাহ জোড়া");
  }
  // নামলের ৩০ নম্বর আয়াতের ভেতরের বিসমিল্লাহ আয়াতেরই অংশ — অক্ষত থাকতে হবে।
  assert.ok(rd("ar/027.json").a[29].endsWith(bis));
});

test("বাংলা অনুবাদ (bn_khan): প্রতিটা আয়াতের অনুবাদ আছে, সংখ্যা আরবির সমান", () => {
  for (let s = 1; s <= 114; s++) {
    const d = rd("tr/bn_khan/" + pad3(s) + ".json");
    assert.equal(d.s, s);
    assert.equal(d.t.length, AYAH_COUNTS[s - 1], "সূরা " + s);
    d.t.forEach((t, i) => assert.ok(typeof t === "string" && t.trim().length > 0, s + ":" + (i + 1)));
  }
});

test("অনুবাদ-রেজিস্ট্রির প্রতিটা এন্ট্রির ফোল্ডার আছে; ডিফল্ট রেজিস্ট্রিতেই আছে", () => {
  assert.ok(registry.items.length >= 1);
  assert.ok(registry.items.some((x) => x.id === registry.default));
  for (const it of registry.items) {
    assert.ok(it.id && it.lang && it.name && it.source, "অসম্পূর্ণ এন্ট্রি: " + it.id);
    for (let s = 1; s <= 114; s++) assert.ok(fs.existsSync(path.join(DIR, "tr", it.id, pad3(s) + ".json")), it.id + " " + s);
  }
});

test("meta: ১১৪ সূরা, গ্লোবাল শুরু-নম্বর ক্রমানুসারে, নাম/ধরন আছে", () => {
  assert.equal(meta.surahs.length, 114);
  let g = 1;
  meta.surahs.forEach((x, i) => {
    assert.equal(x.n, i + 1);
    assert.equal(x.ayahs, AYAH_COUNTS[i]);
    assert.equal(x.start, g, "সূরা " + x.n + " start");
    assert.ok(x.ar && x.en && x.bn, "নাম অসম্পূর্ণ: " + x.n);
    assert.ok(x.type === "m" || x.type === "d");
    g += x.ayahs;
  });
});

test("meta: পারা ৩০টি ও শুরু-বিন্দু সঠিক", () => {
  assert.deepEqual(meta.juz, JUZ_STARTS);
});

test("meta: পৃষ্ঠা ৬০৪, রুকু ৫৫৬, সিজদা ১৫; সব ক্রমবর্ধমান ও বৈধ আয়াত", () => {
  const gid = ([s, a]) => {
    assert.ok(s >= 1 && s <= 114 && a >= 1 && a <= AYAH_COUNTS[s - 1], "অবৈধ " + s + ":" + a);
    return meta.surahs[s - 1].start + a - 1;
  };
  for (const [name, list, n] of [["pages", meta.pages, 604], ["rukus", meta.rukus, 556], ["sajdas", meta.sajdas, 15]]) {
    assert.equal(list.length, n, name);
    const ids = list.map(gid);
    for (let i = 1; i < ids.length; i++) assert.ok(ids[i] > ids[i - 1], name + " ক্রম ভাঙা: " + i);
  }
  assert.deepEqual(meta.pages[0], [1, 1]);
  assert.deepEqual(meta.pages[1], [2, 1]);
  assert.deepEqual(meta.pages[603], [112, 1]);
  assert.deepEqual(meta.rukus[0], [1, 1]);
});

test("manifest: উৎস ও লাইসেন্স-তথ্য আছে; Tanzil-এর কপিরাইট-নোটিশ ফাইল আছে", () => {
  assert.equal(manifest.counts.ayahs, 6236);
  assert.equal(manifest.arabic.source, "Tanzil.net");
  assert.equal(manifest.arabic.license, "CC BY 3.0");
  const lic = fs.readFileSync(path.join(DIR, "ar", "LICENSE-TANZIL.txt"), "utf8");
  assert.ok(lic.includes("Tanzil") && lic.includes("CHANGING IT IS NOT ALLOWED") && lic.includes("tanzil.net"));
});

test("সব ফাইলের SHA-256 tools/quran/integrity.json-এর সাথে মেলে", () => {
  const integ = JSON.parse(fs.readFileSync(path.join(root, "tools", "quran", "integrity.json"), "utf8"));
  const rels = Object.keys(integ.files);
  assert.equal(rels.length, 228 + 3); // ২২৮ সূরা-ফাইল + meta/manifest/translations
  for (const rel of rels) {
    const buf = fs.readFileSync(path.join(DIR, rel));
    assert.equal(crypto.createHash("sha256").update(buf).digest("hex"), integ.files[rel].sha256, rel);
  }
});
