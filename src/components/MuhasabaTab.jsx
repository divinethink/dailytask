// "মুহাসাবা" নেভ-ট্যাবের পাতা (ধাপ ১): শুধু শিরোনাম-ব্যান্ড + ভেতরের কার্ডগুলো (children)। কার্ডের ভেতরের কোড/হিসাব এখানে নেই।
// React global(window.React, globals.js)।
import { PageHeader } from "./PublicTools/ToolGrid.jsx";

export function MuhasabaTab({ children, onBack }) {
  return React.createElement(
    "div",
    { className: "min-h-screen pb-20 bg-[#F4F7F1]" },
    React.createElement("div", { className: "max-w-2xl mx-auto px-5 pt-5" },
      onBack && React.createElement("button", { type: "button", onClick: onBack, className: "mb-2 text-sm font-semibold", style: { color: "var(--theme-primary, #0E4B43)", minHeight: 36 } }, "← হোম"),
      React.createElement(PageHeader, { title: "মুহাসাবা", subtitle: "নিজেকে যাচাই • শুধরে নেওয়া • এগিয়ে চলা" })),
    React.createElement("div", { className: "max-w-2xl mx-auto" }, children)
  );
}
