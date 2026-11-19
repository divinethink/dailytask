// quranWbw.test.mjs — শব্দে শব্দে অর্থ: pure মিল-যাচাই + ডেটা-ফাইলের অখণ্ডতা (public/quran/v1/wbw-en)।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { alignWords, parseWbwPayload, wbwSupported, sanitizePrefs, DEFAULT_PREFS } from "../src/legacy/quranCore.js";

const read = (p) => JSON.parse(fs.readFileSync(new URL("../public/quran/v1/" + p, import.meta.url), "utf8"));
const pad = (n) => String(n).padStart(3, "0");

test("alignWords: সংখ্যা মিললে জোড়া; না মিললে/অবৈধ হলে null", () => {
  assert.deepEqual(alignWords("أ ب", ["a", "b"]), [{ ar: "أ", en: "a" }, { ar: "ب", en: "b" }]);
  assert.equal(alignWords("أ ب ج", ["a", "b"]), null);
  assert.equal(alignWords("أ", ["a", "b"]), null);
  assert.equal(alignWords("أ ب", null), null);
  assert.equal(alignWords("أ ب", []), null);
  assert.equal(alignWords("أ ب", ["a", ""]), null);
  assert.equal(alignWords(null, ["a"]), null);
});

test("wbwSupported: শুধু উসমানি ও ইন্দো-পাক", () => {
  assert.equal(wbwSupported("uthmani"), true);
  assert.equal(wbwSupported("indopak"), true);
  assert.equal(wbwSupported("simple"), false);
});

test("prefs.wbw: ডিফল্ট বন্ধ; শুধু true মানলে চালু; পুরনো সেভ অক্ষত", () => {
  assert.equal(DEFAULT_PREFS.wbw, false);
  assert.equal(sanitizePrefs(null).wbw, false);
  assert.equal(sanitizePrefs({ wbw: "yes" }).wbw, false);
  assert.equal(sanitizePrefs({ wbw: true }).wbw, true);
  assert.equal(sanitizePrefs({ theme: 2 }).wbw, false);
});

test("parseWbwPayload: সূরা/আয়াত-সংখ্যা না মিললে throw", () => {
  const su = { n: 1, ayahs: 2 };
  assert.deepEqual(parseWbwPayload({ s: 1, w: [["a"], null] }, su), [["a"], null]);
  assert.throws(() => parseWbwPayload({ s: 2, w: [["a"], ["b"]] }, su));
  assert.throws(() => parseWbwPayload({ s: 1, w: [["a"]] }, su));
  assert.throws(() => parseWbwPayload(null, su));
});

test("ডেটা: ১১৪ ফাইল, আয়াত-সংখ্যা মেটার সাথে মেলে; অসম্পূর্ণ আয়াত ঠিক ৩টা (null)", () => {
  const meta = read("meta.json");
  const nulls = [];
  for (const s of meta.surahs) {
    const w = parseWbwPayload(read("wbw-en/" + pad(s.n) + ".json"), s);
    w.forEach((x, i) => { if (x === null) nulls.push(s.n + ":" + (i + 1)); else assert.ok(x.length > 0 && x.every((m) => typeof m === "string" && m)); });
  }
  assert.deepEqual(nulls, ["2:181", "8:6", "13:37"]);
});

test("মিল: উসমানি ও ইন্দো-পাকে মেলে না এমন আয়াত অতি অল্প (≤৫), বাকি সব সঠিক জোড়া", () => {
  const meta = read("meta.json");
  for (const dir of ["ar-uthmani", "ar-indopak-dk"]) {
    let total = 0, bad = 0;
    for (const s of meta.surahs) {
      const ar = read(dir + "/" + pad(s.n) + ".json").a;
      const w = read("wbw-en/" + pad(s.n) + ".json").w;
      ar.forEach((t, i) => { total++; if (w[i] !== null && !alignWords(t, w[i])) bad++; });
    }
    assert.equal(total, 6236);
    assert.ok(bad <= 5, dir + " অমিল " + bad);
  }
});
