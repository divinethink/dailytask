// "আজকের মুহাসাবা" কার্ড(রাতে-ভরা অ্যাপের জন্য, owner-approved): ক্যাটাগরি-কার্ডে কতটায় আমল যোগ হয়েছে,
// সেভ হয়েছে কি না, স্ট্রিক, আর "গতকাল ভরা হয়নি" ব্যানার। শুধু দেখায় — কোনো ডেটা লেখে না, স্কোর-গণনা বদলায় না।
// "যোগ হয়েছে" = কার্ডে অন্তত একটি প্রযোজ্য ফিল্ডে টিক/সংখ্যা আছে(কাযা-কাউন্ট ০ ভালো, তাই তা গণ্য নয়)।
// React global(window.React, globals.js)।

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

export function MuhasabaStrip({ cats, entry, member, fieldApplies, streak, dirty, yesterdayMissing, todayKey, onGoYesterday, toBn }) {
  const { total, filled } = countFilledCards(cats, entry, member, fieldApplies);
  const saved = !!(entry && entry.lastEditedAt) && !dirty;
  const [hideYb, setHideYb] = React.useState(() => {
    try { return !!localStorage.getItem(DISMISS_PREFIX + todayKey); } catch { return false; }
  });
  const showYb = yesterdayMissing && !hideYb;

  let msg;
  if (total > 0 && filled === total) msg = saved ? "মাশাআল্লাহ — আজকের মুহাসাবা পূর্ণ।" : "সব কার্ড ভরা — এবার নিচে সেভ করুন।";
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
    showYb && React.createElement(
      "div",
      { className: "mb-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2" },
      React.createElement("span", { className: "text-base", "aria-hidden": true }, "🕰️"),
      React.createElement("p", { className: "flex-1 text-[11px] font-semibold text-amber-900 leading-snug" }, "গতকালের হিসাব ভরা হয়নি।"),
      React.createElement("button", {
        type: "button",
        onClick: onGoYesterday,
        className: "shrink-0 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95"
      }, "এখনই ভরুন"),
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
    React.createElement("p", { className: "text-[11px] text-slate-600" }, msg)
  );
}
