// চালান: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeExtras, extrasFor, validateItem, normalizeItem, builtinId, applyOverrides, makeOverride, splitBullets } from "../src/components/tomorrowExtras.js";

test("normalizeExtras: doc না থাকলে/ভুল গঠনে খালি", () => {
  assert.deepEqual(normalizeExtras(null), { items: [], sleepText: "", overrides: {} });
  assert.deepEqual(normalizeExtras({ homeCardExtras: { items: "x" } }), { items: [], sleepText: "", overrides: {} });
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

test("overrides: ভুল কী/গঠন বাদ, ঠিকগুলো থাকে", () => {
  const e = normalizeExtras({ homeCardExtras: { overrides: {
    b_1: { hidden: true }, b_2: { text: "  নতুন  ", icon: "", title: "শি" }, b_3: { text: " " }, bad: { hidden: true }, b_4: 5,
  } } });
  assert.deepEqual(Object.keys(e.overrides).sort(), ["b_1", "b_2"]);
  assert.equal(e.overrides.b_2.text, "নতুন");
  assert.equal(e.overrides.b_2.icon, "🌿");
  assert.equal(normalizeExtras({ homeCardExtras: { overrides: [1] } }).overrides && Object.keys(normalizeExtras({ homeCardExtras: { overrides: [1] } }).overrides).length, 0);
});

test("builtinId: একই শিরোনামে একই আইডি", () => {
  assert.equal(builtinId("জুমার তিনটি অভ্যাস"), builtinId("জুমার তিনটি অভ্যাস"));
  assert.notEqual(builtinId("ক"), builtinId("খ"));
  assert.match(builtinId("ক"), /^b_\d+$/);
});

test("applyOverrides: লুকানো বাদ, বদলানো লেখা বসে, বাকিরা ও id-হীন অপরিবর্তিত", () => {
  const notes = [{ id: "b_1", tone: "special", title: "ক", text: "ক-লেখা", icon: "🕌", src: "" }, { id: "b_2", tone: "ibadat", title: "খ", text: "খ-লেখা", icon: "📖", src: "s" }, { tone: "time", title: "t", text: "t" }];
  const ov = { b_1: { hidden: true }, b_2: makeOverride({ icon: "🌿", title: "নতুন", text: "বদলানো", src: "" }) };
  const out = applyOverrides(notes, ov);
  assert.equal(out.length, 2);
  assert.equal(out[0].text, "বদলানো");
  assert.equal(out[0].tone, "ibadat");
  assert.equal(out[1].title, "t");
  assert.equal(applyOverrides(notes, {}).length, 3);
  assert.equal(applyOverrides(notes, null).length, 3);
  assert.equal(applyOverrides(notes, ov, (x) => x + "!")[0].text, "বদলানো!");
});

test("makeOverride: খালি লেখায় null", () => {
  assert.equal(makeOverride({ text: "  " }), null);
});

test("splitBullets: বাক্য ধরে ভাগ; একটিমাত্র হলে খালি", () => {
  assert.deepEqual(splitBullets("সূরা কাহফ পড়ুন; নূর ছড়াবে। দরুদ পড়ুন। দোয়া করুন।"), ["সূরা কাহফ পড়ুন; নূর ছড়াবে।", "দরুদ পড়ুন।", "দোয়া করুন।"]);
  assert.deepEqual(splitBullets("প্রথম। নিয়ত করবেন কি?"), ["প্রথম।", "নিয়ত করবেন কি?"]);
  assert.deepEqual(splitBullets("একটাই বাক্য।"), []);
  assert.deepEqual(splitBullets(null), []);
});
