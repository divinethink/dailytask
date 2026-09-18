// AmolHub.jsx — "আমল" bottom-nav ট্যাব(পূর্বে "তাসবীহ" ট্যাব সরাসরি TasbihCounter.jsx
// render করত, ১৬ সেপ্টেম্বর ২০২৬-এ hub-এ পুনর্গঠিত)। তাসবীহ(§Phase A item ৩) এই hub-এর
// ভিতরে প্রথম prominent item হিসেবে সরাসরি inline render হয়(3_3 §৬ mockup অনুযায়ী)।
// বাকি ৭টা item — সব কয়টাই এখন নিজস্ব component-এ wire করা(✏️-ট্যাগড item-গুলো
// EditableSection.jsx/RotatingCard.jsx reuse করে)। কোনো checklist/completion-state
// এই ফাইলে নেই(3_1-এর Core Decision)।
// React global(window.React, globals.js)।

import { ToolGridSection } from "./ToolGrid.jsx";
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
  { key: "azkar", icon: "sun", label: "সকাল-সন্ধ্যার আমল", Component: MorningEveningAzkar },
  { key: "fullDayAmol", icon: "sunMoon", label: "সারাদিনের আমল", Component: FullDayAmol },
  { key: "dhikr", icon: "beads", label: "যিকির", Component: DhikrCountGuide },
  { key: "dua", icon: "hands", label: "দু'আ", Component: DuaSection },
  { key: "duaAcceptance", icon: "alarm", label: "দোয়া কবুলের সময়", Component: DuaAcceptanceCard },
  { key: "dailyChallenge", icon: "sparkles", label: "দৈনিক আমল-চ্যালেঞ্জ", Component: DailyAmolChallenge },
  { key: "deathReminder", icon: "hourglass", label: "মৃত্যুর স্মরণ", Component: DeathReminderCard },
];

export function AmolHub() {
  const [activeItem, setActiveItem] = useState(null);

  if (activeItem) {
    const item = HUB_ITEMS.find((i) => i.key === activeItem);
    return /*#__PURE__*/React.createElement(item.Component, { onBack: () => setActiveItem(null) });
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1] pt-4 px-4" },
    /*#__PURE__*/React.createElement(ToolGridSection, {
      title: "আমল ও দু'আ",
      icon: "hands",
      items: HUB_ITEMS,
      onSelect: (item) => setActiveItem(item.key),
    }),
    // তাসবীহ — গ্রিডের নিচে(owner-request, ১৯ সেপ্টেম্বর ২০২৬)
    /*#__PURE__*/React.createElement(TasbihCounter, null)
  );
}
