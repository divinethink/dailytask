// SubScreenHeader.jsx — AmolHub-এর প্রতিটা sub-screen(সকাল-সন্ধ্যা/সারাদিনের
// আমল, যিকির, দু'আ ইত্যাদি)-এ পুনরাবৃত্ত "← আমল  [শিরোনাম]" header — DRY(existing
// app-এর MonthNavControl/FieldGroup-এর মতো shared-component-reuse pattern,
// V1 ফাইল ১.২ §১৬)। কোনো নতুন behavior না, শুধু existing repeated JSX বের করা।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../icons.jsx";

export function SubScreenHeader({ onBack, title }) {
  return /*#__PURE__*/React.createElement(
    "div",
    null,
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
      title
    )
  );
}
