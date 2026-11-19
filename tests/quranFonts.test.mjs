// tests/quranFonts.test.mjs — ধাপ ৬গ-১: আরবি ফন্ট-তালিকা ও arFont পছন্দ।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QURAN_FONTS, DEFAULT_FONT, SCRIPTS, scriptById, fontById, isValidFont, fontsForScript, fontFitsScript, fontStack, flowLayout } from "../src/legacy/quranFonts.js";
import { sanitizePrefs, DEFAULT_PREFS, switchScript } from "../src/legacy/quranCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("ফন্ট-তালিকা: id অনন্য, ডিফল্ট আছে, প্রতিটার উৎস (file বা google) আছে, লাইসেন্স OFL", () => {
  const ids = QURAN_FONTS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(isValidFont(DEFAULT_FONT));
  for (const f of QURAN_FONTS) {
    assert.ok(f.file || f.google, f.id + ": উৎস নেই");
    assert.ok(f.scripts.length > 0 && f.family && f.name);
    assert.match(f.license, /OFL|KFGQPC|Tanzil/);
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
  for (const sc of SCRIPTS) { assert.ok(fontFitsScript(sc.defaultFont, sc.id)); assert.ok(fontsForScript(sc.id).length >= (sc.id === "indopak" || sc.id === "nastaleeq" ? 1 : 2)); }
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
    const j = JSON.parse(fs.readFileSync(path.join(base, "ar-indopak-dk", String(su.n).padStart(3, "0") + ".json"), "utf8"));
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

test("নাস্তালিক ডেটা: ১১৪ ফাইল, আয়াত-সংখ্যা meta-র সাথে মিল, মোট ৬২৩৬, sha256 ও বিসমিল্লাহ manifest-এর সাথে মিল, নম্বর-শব্দ নেই", async () => {
  const { createHash } = await import("node:crypto");
  const base = path.join(root, "public/quran/v1");
  const meta = JSON.parse(fs.readFileSync(path.join(base, "meta.json"), "utf8"));
  const man = JSON.parse(fs.readFileSync(path.join(base, "manifest.json"), "utf8"));
  const font = JSON.parse(JSON.stringify(QURAN_FONTS.find((f) => f.id === "kfgqpc-nastaleeq")));
  assert.deepEqual(font.scripts, ["nastaleeq"]);
  const all = [];
  for (const su of meta.surahs) {
    const j = JSON.parse(fs.readFileSync(path.join(base, "ar-nastaleeq", String(su.n).padStart(3, "0") + ".json"), "utf8"));
    assert.equal(j.s, su.n);
    assert.equal(j.a.length, su.ayahs);
    assert.ok(j.a.every((x) => typeof x === "string" && x.trim() && !/[\u0660-\u0669]\s*$/.test(x) && !x.includes("\u00a0")), "সূরা " + su.n);
    all.push(...j.a);
  }
  assert.equal(all.length, 6236);
  assert.equal(createHash("sha256").update(all.join("\n")).digest("hex"), man.arabicNastaleeq.sha256);
  assert.equal(scriptById("nastaleeq").bismillah, man.arabicNastaleeq.bismillah);
  assert.equal(all[0], man.arabicNastaleeq.bismillah); // ১:১ নিজেই বিসমিল্লাহ
  assert.ok(!all[7].includes(man.arabicNastaleeq.bismillah)); // ২:১-এ জোড়া নেই
});

test("নাস্তালিক পছন্দ: মানানসই ফন্ট; বেমানান ফন্ট → ডিফল্ট; পুরনো ধরনগুলো অক্ষত", () => {
  assert.equal(sanitizePrefs({ arScript: "nastaleeq" }).arFont, "kfgqpc-nastaleeq");
  assert.equal(sanitizePrefs({ arScript: "nastaleeq", arFont: "alquran-indopak" }).arFont, "kfgqpc-nastaleeq");
  assert.equal(sanitizePrefs({ arScript: "indopak", arFont: "kfgqpc-nastaleeq" }).arFont, "alquran-indopak");
  assert.equal(switchScript({ ...DEFAULT_PREFS, arFont: "noto-naskh" }, "nastaleeq").arFont, "kfgqpc-nastaleeq");
  assert.ok(flowLayout("nastaleeq").sizeScale > 1);
});

test("flowLayout: ডিফল্ট দুই-পাশ-সমান, শেষ লাইন মাঝে; ইন্দো-পাক বড় ও বেশি ফাঁক; এলাইন/ফাঁক বদলায়", () => {
  for (const id of ["simple", "uthmani"]) assert.deepEqual(flowLayout(id), { sizeScale: 1, lineHeight: 2.1, textAlign: "justify", textAlignLast: "center" });
  const ip = flowLayout("indopak");
  assert.ok(ip.sizeScale > 1 && ip.lineHeight > 2.1);
  assert.deepEqual(flowLayout("অচেনা"), flowLayout("simple"));
  assert.equal(flowLayout("simple", "right", "tight").textAlign, "right");
  assert.equal(flowLayout("simple", "right", "tight").textAlignLast, "right");
  assert.equal(flowLayout("simple", "center").textAlignLast, "center");
  assert.ok(flowLayout("simple", "justify", "tight").lineHeight < flowLayout("simple", "justify", "loose").lineHeight);
  assert.deepEqual(flowLayout("simple", "bogus", "bogus"), flowLayout("simple")); // অবৈধ → ডিফল্ট
});

test("sanitizePrefs: arAlign/arGap — পুরনো পছন্দে না থাকলে ডিফল্ট, অবৈধ মান ডিফল্ট", () => {
  const d = sanitizePrefs({ arSize: 30 });
  assert.equal(d.arAlign, "justify");
  assert.equal(d.arGap, "normal");
  assert.equal(sanitizePrefs({ arAlign: "center", arGap: "tight" }).arAlign, "center");
  assert.equal(sanitizePrefs({ arAlign: "x", arGap: 5 }).arGap, "normal");
});

test("@font-face: file-ওয়ালা প্রতিটা ফন্টের নিজের @font-face tailwind.css-এ আছে (না থাকলে ফোনে ফন্ট নামে না)", () => {
  const css = fs.readFileSync(path.join(root, "src/tailwind.css"), "utf8");
  for (const f of QURAN_FONTS.filter((x) => x.file)) {
    assert.ok(css.includes("font-family: '" + f.family + "'"), f.id + ": @font-face নেই");
    assert.ok(css.includes(f.file), f.id + ": ফাইলের পথ মেলেনি");
  }
});

// ───────── অডিট-সংশোধন ─────────
test("প্রতিটা ফন্টের নিজের ফাইল আছে ও tailwind.css-এ @font-face আছে (সব ফন্ট অফলাইনে চলে; Google-নির্ভর নয়)", () => {
  const css = fs.readFileSync(path.join(root, "src", "tailwind.css"), "utf8");
  const notice = fs.readFileSync(path.join(root, "public", "quran", "v1", "fonts", "NOTICE-fonts.txt"), "utf8");
  for (const f of QURAN_FONTS) {
    assert.ok(f.file, f.id + ": নিজের ফাইল নেই");
    assert.equal(f.google, null, f.id + ": বাইরের উৎস");
    const disk = path.join(root, "public", f.file);
    assert.ok(fs.existsSync(disk) && fs.statSync(disk).size > 10000, f.id + ": ফাইল নেই/ছোট");
    assert.ok(css.includes("font-family: '" + f.family + "'") && css.includes(f.file), f.id + ": @font-face নেই");
    assert.ok(notice.includes(path.basename(f.file)), f.id + ": NOTICE-fonts.txt-এ উল্লেখ নেই");
  }
});

test("উসমানি ও IndoPak: প্রতিটা সূরা-ফাইলের SHA-256 integrity-uthmani/integrity-indopak.json-এর সাথে মেলে", async () => {
  const { createHash } = await import("node:crypto");
  for (const [name, dir] of [["integrity-uthmani.json", "ar-uthmani"], ["integrity-indopak.json", "ar-indopak-dk"], ["integrity-nastaleeq.json", "ar-nastaleeq"]]) {
    const integ = JSON.parse(fs.readFileSync(path.join(root, "tools", "quran", name), "utf8"));
    const rels = Object.keys(integ.files);
    assert.equal(rels.length, 114, name);
    for (const rel of rels) {
      assert.ok(rel.startsWith(dir + "/"), rel);
      const buf = fs.readFileSync(path.join(root, "public", "quran", "v1", rel));
      assert.equal(createHash("sha256").update(buf).digest("hex"), integ.files[rel].sha256, rel);
      assert.equal(buf.length, integ.files[rel].bytes, rel);
    }
  }
});
