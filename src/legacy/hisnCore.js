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
  const parts = [d.title, d.arPre, d.ar, d.arNote, d.tr, d.bn];
  if (d.times > 1) parts.push("(" + timesBadge(d) + ")");
  if (d.note) parts.push(d.note);
  if (d.ref) parts.push("সূত্র: " + d.ref);
  return parts.filter(Boolean).join("\n\n");
}

// অধ্যায়-তালিকা: ব্যাচের অধ্যায় + অধ্যায় ২৭ (সকাল-সন্ধ্যা), অধ্যায়-নম্বর অনুযায়ী সাজানো। batch2 ঐচ্ছিক (নতুন ব্যাচ যুক্ত হলে একই ধাঁচে)।
export function buildChapters(batch1, morning, batch2 = [], batch3 = [], batch4 = [], batch5 = [], batch6 = []) {
  const ch27 = { id: 27, title: "সকাল ও সন্ধ্যার যিকর", duas: morning.map((d) => ({ ...d, ref: d.ref || "" })) };
  return [...batch1, ...batch2, ...batch3, ...batch4, ...batch5, ...batch6, ch27].sort((a, b) => a.id - b.id);
}
