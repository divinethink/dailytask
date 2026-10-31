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
import { homeEntryCards } from "./HomeFold.jsx";
import { MuhasabaStrip } from "./MuhasabaStrip.jsx";
import { sanitizeTasks, activeTasks, archivedTasks, addTask, renameTask, setArchived, taskFields, MAX_ACTIVE, MAX_LABEL, TASK_KEY_PREFIX } from "../legacy/customTasks.js";
import { CalIcon, ChevronLeft, ChevronRight, ChevronDown, ClockIcon, Loader2, Plus, X, Check, InfoIcon, ClipboardListIcon, MosqueIcon, BookIcon, SparkleIcon, FamilyIcon, EditIcon, Trash } from "./icons.jsx";

// §B৭ Home category-header icon map(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬, owner-approved):
// DEEN_CATEGORY_GROUPS/duniya-bucket-এর id অনুযায়ী emoji("🕌📖🤲🏃")-এর বদলে
// monochrome outline icon component বেছে নেয়া হয় — appHelpers.js("pure utility",
// কোনো icon-import নেই) অপরিবর্তিত রেখে এই mapping এখানেই রাখা হলো। যিকির ও
// দাওয়াহ-এর জন্য SparkleIcon(নতুন, filled) — বটম-ন্যাভের "তাসবীহ"(dot-bead
// circle) থেকে আলাদা রাখতে TasbihIcon পুনর্ব্যবহার করা হয়নি। ব্যক্তিগত ও
// পারিবারিক অভ্যাস-এর জন্য FamilyIcon(৩-সদস্য abstract mark, UsersIcon-এর
// ২-জনের human-silhouette-এর বদলে — ধর্মীয় sensitivity-due-to no clear human
// figure)।
const CATEGORY_ICON_COMPONENTS = {
  salah: MosqueIcon,
  quranIlm: BookIcon,
  dhikrDawah: SparkleIcon,
  duniya: FamilyIcon
};

// §B৭ Haptic feedback(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬, owner-approved):
// native Web Vibration API, silent no-op যদি browser/device সাপোর্ট না করে
// (যেমন iOS Safari-তে navigator.vibrate নেই) — কোনো নতুন library/dependency না।
function haptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(10);
  } catch {}
}

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
    onClick: () => { haptic(); onChange(!value); },
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

// §Part B Phase ৪(touch-target, 2_5 Part B §B৩.২/§B৬, ১৫ সেপ্টেম্বর ২০২৬):
// +/− বাটন ৩২→৩৬px(w-9 h-9, interactive-mockup-confirmed spec) — CSS-only,
// CountStepper ও NumberField উভয়ের +/− বাটনে। ক্যালেন্ডার-নেভ chevron(◀/▶,
// নিচে date-nav card-এ) ইচ্ছাকৃতভাবে touch করা হয়নি — mockup-এ শুধু
// stepper-এর কথা বলা হয়েছে, scope-এর বাইরে কিছু বদলানো হয়নি।
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
    onClick: () => { haptic(); onChange(Math.max(0, v - 1)); },
    className: "w-9 h-9 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "var(--theme-ink, #16302B)"
    }
  }, "−"), /*#__PURE__*/React.createElement("span", {
    className: "w-8 text-center font-bold text-sm",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "var(--theme-ink, #16302B)"
    }
  }, toBn(v)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => { haptic(); onChange(Math.min(max, v + 1)); },
    className: "w-9 h-9 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "var(--theme-ink, #16302B)"
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
    onClick: () => { haptic(); onChange(Math.max(0, v - 1)); },
    className: "w-9 h-9 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "var(--theme-ink, #16302B)"
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("span", {
    className: "w-8 text-center font-bold text-sm",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "var(--theme-ink, #16302B)"
    }
  }, toBn(v)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => { haptic(); onChange(v + 1); },
    className: "w-9 h-9 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "var(--theme-ink, #16302B)"
    }
  }, "+")));
  // `target` prop intentionally unused/not rendered (owner request: hide the
  // "/২" suffix) — kept in the function signature so the FieldGroup call-site
  // (which still passes `target: f.target`) needs no change.
}

// §Part B Phase ২(category-accordion, 2_5 Part B §B৩.২, ১৫ সেপ্টেম্বর ২০২৬):
// FieldGroup এখন সবসময় collapsible(আগে সবসময় খোলা flat card ছিল, নিচের নতুন
// DailyEntrySection render-এ ৪টা category-ই এই একই FieldGroup ব্যবহার করে)।
// percent/percentColor না দিলে badge দেখা যাবে না(backward-compatible, ভবিষ্যতে
// অন্য কোনো caller percent ছাড়া ব্যবহার করলেও ভাঙবে না)।
// §Part B §B৫(Category collapse-state persist, 2_5 Part B §B৫, ১৫ সেপ্টেম্বর
// ২০২৬): `categoryId` দিলে open/close state sessionStorage-এ(key:
// `dt_home_accordion_<categoryId>`, existing `dt_`-prefix pattern) persist
// হয় — একই tab-session-এ tab-বদল/reload-এও accordion-state মনে থাকে।
// `categoryId` optional(backward-compatible): না দিলে আগের in-memory-only
// আচরণ অপরিবর্তিত।
function FieldGroup({
  title,
  icon,
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
  toBn,
  percent,
  percentColor,
  defaultOpen,
  categoryId,
  fold
}) {
  const storageKey = categoryId ? "dt_home_accordion_" + categoryId : null;
  const [open, setOpen] = React.useState(() => {
    if (fold === "fixed") return true;
    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved !== null) return saved === "1";
      } catch {}
    }
    return !!defaultOpen;
  });
  const toggleOpen = () => fold === "fixed" ? undefined : setOpen(o => {
    const next = !o;
    if (storageKey) {
      try { sessionStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
    }
    return next;
  });
  const percentLabel = percent === null || percent === undefined ? null : toBn(percent) + "%";
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: toggleOpen,
    className: "w-full flex items-center justify-between gap-2" + (open ? " mb-3" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 min-w-0"
  }, icon && (typeof icon === "function" ? /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 flex items-center"
  }, /*#__PURE__*/React.createElement(icon, {
    size: 16,
    color: "var(--theme-primary)"
  })) : /*#__PURE__*/React.createElement("span", {
    className: "text-base shrink-0"
  }, icon)), /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-950 text-left"
  }, title), onInfoClick && /*#__PURE__*/React.createElement("span", {
    role: "button",
    tabIndex: 0,
    onClick: e => { e.stopPropagation(); onInfoClick(); },
    className: "text-slate-400 hover:text-emerald-700 shrink-0",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 shrink-0"
  }, percentLabel && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold px-1.5 py-0.5 rounded-md",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: percentColor || "#5B6B64",
      background: "var(--color-primary-soft, #E8F0EE)"
    }
  }, percentLabel), fold === "fixed" ? null : /*#__PURE__*/React.createElement(ChevronDown, {
    size: 15,
    color: "#8A9A8F",
    className: "transition-transform" + (open ? " rotate-180" : "")
  }))), open && /*#__PURE__*/React.createElement("div", {
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
        background: "var(--theme-accent, #C89B3C)",
        borderColor: "var(--theme-accent, #C89B3C)",
        color: "var(--theme-ink, #16302B)"
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

// §B৭ "অন্যান্য" collapsible wrapper(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬,
// owner-approved — কাস্টম টাস্ক + দিনের নোট, আগে ২টা পৃথক সবসময়-খোলা card,
// এখন একটাই collapsible card): FieldGroup-এর header/accordion pattern
// (sessionStorage-persisted open-state, icon+title+chevron) হুবহু reuse করে,
// কিন্তু arbitrary children নেয় (percent badge নেই — এই দুটো ফ্রি-ফর্ম এন্ট্রি,
// percentage-বেসড ট্র্যাকযোগ্য আইটেম না)।
function CollapsibleCard({
  title,
  icon,
  children,
  defaultOpen,
  categoryId,
  fold,
  percent,
  percentColor,
  toBn
}) {
  const storageKey = categoryId ? "dt_home_accordion_" + categoryId : null;
  const [open, setOpen] = React.useState(() => {
    if (fold === "fixed") return true;
    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved !== null) return saved === "1";
      } catch {}
    }
    return !!defaultOpen;
  });
  const toggleOpen = () => fold === "fixed" ? undefined : setOpen(o => {
    const next = !o;
    if (storageKey) {
      try { sessionStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
    }
    return next;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: toggleOpen,
    className: "w-full flex items-center justify-between gap-2" + (open ? " mb-3" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 min-w-0"
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "shrink-0 flex items-center"
  }, /*#__PURE__*/React.createElement(icon, {
    size: 16,
    color: "var(--theme-primary)"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-950 text-left"
  }, title)), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 shrink-0"
  }, percent !== null && percent !== undefined && toBn && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold px-1.5 py-0.5 rounded-md",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: percentColor || "#5B6B64",
      background: "var(--color-primary-soft, #E8F0EE)"
    }
  }, toBn(percent) + "%"), fold === "fixed" ? null : /*#__PURE__*/React.createElement(ChevronDown, {
    size: 15,
    color: "#8A9A8F",
    className: "transition-transform" + (open ? " rotate-180" : "")
  }))), open && children);
}

// কাস্টম টাস্ক কার্ডের ভেতরের অংশ(সদস্যভিত্তিক, owner-approved): যোগ("সেভ"), এডিট(রিনেম/আর্কাইভ), আর্কাইভ-তালিকা(ফিরিয়ে আনা)।
// আর্কাইভ মানে মোছা নয় — পুরনো এন্ট্রির ডেটা অক্ষত থাকে। সেভ ব্যর্থ হলে তালিকা আগের অবস্থায় থাকে ও বার্তা দেখায়।
function CustomTasksBody({
  tasks,
  entry,
  toggleDisabled,
  manageDisabled,
  onToggle,
  onSaveTasks
}) {
  const h = React.createElement;
  const list = sanitizeTasks(tasks);
  const active = activeTasks(list);
  const archived = archivedTasks(list);
  const [newLabel, setNewLabel] = React.useState("");
  const [editId, setEditId] = React.useState(null);
  const [editLabel, setEditLabel] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  async function commit(next) {
    if (busy || !onSaveTasks) return false;
    setBusy(true);
    setError(false);
    try {
      await onSaveTasks(next);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function add() {
    const next = addTask(list, newLabel);
    if (next === list) return;
    if (await commit(next)) {
      setNewLabel("");
      setShowAdd(false);
    }
  }
  async function saveEdit() {
    const next = renameTask(list, editId, editLabel);
    if (next === list) {
      setEditId(null);
      return;
    }
    if (await commit(next)) setEditId(null);
  }
  async function archive(id) {
    if (!window.confirm("টাস্কটি রিমুভ করবেন? এটি ফর্ম ও হিসাব থেকে সরবে, পুরনো রেকর্ড অক্ষত থাকবে। পরে ফিরিয়ে আনা যাবে।")) return;
    if (await commit(setArchived(list, id, true))) setEditId(null);
  }
  const small = "shrink-0 h-9 px-3 rounded-xl text-xs font-bold border disabled:opacity-40";
  const canAdd = !manageDisabled && !busy && newLabel.trim() && active.length < MAX_ACTIVE;
  return h("div", null,
    active.length === 0 && h("div", {
      className: "flex flex-col items-center gap-2 text-center py-3"
    }, h(ClipboardListIcon, { size: 28, color: "#B9C2B2" }), h("p", {
      className: "text-xs text-slate-400"
    }, "কোনো কাস্টম টাস্ক নেই। নিচে নতুন টাস্ক চাপ দিয়ে যোগ করুন।")),
    active.map(t => editId === t.id ? h("div", {
      key: t.id,
      className: "py-2 border-b border-slate-100 space-y-2"
    }, h("input", {
      type: "text",
      value: editLabel,
      maxLength: MAX_LABEL,
      autoFocus: true,
      onChange: e => setEditLabel(e.target.value),
      "aria-label": "টাস্কের নাম",
      className: "w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-800"
    }), h("div", { className: "flex gap-2" },
      h("button", { type: "button", onClick: saveEdit, disabled: busy || !editLabel.trim(), className: small + " bg-emerald-800 text-white border-emerald-800" }, "সেভ"),
      h("button", { type: "button", onClick: () => archive(t.id), disabled: busy, "aria-label": "টাস্ক রিমুভ", className: small + " bg-slate-50 text-red-700 border-slate-200 flex items-center gap-1" }, h(Trash, { size: 13 }), "রিমুভ"),
      h("button", { type: "button", onClick: () => setEditId(null), disabled: busy, className: small + " bg-white text-slate-600 border-slate-200" }, "বাতিল")
    )) : h("div", {
      key: t.id,
      className: "flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0"
    }, h("span", { className: "text-sm font-medium text-slate-700 min-w-0 break-words" }, h(LabelText, { text: t.label })),
      h("div", { className: "flex items-center gap-2 shrink-0" },
        !manageDisabled && h("button", {
          type: "button",
          onClick: () => { setEditId(t.id); setEditLabel(t.label); },
          "aria-label": t.label + " এডিট",
          className: "w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-800"
        }, h(EditIcon, { size: 14 })),
        h("span", { className: toggleDisabled ? "opacity-40" : "" }, h(BoolToggle, {
          value: !!entry[TASK_KEY_PREFIX + t.id],
          onChange: v => onToggle(TASK_KEY_PREFIX + t.id, v),
          disabled: toggleDisabled
        }))
      ))),
    (archived.length > 0 || (!manageDisabled && !showAdd && active.length < MAX_ACTIVE)) && h("div", { className: "flex items-center gap-5 pt-2 pb-0.5" },
      !manageDisabled && !showAdd && active.length < MAX_ACTIVE && h("button", {
        type: "button",
        onClick: () => setShowAdd(true),
        className: "flex items-center gap-1 text-xs font-bold text-emerald-800"
      }, h(Plus, { size: 13 }), "নতুন টাস্ক"),
      archived.length > 0 && h("button", {
        type: "button",
        onClick: () => setShowArchived(v => !v),
        className: "text-xs font-bold text-slate-500"
      }, (showArchived ? "▾ " : "▸ ") + "আর্কাইভ করা (" + archived.length + ")")),
    showAdd && !manageDisabled && h("div", { className: "mt-2 flex items-center gap-2" },
      h("input", {
        type: "text",
        value: newLabel,
        maxLength: MAX_LABEL,
        placeholder: "নতুন টাস্কের নাম",
        disabled: manageDisabled || active.length >= MAX_ACTIVE,
        autoFocus: true,
        onChange: e => setNewLabel(e.target.value),
        onKeyDown: e => { if (e.key === "Enter") add(); },
        "aria-label": "নতুন টাস্কের নাম",
        className: "min-w-0 flex-1 h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-800 disabled:opacity-40"
      }),
      h("button", { type: "button", onClick: add, disabled: !canAdd, className: small + " h-10 bg-emerald-800 text-white border-emerald-800" }, busy ? "…" : "সেভ"),
      h("button", { type: "button", onClick: () => { setShowAdd(false); setNewLabel(""); }, "aria-label": "বাতিল", className: "shrink-0 w-8 h-10 flex items-center justify-center text-slate-400" }, h(X, { size: 16 }))
    ),
    active.length >= MAX_ACTIVE && h("p", { className: "mt-2 text-[11px] text-amber-700" }, "সর্বোচ্চ " + MAX_ACTIVE + "টি সক্রিয় টাস্ক। নতুন যোগ করতে পুরনো কোনোটি আর্কাইভ করুন।"),
    error && h("p", { role: "alert", className: "mt-2 text-xs text-red-700" }, "সেভ হয়নি। আবার চেষ্টা করুন।"),
    archived.length > 0 && h("div", null,
      showArchived && h("ul", { className: "mt-2 space-y-2" }, archived.map(t => h("li", {
        key: t.id,
        className: "flex items-center justify-between gap-2 opacity-70"
      }, h("span", { className: "text-xs text-slate-600 min-w-0 break-words" }, t.label),
        !manageDisabled && h("button", {
          type: "button",
          onClick: () => commit(setArchived(list, t.id, false)),
          disabled: busy || active.length >= MAX_ACTIVE,
          className: small + " bg-white text-emerald-800 border-emerald-800"
        }, "ফিরিয়ে আনুন")
      )))
    )
  );
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
  onSaveTasks,
  setShowExcuseInfoModal,
  setViewDate,
  updateExcuse,
  updateField,
  viewDate,
  weeklyReminderBanner,
  BN_MONTHS,
  DEFAULT_DEEN_FIELDS,
  DEFAULT_DUNIYA_FIELDS,
  DEEN_CATEGORY_GROUPS,
  dailyScore,
  scoreColor,
  dateKey,
  formatBnDateTime,
  getDailyInspiration,
  getHijriDate,
  isFutureDate,
  toBn,
  fieldApplies,
  isExcused,
  isFieldExcusable,
  streak,
  yesterdayMissing
}) {
  // "আজকের মুহাসাবা" কার্ডের জন্য ক্যাটাগরি-তালিকা(নিচের কার্ড-তালিকার হুবহু একই ফিল্ড-গ্রুপ; শুধু গণনার জন্য)।
  const muhasabaCats = [...DEEN_CATEGORY_GROUPS.map(g => ({
    id: g.id,
    fields: [...DEFAULT_DEEN_FIELDS.filter(f => g.keys.includes(f.key)), ...customFields.filter(f => f.category === g.id)]
  })), {
    id: "duniya",
    fields: [...DEFAULT_DUNIYA_FIELDS, ...customFields.filter(f => f.category === "duniya")]
  }, {
    id: "other",
    fields: taskFields(selectedMember && selectedMember.customTasks)
  }];
  const goYesterday = () => {
    if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
    setViewDate(d => {
      const n = new Date(d);
      n.setDate(n.getDate() - 1);
      return n;
    });
  };
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
    className: "px-5 mt-5 space-y-4"
  }, ...homeEntryCards(selectedMember, {
    tazkirah: () => (() => {
    const insp = getDailyInspiration(viewDate);
    const tagLabel = insp.type === "ayat" ? "আয়াত" : insp.type === "hadith" ? "হাদীস" : "উক্তি";
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl p-4 shadow-sm",
      style: {
        background: "linear-gradient(135deg, var(--theme-primary), var(--theme-deep, #153f39))"
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] font-bold mb-1.5",
      style: {
        color: "var(--theme-accent, #C89B3C)"
      }
    }, "✦ আজকের বাণী · ", tagLabel), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-white leading-relaxed"
    }, insp.text), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-emerald-200/70 mt-1.5 text-right"
    }, "— ", insp.ref));
  })(),
    muhasaba: () => isFutureDate(viewDate) ? null : /*#__PURE__*/React.createElement(MuhasabaStrip, {
      cats: muhasabaCats,
      entry: entry,
      member: selectedMember,
      fieldApplies: fieldApplies,
      streak: streak || 0,
      dirty: !!entryDirtyRef.current,
      yesterdayMissing: !!yesterdayMissing && !recoveryMessage,
      todayKey: dateKey(new Date()),
      onGoYesterday: goYesterday,
      toBn: toBn
    }),
    ...(() => { const m = {};
    /* §Part B Phase ২(category-accordion, 2_5 Part B §B৩.২, ১৫ সেপ্টেম্বর ২০২৬):
       আগে এখানে ২টা flat FieldGroup(দৈনন্দিন আমল = পুরো DEFAULT_DEEN_FIELDS একসাথে,
       ব্যক্তিগত ও পারিবারিক অভ্যাস = DEFAULT_DUNIYA_FIELDS) ছিল — এখন ৪টা collapsible
       category(সালাত/কুরআন ও ইলম/যিকির ও দাওয়াহ/ব্যক্তিগত ও পারিবারিক অভ্যাস) হিসেবে,
       field-list/onChange/fieldApplies ইত্যাদি কোনো logic বদলায়নি(structural-only,
       DEEN_CATEGORY_GROUPS mapping appHelpers.js-এ)। ওজর-info-বাটন এখন শুধু "সালাত"
       category-এ(যেহেতু excusable:true ফিল্ড শুধু ঐ ৪টাই — fardPrayers/jamaat/
       sunnahNafl/tahajjud, appHelpers.js DEFAULT_DEEN_FIELDS দ্রষ্টব্য), আগে পুরো
       দৈনন্দিন-আমল হেডারে একটাই ছিল যেটা কার্যত এই একই ৪ ফিল্ডের জন্যই প্রযোজ্য ছিল —
       তাই কোনো functionality হারায়নি, শুধু আরও সুনির্দিষ্ট জায়গায় বসেছে। প্রথম
       category(সালাত) ডিফল্টে খোলা(defaultOpen), বাকি ৩টা বন্ধ — mockup-অনুযায়ী। */
    [...DEEN_CATEGORY_GROUPS.map(g => ({
      id: g.id,
      title: g.label,
      icon: CATEGORY_ICON_COMPONENTS[g.id] || g.icon,
      fields: [...DEFAULT_DEEN_FIELDS.filter(f => g.keys.includes(f.key)), ...customFields.filter(f => f.category === g.id)],
      showInfo: g.id === "salah"
    })), {
      id: "duniya",
      title: "ব্যক্তিগত ও পারিবারিক অভ্যাস",
      icon: CATEGORY_ICON_COMPONENTS.duniya,
      fields: [...DEFAULT_DUNIYA_FIELDS, ...customFields.filter(f => f.category === "duniya")],
      showInfo: false
    }].forEach((c, idx) => {
      if (c.fields.length === 0) return;
      const score = dailyScore(entry, selectedMember, c.fields);
      const percent = score === null ? null : Math.round(score * 100);
      m[c.id] = fold => /*#__PURE__*/React.createElement(FieldGroup, {
        key: c.id,
        title: c.title,
        icon: c.icon,
        fields: c.fields,
        entry: entry,
        onChange: updateField,
        onToggleExcuse: updateExcuse,
        onInfoClick: c.showInfo ? () => setShowExcuseInfoModal(true) : undefined,
        member: selectedMember,
        disabled: isFutureDate(viewDate) || isLockedForThisDevice,
        fieldApplies: fieldApplies,
        isExcused: isExcused,
        isFieldExcusable: isFieldExcusable,
        toBn: toBn,
        percent: percent,
        percentColor: score === null ? undefined : scoreColor(score),
        fold: fold,
        defaultOpen: fold === "open",
        categoryId: c.id + ":" + fold
      });
    });
    return m; })(),
    other: fold => {
    const tFields = taskFields(selectedMember && selectedMember.customTasks);
    const tScore = tFields.length ? dailyScore(entry, selectedMember, tFields) : null;
    return /*#__PURE__*/React.createElement(CollapsibleCard, {
      title: "কাস্টম টাস্ক",
      icon: ClipboardListIcon,
      fold: fold,
      defaultOpen: fold === "open",
      categoryId: "other:" + fold,
      percent: tScore === null ? null : Math.round(tScore * 100),
      percentColor: tScore === null ? undefined : scoreColor(tScore),
      toBn: toBn
    }, /*#__PURE__*/React.createElement(CustomTasksBody, {
      tasks: selectedMember && selectedMember.customTasks,
      entry: entry,
      toggleDisabled: isFutureDate(viewDate) || isLockedForThisDevice,
      manageDisabled: isLockedForThisDevice || isLockedForSwitch,
      onToggle: updateField,
      onSaveTasks: onSaveTasks
    }));
    },
    dayNote: fold => /*#__PURE__*/React.createElement(CollapsibleCard, {
      title: "দিনের নোট",
      icon: EditIcon,
      fold: fold,
      defaultOpen: fold === "open",
      categoryId: "dayNote:" + fold
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-bold text-slate-800 mb-2"
    }, "দিনের নোট / আত্ম-সমালোচনা"), /*#__PURE__*/React.createElement("textarea", {
      value: entry.note || "",
      onChange: e => updateField("note", e.target.value),
      rows: 2,
      placeholder: "আজকের অনুভূতি, অর্জন বা শেখা বিষয় লিখুন...",
      disabled: isFutureDate(viewDate) || isLockedForThisDevice,
      className: "w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-700 transition-all resize-none bg-slate-50/50 focus:bg-white disabled:opacity-40"
    })))
  }), entry.lastEditedAt && !isFutureDate(viewDate) && /*#__PURE__*/React.createElement("div", {
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
