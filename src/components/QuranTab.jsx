// "কুরআন" নেভ-ট্যাবের পাতা: শিরোনাম-ব্যান্ড + কুরআন-স্ক্রিন। QuranScreen আলাদা chunk — ট্যাবে ঢুকলে তবেই লোড হয়।
// React global(window.React, globals.js)।
import { PageHeader } from "./PublicTools/ToolGrid.jsx";

const QuranScreenLazy = React.lazy(() => import("./PublicTools/Quran/QuranScreen.jsx").then((m) => ({ default: m.QuranScreen })));

export function QuranTab() {
  return React.createElement(
    "div",
    { className: "min-h-screen pb-20 bg-[#F4F7F1]" },
    React.createElement("div", { className: "max-w-2xl mx-auto px-5 pt-5" },
      React.createElement(PageHeader, { title: "কুরআন", subtitle: "পড়া • খোঁজা • সংরক্ষণ" }),
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("p", { className: "text-center text-sm text-gray-500 py-16" }, "লোড হচ্ছে…") },
        React.createElement(QuranScreenLazy, null)
      )
    )
  );
}
