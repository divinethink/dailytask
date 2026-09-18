// IstikharaGuide.jsx — "সহায়িকা"→"সালাত ও পবিত্রতা", item ২০গ(3_1)। accordion।
// নোট(3_1 §চ): এই আইটেমের পূর্ণাঙ্গ কনটেন্ট owner পরবর্তীতে সরবরাহ করবেন — তাই
// নিচের default সংক্ষিপ্ত/জেনেরিক, App Creator UI থেকে replace করতে পারবেন।
// React global(window.React, globals.js)।

import { EditableSection } from "./EditableSection.jsx";

const ISTIKHARA_DEFAULT = [
  { itemId: "is_when", title: "কখন পড়া হয়", body: "কোনো বিষয়ে সিদ্ধান্তহীনতায়(বিয়ে, চাকরি, সফর ইত্যাদি) আল্লাহর কাছে সঠিক পথ চেয়ে এই নামাজ পড়া হয়।" },
  { itemId: "is_method", title: "পদ্ধতি", body: "২ রাকাত নফল নামাজ পড়া(ফরজ নামাজের সময় ব্যতীত যেকোনো সময়) — সাধারণ নফল নামাজের মতোই।" },
  { itemId: "is_dua", title: "নামাজের পরের দোয়া", body: "আল্লাহুম্মা ইন্নি আসতাখিরুকা বিইলমিকা... — নির্দিষ্ট বিষয়ের নাম উল্লেখ করে হৃদয় থেকে দোয়া করা। (বিস্তারিত সম্পূর্ণ দোয়া ও নিয়ম শীঘ্রই যোগ হবে।)" },
];

export function IstikharaGuide() {
  return /*#__PURE__*/React.createElement(EditableSection, {
    sectionId: "istikhara_guide",
    format: "accordion",
    defaultContent: ISTIKHARA_DEFAULT,
  });
}
