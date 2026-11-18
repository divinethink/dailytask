// HisnDuaCard.jsx — অধ্যায় পেজের একটি দু'আর কার্ড (সবসময় খোলা): আরবি, উচ্চারণ, অর্থ, সূত্র (ভাঁজে), কপি/শেয়ার।
// আরবি ফন্ট/আকার কুরআন-রিডারের পছন্দ থেকে। HisnCard (সকাল-সন্ধ্যার ভাঁজ-কার্ড) অপরিবর্তিত। React global।

import { fontStack } from "../../legacy/quranFonts.js";
import { timesBadge, hisnArabicFont, copyText } from "../../legacy/hisnCore.js";

const { useState } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const BN_FONT = "'Noto Serif Bengali', serif";
const BTN = "text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 active:bg-slate-50";

export function HisnDuaCard({ d, prefs }) {
  const [msg, setMsg] = useState("");
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 1500); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(copyText(d)); flash("কপি হয়েছে ✓"); } catch (e) { flash("কপি করা যায়নি"); }
  };
  const share = async () => {
    const text = copyText(d);
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (e) { /* বাতিল করলে কিছু নয় */ }
    } else {
      copy();
    }
  };
  const badge = timesBadge(d);
  const arBase = { fontFamily: fontStack(hisnArabicFont(prefs)), textAlign: "right" };
  const small = Math.max(18, prefs.arSize - 8);
  return h("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 mb-3 px-4 py-3" },
    h("div", { className: "flex items-start gap-2 pb-2" },
      h("div", { className: "flex-1 text-[15px] font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, d.title),
      badge && h("span", { className: "text-xs font-semibold px-2 py-0.5 rounded-full text-white shrink-0", style: { background: PRIMARY } }, badge)
    ),
    d.arPre && h("div", { dir: "rtl", lang: "ar", className: "text-slate-500", style: { ...arBase, fontSize: small, lineHeight: 2 } }, d.arPre),
    h("div", { dir: "rtl", lang: "ar", style: { ...arBase, fontSize: prefs.arSize, lineHeight: 2.3, color: "#1F2D2A", whiteSpace: "pre-line" } }, d.ar),
    d.arNote && h("div", { dir: "rtl", lang: "ar", className: "mt-1 text-slate-500", style: { ...arBase, fontSize: small, lineHeight: 2 } }, d.arNote),
    d.tr && h("div", { className: "mt-3 text-[13px] leading-relaxed text-emerald-900/90", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, h("span", { className: "font-semibold" }, "উচ্চারণ: "), d.tr),
    h("div", { className: "mt-3 text-[14px] leading-relaxed text-slate-800", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, h("span", { className: "font-semibold" }, "অর্থ: "), d.bn),
    d.note && h("div", { className: "mt-3 text-[12px] leading-relaxed text-slate-500", style: { fontFamily: BN_FONT } }, d.note),
    h("details", { className: "mt-3 text-[11.5px] leading-relaxed text-slate-500", style: { fontFamily: BN_FONT } },
      h("summary", { className: "font-semibold cursor-pointer" }, "সূত্র"),
      h("div", { className: "pt-1" }, d.ref ? d.ref : "যাচাই হয়নি")
    ),
    h("div", { className: "mt-3 flex items-center gap-2" },
      h("button", { type: "button", onClick: copy, className: BTN }, "কপি"),
      h("button", { type: "button", onClick: share, className: BTN }, "শেয়ার"),
      msg && h("span", { className: "text-xs text-slate-500" }, msg)
    )
  );
}
