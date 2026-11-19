// মাসিক মুহাসাবা রিপোর্ট (ধাপ ৩)। "মাসিক ওভারভিউ"-এর নিচে নিজস্ব accordion-কার্ড (weekly/meeting-এর মতো)।
// সব সংখ্যা ডেটা থেকে হিসাব: চলতি মাস = বিদ্যমান live monthEntries (বাড়তি পড়া নেই); আগের মাস = কার্ড খোলার পর
// একবার one-shot পড়া; সাপ্তাহিক লক্ষ্যের ফল = নিজের reviews (শুধু মালিক, id ধরে ≤৫টা get)।
// "সভায় পাঠান": শুধু আমলের হিসাব থেকে তৈরি সিদ্ধান্ত, সম্পাদনাযোগ্য; ব্যক্তিগত মুহাসাবার লেখা কখনো যায় না।
// React global (window.React) — বাকি কম্পোনেন্টের মতোই।
import { REVIEW_TEXT } from "../legacy/reviewText.js";
import { chunkCount, chunkStarted, chunkWeekKey, monthUnlockAt, monthLockAt, windowState } from "../legacy/reviewSchema.js";
import { buildMonthlyReport, goalSummary, suggestDecisions, prevMonthOf, fill } from "../legacy/reviewMonthly.js";
import { loadReviewsForWeeks } from "../legacy/reviewData.js";
import { loadMonthEntriesOnce } from "../legacy/monthEntriesOnce.js";
import { fieldRatioToday } from "../legacy/dailyInsight.js";
import { pad2 } from "../legacy/appHelpers.js";
import { MonthPillNav } from "./MonthPillNav.jsx";
import { ChevronDown } from "./icons.jsx";

const T = REVIEW_TEXT.monthly;
const { useState, useEffect, useMemo } = React;

// সেকশন-কার্ড: আইকন-বাবল + শিরোনাম, বাঁ-পাশে রঙিন অ্যাকসেন্ট। শুধু ডিজাইন; ভিতরের হিসাব অপরিবর্তিত।
function SectionCard({ icon, title, accent, tint, right, children }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 mb-3" style={{ border: "1px solid #EADFBE", boxShadow: "0 4px 14px -8px rgba(22,48,43,0.25)" }}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] shrink-0" style={{ background: tint, boxShadow: `0 0 0 1.5px ${accent}55` }}>{icon}</span>
        <h3 className="flex-1 min-w-0 text-sm font-bold" style={{ color: "#16302B" }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
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

// এক-বার সারি (১৫ নভেম্বর ২০২৬, owner-approved ডিজাইন): বারের সবুজ/কমলা অংশ = এ মাস, ছোট দাগ (tick) = গত মাস কতদূর ছিল।
// বারের মাপ = তুলনার জানালার দিন-সংখ্যা (cmp) অনুপাতে, তাই সব সারি একই স্কেলে। হিসাব (m.prev/cur/delta) অপরিবর্তিত।
function MoveRow({ m, cmp, toBn, onSend, sent }) {
  const down = m.delta < 0;
  const same = m.delta === 0;
  const w = n => Math.max(n > 0 ? 3 : 0, Math.min(100, Math.round((n / Math.max(1, cmp)) * 100)));
  const chipStyle = same ? { background: "#EEF1EF", color: "#475569" } : down ? { background: "#FDEFE3", color: "#9A3412" } : { background: "#EAF5EE", color: "#166534" };
  const chipText = same ? "= " + T.sameDelta : (down ? "↓ −" : "↑ +") + toBn(Math.abs(m.delta)) + " দিন";
  return (
    <div className="py-2.5 border-t border-slate-100 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-800 min-w-0 break-words">{m.label}</div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0" style={chipStyle}>{chipText}</span>
      </div>
      <div className="relative h-2.5 rounded-full my-2" style={{ background: "#EEF1EF" }}>
        <div className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: w(m.cur) + "%", minWidth: m.cur > 0 ? 6 : 0, background: down ? "#D9822B" : "#2D6A5C" }} />
        {m.prev > 0 && <div className="absolute rounded-sm" style={{ left: `calc(${w(m.prev)}% - 1px)`, top: -3, bottom: -3, width: 2, background: "#475569" }} aria-hidden="true" />}
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{fill(T.movesPrevDays, { n: toBn(m.prev) })}</span>
        <span>{fill(T.movesCurDays, { n: toBn(m.cur) })}</span>
      </div>
      {down && onSend && (
        <button type="button" onClick={onSend} disabled={sent} className="mt-1.5 min-h-[44px] px-3 rounded-xl border text-xs font-bold disabled:opacity-70" style={{ borderColor: "#E9C9A8", color: sent ? "#166534" : "#9A3412", background: sent ? "#EAF5EE" : "#FFF8F1" }}>
          {sent ? T.movesSent : T.movesSendBtn + " ↗"}
        </button>
      )}
    </div>
  );
}

const GOAL_ICON = { done: "✅", partial: "🟡", none: "❌" };

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
  const [allOpen, setAllOpen] = useState(false); // "সব আমল দেখুন": ডিফল্ট বন্ধ
  const [mvFilter, setMvFilter] = useState("all"); // সব | up | dn
  const [mvSent, setMvSent] = useState({}); // আমল-key → সভায় পাঠানো হয়েছে

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
    const keys = [];
    for (let w = 1; w <= chunkCount(year, month0); w++) {
      if (!chunkStarted(year, month0, w, new Date())) break;
      keys.push(chunkWeekKey(year, month0, w));
    }
    if (!keys.length) return undefined;
    let alive = true;
    loadReviewsForWeeks(migrationState, memberId, keys).then(r => { if (alive) setReviews(r); });
    return () => { alive = false; };
  }, [open, locked, migrationState, memberId, year, month0]);

  // সদস্য বা মাস বদলালে সিদ্ধান্ত-সম্পাদনা মুছে নতুন প্রস্তাব
  useEffect(() => { setEdits({}); setOff({}); setSent(false); setPickErr(false); setMvFilter("all"); setMvSent({}); }, [memberId, year, month0]);

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

  // লক-সময়: মাসের শেষ দিন রাত ৮টা থেকে পরের মাসের ৩ তারিখ রাত ১১টা পর্যন্ত খোলা
  const win = windowState(monthUnlockAt(year, month0), monthLockAt(year, month0), new Date());
  const W = REVIEW_TEXT.window;
  let body = null;
  // কোন বারে পিছিয়ে পড়েন — মাসিক লক থাকলেও এই কার্ড দেখানো হয়
  const weekdayEl = r => {
    const weakNames = r.weakest.map(i => BN_WEEKDAYS[i]).join(" ও ");
    return (
      r.weekdayValid < 3 ? (
                <div className="rounded-2xl px-3.5 py-3 mb-3 flex items-center gap-2.5" style={{ background: "#F6F8F5", border: "1px dashed #D5E3D8" }}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] shrink-0" style={{ background: "#FDEFE3" }}>🗓️</span>
                  <p className="text-[13px] text-slate-600 leading-snug"><b className="text-slate-800">{T.weekdayTitle}</b> — {T.weekdayNeedMore}</p>
                </div>
              ) : (
                <SectionCard icon="🗓️" title={T.weekdayTitle} accent="#D9822B" tint="#FDEFE3">
                  <WeekdayBars avgs={r.weekdays} weakest={r.weakest} names={BN_WEEKDAYS} toBn={toBn} />
                  {r.weakest.length > 0 && (
                    <p className="text-sm rounded-xl p-2.5 mt-2.5 leading-relaxed" style={{ background: "#FDEFE3", color: "#9A3412" }}>
                      {fill(r.weakest.length === 2 ? T.weekdayNoteTwo : T.weekdayNoteOne, { days: weakNames })}
                    </p>
                  )}
                </SectionCard>
              )
    );
  };
  if (open) {
    if (!locked && win !== "open") {
      body = (
        <div className="mt-3">
          {report && report.ok && report.weekdayValid >= 3 && weekdayEl(report)}
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: win === "before" ? "#FFFBF0" : "#F6F7F5", border: "1px solid " + (win === "before" ? "#EADFBE" : "#E4E7E2") }}>
            <span className="text-3xl" aria-hidden>🔒</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800">{win === "before" ? W.monthBeforeTitle : W.monthClosedTitle}</div>
              {win === "closed" && <div className="text-xs text-slate-500 mt-0.5">{W.monthClosedHint}</div>}
            </div>
          </div>
        </div>
      );
    } else if (!report || !report.ok) {
      body = <p className="text-sm text-slate-500 mt-3">{T.noData}</p>;
    } else {
      const r = report;
      const mv = r.moves;
      const totalCount = mv.ups.length + mv.downs.length + mv.same.length;
      const firstRows = [...mv.downs.slice(0, 3), ...mv.ups.slice(0, 2)];
      const restRows = [...mv.downs.slice(3), ...mv.ups.slice(2), ...mv.same];
      const moreCount = restRows.length;
      const canSend = typeof onSendToMeeting === "function";
      const sendMove = m => {
        if (!canSend) return;
        const row = { id: `mv-${year}-${pad2(month0 + 1)}-${m.key}`, topic: T.sendTopic, decision: fill(T.movesSendText, { label: m.label, n: toBn(Math.abs(m.delta)) }).slice(0, 300), person: "" };
        if (onSendToMeeting([row])) setMvSent(x => ({ ...x, [m.key]: true }));
      };
      const showChips = mv.ups.length > 0 && mv.downs.length > 0;
      const filt = showChips ? mvFilter : "all";
      const rowsShown = filt === "up" ? mv.ups : filt === "dn" ? mv.downs : allOpen ? [...firstRows, ...restRows] : firstRows;
      const chip = (id, label, n) => (
        <button key={id} type="button" onClick={() => setMvFilter(id)} aria-pressed={filt === id} className="px-3 min-h-[36px] rounded-full text-xs font-bold border active:scale-95 transition-transform" style={filt === id ? { background: "#E3F0EA", color: "#1F4D44", borderColor: "#2D6A5C" } : { color: "#64748B", borderColor: "#CBD5E1" }}>{label} {toBn(n)}</button>
      );
      const goalParts = [];
      if (goals.counts.done) goalParts.push(fill(T.goalDone, { n: toBn(goals.counts.done) }));
      if (goals.counts.partial) goalParts.push(fill(T.goalPartial, { n: toBn(goals.counts.partial) }));
      if (goals.counts.none) goalParts.push(fill(T.goalNone, { n: toBn(goals.counts.none) }));
      body = (
        <div className="mt-3">
          <div className="rounded-2xl bg-white p-3.5 mb-3" style={{ border: "1px solid #EADFBE", boxShadow: "0 4px 14px -8px rgba(22,48,43,0.25)" }}>
            <h3 className="font-bold text-[15px]" style={{ color: "#16302B" }}>{T.movesTitle}</h3>
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{T.movesSub} · <span style={{ color: "#475569" }}>|</span> {T.movesLegendPrev} <span style={{ color: "#2D6A5C" }}>■</span> {T.movesLegendCur}</p>
            {r.prev && (r.moves.improvement || r.moves.drop) ? (
              <>
                {showChips && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {chip("all", T.movesFilterAll, totalCount)}
                    {chip("up", T.movesFilterUp, mv.ups.length)}
                    {chip("dn", T.movesFilterDown, mv.downs.length)}
                  </div>
                )}
                {mv.improvement && (
                  <div className="mt-3 rounded-xl px-3 py-2.5 text-[13px] leading-snug" style={{ background: "#EAF5EE", color: "#166534" }}>
                    ↑ {fill(T.movesHero, { label: mv.improvement.label, n: toBn(Math.abs(mv.improvement.delta)) })}
                  </div>
                )}
                <div className="mt-3">
                  {rowsShown.map(m => <MoveRow key={m.key} m={m} cmp={r.cmp} toBn={toBn} onSend={canSend ? () => sendMove(m) : null} sent={!!mvSent[m.key]} />)}
                  {filt === "all" && moreCount > 0 && (
                    <button type="button" onClick={() => setAllOpen(o => !o)} aria-expanded={allOpen} className="w-full mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-sm font-bold text-emerald-900 min-h-11">
                      {allOpen ? T.movesHideAll : fill(T.movesSeeAll, { n: toBn(totalCount) })}
                      <ChevronDown size={15} className={"transition-transform" + (allOpen ? " rotate-180" : "")} />
                    </button>
                  )}
                </div>
                {Object.keys(mvSent).length > 0 && <p className="text-xs text-emerald-800 mt-2">{T.sent}</p>}
                <p className="text-xs mt-3 leading-relaxed rounded-lg p-2.5" style={{ background: "#F6F8F5", color: "#334155" }}>
                  💭 {r.moves.drop ? fill(T.movesThinkDown, { label: r.moves.drop.label }) : fill(T.movesThinkUp, { label: r.moves.improvement.label })}
                </p>
                {r.partial && <div className="text-[11px] text-slate-500 mt-2 leading-snug">{fill(T.partial, { n: toBn(r.cmp) })}</div>}
              </>
            ) : (
              <div className="text-xs text-slate-600 leading-relaxed mt-3">{r.prev ? T.movesAllNone : prev.status === "loading" ? T.prevLoading : prev.status === "error" ? T.prevFail : T.noPrev}</div>
            )}
          </div>

          {r.prev && (mv.improvement || mv.same.length > 0) && mv.downs.length === 0 && (
            <div className="rounded-2xl px-3.5 py-3 mb-3 flex items-center gap-3" style={{ background: "#EAF5EE", border: "1px solid #CFE6D6" }}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0" style={{ background: "#2D6A5C" }}>✓</span>
              <div>
                <div className="text-sm font-bold text-slate-800">{T.movesNoDrop}</div>
                <div className="text-xs text-slate-500">{T.movesNoDropSub}</div>
              </div>
            </div>
          )}

          {weekdayEl(r)}

          {r.weeks.filter(w => w.avg !== null).length >= 2 && (
            <SectionCard icon="📈" title={T.trendTitle} accent="#2D6A5C" tint="#E3F0EA">
              <TrendChart weeks={r.weeks} toBn={toBn} />
            </SectionCard>
          )}

          <SectionCard icon="🔎" title={T.whenGoodTitle} accent="#3B7EA1" tint="#E4F0F7">
            {r.whenGood ? (
              <div>
                <div className="inline-block rounded-xl px-3 py-1.5 mb-2" style={{ background: "#E4F0F7", color: "#1F5A7A" }}>
                  <span className="text-xl font-bold leading-none">▲ {toBn(r.whenGood.diff)}%</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{fill(T.whenGood, { label: r.whenGood.label, n: toBn(r.whenGood.diff) })} <span className="text-slate-400">{T.whenGoodNote}</span></p>
              </div>
            ) : <p className="text-sm text-slate-500 leading-relaxed">{T.whenGoodNone}</p>}
          </SectionCard>

          {goals.counts.total > 0 && (
            <SectionCard icon="🎯" title={T.goalTitle} accent="#C89B3C" tint="#FBEFC4" right={<span className="text-[11px] text-slate-500">🔒 {T.goalPrivate}</span>}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl tracking-wide">{goals.seq.map(g => GOAL_ICON[g]).join(" ")}</span>
                <span className="text-sm text-slate-600">{fill(T.goalOf, { total: toBn(goals.counts.total) })} {goalParts.join(", ")}</span>
              </div>
            </SectionCard>
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
