// appDesignCore.js — সবার জন্য এক "অ্যাপ ডিজাইন" ডকের pure logic(Firebase/React নেই, test-যোগ্য)।
// Firestore `publicToolsContent/app_design`: read সবার, write শুধু App Creator(বিদ্যমান Rules)।
// অংশ(key): fieldOverrides, tazkirah, homeLayout, prayerLayout, tabLayout। যে অংশ নেই/অবৈধ → বাদ(ডিফল্ট/ফলব্যাক)।
export const DESIGN_SECTION_ID = "app_design";
export const DESIGN_KEYS = ["fieldOverrides", "tazkirah", "homeLayout", "prayerLayout", "tabLayout"];

const isObj = v => typeof v === "object" && v !== null && !Array.isArray(v);

function validPart(key, v) {
  if (key === "prayerLayout") return Array.isArray(v);
  if (key === "homeLayout") return isObj(v) && Array.isArray(v.entry) && Array.isArray(v.below);
  return isObj(v); // fieldOverrides, tazkirah, tabLayout
}

/** কাঁচা doc → শুধু বৈধ অংশের object; কিছুই বৈধ না হলে null। */
export function sanitizeDesign(raw) {
  if (!isObj(raw)) return null;
  const out = {};
  for (const k of DESIGN_KEYS) if (validPart(k, raw[k])) out[k] = raw[k];
  return Object.keys(out).length ? out : null;
}

export function isDesignKey(k) {
  return DESIGN_KEYS.includes(k);
}
