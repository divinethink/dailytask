// HisnMorningEvening.jsx — "সকাল-সন্ধ্যার আমল"-এর নিচে হিসনুল মুসলিমের ২৪টি যিকর।
// ডেটা lazy-load (dynamic import, আলাদা chunk)। আরবি ফন্ট/আকার কুরআন-রিডারের পছন্দ থেকে (readPrefs)।
// পুরনো এডিটযোগ্য তালিকা (EditableSection) অপরিবর্তিত। React global(window.React, globals.js)।

import { readPrefs } from "../../legacy/quranState.js";
import { fontStack } from "../../legacy/quranFonts.js";
import { WHEN_FILTERS, filterByWhen, timesBadge, hisnArabicFont, copyText } from "../../legacy/hisnCore.js";

const { useState, useEffect, useMemo } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const CARD = "bg-white rounded-2xl shadow-sm border border-slate-200/80";
const BN_FONT = "'Noto Serif Bengali', serif";

function DuaCard({ d, open, onToggle, prefs }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(copyText(d)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { /* ignore */ }
  };
  const badge = timesBadge(d);
  return h("div", { className: CARD + " mb-3 overflow-hidden" },
    h("button", { type: "button", onClick: onToggle, "aria-expanded": open, className: "w-full flex items-center gap-2 px-4 py-3 text-left" },
      h("span", { className: "flex-1 text-[15px] font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, d.title),
      badge && h("span", { className: "text-xs font-semibold px-2 py-0.5 rounded-full text-white", style: { background: PRIMARY } }, badge),
      h("span", { className: "text-slate-400 text-sm", "aria-hidden": true }, open ? "▲" : "▼")
    ),
    open && h("div", { className: "px-4 pb-4" },
      h("div", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(hisnArabicFont(prefs)), fontSize: prefs.arSize, lineHeight: 2.3, textAlign: "right", color: "#1F2D2A", whiteSpace: "pre-line" } }, d.ar),
      d.arNote && h("div", { dir: "rtl", lang: "ar", className: "mt-1 text-slate-500", style: { fontFamily: fontStack(hisnArabicFont(prefs)), fontSize: Math.max(18, prefs.arSize - 8), lineHeight: 2, textAlign: "right" } }, d.arNote),
      h("div", { className: "mt-3 text-[13px] leading-relaxed text-emerald-900/90", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, h("span", { className: "font-semibold" }, "উচ্চারণ: "), d.tr),
      h("div", { className: "mt-3 text-[14px] leading-relaxed text-slate-800", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, h("span", { className: "font-semibold" }, "অর্থ: "), d.bn),
      d.note && h("div", { className: "mt-3 text-[12px] leading-relaxed text-slate-500", style: { fontFamily: BN_FONT } }, d.note),
      h("button", { type: "button", onClick: copy, className: "mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600" }, copied ? "কপি হয়েছে ✓" : "কপি")
    )
  );
}

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
    shown.map((d) => h(DuaCard, { key: d.id, d, prefs, open: openId === d.id, onToggle: () => setOpenId(openId === d.id ? null : d.id) })),
    state.status === "ready" && h("div", { className: "text-[11px] text-slate-500 pb-2", style: { fontFamily: BN_FONT } }, "উৎস: " + state.source + "। হাদিসের রেফারেন্স ও মান পরের ধাপে যুক্ত হবে।")
  );
}
