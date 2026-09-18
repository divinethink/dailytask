// DhikrCountGuide.jsx — "আমল" হাব, item ১৪-এর সম্প্রসারিত সংস্করণ(3_1 §"আমল
// হাব")। যিকির — নামাজের পর/মাসনূন/পরিস্থিতিভিত্তিক, pure reference। ✏️(accordion)।
// সহজ client-side title-search যোগ করা হয়েছে(সম্পূর্ণ favorite-system এই ধাপে
// scope-এ রাখা হয়নি, effort-নিয়ন্ত্রণে — future-scope হিসেবে রাখা যায়)।
// React global(window.React, globals.js)।

import { SubScreenHeader } from "./SubScreenHeader.jsx";
import { EditableSection } from "./EditableSection.jsx";

const { useState } = React;

const DHIKR_SECTION_ID = "dhikr_guide";

const DHIKR_DEFAULT = [
  { itemId: "dz_subhanallah", title: "সুবহানাল্লাহ(নামাজের পর ৩৩ বার)", body: "প্রতি ফরজ নামাজের পর তাসবীহ হিসেবে ৩৩ বার পড়া(মুসলিম)।" },
  { itemId: "dz_alhamdulillah", title: "আলহামদুলিল্লাহ(নামাজের পর ৩৩ বার)", body: "সুবহানাল্লাহর পরে ৩৩ বার আলহামদুলিল্লাহ পড়া।" },
  { itemId: "dz_allahu_akbar", title: "আল্লাহু আকবার(নামাজের পর ৩৪ বার)", body: "সবশেষে ৩৪ বার আল্লাহু আকবার পড়ে মোট ১০০ পূর্ণ করা।" },
  { itemId: "dz_la_ilaha", title: "লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারীকা লাহু(মাসনূন)", body: "দিনের যেকোনো সময় পড়ার ফজিলতপূর্ণ যিকির — গোলাম আজাদের সমতুল্য সওয়াবের কথা হাদিসে এসেছে।" },
  { itemId: "dz_hawqala", title: "লা হাওলা ওয়ালা কুওয়াতা ইল্লা বিল্লাহ(পরিস্থিতিভিত্তিক)", body: "কোনো কঠিন কাজ/দুশ্চিন্তার সময় পড়ার যিকির — জান্নাতের একটা ধন-ভাণ্ডার বলা হয়েছে(বুখারি-মুসলিম)।" },
  { itemId: "dz_astaghfirullah", title: "আস্তাগফিরুল্লাহ(দিনে বহুবার)", body: "নিয়মিত ইস্তিগফার করা — নবীজি(ﷺ) দিনে বহুবার ইস্তিগফার করতেন।" },
  { itemId: "dz_hasbunallah", title: "হাসবুনাল্লাহু ওয়া নি'মাল ওয়াকীল(কঠিন মুহূর্তে)", body: "আল্লাহই আমাদের জন্য যথেষ্ট, তিনিই উত্তম কর্মবিধায়ক — বিপদ/দুশ্চিন্তার সময় পড়ার যিকির।" },
];

export function DhikrCountGuide({ onBack }) {
  const [query, setQuery] = useState("");

  function filterItems(items) {
    const q = query.trim();
    return q ? items.filter((it) => (it.title || "").includes(q)) : items;
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "যিকির" }),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pb-3" },
      /*#__PURE__*/React.createElement("input", {
        value: query,
        onChange: (e) => setQuery(e.target.value),
        placeholder: "যিকির খুঁজুন...",
        className: "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none",
      })
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      /*#__PURE__*/React.createElement(EditableSection, {
        sectionId: DHIKR_SECTION_ID,
        format: "accordion",
        defaultContent: DHIKR_DEFAULT,
        filterItems,
      })
    )
  );
}
