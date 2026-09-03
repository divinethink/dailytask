// A4-G6-Part D — Daily Entry Section (banners, date-nav, daily inspiration,
// দৈনন্দিন আমল entry form — the most-used part of the app), extracted verbatim
// from legacy App() (app.js lines ~7016-7235). FieldGroup/BoolToggle/CountStepper/
// NumberField/LabelText (previously standalone module-level helper components,
// app.js lines ~3128,4361-4447,7724-7806, used ONLY by this section) moved into
// this same file since they have no other caller. Structural-only (Owner Rule 2):
// no logic/condition change — only moved + explicit prop-threading for what were
// previously module-scope closures (fieldApplies/isExcused/isFieldExcusable/toBn),
// applied proactively per the G1 toBn prop-miss lesson (nothing assumed global
// except React and icons.jsx imports).
import { CalIcon, ChevronLeft, ChevronRight, ClockIcon, Loader2, Plus, X, Check, InfoIcon } from "./icons.jsx";

function LabelText({
  text
}) {
  const parts = String(text ?? "").split(/([০-৯]+)/g);
  return parts.map((part, i) => /^[০-৯]+$/.test(part) ? /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      fontWeight: 700,
      color: "var(--theme-primary)"
    }
  }, part) : /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, part));
}

function BoolToggle({
  value,
  onChange,
  disabled
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(!value),
    className: "flex items-center justify-center w-11 h-11 rounded-xl border-2 transition-all shrink-0 shadow-sm",
    style: {
      borderColor: value ? "var(--theme-primary)" : "#D8DED3",
      background: value ? "var(--theme-primary)" : "#FFFFFF"
    }
  }, value ? /*#__PURE__*/React.createElement(Check, {
    size: 20,
    color: "#F4F7F1"
  }) : /*#__PURE__*/React.createElement(X, {
    size: 16,
    color: "#B9C2B2"
  }));
}

function CountStepper({
  value,
  onChange,
  max,
  disabled,
  toBn
}) {
  const v = Number(value) || 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(Math.max(0, v - 1)),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "−"), /*#__PURE__*/React.createElement("span", {
    className: "w-8 text-center font-bold text-sm",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "#16302B"
    }
  }, toBn(v)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(Math.min(max, v + 1)),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "+"));
}

function NumberField({
  value,
  onChange,
  disabled,
  target,
  toBn
}) {
  // Stepper (+/-) UI matching CountStepper, but intentionally uncapped on the
  // "+" side (unlike CountStepper's max) — user may log more than `target`
  // (e.g. more Quran pages than the daily goal) and percentage calculation
  // (appHelpers fieldPercent/monthly-percent) already caps at 100% via
  // Math.min(field.target, value), so no separate capping needed here.
  const v = Number(value) || 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(Math.max(0, v - 1)),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("span", {
    className: "w-8 text-center font-bold text-sm",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "#16302B"
    }
  }, toBn(v)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(v + 1),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "+")));
  // `target` prop intentionally unused/not rendered (owner request: hide the
  // "/২" suffix) — kept in the function signature so the FieldGroup call-site
  // (which still passes `target: f.target`) needs no change.
}

function FieldGroup({
  title,
  fields,
  entry,
  onChange,
  onToggleExcuse,
  onInfoClick,
  member,
  disabled,
  fieldApplies,
  isExcused,
  isFieldExcusable,
  toBn
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-950"
  }, title), onInfoClick && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onInfoClick,
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, fields.filter(f => fieldApplies(f, member)).map(f => {
    const fieldExcusable = isFieldExcusable(f, member);
    const excused = !!(fieldExcusable && isExcused(entry, f.key));
    const rowDisabled = disabled || excused;
    return /*#__PURE__*/React.createElement("div", {
      key: f.key,
      className: "flex items-center justify-between gap-3" + (disabled ? " opacity-40" : "")
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-medium text-slate-700"
    }, /*#__PURE__*/React.createElement(LabelText, {
      text: f.label
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, fieldExcusable && /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: disabled,
      onClick: () => onToggleExcuse(f.key, !excused),
      className: "px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 transition-all",
      style: excused ? {
        background: "#C89B3C",
        borderColor: "#C89B3C",
        color: "#16302B"
      } : {
        background: "#fff",
        borderColor: "#D8DED3",
        color: "#8A9A8F"
      }
    }, "ওজর"), f.type === "bool" && /*#__PURE__*/React.createElement(BoolToggle, {
      value: !!entry[f.key],
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled
    }), f.type === "count" && /*#__PURE__*/React.createElement(CountStepper, {
      value: entry[f.key],
      max: f.max,
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled,
      toBn: toBn
    }), f.type === "number" && /*#__PURE__*/React.createElement(NumberField, {
      value: entry[f.key],
      target: f.target,
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled,
      toBn: toBn
    })));
  })));
}

export function DailyEntrySection({
  codeChangeNotice,
  customFields,
  dismissMonthlyReminder,
  dismissWeeklyReminder,
  entry,
  entryDirtyRef,
  handleDateTouchEnd,
  handleDateTouchStart,
  handleSave,
  isLockedForSwitch,
  isLockedForThisDevice,
  monthlyReminderBanner,
  openHistoryModal,
  recoveryMessage,
  savedTick,
  saving,
  selectedMember,
  setCodeChangeNotice,
  setRecoveryMessage,
  setShowAddCustom,
  setShowExcuseInfoModal,
  setViewDate,
  updateExcuse,
  updateField,
  viewDate,
  weeklyReminderBanner,
  BN_MONTHS,
  DEFAULT_DEEN_FIELDS,
  DEFAULT_DUNIYA_FIELDS,
  dateKey,
  formatBnDateTime,
  getDailyInspiration,
  getHijriDate,
  isFutureDate,
  toBn,
  fieldApplies,
  isExcused,
  isFieldExcusable
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, recoveryMessage && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-[#0E4B43] to-[#153f39] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🌱"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আবার শুরু করুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-100/90 leading-relaxed mt-0.5"
  }, "আগের দিনগুলো নিয়ে ভাববেন না — আজ থেকেই নতুনভাবে শুরু করুন।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      localStorage.setItem("recovery_dismissed_on", dateKey(new Date()));
      setRecoveryMessage(false);
    },
    className: "text-emerald-200/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), weeklyReminderBanner && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#C0286B] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🗓️"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "সাপ্তাহিক রিফ্লেকশন করতে ভুলবেন না যেন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "এই সপ্তাহের ভালো-মন্দ ও পরিকল্পনা লিখে রাখুন — নিচে স্ক্রল করে পূরণ করতে পারবেন।")), /*#__PURE__*/React.createElement("button", {
    onClick: dismissWeeklyReminder,
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), monthlyReminderBanner && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#9F1239] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "👨‍👩‍👧‍👦"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আজ মাসিক পারিবারিক পর্যালোচনার দিন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "পরিবারের সবাইকে নিয়ে বসুন এবং অগ্রগতি মূল্যায়ন করুন। সভা শেষে পিডিএফ ফাইল ডাউনলোড ও ডেটার ব্যাকআপ নিতে ভুলবেন না।")), /*#__PURE__*/React.createElement("button", {
    onClick: dismissMonthlyReminder,
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), codeChangeNotice && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#0E4B43] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🔔"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আপনাদের ফ্যামিলি ইউজারনেম এডমিন কর্তৃক পরিবর্তন করা হয়েছে"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "বর্তমান কোড: " + codeChangeNotice)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCodeChangeNotice(null),
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    onTouchStart: handleDateTouchStart,
    onTouchEnd: handleDateTouchEnd,
    className: "bg-white rounded-2xl shadow-sm px-4 py-2.5 flex items-center justify-between border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setViewDate(d => {
        const n = new Date(d);
        n.setDate(n.getDate() - 1);
        return n;
      });
    },
    className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm text-slate-800 flex flex-col items-center gap-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace", fontWeight: 700 }
  }, toBn(viewDate.getDate())), " ", BN_MONTHS[viewDate.getMonth()], " ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace", fontWeight: 700 }
  }, toBn(viewDate.getFullYear())))), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-semibold text-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, toBn(getHijriDate(viewDate).day)), " ", getHijriDate(viewDate).month, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, toBn(getHijriDate(viewDate).year)), " হিজরি")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setViewDate(d => {
        const n = new Date(d);
        n.setDate(n.getDate() + 1);
        return n;
      });
    },
    className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, (() => {
    const insp = getDailyInspiration(viewDate);
    const tagLabel = insp.type === "ayat" ? "আয়াত" : insp.type === "hadith" ? "হাদীস" : "উক্তি";
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl p-4 shadow-sm",
      style: {
        background: "linear-gradient(135deg, var(--theme-primary), #153f39)"
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] font-bold mb-1.5",
      style: {
        color: "#C89B3C"
      }
    }, "✦ আজকের তাযকিরাহ · ", tagLabel), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-white leading-relaxed"
    }, insp.text), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-emerald-200/70 mt-1.5 text-right"
    }, "— ", insp.ref));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-5 space-y-4"
  }, /*#__PURE__*/React.createElement(FieldGroup, {
    title: "দৈনন্দিন আমল",
    fields: DEFAULT_DEEN_FIELDS,
    entry: entry,
    onChange: updateField,
    onToggleExcuse: updateExcuse,
    onInfoClick: () => setShowExcuseInfoModal(true),
    member: selectedMember,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice,
    fieldApplies: fieldApplies,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    toBn: toBn
  }), /*#__PURE__*/React.createElement(FieldGroup, {
    title: "ব্যক্তিগত ও পারিবারিক অভ্যাস",
    fields: DEFAULT_DUNIYA_FIELDS,
    entry: entry,
    onChange: updateField,
    member: selectedMember,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice,
    fieldApplies: fieldApplies,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    toBn: toBn
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-900"
  }, "কাস্টম টাস্ক (ব্যক্তিগত লক্ষ্য)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddCustom(true),
    className: "text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " নতুন টাস্ক")), customFields.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 text-center py-2"
  }, "কোন কাস্টম টাস্ক নেই। উপরে বোতামে ক্লিক করে যোগ করুন।") : customFields.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    className: "flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0" + (isFutureDate(viewDate) || isLockedForThisDevice ? " opacity-40" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-slate-700"
  }, /*#__PURE__*/React.createElement(LabelText, {
    text: f.label
  })), /*#__PURE__*/React.createElement(BoolToggle, {
    value: !!entry[f.key],
    onChange: v => updateField(f.key, v),
    disabled: isFutureDate(viewDate) || isLockedForThisDevice
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold text-slate-800 mb-2"
  }, "দিনের নোট / আত্ম-সমালোচনা"), /*#__PURE__*/React.createElement("textarea", {
    value: entry.note || "",
    onChange: e => updateField("note", e.target.value),
    rows: 2,
    placeholder: "আজকের অনুভূতি, অর্জন বা শেখা বিষয় লিখুন...",
    disabled: isFutureDate(viewDate) || isLockedForThisDevice,
    className: "w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-700 transition-all resize-none bg-slate-50/50 focus:bg-white disabled:opacity-40"
  })), entry.lastEditedAt && !isFutureDate(viewDate) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 font-medium"
  }, "সর্বশেষ পরিবর্তন: ", formatBnDateTime(entry.lastEditedAt)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openHistoryModal,
    className: "flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950"
  }, /*#__PURE__*/React.createElement(ClockIcon, {
    size: 12
  }), " ইতিহাস দেখুন")), isFutureDate(viewDate) && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3"
  }, "ভবিষ্যতের তারিখের জন্য আমল টিক দেওয়া যাবে না — আজকের তারিখে ফিরে যান।"), isLockedForThisDevice && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-center text-slate-600 bg-slate-100 border border-slate-200 rounded-xl py-2 px-3"
  }, "এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে শুধু দেখা যাবে, এডিট করা যাবে না।"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice || isLockedForSwitch,
    className: "w-full h-12 rounded-2xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100",
    style: {
      background: savedTick ? "#4C8C74" : "var(--theme-primary)"
    }
  }, saving ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 18
  }) : savedTick ? "সেভ হয়েছে!" : "আজকের ডেটা সেভ করুন")));
}
