// A4-G6-Part C — Dashboard secondary sections: Weekly Reflection, Monthly
// Overview(+ProgressChart), Meeting Minutes, and small inline modals
// (Delete-Account-Warning, Add-Custom-Field, Feedback, Milestone-Toast).
// Extracted verbatim from legacy App() (app.js lines ~7235-7722, scattered).
// Structural-only (Owner Rule 2): no logic/condition change, only moved to its
// own file + split into named exports. ProgressChart (previously a standalone
// module-level function only used by Monthly Overview, app.js lines ~4448-4545)
// moved into this file too since it has no other caller; its module-level helper
// references (dailyScore/getThemeColor/hexToRgba/getWeekRanges/pad2/toBn) are now
// explicit props threaded through from MonthlyOverviewSection's own props (they
// were closures before — see G1 toBn prop-miss lesson, applied proactively here).
import { InfoIcon, Loader2, Plus, Trash, RefreshIcon, CalIcon, ChevronLeft, ChevronRight, Printer, MessageSquare, X } from "./icons.jsx";

// React itself is a true runtime global (established pattern — no file in this
// codebase imports it). app.js locally destructures hooks from it the same way;
// ProgressChart (moved here) needs the same destructure since it can no longer
// see app.js's local const. Chart (from Chart.js) is likewise already a true
// global in the current runtime (app.js's ProgressChart used bare Chart with
// no import/declaration at all) — unchanged, no action needed.
const { useRef, useEffect } = React;

function ProgressChart({
  monthEntries,
  totalDays,
  member,
  allFields,
  dailyScore,
  getThemeColor,
  hexToRgba,
  getWeekRanges,
  pad2,
  toBn
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  useEffect(() => {
    if (!chartRef.current) return;
    // আগে এখানে সবসময় হার্ডকোডেড ৫টি সপ্তাহ প্লট করা হতো, ফলে ২৮ দিনের
    // ফেব্রুয়ারির মতো মাসে অস্তিত্বহীন "সপ্তাহ ৫" ভুলভাবে ০% হিসেবে দেখাতো।
    // getWeekRanges() ব্যবহার করে এখন শুধু ঐ মাসে আসলে যে কয়টা সপ্তাহ আছে
    // (৪ বা ৫) সেটাই প্লট হবে — সাপ্তাহিক রিফ্লেকশন টেবিল ও প্রিন্ট PDF-এ
    // এই একই ফাংশন যেভাবে ব্যবহৃত হয়, সেভাবে।
    const weekRanges = getWeekRanges(totalDays);
    const weekLabels = weekRanges.map(({
      week
    }) => `সপ্তাহ ${toBn(week)}`);
    const weekScores = weekRanges.map(({
      start,
      end
    }) => {
      let sum = 0;
      let count = 0;
      for (let d = start; d <= end; d++) {
        const e = monthEntries[pad2(d)];
        const s = dailyScore(e, member, allFields);
        if (s !== null) {
          sum += s;
          count += 1;
        }
      }
      return count ? Math.round(sum / count * 100) : 0;
    });
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    const ctx = chartRef.current.getContext("2d");
    const themePrimary = getThemeColor("#0E4B43");
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: weekLabels,
        datasets: [{
          label: "সাপ্তাহিক গড় স্কোর (%)",
          data: weekScores,
          borderColor: themePrimary,
          backgroundColor: hexToRgba(themePrimary, 0.1),
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#C89B3C"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              font: {
                size: 10
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 10
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [monthEntries, totalDays, member, allFields]);
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full h-32 mt-2"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: chartRef
  }));
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
  compact,
  hideRefresh
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-shrink-0"
  }, !hideRefresh && /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthRefreshKey(k => k + 1),
    title: "ক্যালেন্ডার রিফ্রেশ করুন",
    className: compact ? "w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm text-emerald-800 hover:bg-slate-50 flex-shrink-0" : "w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-emerald-800 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(RefreshIcon, {
    size: compact ? 11 : 13
  })), /*#__PURE__*/React.createElement("div", {
    className: compact ? "flex items-center gap-0.5 bg-white pl-0.5 pr-1 py-0.5 rounded-lg border border-slate-200 shadow-sm flex-shrink-0" : "flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm"
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
    className: compact ? "w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-100 flex-shrink-0" : "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: compact ? 12 : 14
  })), /*#__PURE__*/React.createElement("span", {
    className: compact ? "text-[10px] font-bold px-0.5 text-slate-700 whitespace-nowrap" : "text-xs font-bold px-1 text-slate-700"
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
    className: compact ? "w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-100 flex-shrink-0" : "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: compact ? 12 : 14
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
  return React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 gap-2 overflow-x-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-shrink-0"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-base text-slate-800 whitespace-nowrap"
  }, "সাপ্তাহিক রিফ্লেকশন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowWeeklyInfoModal(true),
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex justify-center"
  }, weeklyRowCount < getWeekRanges(monthStats.total).length && /*#__PURE__*/React.createElement("button", {
    onClick: addWeeklyRow,
    className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm whitespace-nowrap"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " সারি যোগ করুন")), /*#__PURE__*/React.createElement(MonthNavControl, {
    monthCursor: monthCursor,
    setMonthCursor: setMonthCursor,
    setMonthRefreshKey: setMonthRefreshKey,
    weeklyDirtyRef: weeklyDirtyRef,
    meetingDirtyRef: meetingDirtyRef,
    BN_MONTHS: BN_MONTHS,
    toBn: toBn,
    compact: true,
    hideRefresh: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse min-w-[560px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-2 border-r border-slate-200 text-center w-16"
  }, "সপ্তাহ"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "যা ভালো হয়েছে"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "কোথায় ঘাটতি ছিল"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 text-left"
  }, "আগামী সপ্তাহের পরিকল্পনা"))), /*#__PURE__*/React.createElement("tbody", null, getWeekRanges(monthStats.total).slice(0, weeklyRowCount).map(({
    week: w,
    start,
    end
  }) => /*#__PURE__*/React.createElement("tr", {
    key: w,
    className: "border-b border-slate-200 hover:bg-slate-50/50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-emerald-900 bg-slate-50/80"
  }, "সপ্তাহ ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(w)), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-semibold text-slate-400 mt-0.5",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, "(", toBn(start), "-", toBn(end), ")")), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.good || "",
    onChange: e => updateWeekly(w, "good", e.target.value),
    placeholder: "এই সপ্তাহে যা ভালো হয়েছে...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.gap || "",
    onChange: e => updateWeekly(w, "gap", e.target.value),
    placeholder: "কোথায় ঘাটতি ছিল...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.plan || "",
    onChange: e => updateWeekly(w, "plan", e.target.value),
    placeholder: "আগামী সপ্তাহের পরিকল্পনা...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  }))))))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveWeekly,
    disabled: isLockedForThisDevice || isLockedForSwitch,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
  }, savingWeekly ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : weeklySavedTick ? "সেভ হয়েছে!" : "সাপ্তাহিক রিফ্লেকশন সেভ করুন")));
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
  pad2,
  scoreColor,
  toBn,
  getThemeColor,
  hexToRgba,
  getWeekRanges
}) {
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
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
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
  }), " PDF / প্রিন্ট (২ পেজ)")), /*#__PURE__*/React.createElement(ProgressChart, {
    monthEntries: monthEntries,
    totalDays: monthStats.total,
    member: selectedMember,
    allFields: allFields,
    dailyScore: dailyScore,
    getThemeColor: getThemeColor,
    hexToRgba: hexToRgba,
    getWeekRanges: getWeekRanges,
    pad2: pad2,
    toBn: toBn
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
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
        color: s !== null && s >= 0.35 ? "#fff" : "#555",
        fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
      }
    }, toBn(d));
  })))));
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
  return React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-base text-slate-800"
  }, "মাসিক পারিবারিক সভা ও সিদ্ধান্ত"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowMeetingInfoModal(true),
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(RefreshIcon, {
    size: 10
  }), "লাইভ সিংক"))), /*#__PURE__*/React.createElement("div", {
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
    toBn: toBn
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse min-w-[500px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    onClick: addMeetingRow,
    title: "নতুন সারি যোগ করতে ক্লিক করুন",
    className: "py-2.5 px-2 border-r border-slate-200 text-center w-12 cursor-pointer hover:bg-emerald-100 text-emerald-900 transition-colors select-none"
  }, "ক্র. ✚"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left w-1/4"
  }, "বিষয়"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "কার্যপরিধি/সিদ্ধান্ত"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-center w-1/4"
  }, "বাস্তবায়নকারী"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-1 text-center w-8"
  }))), /*#__PURE__*/React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : []).map((row, idx) => /*#__PURE__*/React.createElement("tr", {
    key: row.id || idx,
    className: "border-b border-slate-200 hover:bg-slate-50/50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-slate-700 bg-slate-50/80"
  }, toBn(idx + 1)), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: row.topic || "",
    onChange: e => updateMeetingRow(idx, "topic", e.target.value),
    placeholder: "বিষয়...",
    rows: 2,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 font-semibold bg-white resize-none"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: row.decision || "",
    onChange: e => updateMeetingRow(idx, "decision", e.target.value),
    placeholder: "কার্যপরিধি/সিদ্ধান্ত...",
    rows: 2,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: row.person || "",
    onChange: e => updateMeetingRow(idx, "person", e.target.value),
    placeholder: "বাস্তবায়নকারী",
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 text-center font-medium bg-white"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1 text-center"
  }, meetingState.rows.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => removeMeetingRow(idx),
    className: "text-red-400 hover:text-red-600 p-1"
  }, /*#__PURE__*/React.createElement(Trash, {
    size: 14
  })))))))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveMeeting,
    disabled: isLockedForSwitch,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm"
  }, savingMeeting ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 16
  }) : meetingSavedTick ? "সেভ ও সিংক হয়েছে!" : "মাসিক সভা ও সিদ্ধান্ত সেভ করুন")));
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

export function MilestoneToast({
  milestoneToast,
  setMilestoneToast,
  toBn
}) {
  return milestoneToast && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-x-0 bottom-6 flex justify-center px-5 z-[60]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#16302B] text-white rounded-2xl shadow-xl px-5 py-4 max-w-sm w-full flex items-center gap-3 border border-[#C89B3C]/40"
  }, /*#__PURE__*/React.createElement("span", {
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
  }))));
}
