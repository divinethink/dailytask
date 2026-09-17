// A4-G6-Part C — Dashboard secondary sections: Weekly Reflection, Monthly
// Overview, Meeting Minutes, and small inline modals (Delete-Account-Warning,
// Add-Custom-Field, Feedback, Milestone-Toast).
// Extracted verbatim from legacy App() (app.js lines ~7235-7722, scattered).
// Structural-only (Owner Rule 2): no logic/condition change, only moved to its
// own file + split into named exports.
// [৮ সেপ্টেম্বর ২০২৬] Chart.js-ভিত্তিক ProgressChart(সাপ্তাহিক লাইন-গ্রাফ)
// সরিয়ে StreakCard দিয়ে প্রতিস্থাপন করা হয়েছে(owner-approved, নিচে দ্রষ্টব্য)।
import { InfoIcon, Loader2, Plus, Trash, RefreshIcon, CalIcon, ChevronLeft, ChevronRight, ChevronDown, Printer, MessageSquare, X } from "./icons.jsx";

// React itself is a true runtime global (established pattern — no file in this
// codebase imports it). app.js locally destructures hooks from it the same way.
const { useState } = React;

// StreakCard — ProgressChart(Chart.js লাইন-গ্রাফ)-এর প্রতিস্থাপন(৮ সেপ্টেম্বর
// ২০২৬, owner-approved: "গ্রাফ কাজে লাগছে না, আগ্রহ তৈরি হয় এমন কিছু আনা
// হোক")। কোনো নতুন calculation লাগেনি — `calculateStreak()`(appHelpers.js)
// আগে থেকেই তৈরি ও app.js-এ প্রতি রেন্ডারে গণনা হচ্ছিল, শুধু এতদিন কোথাও
// প্রধানভাবে দেখানো হতো না(শুধু Profile-dropdown-এর ভিতরে ছিল)। Milestone
// (৭/৩০/১০০/৩৬৫ দিন) toast system-ও আগে থেকেই আছে, অপরিবর্তিত।
// §Dashboard redesign(১৭ সেপ্টেম্বর ২০২৬, owner-approved): streak-সংখ্যা এখন
// DashboardHeader.jsx-এর compact chip-এ(bell-এর পাশে) দেখানো হয় — তাই এই
// component থেকে বড় streak-box সরিয়ে শুধু "আজকের অগ্রগতি" এক-লাইন compact
// row রাখা হলো(component/prop-নাম অপরিবর্তিত রাখা হয়েছে, শুধু presentation)।
// yesterdayPercent(নতুন, ঐচ্ছিক prop) দিলে গতকালের তুলনায় বৃদ্ধি/হ্রাস দেখাবে —
// app.js-এর call-site-এ একই মাসের ভিতরে(cross-month fetch ছাড়াই) নিরাপদে
// derive করা হয়েছে, না মিললে(যেমন মাসের ১ তারিখ) silently বাদ যায়।
export function StreakCard({ streak, toBn, todayPercent, yesterdayPercent }) {
  if (todayPercent === null || todayPercent === undefined) return null;
  const hasDelta = yesterdayPercent !== null && yesterdayPercent !== undefined;
  const delta = hasDelta ? todayPercent - yesterdayPercent : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-2 rounded-xl bg-[#f0ede4] px-4 py-3 flex items-center flex-wrap gap-x-2 gap-y-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-emerald-900"
  }, "আজকের অগ্রগতি:"), /*#__PURE__*/React.createElement("span", {
    className: "text-base font-bold text-emerald-900",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(todayPercent), "%"), hasDelta && /*#__PURE__*/React.createElement("span", {
    className: delta >= 0 ? "text-xs text-emerald-700 font-medium" : "text-xs text-red-700 font-medium"
  }, "· গতকালের চেয়ে ", toBn(Math.abs(delta)), "% ", delta >= 0 ? "বেশি ↑" : "কম ↓"));
}

// hex রঙ হালকা/গাঢ় করে(percent: ধনাত্মক=হালকা, ঋণাত্মক=গাঢ়) — gradient/3D-bevel
// effect তৈরির জন্য, কোনো নতুন color-library লাগেনি।
// একটা donut(সেরা ৩ অথবা সর্বনিম্ন ৩ অ্যাক্টিভিটি) — সাধারণ, flat রঙ(কোনো
// gradient/shadow/3D-effect নেই, existing dashboard-এর color-palette-এর সাথেই
// সামঞ্জস্যপূর্ণ)। Chart.js-এর নিজস্ব legend ব্যবহার করা হয়েছে(নাম+% দুটোই
// legend-label-এর ভিতরে বেক করা), কারণ canvas slice-এর ভিতরে ছোট টেক্সট গোজার
// চেয়ে regular legend-টেক্সট ছোট স্ক্রিনেও অনেক বেশি সহজে পড়া যায়।
// পারফরম্যান্স-tier রঙ — শুধু এই র‍্যাঙ্কিং-সেকশনের জন্য, existing scoreColor()
// থেকে আলাদা রাখা হয়েছে ইচ্ছাকৃতভাবে: এখানে ০% মানে "সত্যিকারের রেকর্ড করা
// শূন্য পারফরম্যান্স"(fieldPercent() ইতিমধ্যে non-null মানেই ডেটা আছে ধরে
// নেয়), "কোনো এন্ট্রি নেই" নয় — তাই ০%-কেও colorless(#E7EEE3, যেটা ক্যালেন্ডারে
// "খালি দিন" বোঝায়) না দেখিয়ে বাকি লাল-tier-এর মতোই স্পষ্ট লাল দেখানো হয়(owner
// অনুরোধ, ৬ সেপ্টেম্বর ২০২৬)। ৮৫/৬০/৩৫% থ্রেশহোল্ড ও রঙ scoreColor()-এর সাথেই
// অভিন্ন রাখা হয়েছে(visual language consistency)।
function activityTierColor(pct) {
  if (pct >= 85) return "var(--theme-primary)";
  if (pct >= 60) return "#2563A8";
  if (pct >= 35) return "#D6A400";
  return "#C1666B";
}
const ORDINAL_BN = ["১ম", "২য়", "৩য়"];

// একটা tier-row: "১ম সর্বোচ্চ: ১০০%" + ঐ শতাংশ-এ থাকা সবগুলো আমলের নাম(comma
// দিয়ে একসাথে, owner-এর প্ল্যান অনুযায়ী) + একটা পাতলা প্রোগ্রেস-বার(দ্রুত visual
// scan-এর জন্য)।
function TierRow({ rankLabel, pct, labels, toBn }) {
  const color = activityTierColor(pct);
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-2.5 last:mb-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[10px] text-slate-500 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, rankLabel), /*#__PURE__*/React.createElement("span", {
    className: "font-bold",
    style: { fontFamily: "'IBM Plex Mono', monospace", color }
  }, toBn(pct), "%")), /*#__PURE__*/React.createElement("div", {
    className: "h-2 rounded-full bg-slate-100 overflow-hidden mb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full",
    style: { width: `${pct}%`, background: color }
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-700 leading-snug"
  }, labels.join(", ")));
}

// একটা কলাম(সর্বোচ্চ অথবা সর্বনিম্ন) — সর্বোচ্চ ৩টা distinct শতাংশ-tier(অথবা যত
// distinct tier আসলে আছে, ৩-এর কম হলে ততটাই) দেখায়, প্রতিটা tier-এ সেই
// শতাংশে-থাকা সবগুলো আমল একসাথে।
function TierColumn({ heading, headingColor, tiers, rankPrefix, toBn }) {
  if (tiers.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold mb-2 text-center",
    style: { color: headingColor }
  }, heading), tiers.map((t, i) => /*#__PURE__*/React.createElement(TierRow, {
    key: t.pct,
    rankLabel: `${ORDINAL_BN[i]} ${rankPrefix}`,
    pct: t.pct,
    labels: t.labels,
    toBn: toBn
  })));
}

// Rating-tier থ্রেশহোল্ড ও ক্যাপশন — owner-চূড়ান্ত (৭ সেপ্টেম্বর ২০২৬)।
function ratingTier(pct) {
  if (pct >= 90) return { emoji: "⭐", label: "উৎকৃষ্ট", caption: "ধারাবাহিকতা খুব ভালো, এভাবেই বজায় রাখুন।" };
  if (pct >= 80) return { emoji: "🌿", label: "খুব ভালো", caption: "সামান্য উন্নতির সুযোগ আছে।" };
  if (pct >= 70) return { emoji: "👍", label: "ভালো", caption: "নিয়মিত আমলে আরও ধারাবাহিকতা প্রয়োজন।" };
  if (pct >= 50) return { emoji: "🔄", label: "উন্নতি প্রয়োজন", caption: "কয়েকটি গুরুত্বপূর্ণ আমল নিয়মিত করার চেষ্টা করুন।" };
  return { emoji: "🌱", label: "পুনরায় ধারাবাহিকতা গড়ার পর্যায়", caption: "ছোট ছোট লক্ষ্য নিয়ে ধারাবাহিকতা গড়ুন।" };
}

// computeActivityStats — TopBottomActivityRanking(তালিকা) ও
// MonthlyOverviewSection(শুধু rating badge)-এর জন্য একই hisab reuse করার
// pure helper(৮ সেপ্টেম্বর ২০২৬-এ extract করা, কোনো logic বদলায়নি, শুধু
// component-এর ভিতর থেকে বের করে দুই জায়গায় reuse-যোগ্য করা হয়েছে — কারণ
// badge এখন শুধু Monthly Overview বক্সে দেখানো হয়, ranking বক্সে না, অথচ
// দুটোই একই Overall%/Fard-Gate hisab-এর উপর নির্ভরশীল)।
//
// চলতি মাসের ১ তারিখ থেকে "যতদিন পূরণ হয়েছে" ততদিন পর্যন্ত (আজকের এন্ট্রি
// সেভ হয়ে থাকলে আজও ধরা হয়, না থাকলে গতকাল পর্যন্ত — filled-status-ভিত্তিক,
// rigid date-cutoff না) প্রতিটা আমলের গড় % হিসাব করে(fieldPercent() reuse)।
// অতীত মাস দেখলে পুরো মাস।
//
// Fard Gate: ফরজ কাযা(fardPrayers) ঠিক ১০০% না হলে "সর্বোচ্চ" তালিকায় আসবে
// না(even ৯৯%) — "সর্বনিম্ন"-এ কোনো বাধা নেই। একই নিয়ম জামায়াতে সালাত(male-only
// field)-এর জন্য ৭০% থ্রেশহোল্ডে। এই দুইটা field সবসময় Overall%-গড়ে যোগ হয়(gate
// শুধু তালিকা-প্রদর্শনে প্রভাব ফেলে, সংখ্যায় না)।
//
// Rating badge-এ আলাদা Fard Gate: Overall ৯০%+ হলেও fardPrayers ১০০% না হলে
// "উৎকৃষ্ট" badge দেখানো হবে না(এক ধাপ নিচে নামবে, "খুব ভালো") — কিন্তু আসল
// Overall% সংখ্যা অপরিবর্তিত থাকে(owner-চূড়ান্ত সিদ্ধান্ত)।
function computeActivityStats({ monthEntries, totalDays, member, allFields, fieldPercent, pad2, toBn, monthCursor }) {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === monthCursor.year && now.getMonth() === monthCursor.month0;
  let cutoffDay = totalDays;
  if (isCurrentMonth) {
    // শুধু "আজ" special-case করলে যথেষ্ট না — গতকাল(বা তার আগের দিন)ও যদি এখনো
    // পূরণ না হয়ে থাকে(owner এখনো এন্ট্রি দেননি), সেটাও বাদ দিতে হবে। তাই আজ
    // থেকে পিছনের দিকে হেঁটে সর্বশেষ প্রকৃত-পূরণ-করা দিন খুঁজে বের করা হয়(owner
    // পর্যবেক্ষণ, ৭ সেপ্টেম্বর ২০২৬: "পূরণ না করা পর্যন্ত হিসাবে ধরা যাবে না")।
    let d = now.getDate();
    while (d >= 1 && !monthEntries[pad2(d)]) d--;
    cutoffDay = d;
  }
  if (cutoffDay < 1) return null;
  const results = [];
  for (const f of allFields) {
    const pct = fieldPercent(f, monthEntries, cutoffDay, member);
    // "ফরজ কাযা" ফিল্ডের pct আসলে ইনভার্টেড(কাযা-মুক্ত/সময়মতো-আদায়ের হার,
    // fieldPercent()-এর ডকুমেন্টেড কনভেনশন) — তালিকায় সরাসরি "ফরজ কাযা" নামে
    // এই মান দেখালে নিচের কাযা-বার্তা(complementary %)-র সাথে বৈপরীত্য মনে
    // হয়(owner পর্যবেক্ষণ, ৮ সেপ্টেম্বর ২০২৬)। তাই শুধু এই ranking-লেবেলে
    // স্পষ্ট নাম ব্যবহার করা হলো — সংখ্যা/hisab অপরিবর্তিত।
    const label = f.key === "fardPrayers" ? "ফরজ আদায় (কাযা-মুক্ত)" : f.shortLabel || f.label;
    if (pct !== null) results.push({ key: f.key, label, pct });
  }
  if (results.length === 0) return null;

  const topEligible = r => {
    if (r.key === "fardPrayers") return r.pct === 100;
    if (r.key === "jamaat") return r.pct >= 70;
    return true;
  };
  const topPercents = [...new Set(results.filter(topEligible).map(r => r.pct))].sort((a, b) => b - a).slice(0, 3);
  const topSet = new Set(topPercents);
  const bottomPercents = [...new Set(results.map(r => r.pct))].filter(p => !topSet.has(p)).sort((a, b) => a - b).slice(0, 3);
  const labelsForTop = pct => results.filter(r => r.pct === pct && topEligible(r)).map(r => r.label);
  const labelsForAny = pct => results.filter(r => r.pct === pct).map(r => r.label);
  const topTiers = topPercents.map(pct => ({ pct, labels: labelsForTop(pct) }));
  const bottomTiers = bottomPercents.map(pct => ({ pct, labels: labelsForAny(pct) }));

  const overallPct = Math.round(results.reduce((s, r) => s + r.pct, 0) / results.length);
  let badgeTier = ratingTier(overallPct);
  const fardResult = results.find(r => r.key === "fardPrayers");
  if (fardResult && fardResult.pct !== 100 && overallPct >= 90) {
    badgeTier = ratingTier(89);
  }

  let qazaJamaatBlock = null;
  if (fardResult) {
    const qazaPct = 100 - fardResult.pct;
    const jamaatResult = results.find(r => r.key === "jamaat");
    const goalMet = jamaatResult ? qazaPct === 0 && jamaatResult.pct >= 70 : qazaPct === 0;
    // টেক্সট আপডেট(৮ সেপ্টেম্বর ২০২৬, owner-চূড়ান্ত ওয়র্ডিং)।
    const infoText = jamaatResult ? `চলতি মাসে এ পর্যন্ত আপনার কাযা সালাতের হার ${toBn(qazaPct)}% এবং জামায়াতে আদায়ের হার ${toBn(jamaatResult.pct)}%।` : `চলতি মাসে এ পর্যন্ত আপনার কাযা সালাতের হার ${toBn(qazaPct)}%।`;
    const goalText = jamaatResult ? "🎯 লক্ষ্য: সালাত কোনোভাবেই কাযা না করা এবং যথাসম্ভব জামায়াতে আদায়ের চেষ্টা করা।" : "🎯 লক্ষ্য: সালাত কোনোভাবেই কাযা না করা।";
    qazaJamaatBlock = { infoText, goalText, goalMet };
  }

  return { topTiers, bottomTiers, overallPct, badgeTier, qazaJamaatBlock };
}

export function TopBottomActivityRanking({
  monthEntries,
  totalDays,
  member,
  allFields,
  fieldPercent,
  pad2,
  toBn,
  monthCursor
}) {
  const stats = computeActivityStats({ monthEntries, totalDays, member, allFields, fieldPercent, pad2, toBn, monthCursor });
  if (!stats) return null;
  const { topTiers, bottomTiers, qazaJamaatBlock } = stats;

  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)] mt-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 mb-3 text-center"
  }, "চলতি মাসে এ পর্যন্ত আপনার সর্বোচ্চ ও সর্বনিম্ন এক্টিভিটি"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4 mb-4"
  }, /*#__PURE__*/React.createElement(TierColumn, {
    heading: "সর্বোচ্চ ৩ এক্টিভিটি",
    headingColor: "#0E4B43",
    tiers: topTiers,
    rankPrefix: "সর্বোচ্চ",
    toBn: toBn
  }), /*#__PURE__*/React.createElement("div", {
    className: "border-l border-slate-200 pl-4"
  }, /*#__PURE__*/React.createElement(TierColumn, {
    heading: "আরও মনোযোগ প্রয়োজন",
    headingColor: "#B8860B",
    tiers: bottomTiers,
    rankPrefix: "সর্বনিম্ন",
    toBn: toBn
  }))), qazaJamaatBlock && /*#__PURE__*/React.createElement("div", {
    className: qazaJamaatBlock.goalMet ? "bg-[#eaf3ee] border border-[#9fc9ae] rounded-xl p-3" : "bg-[#faece7] border border-[#f0997b] rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm leading-none"
  }, qazaJamaatBlock.goalMet ? "✅" : "⚠️"), /*#__PURE__*/React.createElement("div", {
    className: qazaJamaatBlock.goalMet ? "text-xs font-bold text-[#215339] leading-relaxed" : "text-xs font-bold text-[#712b13] leading-relaxed"
  }, qazaJamaatBlock.infoText))), qazaJamaatBlock && /*#__PURE__*/React.createElement("div", {
    className: qazaJamaatBlock.goalMet ? "text-xs text-[#215339] leading-relaxed mt-1.5 pl-6" : "text-xs text-[#712b13] leading-relaxed mt-1.5 pl-6"
  }, qazaJamaatBlock.goalText));
}

// Shared month-nav control (refresh + ◀ month ▶) — verbatim JSX previously
// inlined only in MonthlyOverviewSection, now reused by Weekly/Meeting
// sections too (owner-approved, same dirty-check confirm logic, no behavior
// change — see chat: "মাসের ফিচার রিইউজ করা প্রয়োজন").
function MonthNavControl({
  monthCursor,
  setMonthCursor,
  setMonthRefreshKey,
  weeklyDirtyRef,
  meetingDirtyRef,
  BN_MONTHS,
  toBn,
  hideRefresh
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-shrink-0"
  }, !hideRefresh && /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthRefreshKey(k => k + 1),
    title: "ক্যালেন্ডার রিফ্রেশ করুন",
    className: "w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-emerald-800 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(RefreshIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-[#F5E6C8] px-2 py-1 rounded-xl border border-[#C89B3C] shadow-sm text-emerald-950"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if ((weeklyDirtyRef.current || meetingDirtyRef.current) && !window.confirm("সাপ্তাহিক রিফ্লেকশন বা মাসিক সভায় সেভ না করা পরিবর্তন আছে। মাস পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setMonthCursor(c => c.month0 === 0 ? {
        year: c.year - 1,
        month0: 11
      } : {
        year: c.year,
        month0: c.month0 - 1
      });
    },
    className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold px-1"
  }, BN_MONTHS[monthCursor.month0], " ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthCursor.year))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if ((weeklyDirtyRef.current || meetingDirtyRef.current) && !window.confirm("সাপ্তাহিক রিফ্লেকশন বা মাসিক সভায় সেভ না করা পরিবর্তন আছে। মাস পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setMonthCursor(c => c.month0 === 11 ? {
        year: c.year + 1,
        month0: 0
      } : {
        year: c.year,
        month0: c.month0 + 1
      });
    },
    className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 14
  }))));
}

export function WeeklyReflectionSection({
  addWeeklyRow,
  handleSaveWeekly,
  isLockedForSwitch,
  isLockedForThisDevice,
  monthStats,
  savingWeekly,
  setShowWeeklyInfoModal,
  updateWeekly,
  weekly,
  weeklyRowCount,
  weeklySavedTick,
  getWeekRanges,
  toBn,
  monthCursor,
  setMonthCursor,
  setMonthRefreshKey,
  weeklyDirtyRef,
  meetingDirtyRef,
  BN_MONTHS
}) {
  // §Section-level accordion(১৬ সেপ্টেম্বর ২০২৬, owner-approved): পুরো সেকশন
  // ডিফল্টে বন্ধ থাকবে। ভিতরের প্রতি-সপ্তাহ আলাদা accordion(openWeeks)
  // owner-অনুরোধে(১৬ সেপ্টেম্বর, দ্বিতীয় দফা) সরানো হয়েছে — সেকশন খোলা
  // থাকলে প্রতিটা সপ্তাহ এখন সবসময় দেখা যাবে, দ্বিতীয়-স্তর টগল আর নেই।
  const [sectionOpen, setSectionOpen] = useState(false);
  return React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setSectionOpen(o => !o),
    className: "flex items-center justify-between mb-2 cursor-pointer select-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-base text-slate-800"
  }, "সাপ্তাহিক রিফ্লেকশন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowWeeklyInfoModal(true);
    },
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 18,
    className: "text-slate-400 transition-transform" + (sectionOpen ? " rotate-180" : "")
  })), sectionOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, weeklyRowCount < getWeekRanges(monthStats.total).length ? /*#__PURE__*/React.createElement("button", {
    onClick: addWeeklyRow,
    className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " সারি যোগ করুন") : /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement(MonthNavControl, {
    monthCursor: monthCursor,
    setMonthCursor: setMonthCursor,
    setMonthRefreshKey: setMonthRefreshKey,
    weeklyDirtyRef: weeklyDirtyRef,
    meetingDirtyRef: meetingDirtyRef,
    BN_MONTHS: BN_MONTHS,
    toBn: toBn,
    hideRefresh: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-4"
  }, getWeekRanges(monthStats.total).slice(0, weeklyRowCount).map(({
    week: w,
    start,
    end
  }) => {
    return /*#__PURE__*/React.createElement("div", {
      key: w,
      className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 px-3.5 py-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-emerald-900 text-white text-xs font-bold px-2.5 py-1 rounded-full",
      style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
    }, "সপ্তাহ ", toBn(w)), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-slate-400 font-semibold",
      style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
    }, "(", toBn(start), "-", toBn(end), ")")), /*#__PURE__*/React.createElement("div", {
      className: "px-3.5 pb-3.5 space-y-2.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-bold text-slate-500 mb-1"
    }, "যা ভালো হয়েছে"), /*#__PURE__*/React.createElement("textarea", {
      value: weekly[w]?.good || "",
      onChange: e => updateWeekly(w, "good", e.target.value),
      placeholder: "এই সপ্তাহে যা ভালো হয়েছে...",
      rows: 2,
      disabled: isLockedForThisDevice,
      className: "w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-bold text-slate-500 mb-1"
    }, "কোথায় ঘাটতি ছিল"), /*#__PURE__*/React.createElement("textarea", {
      value: weekly[w]?.gap || "",
      onChange: e => updateWeekly(w, "gap", e.target.value),
      placeholder: "কোথায় ঘাটতি ছিল...",
      rows: 2,
      disabled: isLockedForThisDevice,
      className: "w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-bold text-slate-500 mb-1"
    }, "আগামী সপ্তাহের পরিকল্পনা"), /*#__PURE__*/React.createElement("textarea", {
      value: weekly[w]?.plan || "",
      onChange: e => updateWeekly(w, "plan", e.target.value),
      placeholder: "আগামী সপ্তাহের পরিকল্পনা...",
      rows: 2,
      disabled: isLockedForThisDevice,
      className: "w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
    }))));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveWeekly,
    disabled: isLockedForThisDevice || isLockedForSwitch,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
  }, savingWeekly ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : weeklySavedTick ? "সেভ হয়েছে!" : "সাপ্তাহিক রিফ্লেকশন সেভ করুন"))));
}

export function MonthlyOverviewSection({
  allFields,
  entryDirtyRef,
  leadBlanks,
  meetingDirtyRef,
  monthCursor,
  monthEntries,
  monthStats,
  selectedMember,
  setMonthCursor,
  setMonthRefreshKey,
  setPrintMode,
  setShowMonthlyInfoModal,
  setViewDate,
  total,
  weeklyDirtyRef,
  BN_MONTHS,
  BN_WEEKDAYS,
  dailyScore,
  fieldPercent,
  pad2,
  scoreColor,
  toBn,
  streak,
  // §Layout reposition(১৭ সেপ্টেম্বর ২০২৬, owner-অনুরোধ): TopBottomActivityRanking-
  // এর already-rendered element এখানে prop হিসেবে আসে(component নিজে অপরিবর্তিত,
  // শুধু render-tree-এর অবস্থান বদলেছে — app.js দ্রষ্টব্য)।
  rankingSlot
}) {
  // §Heatmap legend day-count(১৭ সেপ্টেম্বর ২০২৬, owner-approved): scoreColor()
  // -এর হুবহু একই ৪-threshold branching reuse করে প্রতিটা tier-এ কতদিন পড়ে তার
  // tally — নতুন calculation/read নয়, existing dailyScore()-ই আলাদাভাবে(calendar
  // -cell render loop থেকে independent) আরেকবার লুপ করা হচ্ছে।
  const tierCounts = { excellent: 0, good: 0, medium: 0, low: 0, empty: 0 };
  for (let d = 1; d <= total; d++) {
    const s = dailyScore(monthEntries[pad2(d)], selectedMember, allFields);
    if (s === null || s === undefined) tierCounts.empty += 1;
    else if (s >= 0.85) tierCounts.excellent += 1;
    else if (s >= 0.6) tierCounts.good += 1;
    else if (s >= 0.35) tierCounts.medium += 1;
    else if (s > 0) tierCounts.low += 1;
    else tierCounts.empty += 1;
  }
  return React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold flex items-center gap-1.5 text-base text-slate-800"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " মাসিক ওভারভিউ", /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowMonthlyInfoModal(true),
    className: "text-slate-400 hover:text-emerald-700 -ml-1",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), /*#__PURE__*/React.createElement(MonthNavControl, {
    monthCursor: monthCursor,
    setMonthCursor: setMonthCursor,
    setMonthRefreshKey: setMonthRefreshKey,
    weeklyDirtyRef: weeklyDirtyRef,
    meetingDirtyRef: meetingDirtyRef,
    BN_MONTHS: BN_MONTHS,
    toBn: toBn
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow border border-slate-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold"
  }, "গড় স্কোর"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-emerald-950",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthStats.avgPct), "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold"
  }, "পূরণ করা দিন"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-emerald-950",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthStats.filled), "/", toBn(total))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPrintMode(true),
    className: "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-100 hover:bg-emerald-100 transition-all"
  }, /*#__PURE__*/React.createElement(Printer, {
    size: 13
  }), " PDF / প্রিন্ট (২ পেজ)")), rankingSlot, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 text-xs font-bold text-slate-600 mt-4 mb-2"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 13,
    color: "var(--theme-primary)"
  }), "এক্টিভিটি ক্যালেন্ডার"), /*#__PURE__*/React.createElement("div", {
    className: "mt-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7 gap-1.5"
  }, BN_WEEKDAYS.map(w => /*#__PURE__*/React.createElement("div", {
    key: w,
    className: "text-center text-[9px] font-bold text-slate-400"
  }, w)), Array.from({
    length: leadBlanks
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: "b" + i
  })), Array.from({
    length: total
  }, (_, i) => i + 1).map(d => {
    const e = monthEntries[pad2(d)];
    const s = dailyScore(e, selectedMember, allFields);
    const cellDate = new Date(monthCursor.year, monthCursor.month0, d);
    return /*#__PURE__*/React.createElement("button", {
      key: d,
      onClick: () => {
        if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
        setViewDate(cellDate);
      },
      className: "h-7 w-full rounded-lg flex items-center justify-center text-[10px] font-bold transition-transform active:scale-90 shadow-sm",
      style: {
        background: scoreColor(s),
        color: s !== null && s >= 0.6 ? "#fff" : s !== null && s >= 0.35 ? "#7A5C00" : s !== null && s > 0 ? "#3A0D0F" : "#555",
        fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
      }
    }, toBn(d));
  }))), /* §Part B Phase ৫(heatmap legend, 2_5 Part B §B৩.৪, ১৫ সেপ্টেম্বর ২০২৬):
       কম্প্যাক্ট রঙ-legend, existing scoreColor()(appHelpers.js) ৫-tier scheme
       ও InfoModals.jsx-এর ইতিমধ্যে-বিদ্যমান ক্যালেন্ডার-রঙ legend-এর সাথে
       হুবহু sync(কোনো নতুন formula/threshold না, শুধু presentation) — পূর্ণ
       percentage-range বিবরণ আগে থেকেই ⓘ-আইকনে আছে, এটা শুধু at-a-glance
       quick-reference, tap ছাড়াই। */
  /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-slate-100"
  }, [
    { c: "var(--theme-primary)", l: "চমৎকার", n: tierCounts.excellent },
    { c: "#2563A8", l: "ভালো", n: tierCounts.good },
    { c: "#F5D061", l: "মাঝারি", n: tierCounts.medium },
    { c: "#C1666B", l: "কম", n: tierCounts.low },
    { c: "#E7EEE3", l: "খালি", n: tierCounts.empty, border: true }
  ].map(item => /*#__PURE__*/React.createElement("span", {
    key: item.l,
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-sm" + (item.border ? " border border-slate-300" : ""),
    style: { background: item.c }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-medium text-slate-500"
  }, item.l, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-700",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }, "(", toBn(item.n), ")")))))));
}

export function MeetingMinutesSection({
  addMeetingRow,
  handleSaveMeeting,
  isLockedForSwitch,
  meetingSavedTick,
  meetingState,
  monthCursor,
  removeMeetingRow,
  savingMeeting,
  setShowMeetingInfoModal,
  updateMeetingRow,
  BN_MONTHS,
  toBn,
  setMonthCursor,
  setMonthRefreshKey,
  weeklyDirtyRef,
  meetingDirtyRef
}) {
  // §Section-level accordion(১৬ সেপ্টেম্বর ২০২৬, owner-approved): Weekly
  // Reflection-এর মতোই, পুরো সেকশন ডিফল্টে বন্ধ। ভিতরের প্রতিটা row-এর
  // আলাদা accordion(openRows) owner-অনুরোধে(১৬ সেপ্টেম্বর, দ্বিতীয় দফা)
  // সরানো হয়েছে — সেকশন খোলা থাকলে প্রতিটা row এখন সবসময় দেখা যাবে।
  const [sectionOpen, setSectionOpen] = useState(false);
  const rows = meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : [];
  return React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setSectionOpen(o => !o),
    className: "flex items-center justify-between mb-2 cursor-pointer select-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-base text-slate-800"
  }, "মাসিক পারিবারিক সভা ও সিদ্ধান্ত"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowMeetingInfoModal(true);
    },
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(RefreshIcon, {
    size: 10
  }), "লাইভ সিংক")), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 18,
    className: "text-slate-400 transition-transform" + (sectionOpen ? " rotate-180" : "")
  })), sectionOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 flex-wrap gap-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: addMeetingRow,
    className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " সারি যোগ করুন"), /*#__PURE__*/React.createElement(MonthNavControl, {
    monthCursor: monthCursor,
    setMonthCursor: setMonthCursor,
    setMonthRefreshKey: setMonthRefreshKey,
    weeklyDirtyRef: weeklyDirtyRef,
    meetingDirtyRef: meetingDirtyRef,
    BN_MONTHS: BN_MONTHS,
    toBn: toBn,
    hideRefresh: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-4"
  }, rows.map((row, idx) => {
    return /*#__PURE__*/React.createElement("div", {
      key: row.id || idx,
      className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2 px-3.5 py-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-[#C89B3C] text-emerald-950 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0",
      style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
    }, "ক্র. ", toBn(idx + 1)), row.topic && /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-500 truncate"
    }, row.topic)), rows.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: () => removeMeetingRow(idx),
      className: "text-red-400 hover:text-red-600 p-1 flex-shrink-0"
    }, /*#__PURE__*/React.createElement(Trash, {
      size: 14
    }))), /*#__PURE__*/React.createElement("div", {
      className: "px-3.5 pb-3.5 space-y-2.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-bold text-slate-500 mb-1"
    }, "বিষয়"), /*#__PURE__*/React.createElement("textarea", {
      value: row.topic || "",
      onChange: e => updateMeetingRow(idx, "topic", e.target.value),
      placeholder: "বিষয়...",
      rows: 2,
      className: "w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 font-semibold bg-white resize-none"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-bold text-slate-500 mb-1"
    }, "কার্যপরিধি/সিদ্ধান্ত"), /*#__PURE__*/React.createElement("textarea", {
      value: row.decision || "",
      onChange: e => updateMeetingRow(idx, "decision", e.target.value),
      placeholder: "কার্যপরিধি/সিদ্ধান্ত...",
      rows: 2,
      className: "w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-bold text-slate-500 mb-1"
    }, "বাস্তবায়নকারী"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: row.person || "",
      onChange: e => updateMeetingRow(idx, "person", e.target.value),
      placeholder: "বাস্তবায়নকারী",
      className: "w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 font-medium bg-white"
    }))));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveMeeting,
    disabled: isLockedForSwitch,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm"
  }, savingMeeting ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 16
  }) : meetingSavedTick ? "সেভ ও সিংক হয়েছে!" : "মাসিক সভা ও সিদ্ধান্ত সেভ করুন")));
}

export function DeleteAccountWarningModal({
  handleDeleteGoogleAccount,
  setShowDeleteAccountWarning,
  showDeleteAccountWarning
}) {
  return showDeleteAccountWarning && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "⚠️"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "গুগল একাউন্ট ডিলিট নিশ্চিত করুন")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "এটি আপনার ডিভাইস থেকে গুগল অ্যাকাউন্ট সরিয়ে ফেলবে এবং সাইন আউট করে দেবে। তবে এতে আপনার অ্যাপের মূল ডেটার কোনো ক্ষতি হবে না — আপনার সম্পূর্ণ ডেটা নিরাপদে আপনার ফ্যামিলি কাস্টম কোডের সাথে সংরক্ষিত থাকবে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteAccountWarning(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল"), /*#__PURE__*/React.createElement("button", {
    onClick: handleDeleteGoogleAccount,
    className: "flex-1 h-9 bg-red-600 text-white rounded-xl text-xs font-bold"
  }, "হ্যাঁ, ডিলিট করুন"))));
}

export function AddCustomFieldModal({
  handleAddCustomField,
  isLockedForSwitch,
  newCustomLabel,
  setNewCustomLabel,
  setShowAddCustom,
  showAddCustom
}) {
  return showAddCustom && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-2 text-slate-800"
  }, "নতুন কাস্টম টাস্কের নাম"), /*#__PURE__*/React.createElement("input", {
    value: newCustomLabel,
    onChange: e => setNewCustomLabel(e.target.value),
    placeholder: "যেমন: ২ লিটার পানি পান",
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-medium focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleAddCustomField,
    disabled: isLockedForSwitch,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold"
  }, "যোগ করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddCustom(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল"))));
}

export function FeedbackModal({
  feedbackMsg,
  feedbackSending,
  feedbackStatus,
  handleSendFeedback,
  setFeedbackMsg,
  setFeedbackStatus,
  setShowFeedbackModal,
  showFeedbackModal
}) {
  return showFeedbackModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 16,
    color: "var(--theme-primary)"
  }), " পরামর্শ জানান"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(false);
      setFeedbackStatus(null);
    }
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "কোনো সমস্যা বা পরামর্শ আমাদের জানান।"), /*#__PURE__*/React.createElement("textarea", {
    value: feedbackMsg,
    onChange: e => setFeedbackMsg(e.target.value),
    rows: 4,
    placeholder: "আপনার অমূল্য পরামর্শ লিখুন...",
    disabled: feedbackSending,
    className: "w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-800 resize-none mb-2 bg-slate-50/50 disabled:opacity-60"
  }), feedbackStatus === "error" && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-red-600 mb-2"
  }, "পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।"), feedbackStatus === "sent" && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-700 mb-2"
  }, "ধন্যবাদ! আপনার পরামর্শ পাঠানো হয়েছে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSendFeedback,
    disabled: feedbackSending || !feedbackMsg.trim(),
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
  }, feedbackSending ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : feedbackStatus === "sent" ? "পাঠানো হয়েছে!" : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 14
  }), " পাঠিয়ে দিন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(false);
      setFeedbackStatus(null);
    },
    className: "h-9 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল"))));
}

// §B৭ Streak-milestone celebration(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬,
// owner-approved): existing milestone toast(৭/৩০/১০০/৩৬৫ দিন)-এর উপর
// CSS-only confetti keyframe-animation — কোনো নতুন library/dependency না,
// শুধু কয়েকটা রঙিন dot-span + একবার-চলা CSS @keyframes।
const MILESTONE_CONFETTI_COLORS = ["#C89B3C", "#2F9E44", "#0E4B43", "#E0A429", "#D64545"];

// §B৭ Weekly Summary Notification(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬,
// owner-approved — in-app, non-push variant, বিস্তারিত: architecture-review
// note অনুযায়ী প্রকৃত push(app বন্ধ অবস্থায় delivery) Cloud Function/Blaze
// লাগবে, তাই out-of-scope; এই toast শুধু app-open-এ, existing loaded
// monthEntries থেকে client-side গণনা করে দেখায়, কোনো নতুন Firestore read
// নেই। week-definition existing getWeekRanges()(app-এর নিজস্ব ৭-দিন-চাংক
// সংজ্ঞা, Weekly Reflection feature-এর সাথেই সামঞ্জস্যপূর্ণ)।
export function WeeklySummaryToast({
  weeklySummaryToast,
  setWeeklySummaryToast,
  toBn
}) {
  if (!weeklySummaryToast) return false;
  const { avgPct, filled, totalDays } = weeklySummaryToast;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-x-0 top-4 flex justify-center px-5 z-[55]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white text-[#16302B] rounded-2xl shadow-xl px-4 py-3 max-w-sm w-full flex items-center gap-3 border border-slate-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\ud83d\udcca"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold",
    style: { color: "#0E4B43" }
  }, "\u0997\u09a4 \u09b8\u09aa\u09cd\u09a4\u09be\u09b9\u09c7\u09b0 \u09b8\u09be\u09b0\u09be\u0982\u09b6"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mt-0.5"
  }, "\u0997\u09a1\u09bc \u09b8\u09cd\u0995\u09cb\u09b0 ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace", fontWeight: 700 }
  }, toBn(avgPct) + "%"), " \u00b7 ", toBn(filled), "/", toBn(totalDays), " \u09a6\u09bf\u09a8 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWeeklySummaryToast(null),
    className: "text-slate-400 hover:text-slate-700 shrink-0"
  }, /*#__PURE__*/React.createElement(X, { size: 16 }))));
}

export function MilestoneToast({
  milestoneToast,
  setMilestoneToast,
  toBn
}) {
  return milestoneToast && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, "@keyframes dtConfettiFall{0%{transform:translateY(-12px) rotate(0deg);opacity:1}100%{transform:translateY(52px) rotate(360deg);opacity:0}}"), /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-x-0 bottom-6 flex justify-center px-5 z-[60]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative bg-[#16302B] text-white rounded-2xl shadow-xl px-5 py-4 max-w-sm w-full flex items-center gap-3 border border-[#C89B3C]/40 overflow-hidden"
  }, MILESTONE_CONFETTI_COLORS.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: 0,
      left: (12 + i * 18) + "%",
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: c,
      animation: "dtConfettiFall " + (0.9 + i * 0.15) + "s ease-in " + (i * 0.08) + "s 1"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "🎉"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold",
    style: {
      color: "#C89B3C"
    }
  }, "অভিনন্দন!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-200 mt-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(milestoneToast)), " দিনের ধারাবাহিকতা পূর্ণ হয়েছে — মাশাআল্লাহ, চালিয়ে যান!")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMilestoneToast(null),
    className: "text-slate-400 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))));
}
