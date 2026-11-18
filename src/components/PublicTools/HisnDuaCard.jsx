// HisnDuaCard.jsx — অধ্যায় পেজের একটি দু'আর কার্ড (সবসময় খোলা): আরবি, উচ্চারণ, অর্থ, সূত্র (ভাঁজে), কপি/শেয়ার।
// আরবি ফন্ট/আকার কুরআন-রিডারের পছন্দ থেকে। HisnCard (সকাল-সন্ধ্যার ভাঁজ-কার্ড) অপরিবর্তিত। React global।

import { fontStack } from "../../legacy/quranFonts.js";
import { timesBadge, hisnArabicFont, copyText, toBn, bumpCount } from "../../legacy/hisnCore.js";

const { useState } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const BN_FONT = "'Noto Serif Bengali', serif";
const BTN = "text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 active:bg-slate-50";

// একাধিকবার পড়ার দু'আয় (times > 1) বড় ট্যাপ-গণনা; শুধু "একটা একটা করে" মোডে (counter=true)। অবস্থা শুধু পর্দায়, কিছু সেভ হয় না।
function TapCounter({ times }) {
  const [n, setN] = useState(0);
  const done = n >= times;
  const tap = () => {
    setN((c) => bumpCount(c, times));
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* ignore */ }
  };
  return h("div", { className: "mt-4", "data-no-swipe": true },
    h("div", { className: "flex items-center gap-2" },
      h("button", { type: "button", onClick: tap, "aria-label": "গণনা বাড়ান", className: "flex-1 min-h-[52px] rounded-2xl text-[15px] font-semibold border active:scale-[.98] transition-transform", style: done ? { background: PRIMARY, color: "#fff", borderColor: "transparent" } : { color: PRIMARY, borderColor: "var(--theme-line, #D3E3DD)", background: "var(--theme-soft, #E8F0EE)" } },
        done ? "✓ সম্পন্ন · " + toBn(times) + " বার" : "ট্যাপ করুন · " + toBn(n) + " / " + toBn(times)),
      n > 0 && h("button", { type: "button", onClick: () => setN(0), className: BTN + " min-h-[44px]" }, "রিসেট")
    ),
    h("div", { className: "h-1 rounded-full bg-slate-100 overflow-hidden mt-2" }, h("div", { style: { width: Math.round((n / times) * 100) + "%", height: "100%", background: PRIMARY, transition: "width .15s" } }))
  );
}

// fav/onToggleFav (ঐচ্ছিক) = ⭐ প্রিয় (hisnFavs.js, ডিভাইস-লোকাল)। view = {arSize, showAr, showTr, showBn} (hisnPrefs.js); prefs = শুধু আরবি ফন্টের জন্য (কুরআন-রিডারের পছন্দ)।
export function HisnDuaCard({ d, prefs, view, fav = false, onToggleFav, counter = false }) {
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
  const small = Math.max(18, view.arSize - 8);
  return h("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 mb-3 px-4 py-3" },
    h("div", { className: "flex items-start gap-2 pb-2" },
      h("div", { className: "flex-1 text-[15px] font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, d.title),
      badge && h("span", { className: "text-xs font-semibold px-2 py-0.5 rounded-full text-white shrink-0", style: { background: PRIMARY } }, badge)
    ),
    view.showAr && d.arPre && h("div", { dir: "rtl", lang: "ar", className: "text-slate-500", style: { ...arBase, fontSize: small, lineHeight: 2 } }, d.arPre),
    view.showAr && h("div", { dir: "rtl", lang: "ar", style: { ...arBase, fontSize: view.arSize, lineHeight: 2.3, color: "#1F2D2A", whiteSpace: "pre-line" } }, d.ar),
    view.showAr && d.arNote && h("div", { dir: "rtl", lang: "ar", className: "mt-1 text-slate-500", style: { ...arBase, fontSize: small, lineHeight: 2 } }, d.arNote),
    view.showTr && d.tr && h("div", { className: "mt-3 pl-3", style: { borderLeft: "3px solid rgba(200,155,60,0.35)" } },
      h("div", { className: "text-[11px] font-semibold text-slate-500 pb-0.5" }, "উচ্চারণ"),
      h("div", { className: "text-[13.5px] leading-relaxed text-emerald-900/90", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, d.tr)),
    view.showBn && h("div", { className: "mt-3 pl-3", style: { borderLeft: "3px solid rgba(200,155,60,0.85)" } },
      h("div", { className: "text-[11px] font-semibold text-amber-700 pb-0.5" }, "অর্থ"),
      h("div", { className: "text-[14.5px] leading-[1.85] text-slate-800", style: { fontFamily: BN_FONT, whiteSpace: "pre-line" } }, d.bn)),
    counter && d.times > 1 && h(TapCounter, { key: d.id, times: d.times }),
    d.note && h("div", { className: "mt-3 text-[12px] leading-relaxed text-slate-500", style: { fontFamily: BN_FONT } }, d.note),
    h("details", { className: "mt-3 text-[11.5px] leading-relaxed text-slate-500", style: { fontFamily: BN_FONT } },
      h("summary", { className: "font-semibold cursor-pointer" }, "সূত্র"),
      h("div", { className: "pt-1" }, d.ref ? d.ref : "যাচাই হয়নি")
    ),
    h("div", { className: "mt-3 flex items-center gap-2" },
      h("button", { type: "button", onClick: copy, className: BTN }, "কপি"),
      h("button", { type: "button", onClick: share, className: BTN }, "শেয়ার"),
      onToggleFav && h("button", { type: "button", onClick: () => onToggleFav(d.id), "aria-pressed": fav, "aria-label": fav ? "পছন্দ থেকে সরান" : "পছন্দে রাখুন", className: BTN, style: fav ? { color: "#9A6B00", borderColor: "#C89B3C", background: "#FBF3DC" } : undefined }, fav ? "★ পছন্দ" : "☆ পছন্দ"),
      msg && h("span", { className: "text-xs text-slate-500" }, msg)
    )
  );
}
