// HisnMorningEvening.jsx — "সকাল-সন্ধ্যার আমল"-এর নিচে হিসনুল মুসলিমের ২৪টি যিকর।
// ডেটা lazy-load (dynamic import, আলাদা chunk)। আরবি ফন্ট/আকার কুরআন-রিডারের পছন্দ থেকে (readPrefs)।
// পুরনো এডিটযোগ্য তালিকা (EditableSection) অপরিবর্তিত। React global(window.React, globals.js)।

import { readPrefs } from "../../legacy/quranState.js";
import { WHEN_FILTERS, filterByWhen } from "../../legacy/hisnCore.js";
import { HisnCard } from "./HisnCard.jsx";

const { useState, useEffect, useMemo } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const BN_FONT = "'Noto Serif Bengali', serif";

export function HisnMorningEvening() {
  const [state, setState] = useState({ status: "loading", list: [], source: "" });
  const [when, setWhen] = useState("all");
  const [openId, setOpenId] = useState(null);
  const prefs = useMemo(() => readPrefs(), []);

  useEffect(() => {
    let alive = true;
    import("../../legacy/hisnData.js").then(
      (m) => { if (alive) setState({ status: "ready", list: m.HISN_MORNING_EVENING, source: m.HISN_SOURCE }); },
      () => { if (alive) setState({ status: "error", list: [], source: "" }); }
    );
    return () => { alive = false; };
  }, []);

  const shown = filterByWhen(state.list, when);
  return h("div", { className: "mt-6" },
    h("div", { className: "pb-2 text-base font-semibold", style: { color: PRIMARY, fontFamily: BN_FONT } }, "হিসনুল মুসলিম: সকাল ও সন্ধ্যার যিকর"),
    h("div", { className: "flex gap-2 pb-3" }, WHEN_FILTERS.map((f) =>
      h("button", { key: f.key, type: "button", onClick: () => setWhen(f.key),
        className: "flex-1 py-1.5 rounded-xl text-sm font-semibold border " + (when === f.key ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white"),
        style: when === f.key ? { background: PRIMARY } : undefined }, f.label))),
    state.status === "loading" && h("div", { className: "text-sm text-slate-500 py-4" }, "লোড হচ্ছে…"),
    state.status === "error" && h("div", { className: "text-sm text-red-600 py-4" }, "ডেটা লোড করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।"),
    shown.map((d) => h(HisnCard, { key: d.id, d, prefs, open: openId === d.id, onToggle: () => setOpenId(openId === d.id ? null : d.id) })),
    state.status === "ready" && h("div", { className: "text-[11px] text-slate-500 pb-2", style: { fontFamily: BN_FONT } }, "উৎস: " + state.source + "। সূত্র আরবি পাদটীকা থেকে; বাংলা অংশ আলেম-যাচাই হয়নি।")
  );
}
