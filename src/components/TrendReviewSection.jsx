// গত তিন মাসের চিত্র কার্ড। "মাসিক সভা"-র ঠিক উপরে নিজস্ব accordion-কার্ড (weekly/meeting/monthlyReport-এর মতো)।
// ডিফল্ট বন্ধ। বন্ধ থাকলে বাড়তি রিড শূন্য; খুললে আগের দুই মাস একবার করে (loadMonthEntriesOnce ×২) পড়ে।
// নির্বাচিত মাস = বিদ্যমান live monthEntries (বাড়তি পড়া নেই)। শুধু নিজের সদস্যে দেখায় (locked হলে লুকানো)।
// সব হিসাব reviewTrend.js-এ (pure); সব বাংলা লেখা reviewText.js-এ। React global (window.React) — বাকিদের মতোই।
import { REVIEW_TEXT } from "../legacy/reviewText.js";
import { buildTrend } from "../legacy/reviewTrend.js";
import { loadMonthEntriesOnce } from "../legacy/monthEntriesOnce.js";
import { fieldRatioToday } from "../legacy/dailyInsight.js";
import { DEEN_CATEGORY_GROUPS, DEFAULT_DUNIYA_FIELDS } from "../legacy/appHelpers.js";
import { fill } from "../legacy/reviewMonthly.js";
import { pad2 } from "../legacy/appHelpers.js";
import { MonthPillNav } from "./MonthPillNav.jsx";
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

// v = {pct, tier, days} | null
function Pill({ v, monthName, toBn }) {
  const st = TIER_STYLE[v ? v.tier : "none"] || TIER_STYLE.none;
  return (
    <span
      className="w-11 shrink-0 text-center text-xs font-bold rounded-lg py-1"
      style={{ background: st.background, color: st.color }}
      aria-label={monthName + ": " + (v ? toBn(v.pct) + "%" : "—")}
    >
      {v ? toBn(v.pct) + "%" : "—"}
    </span>
  );
}

function TrendRow({ r, months, BN_MONTHS, toBn, comment, selected, onToggle, onSend, sent }) {
  const a = r.dir ? ARROW[r.dir] : null;
  return (
    <div id={"trend-row-" + r.key} className="py-1.5 border-b border-slate-100 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!!selected}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="flex items-center gap-1 cursor-pointer rounded-lg"
        style={selected ? { background: "#F3F7F4" } : undefined}
      >
        <div className="flex-1 min-w-0 pr-1 text-sm text-slate-800 leading-snug">{r.label}</div>
        {r.vals.map((v, i) => (
          <Pill key={i} v={v} monthName={BN_MONTHS[months[i].month0]} toBn={toBn} />
        ))}
        <span className="w-4 shrink-0 text-center font-bold" style={{ color: a ? a.color : "transparent" }} aria-label={a ? a.label : undefined}>
          {a ? a.ch : ""}
        </span>
      </div>
      {comment ? <p className="text-xs text-slate-500 mt-0.5">{comment}</p> : null}
      {selected && (
        <div className="mt-1.5 rounded-xl p-2.5" style={{ background: "#F7F9F7", border: "1px solid #E1E8E3" }}>
          {r.vals.map((v, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs py-0.5">
              <span className="w-14 shrink-0 font-bold text-slate-600">{BN_MONTHS[months[i].month0]}</span>
              <span className="text-slate-700">
                {v && v.full !== undefined
                  ? fill(r.key === "fardPrayers" ? T.detailLineFard : T.detailLine, { days: toBn(v.days), full: toBn(v.full) })
                  : T.detailNone}
              </span>
            </div>
          ))}
          {onSend && (
            <button
              type="button"
              onClick={onSend}
              disabled={sent}
              className="w-full mt-2 py-2 rounded-xl text-sm font-bold bg-emerald-900 text-white disabled:opacity-60"
            >
              {sent ? T.sent : "📨 " + T.send}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// প্রথমে দেখানো মূল ৮টি আমল (এই ক্রমে); বাকিগুলো "অন্যান্য আমল"-এ ভাঁজ করা।
const KEY_ORDER = ["fardPrayers", "jamaat", "exercise", "healthyFood", "noLyingBackbitingPride", "dawah", "earlyMorning"];

function monthTag(months, BN_MONTHS, toBn) {
  const a = months[0], c = months[2];
  const nm = m => BN_MONTHS[m.month0] + (a.year !== c.year ? " " + toBn(m.year) : "");
  return nm(a) + "–" + nm(c);
}

export function TrendReviewSection({ fold, onShiftMonth, migrationState, memberId, member, locked, monthCursor, monthEntries, allFields, fieldApplies, isExcused, isFieldExcusable, dailyScore, toBn, BN_MONTHS, onSendToMeeting }) {
  const { year, month0 } = monthCursor;
  const [open, setOpen] = useState(fold === "open" || fold === "fixed");
  const [data, setData] = useState({ key: null, status: "idle", entries: [null, null] }); // idle | loading | ready | error
  const loadedKey = useRef(null);
  const [showAll, setShowAll] = useState(false); // সারির বিস্তারিত তালিকা, ডিফল্টে বন্ধ
  const key = memberId + "|" + year + "|" + month0;
  const [sel, setSel] = useState(null); // বিস্তারিত খোলা আমলের key
  const [sentKeys, setSentKeys] = useState({});
  const pickRow = (k, reveal) => {
    setSel(cur => (cur === k && !reveal ? null : k));
    if (reveal) {
      setShowAll(true);
      setTimeout(() => { const el = document.getElementById("trend-row-" + k); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
    }
  };
  useEffect(() => { setSel(null); setSentKeys({}); }, [key]);
  const sendRow = r => {
    if (typeof onSendToMeeting !== "function") return;
    const row = { id: `tr-${year}-${pad2(month0 + 1)}-${r.key}`, topic: T.sendTopic, decision: fill(T.sendDecision, { label: r.label }).slice(0, 300), person: "" };
    if (onSendToMeeting([row])) setSentKeys(m => ({ ...m, [r.key]: true }));
  };
  const rowProps = r => ({ selected: sel === r.key, onToggle: () => pickRow(r.key, false), onSend: typeof onSendToMeeting === "function" ? () => sendRow(r) : null, sent: !!sentKeys[r.key] });

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

  const h = useMemo(() => ({
    member, allFields, fieldApplies, isExcused, isFieldExcusable, ratioOf: fieldRatioToday,
    dailyScoreOf: dailyScore ? (e => dailyScore(e, member, allFields)) : undefined
  }), [member, allFields, fieldApplies, isExcused, isFieldExcusable, dailyScore]);

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
    const parts = [];
    if (trend.upCount) parts.push(fill(T.summaryUp, { n: toBn(trend.upCount) }));
    if (trend.attentionCount) parts.push(fill(T.summaryAtt, { n: toBn(trend.attentionCount) }));
    subtitle = parts.length ? parts.join(" · ") : T.summarySteady;
  }

  const allRows = trend && trend.ok ? trend.sections.flatMap(sec => sec.rows) : [];
  const keyRows = KEY_ORDER.map(k => allRows.find(r => r.key === k)).filter(Boolean);
  const otherSections = trend && trend.ok
    ? trend.sections.map(sec => ({ ...sec, rows: sec.rows.filter(r => !KEY_ORDER.includes(r.key)) })).filter(sec => sec.rows.length)
    : [];
  // কুরআন সবার আগে: কুরআনের সারি-সহ সেকশন প্রথমে, সেকশনের ভিতরেও কুরআন প্রথমে(বাকি ক্রম অপরিবর্তিত)।
  const quranSecIdx = otherSections.findIndex(sec => sec.rows.some(r => r.key === "quranPages"));
  if (quranSecIdx >= 0) {
    const qs = otherSections[quranSecIdx];
    const rowsFirst = [...qs.rows.filter(r => r.key === "quranPages"), ...qs.rows.filter(r => r.key !== "quranPages")];
    otherSections.splice(quranSecIdx, 1);
    otherSections.unshift({ ...qs, rows: rowsFirst });
  }
  const otherCount = otherSections.reduce((n, sec) => n + sec.rows.length, 0);

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

        {trend.overall && (
          <div className="rounded-2xl p-3.5 mb-3" style={{ background: "#F7F9F7", border: "1px solid #E1E8E3" }}>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-800">{T.overallTitle}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{T.allSub}</div>
              </div>
              <span className="text-2xl font-bold rounded-xl px-3.5 py-1.5" style={{ background: (TIER_STYLE[trend.overall.all.tier] || TIER_STYLE.none).background, color: (TIER_STYLE[trend.overall.all.tier] || TIER_STYLE.none).color }}>
                {toBn(trend.overall.all.pct)}%
              </span>
            </div>
            <div className="flex items-end gap-1 text-slate-500" style={{ fontSize: 10.5 }}>
              <span className="flex-1 min-w-0">{T.perMonth}</span>
              {trend.months.map(m => (
                <span key={m.year + "-" + m.month0} className="w-11 shrink-0 text-center whitespace-nowrap">{T.monthShort[m.month0]}</span>
              ))}
              <span className="w-4 shrink-0" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex-1 min-w-0 pr-1 text-xs text-slate-600 leading-snug">{trend.overall.dir ? ARROW[trend.overall.dir].label : ""}</div>
              {trend.overall.vals.map((v, i) => (
                <Pill key={i} v={v} monthName={BN_MONTHS[trend.months[i].month0]} toBn={toBn} />
              ))}
              <span className="w-4 shrink-0 text-center font-bold" style={{ color: trend.overall.dir ? ARROW[trend.overall.dir].color : "transparent" }} aria-label={trend.overall.dir ? ARROW[trend.overall.dir].label : undefined}>
                {trend.overall.dir ? ARROW[trend.overall.dir].ch : ""}
              </span>
            </div>
            {T.overallComment[trend.overall.kind] && trend.overall.kind !== "fallingSome" && trend.overall.kind !== "steady" && (
              <p className="text-xs text-slate-600 leading-relaxed mt-2">{fill(T.overallComment[trend.overall.kind], { n: trend.overall.delta === null ? "" : toBn(Math.abs(trend.overall.delta)) })}</p>
            )}
          </div>
        )}

        {(trend.attention.length > 0 || (trend.notStarted && trend.notStarted.length > 0)) && (
          <div className="rounded-2xl p-3 mb-3" style={{ background: "#FFF6EC", border: "1px solid #F3D3B5" }}>
            <div className="text-sm font-bold mb-1.5" style={{ color: "#9A3412" }}>🎯 {T.attTitle}</div>
            {trend.attention.map(r => (
              <button key={r.key} type="button" onClick={() => pickRow(r.key, true)} className="w-full flex items-center gap-2 py-2 text-left border-t first:border-t-0" style={{ borderColor: "#F3D3B5" }}>
                <span className="flex-1 min-w-0 text-sm font-bold text-slate-800 leading-snug">{r.label}</span>
                <span className="shrink-0 text-xs font-bold" style={{ color: "#9A3412" }}>{r.vals.map(v => (v ? toBn(v.pct) + "%" : "—")).join(" → ")}</span>
                <span className="w-3 shrink-0 text-center font-bold" style={{ color: r.dir === "down" ? ARROW.down.color : "transparent" }}>{r.dir === "down" ? "↓" : ""}</span>
              </button>
            ))}
            {trend.attentionCount > trend.attention.length && (
              <p className="text-[11px] text-slate-500 mt-1.5">{fill(T.attMore, { n: toBn(trend.attentionCount - trend.attention.length) })}</p>
            )}
            {trend.notStarted && trend.notStarted.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-1.5">{fill(T.notStarted, { names: trend.notStarted.map(r => r.label).join("، ") })}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1.5">{T.tapHint}</p>
          </div>
        )}

        {keyRows.length > 0 && (
          <div className="mb-3">
            <div className="flex items-end gap-1 pb-1 border-b border-slate-200 text-slate-500" style={{ fontSize: 10.5 }}>
              <span className="flex-1 min-w-0">{T.labelCol}</span>
              {trend.months.map(m => (
                <span key={m.year + "-" + m.month0} className="w-11 shrink-0 text-center whitespace-nowrap">{T.monthShort[m.month0]}</span>
              ))}
              <span className="w-4 shrink-0" />
            </div>
            {keyRows.map(r => <TrendRow key={r.key} r={r} months={trend.months} BN_MONTHS={BN_MONTHS} toBn={toBn} {...rowProps(r)} />)}
          </div>
        )}

        {otherCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(v => !v)}
            aria-expanded={showAll}
            className="w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-emerald-900 mb-3"
            style={{ minHeight: 44 }}
          >
            {showAll ? T.detailsHide : fill(T.detailsShow, { n: toBn(otherCount) })}
          </button>
        )}

        {showAll && otherSections.map(sec => (
          <div key={sec.id} className="mb-2">
            <div className="text-xs font-bold mt-2 mb-1" style={{ color: "#8A6A12" }}>{sec.label}</div>
            {sec.rows.map(r => (
              <TrendRow key={r.key} r={r} months={trend.months} BN_MONTHS={BN_MONTHS} toBn={toBn} {...rowProps(r)}
                comment={fill(T.comment[r.kind], { n: r.delta === null ? "" : toBn(Math.abs(r.delta)) })} />
            ))}
          </div>
        ))}

        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1 text-slate-500" style={{ fontSize: 11 }}>
          {["great", "good", "mid", "low", "none"].map(t => (
            <span key={t} className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ background: TIER_STYLE[t].background, border: "1px solid rgba(0,0,0,0.08)" }} />
              {T.legend[t]}
            </span>
          ))}
        </div>

        {trend.curEmpty && (
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">{fill(T.curEmpty, { month: BN_MONTHS[month0] })}</p>
        )}
        {Object.keys(sentKeys).length > 0 && (
          <p className="text-sm text-emerald-800 text-center rounded-xl p-2.5 mt-2" style={{ background: "#E8F3EC" }} role="status">{T.sentNote}</p>
        )}
        <p className="text-slate-400 text-center mt-2" style={{ fontSize: 11 }}>{T.footnote}</p>
      </div>
    );
  }

  const canToggle = fold !== "fixed";
  const toggle = () => canToggle && setOpen(o => !o);
  return (
    <div className="mx-5 mt-5 p-4 rounded-2xl bg-white shadow-sm" style={{ border: "1px solid #EADFBE" }}>
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={"flex-1 min-w-0 text-left select-none" + (canToggle ? "" : " cursor-default")}
          style={{ minHeight: 32 }}
        >
          <h2 className="font-bold text-[15px] text-slate-800">📈 {T.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </button>
        <div className="mt-0.5">
          <MonthPillNav monthCursor={monthCursor} BN_MONTHS={BN_MONTHS} toBn={toBn} onShift={onShiftMonth} label={tag} />
        </div>
        {canToggle && (
          <button type="button" onClick={toggle} aria-label={open ? "বন্ধ করুন" : "খুলুন"} className="shrink-0 mt-0.5 h-7 flex items-center">
            <ChevronDown size={18} className={"text-slate-400 transition-transform" + (open ? " rotate-180" : "")} />
          </button>
        )}
      </div>
      {body}
    </div>
  );
}
