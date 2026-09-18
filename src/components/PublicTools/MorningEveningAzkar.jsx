// MorningEveningAzkar.jsx — "আমল" হাব, item ৪(3_1 §"আমল হাব")। সকাল-সন্ধ্যার
// আমল, pure reference(কোনো checklist/completion-state নেই, 3_1 Core Decision)।
// ✏️(accordion, 3_6 §২.১) — App Creator UI থেকে সরাসরি এডিট করতে পারবেন।
// Tab-ভাগ(সকাল/সন্ধ্যা) দুটো আলাদা sectionId("morning_azkar"/"evening_azkar")
// হিসেবে রাখা হয়েছে(§৪.২ mockup-এর tab-UI অনুযায়ী) — EditableSection.jsx সম্পূর্ণ
// generic থাকে(একটা sectionId/format-ই জানে), tab-নেভিগেশন এই component-এর
// নিজস্ব local state।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../icons.jsx";
import { EditableSection } from "./EditableSection.jsx";

const { useState } = React;

// Default content(§২ Fallback নীতি) — App Creator এখনো এডিট না করলে এটাই
// দেখাবে। প্রতিটা itemId fixed(edit করলে এই ডিফল্ট আর ব্যবহার হবে না, Firestore
// doc-ই source-of-truth হয়ে যাবে)।
const MORNING_DEFAULT = [
  {
    itemId: "m_ayatul_kursi",
    title: "আয়াতুল কুরসি(১ বার)",
    body: "সকালে একবার আয়াতুল কুরসি(সূরা বাকারা, আয়াত ২৫৫) পড়া। হাদিসে এসেছে, যে সকালে এটা পড়বে সন্ধ্যা পর্যন্ত তার হেফাজত হবে।",
  },
  {
    itemId: "m_ikhlas_falaq_nas",
    title: "সূরা ইখলাস, ফালাক ও নাস(প্রতিটি ৩ বার)",
    body: "সকালে তিন সূরা(ইখলাস, ফালাক, নাস) প্রতিটি তিনবার করে পড়া। হাদিসে এসেছে এতে সবকিছু থেকে হেফাজত হয়(তিরমিযি)।",
  },
  {
    itemId: "m_sayidul_istighfar",
    title: "সাইয়িদুল ইস্তিগফার(১ বার)",
    body: "আল্লাহুম্মা আনতা রাব্বি লা ইলাহা ইল্লা আনতা, খালাক্বতানি ওয়া আনা আবদুকা... — ইস্তিগফারের সেরা দু'আ। সকালে দৃঢ় বিশ্বাসে পড়লে, সেদিন মারা গেলে জান্নাতি হওয়ার সুসংবাদ হাদিসে এসেছে(বুখারি)।",
  },
  {
    itemId: "m_asbahna",
    title: "আসবাহনা ওয়া আসবাহাল মুলকু লিল্লাহ(১ বার)",
    body: "আমরা ভোরে উপনীত হলাম এবং সব রাজত্ব আল্লাহরই জন্য ভোরে উপনীত হলো... সকালের প্রসিদ্ধ দু'আ, সাহাবিদের অভ্যাস ছিল(মুসলিম)।",
  },
  {
    itemId: "m_subhanallah_bihamdihi",
    title: "সুবহানাল্লাহি ওয়া বিহামদিহি(১০০ বার)",
    body: "সকালে ১০০ বার পড়লে কিয়ামতের দিন কেউ এর চেয়ে উত্তম আমল নিয়ে আসতে পারবে না, তবে যে একই পরিমাণ বা তার বেশি পড়েছে(মুসলিম)।",
  },
  {
    itemId: "m_la_ilaha_illallah",
    title: "লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারীকা লাহু(১০ বার, বা কমপক্ষে ১ বার)",
    body: "দিনে ১০০ বার পড়ার ফজিলত হাদিসে এসেছে(দশটি গোলাম আজাদ করার সমান সওয়াব, ১০০ নেকি, ১০০ গুনাহ মাফ) — সকালে অন্তত একবার শুরু করা যায়(বুখারি-মুসলিম)।",
  },
  {
    itemId: "m_durud",
    title: "দুরুদ শরীফ(কমপক্ষে ১০ বার)",
    body: "আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ... সকালে দুরুদ পাঠের বিশেষ ফজিলত হাদিসে এসেছে — কেয়ামতের দিন নবীজি(ﷺ)-এর সবচেয়ে নিকটবর্তী হবে যে বেশি দুরুদ পড়ে।",
  },
];

const EVENING_DEFAULT = [
  {
    itemId: "e_ayatul_kursi",
    title: "আয়াতুল কুরসি(১ বার)",
    body: "সন্ধ্যায় একবার আয়াতুল কুরসি পড়া — সকালের মতোই, সকাল পর্যন্ত হেফাজতের জন্য।",
  },
  {
    itemId: "e_ikhlas_falaq_nas",
    title: "সূরা ইখলাস, ফালাক ও নাস(প্রতিটি ৩ বার)",
    body: "সন্ধ্যায়ও তিন সূরা প্রতিটি তিনবার করে পড়া, সকালের নিয়মের মতোই(তিরমিযি)।",
  },
  {
    itemId: "e_sayidul_istighfar",
    title: "সাইয়িদুল ইস্তিগফার(১ বার)",
    body: "সন্ধ্যায় দৃঢ় বিশ্বাসে পড়লে, রাতে মারা গেলে জান্নাতি হওয়ার সুসংবাদ হাদিসে এসেছে(বুখারি)।",
  },
  {
    itemId: "e_amsayna",
    title: "আমসাইনা ওয়া আমসাল মুলকু লিল্লাহ(১ বার)",
    body: "আমরা সন্ধ্যায় উপনীত হলাম এবং সব রাজত্ব আল্লাহরই জন্য সন্ধ্যায় উপনীত হলো... — সকালের দু'আর সন্ধ্যা-সংস্করণ(মুসলিম)।",
  },
  {
    itemId: "e_subhanallah_bihamdihi",
    title: "সুবহানাল্লাহি ওয়া বিহামদিহি(১০০ বার)",
    body: "সন্ধ্যায়ও একই ফজিলত(মুসলিম) — সকালের মতোই ১০০ বার।",
  },
  {
    itemId: "e_audhu",
    title: "আউজু বিকালিমাতিল্লাহিত তাম্মাতি মিন শাররি মা খলাক্ব(৩ বার)",
    body: "আমি আল্লাহর পূর্ণাঙ্গ কালিমাসমূহের মাধ্যমে তাঁর সৃষ্টির অনিষ্ট থেকে আশ্রয় চাচ্ছি — সন্ধ্যায় ৩ বার পড়লে কোনো কিছু ক্ষতি করতে পারবে না বলে হাদিসে এসেছে(তিরমিযি)।",
  },
  {
    itemId: "e_durud",
    title: "দুরুদ শরীফ(কমপক্ষে ১০ বার)",
    body: "সন্ধ্যায়ও দুরুদ পাঠ চালিয়ে যাওয়া — সকালের নিয়মের মতোই।",
  },
];

export function MorningEveningAzkar({ onBack }) {
  const [period, setPeriod] = useState("morning");

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(
      "button",
      {
        type: "button",
        onClick: onBack,
        className: "flex items-center gap-1 px-4 pt-4 pb-2 text-sm font-semibold text-emerald-950",
      },
      /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
      "আমল"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      {
        className: "px-4 pb-2 text-lg font-semibold",
        style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" },
      },
      "সকাল-সন্ধ্যার আমল"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pb-3 flex gap-2" },
      [
        { key: "morning", label: "সকালের আমল" },
        { key: "evening", label: "সন্ধ্যার আমল" },
      ].map((t) =>
        /*#__PURE__*/React.createElement(
          "button",
          {
            key: t.key,
            type: "button",
            onClick: () => setPeriod(t.key),
            className:
              "flex-1 py-2 rounded-xl text-sm font-semibold border " +
              (period === t.key ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white"),
            style: period === t.key ? { background: "var(--theme-primary, #0E4B43)" } : undefined,
          },
          t.label
        )
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      period === "morning"
        ? /*#__PURE__*/React.createElement(EditableSection, {
            sectionId: "morning_azkar",
            format: "accordion",
            defaultContent: MORNING_DEFAULT,
          })
        : /*#__PURE__*/React.createElement(EditableSection, {
            sectionId: "evening_azkar",
            format: "accordion",
            defaultContent: EVENING_DEFAULT,
          })
    )
  );
}
