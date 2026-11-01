// গত তিন মাসের ধারা কার্ড। "মাসিক সভা"-র ঠিক উপরে নিজস্ব accordion-কার্ড (weekly/meeting/monthlyReport-এর মতো)।
// ডিফল্ট বন্ধ। বন্ধ থাকলে বাড়তি রিড শূন্য; খুললে আগের দুই মাস একবার করে (loadMonthEntriesOnce ×২) পড়ে।
// নির্বাচিত মাস = বিদ্যমান live monthEntries (বাড়তি পড়া নেই)। শুধু নিজের সদস্যে দেখায় (locked হলে লুকানো)।
// সব হিসাব reviewTrend.js-এ (pure); সব বাংলা লেখা reviewText.js-এ। React global (window.React) — বাকিদের মতোই।
import { REVIEW_TEXT } from "../legacy/reviewText.js";
import { buildTrend } from "../legacy/reviewTrend.js";
import { loadMonthEntriesOnce } from "../legacy/monthEntriesOnce.js";
import { fieldRatioToday } from "../legacy/dailyInsight.js";
import { DEEN_CATEGORY_GROUPS, DEFAULT_DUNIYA_FIELDS } from "../legacy/appHelpers.js";
import { fill } from "../legacy/reviewMonthly.js";
import { ChevronDown } from "./icons.jsx";

const T = REVIEW_TEXT.trend;
const { useState, useEffect, useMemo, useRef } = React;

// গ্রুপ = বিদ্যমান ক্যাটাগরি; শেষ গ্রুপ ("ব্যক্তিগত ও পারিবারিক অভ্যাস") বাকি সব ধরে।
const GROUPS = [
  ...DEEN_CATEGORY_GROUPS.map(g => ({ id: g.id, label: g.label, keys: g.keys })),
  { id: "habits", label: "ব্যক্তিগত ও পারিবারিক অভ্যাস", keys: DEFAULT_DUNIYA_FIELDS.map(f => f.key) }
];

// ক্যালেন্ডারের চার রঙের সাথে একই সীমা (reviewTrend.tierOf); নরম পটভূমি + গাঢ় লেখা।
const TIER_STYLE = {
  great: { background: "#DCEBE5", color: "#0E4B43" },
  good: { background: "#DCE7F5", color: "#1E4F8C" },
  mid: { background: "#FBEFC4", color: "#7A5A00" },
  low: { background: "#F6DCDD", color: "#9B3A40" },
  none: { background: "#EEF0EE", color: "#6B7A72" }
};
const ARROW = {
  up: { ch: "↑", color: "#2F9E44", label: T.up },
  down: { ch: "↓", color: "#D9822B", label: T.down },
  flat: { ch: "→", color: "#8A9A8F", label: T.flat }
};

function Pill({ v, monthName, toBn }) {
  const tier = v ? v.tier : "none";
  const text = v ? toBn(v.pct) + "%" : T.noValue;
  return (
    <span
      className="w-11 shrink-0 text-center text-xs font-bold rounded-full py-1"
      style={TIER_STYLE[tier]}
      aria-label={monthName + " " + (v ? toBn(v.pct) + "%" : T.legend.none)}
    >
      {text}
    </span>
  );
}

function monthTag(months, BN_MONTHS, toBn) {
  const a = months[0], c = months[2];
  const nm = m => BN_MONTHS[m.month0] + (a.year !== c.year ? " " + toBn(m.year) : "");
  return nm(a) + "–" + nm(c);
}

export function TrendReviewSection({ fold, migrationState, memberId, member, locked, monthCursor, monthEntries, allFields, fieldApplies, isExcused, isFieldExcusable, toBn, BN_MONTHS }) {
  const { year, month0 } = monthCursor;
  const [open, setOpen] = useState(fold === "open" || fold === "fixed");
  const [data, setData] = useState({ key: null, status: "idle", entries: [null, null] }); // idle | loading | ready | error
  const loadedKey = useRef(null);
  const key = memberId + "|" + year + "|" + month0;

  // আগের দুই মাস: কার্ড খুললে, এবং সদস্য/মাস বদলালে। একই key-তে বন্ধ-খোলায় আবার পড়ে না।
  useEffect(() => {
    if (!open || locked || !memberId || migrationState === undefined) return undefined;
    if (loadedKey.current === key) return undefined;
    let alive = true;
    setData({ key, status: "loading", entries: [null, null] });
    const p1 = month0 === 0 ? { year: year - 1, month0: 11 } : { year, month0: month0 - 1 };
    const p2 = p1.month0 === 0 ? { year: p1.year - 1, month0: 11 } : { year: p1.year, month0: p1.month0 - 1 };
    Promise.allSettled([
      loadMonthEntriesOnce(migrationState, memberId, p2.year, p2.month0),
      loadMonthEntriesOnce(migrationState, memberId, p1.year, p1.month0)
    ]).then(rs => {
      if (!alive) return;
      const entries = rs.map(r => (r.status === "fulfilled" ? r.value : null));
      const failed = rs.some(r => r.status === "rejected");
      if (!failed) loadedKey.current = key; // ব্যর্থ হলে পরের খোলায় আবার চেষ্টা
      setData({ key, status: failed ? "error" : "ready", entries });
    });
    return () => { alive = false; };
  }, [open, locked, memberId, migrationState, key, year, month0]);

  const h = useMemo(() => ({ member, allFields, fieldApplies, isExcused, isFieldExcusable, ratioOf: fieldRatioToday }),
    [member, allFields, fieldApplies, isExcused, isFieldExcusable]);

  const fresh = data.key === key && (data.status === "ready" || data.status === "error");
  const trend = useMemo(() => {
    if (!open || locked || !fresh) return null;
    return buildTrend({ year, month0, now: new Date(), entriesByMonth: [data.entries[0], data.entries[1], monthEntries], h, groups: GROUPS });
  }, [open, locked, fresh, data, year, month0, monthEntries, h]);

  const months = useMemo(() => {
    const p1 = month0 === 0 ? { year: year - 1, month0: 11 } : { year, month0: month0 - 1 };
    const p2 = p1.month0 === 0 ? { year: p1.year - 1, month0: 11 } : { year: p1.year, month0: p1.month0 - 1 };
    return [p2, p1, { year, month0 }];
  }, [year, month0]);

  if (locked) return null; // শুধু নিজের সদস্যে (সব hook এর পরে)

  const tag = monthTag(months, BN_MONTHS, toBn);

  // বন্ধ অবস্থার সারাংশ: ডেটা এসে থাকলেই দেখায় (বন্ধ থাকলে নতুন রিড করে না)।
  let subtitle = T.subtitle;
  if (trend && trend.ok) {
    const upN = trend.sections.reduce((t, s) => t + s.rows.filter(r => r.dir === "up").length, 0);
    subtitle = fill(T.summary, { up: toBn(upN), att: toBn(trend.attention.length) });
  }

  let body = null;
  if (open) {
    if (!memberId) body = <p className="text-sm text-slate-500 mt-3">{T.noMember}</p>;
    else if (!fresh) body = <p className="text-sm text-slate-500 mt-3" role="status">{T.loading}</p>;
    else if (!trend || !trend.ok) body = (
      <div className="mt-3">
        {data.status === "error" && <p className="text-xs text-orange-700 mb-2">{T.error}</p>}
        <p className="text-sm text-slate-500">{T.empty}</p>
      </div>
    );
    else body = (
      <div className="mt-3">
        {data.status === "error" && <p className="text-xs text-orange-700 mb-2">{T.error}</p>}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl p-3" style={{ background: "#EAF6EE", border: "1px solid #CFE8D8" }}>
            <div className="text-xs font-bold text-emerald-900 mb-1">🌱 {T.bestTitle}</div>
            <div className="text-xs text-emerald-950 leading-relaxed">
              {trend.best ? fill(T.bestLine, { label: trend.best.label, from: toBn(trend.best.from.pct), to: toBn(trend.best.to.pct) }) : T.noBest}
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#FBF3E1", border: "1px solid #EFDDB0" }}>
            <div className="text-xs font-bold mb-1" style={{ color: "#7A5A00" }}>🤍 {T.attTitle}</div>
            <div className="text-xs leading-relaxed" style={{ color: "#5C4300" }}>
              {trend.attention.length ? trend.attention.map(r => r.label).join(", ") : T.attNone}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-1 pb-1 border-b border-slate-200 text-slate-500" style={{ fontSize: 10.5 }}>
          <span className="flex-1 min-w-0">{T.labelCol}</span>
          {trend.months.map(m => (
            <span key={m.year + "-" + m.month0} className="w-11 shrink-0 text-center whitespace-nowrap">{T.monthShort[m.month0]}</span>
          ))}
          <span className="w-4 shrink-0" />
        </div>

        {trend.sections.map(s => (
          <div key={s.id}>
            <div className="text-xs font-bold mt-3 mb-1" style={{ color: "#8A6A12" }}>{s.label}</div>
            {s.rows.map(r => {
              const ar = r.dir ? ARROW[r.dir] : null;
              return (
                <div key={r.key} className="flex items-center gap-1 py-2.5 border-b border-dashed border-slate-200">
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="font-bold text-sm text-slate-800 leading-snug">{r.label}</div>
                    <div className="text-xs text-slate-500 leading-snug">{T.comment[r.kind]}</div>
                  </div>
                  {r.vals.map((v, i) => (
                    <Pill key={i} v={v} monthName={BN_MONTHS[trend.months[i].month0]} toBn={toBn} />
                  ))}
                  <span className="w-4 shrink-0 text-center font-bold" style={{ color: ar ? ar.color : "transparent" }} aria-label={ar ? ar.label : undefined}>
                    {ar ? ar.ch : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-slate-500" style={{ fontSize: 11 }}>
          {["great", "good", "mid", "low", "none"].map(t => (
            <span key={t} className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ background: TIER_STYLE[t].background, border: "1px solid rgba(0,0,0,0.08)" }} />
              {T.legend[t]}
            </span>
          ))}
        </div>
        <p className="text-slate-400 mt-1" style={{ fontSize: 11 }}>{T.legendHint}</p>
        <p className="text-slate-400 text-center mt-2" style={{ fontSize: 11 }}>{T.footnote}</p>
      </div>
    );
  }

  const canToggle = fold !== "fixed";
  return (
    <div className="mx-5 mt-5 p-4 rounded-2xl bg-white shadow-sm" style={{ border: "1px solid #EADFBE" }}>
      <button
        type="button"
        onClick={() => canToggle && setOpen(o => !o)}
        aria-expanded={open}
        className={"w-full text-left flex items-start justify-between gap-2 select-none" + (canToggle ? "" : " cursor-default")}
        style={{ minHeight: 44 }}
      >
        <div className="min-w-0">
          <h2 className="font-bold text-base text-slate-800">📈 {T.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "#FBF3E1", color: "#7A5A00", border: "1px solid #EFDDB0" }}>{tag}</span>
          {canToggle && <ChevronDown size={18} className={"text-slate-400 transition-transform" + (open ? " rotate-180" : "")} />}
        </div>
      </button>
      {body}
    </div>
  );
}
