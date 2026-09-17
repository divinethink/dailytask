// AmolHub.jsx — "আমল" bottom-nav ট্যাব(পূর্বে "তাসবীহ" ট্যাব সরাসরি TasbihCounter.jsx
// render করত, ১৬ সেপ্টেম্বর ২০২৬-এ hub-এ পুনর্গঠিত)। তাসবীহ(§Phase A item ৩) এই hub-এর
// ভিতরে প্রথম prominent item হিসেবে সরাসরি inline render হয়(3_3 §৬ mockup অনুযায়ী)।
// বাকি ৭টা item(সকাল-সন্ধ্যা/সারাদিনের আমল, যিকির, দু'আ, দোয়ার সময়, চ্যালেঞ্জ, মৃত্যুর
// স্মরণ) — এদের কনটেন্ট এখনো owner-সরবরাহ/সংগ্রহ-পেন্ডিং(3_1 §চ, item ৪ক/২০গ নোট) —
// তাই এই ধাপে শুধু "শীঘ্রই আসছে" sub-screen(azkar-এর মতোই internal-navigation
// pattern, 3_2 §১ — কোনো নতুন activeTab value লাগে না, নতুন activeTab রুট লাগে না)।
// কোনো checklist/completion-state এই ফাইলে নেই(3_1-এর Core Decision)।
// React global(window.React, globals.js)।

import { ChevronRight, ChevronLeft } from "../icons.jsx";
import { TasbihCounter } from "./TasbihCounter.jsx";

const { useState } = React;

// প্রতিটা আইটেমের key/icon/label — content আসার পরে এই একই array-তে component
// যোগ হবে(এখন সবগুলোই placeholder sub-screen নির্দেশ করে)।
const HUB_ITEMS = [
  { key: "azkar", icon: "☀️", label: "সকাল-সন্ধ্যার আমল" },
  { key: "fullDayAmol", icon: "🌗", label: "সারাদিনের আমল" },
  { key: "dhikr", icon: "📿", label: "যিকির" },
  { key: "dua", icon: "🤲", label: "দু'আ" },
  { key: "duaAcceptance", icon: "⏰", label: "দোয়া কবুলের সময়" },
  { key: "dailyChallenge", icon: "✨", label: "দৈনিক আমল-চ্যালেঞ্জ" },
  { key: "deathReminder", icon: "💚", label: "মৃত্যুর স্মরণ" },
];

export function AmolHub() {
  const [activeItem, setActiveItem] = useState(null);

  if (activeItem) {
    const item = HUB_ITEMS.find((i) => i.key === activeItem);
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setActiveItem(null),
          className: "flex items-center gap-1 px-4 pt-4 pb-2 text-sm font-semibold text-emerald-950",
        },
        /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
        "আমল"
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex-1 flex flex-col items-center justify-center px-6 text-center gap-2 py-16" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-lg font-semibold", style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" } },
          item ? item.label : ""
        ),
        /*#__PURE__*/React.createElement("p", { className: "text-sm text-gray-500" }, "শীঘ্রই আসছে")
      )
    );
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
