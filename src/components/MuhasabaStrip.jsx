// হোম-ট্যাবের উপরের কার্ড: চলতি ওয়াক্তের আমল(WaqtAmalCard) + "গতকাল ভরা হয়নি" ব্যানার ও কপি-বোতাম। শুধু দেখায় — কোনো ডেটা লেখে না।
// "যোগ হয়েছে" = কার্ডে অন্তত একটি প্রযোজ্য ফিল্ডে টিক/সংখ্যা আছে(কাযা-কাউন্ট ০ ভালো, তাই তা গণ্য নয়)।
// React global(window.React, globals.js)।
import { getHijriDate } from "../legacy/appHelpers.js";
import { WaqtAmalCard } from "./WaqtAmalCard.jsx";
// ১ নভেম্বর ২০২৬(owner): "আজকের মুহাসাবা" সারাংশ(স্ট্রিক/অগ্রগতি-বার/সেভ-ব্যাজ) সরানো; জায়গায় WaqtAmalCard(চলতি ওয়াক্তের আমল)।
// গতকাল-ব্যানার, নতুন-হিজরি-মাস নোট ও "গতকালের মতো বসান" বোতাম আগের মতোই আছে।

const DISMISS_PREFIX = "yb_dismissed_";

function fieldFilled(f, entry) {
  const v = entry ? entry[f.key] : undefined;
  if (f.type === "bool") return !!v;
  if (f.key === "fardPrayers") return false;
  if (f.type === "count" || f.type === "number") return (Number(v) || 0) > 0;
  return false;
}

export function countFilledCards(cats, entry, member, fieldApplies) {
  let total = 0;
  let filled = 0;
  cats.forEach(c => {
    const applicable = c.fields.filter(f => fieldApplies(f, member));
    if (applicable.length === 0) return;
    total += 1;
    if (applicable.some(f => fieldFilled(f, entry))) filled += 1;
  });
  return { total, filled };
}

export function MuhasabaStrip({ cats, entry, member, fieldApplies, streak, dirty, yesterdayMissing, todayKey, onGoYesterday, canCopy, onCopyYesterday, toBn, isToday }) {
  const { total, filled } = countFilledCards(cats, entry, member, fieldApplies);
  const [hideYb, setHideYb] = React.useState(() => {
    try { return !!localStorage.getItem(DISMISS_PREFIX + todayKey); } catch { return false; }
  });
  const showYb = yesterdayMissing && !hideYb;
  // নতুন হিজরি মাসের প্রথম ২ দিনে একটা ছোট নিয়ত-স্মরণ(প্রতি মাসে একবার বন্ধ করা যায়)। তারিখ ≈±১ দিন, তাই "সম্ভাব্য"।
  const hj = getHijriDate(new Date());
  const hmKey = "hm_dismissed_" + hj.year + "_" + hj.month;
  const [hideHm, setHideHm] = React.useState(() => {
    try { return !!localStorage.getItem(hmKey); } catch { return false; }
  });
  const showHm = hj.day <= 2 && !hideHm;

  const showCopy = !!canCopy && filled === 0 && !dirty;
  if (!isToday && !showHm && !showYb && !showCopy) return null;

  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]" },
    showHm && React.createElement(
      "div",
      { className: "mb-3 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2" },
      React.createElement("span", { className: "text-base", "aria-hidden": true }, "🌙"),
      React.createElement("p", { className: "flex-1 text-xs font-semibold text-emerald-900 leading-snug" }, "নতুন হিজরি মাস " + hj.month + " শুরু (সম্ভাব্য)। এ মাসের জন্য একটা ছোট নিয়ত ঠিক করুন — যেমন বাড়তি এক ওয়াক্ত জামায়াত বা রোজ এক পৃষ্ঠা কুরআন।"),
      React.createElement("button", {
        type: "button",
        "aria-label": "বন্ধ করুন",
        onClick: () => {
          try { localStorage.setItem(hmKey, "1"); } catch {}
          setHideHm(true);
        },
        className: "shrink-0 px-1 text-sm text-emerald-700"
      }, "✕")
    ),
    showYb && React.createElement(
      "div",
      { className: "mb-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2" },
      React.createElement("span", { className: "text-base", "aria-hidden": true }, "🕰️"),
      React.createElement("p", { className: "flex-1 text-xs font-semibold text-amber-900 leading-snug" }, "গতকালের হিসাব পূরণ করা হয়নি।"),
      React.createElement("button", {
        type: "button",
        onClick: onGoYesterday,
        className: "shrink-0 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white active:scale-95"
      }, "এখনই পূরণ করুন"),
      React.createElement("button", {
        type: "button",
        "aria-label": "বন্ধ করুন",
        onClick: () => {
          try { localStorage.setItem(DISMISS_PREFIX + todayKey, "1"); } catch {}
          setHideYb(true);
        },
        className: "shrink-0 px-1 text-sm text-amber-700"
      }, "✕")
    ),
    isToday && React.createElement(WaqtAmalCard, null),
    showCopy && React.createElement("button", {
      type: "button",
      onClick: onCopyYesterday,
      className: "mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50/60 py-2 text-xs font-bold text-emerald-900 active:scale-[0.98]"
    }, "↩︎ গতকালের মতো বসান")
  );
}
