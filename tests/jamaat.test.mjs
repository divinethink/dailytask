// চালান: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeJamaat, resolveJamaat, nextJamaatKey, SUGGESTED, isStale } from "../src/legacy/jamaatTimes.js";

const day = (y, m, d) => new Date(y, m - 1, d, 0, 0, 0, 0); // ৩ নভেম্বর ২০২৬ = মঙ্গলবার
const at = (base, hhmm) => { const [h, m] = hhmm.split(":").map(Number); const x = new Date(base); x.setHours(h, m, 0, 0); return x; };
// ঢাকা, ৩ নভেম্বর ২০২৬ (অ্যাপের স্ক্রিনশট, হানাফী)
function sched(d) {
  return { fajr: at(d, "04:48"), sunrise: at(d, "06:05"), dhuhr: at(d, "11:42"), asr: at(d, "15:42"), sunset: at(d, "17:18"), maghrib: at(d, "17:18"), isha: at(d, "18:35"), nextFajr: at(new Date(d.getTime() + 86400000), "04:49") };
}
const cfg = () => sanitizeJamaat({ rules: SUGGESTED.rules, jumuah: SUGGESTED.jumuah, roundTo: 5 });

test("বোর্ডের সাথে মিল: ফজর/যোহর/আসর/মাগরিব/ইশা", () => {
  const d = day(2026, 11, 3);
  const r = resolveJamaat(cfg(), sched(d), d);
  const hm = (x) => `${x.time.getHours()}:${String(x.time.getMinutes()).padStart(2, "0")}`;
  assert.deepEqual(r.map(hm), ["5:40", "13:15", "16:15", "17:30", "19:45"]);
  assert.deepEqual(r.map((x) => x.gapMin), [52, 93, 33, 12, 70]);
  assert.ok(r.every((x) => !x.warn));
});

test("শুক্রবার যোহরের সারি = জুমা(১:৩০)", () => {
  const d = day(2026, 11, 6);
  const r = resolveJamaat(cfg(), sched(d), d);
  assert.equal(r[1].label, "জুমা");
  assert.equal(r[1].time.getHours() + ":" + r[1].time.getMinutes(), "13:30");
});

test("ওয়াক্তের বাইরে/মাকরূহ সময় হলে সতর্কতা", () => {
  const d = day(2026, 11, 3);
  const c = cfg();
  c.rules.fajr = { ...c.rules.fajr, mode: "fixed", fixed: "04:30" }; // শুরুর আগে
  c.rules.asr = { ...c.rules.asr, mode: "fixed", fixed: "17:10" }; // সূর্যাস্তের ১৫ মিনিটের ভিতরে
  c.rules.isha = { ...c.rules.isha, mode: "fixed", fixed: "23:59" }; // ঠিক আছে
  const r = resolveJamaat(c, sched(d), d);
  assert.equal(r[0].warn, "ওয়াক্ত শুরুর আগে");
  assert.equal(r[2].warn, "মাকরূহ সময়ের কাছে");
  assert.equal(r[4].warn, null);
});

test("sanitize: অবৈধ ইনপুট ডিফল্টে ফেরে; সেট-না-থাকলে null", () => {
  assert.equal(sanitizeJamaat(null), null);
  assert.equal(sanitizeJamaat({}), null);
  const c = sanitizeJamaat({ rules: { fajr: { mode: "x", base: "zzz", offset: "abc", fixed: "99:99" } }, jumuah: "25:00", roundTo: 7 });
  assert.equal(c.rules.fajr.mode, "auto");
  assert.equal(c.rules.fajr.base, "sunrise");
  assert.equal(c.rules.fajr.offset, -25);
  assert.equal(c.jumuah, "13:30");
  assert.equal(c.roundTo, 0);
});

test("পরবর্তী জামায়াত ও পুরনো-সেটিং সংকেত", () => {
  const d = day(2026, 11, 3);
  const r = resolveJamaat(cfg(), sched(d), d);
  assert.equal(nextJamaatKey(r, at(d, "14:00")), "asr");
  assert.equal(nextJamaatKey(r, at(d, "23:00")), null);
  assert.equal(isStale({ updatedAt: 1000 }, 1000 + 36 * 86400000), true);
  assert.equal(isStale({ updatedAt: 1000 }, 1000 + 5 * 86400000), false);
});
