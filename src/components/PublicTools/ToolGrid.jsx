// ToolGrid.jsx — আমল hub ও সহায়িকা shell-এর shared ৪-কলাম icon-grid section।
// গোল আইকন + নিচে লেবেল(রেফারেন্স-অ্যাপের প্যাটার্ন)। শুধু presentation-layer।
// React global(window.React, globals.js)।

import { ToolIcon } from "./ToolIcons.jsx";

const PRIMARY = "var(--theme-primary, #0E4B43)";

function Tile({ icon, label, onClick }) {
  return React.createElement(
    "button",
    { type: "button", onClick, className: "flex flex-col items-center gap-1.5 active:scale-95 transition-transform" },
    React.createElement(
      "div",
      {
        className: "w-11 h-11 rounded-full flex items-center justify-center border border-emerald-900/10",
        style: { background: "#E8F0EE" },
      },
      React.createElement(ToolIcon, { name: icon, size: 20, color: PRIMARY })
    ),
    React.createElement(
      "span",
      {
        className: "text-xs leading-snug text-center text-slate-700 w-full px-0.5",
        style: { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
      },
      label
    )
  );
}

export function ToolGridSection({ title, icon, items, onSelect }) {
  return React.createElement(
    "section",
    { className: "mb-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3" },
    title &&
      React.createElement(
        "div",
        { className: "flex items-center gap-2 mb-3 text-sm font-bold", style: { color: PRIMARY } },
        icon && React.createElement(ToolIcon, { name: icon, size: 16, color: PRIMARY }),
        title
      ),
    React.createElement(
      "div",
      { className: "grid grid-cols-4 gap-x-2 gap-y-3" },
      items.map((item) =>
        React.createElement(Tile, {
          key: item.key || item.id,
          icon: item.icon,
          label: item.label,
          onClick: () => onSelect(item),
        })
      )
    )
  );
}
