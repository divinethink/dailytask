// ToolGrid.jsx — আমল hub ও সহায়িকা shell-এর shared icon-grid section।
// গোল আইকন + নিচে লেবেল(রেফারেন্স-অ্যাপের প্যাটার্ন)। শুধু presentation-layer।
// ১৯ সেপ্টেম্বর ২০২৬(premium-grid, owner-approved mockup): ঐচ্ছিক `variant` prop যোগ হয়েছে —
//   "default"(বাদ দিলে) = আগের ৪-কলাম আচরণ হুবহু অপরিবর্তিত(সহায়িকার ভিতরের ক্যাটাগরি-গ্রিড এটাই)
//   "compact3" = আমল hub — ৩-কলাম কার্ড-টাইল
//   "hero"     = সহায়িকা front — ২-কলাম বড় কার্ড, আইকন+লেখা মাঝ-বরাবর(center)
// সাথে PageHeader ও VerseCard(দুটোই pure-presentational, কোনো data/Firestore নেই)।
// React global(window.React, globals.js)।

import { ToolIcon } from "./ToolIcons.jsx";

const PRIMARY = "var(--theme-primary, #0E4B43)";
const GOLD = "#C89B3C";
const SERIF = "'Noto Serif Bengali', serif";

// --- default variant(অপরিবর্তিত) ---
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

// --- premium variants ---
const PREMIUM = {
  compact3: { cols: "grid-cols-3", height: "clamp(92px, 12vh, 108px)", disc: 40, icon: 20, font: 12.5, chevron: false },
  hero: { cols: "grid-cols-2", height: "clamp(88px, 12vh, 112px)", disc: 44, icon: 22, font: 13.5, chevron: true },
};

function PremiumTile({ icon, label, onClick, cfg }) {
  return React.createElement(
    "button",
    {
      type: "button",
      onClick,
      className: "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 active:scale-95 transition-transform",
      style: {
        height: cfg.height,
        background: "linear-gradient(160deg, #FFFFFF 0%, #F3F8F6 100%)",
        borderColor: "#E1EBE7",
        boxShadow: "0 1px 2px rgba(14,75,67,0.06), 0 4px 12px rgba(14,75,67,0.05)",
      },
    },
    cfg.chevron &&
      React.createElement(
        "span",
        { className: "absolute top-2 right-2", style: { lineHeight: 0 } },
        React.createElement(ToolIcon, { name: "chevronRight", size: 14, color: GOLD })
      ),
    React.createElement(
      "div",
      {
        className: "rounded-full flex items-center justify-center shrink-0",
        style: {
          width: cfg.disc,
          height: cfg.disc,
          background: "radial-gradient(circle at 30% 25%, #FFFFFF 0%, #E3EEEA 100%)",
          boxShadow: "inset 0 0 0 1px #D3E3DD",
        },
      },
      React.createElement(ToolIcon, { name: icon, size: cfg.icon, color: PRIMARY })
    ),
    React.createElement(
      "span",
      {
        className: "leading-snug text-center w-full",
        style: {
          fontSize: cfg.font,
          color: "#1A2621",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        },
      },
      label
    )
  );
}

export function ToolGridSection({ title, icon, items, onSelect, variant }) {
  const cfg = PREMIUM[variant];

  if (cfg) {
    const grid = React.createElement(
      "div",
      { className: "grid gap-2 " + cfg.cols },
      items.map((item) =>
        React.createElement(PremiumTile, {
          key: item.key || item.id,
          icon: item.icon,
          label: item.label,
          cfg,
          onClick: () => onSelect(item),
        })
      )
    );
    // hero: টাইলই নিজে কার্ড(বাইরে wrapper নেই); compact3: একটা সাদা কার্ডের ভিতরে
    if (variant === "hero") {
      return React.createElement("section", { className: "mb-3" }, grid);
    }
    return React.createElement(
      "section",
      { className: "mb-3 bg-white rounded-[20px] shadow-sm border border-slate-200/80 p-2.5" },
      title &&
        React.createElement(
          "div",
          { className: "flex items-center gap-2 mb-2.5 px-1 text-sm font-bold", style: { color: PRIMARY } },
          icon && React.createElement(ToolIcon, { name: icon, size: 16, color: PRIMARY }),
          title
        ),
      grid
    );
  }

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

// স্ক্রিন-হেডার(আমল/সহায়িকা উভয়ে) — নরম সবুজ ব্যান্ড, শিরোনাম+উপ-শিরোনাম।
export function PageHeader({ title, subtitle }) {
  return React.createElement(
    "header",
    {
      className: "mb-3 rounded-2xl border px-4 py-3",
      style: { background: "linear-gradient(135deg, #E8F0EE 0%, #F2F7F4 100%)", borderColor: "#D3E3DD" },
    },
    React.createElement("h1", { className: "text-[19px] leading-tight", style: { fontFamily: SERIF, fontWeight: 500, color: PRIMARY } }, title),
    subtitle && React.createElement("p", { className: "text-xs mt-0.5", style: { color: "#5B6B64" } }, subtitle)
  );
}

// কুরআনের বাণী-কার্ড — লেখা অনুভূমিক ও উল্লম্ব, দুই দিকেই মাঝ-বরাবর(center)।
export function VerseCard({ text, source }) {
  return React.createElement(
    "div",
    {
      className: "rounded-[20px] px-5 py-4 text-center flex flex-col items-center justify-center gap-1.5",
      style: {
        minHeight: 92,
        background: "linear-gradient(160deg, #0E4B43 0%, #0A3A34 100%)",
        boxShadow: "0 4px 14px rgba(14,75,67,0.22)",
      },
    },
    React.createElement("p", { className: "text-base leading-relaxed", style: { fontFamily: SERIF, color: "#FFFFFF" } }, text),
    source && React.createElement("p", { className: "text-xs", style: { color: "#E0BC6B" } }, source)
  );
}
