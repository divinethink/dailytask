// হোমের শেষের ছোট লিংক-কার্ড(ধাপ ১): ট্যাপে "মুহাসাবা" ট্যাবে যায়। শুধু দেখায় — কোনো ডেটা লেখে না, নিজে কিছু হিসাব করে না।
// avgPct: চলতি মাসের গড় স্কোর(App-এর monthStats থেকে, নতুন হিসাব নেই); null হলে শুধু শিরোনাম।
// React global(window.React, globals.js)।
import { ChevronRight } from "./icons.jsx";

export function MuhasabaLinkCard({ avgPct, toBn, onOpen }) {
  const hasPct = typeof avgPct === "number";
  return React.createElement(
    "div",
    { className: "px-5 mt-5" },
    React.createElement(
      "button",
      {
        type: "button",
        onClick: onOpen,
        className: "w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-white shadow-md active:scale-[0.99] transition-transform",
        style: { background: "linear-gradient(135deg,#0E4B43,#1C3B36)" }
      },
      React.createElement(
        "div",
        { className: "min-w-0" },
        React.createElement("div", { className: "text-sm font-bold leading-snug" }, hasPct ? "এ মাস " + toBn(avgPct) + "%" : "মুহাসাবা"),
        React.createElement("div", { className: "mt-0.5 text-xs opacity-80" }, "মুহাসাবা ট্যাবে বিস্তারিত")
      ),
      React.createElement(ChevronRight, { size: 18, color: "#E4D3A8" })
    )
  );
}
