// reviewTrend.js — "গত তিন মাসের চিত্র" কার্ডের হিসাব। Pure (Firebase/UI/অ্যাপ-হেল্পার import ছাড়া)।
// অ্যাপের হিসাব-ফাংশনগুলো h হিসেবে ঢোকানো হয়, তাই Node-এ সরাসরি টেস্ট করা যায়। কোনো .limit() নেই।
// তিন মাস = নির্বাচিত মাস + আগের দুই মাস। কাস্টম লেবেল (isCustom) বাদ। সব শতাংশ পূর্ণসংখ্যা।
import { MIN_DAYS, elapsedDays, prevMonthOf } from "./reviewMonthly.js";

const TREND_DELTA = 10; // শেষ আর প্রথম বৈধ মাসের ফারাক (পয়েন্ট) — ↑/↓ এর সীমা
const ATTENTION_BELOW = 40; // শেষ মাস এর নিচে হলে "মনোযোগ"
const MAX_ATTENTION = 3;
const STEADY_GREAT = 85; // ক্যালেন্ডারের "চমৎকার" সীমার সাথে একই

// যে ফিল্ডে কম মান = ভালো (কাযা): পিল-এ আসল % দেখায়, কিন্তু রং/তীর/মনোযোগ "ভালো-দিক" (g = ১০০ − %) ধরে।
const INVERTED = new Set(["fardPrayers"]);
const gOf = v => (v && v.g !== undefined ? v.g : v.pct);

const pad2 = n => String(n).padStart(2, "0");
const labelOf = f => ((f.shortLabel ? String(f.shortLabel).trim() : "") || f.label || f.key);

// ক্যালেন্ডারের scoreColor-এর সীমা (০.৮৫ / ০.৬ / ০.৩৫) হুবহু; raw = ০..১ অকাট (rounding-এর আগে)।
function tierOf(raw) {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return "none";
  if (raw >= 0.85) return "great";
  if (raw >= 0.6) return "good";
  if (raw >= 0.35) return "mid";
  return "low";
}

// তিনটা মাস, পুরনো → নতুন: [{ year, month0 }, ...]
function threeMonths(year, month0) {
  const p1 = prevMonthOf(year, month0);
  const p2 = prevMonthOf(p1.year, p1.month0);
  return [p2, p1, { year, month0 }];
}

// একটা ফিল্ডের একটা মাসের গড়: ওজরের দিন ও এন্ট্রিহীন দিন বাদ; ৩ দিনের কম হলে null।
function monthValue(entries, upTo, f, h) {
  if (!entries || upTo <= 0) return null;
  const ex = h.isFieldExcusable(f, h.member);
  let logged = 0, sum = 0;
  for (let d = 1; d <= upTo; d++) {
    const e = entries[pad2(d)];
    if (!e) continue;
    if (ex && h.isExcused(e, f.key)) continue;
    const r = h.ratioOf(f, e);
    if (r === null || r === undefined || !Number.isFinite(r)) continue;
    logged += 1; sum += r;
  }
  if (logged < MIN_DAYS) return null;
  const raw = sum / logged; // ratioOf ইতিমধ্যে ভালো-দিকে (কাযা-মুক্ত স্কোর)
  const g = Math.round(raw * 100);
  if (INVERTED.has(f.key)) return { pct: 100 - g, g, tier: tierOf(raw), days: logged };
  return { pct: g, tier: tierOf(raw), days: logged };
}

// vals: [ {pct}|null ×৩ ] ⇒ ধারা ও মন্তব্যের ধরন। কমপক্ষে ২ বৈধ মাস না থাকলে dir = null, kind = "few"।
function trendOf(vals) {
  const valid = vals.filter(Boolean);
  if (valid.length < 2) return { dir: null, delta: null, kind: "few", from: valid[0] || null, to: valid[0] || null };
  const first = valid[0], last = valid[valid.length - 1];
  const delta = gOf(last) - gOf(first);
  const dir = delta >= TREND_DELTA ? "up" : delta <= -TREND_DELTA ? "down" : "flat";
  const strictUp = valid.length === 3 && gOf(valid[0]) < gOf(valid[1]) && gOf(valid[1]) < gOf(valid[2]);
  const strictDown = valid.length === 3 && gOf(valid[0]) > gOf(valid[1]) && gOf(valid[1]) > gOf(valid[2]);
  let kind;
  if (dir === "up") kind = strictUp ? "rising" : "risingSome";
  else if (dir === "down") kind = strictDown ? "falling" : "fallingSome";
  else kind = valid.every(v => gOf(v) >= STEADY_GREAT) ? "steadyGreat" : "steady";
  return { dir, delta, kind, from: first, to: last };
}

// সব আমল মিলিয়ে একটা মাসের গড়: প্রতিদিনের dailyScore-এর গড় (মাসিক ওভারভিউয়ের হিসাবের সাথে একই উৎস)।
// ৩ দিনের কম এন্ট্রি হলে null। h.dailyScoreOf না থাকলে null — তখন UI এই অংশ দেখায় না।
function monthOverall(entries, upTo, h) {
  if (!entries || upTo <= 0 || typeof h.dailyScoreOf !== "function") return null;
  let logged = 0, sum = 0;
  for (let d = 1; d <= upTo; d++) {
    const e = entries[pad2(d)];
    if (!e) continue;
    const s = h.dailyScoreOf(e);
    if (s === null || s === undefined || !Number.isFinite(s)) continue;
    logged += 1; sum += s;
  }
  if (logged < MIN_DAYS) return null;
  const raw = sum / logged;
  return { pct: Math.round(raw * 100), tier: tierOf(raw), days: logged };
}

// h = { member, allFields, fieldApplies, isExcused, isFieldExcusable, ratioOf, dailyScoreOf? }
// entriesByMonth: তিনটা ম্যাপ (পুরনো → নতুন) বা null (না পাওয়া/ব্যর্থ ⇒ ওই মাস "—")
// groups: [{ id, label, keys:[...] }] — যে ফিল্ড কোনো গ্রুপে নেই সে শেষ গ্রুপে যায়।
function buildTrend({ year, month0, now, entriesByMonth, h, groups }) {
  const months = threeMonths(year, month0);
  const upTo = months.map(m => elapsedDays(m.year, m.month0, now));
  const fields = h.allFields.filter(f => f && f.key && !f.isCustom && h.fieldApplies(f, h.member));
  const order = (groups || []);
  const lastIdx = Math.max(0, order.length - 1);
  const groupIdx = f => {
    const i = order.findIndex(g => g.keys.includes(f.key));
    return i >= 0 ? i : lastIdx;
  };

  const rows = [];
  for (const f of fields) {
    const vals = months.map((m, i) => monthValue(entriesByMonth ? entriesByMonth[i] : null, upTo[i], f, h));
    if (!vals.some(Boolean)) continue; // তিন মাসেই ডেটা নেই ⇒ সারি নেই
    rows.push({ key: f.key, label: labelOf(f), group: groupIdx(f), vals, ...trendOf(vals) });
  }

  const sections = order
    .map((g, i) => ({ id: g.id, label: g.label, rows: rows.filter(r => r.group === i) }))
    .filter(s => s.rows.length);

  // সবচেয়ে উন্নতি: ↑ সারির মধ্যে সর্বোচ্চ ফারাক; সমান হলে তালিকার আগের সারি।
  let best = null;
  for (const r of rows) if (r.dir === "up" && (!best || r.delta > best.delta)) best = r;

  // মনোযোগ: ↓ ধারা অথবা শেষ (নির্বাচিত) মাস ৪০%-এর নিচে। শেষ মাসের মান কম আগে; সর্বোচ্চ ৩।
  const cur = r => (r.vals[2] ? gOf(r.vals[2]) : null);
  const attentionAll = rows
    .filter(r => r.dir === "down" || (cur(r) !== null && cur(r) < ATTENTION_BELOW))
    .sort((a, b) => (cur(a) === null ? 101 : cur(a)) - (cur(b) === null ? 101 : cur(b)));
  const attention = attentionAll.slice(0, MAX_ATTENTION);
  const upCount = rows.filter(r => r.dir === "up").length;

  // নির্বাচিত মাসে এখনো কোনো সারির মান নেই (যেমন মাস সবে শুরু) ⇒ UI ছোট ব্যাখ্যা দেখায়।
  const curEmpty = rows.length > 0 && rows.every(r => r.vals[2] === null);

  // সব আমল মিলিয়ে তিন মাসের গড় ও ধারা (দুই মাসের বৈধ তথ্য না থাকলে overall = null)
  const oVals = months.map((m, i) => monthOverall(entriesByMonth ? entriesByMonth[i] : null, upTo[i], h));
  const overall = oVals.filter(Boolean).length >= 2 ? { vals: oVals, ...trendOf(oVals) } : null;

  return { ok: rows.length > 0, overall, months, sections, best, attention, attentionCount: attentionAll.length, upCount, curEmpty, rowCount: rows.length };
}

export { TREND_DELTA, ATTENTION_BELOW, MAX_ATTENTION, tierOf, threeMonths, monthValue, trendOf, buildTrend };
