// AmolHub.jsx — "আমল" bottom-nav ট্যাব(পূর্বে "তাসবীহ" ট্যাব সরাসরি TasbihCounter.jsx
// render করত, ১৬ সেপ্টেম্বর ২০২৬-এ hub-এ পুনর্গঠিত)। তাসবীহ(§Phase A item ৩) এই hub-এর
// ভিতরে প্রথম prominent item হিসেবে সরাসরি inline render হয়(3_3 §৬ mockup অনুযায়ী)।
// বাকি ৭টা item — সব কয়টাই এখন নিজস্ব component-এ wire করা(✏️-ট্যাগড item-গুলো
// EditableSection.jsx/RotatingCard.jsx reuse করে)। কোনো checklist/completion-state
// এই ফাইলে নেই(3_1-এর Core Decision)।
// React global(window.React, globals.js)।

import { ChevronRight } from "../icons.jsx";
import { TasbihCounter } from "./TasbihCounter.jsx";
import { MorningEveningAzkar } from "./MorningEveningAzkar.jsx";
import { FullDayAmol } from "./FullDayAmol.jsx";
import { DhikrCountGuide } from "./DhikrCountGuide.jsx";
import { DuaSection } from "./DuaSection.jsx";
import { DuaAcceptanceCard } from "./DuaAcceptanceCard.jsx";
import { DailyAmolChallenge } from "./DailyAmolChallenge.jsx";
import { DeathReminderCard } from "./DeathReminderCard.jsx";

const { useState } = React;

const HUB_ITEMS = [
  { key: "azkar", icon: "☀️", label: "সকাল-সন্ধ্যার আমল", Component: MorningEveningAzkar },
  { key: "fullDayAmol", icon: "🌗", label: "সারাদিনের আমল", Component: FullDayAmol },
  { key: "dhikr", icon: "📿", label: "যিকির", Component: DhikrCountGuide },
  { key: "dua", icon: "🤲", label: "দু'আ", Component: DuaSection },
  { key: "duaAcceptance", icon: "⏰", label: "দোয়া কবুলের সময়", Component: DuaAcceptanceCard },
  { key: "dailyChallenge", icon: "✨", label: "দৈনিক আমল-চ্যালেঞ্জ", Component: DailyAmolChallenge },
  { key: "deathReminder", icon: "💚", label: "মৃত্যুর স্মরণ", Component: DeathReminderCard },
];

export function AmolHub() {
  const [activeItem, setActiveItem] = useState(null);

  if (activeItem) {
    const item = HUB_ITEMS.find((i) => i.key === activeItem);
    return /*#__PURE__*/React.createElement(item.Component, { onBack: () => setActiveItem(null) });
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1] pt-4" },
    /*#__PURE__*/React.createElement(TasbihCounter, null),
    HUB_ITEMS.map((item) =>
      /*#__PURE__*/React.createElement(
        "button",
        {
          key: item.key,
          type: "button",
          onClick: () => setActiveItem(item.key),
          className:
            "w-[calc(100%-2rem)] mx-4 mb-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 px-4 py-3 flex items-center justify-between text-left",
        },
        /*#__PURE__*/React.createElement(
          "span",
          { className: "text-sm font-semibold text-emerald-950" },
          item.icon + " " + item.label
        ),
        /*#__PURE__*/React.createElement(ChevronRight, { size: 16, color: "#8A9A8F" })
      )
    )
  );
}
