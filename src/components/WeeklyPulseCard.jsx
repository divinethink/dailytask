// "এ সপ্তাহের ফোকাস" কার্ড (হোম) — সপ্তাহের লক্ষ্য ও ফোকাস-আমল প্রতিদিন নতুন করে দেখায়।
// ডেটা: গত সপ্তাহের মুহাসাবা (লক্ষ্য, ঘাটতি-আমল, "যদি…তাহলে…") + নিজের এন্ট্রি। কিছু লেখে না; নতুন schema নেই।
// মুহাসাবা না থাকলে/পড়া না গেলে এ সপ্তাহের এন্ট্রি থেকে সবচেয়ে বেশি ছুটে যাওয়া আমল দেখায়।
// শুধু নিজের সদস্যে (locked হলে লুকানো)। React global (window.React)।
import { REVIEW_TEXT } from "../legacy/reviewText.js";
import { chunkOfDate, chunkRange, chunkWeekKey, prevChunk } from "../legacy/reviewSchema.js";
import { loadReview } from "../legacy/reviewData.js";
import { loadMonthEntriesOnce } from "../legacy/monthEntriesOnce.js";
import { weeklyGap } from "../legacy/reviewCalc.js";
import { fieldRatioToday } from "../legacy/dailyInsight.js";
import { buildWeekPulse, lineKind, pickVariant, gapRepeat, clip } from "../legacy/weekPulse.js";
import { fill } from "../legacy/reviewMonthly.js";
import { pad2 } from "../legacy/appHelpers.js";

const T = REVIEW_TEXT.pulse;
const { useState, useEffect, useMemo } = React;
const DAY_MS = 86400000;
const CELL = {
  full: { background: "#2F9E44", color: "#fff" },
  part: { background: "#FBEFC4", color: "#7A5A00" },
  miss: { background: "#F6E3D6", color: "#9B5A2E" },
  empty: { background: "#EEF2EF", color: "#9AA8A0" },
  excused: { background: "#E8F0EE", color: "#5B6B64" },
  pending: { background: "#fff", color: "#0E4B43" },
  future: { background: "#F6F7F5", color: "#C9D6CE" }
};

export function WeeklyPulseCard({ migrationState, memberId, member, locked, liveMonth, liveEntries, allFields, fieldApplies, isExcused, isFieldExcusable, toBn }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 60000); return () => clearInterval(t); }, []);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cw = chunkOfDate(now);
  const range = chunkRange(cw.year, cw.month0, cw.week);
  const weekStart = new Date(cw.year, cw.month0, range.start);
  const weekKey = chunkWeekKey(cw.year, cw.month0, cw.week);
  const todayIdx = Math.round((todayStart - weekStart) / DAY_MS);
  const canRead = !locked && !!memberId && migrationState === "v2";

  // পরিকল্পনা: গত সপ্তাহের মুহাসাবা (লক্ষ্য/ঘাটতি/যদি-তাহলে) + এ সপ্তাহেরটা সম্পন্ন কিনা। পড়া ব্যর্থ হলে null।
  const [plan, setPlan] = useState({ key: "", prevs: [], cur: null });
  const planKey = memberId + "|" + weekKey;
  useEffect(() => {
    if (!canRead) return undefined;
    let alive = true;
    // গত ৩ সপ্তাহ (বারবার আসা ঘাটতি দেখতে) + এ সপ্তাহ; প্রতিটা id ধরে get, ব্যর্থ হলে null
    const keys = [];
    let p = { year: cw.year, month0: cw.month0, week: cw.week };
    for (let i = 0; i < 3; i++) { p = prevChunk(p.year, p.month0, p.week); keys.push(chunkWeekKey(p.year, p.month0, p.week)); }
    Promise.all([...keys, weekKey].map(k => loadReview(migrationState, memberId, k).catch(() => null)))
      .then(rows => { if (alive) setPlan({ key: planKey, prevs: rows.slice(0, 3), cur: rows[3] }); });
    return () => { alive = false; };
  }, [canRead, migrationState, planKey]);

  // অন্য মাসের এন্ট্রি (সপ্তাহ মাস পেরোলে) একবার পড়া; চলতি live মাস মূল live এন্ট্রি থেকে।
  const [others, setOthers] = useState({});
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)), [weekKey]);
  useEffect(() => {
    if (!canRead || !liveMonth) return undefined;
    const need = new Set();
    dates.forEach(d => { if (!(d.getFullYear() === liveMonth.year && d.getMonth() === liveMonth.month0)) need.add(d.getFullYear() + "|" + d.getMonth()); });
    let alive = true;
    need.forEach(k => {
      const ck = memberId + "|" + k;
      const [y, m] = k.split("|").map(Number);
      loadMonthEntriesOnce(migrationState, memberId, y, m)
        .then(e => { if (alive) setOthers(o => ({ ...o, [ck]: e || {} })); })
        .catch(() => { if (alive) setOthers(o => ({ ...o, [ck]: {} })); });
    });
    return () => { alive = false; };
  }, [canRead, migrationState, memberId, weekKey, liveMonth && liveMonth.year, liveMonth && liveMonth.month0]);

  const entryOf = d => {
    const dd = pad2(d.getDate());
    if (liveMonth && d.getFullYear() === liveMonth.year && d.getMonth() === liveMonth.month0) return (liveEntries && liveEntries[dd]) || null;
    const o = others[memberId + "|" + d.getFullYear() + "|" + d.getMonth()];
    return (o && o[dd]) || null;
  };

  const planOk = plan.key === planKey;
  const prev = planOk ? plan.prevs[0] : null;
  const reviewDone = !!(planOk && plan.cur && plan.cur.done);
  const applies = f => !!f.key && fieldApplies(f, member);
  const days = dates.map(d => ({ day: d, entry: entryOf(d) }));

  // ফোকাস-আমল: গত মুহাসাবার ঘাটতি; না থাকলে/আমল না পেলে এ সপ্তাহে এ পর্যন্ত সবচেয়ে বেশি ছুটছে এমন আমল
  const planned = prev && prev.gapKey ? (allFields || []).find(f => f.key === prev.gapKey && applies(f)) : null;
  const fallbackKey = useMemo(() => {
    if (planned || !canRead || todayIdx < 0 || todayIdx > 6) return "";
    const rows = weeklyGap({
      days: days.slice(0, todayIdx + 1), fields: allFields,
      ratioOf: (f, e) => fieldRatioToday(f, e), applies,
      excused: (f, e) => isFieldExcusable(f, member) && isExcused(e, f.key)
    });
    return rows[0] ? rows[0].key : "";
  }, [planned, canRead, todayIdx, liveEntries, others, allFields, member]);
  const focusField = planned || (fallbackKey ? (allFields || []).find(f => f.key === fallbackKey) : null);

  const pulse = useMemo(() => {
    if (!focusField) return null;
    return buildWeekPulse({
      days, todayIdx,
      ratioOf: e => fieldRatioToday(focusField, e),
      excusedOf: e => isFieldExcusable(focusField, member) && isExcused(e, focusField.key)
    });
  }, [focusField && focusField.key, todayIdx, liveEntries, others, member, tick]);

  if (locked) return null; // সব hook-এর পরে
  const repeat = planned && planOk ? gapRepeat(plan.prevs, planned.key) : { weeks: 0, reason: "" };
  const reasonText = (REVIEW_TEXT.gap.reasons.find(x => x.id === repeat.reason) || {}).t || "";
  const goal = prev && prev.nextGoal ? prev.nextGoal : "";
  if (!goal && !pulse) return null;

  const name = focusField ? (focusField.shortLabel || focusField.label) : "";
  const vars = pulse ? { focus: name, full: toBn(pulse.full), counted: toBn(pulse.counted), left: toBn(pulse.left) } : {};
  const kind = pulse ? lineKind(pulse, reviewDone) : "";
  const pool = kind ? T.lines[kind] : null;
  const line = pool ? fill(pool[pickVariant(pool.length, weekKey, todayIdx)], vars) : "";
  const showPlan = !!(planned && prev.ifText && prev.thenText) && (kind === "plan" || kind === "push" || kind === "slip");
  const showMoment = !!(planned && prev.hardMoment) && kind === "mid";

  return (
    <div className="mt-5 p-4 rounded-2xl bg-white shadow-sm" style={{ border: "1px solid #EADFBE" }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-[15px] text-slate-800">🌿 {T.title}</h2>
        {pulse && pulse.streak >= 2 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FBEFC4", color: "#7A5A00" }}>{fill(T.streak, { n: toBn(pulse.streak) })}</span>}
      </div>
      {goal && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-sm font-semibold mt-2">
          <span className="text-[11px] font-bold text-amber-800 block">{T.goalLabel}</span>“{clip(goal, 200)}”
        </p>
      )}
      {pulse && (
        <div className="mt-3">
          <div className="text-xs text-slate-600 mb-1.5">
            <b>{fill(planned ? T.focusLine : T.fallbackLine, { focus: name })}</b>
            {pulse.counted > 0 && <span> · {fill(T.progress, { counted: toBn(pulse.counted), full: toBn(pulse.full) })}</span>}
          </div>
          {repeat.weeks >= 2 && (
            <p className="text-xs rounded-lg p-2 mb-2" style={{ background: "#FFF6EC", color: "#7C3A10" }}>
              {fill(T.repeatLine, { n: toBn(repeat.weeks) })}{reasonText ? " " + fill(T.reasonLine, { reason: reasonText }) + "।" : ""}
            </p>
          )}
          <div className="grid grid-cols-7 gap-1.5" role="img" aria-label={T.title}>
            {pulse.cells.map((c, i) => (
              <div key={i} className="text-center">
                <div className="rounded-lg flex items-center justify-center font-bold" style={{ ...CELL[c.state], height: 34, fontSize: 15, border: c.isToday ? "2px solid #C89B3C" : "1px solid transparent" }}>{T.cellMark[c.state]}</div>
                <div className="text-slate-500 mt-0.5" style={{ fontSize: 11 }}>{T.weekdaysShort[dates[i].getDay()]}</div>
              </div>
            ))}
          </div>
          {line && <p className="text-sm text-slate-700 leading-relaxed mt-2.5">{line}</p>}
          {showPlan && <p className="text-xs rounded-lg p-2 mt-2" style={{ background: "#F1F6F2", color: "#0E4B43" }}>{fill(T.planLine, { ifText: clip(prev.ifText, 120), thenText: clip(prev.thenText, 120) })}</p>}
          {showMoment && <p className="text-xs rounded-lg p-2 mt-2" style={{ background: "#FFF6EC", color: "#7C3A10" }}>{fill(T.momentLine, { moment: clip(prev.hardMoment, 100) })}</p>}
        </div>
      )}
    </div>
  );
}
