// reviewCalc.js — মাসিক রিপোর্টের হিসাব। Pure, Firebase/UI ছাড়া। aggregation-এ কোনো limit নেই।
// সংখ্যা সবসময় পূর্ণসংখ্যা (Math.round); float শতাংশ সংরক্ষণ বা তুলনা হয় না।

// scores: [{ date:'YYYY-MM-DD', score:number(0-100) }] ⇒ weekday(0=রবি..6=শনি) অনুযায়ী গড়।
// কোনো বারে ২টির কম নমুনা থাকলে সেই বারের avg = null (অপর্যাপ্ত ডেটা)।
function weekdayAverages(scores) {
  const sum = [0, 0, 0, 0, 0, 0, 0];
  const cnt = [0, 0, 0, 0, 0, 0, 0];
  for (const s of scores || []) {
    if (!s || typeof s.score !== "number" || !Number.isFinite(s.score)) continue;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s.date));
    if (!m) continue;
    const wd = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
    sum[wd] += s.score;
    cnt[wd] += 1;
  }
  return sum.map((t, i) => ({ weekday: i, count: cnt[i], avg: cnt[i] >= 2 ? Math.round(t / cnt[i]) : null }));
}

// সবচেয়ে কম গড়ের n বার, তবে শুধু যেগুলো সব-বারের মোট গড়ের চেয়ে কম। সমান হলে ছোট weekday আগে।
function weakestWeekdays(avgs, n = 2) {
  const valid = avgs.filter(a => a.avg !== null);
  if (valid.length < 2) return [];
  const mean = valid.reduce((t, a) => t + a.avg, 0) / valid.length;
  return valid
    .filter(a => a.avg < mean)
    .sort((a, b) => a.avg - b.avg || a.weekday - b.weekday)
    .slice(0, n)
    .map(a => a.weekday);
}

// items: [{ key, prev:number, cur:number }] (যেমন দিনসংখ্যা)। সর্বোচ্চ উন্নতি ও সর্বোচ্চ পতন।
// delta সমান হলে key বর্ণানুক্রমে আগে। কিছু না থাকলে null।
function bestImprovementAndDrop(items) {
  const rows = (items || [])
    .filter(i => i && typeof i.prev === "number" && typeof i.cur === "number")
    .map(i => ({ key: i.key, prev: i.prev, cur: i.cur, delta: i.cur - i.prev }));
  const cmpKey = (a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const ups = rows.filter(r => r.delta > 0).sort((a, b) => b.delta - a.delta || cmpKey(a, b));
  const downs = rows.filter(r => r.delta < 0).sort((a, b) => a.delta - b.delta || cmpKey(a, b));
  return { improvement: ups[0] || null, drop: downs[0] || null };
}

// results: ['done'|'partial'|'none'|null...] — অজানা/null গোনা হয় না।
function goalSuccess(results) {
  const c = { done: 0, partial: 0, none: 0, total: 0 };
  for (const r of results || []) {
    if (r === "done" || r === "partial" || r === "none") { c[r] += 1; c.total += 1; }
  }
  return c;
}

// আগের মাসের তুলনা: পয়েন্ট পার্থক্য (পূর্ণসংখ্যা)। কোনো একটা null হলে null।
function monthDelta(prevPct, curPct) {
  if (!Number.isFinite(prevPct) || !Number.isFinite(curPct)) return null;
  return Math.round(curPct) - Math.round(prevPct);
}

export { weekdayAverages, weakestWeekdays, bestImprovementAndDrop, goalSuccess, monthDelta };
