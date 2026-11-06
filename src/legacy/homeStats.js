// homeStats.js — হোমের ছোট হিসাব (pure; Firebase/React-মুক্ত, Node-এ টেস্টযোগ্য)।
// app.js-এর App() থেকে সরানো; আচরণ হুবহু আগের মতো। হেল্পার (dateKey, pad2,
// dailyScore, daysInMonth) বাইরে থেকে `h` হিসেবে আসে (reviewMonthly.js-এর মতো)।

// [start..end] দিনের স্কোর-যোগ ও কত দিনে এন্ট্রি আছে।
export function rangeScore(entries, start, end, member, fields, h) {
  let filled = 0;
  let scoreSum = 0;
  for (let d = start; d <= end; d++) {
    const s = h.dailyScore(entries[h.pad2(d)], member, fields);
    if (s !== null) {
      filled += 1;
      scoreSum += s;
    }
  }
  return { filled, scoreSum };
}

const pct = (filled, scoreSum) => (filled ? Math.round((scoreSum / filled) * 100) : 0);

// মাসিক ওভারভিউয়ের সারাংশ: { total, filled, avgPct }
export function monthStatsOf({ entries, year, month0, member, fields }, h) {
  const total = h.daysInMonth(year, month0);
  const { filled, scoreSum } = rangeScore(entries, 1, total, member, fields, h);
  return { total, filled, avgPct: pct(filled, scoreSum) };
}

// গত সপ্তাহের সারাংশ; কোনো দিনের এন্ট্রি না থাকলে null।
export function weekSummaryOf(range, entries, member, fields, h) {
  const { filled, scoreSum } = rangeScore(entries, range.start, range.end, member, fields, h);
  if (filled === 0) return null;
  return { avgPct: pct(filled, scoreSum), filled, totalDays: range.end - range.start + 1 };
}

// "গতকাল" দেখানোর শর্ত: আজকের দিন দেখছি + চলতি মাস + মাসের ২ তারিখ থেকে।
function yesterdayContext({ viewDate, cursor, now }, h) {
  if (h.dateKey(viewDate) !== h.dateKey(now)) return false;
  if (now.getFullYear() !== cursor.year || now.getMonth() !== cursor.month0) return false;
  if (now.getDate() < 2) return false;
  return true;
}

// "গতকালের মতো বসান"-এর উৎস: গতকালের সেভ-করা এন্ট্রি, নইলে null।
export function yesterdayEntryOf({ viewDate, cursor, entries, now }, h) {
  if (!yesterdayContext({ viewDate, cursor, now }, h)) return null;
  return (entries && entries[h.pad2(now.getDate() - 1)]) || null;
}

// "গতকাল ভরা হয়নি" ব্যানার: এই মাসে অন্তত একটা এন্ট্রি আছে অথচ গতকালের নেই।
export function yesterdayMissingOf({ viewDate, cursor, entries, now }, h) {
  if (!yesterdayContext({ viewDate, cursor, now }, h)) return false;
  if (!entries || Object.keys(entries).length === 0) return false;
  return !entries[h.pad2(now.getDate() - 1)];
}
