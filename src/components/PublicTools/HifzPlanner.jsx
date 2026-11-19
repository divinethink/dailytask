// HifzPlanner.jsx — "সহায়িকা"→"কুরআন হিফজ প্ল্যানার"→"হিফজ প্ল্যানার"।
// একটা পরিসর + দৈনিক লক্ষ্য; আজকের পাঠ কুরআন ট্যাবে সরাসরি খোলে; "মুখস্থ হয়েছে" চাপলে অগ্রগতি বাড়ে।
// ডেটা শুধু এই ডিভাইসের localStorage (Firestore/Rules নেই)। হিসাব → legacy/hifzPlan.js। React global।

import { loadMeta } from "../../legacy/quranData.js";
import { toBnDigits, refLabel } from "../../legacy/quranCore.js";
import {
  planKey, GOTO_KEY, PER_DAY, perDayForDays, countsOf, makePlan, sanitizePlan, todayPortion, markDone,
  undoDone, setPerDay, statsOf, makeGoto,
} from "../../legacy/hifzPlan.js";

const { useState, useEffect } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";

// হিফজ ও খতম — একই হিসাব, আলাদা প্ল্যান ও লেখা।
const WORDS = {
  hifz: { tab: "হিফজ (মুখস্থ)", title: W.title, intro: W.intro, done: "মুখস্থ", btn: W.btn, finished: "মাশাআল্লাহ! পুরো পরিসর মুখস্থ সম্পন্ন।", from: { s: 78, a: 1 }, perDay: PER_DAY.def },
  khatam: { tab: "খতম (তিলাওয়াত)", title: "নতুন খতম প্ল্যান", intro: "কোথা থেকে কোথা পর্যন্ত তিলাওয়াত করবেন আর দিনে কত আয়াত — ঠিক করুন।", done: "পড়া হয়েছে", btn: "✓ পড়া হয়েছে", finished: "আলহামদুলিল্লাহ! খতম সম্পন্ন।", from: { s: 1, a: 1 }, perDay: 208 },
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

const card = { background: "#fff", borderRadius: 16, border: "1px solid #E4E7E2", padding: 16, marginBottom: 12 };
const btn = (primary, extra) => ({
  minHeight: 44, padding: "0 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
  border: primary ? "none" : "1px solid #CBD5CF", background: primary ? PRIMARY : "transparent", color: primary ? "#fff" : PRIMARY, ...extra,
});
const field = { minHeight: 44, borderRadius: 12, border: "1px solid #CBD5CF", padding: "0 10px", fontSize: 15, background: "#fff", color: "#1A2621" };

// সূরা + আয়াত বাছাই
function PosPicker({ label, surahs, value, onChange }) {
  const sm = surahs[value.s - 1];
  return h("div", { style: { marginBottom: 10 } },
    h("div", { style: { fontSize: 13, color: "#5B6B64", marginBottom: 4 } }, label),
    h("div", { style: { display: "flex", gap: 8 } },
      h("select", {
        "aria-label": label + " — সূরা", value: value.s, style: { ...field, flex: 1, minWidth: 0 },
        onChange: (e) => onChange({ s: Number(e.target.value), a: 1 }),
      }, surahs.map((x) => h("option", { key: x.n, value: x.n }, toBnDigits(x.n) + ". " + x.bn))),
      h("select", {
        "aria-label": label + " — আয়াত", value: value.a, style: { ...field, width: 96 },
        onChange: (e) => onChange({ s: value.s, a: Number(e.target.value) }),
      }, Array.from({ length: sm.ayahs }, (_, i) => h("option", { key: i + 1, value: i + 1 }, "আয়াত " + toBnDigits(i + 1))))
    ));
}

function Setup({ mode, surahs, counts, onCreate }) {
  const W = WORDS[mode];
  const [from, setFrom] = useState(W.from);
  const [to, setTo] = useState({ s: 114, a: surahs[113].ayahs });
  const [perDay, setPer] = useState(W.perDay);
  const plan = makePlan(counts, from, to, perDay, Date.now());
  const st = plan ? statsOf(plan, counts) : null;
  return h("div", { style: card },
    h("div", { style: { fontWeight: 700, color: PRIMARY, marginBottom: 4 } }, W.title),
    h("div", { style: { fontSize: 13, color: "#5B6B64", marginBottom: 12 } }, W.intro),
    h(PosPicker, { label: "শুরু", surahs, value: from, onChange: setFrom }),
    h(PosPicker, { label: "শেষ", surahs, value: to, onChange: setTo }),
    h("label", { style: { display: "block", fontSize: 13, color: "#5B6B64", marginBottom: 4 } }, "দৈনিক লক্ষ্য (আয়াত)"),
    h("input", {
      type: "number", inputMode: "numeric", min: PER_DAY.min, max: PER_DAY.max, value: perDay, style: { ...field, width: 96 },
      onChange: (e) => setPer(e.target.value === "" ? "" : Number(e.target.value)),
    }),
    mode === "khatam" && plan && h("div", { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" } },
      [30, 60, 90].map((d) => h("button", { key: d, type: "button", onClick: () => setPer(perDayForDays(st.total, d)), style: btn(false, { minHeight: 40, padding: "0 12px", fontSize: 13 }) }, toBnDigits(d) + " দিনে শেষ"))),
    !plan && h("div", { style: { color: "#D64545", fontSize: 13, marginTop: 10 } }, "শেষ আয়াত শুরুর আগে হতে পারে না।"),
    st && h("div", { style: { fontSize: 13, color: "#5B6B64", marginTop: 10 } }, "মোট " + toBnDigits(st.total) + " আয়াত · প্রায় " + toBnDigits(st.daysLeft) + " দিন"),
    h("div", { style: { marginTop: 14 } },
      h("button", { type: "button", disabled: !plan, onClick: () => plan && onCreate(plan), style: btn(true, { width: "100%", opacity: plan ? 1 : 0.5 }) }, "প্ল্যান শুরু করুন")
    ));
}

export function HifzPlanner({ onOpenQuran }) {
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [mode, setMode] = useState("hifz");
  const [plans, setPlans] = useState({ hifz: null, khatam: null });
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadMeta().then((m) => { if (alive) { setMeta(m); const c = countsOf(m.surahs); setPlans({ hifz: readPlan("hifz", c), khatam: readPlan("khatam", c) }); } }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [tries]);

  if (failed) {
    return h("div", { className: "text-center py-12" },
      h("p", { className: "text-sm text-gray-700 mb-3" }, "কুরআনের তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
      h("button", { type: "button", onClick: () => setTries((t) => t + 1), style: btn(true) }, "আবার চেষ্টা করুন"));
  }
  if (!meta) return h("p", { className: "text-center text-sm text-gray-500 py-12" }, "লোড হচ্ছে…");

  const surahs = meta.surahs;
  const counts = countsOf(surahs);
  const W = WORDS[mode];
  const plan = plans[mode];
  const save = (p) => { setPlans((x) => ({ ...x, [mode]: p })); writePlan(mode, p); };
  const modeBar = h("div", { role: "group", "aria-label": "প্ল্যানের ধরন", style: { display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "#E8F0EE", marginBottom: 12 } },
    Object.keys(WORDS).map((k) => h("button", {
      key: k, type: "button", "aria-pressed": mode === k,
      onClick: () => { setMode(k); setEditing(false); setConfirmDel(false); },
      style: { flex: 1, minHeight: 44, borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: mode === k ? "#fff" : "transparent", color: PRIMARY, boxShadow: mode === k ? "0 1px 2px rgba(0,0,0,0.12)" : "none" },
    }, WORDS[k].tab)));

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

  return h("div", null,
    modeBar,
    h("div", { style: card },
      h("div", { style: { fontSize: 13, color: "#5B6B64" } }, ref(plan.from) + " → " + ref(plan.to)),
      h("div", { style: { display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0 6px" } },
        h("span", { style: { fontSize: 26, fontWeight: 700, color: PRIMARY } }, toBnDigits(st.percent) + "%"),
        h("span", { style: { fontSize: 13, color: "#5B6B64" } }, W.done + " " + toBnDigits(st.done) + "/" + toBnDigits(st.total) + " আয়াত")),
      h("div", { role: "progressbar", "aria-valuenow": st.percent, "aria-valuemin": 0, "aria-valuemax": 100, style: { height: 8, borderRadius: 4, background: "#E4E7E2", overflow: "hidden" } },
        h("div", { style: { width: st.percent + "%", height: "100%", background: PRIMARY } })),
      !st.finished && h("div", { style: { fontSize: 12.5, color: "#5B6B64", marginTop: 8 } }, "এই গতিতে আরও প্রায় " + toBnDigits(st.daysLeft) + " দিন")
    ),
    st.finished
      ? h("div", { style: { ...card, textAlign: "center" } },
        h("div", { style: { fontWeight: 700, color: PRIMARY, fontSize: 16 } }, W.finished),
        h("div", { style: { fontSize: 13, color: "#5B6B64", margin: "6px 0 12px" } }, "নতুন প্ল্যান নিতে নিচে প্ল্যান মুছুন।"))
      : h("div", { style: card },
        h("div", { style: { fontSize: 13, color: "#5B6B64" } }, "আজকের পাঠ · " + toBnDigits(portion.n) + " আয়াত"),
        h("div", { style: { fontWeight: 700, color: PRIMARY, fontSize: 17, margin: "4px 0 12px", lineHeight: 1.5 } }, portionText),
        h("button", { type: "button", onClick: openQuran, style: btn(false, { width: "100%", marginBottom: 8 }) }, "📖 কুরআনে খুলুন"),
        h("button", { type: "button", onClick: () => save(markDone(plan, counts)), style: btn(true, { width: "100%" }) }, W.btn)),
    plan.last > 0 && h("button", { type: "button", onClick: () => save(undoDone(plan)), style: btn(false, { width: "100%", marginBottom: 12 }) }, "↶ শেষ ধাপ বাতিল (ভুল টিপলে)"),
    h("div", { style: card },
      h("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
        h("span", { style: { fontSize: 14, color: "#1A2621" } }, "দৈনিক লক্ষ্য"),
        h("input", {
          type: "number", inputMode: "numeric", min: PER_DAY.min, max: PER_DAY.max, value: editing ? editing.v : plan.perDay, style: { ...field, width: 80 },
          onFocus: () => setEditing({ v: plan.perDay }),
          onChange: (e) => setEditing({ v: e.target.value === "" ? "" : Number(e.target.value) }),
          onBlur: () => { if (editing && editing.v !== "") save(setPerDay(plan, editing.v)); setEditing(false); },
        }),
        h("span", { style: { fontSize: 13, color: "#5B6B64" } }, "আয়াত")),
      h("div", { style: { marginTop: 14 } },
        confirmDel
          ? h("div", null,
            h("div", { style: { fontSize: 13, color: "#D64545", marginBottom: 8 } }, "প্ল্যান ও অগ্রগতি মুছে যাবে। নিশ্চিত?"),
            h("div", { style: { display: "flex", gap: 8 } },
              h("button", { type: "button", onClick: () => { save(null); setConfirmDel(false); }, style: btn(true, { flex: 1, background: "#D64545" }) }, "হ্যাঁ, মুছুন"),
              h("button", { type: "button", onClick: () => setConfirmDel(false), style: btn(false, { flex: 1 }) }, "বাতিল")))
          : h("button", { type: "button", onClick: () => setConfirmDel(true), style: btn(false, { color: "#D64545", borderColor: "#E8B4B4" }) }, "প্ল্যান মুছুন"))),
    h("p", { style: { fontSize: 11.5, color: "#8A9A8F", textAlign: "center" } }, "হিফজ ও খতম আলাদাভাবে চলে। অগ্রগতি শুধু এই ফোনে সংরক্ষিত থাকে।")
  );
}
