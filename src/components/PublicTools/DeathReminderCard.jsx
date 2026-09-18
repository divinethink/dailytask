// DeathReminderCard.jsx — "আমল" হাব, item ৩১(মৃত্যুর স্মরণ, 3_1 §"আমল হাব")।
// date-based deterministic rotate(`3_2` লাইন ২০৪, RotatingCard.jsx reuse)।
// React global(window.React, globals.js)।

import { SubScreenHeader } from "./SubScreenHeader.jsx";
import { RotatingCard } from "./RotatingCard.jsx";

const DEATH_REMINDER_DEFAULT = [
  { itemId: "dr_hadith_pleasure_killer", title: "স্মরণ", body: "তোমরা সুখ-স্বাদ বিনষ্টকারী(মৃত্যু)-কে বেশি বেশি স্মরণ করো(তিরমিযি)।" },
  { itemId: "dr_dunya_temporary", title: "স্মরণ", body: "দুনিয়ার জীবন ক্ষণস্থায়ী — প্রতিটা প্রাণকেই মৃত্যুর স্বাদ গ্রহণ করতে হবে(সূরা আলে ইমরান, ১৮৫)।" },
  { itemId: "dr_prepare", title: "স্মরণ", body: "মৃত্যুর আগেই আখিরাতের জন্য প্রস্তুতি নেওয়া বুদ্ধিমানের কাজ — নবীজি(ﷺ) বুদ্ধিমান তাকেই বলেছেন যে মৃত্যুর পরের জীবনের জন্য কাজ করে।" },
  { itemId: "dr_grave", title: "স্মরণ", body: "কবর জান্নাতের বাগানগুলোর একটা বাগান অথবা জাহান্নামের গর্তগুলোর একটা গর্ত — নিজের আমল নিয়ে ভাবা।" },
  { itemId: "dr_good_deeds", title: "স্মরণ", body: "মানুষ মারা গেলে তার আমল বন্ধ হয়ে যায়, শুধু তিনটা ছাড়া — সদকায়ে জারিয়া, উপকারী ইলম, ও নেক সন্তান যে তার জন্য দোয়া করে(মুসলিম)।" },
  { itemId: "dr_repent", title: "স্মরণ", body: "মৃত্যু কখন আসবে কেউ জানে না — তাই তওবা ও ইস্তিগফার বিলম্ব না করাই উত্তম।" },
];

export function DeathReminderCard({ onBack }) {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "মৃত্যুর স্মরণ" }),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      /*#__PURE__*/React.createElement(RotatingCard, {
        sectionId: "death_reminder",
        defaultContent: DEATH_REMINDER_DEFAULT,
        cardIcon: "💚",
      })
    )
  );
}
