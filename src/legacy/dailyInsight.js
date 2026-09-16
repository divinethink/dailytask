// §Motivational Layer — Phase 1: dailyInsight("আজকের বিশেষ দিক")
// -----------------------------------------------------------------------------
// Owner-approved plan(চ্যাট আলোচনা): একটি মাত্র rotating card, প্রতিদিন
// data-driven smart-selection দিয়ে একটি insight দেখাবে। এই ফাইল pure logic —
// কোনো React/JSX/Firestore-write নেই, শুধু আগে থেকেই Dashboard-এ loaded
// monthEntries(চলতি মাস, day-of-month keyed)/selectedMember/allFields/streak
// ব্যবহার করে — তাই নতুন কোনো Firestore read/listener/schema লাগেনি(Phase 1
// scope, "Family Highlight" ও "Weekly Story" ইচ্ছাকৃতভাবে এই ধাপে বাদ — যথাক্রমে
// নতুন cross-member read ও month-boundary জটিলতা লাগে, পরের ছোট increment)।
//
// দুই দিন পরপর একই ধরনের insight দেখানো এড়াতে(spec §৫) sessionStorage-এর বদলে
// localStorage ব্যবহার হয়েছে(পরদিন পর্যন্ত মনে রাখতে হবে) — শুধু UX-polish,
// কোনো authorization/security-critical data না, তাই sync/Firestore লাগেনি।

import { fieldApplies, isExcused, isFieldExcusable, dailyScore, pad2 } from "./appHelpers.js";

const MILESTONES = [7, 30, 100, 365];

// dailyScore()(appHelpers.js)-এর ভেতরের per-field math-ই হুবহু, কিন্তু এখানে
// single-field ratio(0..1) দরকার(dailyScore() পুরো aggregate করে দেয়) — তাই
// existing tested dailyScore() স্পর্শ না করে ছোট, independent helper রাখা হলো
// (Owner Rule 1: existing/প্রমাণিত ফাংশন অপরিবর্তিত রাখা)।
function fieldRatioToday(field, entry) {
  if (!entry) return null;
  if (field.type === "bool") return entry[field.key] ? 1 : 0;
  if (field.type === "count") {
    const capped = Math.min(field.max, Number(entry[field.key]) || 0);
    return field.key === "fardPrayers" ? (field.max - capped) / field.max : capped / field.max;
  }
  if (field.type === "number") {
    if (field.target) return Math.min(field.target, Number(entry[field.key]) || 0) / field.target;
    return Number(entry[field.key]) > 0 ? 1 : 0;
  }
  return null;
}

function applicableFieldsToday(todayEntry, member, allFields) {
  return allFields
    .filter(f => fieldApplies(f, member) && !(isFieldExcusable(f, member) && isExcused(todayEntry, f.key)))
    .map(f => ({ field: f, ratio: fieldRatioToday(f, todayEntry) }))
    .filter(x => x.ratio !== null);
}

// ১) নতুন Streak-milestone(আজ hit হয়েছে, অথবা আগামীকাল hit হবে)
function candidateNearMilestone(streak) {
  if (!streak || streak <= 0) return null;
  if (MILESTONES.includes(streak)) return { type: "milestoneHit", streak };
  const next = MILESTONES.find(m => m > streak);
  if (next && next - streak === 1) return { type: "nearMilestone", streak, next };
  return null;
}

// ২) এই মাসে এ পর্যন্ত সেরা দিন(সততার সাথে scope-সীমিত — শুধু চলতি মাসের
// cached data থেকে, তাই "Personal Best"(সর্বকালের) না বলে "মাসের সেরা দিন"
// বলা হচ্ছে — ভুল claim এড়াতে)
function candidateBestDaySoFar(monthEntries, member, allFields, todayNum) {
  if (todayNum <= 1) return null;
  const todayEntry = monthEntries[pad2(todayNum)];
  const todayScore = dailyScore(todayEntry, member, allFields);
  if (todayScore === null) return null;
  let prevBest = null;
  for (let d = 1; d < todayNum; d++) {
    const e = monthEntries[pad2(d)];
    if (!e) continue;
    const s = dailyScore(e, member, allFields);
    if (s === null) continue;
    if (prevBest === null || s > prevBest) prevBest = s;
  }
  if (prevBest === null || todayScore <= prevBest) return null;
  return { type: "bestDay", todayPct: Math.round(todayScore * 100), prevPct: Math.round(prevBest * 100) };
}

// ৩) সবচেয়ে বেশি উন্নতি(আজ vs এই মাসে এখন পর্যন্ত সেই field-এর গড়, অন্তত ৩
// দিনের history থাকলেই তুলনা অর্থবহ ধরা হয়েছে, +৩০ পার্সেন্টেজ-পয়েন্ট threshold)
function candidateMostImproved(monthEntries, member, allFields, todayNum) {
  const todayEntry = monthEntries[pad2(todayNum)];
  if (!todayEntry) return null;
  let best = null;
  for (const f of allFields) {
    if (!fieldApplies(f, member)) continue;
    if (isFieldExcusable(f, member) && isExcused(todayEntry, f.key)) continue;
    const todayRatio = fieldRatioToday(f, todayEntry);
    if (todayRatio === null) continue;
    let sum = 0, count = 0;
    for (let d = 1; d < todayNum; d++) {
      const e = monthEntries[pad2(d)];
      if (!e) continue;
      if (isFieldExcusable(f, member) && isExcused(e, f.key)) continue;
      const r = fieldRatioToday(f, e);
      if (r === null) continue;
      sum += r; count += 1;
    }
    if (count < 3) continue;
    const avg = sum / count;
    const diff = todayRatio - avg;
    if (diff >= 0.30 && (!best || diff > best.diff)) {
      best = {
        type: "mostImproved",
        field: f,
        diff,
        avgPct: Math.round(avg * 100),
        todayPct: Math.round(todayRatio * 100)
      };
    }
  }
  return best;
}

// ৪) Comeback — গতকাল দুর্বল ছিল(<৪০%), আজ বড় লাফ(+৩০ পয়েন্ট বা বেশি)
function candidateComeback(monthEntries, member, allFields, todayNum) {
  if (todayNum <= 1) return null;
  const todayEntry = monthEntries[pad2(todayNum)];
  const yEntry = monthEntries[pad2(todayNum - 1)];
  const todayScore = dailyScore(todayEntry, member, allFields);
  const yScore = dailyScore(yEntry, member, allFields);
  if (todayScore === null || yScore === null) return null;
  if (yScore < 0.40 && todayScore - yScore >= 0.30) {
    return { type: "comeback", yesterdayPct: Math.round(yScore * 100), todayPct: Math.round(todayScore * 100) };
  }
  return null;
}

// ৫) আজকের সেরা ৩(অন্তত ১টা fully-done না থাকলে "সেরা" অর্থহীন)
function candidateTop3(list) {
  if (list.length < 3) return null;
  const sorted = [...list].sort((a, b) => b.ratio - a.ratio);
  if (sorted[0].ratio < 0.99) return null;
  return {
    type: "top3",
    items: sorted.slice(0, 3).map(x => ({ label: x.field.shortLabel || x.field.label, pct: Math.round(x.ratio * 100) }))
  };
}

// ৬) আজকের ৩টি দুর্বল জায়গা(fallback — সবকিছু মোটামুটি ভালো হলে দেখানো হবে না)
function candidateBottom3(list) {
  if (list.length < 3) return null;
  const sorted = [...list].sort((a, b) => a.ratio - b.ratio);
  if (sorted[0].ratio > 0.5) return null;
  return {
    type: "bottom3",
    items: sorted.slice(0, 3).map(x => ({ label: x.field.shortLabel || x.field.label, pct: Math.round(x.ratio * 100) }))
  };
}

// পরপর দুইদিন হুবহু একই variant-type এড়ানো(spec §৫) + একই দিনের ভিতরে
// re-render-এ flip-flop না করা(একবার সিলেক্ট হলে সেই দিনের জন্য স্থির থাকে,
// শুধু ভিতরের সংখ্যা fresh data দিয়ে আপডেট হয়)। localStorage না থাকলে(private
// browsing ইত্যাদি) silently fallback করে প্রথম candidate-ই দেখাবে।
function pickWithAntiRepeat(candidates, memberId, todayKey) {
  const storageKey = `dt_daily_insight_last_${memberId}`;
  let last = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) last = JSON.parse(raw);
  } catch (e) { /* ignore — non-critical UX-polish state */ }

  let chosen = candidates[0];
  if (last && last.date === todayKey) {
    chosen = candidates.find(c => c.type === last.type) || candidates[0];
  } else if (last && last.type === candidates[0].type && candidates.length > 1) {
    chosen = candidates[1];
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify({ date: todayKey, type: chosen.type }));
  } catch (e) { /* ignore */ }

  return chosen;
}

// প্রধান entry-point। App()-এ StreakCard-এর ঠিক পরে, TopBottomActivityRanking-এর
// আগে বসানোর জন্য ডিজাইন করা(spec §২-এর "আজকের অবস্থান → আজকের বিশেষ দিক" ক্রম,
// StreakCard-ই বর্তমান app-এ "আজকের অবস্থান"-এর সমতুল্য)।
export function selectDailyInsight({ monthEntries, member, allFields, cursorYear, cursorMonth0, streak }) {
  if (!member) return null;
  const now = new Date();
  // StreakCard(DashboardSections.jsx)-এর একই "isCurrentMonth" pattern reuse —
  // monthEntries শুধু চলতি viewCursor-এর মাস ধরে, তাই owner অন্য মাস browse
  // করলে("আজ" real actual month-এর বাইরে) কার্ড দেখানো হবে না।
  if (now.getFullYear() !== cursorYear || now.getMonth() !== cursorMonth0) return null;
  const todayNum = now.getDate();
  const todayEntry = monthEntries[pad2(todayNum)];
  if (!todayEntry) return null; // আজ এখনো কিছুই সেভ হয়নি — দেখানোর কিছু নেই

  const list = applicableFieldsToday(todayEntry, member, allFields);
  const candidates = [
    candidateNearMilestone(streak),
    candidateBestDaySoFar(monthEntries, member, allFields, todayNum),
    candidateMostImproved(monthEntries, member, allFields, todayNum),
    candidateComeback(monthEntries, member, allFields, todayNum),
    candidateTop3(list),
    candidateBottom3(list)
  ].filter(Boolean);

  if (candidates.length === 0) return null;
  const todayKey = `${cursorYear}-${cursorMonth0}-${todayNum}`;
  return pickWithAntiRepeat(candidates, member.id, todayKey);
}
