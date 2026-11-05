// appDesignCore.js — সবার জন্য এক "অ্যাপ ডিজাইন" ডকের pure logic(Firebase/React নেই, test-যোগ্য)।
// Firestore `publicToolsContent/app_design`: read সবার, write শুধু App Creator(বিদ্যমান Rules)।
// অংশ(key): fieldOverrides, customFields(মূল আমল), tazkirah, homeLayout, prayerLayout, tabLayout। যে অংশ নেই/অবৈধ → বাদ(ডিফল্ট/ফলব্যাক)।
export const DESIGN_SECTION_ID = "app_design";
export const DESIGN_KEYS = ["fieldOverrides", "customFields", "tazkirah", "homeLayout", "prayerLayout", "tabLayout"];
export const MAX_CUSTOM_FIELDS = 200;

const isObj = v => typeof v === "object" && v !== null && !Array.isArray(v);

function validPart(key, v) {
  if (key === "prayerLayout" || key === "customFields") return Array.isArray(v);
  if (key === "homeLayout") return isObj(v) && Array.isArray(v.entry) && Array.isArray(v.below);
  return isObj(v); // fieldOverrides, tazkirah, tabLayout
}

/** কাঁচা doc → শুধু বৈধ অংশের object; কিছুই বৈধ না হলে null। */
export function sanitizeDesign(raw) {
  if (!isObj(raw)) return null;
  const out = {};
  for (const k of DESIGN_KEYS) if (validPart(k, raw[k])) out[k] = raw[k];
  // customFields: শুধু {key:string, label:string}-যুক্ত বস্তু; অবৈধ বাদ, সংখ্যা সীমিত(খালি তালিকা বৈধ = সব মূল-আমল সরানো)
  if (out.customFields) {
    out.customFields = out.customFields.filter(f => isObj(f) && typeof f.key === "string" && f.key && typeof f.label === "string").slice(0, MAX_CUSTOM_FIELDS);
  }
  return Object.keys(out).length ? out : null;
}

export function isDesignKey(k) {
  return DESIGN_KEYS.includes(k);
}
