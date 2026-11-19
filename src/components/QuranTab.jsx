import { lazyRetry } from "../legacy/lazyRetry.js";
// "কুরআন" নেভ-ট্যাবের পাতা: সরল হেডার + কুরআন-স্ক্রিন। QuranScreen আলাদা chunk — ট্যাবে ঢুকলে তবেই লোড হয়।
// React global(window.React, globals.js)।
import { SettingsGear } from "./icons.jsx";

const QuranScreenLazy = lazyRetry(() => import("./PublicTools/Quran/QuranScreen.jsx").then((m) => ({ default: m.QuranScreen })));

export function QuranTab() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  return React.createElement(
    "div",
    { className: "min-h-screen pb-20 bg-[#F4F7F1]" },
    React.createElement("div", { className: "max-w-2xl mx-auto" },
      // সরল হেডার: শিরোনাম ও সেটিং-বাটন।
      React.createElement("div", { className: "flex items-center justify-between px-4 pt-5 pb-3" },
        React.createElement("div", { className: "text-2xl font-bold", style: { color: "var(--theme-primary, #0E4B43)" } }, "কুরআন"),
        React.createElement("button", {
          type: "button", onClick: () => setSettingsOpen(true), "aria-label": "কুরআন-সেটিংস",
          className: "shrink-0 flex items-center justify-center rounded-full active:scale-95 transition-transform",
          style: { width: 44, height: 44, color: "var(--theme-primary, #0E4B43)", background: "#E8F0EE" },
        }, React.createElement(SettingsGear, { size: 22 }))),
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("p", { className: "text-center text-sm text-gray-500 py-16" }, "লোড হচ্ছে…") },
        React.createElement(QuranScreenLazy, { settingsOpen, onSettingsClose: () => setSettingsOpen(false) })
      )
    )
  );
}
