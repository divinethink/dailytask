// কাস্টম টাস্ক (সদস্যভিত্তিক) — pure logic, React/DB নেই। owner-approved।
// member-ডকের ঐচ্ছিক ফিল্ড customTasks: [{ id, label, archived?: true }]।
// না থাকলে/অবৈধ হলে = কোনো টাস্ক নেই (আগের আচরণ)। "ডিলিট" = আর্কাইভ: এন্ট্রির পুরনো ডেটা কখনো মোছা হয় না,
// যেকোনো সময় ফিরিয়ে আনা যায়। আর্কাইভ হলে ফর্ম ও হিসাব (শতকরাসহ) থেকে বাদ যায়।

export const MAX_ACTIVE = 20;
export const MAX_TOTAL = 40; // সক্রিয় + আর্কাইভ; Rules-এর সীমার সাথে মেলে
export const MAX_LABEL = 60;
export const TASK_KEY_PREFIX = "ctask_";

// প্ল্যান থেকে নিজে-তৈরি টাস্কের চিহ্ন (ঐচ্ছিক ফিল্ড src)। নতুন কিছু যোগ হলে এখানেই; অচেনা মান বাদ পড়ে।
export const PLAN_SRC = { khatam: "plan_khatam", hifz: "plan_hifz" };
export const PLAN_LABEL = { khatam: "কুরআন খতম", hifz: "কুরআন হিফজ" };
const VALID_SRC = new Set(Object.values(PLAN_SRC));

const isObj = v => typeof v === "object" && v !== null && !Array.isArray(v);

/** সেভ-করা মান → বৈধ তালিকা। অবৈধ/ডুপ্লিকেট-id/খালি-নাম বাদ; নাম ছাঁটা ও দৈর্ঘ্য-সীমিত। */
export function sanitizeTasks(raw) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  const seen = new Set();
  for (const it of raw.slice(0, MAX_TOTAL)) {
    if (!isObj(it) || typeof it.id !== "string" || !it.id || it.id.length > 30 || seen.has(it.id)) continue;
    const label = typeof it.label === "string" ? it.label.trim().slice(0, MAX_LABEL) : "";
    if (!label) continue;
    seen.add(it.id);
    const o = { id: it.id, label };
    if (typeof it.src === "string" && VALID_SRC.has(it.src)) o.src = it.src;
    if (it.archived === true) o.archived = true;
    out.push(o);
  }
  return out;
}

export const activeTasks = tasks => tasks.filter(t => !t.archived);
export const archivedTasks = tasks => tasks.filter(t => t.archived);

export function newTaskId() {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const clean = label => String(label || "").trim().slice(0, MAX_LABEL);

/** নতুন টাস্ক। খালি/ডুপ্লিকেট নাম বা সীমা পার হলে একই তালিকা (একই reference) ফেরত। */
export function addTask(tasks, label, id) {
  const l = clean(label);
  if (!l || tasks.length >= MAX_TOTAL || activeTasks(tasks).length >= MAX_ACTIVE) return tasks;
  if (activeTasks(tasks).some(t => t.label === l)) return tasks;
  return [...tasks, { id: id || newTaskId(), label: l }];
}

export function renameTask(tasks, id, label) {
  const l = clean(label);
  const cur = tasks.find(t => t.id === id);
  if (!cur || !l || l === cur.label) return tasks;
  if (!cur.archived && activeTasks(tasks).some(t => t.id !== id && t.label === l)) return tasks;
  return tasks.map(t => (t.id === id ? { ...t, label: l } : t));
}

/** আর্কাইভ/ফিরিয়ে আনা। ফেরানোর সময় সক্রিয়-সীমা পার হলে অপরিবর্তিত। */
export function setArchived(tasks, id, archived) {
  const cur = tasks.find(t => t.id === id);
  if (!cur || !!cur.archived === !!archived) return tasks;
  if (!archived && activeTasks(tasks).length >= MAX_ACTIVE) return tasks;
  return tasks.map(t => {
    if (t.id !== id) return t;
    const { archived: _a, ...rest } = t;
    return archived ? { ...rest, archived: true } : rest;
  });
}

/**
 * খতম/হিফজ প্ল্যানের সাথে যুক্ত কাস্টম টাস্ক।
 * on=true: নেই → যোগ; আর্কাইভ করা থাকলে → ফিরিয়ে আনা; সক্রিয় আছে (বা একই নামের নিজের বানানো টাস্ক আছে) → অপরিবর্তিত।
 * on=false: সক্রিয় প্ল্যান-টাস্ক আর্কাইভ (এন্ট্রির ডেটা অক্ষত)।
 * ফেরত { tasks, status }: status = added | restored | exists | full | archived | none। সীমা পার হলে tasks অপরিবর্তিত ("full")।
 */
export function planTaskChange(tasks, mode, on, id) {
  const src = PLAN_SRC[mode];
  if (!src) return { tasks, status: "none" };
  const mine = tasks.find(t => t.src === src);
  if (!on) {
    if (!mine || mine.archived) return { tasks, status: "none" };
    return { tasks: setArchived(tasks, mine.id, true), status: "archived" };
  }
  if (mine && !mine.archived) return { tasks, status: "exists" };
  if (activeTasks(tasks).length >= MAX_ACTIVE || tasks.length >= MAX_TOTAL) {
    return { tasks, status: mine ? "full" : "full" };
  }
  if (mine) return { tasks: setArchived(tasks, mine.id, false), status: "restored" };
  const label = PLAN_LABEL[mode];
  if (activeTasks(tasks).some(t => t.label === label)) return { tasks, status: "exists" };
  return { tasks: [...tasks, { id: id || newTaskId(), label, src }], status: "added" };
}

/** হিসাবের জন্য ফিল্ড-তালিকা (শুধু সক্রিয়)। বাকি ফিল্ডের মতোই bool; কী = ctask_<id>। */
export function taskFields(rawTasks) {
  return activeTasks(sanitizeTasks(rawTasks)).map(t => ({
    key: TASK_KEY_PREFIX + t.id,
    label: t.label,
    shortLabel: t.label,
    type: "bool",
    isCustom: true,
    isMemberTask: true
  }));
}
