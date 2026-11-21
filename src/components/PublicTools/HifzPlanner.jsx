// HifzPlanner.jsx — "সহায়িকা"→"কুরআন প্ল্যানার" (সরাসরি এই পেজ খোলে)।
// খতম (তিলাওয়াত) ও হিফজ (মুখস্থ) — একই হিসাব, আলাদা প্ল্যান। আজকের পাঠ কুরআন ট্যাবে সরাসরি খোলে;
// "পড়া/মুখস্থ হয়েছে" চাপলে অগ্রগতি বাড়ে। ডেটা শুধু এই ডিভাইসের localStorage (Firestore/Rules নেই)।
// হিসাব → legacy/hifzPlan.js। React global।

import { loadMeta } from "../../legacy/quranData.js";
import { toBnDigits, refLabel } from "../../legacy/quranCore.js";
import {
  planKey, GOTO_KEY, PER_DAY, perDayForDays, clampPerDay, countsOf, makePlan, sanitizePlan, planMigration,
  todayPortion, markDone, markDoneN, posAfterN, undoDone, localDateKey, todayCount, setPerDay, statsOf, makeGoto,
} from "../../legacy/hifzPlan.js";

const { useState, useEffect, useRef } = React;
const h = React.createElement;

const PRIMARY = "var(--theme-primary, #0E4B43)";
const INK = "var(--theme-ink, #0A3A34)";
const SOFT = "var(--theme-soft, #E8F0EE)";
const LINE = "var(--theme-line, #E4E7E2)";
const GOLD = "#C89B3C";
const GOLD_LIGHT = "#E9C46A";
const HERO_BG = "linear-gradient(145deg, " + INK + " 0%, " + PRIMARY + " 100%)";

// খতম বামে, হিফজ ডানে।
const WORDS = {
  khatam: {
    tab: "খতম", sub: "তিলাওয়াত", title: "নতুন খতম প্ল্যান",
    intro: "কোথা থেকে কোথা পর্যন্ত তিলাওয়াত করবেন আর দিনে কত আয়াত — ঠিক করুন।",
    done: "পড়া হয়েছে", btn: "পড়া হয়েছে", finished: "আলহামদুলিল্লাহ! খতম সম্পন্ন।",
    from: { s: 1, a: 1 }, to: { s: 114, a: 6 }, perDay: 208, step: 10, presets: [30, 60, 90],
  },
  hifz: {
    tab: "হিফজ", sub: "মুখস্থ", title: "নতুন হিফজ প্ল্যান",
    intro: "কোথা থেকে কোথা পর্যন্ত মুখস্থ করবেন আর দিনে কত আয়াত — ঠিক করুন।",
    done: "মুখস্থ", btn: "মুখস্থ হয়েছে", finished: "মাশাআল্লাহ! পুরো পরিসর মুখস্থ সম্পন্ন।",
    from: { s: 78, a: 1 }, to: { s: 114, a: 6 }, perDay: PER_DAY.def, step: 1, presets: [],
  },
};

function readPlan(mode, counts) {
  try {
    const raw = window.localStorage.getItem(planKey(mode));
    return raw ? sanitizePlan(JSON.parse(raw), counts) : null;
  } catch (e) { return null; }
}
function writePlan(mode, plan) {
  try {
    if (plan) window.localStorage.setItem(planKey(mode), JSON.stringify(plan));
    else window.localStorage.removeItem(planKey(mode));
  } catch (e) { /* ignore */ }
}

// এই ডিভাইস একবার ক্লাউডের সাথে সিংক হয়েছে কিনা (ফোনের বাসি প্ল্যান যেন ক্লাউডে ফিরে না তোলে)
const syncedKey = (mode) => planKey(mode) + "_synced";
const isSynced = (mode) => { try { return window.localStorage.getItem(syncedKey(mode)) === "1"; } catch (e) { return false; } };
const markSynced = (mode) => { try { window.localStorage.setItem(syncedKey(mode), "1"); } catch (e) { /* ignore */ } };

// ── ছোট SVG আইকন (monochrome, currentColor) ──
const svg = (children, size) => h("svg", { width: size || 20, height: size || 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, children);
const CheckIcon = (s) => svg(h("polyline", { points: "5 12.5 10 17.5 19 7" }), s);
const BookIcon = (s) => svg([h("path", { key: 1, d: "M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" }), h("path", { key: 2, d: "M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" })], s);
const UndoIcon = (s) => svg([h("polyline", { key: 1, points: "9 14 4 9 9 4" }), h("path", { key: 2, d: "M20 20v-7a4 4 0 0 0-4-4H4" })], s);
const TrashIcon = (s) => svg([h("polyline", { key: 1, points: "3 6 5 6 21 6" }), h("path", { key: 2, d: "M19 6l-1 14H6L5 6" }), h("path", { key: 3, d: "M10 11v6M14 11v6" })], s);

const cardBase = { background: "#fff", borderRadius: 20, border: "1px solid " + LINE, boxShadow: "0 1px 3px rgba(15,40,35,0.06), 0 8px 24px -12px rgba(15,40,35,0.12)" };
const btnStyle = (kind, extra) => {
  const base = { minHeight: 48, padding: "0 18px", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform .12s" };
  if (kind === "primary") return { ...base, border: "none", color: "#fff", background: HERO_BG, boxShadow: "0 6px 16px -6px rgba(14,75,67,0.55)", ...extra };
  if (kind === "danger") return { ...base, border: "1px solid #EBC3C3", color: "#C0392B", background: "transparent", ...extra };
  return { ...base, border: "1px solid " + LINE, color: PRIMARY, background: "#fff", ...extra };
};
const selectStyle = { minHeight: 44, borderRadius: 12, border: "1px solid " + LINE, padding: "0 10px", fontSize: 15, background: "#fff", color: "#1A2621" };

// ── বৃত্তাকার অগ্রগতি (compact) ──
function Ring({ percent }) {
  const size = 68, r = 28, c = 2 * Math.PI * r;
  return h("div", { style: { position: "relative", width: size, height: size, flexShrink: 0 } },
    h("svg", { width: size, height: size, viewBox: "0 0 68 68", "aria-hidden": "true" },
      h("circle", { cx: 34, cy: 34, r, fill: "none", stroke: "rgba(255,255,255,0.18)", strokeWidth: 6 }),
      h("circle", { cx: 34, cy: 34, r, fill: "none", stroke: GOLD_LIGHT, strokeWidth: 6, strokeLinecap: "round", strokeDasharray: c, strokeDashoffset: c * (1 - percent / 100), transform: "rotate(-90 34 34)" })),
    h("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700 }, role: "progressbar", "aria-valuenow": percent, "aria-valuemin": 0, "aria-valuemax": 100 }, toBnDigits(percent) + "%"));
}

// হিরোর নিচের পাতলা পরিসংখ্যান-সারি (বক্স নেই, শুধু বিভাজক)
function Stat({ value, label, first }) {
  return h("div", { style: { flex: 1, textAlign: "center", borderLeft: first ? "none" : "1px solid rgba(255,255,255,0.18)" } },
    h("div", { style: { fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.2 } }, value),
    h("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.78)", marginTop: 1 } }, label));
}

// + / − স্টেপার (≥৪৪px)
function Stepper({ value, step, onChange, label, min = PER_DAY.min, max = PER_DAY.max, size = 44 }) {
  const b = { width: size, height: size, borderRadius: 12, border: "1px solid " + LINE, background: "#fff", color: PRIMARY, fontSize: 22, fontWeight: 600, cursor: "pointer" };
  return h("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
    h("button", { type: "button", "aria-label": label + " কমান", disabled: value <= min, onClick: () => onChange(Math.max(min, value - step)), style: { ...b, opacity: value <= min ? 0.4 : 1 } }, "−"),
    h("div", { style: { minWidth: 48, textAlign: "center", fontSize: 19, fontWeight: 700, color: PRIMARY } }, toBnDigits(value)),
    h("button", { type: "button", "aria-label": label + " বাড়ান", disabled: value >= max, onClick: () => onChange(Math.min(max, value + step)), style: { ...b, opacity: value >= max ? 0.4 : 1 } }, "+"));
}

function PosPicker({ label, surahs, value, onChange }) {
  const sm = surahs[value.s - 1];
  return h("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
    h("div", { style: { width: 36, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: "#5B6B64" } }, label),
    h("select", { "aria-label": label + " — সূরা", value: value.s, style: { ...selectStyle, flex: 1, minWidth: 0 }, onChange: (e) => onChange({ s: Number(e.target.value), a: 1 }) },
      surahs.map((x) => h("option", { key: x.n, value: x.n }, toBnDigits(x.n) + ". " + x.bn))),
    h("select", { "aria-label": label + " — আয়াত", value: value.a, style: { ...selectStyle, width: 96 }, onChange: (e) => onChange({ s: value.s, a: Number(e.target.value) }) },
      Array.from({ length: sm.ayahs }, (_, i) => h("option", { key: i + 1, value: i + 1 }, "আয়াত " + toBnDigits(i + 1)))));
}

function Setup({ mode, surahs, counts, onCreate }) {
  const W = WORDS[mode];
  const [from, setFrom] = useState(W.from);
  const [to, setTo] = useState({ s: W.to.s, a: surahs[W.to.s - 1].ayahs });
  const [perDay, setPer] = useState(W.perDay);
  const plan = makePlan(counts, from, to, perDay, Date.now());
  const st = plan ? statsOf(plan, counts) : null;
  const chip = (on) => ({ minHeight: 40, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid " + (on ? PRIMARY : LINE), background: on ? SOFT : "#fff", color: PRIMARY });
  return h("div", { style: { ...cardBase, overflow: "hidden" } },
    h("div", { style: { background: HERO_BG, padding: "12px 16px", color: "#fff" } },
      h("div", { style: { fontSize: 16, fontWeight: 700 } }, W.title)),
    h("div", { style: { padding: 14 } },
      h(PosPicker, { label: "শুরু", surahs, value: from, onChange: setFrom }),
      h(PosPicker, { label: "শেষ", surahs, value: to, onChange: setTo }),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 } },
        h("div", { style: { fontSize: 12.5, fontWeight: 600, color: "#5B6B64" } }, "দৈনিক লক্ষ্য (আয়াত)"),
        h(Stepper, { value: clampPerDay(perDay), step: W.step, onChange: setPer, label: "দৈনিক লক্ষ্য" })),
      W.presets.length > 0 && st && h("div", { style: { display: "flex", gap: 8, marginTop: 10 } },
        W.presets.map((d) => h("button", { key: d, type: "button", onClick: () => setPer(perDayForDays(st.total, d)), style: { ...chip(perDayForDays(st.total, d) === clampPerDay(perDay)), flex: 1, padding: "0 4px" } }, toBnDigits(d) + " দিনে শেষ"))),
      !plan && h("div", { style: { color: "#C0392B", fontSize: 13, marginTop: 10 } }, "শেষ আয়াত শুরুর আগে হতে পারে না।"),
      st && h("div", { style: { marginTop: 10, padding: "8px 12px", borderRadius: 12, background: SOFT, color: PRIMARY, fontSize: 13.5, fontWeight: 600, textAlign: "center" } },
        "মোট " + toBnDigits(st.total) + " আয়াত · প্রায় " + toBnDigits(st.daysLeft) + " দিন"),
      h("button", { type: "button", disabled: !plan, onClick: () => plan && onCreate(plan), style: btnStyle("primary", { width: "100%", marginTop: 12, minHeight: 46, opacity: plan ? 1 : 0.5 }) }, "প্ল্যান শুরু করুন")));
}

// প্ল্যান-টাস্কের ফল → ছোট বার্তা (সফল হলে সবুজ, সমস্যায় কমলা); কিছু বলার না থাকলে null
const TASK_NOTE = {
  added: ["হোমের কাস্টম টাস্কে যোগ হয়েছে ✓", true],
  restored: ["হোমের কাস্টম টাস্ক আবার চালু হয়েছে ✓", true],
  full: ["কাস্টম টাস্ক ২০টা পূর্ণ, তাই হোমে যোগ হয়নি। প্ল্যান ঠিকই চলবে।", false],
  error: ["হোমের কাস্টম টাস্কে যোগ করা যায়নি। প্ল্যান ঠিকই চলবে।", false],
};

export function HifzPlanner({ onOpenQuran, onPlanTask, ownPlans, onSavePlan, onTickToday }) {
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [mode, setMode] = useState("khatam");
  const [plans, setPlans] = useState({ hifz: null, khatam: null });
  const [confirmDel, setConfirmDel] = useState(false);
  const [taskNote, setTaskNote] = useState(null);
  const [editN, setEditN] = useState(null); // "অন্য পরিমাণ" সম্পাদনা: null = বন্ধ, নইলে আয়াত-সংখ্যা

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadMeta().then((m) => {
      if (!alive) return;
      const c = countsOf(m.surahs);
      setMeta(m);
      setPlans({ hifz: readPlan("hifz", c), khatam: readPlan("khatam", c) });
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [tries]);

  // ক্লাউড-সিংক: প্রথমবার নিজের সদস্য-ডক পাওয়া গেলে ক্লাউডের প্ল্যান ও ফোনের প্ল্যান মেলানো (একবারই)।
  // ক্লাউডে বৈধ প্ল্যান থাকলে সেটাই জেতে; না থাকলে (এই ডিভাইস আগে সিংক না হলে) ফোনেরটা ক্লাউডে ওঠে। ফোনের কপি মোছা হয় না।
  const syncedOnce = useRef(false);
  const cloudReady = !!onSavePlan && !!ownPlans;
  useEffect(() => {
    if (!meta || !cloudReady || syncedOnce.current) return;
    syncedOnce.current = true;
    const c = countsOf(meta.surahs);
    const r = planMigration(ownPlans, plans, { khatam: isSynced("khatam"), hifz: isSynced("hifz") }, c);
    setPlans(r.plans);
    ["khatam", "hifz"].forEach((m) => writePlan(m, r.plans[m]));
    const mark = (m) => { markSynced(m); };
    r.upload.forEach((m) => { onSavePlan(m, r.plans[m]).then((ok) => { if (ok) mark(m); }); });
    ["khatam", "hifz"].filter((m) => !r.upload.includes(m)).forEach(mark);
  }, [meta, cloudReady]);

  if (failed) {
    return h("div", { className: "text-center py-12" },
      h("p", { className: "text-sm text-gray-700 mb-3" }, "কুরআনের তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
      h("button", { type: "button", onClick: () => setTries((t) => t + 1), style: btnStyle("primary") }, "আবার চেষ্টা করুন"));
  }
  if (!meta) return h("p", { className: "text-center text-sm text-gray-500 py-12" }, "লোড হচ্ছে…");

  const surahs = meta.surahs;
  const counts = countsOf(surahs);
  const W = WORDS[mode];
  const plan = plans[mode];
  const syncTask = async (m, on) => {
    if (!onPlanTask) return;
    const r = await onPlanTask(m, on);
    setTaskNote(on && TASK_NOTE[r] ? TASK_NOTE[r] : null);
  };
  const save = (p) => {
    const had = !!plans[mode];
    setPlans((x) => ({ ...x, [mode]: p }));
    writePlan(mode, p); // ফোনের কপি = ব্যাকআপ-ক্যাশ; ক্লাউড (member-ডক) মূল সোর্স
    // হোমের টিক: আজকের পড়া রেকর্ড হলে টিক বসে, আজকের রেকর্ড শূন্য হলে (বাতিলে) টিক উঠে যায়
    if (p && onTickToday) {
      const dk = localDateKey(new Date());
      const before = todayCount(plans[mode] || {}, dk), after = todayCount(p, dk);
      if (after > 0 && before === 0) onTickToday(mode, true);
      else if (after === 0 && before > 0) onTickToday(mode, false);
    }
    if (onSavePlan) {
      onSavePlan(mode, p).then((ok) => {
        if (ok) markSynced(mode);
        else setTaskNote(["ক্লাউডে সেভ করা যায়নি; ফোনে সংরক্ষিত আছে। ইন্টারনেট দেখে আবার সেভ করুন।", false]);
      });
    }
    // হোমের কাস্টম টাস্ক: নতুন প্ল্যানে যোগ; মুছলে বা শেষ হলে আর্কাইভ (এন্ট্রির ডেটা অক্ষত)
    if (p && !had) syncTask(mode, true);
    else if (!p) syncTask(mode, false);
    else if (statsOf(p, counts).finished) syncTask(mode, false);
  };

  const modeBar = h("div", { role: "group", "aria-label": "প্ল্যানের ধরন", style: { display: "flex", gap: 6, padding: 4, borderRadius: 16, background: SOFT, marginBottom: 10 } },
    Object.keys(WORDS).map((k) => {
      const on = mode === k;
      const started = plans[k] && !statsOf(plans[k], counts).finished;
      return h("button", {
        key: k, type: "button", "aria-pressed": on,
        onClick: () => { setMode(k); setConfirmDel(false); setEditN(null); setTaskNote(null); },
        style: {
          flex: 1, minHeight: 42, borderRadius: 13, cursor: "pointer", lineHeight: 1.25,
          border: "1px solid " + (on ? PRIMARY : LINE),
          background: on ? HERO_BG : "#fff",
          color: on ? "#fff" : PRIMARY,
          boxShadow: on ? "0 4px 10px -4px rgba(14,75,67,0.55)" : "0 1px 2px rgba(15,40,35,0.08)",
        },
      },
      h("span", { style: { fontSize: 15, fontWeight: 700 } }, WORDS[k].tab + (started ? " •" : "")),
      h("span", { style: { fontSize: 12, opacity: on ? 0.85 : 0.7, marginLeft: 6 } }, WORDS[k].sub));
    }));

  if (!plan) return h("div", null, modeBar, h(Setup, { key: mode, mode, surahs, counts, onCreate: save }));


  const st = statsOf(plan, counts);
  const portion = todayPortion(plan, counts);
  const ref = (p) => refLabel(surahs[p.s - 1], p.a);
  const portionText = portion
    ? (portion.from.s === portion.to.s
      ? "সূরা " + surahs[portion.from.s - 1].bn + " " + toBnDigits(portion.from.a) + "–" + toBnDigits(portion.to.a)
      : ref(portion.from) + " থেকে " + ref(portion.to))
    : "";

  const openQuran = () => {
    try { window.localStorage.setItem(GOTO_KEY, JSON.stringify(makeGoto(portion.from.s, portion.from.a, Date.now()))); } catch (e) { /* ignore */ }
    if (onOpenQuran) onOpenQuran();
  };

  const hero = h("div", { style: { background: HERO_BG, borderRadius: 18, padding: "12px 14px", color: "#fff", marginBottom: 10, boxShadow: "0 10px 22px -14px rgba(14,75,67,0.75)", border: "1px solid rgba(233,196,106,0.35)" } },
    h("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
      h(Ring, { percent: st.percent }),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontSize: 11.5, letterSpacing: 0.3, color: GOLD_LIGHT, fontWeight: 600 } }, W.tab + " প্ল্যান"),
        h("div", { style: { fontSize: 14, fontWeight: 600, lineHeight: 1.4, margin: "1px 0 2px" } }, ref(plan.from) + " → " + ref(plan.to)),
        h("div", { style: { fontSize: 12.5, opacity: 0.9 } }, W.done + " " + toBnDigits(st.done) + " / " + toBnDigits(st.total) + " আয়াত"))),
    h("div", { style: { display: "flex", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.18)" } },
      h(Stat, { first: true, value: toBnDigits(st.remaining), label: "বাকি আয়াত" }),
      h(Stat, { value: toBnDigits(st.daysLeft), label: "বাকি দিন" }),
      h(Stat, { value: toBnDigits(plan.perDay), label: "দৈনিক লক্ষ্য" })));

  const noteEl = taskNote && h("div", { role: "status", style: { fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 10, marginBottom: 8, color: taskNote[1] ? PRIMARY : "#9A5B00", background: taskNote[1] ? SOFT : "#FFF3DC" } }, taskNote[0]);
  const smallBtn = (kind, extra) => btnStyle(kind, { minHeight: 44, fontSize: 14, padding: "0 12px", ...extra });
  const dayKey = localDateKey(new Date());
  const doneToday = todayCount(plan, dayKey);
  const goalMet = doneToday >= plan.perDay;
  const editing = editN !== null && portion;
  const editEnd = editing ? posAfterN(plan, counts, editN) : null;
  const maxN = st.remaining;

  const today = st.finished
    ? h("div", { style: { ...cardBase, textAlign: "center", padding: "18px 16px", marginBottom: 10, borderColor: GOLD } },
      h("div", { style: { fontSize: 26 } }, "🌙"),
      h("div", { style: { fontWeight: 700, color: PRIMARY, fontSize: 16, margin: "4px 0" } }, W.finished),
      h("div", { style: { fontSize: 12.5, color: "#5B6B64" } }, "নতুন প্ল্যান নিতে নিচে থেকে এই প্ল্যান মুছুন।"))
    : h("div", { style: { ...cardBase, padding: "12px 14px", marginBottom: 10, borderLeft: "4px solid " + GOLD } },
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
        h("span", { style: { fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: 0.3 } }, goalMet ? "পরের পাঠ" : "আজকের পাঠ"),
        h("span", { style: { fontSize: 12, fontWeight: 600, color: PRIMARY, background: SOFT, padding: "2px 10px", borderRadius: 999 } }, toBnDigits(portion.n) + " আয়াত")),
      doneToday > 0 && h("div", { style: { fontSize: 12, fontWeight: 600, marginTop: 6, color: goalMet ? "#1E7A3C" : PRIMARY } }, (goalMet ? "✓ আজকের লক্ষ্য পূর্ণ · " : "") + "আজ রেকর্ড: " + toBnDigits(doneToday) + " আয়াত"),
      h("div", { style: { fontSize: 16.5, fontWeight: 700, color: "#1A2621", lineHeight: 1.45, margin: "6px 0 10px" } }, portionText),
      editing
        ? h("div", { style: { padding: 10, borderRadius: 14, background: SOFT } },
          h("div", { style: { fontSize: 13, fontWeight: 600, color: PRIMARY, marginBottom: 8 } }, "আজ আসলে কত আয়াত " + (mode === "khatam" ? "পড়লেন?" : "মুখস্থ করলেন?")),
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
            h(Stepper, { value: editN, step: 1, min: 1, max: maxN, onChange: setEditN, label: "আজকের আয়াত" }),
            h("div", { style: { display: "flex", gap: 6 } },
              [5, 10].map((d) => h("button", { key: d, type: "button", onClick: () => setEditN(Math.min(maxN, Math.max(1, editN + d))), style: { minHeight: 40, padding: "0 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: "1px solid " + LINE, background: "#fff", color: PRIMARY } }, "+" + toBnDigits(d))))),
          editEnd && h("div", { style: { fontSize: 12.5, color: "#5B6B64", marginTop: 8 } }, "এই পর্যন্ত: " + ref(editEnd) + " · পরের পাঠ এর পর থেকে"),
          h("div", { style: { display: "flex", gap: 8, marginTop: 10 } },
            h("button", { type: "button", onClick: () => { save(markDoneN(plan, counts, editN, dayKey)); setEditN(null); }, style: smallBtn("primary", { flex: 1 }) }, CheckIcon(18), "রেকর্ড করুন"),
            h("button", { type: "button", onClick: () => setEditN(null), style: smallBtn("ghost", { flex: 1 }) }, "বাতিল")))
        : h("div", null,
          h("div", { style: { display: "flex", gap: 8 } },
            h("button", { type: "button", onClick: openQuran, style: smallBtn("ghost", { flex: 1 }) }, BookIcon(18), "কুরআনে খুলুন"),
            h("button", { type: "button", onClick: () => save(markDone(plan, counts, dayKey)), style: smallBtn("primary", { flex: 1 }) }, CheckIcon(18), W.btn)),
          h("button", { type: "button", onClick: () => setEditN(portion.n), style: { width: "100%", minHeight: 40, marginTop: 4, background: "transparent", border: "none", color: PRIMARY, fontSize: 13, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" } }, "কম বা বেশি " + (mode === "khatam" ? "পড়েছেন?" : "মুখস্থ করেছেন?") + " নিজে বসান")));

  return h("div", null,
    modeBar,
    hero,
    noteEl,
    today,
    h("div", { style: { ...cardBase, padding: "10px 12px", marginBottom: 8 } },
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
        h("div", { style: { fontSize: 12.5, fontWeight: 600, color: "#5B6B64", lineHeight: 1.3 } }, "দৈনিক লক্ষ্য", h("br"), "(আয়াত)"),
        h(Stepper, { value: plan.perDay, step: W.step, onChange: (v) => save(setPerDay(plan, v)), label: "দৈনিক লক্ষ্য" }),
        h("div", { style: { display: "flex", gap: 6 } },
          plan.last > 0 && h("button", { type: "button", onClick: () => save(undoDone(plan)), "aria-label": "শেষ ধাপ বাতিল (ভুল টিপলে)", title: "শেষ ধাপ বাতিল", style: { ...btnStyle("ghost"), width: 44, minHeight: 44, padding: 0 } }, UndoIcon(18)),
          h("button", { type: "button", onClick: () => setConfirmDel(true), "aria-label": "প্ল্যান মুছুন", style: { ...btnStyle("danger"), width: 44, minHeight: 44, padding: 0 } }, TrashIcon(18)))),
      confirmDel && h("div", { style: { marginTop: 10, borderTop: "1px solid " + LINE, paddingTop: 10 } },
        h("div", { style: { fontSize: 13, color: "#C0392B", marginBottom: 8 } }, "প্ল্যান ও অগ্রগতি মুছে যাবে। নিশ্চিত?"),
        h("div", { style: { display: "flex", gap: 8 } },
          h("button", { type: "button", onClick: () => { save(null); setConfirmDel(false); setEditN(null); }, style: smallBtn("primary", { flex: 1, background: "#C0392B", boxShadow: "none" }) }, "হ্যাঁ, মুছুন"),
          h("button", { type: "button", onClick: () => setConfirmDel(false), style: smallBtn("ghost", { flex: 1 }) }, "বাতিল")))),
    h("p", { style: { fontSize: 11, color: "#8A9A8F", textAlign: "center", lineHeight: 1.5, margin: 0 } }, "খতম ও হিফজ আলাদাভাবে চলে।"));
}
