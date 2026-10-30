// কাস্টম টাস্ক (সদস্যভিত্তিক) — pure logic, React/DB নেই। owner-approved।
// member-ডকের ঐচ্ছিক ফিল্ড customTasks: [{ id, label, archived?: true }]।
// না থাকলে/অবৈধ হলে = কোনো টাস্ক নেই(আগের আচরণ)। "ডিলিট" = আর্কাইভ: এন্ট্রির পুরনো ডেটা কখনো মোছা হয় না,
// যেকোনো সময় ফিরিয়ে আনা যায়। আর্কাইভ হলে ফর্ম ও হিসাব(শতকরাসহ) থেকে বাদ যায়।

export const MAX_ACTIVE = 20;
export const MAX_TOTAL = 40; // সক্রিয় + আর্কাইভ; Rules-এর সীমার সাথে মেলে
export const MAX_LABEL = 60;
export const TASK_KEY_PREFIX = "ctask_";

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
    out.push(it.archived === true ? { id: it.id, label, archived: true } : { id: it.id, label });
  }
  return out;
}

export const activeTasks = tasks => tasks.filter(t => !t.archived);
export const archivedTasks = tasks => tasks.filter(t => t.archived);

export function newTaskId() {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const clean = label => String(label || "").trim().slice(0, MAX_LABEL);

/** নতুন টাস্ক। খালি/ডুপ্লিকেট নাম বা সীমা পার হলে একই তালিকা(একই reference) ফেরত। */
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
    return archived ? { id: t.id, label: t.label, archived: true } : { id: t.id, label: t.label };
  });
}

/** হিসাবের জন্য ফিল্ড-তালিকা(শুধু সক্রিয়)। বাকি ফিল্ডের মতোই bool; কী = ctask_<id>। */
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
