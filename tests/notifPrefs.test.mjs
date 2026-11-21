import test from "node:test";
import assert from "node:assert/strict";
import { defaultNotifPrefs, sanitizeNotifPrefs, countEnabled, loadNotifPrefs, saveNotifPrefs } from "../src/legacy/notifPrefs.js";

test("ভাঙা ইনপুটে ডিফল্ট", () => {
  for (const bad of [null, undefined, 5, "x", [], { prayer: 3 }]) {
    assert.deepEqual(sanitizeNotifPrefs(bad), defaultNotifPrefs());
  }
});
test("অবৈধ মান ডিফল্টে ফেরে, অজানা ফিল্ড বাদ", () => {
  const p = sanitizeNotifPrefs({ weekly: { on: true, time: "03:00" }, daily: { on: true, time: "22:00" }, prayer: { which: ["fajr", "zzz"], lead: "bad" }, hack: 1 });
  assert.equal(p.weekly.time, "21:00");
  assert.equal(p.daily.time, "22:00");
  assert.deepEqual(p.prayer.which, ["fajr"]);
  assert.equal(p.prayer.lead, "start");
  assert.equal("hack" in p, false);
});
test("countEnabled", () => {
  const p = defaultNotifPrefs();
  assert.equal(countEnabled(p), 0);
  p.daily.on = true; p.prayer.on = true;
  assert.equal(countEnabled(p), 2);
});
test("load/save: localStorage না থাকলেও crash নয়", () => {
  assert.deepEqual(loadNotifPrefs("u1"), defaultNotifPrefs());
  assert.equal(saveNotifPrefs("u1", defaultNotifPrefs()), false);
});
