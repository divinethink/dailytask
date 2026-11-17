// tests/hisnBatch2.test.mjs — হিসনুল মুসলিম ব্যাচ ২ (সালাত: অধ্যায় ১৬-২৬, ৩২, ৩৩): ডেটা অখণ্ডতা; কুরআনের অংশ অ্যাপের কুরআন-ডেটার সাথে মিলিয়ে।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HISN_BATCH1 as B1 } from "../src/legacy/hisnBatch1.js";
import { HISN_BATCH2 as B } from "../src/legacy/hisnBatch2.js";
import { HISN_MORNING_EVENING as M } from "../src/legacy/hisnData.js";
import { buildChapters, copyText } from "../src/legacy/hisnCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quran = (n) => JSON.parse(fs.readFileSync(path.join(root, "public/quran/v1/ar", String(n).padStart(3, "0") + ".json"), "utf8")).a;
const skel = (t) => t.replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[ؤئ]/g, "ء").replace(/[اإأآٱ]/g, "").replace(/ى/g, "ي").replace(/[^ء-ي]/g, "");
const all = B.flatMap((c) => c.duas);
const byHid = (n) => all.find((d) => d.hid === n);
const inQuote = (t) => t.slice(t.indexOf("﴿") + 1, t.lastIndexOf("﴾"));

test("ব্যাচ ২: ১৩ অধ্যায়, ৫২ দু'আ, id অনন্য, প্রতিটিতে আরবি/উচ্চারণ/অর্থ/সূত্র আছে", () => {
  assert.equal(B.length, 13);
  assert.equal(all.length, 52);
  assert.deepEqual(B.map((c) => c.id), [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 32, 33]);
  assert.deepEqual(B.map((c) => c.duas.length), [6, 5, 3, 7, 2, 2, 1, 2, 11, 8, 1, 3, 1]);
  assert.equal(new Set(all.map((d) => d.id)).size, 52);
  assert.equal(new Set(all.map((d) => d.hid)).size, 52);
  const hids = [...Array(48).keys()].map((i) => i + 27).concat([116, 117, 118, 119]);
  assert.deepEqual(all.map((d) => d.hid).sort((a, b) => a - b), hids);
  for (const d of all) {
    assert.ok(d.title && d.ar && d.tr && d.bn, d.id);
    assert.ok(d.ref && d.ref.length > 5, d.id + ": সূত্র নেই");
    assert.ok(Number.isInteger(d.times) && d.times >= 1, d.id);
    assert.ok(!/\(\(|\)\)/.test(d.ar + (d.arPre || "") + (d.arNote || "")), d.id + ": আরবিতে আবরণ রয়ে গেছে");
  }
});

test("বাংলা অংশে ইংরেজি অক্ষর নেই (শিরোনাম, উচ্চারণ, অর্থ, নোট, অধ্যায়ের নাম)", () => {
  for (const c of B) assert.ok(!/[A-Za-z]/.test(c.title), "অধ্যায় " + c.id);
  for (const d of all) for (const k of ["title", "tr", "bn", "note"]) assert.ok(!/[A-Za-z]/.test(d[k] || ""), d.id + "." + k);
});

test("কুরআনের অংশ অ্যাপের কুরআন-ডেটার সাথে শব্দে-শব্দে মেলে (২:২৫৫, ইখলাস-ফালাক-নাস, ৩:১৫৯, ২৩:১৪)", () => {
  assert.equal(skel(byHid(71).ar), skel(quran(2)[254]));
  const s = skel(byHid(70).ar);
  const idx = [112, 113, 114].map((n) => s.indexOf(skel(quran(n).join(""))));
  assert.ok(idx.every((i) => i >= 0) && idx[0] < idx[1] && idx[1] < idx[2], "তিন সূরা ক্রমে পাওয়া যায়নি");
  assert.ok(skel(quran(3)[158]).includes(skel(inQuote(byHid(74).arNote))), "৩:১৫৯ মেলেনি");
  const last23 = skel(quran(23)[13]);
  assert.ok(last23.endsWith(skel(inQuote(byHid(50).ar))), "২৩:১৪-এর শেষ অংশ মেলেনি");
  assert.ok(byHid(50).ar.startsWith("سَجَدَ") && byHid(50).ar.endsWith("﴾"));
});

test("পড়ার সংখ্যা আরবি নোটের সাথে মেলে (তিনবার, দশবার)", () => {
  for (const n of [33, 41, 119]) { assert.equal(byHid(n).times, 3, "times " + n); assert.ok(/ثلاث/.test(byHid(n).arNote), "arNote " + n); }
  assert.equal(byHid(72).times, 10);
  assert.ok(/عَشْرَ/.test(byHid(72).arNote));
  for (const d of all) if (![33, 41, 119, 72].includes(d.hid)) assert.equal(d.times, 1, "times " + d.hid);
  assert.ok(byHid(69).tr.includes("৩৩") && byHid(69).bn.includes("৩৩"));
});

test("একই আরবির পুনরাবৃত্ত দু'আ (৩৪=৪২, ৩৫=৪৩, ৩৭=৪৫, ৪৭=১১৭) — আরবি ও অর্থ একই", () => {
  for (const [a, b] of [[34, 42], [35, 43], [37, 45], [47, 117]]) {
    assert.equal(skel(byHid(a).ar), skel(byHid(b).ar), a + "/" + b + " আরবি");
    assert.equal(byHid(a).tr, byHid(b).tr, a + "/" + b + " উচ্চারণ");
    assert.equal(byHid(a).bn, byHid(b).bn, a + "/" + b + " অর্থ");
  }
});

test("নির্দেশ-অংশ আলাদা: ইস্তিখারার arPre/arNote; তিন সূরা-আয়াতুল কুরসির 'প্রতি নামাজের পর' arNote-এ", () => {
  assert.ok(byHid(74).arPre.includes("لْيَقُلْ") && !byHid(74).ar.includes("قَالَ جَابرُ"));
  const a74 = byHid(74).ar.normalize("NFC"); // শাদ্দা-হরকতের ক্রম ডেটাসেটে ভিন্ন; তুলনায় স্বাভাবিকীকরণ
  assert.ok(a74.startsWith("اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ".normalize("NFC")) && a74.endsWith("أَرْضِنِي بِهِ".normalize("NFC")));
  assert.ok(skel(byHid(70).arNote) === skel("بَعْدَ كُلِّ صَلاَةٍ") && !skel(byHid(70).ar).endsWith(skel("بَعْدَ كُلِّ صَلاَةٍ")));
  assert.ok(skel(byHid(71).arNote) === skel("عَقِبَ كلِّ صَلاَةٍ") && !skel(byHid(71).ar).includes(skel("عَقِبَ")));
});

test("মান-নিয়ম: 'সহীহ/হাসান' শুধু যে সূত্রে উৎস নিজে বলেছে সেখানে", () => {
  const graded = all.filter((d) => /সহীহ বলেছেন|হাসান|সানাদ সহীহ|সহীহ \(/.test(d.ref)).map((d) => d.hid).sort((a, b) => a - b);
  assert.deepEqual(graded, [31, 37, 45, 50, 51, 59, 62, 63, 65, 71, 118, 119]);
});

test("buildChapters: ব্যাচ ১ + ২ + অধ্যায় ২৭ = ১-৩৩ অবিচ্ছিন্ন; copyText-এ সূত্র আছে", () => {
  const list = buildChapters(B1, M, B);
  assert.equal(list.length, 33);
  assert.deepEqual(list.map((c) => c.id), [...Array(33).keys()].map((i) => i + 1));
  assert.equal(list.find((c) => c.id === 24).duas.length, 11);
  assert.ok(copyText(byHid(71)).includes("সূত্র: ") && copyText(byHid(71)).includes(byHid(71).ar));
  const ids = list.flatMap((c) => c.duas.map((d) => d.id));
  assert.equal(new Set(ids).size, ids.length, "দু'আ-id সংঘর্ষ");
});
