// tests/quranFonts.test.mjs — ধাপ ৬গ-১: আরবি ফন্ট-তালিকা ও arFont পছন্দ।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QURAN_FONTS, DEFAULT_FONT, fontById, isValidFont, fontsForScript, fontStack } from "../src/legacy/quranFonts.js";
import { sanitizePrefs, DEFAULT_PREFS } from "../src/legacy/quranCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("ফন্ট-তালিকা: id অনন্য, ডিফল্ট আছে, প্রতিটার উৎস (file বা google) আছে, লাইসেন্স OFL", () => {
  const ids = QURAN_FONTS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(isValidFont(DEFAULT_FONT));
  for (const f of QURAN_FONTS) {
    assert.ok(f.file || f.google, f.id + ": উৎস নেই");
    assert.ok(f.scripts.length > 0 && f.family && f.name);
    assert.match(f.license, /OFL/);
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
