// FullDayAmol.jsx — "আমল" হাব, item ৪ক(3_1 §"আমল হাব")। সারাদিনের আমল, pure
// reference। ✏️(accordion)। নোট(3_1 §চ): এই আইটেমের পূর্ণাঙ্গ কনটেন্ট-লিস্ট
// owner পরবর্তীতে সরবরাহ করবেন — তাই নিচের default একটা সাধারণ/সংক্ষিপ্ত সেট,
// App Creator নিজে UI থেকে পুরোপুরি প্রতিস্থাপন করতে পারবেন(§২ Fallback নীতি)।
// React global(window.React, globals.js)।

import { SubScreenHeader } from "./SubScreenHeader.jsx";
import { EditableSection } from "./EditableSection.jsx";

const FULL_DAY_DEFAULT = [
  { itemId: "fd_wudu", title: "সবসময় ওজু অবস্থায় থাকার চেষ্টা করা", body: "ওজু ভাঙলে দ্রুত পুনরায় ওজু করে নেওয়া — ছোট কিন্তু ধারাবাহিক আমল।" },
  { itemId: "fd_salat_time", title: "ওয়াক্তমতো সালাত আদায় করা", body: "প্রতিটা ওয়াক্তের সালাত সময়মতো, সম্ভব হলে জামাআতে আদায় করা।" },
  { itemId: "fd_quran", title: "কুরআন তেলাওয়াত করা", body: "দিনে অন্তত কিছু সময় কুরআন তেলাওয়াতের জন্য রাখা — অল্প হলেও নিয়মিত।" },
  { itemId: "fd_durud", title: "বেশি বেশি দুরুদ পড়া", body: "দিনের বিভিন্ন সময়ে নবীজি(ﷺ)-এর প্রতি দুরুদ পাঠ করা।" },
  { itemId: "fd_sadaqa", title: "সদকা/দান করা", body: "সামর্থ্য অনুযায়ী ছোট হলেও কিছু সদকা করার অভ্যাস রাখা।" },
  { itemId: "fd_good_words", title: "ভালো কথা বলা, গীবত/মিথ্যা থেকে বিরত থাকা", body: "জিহ্বার হেফাজত — অহেতুক কথা, গীবত ও মিথ্যা এড়িয়ে চলা।" },
  { itemId: "fd_parents", title: "মা-বাবা ও আত্মীয়দের সাথে সদাচরণ", body: "দিনের মধ্যে অন্তত একবার মা-বাবা/আত্মীয়দের খোঁজ নেওয়া বা সাহায্য করা।" },
];

export function FullDayAmol({ onBack }) {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "সারাদিনের আমল" }),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      /*#__PURE__*/React.createElement(EditableSection, {
        sectionId: "full_day_amol",
        format: "accordion",
        defaultContent: FULL_DAY_DEFAULT,
      })
    )
  );
}
