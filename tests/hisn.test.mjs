// tests/hisn.test.mjs — হিসনুল মুসলিম সকাল-সন্ধ্যা: ডেটা অখণ্ডতা (কুরআনের অংশ অ্যাপের নিজস্ব কুরআন-ডেটার সাথে মিলিয়ে) ও helper।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISN_MORNING_EVENING as L } from "../src/legacy/hisnData.js";
import { filterByWhen, toBn, timesBadge, hisnArabicFont, copyText, WHEN_FILTERS } from "../src/legacy/hisnCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quran = (n) => JSON.parse(fs.readFileSync(path.join(root, "public/quran/v1/ar", String(n).padStart(3, "0") + ".json"), "utf8")).a;
// শব্দ মেলানোর জন্য (ব্যঞ্জনবর্ণের কাঠামো): হরকত/টাটউইল বাদ; আলিফ বাদ (السموات/السماوات), হামযা-আসন একীকরণ (يؤوده/يئوده), ى→ي।
// ফলে বানান-রীতির পার্থক্য উপেক্ষিত, কিন্তু ভুল/বাদ/বাড়তি শব্দ ধরা পড়ে। (হরকত এখানে যাচাই হয় না — তা ডেটাসেট থেকে অপরিবর্তিত।)
const skel = (t) => t.replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^\u0621-\u064A]/g, "");

test("২৪টি দু'আ, id অনন্য, সব ক্ষেত্র আছে, আরবিতে আবরণ ((  )) নেই", () => {
  assert.equal(L.length, 24);
  assert.equal(new Set(L.map((d) => d.id)).size, 24);
  for (const d of L) {
    assert.ok(d.title && d.ar && d.tr && d.bn, d.id);
    assert.ok(["both", "morning", "evening", "day"].includes(d.when), d.id);
    assert.ok(Number.isInteger(d.times) && d.times >= 1, d.id);
    assert.ok(!/\(\(|\)\)/.test(d.ar), d.id + ": আবরণ রয়ে গেছে");
  }
});

test("পড়ার সংখ্যা আরবি নোটের সাথে মেলে", () => {
  const map = [[/سَبْعَ/, 7], [/أربعَ/, 4], [/ثلاثَ/, 3], [/عشرَ/, 10], [/م[اِ]ئَ?[ةَ]/, 100]];
  for (const d of L) {
    const n = d.arNote || "";
    for (const [re, v] of map) if (re.test(n)) assert.equal(d.times, v, d.id + " " + n);
  }
  assert.equal(L.find((d) => d.hid === 83).times, 7); // ডেটাসেটের REPEAT=1 ভুল, আরবি নোটে সাতবার
});

test("আয়াতুল কুরসি ও তিন সূরা অ্যাপের কুরআন-ডেটার সাথে শব্দে-শব্দে মেলে", () => {
  const kursi = skel(quran(2)[254]);
  assert.ok(skel(L[0].ar).includes(kursi), "আয়াতুল কুরসি মেলেনি");
  const lines = L[1].ar.split("\n");
  assert.equal(lines.length, 3);
  [112, 113, 114].forEach((n, i) => {
    const full = quran(n).join("");
    assert.equal(skel(lines[i]).replace(/^بسمللهلرحمنلرحيم/, ""), skel(full), "সূরা " + n);
  });
});

test("filterByWhen: সকাল/সন্ধ্যা/সব", () => {
  assert.equal(filterByWhen(L, "all").length, 24);
  const m = filterByWhen(L, "morning"), e = filterByWhen(L, "evening");
  assert.ok(m.every((d) => d.when !== "evening") && e.every((d) => d.when !== "morning"));
  assert.ok(m.length > 0 && e.length > 0 && m.length < 24 && e.length < 24);
  assert.equal(WHEN_FILTERS.length, 3);
});

test("helper: বাংলা সংখ্যা, ব্যাজ, ফন্ট-ফেরত, কপি", () => {
  assert.equal(toBn(100), "১০০");
  assert.equal(timesBadge({ times: 1 }), "");
  assert.equal(timesBadge({ times: 7 }), "৭ বার");
  assert.equal(hisnArabicFont({ arFont: "noto-naskh" }), "noto-naskh");
  assert.equal(hisnArabicFont({ arFont: "kfgqpc-hafs" }), "amiri-quran"); // উসমানি ফন্ট simple লেখার সাথে বেমানান
  assert.equal(hisnArabicFont(null), "amiri-quran");
  assert.ok(copyText(L[8]).includes(L[8].ar) && copyText(L[8]).includes("৭ বার"));
});
