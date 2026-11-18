// AmolHub.jsx — "আমল" bottom-nav ট্যাব (পূর্বে "তাসবীহ" ট্যাব সরাসরি TasbihCounter.jsx
// render করত, ১৬ সেপ্টেম্বর ২০২৬-এ hub-এ পুনর্গঠিত)। তাসবীহ(§Phase A item ৩) এই hub-এর
// ভিতরে প্রথম prominent item হিসেবে সরাসরি inline render হয় (3_3 §৬ mockup অনুযায়ী)।
// বাকি ৬টা item — সব কয়টাই এখন নিজস্ব component-এ wire করা(✏️-ট্যাগড item-গুলো
// EditableSection.jsx/RotatingCard.jsx reuse করে)। "দৈনিক আমল-চ্যালেঞ্জ" টাইল গ্রিড থেকে সরানো
// হয়েছে (১৯ সেপ্টেম্বর ২০২৬, owner-decision, ৩+৩ ব্যালেন্সের জন্য)। কোনো checklist/completion-state
// এই ফাইলে নেই (3_1-এর Core Decision)।
// React global(window.React, globals.js)।

import { JumuahAmol } from "./JumuahAmol.jsx";
import { SubScreenHeader } from "./SubScreenHeader.jsx";
import { ReaderTitleContext } from "./readerContext.js";
import { MorningEveningAzkar } from "./MorningEveningAzkar.jsx";
import { FullDayAmol } from "./FullDayAmol.jsx";
import { DhikrCountGuide } from "./DhikrCountGuide.jsx";
import { PrayerAdhkar } from "./PrayerAdhkar.jsx";
import { DuaFlashcards } from "./DuaFlashcards.jsx";
import { HisnHome } from "./HisnHome.jsx";
import { DuaAcceptanceCard } from "./DuaAcceptanceCard.jsx";
import { DeathReminderCard } from "./DeathReminderCard.jsx";
import { visibleIds } from "../../legacy/tabLayout.js";
import { useBackLayer } from "../../legacy/backNav.js";

const { useState } = React;

// জুমার দিনের বিশেষ আমল (সহায়িকার সামনের গ্রিড থেকে এখানে এসেছে): হাবের অন্য আইটেমের মতো নিজের হেডারসহ।
function JumuahAmolScreen({ onBack }) {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "জুমার দিনের বিশেষ আমল" }),
    /*#__PURE__*/React.createElement("div", { className: "px-4" }, /*#__PURE__*/React.createElement(JumuahAmol, null))
  );
}

// হিসনের ভিতরের দুই সাব-স্ক্রিন (আগের "দোয়া" ট্যাবের দুই ভাগ): "আমল, যিকির ও দু'আ" হোম থেকে খোলে।
function PrayerAdhkarScreen({ onBack }) {
  return /*#__PURE__*/React.createElement("div", { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "নামাজের দু'আ" }),
    /*#__PURE__*/React.createElement("div", { className: "px-4" }, /*#__PURE__*/React.createElement(PrayerAdhkar, null)));
}
function FlashcardsScreen({ onBack }) {
  return /*#__PURE__*/React.createElement("div", { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(SubScreenHeader, { onBack, title: "দু'আ ফ্ল্যাশকার্ড" }),
    /*#__PURE__*/React.createElement("div", { className: "px-4" }, /*#__PURE__*/React.createElement(DuaFlashcards, null)));
}

// টাইল-তালিকার (কাস্টমাইজ/ক্রম/লুকানো) বাইরের আইটেম: শুধু হিসন-হোমের "নামাজ" গ্রুপ থেকে খোলে।
const SUB_ITEMS = [{ key: "prayerAdhkar", label: "নামাজের দু'আ", Component: PrayerAdhkarScreen }];

const HUB_ITEMS = [
  { key: "azkar", icon: "sun", label: "সকাল-সন্ধ্যার আমল", Component: MorningEveningAzkar },
  { key: "fullDayAmol", icon: "dayNight", label: "সারাদিনের আমল", Component: FullDayAmol },
  { key: "dhikr", icon: "tasbih", label: "যিকির", Component: DhikrCountGuide },
  { key: "dua", icon: "dua", label: "দু'আ ফ্ল্যাশকার্ড", Component: FlashcardsScreen },
  { key: "duaAcceptance", icon: "alarm", label: "দু'আ কবুলের সময়", Component: DuaAcceptanceCard },
  { key: "deathReminder", icon: "hourglass", label: "মৃত্যুর স্মরণ", Component: DeathReminderCard },
  { key: "jumuahAmol", icon: "calendarStar", label: "জুমার দিনের বিশেষ আমল", Component: JumuahAmolScreen },
];

// onBack(ঐচ্ছিক, ধাপ ২): সহায়িকার ভেতর থেকে খুললে ওপরে "‹ সহায়িকা" ফেরার বোতাম দেখায়।
export function AmolHub({ tabLayout, onBack } = {}) {
  const [activeItem, setActiveItem] = useState(null);
  useBackLayer(!!activeItem, () => setActiveItem(null));

  if (activeItem) {
    const item = [...HUB_ITEMS, ...SUB_ITEMS].find((i) => i.key === activeItem);
    return /*#__PURE__*/React.createElement(
      ReaderTitleContext.Provider,
      { value: item.label },
      /*#__PURE__*/React.createElement(item.Component, { onBack: () => setActiveItem(null) })
    );
  }

  // ক্রম+লুকানো (member/app_design tabLayout): বিশেষ সংকলন সারি। হিসনের মূল পেজ নিচের HisnHome।
  const items = visibleIds("amol", tabLayout).map((id) => HUB_ITEMS.find((i) => i.key === id)).filter(Boolean);

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1] pt-4 px-4" },
    /*#__PURE__*/React.createElement(HisnHome, { collections: items, onSelectItem: setActiveItem, onBack })
  );
}
