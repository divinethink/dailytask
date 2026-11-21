// tests/tafsirMarks.test.mjs — তাফসির-মার্কের pure লজিক + আসল ডেটা-ফাইল (দুই তাফসিরেই offset মেলে)।
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tafsirMarkKey, layoutParas, parasFromIk, parasFromFm } from "../src/legacy/tafsirMarks.js";
import { buildSegments, makeMark, sanitizeMarks, validMarks, COLORS } from "../src/legacy/readerCore.js";
import { tafsirBlocks } from "../src/legacy/quranTafsir.js";
import { fmBlocks } from "../src/legacy/quranTafsirFm.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "quran", "v1", "tafsir");

test("key: দুই তাফসির আলাদা, Firestore-নিরাপদ, ≤১০০", () => {
  assert.equal(tafsirMarkKey("ik", 2, 1), "tf_ik_2_1");
  assert.equal(tafsirMarkKey("fm", 114, 6), "tf_fm_114_6");
  assert.notEqual(tafsirMarkKey("ik", 2, 1), tafsirMarkKey("fm", 2, 1));
  assert.match(tafsirMarkKey("xx", 1, 1), /^tf_ik_/);
  assert.ok(tafsirMarkKey("ik", 2, 1).length <= 100);
});

test("layoutParas: offset মেলে, অনুচ্ছেদ \\n\\n-এ ভাগ, খালি বাদ", () => {
  const L = layoutParas([
    { segs: [{ t: "আলিফ ", b: false }, { t: "লাম", b: true }] },
    { segs: [] },
    { ar: true, segs: [{ t: "الم" }] },
  ]);
  assert.equal(L.text, "আলিফ লাম\n\nالم");
  assert.equal(L.items.length, 2);
  assert.equal(L.items[0].segs[1].b, true);
  assert.equal(L.text.slice(L.items[0].segs[1].s, L.items[0].segs[1].e), "লাম");
  assert.equal(L.items[1].ar, true);
  assert.equal(L.text.slice(L.items[1].s, L.items[1].e), "الم");
  assert.deepEqual(layoutParas(null), { text: "", items: [], cuts: [] });
});

test("মার্ক: অনুচ্ছেদ পেরিয়েও বৈধ; প্রতিটা সেগমেন্ট একটাই অনুচ্ছেদের ভেতরে", () => {
  const L = layoutParas([{ segs: [{ t: "এক দুই", b: false }] }, { segs: [{ t: "তিন চার", b: true }] }]);
  const m = makeMark(L.text, { s: 3, e: 11 }, "hl", COLORS[1], "id1");
  assert.ok(m);
  assert.equal(sanitizeMarks([m]).length, 1);
  assert.equal(validMarks([m], L.text).length, 1);
  assert.equal(validMarks([m], L.text + "x").length, 1);
  assert.equal(validMarks([m], "অন্য লেখা").length, 0); // লেখা বদলালে লুকানো, মোছা নয়
  const segs = buildSegments(L.text, [m], L.cuts);
  for (const g of segs) {
    const inPara = L.items.some((it) => g.s >= it.s && g.e <= it.e);
    const inGap = !inPara && L.text.slice(g.s, g.e) === "\n\n";
    assert.ok(inPara || inGap);
  }
  assert.equal(segs.map((g) => L.text.slice(g.s, g.e)).join(""), L.text);
});

function check(L, label) {
  for (const it of L.items) {
    let at = it.s;
    for (const x of it.segs) { assert.equal(x.s, at, label); at = x.e; }
    assert.equal(at, it.e, label);
  }
  const segs = buildSegments(L.text, [], L.cuts);
  assert.equal(segs.map((g) => L.text.slice(g.s, g.e)).join(""), L.text, label);
  for (const g of segs) assert.ok(L.items.some((it) => g.s >= it.s && g.e <= it.e) || L.text.slice(g.s, g.e) === "\n\n", label);
}

test("আসল ডেটা: ইবনে কাসীর — সব সূরার সব ভাগে offset-কাঠামো ঠিক", () => {
  const dir = path.join(root, "ibn-kathir-bn");
  let groups = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /^\d{3}\.json$/.test(x))) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const [from, , html] of p.g) {
      const L = layoutParas(parasFromIk(tafsirBlocks(html)));
      check(L, f + ":" + from);
      groups++;
    }
  }
  assert.ok(groups > 0);
});

test("আসল ডেটা: ফাতহুল মাজীদ — সব সূরার সব ভাগে offset-কাঠামো ঠিক", () => {
  const dir = path.join(root, "fathul-majid-bn");
  let groups = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /^\d{3}\.json$/.test(x))) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const g of p.g) {
      if (!g || typeof g.t !== "string") continue;
      check(layoutParas(parasFromFm(fmBlocks(g.t))), f + ":" + g.a);
      groups++;
    }
  }
  assert.ok(groups > 0);
});
