// hisnCore.js — হিসনুল মুসলিম কার্ডের pure helper (node --test-যোগ্য)।
import { fontFitsScript, DEFAULT_FONT } from "./quranFonts.js";

export const WHEN_FILTERS = [
  { key: "all", label: "সব" },
  { key: "morning", label: "সকাল" },
  { key: "evening", label: "সন্ধ্যা" },
];

// সকাল = সকাল+উভয়+দিনের; সন্ধ্যা = সন্ধ্যা+উভয়+দিনের; সব = সবই।
export function filterByWhen(list, key) {
  if (key !== "morning" && key !== "evening") return list;
  return list.filter((d) => d.when === "both" || d.when === "day" || d.when === key);
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBn = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
export const timesBadge = (d) => (d && d.times > 1 ? toBn(d.times) + " বার" : "");

// হিসনের আরবি "simple" লেখা। পাঠকের বাছা কুরআন-ফন্ট simple-এর সাথে না মিললে (উসমানি/ইন্দো-পাক) ডিফল্ট ফন্ট — নইলে অক্ষর ভাঙে।
export function hisnArabicFont(prefs) {
  return prefs && fontFitsScript(prefs.arFont, "simple") ? prefs.arFont : DEFAULT_FONT;
}

export function copyText(d) {
  const parts = [d.title, d.ar];
  if (d.arNote) parts.push(d.arNote);
  parts.push(d.tr, d.bn);
  if (d.times > 1) parts.push("(" + timesBadge(d) + ")");
  if (d.note) parts.push(d.note);
  return parts.filter(Boolean).join("\n\n");
}
