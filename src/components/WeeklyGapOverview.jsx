// সাপ্তাহিক ঘাটতির চিত্র কার্ড। "সাপ্তাহিক মুহাসাবা"-র ঠিক নিচে নিজস্ব accordion-কার্ড (একই মাস-কার্সর reviewCursor)।
// ডেটা: নিজের সংরক্ষিত সাপ্তাহিক মুহাসাবা (families/<id>/reviews) — শুধু পড়া, নতুন লেখা/schema নেই।
// বন্ধ থাকলে রিড শূন্য; খুললে মাসের সপ্তাহ-সংখ্যা (≤৫) ডক id ধরে আলাদা get। শুধু নিজের সদস্যে (locked হলে লুকানো)।
// সব হিসাব reviewGapOverview.js-এ (pure); সব বাংলা লেখা reviewText.js-এ। React global (window.React)।
import { REVIEW_TEXT } from "../legacy/reviewText.js";
import { buildGapOverview } from "../legacy/reviewGapOverview.js";
import { chunkCount, chunkRange, chunkWeekKey } from "../legacy/reviewSchema.js";
import { loadReviewsForWeeks } from "../legacy/reviewData.js";
import { elapsedDays, fill } from "../legacy/reviewMonthly.js";
import { MonthPillNav } from "./MonthPillNav.jsx";
import { ChevronDown } from "./icons.jsx";

const T = REVIEW_TEXT.gapOverview;
const { useState, useEffect, useMemo } = React;

const HERO_BG = "linear-gradient(135deg,#1F4D44,#2D6A5C)";
const GOAL_STYLE = {
  done: { background: "#DCEBE5", color: "#0E4B43" },
  partial: { background: "#FBEFC4", color: "#7A5A00" },
  none: { background: "#F6DCDD", color: "#9B3A40" }
};

function Stat({ icon, label, value, sub }) {
  return (
    <div className="flex-1 min-w-0 rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.13)" }}>
      <div className="text-[11px] opacity-90 leading-tight">{icon} {label}</div>
      <div className="text-sm font-bold leading-snug mt-1 break-words">{value || "—"}</div>
      {sub ? <div className="text-[11px] opacity-90 mt-0.5">{sub}</div> : null}
    </div>
  );
}

function WeekItem({ w, last, open, onToggle, gapLabel, reasonLabel, blockerLabel, recurring, range, toBn }) {
  const hasMore = w.hasReview && (w.blockers.length > 0 || w.moment);
  const dotBg = !w.hasReview ? "#C9D6CE" : w.hasGap ? "#E8A317" : "#2F9E44";
  const goal = GOAL_STYLE[w.goalResult];
  const sub = !w.hasReview ? range + " · " + T.noEntry : w.reasons.length ? range + " · " + w.reasons.map(reasonLabel).join("، ") : range;
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center shrink-0" style={{ width: 22 }}>
        <span className="mt-2 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: dotBg }}>{toBn(w.week)}</span>
        {!last && <span className="flex-1 w-0.5 mt-1 rounded" style={{ background: "#D8E4DC", minHeight: 8 }} />}
      </div>
      <div className={"flex-1 min-w-0" + (last ? "" : " pb-2")}>
        <div
          role={hasMore ? "button" : undefined}
          tabIndex={hasMore ? 0 : undefined}
          aria-expanded={hasMore ? open : undefined}
          onClick={hasMore ? onToggle : undefined}
          onKeyDown={hasMore ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } } : undefined}
          className={"rounded-xl px-3 py-2 bg-white" + (hasMore ? " cursor-pointer" : "")}
          style={{ border: "1px solid #E1E8E3" }}
        >
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
              {w.hasReview && !w.hasGap && <span className="text-sm font-bold" style={{ color: "#2F7D4F" }}>✓ {T.noGap}</span>}
              {w.gapKey && <span className="text-sm font-bold rounded-md px-2 py-0.5" style={{ background: "#FBEFC4", color: "#7A5A00" }}>{gapLabel}</span>}
              {recurring && <span className="text-[11px] font-bold" style={{ color: "#9A3412" }}>{T.recurring}</span>}
            </div>
            {goal && <span className="shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5" style={goal}>🎯 {T.goal[w.goalResult]}</span>}
            {hasMore && <ChevronDown size={14} className={"shrink-0 text-slate-400 transition-transform" + (open ? " rotate-180" : "")} />}
          </div>
          <div className="text-[11px] text-slate-500 leading-snug" style={{ marginTop: w.hasReview ? 4 : 0 }}>{sub}</div>
          {open && hasMore && (
            <div className="mt-2 pt-2 text-xs text-slate-600 leading-relaxed" style={{ borderTop: "1px dashed #D8E4DC" }}>
              {w.blockers.length > 0 && (
                <p className="mb-1"><span className="font-bold text-slate-700">{T.blockers}: </span>{w.blockers.map(blockerLabel).join("، ")}</p>
              )}
              {w.moment && (
                <p><span className="font-bold text-slate-700">{T.moment}: </span>{w.moment}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WeeklyGapOverview({ fold, onShiftMonth, migrationState, memberId, locked, monthCursor, allFields, toBn, BN_MONTHS }) {
  const { year, month0 } = monthCursor;
  const [open, setOpen] = useState(fold === "open" || fold === "fixed");
  const [data, setData] = useState({ key: null, status: "idle", reviews: [] }); // idle | loading | ready | error
  const [sel, setSel] = useState(null);
  const key = memberId + "|" + year + "|" + month0;

  useEffect(() => { setSel(null); }, [key]);

  useEffect(() => {
    if (!open || locked || !memberId || migrationState !== "v2") return undefined;
    const elapsed = elapsedDays(year, month0, new Date());
    const keys = [];
    for (let w = 1; w <= chunkCount(year, month0); w++) {
      if (chunkRange(year, month0, w).start > elapsed) break;
      keys.push(chunkWeekKey(year, month0, w));
    }
    let alive = true;
    if (!keys.length) { setData({ key, status: "ready", reviews: [] }); return undefined; }
    setData({ key, status: "loading", reviews: [] });
    loadReviewsForWeeks(migrationState, memberId, keys)
      .then(reviews => { if (alive) setData({ key, status: "ready", reviews }); })
      .catch(() => { if (alive) setData({ key, status: "error", reviews: [] }); });
    return () => { alive = false; };
  }, [open, locked, memberId, migrationState, key, year, month0]);

  const fresh = data.key === key && (data.status === "ready" || data.status === "error");
  const ov = useMemo(() => {
    if (!open || locked || !fresh) return null;
    return buildGapOverview({ year, month0, elapsed: elapsedDays(year, month0, new Date()), reviews: data.reviews });
  }, [open, locked, fresh, data, year, month0]);

  if (locked) return null; // শুধু নিজের সদস্যে (সব hook এর পরে)

  const fieldName = k => { const f = (allFields || []).find(x => x.key === k); return f ? (f.shortLabel || f.label) : k; };
  const reasonLabel = id => (REVIEW_TEXT.gap.reasons.find(x => x.id === id) || { t: id }).t;
  const blockerLabel = id => (REVIEW_TEXT.goal.blockers.find(x => x.id === id) || { t: id }).t;
  const rangeText = w => toBn(w.start) + "–" + toBn(w.end) + " " + BN_MONTHS[month0];

  const hasAny = !!(ov && ov.filled > 0);
  const subtitle = T.subtitle;

  let body = null;
  if (open) {
    if (migrationState !== "v2") body = <p className="text-sm text-slate-500 mt-3">{T.needV2}</p>;
    else if (!memberId) body = <p className="text-sm text-slate-500 mt-3">{REVIEW_TEXT.trend.noMember}</p>;
    else if (!fresh) body = <p className="text-sm text-slate-500 mt-3" role="status">{T.loading}</p>;
    else if (!ov || !hasAny) body = (
      <div className="mt-3">
        {data.status === "error" && <p className="text-xs text-orange-700 mb-2">{T.error}</p>}
        <div className="rounded-2xl p-4 text-center" style={{ background: "#F1F6F2" }}>
          <div className="text-3xl mb-1">🧭</div>
          <p className="text-sm text-slate-600 leading-relaxed">{T.empty}</p>
        </div>
      </div>
    );
    else {
      const topGap = ov.topGaps[0];
      const topReason = ov.topReasons[0];
      const goalTotal = ov.goal.done + ov.goal.partial + ov.goal.none;
      const recurringSet = new Set(ov.recurring);
      let insight = "";
      if (ov.recurring.length) insight = fill(T.insightOne, { name: fieldName(ov.recurring[0]) });
      else if (topReason && topReason.count >= 2) insight = fill(T.insightReason, { name: reasonLabel(topReason.id) });
      body = (
        <div className="mt-3 rounded-2xl p-2.5" style={{ background: "#F1F6F2" }}>
          {data.status === "error" && <p className="text-xs text-orange-700 mb-2">{T.error}</p>}

          <div className="rounded-2xl p-3 text-white mb-2.5" style={{ background: HERO_BG }}>
            <div className="text-base font-bold leading-snug mb-2.5">{ov.gapCount ? fill(T.heroMain, { g: toBn(ov.gapCount), t: toBn(ov.total) }) : T.heroNone}</div>
            <div className="flex gap-2">
              <Stat icon="🔁" label={T.statTop} value={topGap ? fieldName(topGap.id) : ""} sub={topGap ? fill(T.times, { n: toBn(topGap.count) }) : ""} />
              <Stat icon="💭" label={T.statReason} value={topReason ? reasonLabel(topReason.id) : ""} sub={topReason ? fill(T.timesReason, { n: toBn(topReason.count) }) : ""} />
              {goalTotal > 0 && <Stat icon="🎯" label={T.statGoal} value={fill(T.goalOf, { d: toBn(ov.goal.done), t: toBn(goalTotal) })} />}
            </div>
          </div>

          {insight && (
            <p className="text-xs leading-relaxed rounded-xl p-2.5 mb-2.5" style={{ background: "#FFF6EC", border: "1px solid #F3D3B5", color: "#7C3A10" }}>💡 {insight}</p>
          )}

          <div className="text-xs font-bold text-slate-600 mb-1.5">{T.weeksTitle}</div>
          {ov.weeks.map((w, i) => (
            <WeekItem
              key={w.week} w={w} last={i === ov.weeks.length - 1} toBn={toBn}
              open={sel === w.week} onToggle={() => setSel(c => (c === w.week ? null : w.week))}
              gapLabel={w.gapKey ? fieldName(w.gapKey) : ""} reasonLabel={reasonLabel} blockerLabel={blockerLabel}
              recurring={!!w.gapKey && recurringSet.has(w.gapKey)} range={rangeText(w)}
            />
          ))}

          <p className="text-slate-400 text-center mt-1.5" style={{ fontSize: 11 }}>{T.footnote}</p>
        </div>
      );
    }
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
          <h2 className="font-bold text-[15px] text-slate-800">🧭 {T.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </button>
        <div className="mt-0.5">
          <MonthPillNav monthCursor={monthCursor} BN_MONTHS={BN_MONTHS} toBn={toBn} onShift={onShiftMonth} />
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
