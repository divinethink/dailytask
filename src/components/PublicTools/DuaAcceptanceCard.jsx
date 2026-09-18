// DuaAcceptanceCard.jsx — "আমল" হাব, item ১৩(দোয়া কবুলের সময়, 3_1 §"আমল হাব")।
// richtext format, pure reference।
// React global(window.React, globals.js)।

import { SubScreenHeader } from "./SubScreenHeader.jsx";
import { EditableSection } from "./EditableSection.jsx";

const DUA_ACCEPTANCE_DEFAULT = [
  "রাতের শেষ তৃতীয়াংশ — আল্লাহ তাআলা প্রতি রাতের শেষ তৃতীয়াংশে দুনিয়ার আকাশে নেমে আসেন এবং বান্দার দোয়া কবুল করেন(বুখারি-মুসলিম)।",
  "আজান ও ইকামতের মধ্যবর্তী সময় — এই সময়ের দোয়া ফিরিয়ে দেওয়া হয় না(তিরমিযি, আবু দাউদ)।",
  "জুমার দিনের একটা নির্দিষ্ট মুহূর্ত — জুমার দিনে এমন একটা সময় আছে যখন কোনো মুসলিম বান্দা নামাজরত অবস্থায় আল্লাহর কাছে কিছু চাইলে তিনি তা দেন — সাধারণত আসরের পর থেকে মাগরিবের আগ পর্যন্ত সময়টাকে অগ্রাধিকার দেওয়া হয়(বুখারি-মুসলিম)।",
  "সিজদারত অবস্থায় — বান্দা তার রবের সবচেয়ে নিকটবর্তী থাকে সিজদায়, তাই সিজদায় বেশি বেশি দোয়া করা(মুসলিম)।",
  "রোজাদারের ইফতারের সময় — রোজাদার ব্যক্তির ইফতারের সময়ের দোয়া ফিরিয়ে দেওয়া হয় না(তিরমিযি)।",
  "সফরে থাকা অবস্থায় — মুসাফিরের দোয়া কবুলযোগ্য দোয়ার মধ্যে অন্যতম(তিরমিযি)।",
  "বৃষ্টি বর্ষণের সময় — বৃষ্টির সময় দোয়া করলে তা কবুল হওয়ার আশা করা হয়(হাদিসে বর্ণিত)।",
  "মজলুমের দোয়া — নির্যাতিত ব্যক্তির দোয়া ও আল্লাহর মাঝে কোনো পর্দা থাকে না, সে পাপী হলেও(বুখারি-মুসলিম)।",
].join("\n\n");

export function DuaAcceptanceCard({ onBack }) {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "দোয়া কবুলের সময়" }),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      /*#__PURE__*/React.createElement(EditableSection, {
        sectionId: "dua_acceptance_times",
        format: "richtext",
        defaultContent: DUA_ACCEPTANCE_DEFAULT,
      })
    )
  );
}
