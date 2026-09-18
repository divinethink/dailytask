// WuduGuide.jsx — "সহায়িকা"→"সালাত ও পবিত্রতা", item ২০ক(3_1)। accordion, প্রতিটা
// ধাপ একটা item।
// React global(window.React, globals.js)।

import { EditableSection } from "./EditableSection.jsx";

const WUDU_DEFAULT = [
  { itemId: "wu_niyyah", title: "নিয়ত করা(সুন্নত)", body: "মনে মনে পবিত্রতা অর্জনের নিয়ত করা — মুখে বলা জরুরি না।" },
  { itemId: "wu_bismillah", title: "বিসমিল্লাহ বলা(সুন্নত)", body: "ওজু শুরুর আগে বিসমিল্লাহ পড়া।" },
  { itemId: "wu_hands", title: "হাত কব্জি পর্যন্ত ৩ বার ধোয়া(সুন্নত)", body: "উভয় হাত আঙুলসহ কব্জি পর্যন্ত ৩ বার ধোয়া।" },
  { itemId: "wu_mouth", title: "কুলি করা(সুন্নত)", body: "৩ বার মুখে পানি নিয়ে কুলি করা।" },
  { itemId: "wu_nose", title: "নাকে পানি দেওয়া(সুন্নত)", body: "৩ বার নাকে পানি টেনে নিয়ে ঝেড়ে ফেলা।" },
  { itemId: "wu_face", title: "সম্পূর্ণ মুখমণ্ডল ৩ বার ধোয়া(ফরজ)", body: "কপালের চুলের গোড়া থেকে থুতনি পর্যন্ত এবং এক কান থেকে অন্য কান পর্যন্ত পুরো মুখ ধোয়া।" },
  { itemId: "wu_arms", title: "কনুইসহ উভয় হাত ৩ বার ধোয়া(ফরজ)", body: "প্রথমে ডান হাত, তারপর বাম হাত — কনুই পর্যন্ত সম্পূর্ণ ধোয়া।" },
  { itemId: "wu_masah_head", title: "সম্পূর্ণ মাথা মাসেহ করা(সুন্নত, ১/৪ অংশ ফরজ)", body: "ভেজা হাত দিয়ে একবার সম্পূর্ণ মাথা মাসেহ করা(ফরজ অংশ ন্যূনতম ১/৪ মাথা)।" },
  { itemId: "wu_ears", title: "কান মাসেহ করা(সুন্নত)", body: "তর্জনী দিয়ে কানের ভিতর ও বৃদ্ধাঙ্গুলি দিয়ে কানের পিছন মাসেহ করা।" },
  { itemId: "wu_feet", title: "টাখনুসহ উভয় পা ৩ বার ধোয়া(ফরজ)", body: "প্রথমে ডান পা, তারপর বাম পা — টাখনু পর্যন্ত সম্পূর্ণ ধোয়া, আঙুলের ফাঁক খিলাল করা মুস্তাহাব।" },
  { itemId: "wu_tartib", title: "ধারাবাহিকতা/তারতিব(সুন্নত)", body: "উপরের ক্রম অনুযায়ী ধারাবাহিকভাবে করা এবং মুওয়ালাত(একটার পর একটা দ্রুত, শুকিয়ে যাওয়ার আগে) বজায় রাখা।" },
];

export function WuduGuide() {
  return /*#__PURE__*/React.createElement(EditableSection, {
    sectionId: "wudu_guide",
    format: "accordion",
    defaultContent: WUDU_DEFAULT,
  });
}
