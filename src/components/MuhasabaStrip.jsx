// "আজকের মুহাসাবা" কার্ড(রাতে-ভরা অ্যাপের জন্য, owner-approved): ক্যাটাগরি-কার্ডে কতটায় আমল যোগ হয়েছে,
// সেভ হয়েছে কি না, স্ট্রিক, আর "গতকাল ভরা হয়নি" ব্যানার। শুধু দেখায় — কোনো ডেটা লেখে না, স্কোর-গণনা বদলায় না।
// "যোগ হয়েছে" = কার্ডে অন্তত একটি প্রযোজ্য ফিল্ডে টিক/সংখ্যা আছে(কাযা-কাউন্ট ০ ভালো, তাই তা গণ্য নয়)।
// React global(window.React, globals.js)।
import { getHijriDate } from "../legacy/appHelpers.js";

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

export function MuhasabaStrip({ cats, entry, member, fieldApplies, streak, dirty, yesterdayMissing, todayKey, onGoYesterday, canCopy, onCopyYesterday, toBn }) {
  const { total, filled } = countFilledCards(cats, entry, member, fieldApplies);
  const saved = !!(entry && entry.lastEditedAt) && !dirty;
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

  let msg;
  if (total > 0 && filled === total) msg = saved ? "মাশাআল্লাহ — আজকের মুহাসাবা পূর্ণ।" : "সব কার্ড পূরণ করা হয়েছে — এবার নিচে সেভ করুন।";
  else if (filled === 0) msg = saved ? "আজকের হিসাব সেভ আছে।" : "বিসমিল্লাহ — আজকের হিসাব শুরু করুন।";
  else msg = "আলহামদুলিল্লাহ — আর " + toBn(total - filled) + "টি কার্ড বাকি।";

  const segs = [];
  for (let i = 0; i < total; i++) {
    segs.push(React.createElement("span", {
      key: i,
      className: "h-2 flex-1 rounded-full transition-colors",
      style: { background: i < filled ? "var(--theme-primary)" : "#E6ECE4" }
    }));
  }

  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]" },
    showHm && React.createElement(
      "div",
      { className: "mb-3 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2" },
      React.createElement("span", { className: "text-base", "aria-hidden": true }, "🌙"),
      React.createElement("p", { className: "flex-1 text-[11px] font-semibold text-emerald-900 leading-snug" }, "নতুন হিজরি মাস " + hj.month + " শুরু (সম্ভাব্য)। এ মাসের জন্য একটা ছোট নিয়ত ঠিক করুন — যেমন বাড়তি এক ওয়াক্ত জামায়াত বা রোজ এক পৃষ্ঠা কুরআন।"),
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
      React.createElement("p", { className: "flex-1 text-[11px] font-semibold text-amber-900 leading-snug" }, "গতকালের হিসাব পূরণ করা হয়নি।"),
      React.createElement("button", {
        type: "button",
        onClick: onGoYesterday,
        className: "shrink-0 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95"
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
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-2" },
      React.createElement("h3", { className: "text-sm font-bold text-emerald-950" }, "🌙 আজকের মুহাসাবা"),
      React.createElement(
        "div",
        { className: "flex items-center gap-1.5" },
        streak > 0 && React.createElement("span", { className: "rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-700" }, "🔥 " + toBn(streak) + " দিন"),
        React.createElement("span", {
          className: "rounded-full px-2 py-0.5 text-[10px] font-bold " + (saved ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200")
        }, saved ? "সেভ ✓" : "সেভ বাকি")
      )
    ),
    total > 0 && React.createElement("div", { className: "flex gap-1 mb-2", "aria-hidden": true }, segs),
    React.createElement("p", { className: "text-[11px] text-slate-600" }, msg),
    canCopy && filled === 0 && !dirty && React.createElement("button", {
      type: "button",
      onClick: onCopyYesterday,
      className: "mt-2.5 w-full rounded-xl border border-emerald-200 bg-emerald-50/60 py-2 text-[11px] font-bold text-emerald-900 active:scale-[0.98]"
    }, "↩︎ গতকালের মতো বসান")
  );
}
