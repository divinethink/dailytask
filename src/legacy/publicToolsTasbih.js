// publicToolsTasbih.js — তাসবীহ কাউন্টার, Phase A item ৩(3_1_Public_Tools_Roadmap.md)।
// Pure per-device localStorage — শুধু ঐচ্ছিক target সংরক্ষণ করে(3_2 §৩:
// "তাসবীহ target(ঐচ্ছিক, counter-এর নিজস্ব সেটিং, checklist না)")। চলমান
// গণনা(running count) সংরক্ষিত হয় না(3_2 §৩-এর storage-table-এ শুধু target-key
// আছে) — tab reload/session-শেষে ০-তে ফিরে আসাই ইচ্ছাকৃত ডিজাইন।
// data/ layer convention(Dev Rule ২): এই ফাইলে কোনো UI/JSX নেই।

const TASBIH_TARGET_KEY = "dt_pt_tasbih_target";

export const TASBIH_TARGET_OPTIONS = [33, 99, 1000];

function getSavedTasbihTarget() {
  try {
    const raw = localStorage.getItem(TASBIH_TARGET_KEY);
    const n = raw ? Number(raw) : null;
    return TASBIH_TARGET_OPTIONS.includes(n) ? n : TASBIH_TARGET_OPTIONS[1]; // default ৯৯
  } catch {
    return TASBIH_TARGET_OPTIONS[1];
  }
}

function saveTasbihTarget(target) {
  try {
    localStorage.setItem(TASBIH_TARGET_KEY, String(target));
  } catch {
    // localStorage অনুপলব্ধ হলে silently skip(non-critical ঐচ্ছিক সেটিং)
  }
}

export { getSavedTasbihTarget, saveTasbihTarget };
