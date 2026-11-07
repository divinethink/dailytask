// reviewGapOverview.js — "সাপ্তাহিক ঘাটতির চিত্র" কার্ডের হিসাব। Pure (Firebase/UI ছাড়া)।
// ইনপুট: নিজের সংরক্ষিত সাপ্তাহিক মুহাসাবা (reviews) — নতুন কোনো ডেটা/schema নেই, শুধু পড়ে সাজানো।
import { chunkCount, chunkRange, chunkWeekKey } from "./reviewSchema.js";

function tally(list) {
  const m = new Map();
  for (const x of list) m.set(x, (m.get(x) || 0) + 1);
  return [...m].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1));
}

// elapsed = মাসের কত দিন পেরিয়েছে (ভবিষ্যতের সপ্তাহ বাদ)। reviews = সেই মাসের সংরক্ষিত ডকের তালিকা।
function buildGapOverview({ year, month0, elapsed, reviews }) {
  const byKey = new Map((reviews || []).map(r => [r.weekKey, r]));
  const weeks = [];
  for (let w = 1; w <= chunkCount(year, month0); w++) {
    const range = chunkRange(year, month0, w);
    if (range.start > elapsed) break;
    const r = byKey.get(chunkWeekKey(year, month0, w)) || null;
    const reasons = r && Array.isArray(r.gapReasons) ? r.gapReasons : [];
    weeks.push({
      week: w, start: range.start, end: range.end,
      hasReview: !!r,
      hasGap: !!(r && (r.gapKey || reasons.length)),
      gapKey: (r && r.gapKey) || "",
      reasons,
      blockers: r && Array.isArray(r.blockers) ? r.blockers : [],
      moment: (r && r.hardMoment) || "",
      goalResult: (r && r.goalResult) || "",
      done: !!(r && r.done)
    });
  }
  const gapWeeks = weeks.filter(x => x.hasGap);
  const topGaps = tally(gapWeeks.filter(x => x.gapKey).map(x => x.gapKey));
  const topReasons = tally(gapWeeks.flatMap(x => x.reasons));
  const goal = { done: 0, partial: 0, none: 0 };
  weeks.forEach(x => { if (goal[x.goalResult] !== undefined) goal[x.goalResult] += 1; });
  return {
    weeks, total: weeks.length,
    filled: weeks.filter(x => x.hasReview).length,
    gapCount: gapWeeks.length,
    topGaps, topReasons, goal,
    recurring: topGaps.filter(g => g.count >= 2).map(g => g.id)
  };
}

export { buildGapOverview };
