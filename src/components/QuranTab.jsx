import { lazyRetry } from "../legacy/lazyRetry.js";
// "কুরআন" নেভ-ট্যাবের পাতা: শিরোনাম-ব্যান্ড + কুরআন-স্ক্রিন। QuranScreen আলাদা chunk — ট্যাবে ঢুকলে তবেই লোড হয়।
// React global(window.React, globals.js)।
import { fontStack, DEFAULT_FONT } from "../legacy/quranFonts.js";
import { ensureFont } from "../legacy/quranFontLoader.js";
import { SettingsGear } from "./icons.jsx";

const QuranScreenLazy = lazyRetry(() => import("./PublicTools/Quran/QuranScreen.jsx").then((m) => ({ default: m.QuranScreen })));

export function QuranTab() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  React.useEffect(() => { ensureFont(DEFAULT_FONT); }, []); // হিরোর বিসমিল্লাহর ফন্ট
  return React.createElement(
    "div",
    { className: "min-h-screen pb-20 bg-[#F4F7F1]" },
    React.createElement("div", { className: "max-w-2xl mx-auto px-5 pt-5" },
      // হিরো-ব্যান্ড: থিম-রঙের গ্রেডিয়েন্ট, বিসমিল্লাহ ক্যালিগ্রাফি, সেটিং-বাটন।
      React.createElement("div", { style: { position: "relative", overflow: "hidden", borderRadius: 24, padding: "16px 16px 18px", color: "#fff", background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(0,0,0,0.32)), var(--theme-primary, #0E4B43)", boxShadow: "0 8px 22px rgba(0,0,0,0.16)" } },
        React.createElement("div", { "aria-hidden": "true", style: { position: "absolute", right: -46, top: -56, width: 170, height: 170, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.16)" } }),
        React.createElement("div", { "aria-hidden": "true", style: { position: "absolute", right: -14, top: -24, width: 110, height: 110, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.12)" } }),
        React.createElement("div", { "aria-hidden": "true", style: { position: "absolute", left: -36, bottom: -50, width: 130, height: 130, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.12)" } }),
        React.createElement("div", { style: { position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 22, fontWeight: 700, lineHeight: 1.3 } }, "কুরআন"),
            React.createElement("div", { style: { fontSize: 12.5, opacity: 0.85 } }, "পড়া • খোঁজা • সংরক্ষণ")),
          React.createElement("button", {
            type: "button", onClick: () => setSettingsOpen(true), "aria-label": "কুরআন-সেটিংস",
            className: "shrink-0 flex items-center justify-center rounded-full active:scale-95 transition-transform",
            style: { width: 44, height: 44, color: "#fff", background: "rgba(255,255,255,0.18)" },
          }, React.createElement(SettingsGear, { size: 22 }))),
        React.createElement("div", { dir: "rtl", lang: "ar", style: { position: "relative", fontFamily: fontStack(DEFAULT_FONT), fontSize: 30, lineHeight: 1.9, textAlign: "center", marginTop: 8 } }, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")),
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("p", { className: "text-center text-sm text-gray-500 py-16" }, "লোড হচ্ছে…") },
        React.createElement(QuranScreenLazy, { settingsOpen, onSettingsClose: () => setSettingsOpen(false) })
      )
    )
  );
}
