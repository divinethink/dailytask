// weekPulse.js — "এ সপ্তাহের ফোকাস" কার্ডের হিসাব। Pure (Firebase/UI ছাড়া); নতুন কোনো ডেটা/schema নেই।
// ইনপুট: সপ্তাহের ৭ দিন (শুক্র→বৃহস্পতি) ও এন্ট্রি; ফোকাস-আমলের দিনওয়ারি অবস্থা হিসাব করে।
// নীতি: ছুটে যাওয়া দিনকে নরম রঙে দেখানো (অপরাধবোধ নয়); একদিন ছুটলে পরপর দুইদিন না ছোটার উৎসাহ।

const PHASES = ["plan", "plan", "mid", "mid", "push", "push", "review"]; // শুক্র=০ … বৃহস্পতি=৬

function phaseOf(idx) {
  return PHASES[idx] || "mid";
}

// ratio (0..1) → দিনের অবস্থা। full | part | miss | empty | excused | pending | future
function cellState({ ratio, excused, hasEntry, isToday, isFuture }) {
  if (isFuture) return "future";
  if (excused) return "excused";
  const ok = hasEntry && typeof ratio === "number" && Number.isFinite(ratio);
  if (!ok) return isToday ? "pending" : "empty";
  if (ratio >= 1) return "full";
  if (ratio > 0) return "part";
  return "miss";
}

// days: [{ entry }] ঠিক ৭টা; todayIdx: আজ সপ্তাহের কততম (০–৬)। ratioOf(entry) → 0..1|null; excusedOf(entry) → bool
function buildWeekPulse({ days, todayIdx, ratioOf, excusedOf }) {
  if (!Array.isArray(days) || days.length !== 7 || !Number.isInteger(todayIdx) || todayIdx < 0 || todayIdx > 6) return null;
  const cells = days.map((d, i) => {
    const entry = d && d.entry ? d.entry : null;
    const isToday = i === todayIdx;
    const isFuture = i > todayIdx;
    const excused = !!(entry && excusedOf && excusedOf(entry));
    const ratio = entry && ratioOf ? ratioOf(entry) : null;
    return { state: cellState({ ratio, excused, hasEntry: !!entry, isToday, isFuture }), isToday };
  });
  const upTo = cells.slice(0, todayIdx + 1);
  const full = upTo.filter(c => c.state === "full").length;
  const part = upTo.filter(c => c.state === "part").length;
  const counted = upTo.filter(c => c.state === "full" || c.state === "part" || c.state === "miss").length; // শুধু এন্ট্রি-থাকা দিন
  // টানা পূর্ণ দিন: আজ পূর্ণ হলে আজ থেকে, নইলে (আজ বাকি থাকলে) গতকাল থেকে পিছনে
  let streak = 0;
  let i = cells[todayIdx].state === "full" || cells[todayIdx].state === "excused" ? todayIdx : todayIdx - 1;
  for (; i >= 0; i--) {
    if (cells[i].state === "full") streak += 1;
    else if (cells[i].state === "excused") continue;
    else break;
  }
  const today = cells[todayIdx].state;
  const yest = todayIdx > 0 ? cells[todayIdx - 1].state : null;
  const slip = (yest === "part" || yest === "miss") && (today === "pending" || today === "empty");
  return { cells, todayIdx, phase: phaseOf(todayIdx), full, part, counted, left: 6 - todayIdx, streak, today, slip };
}

// কোন ধরনের বার্তা: done > slip > সপ্তাহের পর্যায়
function lineKind(p, reviewDone) {
  if (!p) return "";
  if (p.phase === "review") return reviewDone ? "reviewDone" : "review";
  if (p.today === "full") return "done";
  if (p.slip) return "slip";
  return p.phase;
}

// একই সপ্তাহে দিনভেদে ও সপ্তাহভেদে আলাদা বার্তা (নির্ধারিত, random নয়)
function pickVariant(n, weekKey, idx) {
  if (!n || n < 1) return 0;
  let h = 0;
  for (const ch of String(weekKey || "")) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h + idx) % n;
}

// reviews: নতুন→পুরনো ক্রমে [গত সপ্তাহ, তার আগের, …] (না থাকলে null); key = ফোকাস আমল।
// টানা কত সপ্তাহ একই আমল ঘাটতি ছিল + সবচেয়ে বেশি আসা কারণ (২+ সপ্তাহে অন্তত ২ বার)।
function gapRepeat(reviews, key) {
  let weeks = 0;
  const tally = {};
  for (const r of reviews || []) {
    if (!r || !key || r.gapKey !== key) break;
    weeks += 1;
    for (const id of Array.isArray(r.gapReasons) ? r.gapReasons : []) tally[id] = (tally[id] || 0) + 1;
  }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  return { weeks, reason: top && (weeks === 1 || top[1] >= 2) ? top[0] : "" };
}

function clip(s, n) {
  const t = String(s || "").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

export { PHASES, phaseOf, cellState, buildWeekPulse, lineKind, pickVariant, gapRepeat, clip };
