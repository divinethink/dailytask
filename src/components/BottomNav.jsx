// §Bottom Navigation shell(2_4_Identity_Simplification_Plan.md §৯.১-৯.৩)।
// Pure presentational — activeTab+onChange props নেয়, নিজে কোনো business-logic/data-fetch
// রাখে না। ভবিষ্যতে 3_1/3_2/3_3(Public Tools)-এর নতুন tab-content যোগ হলেও এই ফাইল আর টাচ
// করার দরকার নেই(শুধু routing-switch-এ import বদলাবে, App()-এর scope)।
import { TAB_FAMILY, TAB_PRAYER_TIMES, TAB_TASBIH, TAB_TOOLS, TAB_SETTINGS } from "../legacy/tabs.js";

const NAV_ITEMS = [
  { id: TAB_FAMILY, label: "হোম", emoji: "🏠" },
  { id: TAB_PRAYER_TIMES, label: "সময়সূচি", emoji: "🕌" },
  { id: TAB_TASBIH, label: "তাসবীহ", emoji: "📿" },
  { id: TAB_TOOLS, label: "সহায়িকা", emoji: "🧭" },
  { id: TAB_SETTINGS, label: "সেটিং", emoji: "⚙️" }
];

export function BottomNav({ activeTab, onChange }) {
  return React.createElement(
    "nav",
    {
      className: "fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.05)] flex items-stretch justify-between px-1",
      style: { borderColor: "#E7EEE3" }
    },
    NAV_ITEMS.map(item => {
      const isActive = activeTab === item.id;
      return React.createElement(
        "button",
        {
          key: item.id,
          type: "button",
          onClick: () => onChange(item.id),
          className: "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors",
          style: { color: isActive ? "var(--theme-primary, #0E4B43)" : "#8A9A8F" }
        },
        React.createElement("span", { className: "text-lg leading-none" }, item.emoji),
        React.createElement("span", { className: isActive ? "font-semibold" : "" }, item.label)
      );
    })
  );
}
