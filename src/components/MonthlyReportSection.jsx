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
import { ChevronDown } from "./icons.jsx";

const T = REVIEW_TEXT.monthly;
const { useState, useEffect, useMemo } = React;

const GOAL_ICON = { done: "✅", partial: "🟡", none: "❌" };
const cardBox = "rounded-2xl bg-white p-3 mb-3";
const cardStyle = { border: "1px solid #EADFBE" };

function SectionTitle({ children }) {
  return <h3 className="font-bold text-sm text-slate-800 mb-2">{children}</h3>;
}

// সপ্তাহ-ভিত্তিক গড়ের রেখা। কমপক্ষে একটা সপ্তাহে ডেটা থাকলে আঁকা হয়; ১টা হলে শুধু বিন্দু।
function TrendChart({ weeks, toBn }) {
  const W = 300, H = 118, padX = 30, top = 28, bottom = 86;
  const n = weeks.length;
  const x = i => (n === 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1));
  const y = v => bottom - (v / 100) * (bottom - top);
  const pts = weeks.map((w, i) => (w.avg === null ? null : [x(i), y(w.avg)]));
  const real = pts.filter(Boolean);
  const label = weeks.filter(w => w.avg !== null).map(w => T.weekShort.replace("{n}", toBn(w.week)) + " " + toBn(w.avg) + "%").join(", ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      <line x1={padX - 14} y1={bottom + 6} x2={W - padX + 14} y2={bottom + 6} stroke="#E2E8F0" strokeWidth="1" />
      {real.length > 1 && <polyline points={real.map(p => p.join(",")).join(" ")} fill="none" stroke="#1F4D44" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {weeks.map((w, i) => pts[i] && (
        <g key={w.week}>
          <circle cx={pts[i][0]} cy={pts[i][1]} r="5" fill="#fff" stroke="#C89B3C" strokeWidth="3" />
          <text x={pts[i][0]} y={pts[i][1] - 11} textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">{toBn(w.avg)}%</text>
        </g>
      ))}
      {weeks.map((w, i) => (
        <text key={"l" + w.week} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748B">{T.weekShort.replace("{n}", toBn(w.week))}</text>
      ))}
    </svg>
  );
}

function WeekdayBars({ avgs, weakest, names, toBn }) {
  return (
    <div className="flex items-end gap-1.5" style={{ height: 104 }}>
      {avgs.map(a => {
        const weak = weakest.includes(a.weekday);
        const hgt = a.avg === null ? 4 : Math.max(8, Math.round(a.avg * 0.7));
        return (
          <div key={a.weekday} className="flex-1 flex flex-col items-center justify-end">
            <span className="text-[10px] text-slate-500 mb-0.5">{a.avg === null ? "" : toBn(a.avg)}</span>
            <div className="w-full rounded-t-lg" style={{ height: hgt, background: a.avg === null ? "#E2E8F0" : weak ? "#E39A5B" : "#7FB89C" }} />
            <span className={"text-xs mt-1 " + (weak ? "font-bold text-orange-700" : "text-slate-600")}>{names[a.weekday]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MonthlyReportSection({ fold, migrationState, memberId, member, locked, monthCursor, monthEntries, allFields, fieldApplies, isExcused, isFieldExcusable, dailyScore, toBn, BN_MONTHS, BN_WEEKDAYS, onSendToMeeting }) {
  const { year, month0 } = monthCursor;
  const [open, setOpen] = useState(fold === "open" || fold === "fixed");
  const [prev, setPrev] = useState({ status: "idle", entries: null }); // idle | loading | ready | error
  const [reviews, setReviews] = useState([]);
  const [edits, setEdits] = useState({}); // সিদ্ধান্ত-id → সম্পাদিত লেখা
  const [off, setOff] = useState({}); // সিদ্ধান্ত-id → true হলে টিক নেই
  const [sent, setSent] = useState(false);
  const [pickErr, setPickErr] = useState(false);

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
  const sugg = useMemo(() => (report && report.ok ? suggestDecisions(report, { text: T.decisions, toBn, weekdayNames: BN_WEEKDAYS }) : []),
    [report, toBn, BN_WEEKDAYS]);
  const goals = useMemo(() => goalSummary(reviews), [reviews]);

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

  const head = React.createElement("div", { onClick: () => fold !== "fixed" && setOpen(o => !o), className: "flex items-center justify-between select-none" + (fold === "fixed" ? "" : " cursor-pointer") },
    <h2 className="font-bold text-base text-slate-800">📊 {T.title}</h2>,
    fold === "fixed" ? null : <ChevronDown size={18} className={"text-slate-400 transition-transform" + (open ? " rotate-180" : "")} />
  );

  let body = null;
  if (open) {
    if (!report || !report.ok) {
      body = <p className="text-sm text-slate-500 mt-3">{T.noData}</p>;
    } else {
      const r = report;
      const monthName = BN_MONTHS[month0] + " " + toBn(year);
      const up = r.delta !== null && r.delta > 0, down = r.delta !== null && r.delta < 0;
      const moveCount = (r.moves.improvement ? 1 : 0) + (r.moves.drop ? 1 : 0);
      const weakNames = r.weakest.map(i => BN_WEEKDAYS[i]).join(" ও ");
      const goalParts = [];
      if (goals.counts.done) goalParts.push(fill(T.goalDone, { n: toBn(goals.counts.done) }));
      if (goals.counts.partial) goalParts.push(fill(T.goalPartial, { n: toBn(goals.counts.partial) }));
      if (goals.counts.none) goalParts.push(fill(T.goalNone, { n: toBn(goals.counts.none) }));
      body = (
        <div className="mt-3">
          <div className="rounded-xl p-4 mb-3 text-white" style={{ background: "linear-gradient(135deg,#1F4D44,#2D6A5C)" }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-sm opacity-90">{r.prev ? T.versus : T.avgNow}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }}>{monthName}</span>
            </div>
            {r.prev && r.delta !== null ? (
              <>
                <div className="text-3xl font-bold leading-none mb-1">{up ? "▲ " : down ? "▼ " : ""}{r.delta === 0 ? T.sameDelta : toBn(Math.abs(r.delta)) + "%"}</div>
                <div className="text-sm opacity-90">{fill(T.prevToNow, { prev: BN_MONTHS[r.prev.month0], p: toBn(r.prev.avg), cur: BN_MONTHS[month0], c: toBn(r.avg) })}</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold leading-none mb-1">{toBn(r.avg)}%</div>
                <div className="text-sm opacity-90">{prev.status === "loading" ? T.prevLoading : prev.status === "error" ? T.prevFail : T.noPrev}</div>
              </>
            )}
            {r.partial && r.prev && <div className="text-xs opacity-80 mt-2">{fill(T.partial, { n: toBn(r.cmp) })}</div>}
          </div>

          <div className={cardBox} style={cardStyle}>
            <SectionTitle>📈 {T.trendTitle}</SectionTitle>
            <TrendChart weeks={r.weeks} toBn={toBn} />
          </div>

          {r.weekdayValid >= 3 && (
            <div className={cardBox} style={cardStyle}>
              <SectionTitle>🗓️ {T.weekdayTitle}</SectionTitle>
              <WeekdayBars avgs={r.weekdays} weakest={r.weakest} names={BN_WEEKDAYS} toBn={toBn} />
              {r.weakest.length > 0 && (
                <p className="text-sm rounded-xl p-3 mt-3" style={{ background: "#FDEFE3", color: "#9A3412" }}>
                  {fill(r.weakest.length === 2 ? T.weekdayNoteTwo : T.weekdayNoteOne, { days: weakNames })}
                </p>
              )}
            </div>
          )}

          {(moveCount > 0 || r.whenGood) && (
            <div className={cardBox} style={cardStyle}>
              {moveCount > 0 && (
                <>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${moveCount}, minmax(0, 1fr))` }}>
                    {r.moves.improvement && (
                      <div className="rounded-xl p-3" style={{ background: "#EAF6EE", border: "1px solid #CFE8D8" }}>
                        <div className="text-xs text-slate-600 mb-1">🚀 {T.bestTitle}</div>
                        <div className="font-bold text-sm text-emerald-950">{r.moves.improvement.label}</div>
                        <div className="text-xs text-slate-600 mt-1">{fill(T.daysTo, { prev: toBn(r.moves.improvement.prev), cur: toBn(r.moves.improvement.cur) })}</div>
                      </div>
                    )}
                    {r.moves.drop && (
                      <div className="rounded-xl p-3" style={{ background: "#FDEFE3", border: "1px solid #F6D5B8" }}>
                        <div className="text-xs text-slate-600 mb-1">⚠️ {T.dropTitle}</div>
                        <div className="font-bold text-sm text-emerald-950">{r.moves.drop.label}</div>
                        <div className="text-xs text-slate-600 mt-1">{fill(T.daysTo, { prev: toBn(r.moves.drop.prev), cur: toBn(r.moves.drop.cur) })}</div>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{T.movesHint}</p>
                </>
              )}
              {r.whenGood && (
                <div className={moveCount > 0 ? "mt-3" : ""}>
                  <SectionTitle>🔎 {T.whenGoodTitle}</SectionTitle>
                  <p className="text-sm text-slate-700">{fill(T.whenGood, { label: r.whenGood.label, n: toBn(r.whenGood.diff) })} <span className="text-slate-400">{T.whenGoodNote}</span></p>
                </div>
              )}
            </div>
          )}

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
              <h3 className="font-bold text-sm text-slate-800 mb-1">🧭 {T.decisionsTitle}</h3>
              <p className="text-xs text-slate-500 mb-2">{T.decisionsHint}</p>
              {sugg.map(s => (
                <label key={s.id} className="flex items-start gap-2 py-2 border-b border-dashed border-slate-200">
                  <input type="checkbox" checked={!off[s.id]} onChange={() => { setOff(o => ({ ...o, [s.id]: !o[s.id] })); setSent(false); setPickErr(false); }} className="mt-2" />
                  <textarea rows={2} maxLength={300} value={textOf(s)} onChange={e => { const v = e.target.value; setEdits(m => ({ ...m, [s.id]: v })); setSent(false); }} className="flex-1 text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none" />
                </label>
              ))}
              <p className="text-[11px] text-slate-500 mt-2">🔒 {T.decisionsPrivacy}</p>
              <button type="button" onClick={doSend} className="w-full mt-3 py-3 rounded-2xl bg-emerald-900 text-white font-bold">📨 {T.send}</button>
              {pickErr && <p className="text-sm text-red-700 text-center mt-2">{T.sendPick}</p>}
              {sent && <p className="text-sm text-emerald-800 text-center mt-2">{T.sent}</p>}
              <p className="text-xs text-slate-500 text-center mt-2">{T.sendNote}</p>
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center mt-3">{T.footnote}</p>
        </div>
      );
    }
  }

  return React.createElement("div", { className: "mx-5 mt-5 p-4 rounded-2xl bg-white shadow-sm", style: { border: "1px solid #EADFBE" } }, head, body);
}
