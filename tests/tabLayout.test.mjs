// চালান: node --test tests/   (কোনো dependency লাগে না)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultOrder, sanitizeOrder, sanitizeHidden, resolveTab, visibleIds, moveId, TAB_DEFS } from "../src/legacy/tabLayout.js";

test("ডিফল্ট: কিছু না থাকলে ডিফল্ট ক্রম, কিছু লুকানো নয়", () => {
  for (const tab of Object.keys(TAB_DEFS)) {
    const r = resolveTab(tab, undefined, undefined);
    assert.deepEqual(r.order, defaultOrder(tab));
    assert.deepEqual(r.hidden, []);
    assert.deepEqual(visibleIds(tab, null), defaultOrder(tab));
  }
});

test("অচেনা/ডুপ্লিকেট/ভুল-টাইপ id বাদ, বাদ-পড়া id শেষে যুক্ত", () => {
  assert.deepEqual(sanitizeOrder("amol", ["dua", "dua", "x", 5, null, "azkar"]).slice(0, 2), ["dua", "azkar"]);
  assert.equal(sanitizeOrder("amol", ["dua"]).length, defaultOrder("amol").length);
  assert.deepEqual(sanitizeOrder("amol", "bad"), defaultOrder("amol"));
});

test("সব কার্ড লুকানো হলে লুকানো তালিকা উপেক্ষা(খালি পেজ নয়)", () => {
  assert.deepEqual(sanitizeHidden("tools", defaultOrder("tools")), []);
  assert.deepEqual(sanitizeHidden("tools", ["quiz", "quiz", "zzz"]), ["quiz"]);
  assert.equal(visibleIds("tools", { toolsHidden: defaultOrder("tools") }).length, defaultOrder("tools").length);
});

test("সময়সূচি: পুরনো prayerLayout fallback, নতুন tabLayout অগ্রাধিকার; নতুন waqt কার্ড শেষে", () => {
  const legacy = ["meal", "schedule", "forbidden", "other"];
  assert.deepEqual(resolveTab("prayer", undefined, legacy).order, ["meal", "schedule", "forbidden", "other", "waqt"]);
  assert.deepEqual(resolveTab("prayer", { prayerOrder: ["waqt"] }, legacy).order.slice(0, 1), ["waqt"]);
  assert.deepEqual(visibleIds("prayer", { prayerHidden: ["forbidden"] }), ["schedule", "other", "meal", "waqt"]);
});

test("moveId সীমার বাইরে গেলে অপরিবর্তিত", () => {
  assert.deepEqual(moveId(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
  assert.deepEqual(moveId(["a", "b", "c"], "a", 1), ["b", "a", "c"]);
});

test("আইডি-সামঞ্জস্য: TAB_DEFS ও আসল UI-এর আইডি হুবহু এক", () => {
  const shell = readFileSync(new URL("../src/components/PublicTools/PublicToolsShell.jsx", import.meta.url), "utf8");
  const front = shell.slice(shell.indexOf("const FRONT_ITEMS"), shell.indexOf("export function PublicToolsShell"));
  const frontIds = [...front.matchAll(/\{ kind: "\w+", (?:id|key): "(\w+)"/g)].map(m => m[1]);
  assert.deepEqual([...frontIds].sort(), [...defaultOrder("tools")].sort());

  const amol = readFileSync(new URL("../src/components/PublicTools/AmolHub.jsx", import.meta.url), "utf8");
  const hub = amol.slice(amol.indexOf("const HUB_ITEMS"), amol.indexOf("export function AmolHub"));
  const hubIds = [...hub.matchAll(/\{ key: "(\w+)"/g)].map(m => m[1]);
  assert.deepEqual([...hubIds, "tasbih"].sort(), [...defaultOrder("amol")].sort());
});
