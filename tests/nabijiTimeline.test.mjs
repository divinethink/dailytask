// চালান: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SLOTS, normalizeSlots, normalizeSlot, slotAt, inSlot, hourLabel, rangeLabel, validateSlot, MAX_ITEMS } from "../src/components/nabijiTimeline.js";
import { CARD_DEFS, sanitizeCards, defaultCards } from "../src/legacy/homeLayout.js";

test("ডিফল্ট: প্রতিটি slot বৈধ এবং প্রতিটি বুলেটে সূত্র আছে", () => {
  assert.ok(DEFAULT_SLOTS.length >= 8);
  DEFAULT_SLOTS.forEach((s) => {
    assert.ok(normalizeSlot(s), s.id);
    assert.equal(validateSlot(s), null, s.id);
    s.items.forEach((it) => assert.ok(it.text && it.src, s.id));
  });
  assert.equal(new Set(DEFAULT_SLOTS.map((s) => s.id)).size, DEFAULT_SLOTS.length);
});

test("ডিফল্ট: ২৪ ঘণ্টার প্রতিটি ঘণ্টা ঠিক একটি slot-এ পড়ে(ফাঁক/ওভারল্যাপ নেই)", () => {
  for (let h = 0; h < 24; h++) {
    const n = DEFAULT_SLOTS.filter((s) => inSlot(h, s)).length;
    assert.equal(n, 1, "ঘণ্টা " + h);
    assert.equal(slotAt(DEFAULT_SLOTS, h).exact, true);
  }
});

test("slotAt: রাত-পেরোনো slot(২২→২৭) মধ্যরাতের পরেও কাজ করে", () => {
  assert.equal(slotAt(DEFAULT_SLOTS, 23).slot.id, "s_sleep");
  assert.equal(slotAt(DEFAULT_SLOTS, 0).slot.id, "s_sleep");
  assert.equal(slotAt(DEFAULT_SLOTS, 2).slot.id, "s_sleep");
  assert.equal(slotAt(DEFAULT_SLOTS, 3).slot.id, "s_lastNight");
  assert.equal(slotAt(DEFAULT_SLOTS, 5).slot.id, "s_fajr");
});

test("slotAt: ফাঁক থাকলে পরের আসন্ন slot, exact=false", () => {
  const gap = [normalizeSlot({ id: "a", title: "ক", from: 6, to: 8, items: [{ text: "x", src: "y" }] }), normalizeSlot({ id: "b", title: "খ", from: 18, to: 20, items: [{ text: "x", src: "y" }] })];
  const r = slotAt(gap, 12);
  assert.equal(r.slot.id, "b");
  assert.equal(r.exact, false);
  assert.equal(slotAt([], 5), null);
});

test("normalizeSlots: doc না থাকলে/ভুল গঠনে/খালি হলে ডিফল্ট", () => {
  assert.equal(normalizeSlots(null), DEFAULT_SLOTS);
  assert.equal(normalizeSlots({ nabijiTimeline: { slots: "x" } }), DEFAULT_SLOTS);
  assert.equal(normalizeSlots({ nabijiTimeline: { slots: [] } }), DEFAULT_SLOTS);
  assert.equal(normalizeSlots({ nabijiTimeline: { slots: [null, 5, { title: "", from: 1, to: 2, items: [] }] } }), DEFAULT_SLOTS);
});

test("normalizeSlots: বৈধ সেভ-করা তালিকা ব্যবহার, ভুলগুলো বাদ, ট্রিম", () => {
  const raw = { nabijiTimeline: { slots: [
    { id: "x", title: "  ফজর  ", from: 5, to: 7, items: [{ text: "  লেখা  ", src: " সূত্র " }, { text: " " }, null] },
    { title: "ভুল সময়", from: 9, to: 9, items: [{ text: "a", src: "b" }] },
    { title: "ভুল ঘণ্টা", from: 30, to: 31, items: [{ text: "a", src: "b" }] },
  ] } };
  const r = normalizeSlots(raw);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { id: "x", icon: "🕌", title: "ফজর", from: 5, to: 7, items: [{ cat: "", text: "লেখা", src: "সূত্র" }] });
});

test("validateSlot: নাম, সময়, বুলেট ও সূত্র বাধ্যতামূলক", () => {
  const ok = { title: "ক", from: 22, to: 27, items: [{ text: "a", src: "b" }] };
  assert.equal(validateSlot(ok), null);
  assert.ok(validateSlot({ ...ok, title: " " }));
  assert.ok(validateSlot({ ...ok, to: 22 }));
  assert.ok(validateSlot({ ...ok, to: 47 }));
  assert.ok(validateSlot({ ...ok, items: [] }));
  assert.ok(validateSlot({ ...ok, items: [{ text: "a", src: "" }] }));
  assert.ok(validateSlot({ ...ok, items: [{ text: "", src: "b" }] }));
  assert.ok(validateSlot({ ...ok, items: Array.from({ length: MAX_ITEMS + 1 }, () => ({ text: "a", src: "b" })) }));
});

test("hourLabel/rangeLabel", () => {
  assert.equal(hourLabel(4), "ভোর 4টা");
  assert.equal(hourLabel(12), "দুপুর 12টা");
  assert.equal(hourLabel(24), "রাত 12টা");
  assert.equal(rangeLabel({ from: 22, to: 27 }), "রাত 10টা – রাত 3টা");
});

test("হোম লেআউট: নতুন কার্ড তাযকিরার ঠিক পরে; পুরনো সেভ-করা লেআউটেও", () => {
  assert.equal(CARD_DEFS.entry[1].id, "nabijiTimeline");
  const d = defaultCards("entry").map((c) => c.id);
  assert.equal(d[0], "tazkirah");
  assert.equal(d[1], "nabijiTimeline");
  const old = defaultCards("entry").filter((c) => c.id !== "nabijiTimeline"); // নতুন কার্ড আসার আগের সেভ-করা তালিকা
  const r = sanitizeCards("entry", old).map((c) => c.id);
  assert.equal(r[1], "nabijiTimeline");
  assert.equal(r.length, old.length + 1);
  const hidden = sanitizeCards("entry", [{ id: "tazkirah", visible: false, fold: "fixed" }, { id: "salah", visible: true, fold: "open" }]);
  assert.equal(hidden[0].visible, false);
  assert.equal(hidden[1].id, "nabijiTimeline");
});

test("বুলেটের ধরন: চেনা মান থাকে, অচেনা মান বাদ", () => {
  const r = normalizeSlot({ id: "c", title: "ক", from: 5, to: 7, items: [{ cat: "family", text: "a", src: "b" }, { cat: "hack", text: "a", src: "b" }] });
  assert.equal(r.items[0].cat, "family");
  assert.equal(r.items[1].cat, "");
  assert.ok(DEFAULT_SLOTS.every((s) => s.items.every((it) => it.cat)));
});
