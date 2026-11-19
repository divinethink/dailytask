// tests/quranTafsir.test.mjs — তাফসির-লজিক + আসল ডেটা-ফাইল (৬২৩৬ আয়াত পূর্ণ ঢাকা, SHA মিল)।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateTafsirPayload, findTafsir, tafsirBlocks, tafsirRangeNote } from "../src/legacy/quranTafsir.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(root, "public", "quran", "v1");
const pad3 = (n) => String(n).padStart(3, "0");

test("validateTafsirPayload: সঠিক ও ভুল গঠন", () => {
  const ok = { v: 1, s: 2, g: [[1, 3, "<p>ক</p>"], [4, 5, "<p>খ</p>"]] };
  assert.equal(validateTafsirPayload(ok, 2, 5), ok);
  assert.equal(validateTafsirPayload(ok, 2, 6), null); // শেষ আয়াত কম
  assert.equal(validateTafsirPayload(ok, 3, 5), null); // ভুল সূরা
  assert.equal(validateTafsirPayload({ ...ok, g: [[1, 3, "ক"], [5, 5, "খ"]] }, 2, 5), null); // ফাঁক
  assert.equal(validateTafsirPayload({ ...ok, g: [[1, 3, "ক"], [3, 5, "খ"]] }, 2, 5), null); // ওভারল্যাপ
  assert.equal(validateTafsirPayload(null, 2, 5), null);
  assert.equal(validateTafsirPayload({ v: 2, s: 2, g: ok.g }, 2, 5), null);
});

test("findTafsir: আয়াত → ভাগ", () => {
  const p = { v: 1, s: 1, g: [[1, 1, "a"], [2, 4, "b"]] };
  assert.deepEqual(findTafsir(p, 3), { from: 2, to: 4, html: "b" });
  assert.equal(findTafsir(p, 5), null);
  assert.equal(findTafsir(null, 1), null);
});

test("tafsirBlocks: <p>/<b> পার্স, অন্য ট্যাগ ও স্ক্রিপ্ট বাদ (innerHTML নয়)", () => {
  const r = tafsirBlocks("<p>আগে <b>গাঢ়</b> পরে</p><p></p><p>দ্বিতীয় &amp; <script>alert(1)</script>শেষ</p>");
  assert.equal(r.length, 2);
  assert.deepEqual(r[0].map((x) => [x.t, x.b]), [["আগে ", false], ["গাঢ়", true], [" পরে", false]]);
  assert.ok(!JSON.stringify(r).includes("<"));
  assert.ok(JSON.stringify(r[1]).includes("দ্বিতীয় & "));
  assert.deepEqual(tafsirBlocks("শুধু লেখা").map((s) => s[0].t), ["শুধু লেখা"]);
  assert.deepEqual(tafsirBlocks(""), []);
});

test("tafsirRangeNote", () => {
  const d = (n) => String(n);
  assert.equal(tafsirRangeNote({ from: 3, to: 3 }, d), "");
  assert.equal(tafsirRangeNote({ from: 3, to: 7 }, d), "আয়াত 3–7-এর সম্মিলিত তাফসির");
});

test("আসল ডেটা: ১১৪ সূরার সব আয়াত ঢাকা, SHA integrity-tafsir.json-এর সাথে মেলে, শুধু <p>/<b>", () => {
  const meta = JSON.parse(fs.readFileSync(path.join(base, "meta.json"), "utf8"));
  const integ = JSON.parse(fs.readFileSync(path.join(root, "tools", "quran", "integrity-tafsir.json"), "utf8"));
  let ayahs = 0;
  for (const s of meta.surahs) {
    const rel = "tafsir/ibn-kathir-bn/" + pad3(s.n) + ".json";
    const raw = fs.readFileSync(path.join(base, rel), "utf8");
    assert.equal(crypto.createHash("sha256").update(raw).digest("hex"), integ.files[rel].sha256, rel);
    const p = validateTafsirPayload(JSON.parse(raw), s.n, s.ayahs);
    assert.ok(p, "সূরা " + s.n + " অবৈধ");
    for (const [, , html] of p.g) {
      assert.ok(!/<\s*\/?\s*(?!p\b|b\b)[a-z]/i.test(html) && !/script|javascript:|\bon\w+\s*=/i.test(html));
      assert.ok(tafsirBlocks(html).length > 0);
    }
    for (let a = 1; a <= s.ayahs; a++) assert.ok(findTafsir(p, a));
    ayahs += s.ayahs;
  }
  assert.equal(ayahs, 6236);
  assert.equal(Object.keys(integ.files).length, 114);
});
