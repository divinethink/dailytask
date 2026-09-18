// DailyAmolChallenge.jsx — "আমল" হাব, item ২৯(দৈনিক আমল-চ্যালেঞ্জ, 3_1 §"আমল
// হাব")। date-based deterministic rotate(`3_2` লাইন ২০৪, RotatingCard.jsx reuse)।
// React global(window.React, globals.js)।

import { SubScreenHeader } from "./SubScreenHeader.jsx";
import { RotatingCard } from "./RotatingCard.jsx";

const CHALLENGE_DEFAULT = [
  { itemId: "ch_durud100", title: "আজকের চ্যালেঞ্জ", body: "আজ কমপক্ষে ১০০ বার দুরুদ শরীফ পড়ার চেষ্টা করুন।" },
  { itemId: "ch_sadaqa", title: "আজকের চ্যালেঞ্জ", body: "আজ কাউকে না জানিয়ে ছোট একটা সদকা করুন।" },
  { itemId: "ch_quran_page", title: "আজকের চ্যালেঞ্জ", body: "আজ কুরআনের অন্তত এক পৃষ্ঠা তেলাওয়াত করুন, অর্থ বুঝে পড়ার চেষ্টা করুন।" },
  { itemId: "ch_forgive", title: "আজকের চ্যালেঞ্জ", body: "আজ কারো প্রতি মনে থাকা কোনো ক্ষোভ ক্ষমা করে দিন।" },
  { itemId: "ch_parents_call", title: "আজকের চ্যালেঞ্জ", body: "আজ মা-বাবা বা কোনো প্রবীণ আত্মীয়কে ফোন করে খোঁজ নিন।" },
  { itemId: "ch_istighfar100", title: "আজকের চ্যালেঞ্জ", body: "আজ ১০০ বার আস্তাগফিরুল্লাহ পড়ুন।" },
  { itemId: "ch_smile", title: "আজকের চ্যালেঞ্জ", body: "আজ পরিচিত সবাইকে হাসিমুখে সালাম দিন — হাসাও সদকা।" },
];

export function DailyAmolChallenge({ onBack }) {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "দৈনিক আমল-চ্যালেঞ্জ" }),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      /*#__PURE__*/React.createElement(RotatingCard, {
        sectionId: "daily_amol_challenge",
        defaultContent: CHALLENGE_DEFAULT,
        cardIcon: "✨",
      })
    )
  );
}
