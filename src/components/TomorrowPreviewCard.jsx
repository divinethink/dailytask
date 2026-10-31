// "আগামীকাল" কার্ড(রাতে-ভরা অ্যাপের জন্য, owner-approved): কালকের বার ও হিজরি তারিখ অনুযায়ী ছোট
// স্মরণ(জুমা, সোম-বৃহস্পতি সিয়াম, আইয়ামে বীজ, বিশেষ দিন) + ঘুমানোর আগের সুন্নত আমল।
// শুধু দেখায় — কোনো ডেটা পড়ে/লেখে না। হিজরি তারিখ tabular(≈±১ দিন) বলে বিশেষ-দিনের লাইনে "সম্ভাব্য/চাঁদ দেখা সাপেক্ষে" লেখা।
// React global(window.React, globals.js)।
import { getHijriDate, HIJRI_MONTHS_BN } from "../legacy/appHelpers.js";

const WEEKDAYS_BN = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

export function tomorrowNotes(date, hijri) {
  const w = date.getDay();
  const hm = HIJRI_MONTHS_BN.indexOf(hijri.month) + 1;
  const hd = hijri.day;
  const notes = [];
  let special = false;
  const eidDay = (hm === 10 && hd === 1) || (hm === 12 && hd >= 10 && hd <= 13);
  if (w === 5) notes.push({ icon: "🕌", text: "কাল জুমা — গোসল, সূরা কাহফ, বেশি বেশি দুরুদ, আর আগেভাগে মসজিদে যাওয়ার নিয়ত করুন।" });
  if (hm === 9) {
    notes.push({ icon: "🌙", text: "কাল রমযানের রোযা — সাহরি ও নিয়তের কথা ভেবে ঘুমান।" });
  } else if (!eidDay) {
    if (w === 1 || w === 4) notes.push({ icon: "🌿", text: "কাল " + WEEKDAYS_BN[w] + " — সুন্নত সিয়ামের দিন। সিয়ামের নিয়ত করবেন?" });
    if (hd >= 13 && hd <= 15) notes.push({ icon: "🌕", text: "কাল আইয়ামে বীজ (সম্ভাব্য) — মাসের ১৩-১৪-১৫ তারিখের সুন্নত সিয়াম।" });
  }
  if (hm === 1 && hd === 1) { notes.push({ icon: "✨", text: "কাল সম্ভাব্য হিজরি নববর্ষ।" }); special = true; }
  if (hm === 1 && (hd === 9 || hd === 10)) { notes.push({ icon: "🤲", text: "কাল আশুরা-সংশ্লিষ্ট দিন (সম্ভাব্য) — মুহাররমে ৯-১০ বা ১০-১১ তারিখে সিয়াম মুস্তাহাব।" }); special = true; }
  if (hm === 12 && hd === 9) { notes.push({ icon: "⛰️", text: "কাল আরাফাহ দিবস (সম্ভাব্য) — অ-হাজিদের জন্য এদিনের সিয়াম অত্যন্ত ফজিলতপূর্ণ।" }); special = true; }
  if (hm === 10 && hd === 1) { notes.push({ icon: "🌙", text: "কাল সম্ভাব্য ঈদুল ফিতর — এদিন সিয়াম নেই।" }); special = true; }
  if (hm === 12 && hd >= 10 && hd <= 13) { notes.push({ icon: "🌙", text: hd === 10 ? "কাল সম্ভাব্য ঈদুল আজহা — এদিন সিয়াম নেই।" : "কাল আইয়ামে তাশরীক (সম্ভাব্য) — এদিন সিয়াম নেই।" }); special = true; }
  if (hm === 9 && hd === 1) special = true;
  if (hd >= 13 && hd <= 15 && !eidDay) special = true;
  return { notes, special };
}

export function TomorrowPreviewCard({ toBn }) {
  const date = new Date(Date.now() + 86400000);
  const hijri = getHijriDate(date);
  const { notes, special } = tomorrowNotes(date, hijri);
  notes.push({ icon: "🛏️", text: "ঘুমানোর আগে: ওযু, আয়াতুল কুরসী, তিন কুল, তাসবীহে ফাতিমী (৩৩-৩৩-৩৪)।" });

  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)] mt-4" },
    React.createElement(
      "div",
      { className: "flex items-baseline justify-between gap-2 mb-2" },
      React.createElement("h3", { className: "text-sm font-bold text-emerald-950" }, "🌅 আগামীকাল · " + WEEKDAYS_BN[date.getDay()]),
      React.createElement("span", { className: "text-[10px] font-semibold text-slate-400" }, toBn(hijri.day) + " " + hijri.month)
    ),
    React.createElement(
      "ul",
      { className: "space-y-1.5" },
      notes.map((n, i) =>
        React.createElement(
          "li",
          { key: i, className: "flex items-start gap-2 text-[12px] leading-relaxed text-slate-700" },
          React.createElement("span", { "aria-hidden": true, className: "shrink-0" }, n.icon),
          React.createElement("span", null, n.text)
        )
      )
    ),
    special && React.createElement("p", { className: "mt-2 text-[10px] text-slate-400" }, "হিজরি তারিখ ১ দিন এদিক-ওদিক হতে পারে; চাঁদ দেখা সাপেক্ষে।")
  );
}
