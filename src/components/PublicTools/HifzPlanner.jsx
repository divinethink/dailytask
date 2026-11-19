// HifzPlanner.jsx — "সহায়িকা"→"কুরআন প্ল্যানার" (সরাসরি এই পেজ খোলে)।
// খতম (তিলাওয়াত) ও হিফজ (মুখস্থ) — একই হিসাব, আলাদা প্ল্যান। আজকের পাঠ কুরআন ট্যাবে সরাসরি খোলে;
// "পড়া/মুখস্থ হয়েছে" চাপলে অগ্রগতি বাড়ে। ডেটা শুধু এই ডিভাইসের localStorage (Firestore/Rules নেই)।
// হিসাব → legacy/hifzPlan.js। React global।

import { loadMeta } from "../../legacy/quranData.js";
import { toBnDigits, refLabel } from "../../legacy/quranCore.js";
import {
  planKey, GOTO_KEY, PER_DAY, perDayForDays, clampPerDay, countsOf, makePlan, sanitizePlan,
  todayPortion, markDone, undoDone, setPerDay, statsOf, makeGoto,
} from "../../legacy/hifzPlan.js";

const { useState, useEffect } = React;
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
const selectStyle = { minHeight: 48, borderRadius: 14, border: "1px solid " + LINE, padding: "0 12px", fontSize: 15, background: "#fff", color: "#1A2621" };

// ── বৃত্তাকার অগ্রগতি ──
function Ring({ percent }) {
  const size = 108, r = 45, c = 2 * Math.PI * r;
  return h("div", { style: { position: "relative", width: size, height: size, flexShrink: 0 } },
    h("svg", { width: size, height: size, viewBox: "0 0 108 108", "aria-hidden": "true" },
      h("circle", { cx: 54, cy: 54, r, fill: "none", stroke: "rgba(255,255,255,0.2)", strokeWidth: 9 }),
      h("circle", { cx: 54, cy: 54, r, fill: "none", stroke: GOLD_LIGHT, strokeWidth: 9, strokeLinecap: "round", strokeDasharray: c, strokeDashoffset: c * (1 - percent / 100), transform: "rotate(-90 54 54)" })),
    h("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 700 }, role: "progressbar", "aria-valuenow": percent, "aria-valuemin": 0, "aria-valuemax": 100 }, toBnDigits(percent) + "%"));
}

function Stat({ value, label }) {
  return h("div", { style: { flex: 1, textAlign: "center", padding: "10px 4px", borderRadius: 14, background: "rgba(255,255,255,0.12)" } },
    h("div", { style: { fontSize: 18, fontWeight: 700, color: "#fff" } }, value),
    h("div", { style: { fontSize: 11.5, color: "rgba(255,255,255,0.8)", marginTop: 2 } }, label));
}

// + / − স্টেপার (≥৪৪px)
function Stepper({ value, step, onChange, label }) {
  const b = { width: 48, height: 48, borderRadius: 14, border: "1px solid " + LINE, background: "#fff", color: PRIMARY, fontSize: 22, fontWeight: 600, cursor: "pointer" };
  return h("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
    h("button", { type: "button", "aria-label": label + " কমান", disabled: value <= PER_DAY.min, onClick: () => onChange(clampPerDay(value - step)), style: { ...b, opacity: value <= PER_DAY.min ? 0.4 : 1 } }, "−"),
    h("div", { style: { minWidth: 64, textAlign: "center", fontSize: 22, fontWeight: 700, color: PRIMARY } }, toBnDigits(value)),
    h("button", { type: "button", "aria-label": label + " বাড়ান", disabled: value >= PER_DAY.max, onClick: () => onChange(clampPerDay(value + step)), style: { ...b, opacity: value >= PER_DAY.max ? 0.4 : 1 } }, "+"));
}

function PosPicker({ label, surahs, value, onChange }) {
  const sm = surahs[value.s - 1];
  return h("div", { style: { marginBottom: 12 } },
    h("div", { style: { fontSize: 12.5, fontWeight: 600, color: "#5B6B64", margin: "0 0 6px 2px" } }, label),
    h("div", { style: { display: "flex", gap: 8 } },
      h("select", { "aria-label": label + " — সূরা", value: value.s, style: { ...selectStyle, flex: 1, minWidth: 0 }, onChange: (e) => onChange({ s: Number(e.target.value), a: 1 }) },
        surahs.map((x) => h("option", { key: x.n, value: x.n }, toBnDigits(x.n) + ". " + x.bn))),
      h("select", { "aria-label": label + " — আয়াত", value: value.a, style: { ...selectStyle, width: 104 }, onChange: (e) => onChange({ s: value.s, a: Number(e.target.value) }) },
        Array.from({ length: sm.ayahs }, (_, i) => h("option", { key: i + 1, value: i + 1 }, "আয়াত " + toBnDigits(i + 1))))));
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
    h("div", { style: { background: HERO_BG, padding: "18px 18px 16px", color: "#fff" } },
      h("div", { style: { fontSize: 18, fontWeight: 700 } }, W.title),
      h("div", { style: { fontSize: 13, opacity: 0.85, marginTop: 4, lineHeight: 1.5 } }, W.intro)),
    h("div", { style: { padding: 18 } },
      h(PosPicker, { label: "শুরু", surahs, value: from, onChange: setFrom }),
      h(PosPicker, { label: "শেষ", surahs, value: to, onChange: setTo }),
      h("div", { style: { fontSize: 12.5, fontWeight: 600, color: "#5B6B64", margin: "4px 0 8px 2px" } }, "দৈনিক লক্ষ্য (আয়াত)"),
      h(Stepper, { value: clampPerDay(perDay), step: W.step, onChange: setPer, label: "দৈনিক লক্ষ্য" }),
      W.presets.length > 0 && st && h("div", { style: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" } },
        W.presets.map((d) => h("button", { key: d, type: "button", onClick: () => setPer(perDayForDays(st.total, d)), style: chip(perDayForDays(st.total, d) === clampPerDay(perDay)) }, toBnDigits(d) + " দিনে শেষ"))),
      !plan && h("div", { style: { color: "#C0392B", fontSize: 13, marginTop: 12 } }, "শেষ আয়াত শুরুর আগে হতে পারে না।"),
      st && h("div", { style: { marginTop: 14, padding: "10px 14px", borderRadius: 14, background: SOFT, color: PRIMARY, fontSize: 13.5, fontWeight: 600, textAlign: "center" } },
        "মোট " + toBnDigits(st.total) + " আয়াত · প্রায় " + toBnDigits(st.daysLeft) + " দিন"),
      h("button", { type: "button", disabled: !plan, onClick: () => plan && onCreate(plan), style: btnStyle("primary", { width: "100%", marginTop: 16, opacity: plan ? 1 : 0.5 }) }, "প্ল্যান শুরু করুন")));
}

export function HifzPlanner({ onOpenQuran }) {
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [mode, setMode] = useState("khatam");
  const [plans, setPlans] = useState({ hifz: null, khatam: null });
  const [confirmDel, setConfirmDel] = useState(false);

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
  const save = (p) => { setPlans((x) => ({ ...x, [mode]: p })); writePlan(mode, p); };

  const modeBar = h("div", { role: "group", "aria-label": "প্ল্যানের ধরন", style: { display: "flex", gap: 4, padding: 4, borderRadius: 18, background: SOFT, marginBottom: 14 } },
    Object.keys(WORDS).map((k) => {
      const on = mode === k;
      const started = plans[k] && !statsOf(plans[k], counts).finished;
      return h("button", {
        key: k, type: "button", "aria-pressed": on,
        onClick: () => { setMode(k); setConfirmDel(false); },
        style: { flex: 1, minHeight: 52, borderRadius: 14, border: "none", cursor: "pointer", background: on ? "#fff" : "transparent", color: PRIMARY, boxShadow: on ? "0 2px 8px rgba(15,40,35,0.14)" : "none", lineHeight: 1.25 },
      },
      h("div", { style: { fontSize: 15, fontWeight: 700 } }, WORDS[k].tab + (started ? " •" : "")),
      h("div", { style: { fontSize: 11.5, opacity: 0.75 } }, WORDS[k].sub));
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

  const hero = h("div", { style: { background: HERO_BG, borderRadius: 22, padding: 18, color: "#fff", marginBottom: 14, boxShadow: "0 12px 28px -14px rgba(14,75,67,0.7)" } },
    h("div", { style: { display: "flex", alignItems: "center", gap: 16 } },
      h(Ring, { percent: st.percent }),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontSize: 12, letterSpacing: 0.3, color: GOLD_LIGHT, fontWeight: 600 } }, W.tab + " প্ল্যান"),
        h("div", { style: { fontSize: 15, fontWeight: 600, lineHeight: 1.5, margin: "2px 0 6px" } }, ref(plan.from) + " → " + ref(plan.to)),
        h("div", { style: { fontSize: 13, opacity: 0.9 } }, W.done + " " + toBnDigits(st.done) + " / " + toBnDigits(st.total) + " আয়াত"))),
    h("div", { style: { display: "flex", gap: 8, marginTop: 16 } },
      h(Stat, { value: toBnDigits(st.remaining), label: "বাকি আয়াত" }),
      h(Stat, { value: toBnDigits(st.daysLeft), label: "বাকি দিন" }),
      h(Stat, { value: toBnDigits(plan.perDay), label: "দৈনিক লক্ষ্য" })));

  const today = st.finished
    ? h("div", { style: { ...cardBase, textAlign: "center", padding: "26px 18px", marginBottom: 14, borderColor: GOLD } },
      h("div", { style: { fontSize: 32 } }, "🌙"),
      h("div", { style: { fontWeight: 700, color: PRIMARY, fontSize: 17, margin: "6px 0" } }, W.finished),
      h("div", { style: { fontSize: 13, color: "#5B6B64" } }, "নতুন প্ল্যান নিতে নিচে থেকে এই প্ল্যান মুছুন।"))
    : h("div", { style: { ...cardBase, padding: 18, marginBottom: 14, borderLeft: "5px solid " + GOLD } },
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
        h("span", { style: { fontSize: 12.5, fontWeight: 700, color: GOLD, letterSpacing: 0.3 } }, "আজকের পাঠ"),
        h("span", { style: { fontSize: 12.5, fontWeight: 600, color: PRIMARY, background: SOFT, padding: "3px 10px", borderRadius: 999 } }, toBnDigits(portion.n) + " আয়াত")),
      h("div", { style: { fontSize: 20, fontWeight: 700, color: "#1A2621", lineHeight: 1.5, margin: "10px 0 16px" } }, portionText),
      h("button", { type: "button", onClick: openQuran, style: btnStyle("ghost", { width: "100%", marginBottom: 10 }) }, BookIcon(20), "কুরআনে খুলুন"),
      h("button", { type: "button", onClick: () => save(markDone(plan, counts)), style: btnStyle("primary", { width: "100%" }) }, CheckIcon(20), W.btn));

  return h("div", null,
    modeBar,
    hero,
    today,
    plan.last > 0 && h("button", { type: "button", onClick: () => save(undoDone(plan)), style: btnStyle("ghost", { width: "100%", marginBottom: 14, minHeight: 44, fontSize: 14 }) }, UndoIcon(18), "শেষ ধাপ বাতিল (ভুল টিপলে)"),
    h("div", { style: { ...cardBase, padding: 18, marginBottom: 12 } },
      h("div", { style: { fontSize: 12.5, fontWeight: 600, color: "#5B6B64", marginBottom: 10 } }, "দৈনিক লক্ষ্য (আয়াত)"),
      h(Stepper, { value: plan.perDay, step: W.step, onChange: (v) => save(setPerDay(plan, v)), label: "দৈনিক লক্ষ্য" }),
      h("div", { style: { marginTop: 18, borderTop: "1px solid " + LINE, paddingTop: 14 } },
        confirmDel
          ? h("div", null,
            h("div", { style: { fontSize: 13, color: "#C0392B", marginBottom: 10 } }, "প্ল্যান ও অগ্রগতি মুছে যাবে। নিশ্চিত?"),
            h("div", { style: { display: "flex", gap: 8 } },
              h("button", { type: "button", onClick: () => { save(null); setConfirmDel(false); }, style: btnStyle("primary", { flex: 1, background: "#C0392B", boxShadow: "none" }) }, "হ্যাঁ, মুছুন"),
              h("button", { type: "button", onClick: () => setConfirmDel(false), style: btnStyle("ghost", { flex: 1 }) }, "বাতিল")))
          : h("button", { type: "button", onClick: () => setConfirmDel(true), style: btnStyle("danger", { minHeight: 44, fontSize: 14 }) }, TrashIcon(18), "প্ল্যান মুছুন"))),
    h("p", { style: { fontSize: 11.5, color: "#8A9A8F", textAlign: "center", lineHeight: 1.6 } }, "খতম ও হিফজ আলাদাভাবে চলে। অগ্রগতি শুধু এই ফোনে সংরক্ষিত থাকে।"));
}
