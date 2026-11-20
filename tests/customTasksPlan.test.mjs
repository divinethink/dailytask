import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeTasks, planTaskChange, setArchived, renameTask, PLAN_LABEL, MAX_ACTIVE } from "../src/legacy/customTasks.js";

test("প্ল্যান শুরু: টাস্ক যোগ, দ্বিতীয়বার নয়", () => {
  const a = planTaskChange([], "khatam", true, "t1");
  assert.equal(a.status, "added");
  assert.deepEqual(a.tasks, [{ id: "t1", label: PLAN_LABEL.khatam, src: "plan_khatam" }]);
  const b = planTaskChange(a.tasks, "khatam", true);
  assert.equal(b.status, "exists");
  assert.equal(b.tasks, a.tasks);
});

test("প্ল্যান মুছলে আর্কাইভ, আবার নিলে ফিরে আসে (নতুন টাস্ক নয়)", () => {
  const a = planTaskChange([], "hifz", true, "h1").tasks;
  const arch = planTaskChange(a, "hifz", false);
  assert.equal(arch.status, "archived");
  assert.equal(arch.tasks[0].archived, true);
  assert.equal(arch.tasks[0].src, "plan_hifz");
  const back = planTaskChange(arch.tasks, "hifz", true);
  assert.equal(back.status, "restored");
  assert.equal(back.tasks.length, 1);
  assert.equal(back.tasks[0].archived, undefined);
});

test("খতম ও হিফজ আলাদা; সীমা পূর্ণ হলে অপরিবর্তিত", () => {
  const full = Array.from({ length: MAX_ACTIVE }, (_, i) => ({ id: "x" + i, label: "টাস্ক " + i }));
  const r = planTaskChange(full, "khatam", true);
  assert.equal(r.status, "full");
  assert.equal(r.tasks, full);
  const k = planTaskChange([], "khatam", true, "k").tasks;
  assert.equal(planTaskChange(k, "hifz", true, "h").tasks.length, 2);
  assert.equal(planTaskChange(k, "hifz", false).status, "none");
});

test("নিজের বানানো একই নামের টাস্ক থাকলে নতুন যোগ হয় না", () => {
  const mine = [{ id: "m", label: PLAN_LABEL.khatam }];
  assert.equal(planTaskChange(mine, "khatam", true).status, "exists");
});

test("src সংরক্ষিত থাকে: sanitize, rename, archive; অচেনা src বাদ", () => {
  const raw = [{ id: "a", label: "কুরআন খতম", src: "plan_khatam" }, { id: "b", label: "অন্য", src: "evil" }];
  const t = sanitizeTasks(raw);
  assert.equal(t[0].src, "plan_khatam");
  assert.equal(t[1].src, undefined);
  assert.equal(renameTask(t, "a", "আমার খতম")[0].src, "plan_khatam");
  const ar = setArchived(t, "a", true);
  assert.deepEqual(ar[0], { id: "a", label: "কুরআন খতম", src: "plan_khatam", archived: true });
  assert.deepEqual(setArchived(ar, "a", false)[0], { id: "a", label: "কুরআন খতম", src: "plan_khatam" });
  assert.equal(planTaskChange([], "bogus", true).status, "none");
});
