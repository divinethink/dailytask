// MorningEveningAzkar.jsx — "আমল" হাব, item ৪(3_1 §"আমল হাব")। সকাল-সন্ধ্যার
// আমল, pure reference(কোনো checklist/completion-state নেই, 3_1 Core Decision)।
// ✏️(accordion, 3_6 §২.১) — App Creator UI থেকে সরাসরি এডিট করতে পারবেন।
// §Tab-removal(১৯ সেপ্টেম্বর ২০২৬, owner-অনুরোধ): সকাল/সন্ধ্যা কনটেন্ট
// বাস্তবে প্রায় অভিন্ন(পার্থক্য শুধু দু'আর টেক্সটে) বলে আলাদা ট্যাব তুলে
// দেওয়া হয়েছে — এখন শুধু একটাই তালিকা(sectionId "morning_azkar", owner
// ইতিমধ্যে এখানেই সব আমল লিখে রেখেছেন)। পুরনো "evening_azkar" Firestore doc
// (যদি কখনো এডিট হয়ে থাকে) touch/delete করা হয়নি — শুধু আর render হয় না।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../icons.jsx";
import { EditableSection } from "./EditableSection.jsx";

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


export function MorningEveningAzkar({ onBack }) {
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
        className: "px-4 pb-3 text-lg font-semibold",
        style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" },
      },
      "সকাল-সন্ধ্যার আমল"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      /*#__PURE__*/React.createElement(EditableSection, {
        sectionId: "morning_azkar",
        format: "accordion",
        defaultContent: MORNING_DEFAULT,
      })
    )
  );
}
