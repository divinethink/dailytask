// DuaSection.jsx — "আমল" হাব, item ৫("দু'আ")। PrayerAdhkar.jsx(item ৮, তালিকা)
// ও DuaFlashcards.jsx(item ৩০, flip-card) — দুটোই একত্রে(3_1 §"আমল হাব"), tab
// দিয়ে ভাগ(MorningEveningAzkar.jsx-এর একই local-tab pattern reuse)।
// React global(window.React, globals.js)।

import { SubScreenHeader } from "./SubScreenHeader.jsx";
import { PrayerAdhkar } from "./PrayerAdhkar.jsx";
import { DuaFlashcards } from "./DuaFlashcards.jsx";

const { useState } = React;

export function DuaSection({ onBack }) {
  const [tab, setTab] = useState("list");

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "দু'আ" }),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pb-3 flex gap-2" },
      [
        { key: "list", label: "নামাজের দোয়া" },
        { key: "flashcards", label: "ফ্ল্যাশকার্ড" },
      ].map((t) =>
        /*#__PURE__*/React.createElement(
          "button",
          {
            key: t.key,
            type: "button",
            onClick: () => setTab(t.key),
            className:
              "flex-1 py-2 rounded-xl text-sm font-semibold border " +
              (tab === t.key ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white"),
            style: tab === t.key ? { background: "var(--theme-primary, #0E4B43)" } : undefined,
          },
          t.label
        )
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4" },
      tab === "list" ? /*#__PURE__*/React.createElement(PrayerAdhkar, null) : /*#__PURE__*/React.createElement(DuaFlashcards, null)
    )
  );
}
