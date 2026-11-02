// চালান: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeExtras, extrasFor, validateItem, normalizeItem } from "../src/components/tomorrowExtras.js";

test("normalizeExtras: doc না থাকলে/ভুল গঠনে খালি", () => {
  assert.deepEqual(normalizeExtras(null), { items: [], sleepText: "" });
  assert.deepEqual(normalizeExtras({ homeCardExtras: { items: "x" } }), { items: [], sleepText: "" });
  assert.deepEqual(normalizeExtras({ homeCardExtras: { items: [null, 5, { text: "  " }] } }).items, []);
});

test("normalizeItem: ডিফল্ট, ট্রিম, বার-যাচাই", () => {
  const it = normalizeItem({ id: "a", w: 9, text: "  হ্যালো  " });
  assert.equal(it.w, -1);
  assert.equal(it.text, "হ্যালো");
  assert.equal(it.icon, "🌿");
  assert.equal(normalizeItem({ w: "2", text: "x" }).w, 2);
});

test("extrasFor: প্রতিদিন + নির্দিষ্ট বার", () => {
  const e = normalizeExtras({ homeCardExtras: { items: [
    { id: "1", w: 2, text: "মঙ্গল" }, { id: "2", w: -1, text: "রোজ" }, { id: "3", w: 4, text: "বৃহস্পতি" },
  ] } });
  assert.deepEqual(extrasFor(e, 2).map((n) => n.text), ["মঙ্গল", "রোজ"]);
  assert.deepEqual(extrasFor(e, 0).map((n) => n.text), ["রোজ"]);
});

test("validateItem", () => {
  assert.ok(validateItem({ text: "  " }));
  assert.equal(validateItem({ text: "ঠিক আছে" }), null);
  assert.ok(validateItem({ text: "ক".repeat(701) }));
});

test("sleepText ও দৈর্ঘ্য-সীমা", () => {
  assert.equal(normalizeExtras({ homeCardExtras: { sleepText: " নতুন " } }).sleepText, "নতুন");
  assert.equal(normalizeItem({ text: "ক".repeat(900) }).text.length, 700);
});
