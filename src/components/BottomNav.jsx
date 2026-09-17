// §Bottom Navigation shell(2_4_Identity_Simplification_Plan.md §৯.১-৯.৩)।
// Pure presentational — activeTab+onChange props নেয়, নিজে কোনো business-logic/data-fetch
// রাখে না। ভবিষ্যতে 3_1/3_2/3_3(Public Tools)-এর নতুন tab-content যোগ হলেও এই ফাইল আর টাচ
// করার দরকার নেই(শুধু routing-switch-এ import বদলাবে, App()-এর scope)।
//
// §Icon-set upgrade(২.৪ §৯.০, ১৫ সেপ্টেম্বর ২০২৬, owner-approved): emoji→stroke-based
// SVG icon। ClockIcon/MenuIcon বিদ্যমান shared Icon()-wrapper(icons.jsx) থেকে reuse
// (pure-stroke, filled-toggle নেই — shared wrapper touch করা হয়নি, ২৬টা বিদ্যমান
// call-site-এর zero-regression-risk বজায় রাখতে) — এই দুই ট্যাবের active-state শুধু
// রঙ বদলায়(brand-green), filled-shape না। HomeIcon/TasbihIcon/CompassIcon নতুন,
// standalone, নিজস্ব `filled` prop-সহ(active=filled+brand-green, inactive=outline+muted)।
import { TAB_FAMILY, TAB_PRAYER_TIMES, TAB_AMOL, TAB_TOOLS, TAB_SETTINGS } from "../legacy/tabs.js";
import { ClockIcon, MenuIcon, HomeIcon, AmolIcon, CompassIcon } from "./icons.jsx";

const ACTIVE_COLOR = "var(--theme-primary, #0E4B43)";
const INACTIVE_COLOR = "#8A9A8F";

const NAV_ITEMS = [
  { id: TAB_FAMILY, label: "হোম", Icon: HomeIcon, supportsFilled: true },
  { id: TAB_PRAYER_TIMES, label: "সময়সূচি", Icon: ClockIcon, supportsFilled: false },
  { id: TAB_AMOL, label: "আমল", Icon: AmolIcon, supportsFilled: true },
  { id: TAB_TOOLS, label: "সহায়িকা", Icon: CompassIcon, supportsFilled: true },
  { id: TAB_SETTINGS, label: "মেনু", Icon: MenuIcon, supportsFilled: false }
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
      const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
      const iconProps = { size: 22, color };
      if (item.supportsFilled) iconProps.filled = isActive;
      return React.createElement(
        "button",
        {
          key: item.id,
          type: "button",
          onClick: () => onChange(item.id),
          className: "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors",
          style: { color }
        },
        React.createElement(item.Icon, iconProps),
        React.createElement("span", { className: isActive ? "font-semibold" : "" }, item.label)
      );
    })
  );
}
