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
    return "সাহরি শেষ প্রায় " + clock12(f, toBn) + ", ইফতার প্রায় " + clock12(m, toBn) + " — রোজা হবে প্রায় " + toBn(Math.floor(len / 60)) + " ঘণ্টা " + toBn(len % 60) + " মিনিটের।";
  } catch { return null; }
}

// ছোট রঙ-প্যালেট: প্রতিটা বার্তার ধরন অনুযায়ী পটভূমি/বর্ডার/আইকন-টাইল
const TONES = {
  fast: { box: "bg-[#FFF8E7] border-[#EBD9A8]", tile: "bg-[#F6E7BD]" },
  ibadat: { box: "bg-emerald-50/70 border-emerald-100", tile: "bg-emerald-100" },
  special: { box: "bg-[#FFF3D6] border-[#E8CF8F]", tile: "bg-[#F3DB9B]" },
  dua: { box: "bg-[#F4F8F5] border-emerald-100", tile: "bg-emerald-100" },
  time: { box: "bg-sky-50 border-sky-100", tile: "bg-sky-100" },
  history: { box: "bg-[#F6F3EC] border-stone-200", tile: "bg-stone-200" },
  sleep: { box: "bg-slate-50 border-slate-100", tile: "bg-slate-100" },
};

function Row({ n, muted }) {
  const t = TONES[n.tone] || TONES.ibadat;
  return React.createElement(
    "li",
    { className: "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 " + t.box + (muted ? " opacity-80" : "") },
    React.createElement("span", { "aria-hidden": true, className: "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base " + t.tile }, n.icon),
    React.createElement(
      "div",
      { className: "min-w-0 flex-1" },
      n.title && React.createElement("p", { className: "text-sm font-bold text-emerald-950 leading-snug" }, n.title),
      React.createElement("p", { className: "text-sm leading-relaxed " + (muted ? "text-slate-500" : "text-slate-700") + (n.title ? " mt-0.5" : "") }, n.text),
      n.dua && React.createElement(
        "div",
        { className: "mt-2 rounded-lg bg-white/90 border border-emerald-100 px-3 py-2" },
        React.createElement("p", { dir: "rtl", lang: "ar", className: "text-[19px] leading-[2] text-emerald-950 text-center", style: { fontFamily: "'Noto Naskh Arabic','Amiri','Traditional Arabic',serif" } }, n.dua.ar),
        React.createElement("p", { className: "mt-1 text-[13px] leading-relaxed text-slate-600" }, n.dua.bn)
      ),
      n.src && React.createElement("span", { className: "inline-block mt-1.5 rounded-full bg-white/80 border border-black/5 px-2 py-0.5 text-[11px] text-slate-500" }, "📚 " + n.src)
    )
  );
}

export function TomorrowPreviewCard({ toBn }) {
  const date = new Date(Date.now() + 86400000);
  const hijri = getHijriDate(date);
  const { notes, special, fastingDay, history } = tomorrowNotes(date, hijri);
  if (fastingDay) {
    const fl = fastingLine(toBn);
    if (fl) notes.push({ tone: "time", icon: "⏱️", title: "কালকের রোজার সময়", text: fl });
  }
  history.forEach((t) => notes.push({ tone: "history", icon: "📜", title: "ইতিহাসের পাতায় কাল", text: t }));
  const ms = nextMilestone(date);
  const hasMore = notes.length > 0;
  const sleep = { tone: "sleep", icon: "🛏️", title: "ঘুমের আগে", text: "ওজু করে আয়াতুল কুরসি, তিন কুল ও তাসবিহে ফাতিমা (৩৩-৩৩-৩৪) পড়ে নিন।" };

  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)] mt-4" },
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2" },
        React.createElement("h3", { className: "text-sm font-bold text-emerald-950" }, "🌅 আগামীকাল"),
        React.createElement("span", { className: "rounded-full bg-emerald-900 text-white text-xs font-semibold px-2.5 py-0.5" }, WEEKDAYS_BN[date.getDay()])
      ),
      React.createElement("span", { className: "text-xs font-semibold text-[#A47E24]" }, toBn(hijri.day) + " " + hijri.month)
    ),
    React.createElement(
      "ul",
      { className: "space-y-2" },
      notes.map((n, i) => React.createElement(Row, { key: i, n })),
      React.createElement(Row, { key: "sleep", n: sleep, muted: hasMore })
    ),
    ms && React.createElement(
      "div",
      { className: "mt-3 flex items-center justify-center" },
      React.createElement("span", { className: "rounded-full bg-[#FFF8E7] border border-[#EBD9A8] px-3 py-1 text-xs font-semibold text-[#8A6A1C]" }, "⏳ " + ms.label + " — আর প্রায় " + toBn(ms.days + 1) + " দিন (সম্ভবত)")
    ),
    history.length > 0 && React.createElement("p", { className: "mt-2 text-[11px] text-slate-400 text-center" }, "ইতিহাসের তারিখ সর্বাধিক প্রচলিত মত অনুযায়ী; ভিন্ন মতও আছে।"),
    special && React.createElement("p", { className: "mt-1 text-[11px] text-slate-400 text-center" }, "হিজরি তারিখ ১ দিন এদিক-ওদিক হতে পারে; চাঁদ দেখা সাপেক্ষে।")
  );
}
