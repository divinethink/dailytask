// মাসিক মুহাসাবা রিপোর্ট (ধাপ ৩)। "মাসিক ওভারভিউ"-এর নিচে নিজস্ব accordion-কার্ড (weekly/meeting-এর মতো)।
// সব সংখ্যা ডেটা থেকে হিসাব: চলতি মাস = বিদ্যমান live monthEntries (বাড়তি পড়া নেই); আগের মাস = কার্ড খোলার পর
// একবার one-shot পড়া; সাপ্তাহিক লক্ষ্যের ফল = নিজের reviews (শুধু মালিক, id ধরে ≤৫টা get)।
// "সভায় পাঠান": শুধু আমলের হিসাব থেকে তৈরি সিদ্ধান্ত, সম্পাদনাযোগ্য; ব্যক্তিগত মুহাসাবার লেখা কখনো যায় না।
// React global (window.React) — বাকি কম্পোনেন্টের মতোই।
import { REVIEW_TEXT } from "../legacy/reviewText.js";
import { chunkCount, chunkRange, chunkWeekKey } from "../legacy/reviewSchema.js";
import { buildMonthlyReport, goalSummary, suggestDecisions, elapsedDays, prevMonthOf, fill } from "../legacy/reviewMonthly.js";
import { loadReviewsForWeeks } from "../legacy/reviewData.js";
import { loadMonthEntriesOnce } from "../legacy/monthEntriesOnce.js";
import { fieldRatioToday } from "../legacy/dailyInsight.js";
import { pad2 } from "../legacy/appHelpers.js";
import { MonthPillNav } from "./MonthPillNav.jsx";
import { ChevronDown } from "./icons.jsx";

const T = REVIEW_TEXT.monthly;
const { useState, useEffect, useMemo } = React;

function SectionTitle({ children }) {
  return <div className="text-sm font-bold mb-2" style={{ color: "#16302B" }}>{children}</div>;
}

// avgs: [{weekday 0-6, count, avg|null}], weakest: [weekday], names: বারের নাম (রবি=০)।
function WeekdayBars({ avgs, weakest, names, toBn }) {
  return (
    <div className="flex items-end gap-1.5" style={{ height: 96 }}>
      {avgs.map(a => {
        const weak = weakest.includes(a.weekday);
        const h = a.avg === null ? 4 : Math.max(4, Math.round(a.avg * 0.6));
        return (
          <div key={a.weekday} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] text-slate-500 mb-0.5">{a.avg === null ? "—" : toBn(a.avg) + "%"}</span>
            <div className="w-full rounded-t-md" style={{ height: h, background: a.avg === null ? "#E4E7E2" : weak ? "#D9822B" : "#2D6A5C" }} />
            <span className="text-[10px] mt-1 text-slate-600 truncate w-full text-center">{names[a.weekday]}</span>
          </div>
        );
      })}
    </div>
  );
}

// weeks: [{week, count, avg|null}] — ২+ সপ্তাহের ডেটায় ছোট রেখা-চার্ট।
function TrendChart({ weeks, toBn }) {
  const pts = weeks.filter(w => w.avg !== null);
  const W = 300, H = 90, P = 16;
  const x = i => P + (pts.length === 1 ? 0 : (i * (W - 2 * P)) / (pts.length - 1));
  const y = v => H - P - (Math.max(0, Math.min(100, v)) / 100) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" role="img" aria-label={T.trendTitle}>
      <polyline fill="none" stroke="#2D6A5C" strokeWidth="2" points={pts.map((w, i) => `${x(i)},${y(w.avg)}`).join(" ")} />
      {pts.map((w, i) => (
        <g key={w.week}>
          <circle cx={x(i)} cy={y(w.avg)} r="3.5" fill="#C89B3C" />
          <text x={x(i)} y={y(w.avg) - 7} textAnchor="middle" fontSize="10" fill="#16302B">{toBn(w.avg)}%</text>
          <text x={x(i)} y={H + 10} textAnchor="middle" fontSize="9" fill="#5B6B64">{T.weekShort.replace("{n}", toBn(w.week)).split("·")[0].trim()}</text>
        </g>
      ))}
    </svg>
  );
}

const GOAL_ICON = { done: "✅", partial: "🟡", none: "❌" };
const cardBox = "rounded-2xl bg-white p-3 mb-2";
const cardStyle = { border: "1px solid #EADFBE" };

export function MonthlyReportSection({ fold, onShiftMonth, migrationState, memberId, member, locked, monthCursor, monthEntries, allFields, fieldApplies, isExcused, isFieldExcusable, dailyScore, toBn, BN_MONTHS, BN_WEEKDAYS, onSendToMeeting }) {
  const { year, month0 } = monthCursor;
  const [open, setOpen] = useState(fold === "open" || fold === "fixed");
  const [prev, setPrev] = useState({ status: "idle", entries: null }); // idle | loading | ready | error
  const [reviews, setReviews] = useState([]);
  const [edits, setEdits] = useState({}); // সিদ্ধান্ত-id → সম্পাদিত লেখা
  const [off, setOff] = useState({}); // সিদ্ধান্ত-id → true হলে টিক নেই
  const [sent, setSent] = useState(false);
  const [pickErr, setPickErr] = useState(false);
  const [decOpen, setDecOpen] = useState(false); // আগামী মাসের সিদ্ধান্ত: ডিফল্ট বন্ধ

  // আগের মাসের এন্ট্রি: কার্ড খুললে (বা সদস্য/মাস বদলালে) একবার। ব্যর্থ হলে তুলনা ছাড়াই রিপোর্ট চলে।
  useEffect(() => {
    if (!open || !memberId || migrationState === undefined) { setPrev({ status: "idle", entries: null }); return undefined; }
    let alive = true;
    setPrev({ status: "loading", entries: null });
    const p = prevMonthOf(year, month0);
    loadMonthEntriesOnce(migrationState, memberId, p.year, p.month0)
      .then(entries => { if (alive) setPrev({ status: "ready", entries }); })
      .catch(() => { if (alive) setPrev({ status: "error", entries: null }); });
    return () => { alive = false; };
  }, [open, memberId, migrationState, year, month0]);

  // নিজের সাপ্তাহিক লক্ষ্যের ফল: শুধু নিজের (locked নয়), v2, এবং শুরু হয়ে যাওয়া সপ্তাহগুলো। ব্যর্থ ⇒ খালি (অংশটা লুকানো)।
  useEffect(() => {
    setReviews([]);
    if (!open || locked || migrationState !== "v2" || !memberId) return undefined;
    const elapsed = elapsedDays(year, month0, new Date());
    const keys = [];
    for (let w = 1; w <= chunkCount(year, month0); w++) {
      if (chunkRange(year, month0, w).start > elapsed) break;
      keys.push(chunkWeekKey(year, month0, w));
    }
    if (!keys.length) return undefined;
    let alive = true;
    loadReviewsForWeeks(migrationState, memberId, keys).then(r => { if (alive) setReviews(r); });
    return () => { alive = false; };
  }, [open, locked, migrationState, memberId, year, month0]);

  // সদস্য বা মাস বদলালে সিদ্ধান্ত-সম্পাদনা মুছে নতুন প্রস্তাব
  useEffect(() => { setEdits({}); setOff({}); setSent(false); setPickErr(false); }, [memberId, year, month0]);

  const h = useMemo(() => ({ member, allFields, fieldApplies, isExcused, isFieldExcusable, dailyScore, ratioOf: fieldRatioToday }),
    [member, allFields, fieldApplies, isExcused, isFieldExcusable, dailyScore]);
  const report = useMemo(() => (open ? buildMonthlyReport({ year, month0, now: new Date(), curEntries: monthEntries, prevEntries: prev.entries, h }) : null),
    [open, year, month0, monthEntries, prev.entries, h]);
  const goals = useMemo(() => goalSummary(reviews), [reviews]);
  const sugg = useMemo(() => (report && report.ok ? suggestDecisions(report, { text: T.decisions, toBn, weekdayNames: BN_WEEKDAYS, goalNone: goals.counts.none, goalTotal: goals.counts.total }) : []),
    [report, toBn, BN_WEEKDAYS, goals]);

  const textOf = s => (edits[s.id] !== undefined ? edits[s.id] : s.text);
  const doSend = () => {
    const rows = sugg
      .filter(s => !off[s.id])
      .map(s => ({ id: `mr-${year}-${pad2(month0 + 1)}-${s.id}`, topic: T.sendTopic, decision: String(textOf(s)).trim().slice(0, 300), person: "" }))
      .filter(r => r.decision);
    if (!rows.length) { setPickErr(true); return; }
    setPickErr(false);
    if (onSendToMeeting(rows)) setSent(true);
  };

  const head = React.createElement("div", { onClick: () => fold !== "fixed" && setOpen(o => !o), className: "flex items-center gap-1.5 select-none" + (fold === "fixed" ? "" : " cursor-pointer") },
    <h2 className="flex-1 min-w-0 font-bold text-[15px] text-slate-800">📊 {T.title}</h2>,
    <MonthPillNav monthCursor={monthCursor} BN_MONTHS={BN_MONTHS} toBn={toBn} onShift={onShiftMonth} />,
    fold === "fixed" ? null : <ChevronDown size={18} className={"shrink-0 text-slate-400 transition-transform" + (open ? " rotate-180" : "")} />
  );

  let body = null;
  if (open) {
    if (!report || !report.ok) {
      body = <p className="text-sm text-slate-500 mt-3">{T.noData}</p>;
    } else {
      const r = report;
      const monthName = BN_MONTHS[month0] + " " + toBn(year);
      const up = r.delta !== null && r.delta > 0, down = r.delta !== null && r.delta < 0;
      const weakNames = r.weakest.map(i => BN_WEEKDAYS[i]).join(" ও ");
      const goalParts = [];
      if (goals.counts.done) goalParts.push(fill(T.goalDone, { n: toBn(goals.counts.done) }));
      if (goals.counts.partial) goalParts.push(fill(T.goalPartial, { n: toBn(goals.counts.partial) }));
      if (goals.counts.none) goalParts.push(fill(T.goalNone, { n: toBn(goals.counts.none) }));
      body = (
        <div className="mt-3">
          <div className="rounded-xl p-3 mb-2 text-white flex items-center gap-3" style={{ background: "linear-gradient(135deg,#1F4D44,#2D6A5C)" }}>
            {r.prev && r.delta !== null ? (
              <>
                <div className="shrink-0">
                  <div className="text-xs opacity-90 mb-1">{T.versus}</div>
                  <div className="text-2xl font-bold leading-none">{up ? "▲ " : down ? "▼ " : ""}{r.delta === 0 ? T.sameDelta : toBn(Math.abs(r.delta)) + "%"}</div>
                </div>
                <div className="ml-auto text-right min-w-0">
                  <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1" style={{ background: "rgba(255,255,255,0.18)" }}>{monthName}</span>
                  <div className="text-xs opacity-90">{fill(T.prevToNow, { prev: BN_MONTHS[r.prev.month0], p: toBn(r.prev.avg), cur: BN_MONTHS[month0], c: toBn(r.avg) })}</div>
                  {r.partial && <div className="text-[11px] opacity-80 mt-1">{fill(T.partial, { n: toBn(r.cmp) })}</div>}
                </div>
              </>
            ) : (
              <>
                <div className="shrink-0">
                  <div className="text-xs opacity-90 mb-1">{T.avgNow}</div>
                  <div className="text-2xl font-bold leading-none">{toBn(r.avg)}%</div>
                </div>
                <div className="ml-auto text-right min-w-0">
                  <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1" style={{ background: "rgba(255,255,255,0.18)" }}>{monthName}</span>
                  <div className="text-xs opacity-90">{prev.status === "loading" ? T.prevLoading : prev.status === "error" ? T.prevFail : T.noPrev}</div>
                </div>
              </>
            )}
          </div>

          <div className={cardBox} style={cardStyle}>
            <SectionTitle>🗓️ {T.weekdayTitle}</SectionTitle>
            {r.weekdayValid < 3 ? (
              <p className="text-sm text-slate-500 pb-1">{T.weekdayNeedMore}</p>
            ) : (
              <>
                <WeekdayBars avgs={r.weekdays} weakest={r.weakest} names={BN_WEEKDAYS} toBn={toBn} />
                {r.weakest.length > 0 && (
                  <p className="text-sm rounded-xl p-2 mt-2" style={{ background: "#FDEFE3", color: "#9A3412" }}>
                    {fill(r.weakest.length === 2 ? T.weekdayNoteTwo : T.weekdayNoteOne, { days: weakNames })}
                  </p>
                )}
              </>
            )}
          </div>

          <div className={cardBox} style={cardStyle}>
            <div>
              <SectionTitle>📈 {T.trendTitle}</SectionTitle>
              {r.weeks.filter(w => w.avg !== null).length < 2 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {r.weeks.filter(w => w.avg !== null).map(w => (
                    <span key={w.week} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#FBEFC4", color: "#7A5A00" }}>{T.weekShort.replace("{n}", toBn(w.week))} · {toBn(w.avg)}%</span>
                  ))}
                </div>
              ) : (
                <TrendChart weeks={r.weeks} toBn={toBn} />
              )}
            </div>
          </div>

          <div className={cardBox} style={cardStyle}>
            <SectionTitle>🔎 {T.whenGoodTitle}</SectionTitle>
            {r.whenGood
              ? <p className="text-sm text-slate-700 leading-relaxed">{fill(T.whenGood, { label: r.whenGood.label, n: toBn(r.whenGood.diff) })} <span className="text-slate-400">{T.whenGoodNote}</span></p>
              : <p className="text-sm text-slate-500 leading-relaxed">{T.whenGoodNone}</p>}
          </div>

          {goals.counts.total > 0 && (
            <div className={cardBox} style={cardStyle}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm text-slate-800">🎯 {T.goalTitle}</h3>
                <span className="text-[11px] text-slate-500">🔒 {T.goalPrivate}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl tracking-wide">{goals.seq.map(g => GOAL_ICON[g]).join(" ")}</span>
                <span className="text-sm text-slate-600">{fill(T.goalOf, { total: toBn(goals.counts.total) })} {goalParts.join(", ")}</span>
              </div>
            </div>
          )}

          {sugg.length > 0 && (
            <div className="rounded-2xl p-3" style={{ background: "#F6F8F5", border: "1px solid #D5E3D8" }}>
              <button type="button" onClick={() => setDecOpen(o => !o)} aria-expanded={decOpen} className="w-full flex items-center gap-2 text-left">
                <h3 className="flex-1 font-bold text-sm text-slate-800">🧭 {T.decisionsTitle}</h3>
                <span className="text-[11px] text-slate-500">{toBn(sugg.filter(s => !off[s.id]).length)}টি</span>
                <ChevronDown size={18} className={"shrink-0 text-slate-400 transition-transform" + (decOpen ? " rotate-180" : "")} />
              </button>
              {decOpen && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-2">{T.decisionsHint}</p>
                  {sugg.map(s => (
                    <label key={s.id} className="flex items-start gap-2 py-2 border-b border-dashed border-slate-200">
                      <input type="checkbox" checked={!off[s.id]} onChange={() => { setOff(o => ({ ...o, [s.id]: !o[s.id] })); setSent(false); setPickErr(false); }} className="mt-2" />
                      <textarea rows={2} maxLength={300} value={textOf(s)} onChange={e => { const v = e.target.value; setEdits(m => ({ ...m, [s.id]: v })); setSent(false); }} className="flex-1 text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none" />
                    </label>
                  ))}
                  <button type="button" onClick={doSend} className="w-full mt-3 py-3 rounded-2xl bg-emerald-900 text-white font-bold">📨 {T.send}</button>
                  {pickErr && <p className="text-sm text-red-700 text-center mt-2">{T.sendPick}</p>}
                  {sent && <p className="text-sm text-emerald-800 text-center mt-2">{T.sent}</p>}
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center mt-3">{T.footnote}</p>
        </div>
      );
    }
  }

  return React.createElement("div", { className: "mx-5 mt-5 p-4 rounded-2xl bg-white shadow-sm", style: { border: "1px solid #EADFBE" } }, head, body);
}
