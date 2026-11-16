// tests/quranPages.test.mjs — ধাপ ৬খ: পৃষ্ঠা-মুসহাফের পৃষ্ঠা→আয়াত মানচিত্র (৬০৪ পৃষ্ঠা) ও পাঠ-মোড পছন্দ।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAGE_COUNT, clampPage, pageAyahRefs, locateAyah, sanitizePrefs, DEFAULT_PREFS } from "../src/legacy/quranCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(fs.readFileSync(path.join(root, "public", "quran", "v1", "meta.json"), "utf8"));

test("পৃষ্ঠা-মানচিত্র: ৬০৪টা পৃষ্ঠা মিলে ৬২৩৬ আয়াত ঠিক একবার করে, ক্রমানুসারে", () => {
  assert.equal(meta.pages.length, PAGE_COUNT);
  let s = 1;
  let a = 1;
  let total = 0;
  for (let p = 1; p <= PAGE_COUNT; p++) {
    const refs = pageAyahRefs(meta, p);
    assert.ok(refs.length >= 1, "পৃষ্ঠা " + p + " খালি");
    assert.deepEqual([refs[0].s, refs[0].a], meta.pages[p - 1], "পৃষ্ঠা " + p + " শুরু");
    for (const r of refs) {
      assert.deepEqual([r.s, r.a], [s, a], "পৃষ্ঠা " + p + " ক্রম");
      total++;
      a++;
      if (a > meta.surahs[s - 1].ayahs) { s++; a = 1; }
    }
  }
  assert.equal(total, 6236);
  assert.equal(s, 115); // শেষ আয়াতের পর আর কিছু নেই
});

test("পৃষ্ঠা: সূরা-পেরোনো পৃষ্ঠা, শেষ পৃষ্ঠা, locateAyah-র সাথে সামঞ্জস্য", () => {
  const p1 = pageAyahRefs(meta, 1);
  assert.equal(p1.length, 7); // ফাতিহা
  assert.ok(pageAyahRefs(meta, 604).some((r) => r.s === 114) && pageAyahRefs(meta, 604).some((r) => r.s === 112));
  const multi = Array.from({ length: PAGE_COUNT }, (_, i) => i + 1).filter((p) => new Set(pageAyahRefs(meta, p).map((r) => r.s)).size > 1);
  assert.ok(multi.length > 20, "একাধিক সূরার পৃষ্ঠা থাকার কথা");
  for (const p of [1, 2, 50, 300, 604]) {
    for (const r of pageAyahRefs(meta, p)) assert.equal(locateAyah(meta, r.s, r.a).page, p);
  }
});

test("clampPage: সীমার বাইরে/অবৈধ মান", () => {
  assert.equal(clampPage(0), 1);
  assert.equal(clampPage(9999), 604);
  assert.equal(clampPage("12"), 12);
  assert.equal(clampPage("x"), 1);
  assert.equal(clampPage(null), 1);
});

test("sanitizePrefs.mode: ডিফল্ট list; read শুধু ঠিক মানে; পুরনো সেটিংস অক্ষত", () => {
  assert.equal(DEFAULT_PREFS.mode, "list");
  assert.equal(sanitizePrefs({}).mode, "list");
  assert.equal(sanitizePrefs({ mode: "read" }).mode, "read");
  assert.equal(sanitizePrefs({ mode: "x" }).mode, "list");
  const old = sanitizePrefs({ arSize: 30, trSize: 18, showAr: true, showTr: false, theme: 1 }); // মোড-হীন পুরনো সেটিংস
  assert.deepEqual(old, { arSize: 30, trSize: 18, showAr: true, showTr: false, theme: 1, mode: "list", arFont: "amiri-quran" });
});
