// §Motivational Layer — Phase 1: "আজকের বিশেষ দিক" card
// একটিমাত্র card, ভিতরের content selectDailyInsight()(../legacy/dailyInsight.js)
// থেকে আসা `insight` prop অনুযায়ী বদলায় — আলাদা persistent card(Top3/Bottom3/
// Streak ইত্যাদির) তৈরি করা হয়নি(owner-approved design principle)।
// createElement-style(existing codebase convention, JSX syntax না)।

function InsightBody({ insight, toBn }) {
  switch (insight.type) {
    case "milestoneHit":
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-[#B8860B] mb-2" }, "অভিনন্দন! নতুন মাইলফলক"),
        /*#__PURE__*/React.createElement("div", { className: "text-2xl font-bold text-emerald-950" }, toBn(insight.streak), " দিনের ধারাবাহিকতা"),
        /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500 mt-1" }, "মাশাআল্লাহ! এভাবেই চালিয়ে যান।")
      );
    case "nearMilestone":
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-slate-500 mb-2" }, "ধারাবাহিকতা"),
        /*#__PURE__*/React.createElement("div", { className: "text-sm text-slate-700" }, "বর্তমান Streak: ", /*#__PURE__*/React.createElement("b", null, toBn(insight.streak), " দিন")),
        /*#__PURE__*/React.createElement("div", { className: "text-xs text-[#0E4B43] mt-2" }, "আগামীকাল পূরণ হলে ", toBn(insight.next), "-দিনের মাইলফলক!")
      );
    case "bestDay":
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-slate-500 mb-2" }, insight.allTime ? "সর্বকালের সেরা দিন" : "এই মাসে এ পর্যন্ত সেরা দিন"),
        /*#__PURE__*/React.createElement("div", { className: "text-2xl font-bold text-emerald-950" }, toBn(insight.todayPct), "%"),
        insight.prevPct != null && /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500 mt-1" }, "এর আগের সেরা ছিল ", toBn(insight.prevPct), "%")
      );
    case "mostImproved":
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-slate-500 mb-2" }, "সবচেয়ে বেশি উন্নতি"),
        /*#__PURE__*/React.createElement("div", { className: "text-sm font-bold text-emerald-950" }, insight.field.shortLabel || insight.field.label),
        /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500 mt-1" }, "আগের গড়: ", toBn(insight.avgPct), "% → আজ: ", toBn(insight.todayPct), "%")
      );
    case "comeback":
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-slate-500 mb-2" }, "চমৎকার প্রত্যাবর্তন"),
        /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500" }, "গতকাল: ", toBn(insight.yesterdayPct), "%"),
        /*#__PURE__*/React.createElement("div", { className: "text-2xl font-bold text-emerald-950 mt-1" }, "আজ: ", toBn(insight.todayPct), "%")
      );
    case "top3":
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-slate-500 mb-2" }, "আজকের সেরা"),
        insight.items.map((it, i) => /*#__PURE__*/React.createElement("div", {
          key: i,
          className: "flex justify-between text-sm py-0.5"
        }, /*#__PURE__*/React.createElement("span", { className: "text-slate-700" }, "✓ ", it.label), /*#__PURE__*/React.createElement("span", { className: "font-bold text-emerald-950" }, toBn(it.pct), "%")))
      );
    case "bottom3":
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-slate-500 mb-2" }, "আজকের ৩টি দুর্বল জায়গা"),
        insight.items.map((it, i) => /*#__PURE__*/React.createElement("div", {
          key: i,
          className: "flex justify-between text-sm py-0.5"
        }, /*#__PURE__*/React.createElement("span", { className: "text-slate-700" }, it.label), /*#__PURE__*/React.createElement("span", { className: "font-bold text-[#B8860B]" }, toBn(it.pct), "%"))),
        /*#__PURE__*/React.createElement("div", { className: "text-xs text-[#0E4B43] mt-2" }, "আগামীকাল একটি Focus করার জন্য বেছে নিন")
      );
    default:
      return null;
  }
}

// §Dashboard redesign(১৭ সেপ্টেম্বর ২০২৬, owner-approved): সব insight-type-এ
// "অর্জন" বসালে ভুল বোঝাবে(bottom3/nearMilestone কোনো অর্জন না) — তাই শুধু
// সত্যিকারের achievement-টাইপ-এ "🏆 আজকের অর্জন", বাকি(pending/neutral)-এ আগের
// "⭐ আজকের বিশেষ দিক"-ই থাকছে। insight.type-ভ্যালু dailyInsight.js-এর
// selectDailyInsight()-এর সাথে হুবহু sync(কোনো নতুন type যোগ হয়নি)।
const ACHIEVEMENT_INSIGHT_TYPES = new Set(["milestoneHit", "bestDay", "mostImproved", "comeback", "top3"]);

export function DailyInsightCard({ insight, toBn }) {
  if (!insight) return null;
  const isAchievement = ACHIEVEMENT_INSIGHT_TYPES.has(insight.type);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow border border-slate-300 mt-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 mb-3 text-center"
  }, isAchievement ? "🏆 আজকের অর্জন" : "⭐ আজকের বিশেষ দিক"), /*#__PURE__*/React.createElement(InsightBody, { insight, toBn }));
}
