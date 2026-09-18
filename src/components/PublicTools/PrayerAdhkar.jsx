// PrayerAdhkar.jsx — "আমল" হাব, item ৮("নামাজের আগে/পরের দোয়া", 3_1 §"আমল হাব"
// item ৫-এর অংশ)। accordion format, pure reference। DuaSection.jsx-এর ভিতরে
// একটা ট্যাব হিসেবে ব্যবহৃত হয়(DuaFlashcards.jsx-এর সাথে "দু'আ" hub-item একত্রে)।
// React global(window.React, globals.js)।

import { EditableSection } from "./EditableSection.jsx";

const PRAYER_ADHKAR_DEFAULT = [
  { itemId: "pa_iftitah", title: "দোয়ায়ে ইস্তেফতাহ(তাকবিরে তাহরিমার পর)", body: "সুবহানাকাল্লাহুম্মা ওয়া বিহামদিকা, ওয়া তাবারাকাসমুকা, ওয়া তাআলা জাদ্দুকা, ওয়ালা ইলাহা গাইরুক — নামাজ শুরুতে ছানা।" },
  { itemId: "pa_ruku", title: "রুকুর তাসবীহ", body: "সুবহানা রব্বিয়াল আজিম(৩ বার) — রুকুতে পড়ার তাসবীহ।" },
  { itemId: "pa_sujud", title: "সিজদার তাসবীহ", body: "সুবহানা রব্বিয়াল আ'লা(৩ বার) — সিজদায় পড়ার তাসবীহ।" },
  { itemId: "pa_tashahhud", title: "তাশাহহুদ", body: "আত্তাহিয়্যাতু লিল্লাহি ওয়াস সালাওয়াতু ওয়াত্তাইয়িবাত... — বৈঠকে পড়া, দুরুদ শরীফসহ শেষ করা হয়।" },
  { itemId: "pa_after_salam", title: "সালামের পরের দোয়া/যিকির", body: "আস্তাগফিরুল্লাহ(৩ বার) + আল্লাহুম্মা আনতাস সালামু ওয়া মিনকাস সালাম... — সালামের পরপরই পড়া।" },
  { itemId: "pa_qunut", title: "দোয়া কুনুত(বিতর নামাজে)", body: "আল্লাহুম্মাহদিনি ফিমান হাদাইত... — বিতর নামাজের শেষ রাকাতে রুকুর আগে পড়া।" },
];

export function PrayerAdhkar() {
  return /*#__PURE__*/React.createElement(EditableSection, {
    sectionId: "dua_prayer",
    format: "accordion",
    defaultContent: PRAYER_ADHKAR_DEFAULT,
  });
}
