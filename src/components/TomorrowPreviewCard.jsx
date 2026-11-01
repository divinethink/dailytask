// "আগামীকাল" কার্ড(রাতে-ভরা অ্যাপের জন্য, owner-approved): কালকের বার ও হিজরি তারিখ অনুযায়ী স্মরণ — জুমা, সোম-বৃহস্পতি, আইয়ামে বীজ,
// মুহাররম/শাবান/রমযান/শাওয়াল/জিলহজ্জের আমল, ঈদ — প্রতিটায় সহীহ সূত্র; সাথে "ইসলামের ইতিহাসে কাল", সিয়ামের সময়-হিসাব, বড় দিবসের কাউন্টডাউন।
// তথ্য: tomorrowCalendarData.js(pure)। শুধু দেখায় — কোনো ডেটা লেখে না; সময় পড়ে শুধু সেভ-করা cache থেকে।
// হিজরি তারিখ tabular(≈±১ দিন) বলে বিশেষ-দিনের লাইনে "সম্ভাব্য/চাঁদ দেখা সাপেক্ষে" লেখা।
// React global(window.React, globals.js)।
import { getHijriDate, HIJRI_MONTHS_BN } from "../legacy/appHelpers.js";
import { getSavedLocation, getSavedMadhab } from "../legacy/publicToolsSettings.js";
import { peekCachedDailyTimings } from "../legacy/publicToolsPrayerApi.js";
import { WEEKDAYS_BN, MILESTONES, calendarNotes, historyFor } from "./tomorrowCalendarData.js";

export function tomorrowNotes(date, hijri) {
  const hm = HIJRI_MONTHS_BN.indexOf(hijri.month) + 1;
  const r = calendarNotes(date.getDay(), hm, hijri.day);
  return { ...r, hm, history: historyFor(hm, hijri.day) };
}

// কালকের পর পরের বড় দিবস কত দিন পরে(≤৪৫ দিন); না থাকলে null
function nextMilestone(from) {
  for (let i = 1; i <= 45; i++) {
    const d = new Date(from.getTime() + i * 86400000);
    const h = getHijriDate(d);
    const hm = HIJRI_MONTHS_BN.indexOf(h.month) + 1;
    const m = MILESTONES.find((x) => x.hm === hm && x.hd === h.day);
    if (m) return { days: i, label: m.label };
  }
  return null;
}

function hhmm(v) {
  const m = typeof v === "string" && v.match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function clock12(min, toBn) {
  const h24 = Math.floor(min / 60) % 24;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return toBn(h) + ":" + toBn(String(min % 60).padStart(2, "0"));
}
// সেভ-করা cache(আজকের সময়, কাল ≈১ মিনিট এদিক-ওদিক) থেকে সিয়ামের সময়-হিসাব; না পেলে null
function fastingLine(toBn) {
  try {
    const loc = getSavedLocation();
    if (!loc) return null;
    const c = peekCachedDailyTimings({ lat: loc.lat, lon: loc.lon, madhab: getSavedMadhab(), date: new Date() });
    const f = hhmm(c && c.timings && c.timings.Fajr);
    const m = hhmm(c && c.timings && c.timings.Maghrib);
    if (f == null || m == null || m <= f) return null;
    const len = m - f;
    return "কাল সিয়ামের সময় প্রায় " + toBn(Math.floor(len / 60)) + " ঘণ্টা " + toBn(len % 60) + " মিনিট — সাহরি শেষ প্রায় " + clock12(f, toBn) + ", ইফতার প্রায় " + clock12(m, toBn) + "।";
  } catch { return null; }
}

export function TomorrowPreviewCard({ toBn }) {
  const date = new Date(Date.now() + 86400000);
  const hijri = getHijriDate(date);
  const { notes, special, fastingDay, history } = tomorrowNotes(date, hijri);
  if (fastingDay) {
    const fl = fastingLine(toBn);
    if (fl) notes.push({ icon: "⏱️", text: fl });
  }
  const ms = nextMilestone(date);
  const sleep = { icon: "🛏️", text: "ঘুমানোর আগে: ওযু, আয়াতুল কুরসী, তিন কুল, তাসবীহে ফাতিমী (৩৩-৩৩-৩৪)।" };

  const row = (n, i, muted) =>
    React.createElement(
      "li",
      { key: i, className: "flex items-start gap-2 text-[12px] leading-relaxed " + (muted ? "text-slate-500" : "text-slate-700") },
      React.createElement("span", { "aria-hidden": true, className: "shrink-0" }, n.icon),
      React.createElement(
        "span",
        null,
        n.text,
        n.src && React.createElement("span", { className: "text-[10px] text-slate-400" }, " (" + n.src + ")")
      )
    );

  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)] mt-4" },
    React.createElement(
      "div",
      { className: "flex items-baseline justify-between gap-2 mb-2" },
      React.createElement("h3", { className: "text-sm font-bold text-emerald-950" }, "🌅 আগামীকাল · " + WEEKDAYS_BN[date.getDay()]),
      React.createElement("span", { className: "text-[10px] font-semibold text-slate-400" }, toBn(hijri.day) + " " + hijri.month)
    ),
    React.createElement(
      "ul",
      { className: "space-y-1.5" },
      notes.map((n, i) => row(n, i, false)),
      history.map((t, i) => row({ icon: "📜", text: "ইসলামের ইতিহাসে কাল — " + t }, "h" + i, false)),
      row(sleep, "sleep", notes.length > 0 || history.length > 0)
    ),
    ms && React.createElement("p", { className: "mt-2 text-[11px] font-semibold text-emerald-800" }, "⏳ " + ms.label + " আর প্রায় " + toBn(ms.days + 1) + " দিন বাকি (সম্ভাব্য)"),
    history.length > 0 && React.createElement("p", { className: "mt-1 text-[10px] text-slate-400" }, "ঐতিহাসিক তারিখ সর্বাধিক প্রচলিত মত অনুযায়ী; ঐতিহাসিকদের মধ্যে ভিন্ন মতও আছে।"),
    special && React.createElement("p", { className: "mt-1 text-[10px] text-slate-400" }, "হিজরি তারিখ ১ দিন এদিক-ওদিক হতে পারে; চাঁদ দেখা সাপেক্ষে।")
  );
}
