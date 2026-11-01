// reviewMonthly.js — মাসিক মুহাসাবা রিপোর্টের হিসাব। Pure (Firebase/UI/অ্যাপ-হেল্পার import ছাড়া)।
// অ্যাপের হিসাব-ফাংশনগুলো h (helpers) হিসেবে ঢোকানো হয়, তাই Node-এ সরাসরি টেস্ট করা যায়।
// সব সংখ্যা পূর্ণসংখ্যা; কোনো .limit() নেই। চলতি মাস চলমান হলে আগের মাসের সাথে একই দিন-সংখ্যার তুলনা হয়।
import { chunkCount, chunkRange } from "./reviewSchema.js";
import { weekdayAverages, weakestWeekdays, bestImprovementAndDrop, goalSuccess, monthDelta, weeklyGap } from "./reviewCalc.js";

const MIN_DAYS = 3; // এর কম দিনের ডেটায় কোনো সিদ্ধান্তমূলক হিসাব দেখানো হয় না
const SLEEP_KEY = "phoneOffBy11";
const GOAL_VALUES = ["done", "partial", "none"];

const pad2 = n => String(n).padStart(2, "0");
const daysIn = (y, m0) => new Date(y, m0 + 1, 0).getDate();
const labelOf = f => ((f.shortLabel ? String(f.shortLabel).trim() : "") || f.label || f.key);

function prevMonthOf(year, month0) {
  return month0 === 0 ? { year: year - 1, month0: 11 } : { year, month0: month0 - 1 };
}

// মাসের কত দিন পেরিয়েছে: ভবিষ্যৎ মাস ⇒ 0, চলতি মাস ⇒ আজকের তারিখ, অতীত মাস ⇒ পুরো মাস।
function elapsedDays(year, month0, now) {
  const total = daysIn(year, month0);
  const cur = now.getFullYear() * 12 + now.getMonth();
  const asked = year * 12 + month0;
  if (asked > cur) return 0;
  if (asked === cur) return Math.min(now.getDate(), total);
  return total;
}

function fill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
}

// entries: { "01": entry, ... } ⇒ [{ day, score(0..1) }] (এন্ট্রি ও স্কোর আছে এমন দিন, 1..upTo)
function dayScores(entries, upTo, h, fields) {
  const out = [];
  for (let d = 1; d <= upTo; d++) {
    const e = entries ? entries[pad2(d)] : null;
    if (!e) continue;
    const s = h.dailyScore(e, h.member, fields || h.allFields);
    if (s === null || s === undefined || !Number.isFinite(s)) continue;
    out.push({ day: d, score: s });
  }
  return out;
}
const avgPct = rows => (rows.length ? Math.round((rows.reduce((t, r) => t + r.score, 0) / rows.length) * 100) : null);

// একটা ফিল্ডে "পুরো সম্পন্ন" (ratio ≥ 1) দিনের সংখ্যা। ওজরের দিন গণনার বাইরে, তবে সংখ্যাটা excused-এ ফেরত যায়।
function fullDays(entries, upTo, f, h) {
  let n = 0, logged = 0, excused = 0;
  const ex = h.isFieldExcusable(f, h.member);
  for (let d = 1; d <= upTo; d++) {
    const e = entries ? entries[pad2(d)] : null;
    if (!e) continue;
    if (ex && h.isExcused(e, f.key)) { excused += 1; continue; }
    const r = h.ratioOf(f, e);
    if (r === null || r === undefined || !Number.isFinite(r)) continue;
    logged += 1;
    if (r >= 1) n += 1;
  }
  return { n, logged, excused };
}

// h = { member, allFields, fieldApplies, isExcused, isFieldExcusable, dailyScore, ratioOf }
// prevEntries: আগের মাসের এন্ট্রি-ম্যাপ, না পাওয়া গেলে null (তখন তুলনা বাদ, বাকিটা চলে)।
function buildMonthlyReport({ year, month0, now, curEntries, prevEntries, h }) {
  const total = daysIn(year, month0);
  const elapsed = elapsedDays(year, month0, now);
  const partial = elapsed < total;
  const rows = dayScores(curEntries, elapsed, h);
  if (rows.length < MIN_DAYS) return { ok: false, filled: rows.length, elapsed, total };

  const p = prevMonthOf(year, month0);
  const prevTotal = daysIn(p.year, p.month0);
  const cmp = Math.min(elapsed, prevTotal); // একই দিন-সংখ্যার জানালা (চলমান মাসে ন্যায্য তুলনার জন্য)
  const applicable = h.allFields.filter(f => f.key && h.fieldApplies(f, h.member));

  const avg = avgPct(rows);
  let prev = null;
  if (prevEntries) {
    const prevRows = dayScores(prevEntries, partial ? cmp : prevTotal, h);
    if (prevRows.length >= MIN_DAYS) prev = { year: p.year, month0: p.month0, avg: avgPct(prevRows), filled: prevRows.length };
  }
  const delta = prev ? monthDelta(prev.avg, avg) : null;

  // সপ্তাহ ধরে গড় (শুধু শুরু হয়ে যাওয়া সপ্তাহ)
  const weeks = [];
  for (let w = 1; w <= chunkCount(year, month0); w++) {
    const r = chunkRange(year, month0, w);
    if (r.start > elapsed) break;
    const wr = rows.filter(x => x.day >= r.start && x.day <= r.end);
    weeks.push({ week: w, count: wr.length, avg: wr.length ? avgPct(wr) : null });
  }
  while (weeks.length && weeks[weeks.length - 1].avg === null) weeks.pop(); // শেষের ফাঁকা সপ্তাহ নয় (মাঝের ফাঁক থাকে)

  // বার অনুযায়ী গড়
  const scores = rows.map(r => ({ date: `${year}-${pad2(month0 + 1)}-${pad2(r.day)}`, score: Math.round(r.score * 100) }));
  const weekdays = weekdayAverages(scores);
  const weekdayValid = weekdays.filter(a => a.avg !== null).length;
  const weakest = weekdayValid >= 3 ? weakestWeekdays(weekdays, 2) : [];

  // উন্নতি/পতন: দুই মাসের "পুরো সম্পন্ন" দিন। ওজর থাকলে বা ডেটা কম হলে সেই ফিল্ড বাদ (অন্যায্য তুলনা এড়াতে)।
  let moves = { improvement: null, drop: null };
  if (prevEntries) {
    const items = [];
    for (const f of applicable) {
      const a = fullDays(curEntries, cmp, f, h);
      const b = fullDays(prevEntries, cmp, f, h);
      if (a.excused || b.excused || a.logged < MIN_DAYS || b.logged < MIN_DAYS) continue;
      items.push({ key: f.key, prev: b.n, cur: a.n });
    }
    const r = bestImprovementAndDrop(items);
    const withLabel = x => (x ? { ...x, label: labelOf(applicable.find(f => f.key === x.key)) } : null);
    moves = { improvement: withLabel(r.improvement), drop: withLabel(r.drop) };
  }

  // "কখন ভালো থাকেন": ঘুমের আগে ফোন-বন্ধের দিন বনাম অন্য দিন, ওই ফিল্ড বাদ দিয়ে বাকি আমলের স্কোর।
  // সম্পর্ক মাত্র, কারণ নয়। দুই দলেই ≥৩ দিন ও ≥৫ পয়েন্ট পার্থক্য না হলে দেখানো হয় না।
  let whenGood = null;
  const sf = applicable.find(f => f.key === SLEEP_KEY);
  if (sf) {
    const rest = h.allFields.filter(f => f.key !== SLEEP_KEY);
    const yes = [], no = [];
    for (let d = 1; d <= elapsed; d++) {
      const e = curEntries ? curEntries[pad2(d)] : null;
      if (!e) continue;
      const s = h.dailyScore(e, h.member, rest);
      if (s === null || s === undefined || !Number.isFinite(s)) continue;
      (e[SLEEP_KEY] ? yes : no).push({ score: s });
    }
    if (yes.length >= MIN_DAYS && no.length >= MIN_DAYS) {
      const diff = avgPct(yes) - avgPct(no);
      if (diff >= 5) whenGood = { key: sf.key, label: labelOf(sf), diff, yesN: yes.length, noN: no.length };
    }
  }

  // প্রস্তাবের ফলব্যাক: এ মাসে সবচেয়ে বেশি দিন ছুটে যাওয়া আমল
  const gapDays = [];
  for (let d = 1; d <= elapsed; d++) gapDays.push({ day: d, entry: curEntries ? curEntries[pad2(d)] || null : null });
  const gaps = weeklyGap({
    days: gapDays, fields: applicable, ratioOf: h.ratioOf, applies: () => true,
    excused: (f, e) => h.isFieldExcusable(f, h.member) && h.isExcused(e, f.key)
  });
  const topGap = gaps[0] ? { ...gaps[0], label: labelOf(applicable.find(f => f.key === gaps[0].key)) } : null;

  return { ok: true, year, month0, total, elapsed, cmp, partial, filled: rows.length, avg, prev, delta, weeks, weekdays, weekdayValid, weakest, moves, whenGood, topGap };
}

// reviews: [{ weekKey, goalResult }] ⇒ সপ্তাহ-ক্রমে ফল ও গণনা। অজানা মান গোনা হয় না।
function goalSummary(reviews) {
  const seq = (reviews || [])
    .filter(r => r && GOAL_VALUES.includes(r.goalResult))
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : a.weekKey > b.weekKey ? 1 : 0))
    .map(r => r.goalResult);
  return { seq, counts: goalSuccess(seq) };
}

// ডেটা থেকে সর্বোচ্চ ৩টা সিদ্ধান্তের প্রস্তাব: [{ id, text }]। ব্যক্তিগত মুহাসাবার (reviews) কোনো লেখা এখানে ঢোকে না।
// o = { text (reviewText.monthly.decisions), toBn, weekdayNames }
function suggestDecisions(report, o) {
  const out = [];
  if (!report || !report.ok) return out;
  const T = o.text;
  const m = report.moves || {};
  if (m.drop) {
    out.push({ id: "drop", text: report.partial
      ? fill(T.dropPartial, { label: m.drop.label })
      : fill(T.drop, { label: m.drop.label, cur: o.toBn(m.drop.cur), prev: o.toBn(m.drop.prev) }) });
  } else if (report.topGap) {
    out.push({ id: "gap", text: fill(T.gap, { label: report.topGap.label, n: o.toBn(report.topGap.missed) }) });
  }
  if (report.weakest && report.weakest.length) {
    out.push({ id: "weekday", text: fill(T.weekday, { days: report.weakest.map(i => o.weekdayNames[i]).join(" ও ") }) });
  }
  if (m.improvement) out.push({ id: "keep", text: fill(T.keep, { label: m.improvement.label }) });
  return out.slice(0, 3);
}

export { MIN_DAYS, SLEEP_KEY, prevMonthOf, elapsedDays, fill, buildMonthlyReport, goalSummary, suggestDecisions };
