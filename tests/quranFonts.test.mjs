// tests/quranFonts.test.mjs — ধাপ ৬গ-১: আরবি ফন্ট-তালিকা ও arFont পছন্দ।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QURAN_FONTS, DEFAULT_FONT, SCRIPTS, scriptById, fontById, isValidFont, fontsForScript, fontFitsScript, fontStack } from "../src/legacy/quranFonts.js";
import { sanitizePrefs, DEFAULT_PREFS, switchScript } from "../src/legacy/quranCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("ফন্ট-তালিকা: id অনন্য, ডিফল্ট আছে, প্রতিটার উৎস (file বা google) আছে, লাইসেন্স OFL", () => {
  const ids = QURAN_FONTS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(isValidFont(DEFAULT_FONT));
  for (const f of QURAN_FONTS) {
    assert.ok(f.file || f.google, f.id + ": উৎস নেই");
    assert.ok(f.scripts.length > 0 && f.family && f.name);
    assert.match(f.license, /OFL|KFGQPC|Tanzil|QuranWBW/);
  }
});

test("লোকাল ফন্ট-ফাইল সত্যিই আছে (file দেওয়া থাকলে)", () => {
  for (const f of QURAN_FONTS.filter((x) => x.file)) {
    assert.ok(fs.existsSync(path.join(root, "public", f.file)), f.file);
  }
});

test("Simple-এর জন্য অন্তত ৩টা ফন্ট; fontStack সবসময় আমিরি-ফলব্যাকসহ", () => {
  assert.ok(fontsForScript("simple").length >= 3);
  assert.equal(fontsForScript("nonexistent").length, 0);
  assert.match(fontStack("noto-naskh"), /^'Noto Naskh Arabic', 'Amiri Quran'/);
  assert.match(fontStack("bogus"), /^'Amiri Quran'/);
  assert.equal(fontById("bogus"), null);
});

test("sanitizePrefs.arFont: ডিফল্ট, অবৈধ → ডিফল্ট, বৈধ অক্ষত; পুরনো পছন্দে নতুন ফিল্ড যোগ", () => {
  assert.equal(DEFAULT_PREFS.arFont, DEFAULT_FONT);
  assert.equal(sanitizePrefs({}).arFont, DEFAULT_FONT);
  assert.equal(sanitizePrefs({ arFont: "scheherazade" }).arFont, "scheherazade");
  assert.equal(sanitizePrefs({ arFont: "evil<script>" }).arFont, DEFAULT_FONT);
  assert.equal(sanitizePrefs({ arFont: 5 }).arFont, DEFAULT_FONT);
});

test("৬গ-২: লেখার ধরন — ডিফল্ট simple, অবৈধ → simple; ফন্ট লেখার সাথে বেমানান হলে ওই লেখার ডিফল্ট ফন্ট", () => {
  assert.equal(DEFAULT_PREFS.arScript, "simple");
  assert.equal(sanitizePrefs({}).arScript, "simple");
  assert.equal(sanitizePrefs({ arScript: "evil" }).arScript, "simple");
  assert.equal(sanitizePrefs({ arScript: "uthmani", arFont: "kfgqpc-hafs" }).arFont, "kfgqpc-hafs");
  assert.equal(sanitizePrefs({ arScript: "uthmani", arFont: "noto-naskh" }).arFont, "kfgqpc-hafs"); // বেমানান
  assert.equal(sanitizePrefs({ arScript: "simple", arFont: "me-quran" }).arFont, "amiri-quran"); // বেমানান
  assert.equal(sanitizePrefs({ arFont: "noto-naskh" }).arFont, "noto-naskh"); // পুরনো পছন্দ অক্ষত
  const u = switchScript({ ...DEFAULT_PREFS, arFont: "noto-naskh" }, "uthmani");
  assert.deepEqual([u.arScript, u.arFont], ["uthmani", "kfgqpc-hafs"]);
  assert.equal(switchScript({ ...DEFAULT_PREFS, arFont: "amiri-quran" }, "uthmani").arFont, "amiri-quran"); // মানানসই হলে থাকে
  assert.equal(switchScript(DEFAULT_PREFS, "bogus"), DEFAULT_PREFS);
  for (const sc of SCRIPTS) { assert.ok(fontFitsScript(sc.defaultFont, sc.id)); assert.ok(fontsForScript(sc.id).length >= (sc.id === "indopak" ? 1 : 2)); }
  assert.equal(fontsForScript("uthmani").some((f) => f.id === "kfgqpc-hafs") && fontsForScript("uthmani").some((f) => f.id === "me-quran"), true);
});

test("উসমানি ডেটা: ১১৪ ফাইল, আয়াত-সংখ্যা meta-র সাথে মিল, মোট ৬২৩৬, sha256 manifest-এর সাথে মিল, বিসমিল্লাহ-ধ্রুবক ডেটার সাথে মিল", async () => {
  const { createHash } = await import("node:crypto");
  const base = path.join(root, "public/quran/v1");
  const meta = JSON.parse(fs.readFileSync(path.join(base, "meta.json"), "utf8"));
  const man = JSON.parse(fs.readFileSync(path.join(base, "manifest.json"), "utf8"));
  const all = [];
  for (const su of meta.surahs) {
    const j = JSON.parse(fs.readFileSync(path.join(base, "ar-uthmani", String(su.n).padStart(3, "0") + ".json"), "utf8"));
    assert.equal(j.s, su.n);
    assert.equal(j.a.length, su.ayahs);
    assert.ok(j.a.every((t) => typeof t === "string" && t.trim()));
    all.push(...j.a);
  }
  assert.equal(all.length, 6236);
  assert.equal(createHash("sha256").update(all.join("\n")).digest("hex"), man.arabicUthmani.sha256);
  assert.equal(scriptById("uthmani").bismillah, man.arabicUthmani.bismillah);
  assert.equal(scriptById("simple").bismillah, man.arabic.bismillah);
  // সূরা ২–১১৪ (৯ বাদে)-র ১ম আয়াতে বিসমিল্লাহ জুড়ে নেই
  assert.ok(!all[7].startsWith(man.arabicUthmani.bismillah)); // ২:১
  // ফন্ট-ফাইল সত্যিই আছে এবং খালি নয়
  for (const f of QURAN_FONTS.filter((x) => x.file)) assert.ok(fs.statSync(path.join(root, "public", f.file)).size > 10000, f.file);
});

test("৬গ-৩ IndoPak ডেটা: ১১৪ ফাইল, আয়াত-সংখ্যা meta-র সাথে মিল, মোট ৬২৩৬, sha256 ও বিসমিল্লাহ manifest-এর সাথে মিল, নম্বর-শব্দ নেই", async () => {
  const { createHash } = await import("node:crypto");
  const base = path.join(root, "public/quran/v1");
  const meta = JSON.parse(fs.readFileSync(path.join(base, "meta.json"), "utf8"));
  const man = JSON.parse(fs.readFileSync(path.join(base, "manifest.json"), "utf8"));
  const all = [];
  for (const su of meta.surahs) {
    const j = JSON.parse(fs.readFileSync(path.join(base, "ar-indopak", String(su.n).padStart(3, "0") + ".json"), "utf8"));
    assert.equal(j.s, su.n);
    assert.equal(j.a.length, su.ayahs);
    assert.ok(j.a.every((t) => typeof t === "string" && t.trim() && !/[\u0660-\u0669]\s*$/.test(t.replace(/[\u200b\u200f\u2002\ufeff]/g, ""))), "সূরা " + su.n);
    all.push(...j.a);
  }
  assert.equal(all.length, 6236);
  assert.equal(createHash("sha256").update(all.join("\n")).digest("hex"), man.arabicIndopak.sha256);
  assert.equal(scriptById("indopak").bismillah, man.arabicIndopak.bismillah);
  assert.equal(all[0].replace(/[\u200b\u200f\u2002\ufeff]/g, "").trim(), man.arabicIndopak.bismillah); // ১:১ নিজেই বিসমিল্লাহ
  assert.ok(!all[7].includes(man.arabicIndopak.bismillah)); // ২:১-এ জোড়া নেই
});

test("৬গ-৩ পছন্দ: IndoPak বাছলে মানানসই ফন্ট; বেমানান ফন্ট → ডিফল্ট; পুরনো লেখা-ধরন অক্ষত", () => {
  assert.equal(sanitizePrefs({ arScript: "indopak" }).arFont, "alquran-indopak");
  assert.equal(sanitizePrefs({ arScript: "indopak", arFont: "kfgqpc-hafs" }).arFont, "alquran-indopak");
  assert.equal(sanitizePrefs({ arScript: "uthmani", arFont: "alquran-indopak" }).arFont, "kfgqpc-hafs");
  assert.equal(sanitizePrefs({ arScript: "simple", arFont: "alquran-indopak" }).arFont, "amiri-quran");
  assert.equal(switchScript({ ...DEFAULT_PREFS, arFont: "noto-naskh" }, "indopak").arFont, "alquran-indopak");
  assert.equal(switchScript({ ...DEFAULT_PREFS, arScript: "indopak", arFont: "alquran-indopak" }, "simple").arFont, "amiri-quran");
  assert.equal(sanitizePrefs({ arScript: "uthmani", arFont: "me-quran" }).arFont, "me-quran");
});
