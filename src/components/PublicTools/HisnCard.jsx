// HisnCard.jsx — হিসনুল মুসলিমের একটি দু'আর কার্ড (সকাল-সন্ধ্যার তালিকা ও অধ্যায়-তালিকা — দুই জায়গাতেই ব্যবহৃত)।
// আরবি ফন্ট/আকার কুরআন-রিডারের পছন্দ থেকে। React global(window.React, globals.js)।

import { fontStack } from "../../legacy/quranFonts.js";
import { timesBadge, hisnArabicFont, copyText } from "../../legacy/hisnCore.js";

const { useState } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const CARD = "bg-white rounded-2xl shadow-sm border border-slate-200/80";
const BN_FONT = "'Noto Serif Bengali', serif";

export function HisnCard({ d, open, onToggle, prefs }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(copyText(d)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { /* ignore */ }
  };
  const badge = timesBadge(d);
  const arFont = fontStack(hisnArabicFont(prefs));
  const arBase = { fontFamily: arFont, lineHeight: 2.3, textAlign: "right" };
  return h("div", { className: CARD + " mb-3 overflow-hidden" },
    h("button", { type: "button", onClick: onToggle, "aria-expanded": open, className: "w-full flex items-center gap-2 px-4 py-3 text-left" },
      h("span", { className: "flex-1 text-[15px] font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, d.title),
      badge && h("span", { className: "text-xs font-semibold px-2 py-0.5 rounded-full text-white", style: { background: PRIMARY } }, badge),
      h("span", { className: "text-slate-400 text-sm", "aria-hidden": true }, open ? "▲" : "▼")
    ),
    open && h("div", { className: "px-4 pb-4" },
      d.arPre && h("div", { dir: "rtl", lang: "ar", className: "text-slate-500", style: { ...arBase, fontSize: Math.max(18, prefs.arSize - 8), lineHeight: 2 } }, d.arPre),
      h("div", { dir: "rtl", lang: "ar", style: { ...arBase, fontSize: prefs.arSize, color: "#1F2D2A", whiteSpace: "pre-line" } }, d.ar),
      d.arNote && h("div", { dir: "rtl", lang: "ar", className: "mt-1 text-slate-500", style: { ...arBase, fontSize: Math.max(18, prefs.arSize - 8), lineHeight: 2 } }, d.arNote),
      d.tr && h("div", { className: "mt-3 text-[13px] leading-relaxed text-emerald-900/90", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, h("span", { className: "font-semibold" }, "উচ্চারণ: "), d.tr),
      h("div", { className: "mt-3 text-[14px] leading-relaxed text-slate-800", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, h("span", { className: "font-semibold" }, "অর্থ: "), d.bn),
      d.note && h("div", { className: "mt-3 text-[12px] leading-relaxed text-slate-500", style: { fontFamily: BN_FONT } }, d.note),
      h("div", { className: "mt-3 text-[11.5px] leading-relaxed text-slate-500", style: { fontFamily: BN_FONT } }, h("span", { className: "font-semibold" }, "সূত্র: "), d.ref ? d.ref : "যাচাই হয়নি"),
      h("button", { type: "button", onClick: copy, className: "mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600" }, copied ? "কপি হয়েছে ✓" : "কপি")
    )
  );
}
