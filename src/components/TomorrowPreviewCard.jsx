// "আগামীকাল" কার্ড(রাতে-ভরা অ্যাপের জন্য, owner-approved): কালকের বার ও হিজরি তারিখ অনুযায়ী স্মরণ — জুমা, সোম-বৃহস্পতি, আইয়ামে বীজ,
// মুহাররম/শাবান/রমযান/শাওয়াল/জিলহজ্জের আমল, ঈদ — প্রতিটায় সহীহ সূত্র; সাথে "ইসলামের ইতিহাসে কাল", সিয়ামের সময়-হিসাব, বড় দিবসের কাউন্টডাউন।
// তথ্য: tomorrowCalendarData.js(pure)। শুধু দেখায় — কোনো ডেটা লেখে না; সময় পড়ে শুধু সেভ-করা cache থেকে।
// হিজরি তারিখ tabular(≈±১ দিন) বলে বিশেষ-দিনের লাইনে "সম্ভাব্য/চাঁদ দেখা সাপেক্ষে" লেখা।
// React global(window.React, globals.js)।
import { getHijriDate, HIJRI_MONTHS_BN } from "../legacy/appHelpers.js";
import { getSavedLocation, getSavedMadhab } from "../legacy/publicToolsSettings.js";
import { peekCachedDailyTimings } from "../legacy/publicToolsPrayerApi.js";
import { WEEKDAYS_BN, MILESTONES, calendarNotes, historyFor } from "./tomorrowCalendarData.js";
import { isCreatorAuth } from "../legacy/familyIdentity.js";
import { fetchSection } from "../legacy/editableContent.js";
import { EXTRAS_SECTION_ID, normalizeExtras, extrasFor, builtinId, applyOverrides, splitBullets, DAILY_AMOL, SLEEP_EXTRA } from "./tomorrowExtras.js";
import { TomorrowExtrasEditor } from "./TomorrowExtrasEditor.jsx";
import { EditIcon } from "./icons.jsx";

const DEFAULT_SLEEP = "ওজু করে আয়াতুল কুরসি, তিন কুল ও তাসবিহে ফাতিমা (৩৩-৩৩-৩৪) পড়ে নিন।";

// তথ্য-ফাইলের বার্তা "কাল"-দৃষ্টিকোণে লেখা; আজকের তারিখ দেখালে শুধু শব্দ "কাল/কালকের"→"আজ/আজকের"।
// (সকাল/বিকাল-এর মতো শব্দ ছোঁয় না: আগে ফাঁকা/চিহ্ন থাকতে হবে, পরে ফাঁকা/চিহ্ন।)
const KAL_RE = /(^|[\s—“(])কাল(কের)?(?=[\s—,।:?)”]|$)/g;
const toToday = s => (typeof s === "string" ? s.replace(KAL_RE, (_, a, k) => a + (k ? "আজকের" : "আজ")) : s);

export function tomorrowNotes(date, hijri, isTomorrow = true) {
  const hm = HIJRI_MONTHS_BN.indexOf(hijri.month) + 1;
  const r = calendarNotes(date.getDay(), hm, hijri.day);
  r.notes = r.notes.map(n => ({ ...n, id: builtinId(n.title) })); // মূল শিরোনাম থেকে স্থির আইডি(সম্পাদনা/লুকানোর জন্য)
  if (!isTomorrow) r.notes = r.notes.map(n => ({ ...n, title: toToday(n.title), text: toToday(n.text) }));
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
  const bullets = Array.isArray(n.bullets) ? n.bullets : splitBullets(n.text);
  return React.createElement(
    "li",
    { className: "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 " + t.box + (muted ? " opacity-80" : "") },
    React.createElement("span", { "aria-hidden": true, className: "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base " + t.tile }, n.icon),
    React.createElement(
      "div",
      { className: "min-w-0 flex-1" },
      n.title && React.createElement("p", { className: "text-sm font-bold text-emerald-950 leading-snug" }, n.title),
      bullets.length > 1
        ? React.createElement("ul", { className: "list-disc pl-4 space-y-1 text-sm leading-relaxed marker:text-emerald-700 " + (muted ? "text-slate-500" : "text-slate-700") + (n.title ? " mt-1" : "") }, bullets.map((b, i) => React.createElement("li", { key: i }, b)))
        : React.createElement("p", { className: "text-sm leading-relaxed " + (muted ? "text-slate-500" : "text-slate-700") + (n.title ? " mt-0.5" : "") }, bullets.length === 1 ? bullets[0] : n.text),
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

// todaySaved=false হলে কার্ড "আজ"-এর বার্তা দেখায়; আজকের ডেটা সেভ হলে "আগামীকাল"।
export function TomorrowPreviewCard({ toBn, todaySaved = true }) {
  // ক্রিয়েটরের যোগ-করা বাড়তি বাক্য: doc না থাকলে/পড়া ব্যর্থ হলে খালি — কার্ড আগের মতোই চলে
  const [extras, setExtras] = React.useState({ items: [], sleepText: "", overrides: {} });
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    fetchSection(EXTRAS_SECTION_ID).then((d) => { if (alive) setExtras(normalizeExtras(d)); });
    return () => { alive = false; };
  }, []);
  const isCreator = isCreatorAuth();
  const isTomorrow = !!todaySaved;
  const date = new Date(Date.now() + (isTomorrow ? 86400000 : 0));
  const hijri = getHijriDate(date);
  const { notes: builtinNotes, special, fastingDay, history } = tomorrowNotes(date, hijri, isTomorrow);
  const notes = applyOverrides(builtinNotes, extras.overrides, isTomorrow ? null : toToday);
  if (fastingDay) {
    const fl = fastingLine(toBn);
    if (fl) notes.push({ tone: "time", icon: "⏱️", title: isTomorrow ? "কালকের রোজার সময়" : "আজকের রোজার সময়", text: fl });
  }
  extrasFor(extras, date.getDay()).forEach((n) => notes.push(n));
  notes.push({ tone: "ibadat", icon: "🌿", title: "প্রতিদিনের আমল", bullets: DAILY_AMOL });
  history.forEach((t) => notes.push({ tone: "history", icon: "📜", title: isTomorrow ? "ইতিহাসের পাতায় কাল" : "ইতিহাসের পাতায় আজ", text: t }));
  const ms = nextMilestone(date);
  const hasMore = notes.length > 0;
  const sleepBase = splitBullets(extras.sleepText || DEFAULT_SLEEP);
  const sleep = { tone: "sleep", icon: "🛏️", title: "ঘুমের আগে", bullets: [...(sleepBase.length ? sleepBase : [extras.sleepText || DEFAULT_SLEEP]), SLEEP_EXTRA] };

  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)] mt-4" },
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2 shrink-0 whitespace-nowrap" },
        React.createElement("h3", { className: "text-sm font-bold text-emerald-950 whitespace-nowrap" }, isTomorrow ? "🌅 আগামীকাল" : "🌅 আজ"),
        React.createElement("span", { className: "rounded-full bg-emerald-900 text-white text-xs font-semibold px-2.5 py-0.5 whitespace-nowrap" }, WEEKDAYS_BN[date.getDay()])
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-1 min-w-0" },
        React.createElement("span", { className: "text-xs font-semibold text-[#A47E24] text-right leading-tight min-w-0" }, toBn(hijri.day) + " " + hijri.month),
        isCreator && !editing && React.createElement("button", { type: "button", onClick: () => setEditing(true), "aria-label": "সম্পাদনা", className: "w-7 h-7 flex items-center justify-center rounded-lg text-emerald-800 hover:bg-black/5" }, React.createElement(EditIcon, { size: 16 }))
      )
    ),
    isCreator && editing && React.createElement(TomorrowExtrasEditor, { extras, defaultSleep: DEFAULT_SLEEP, tomorrowWeekday: date.getDay(), builtins: builtinNotes, onSaved: setExtras, onClose: () => setEditing(false) }),
    React.createElement(
      "ul",
      { className: "space-y-2" },
      notes.map((n, i) => React.createElement(Row, { key: i, n })),
      React.createElement(Row, { key: "sleep", n: sleep, muted: hasMore })
    ),
    ms && React.createElement(
      "div",
      { className: "mt-3 flex items-center justify-center" },
      React.createElement("span", { className: "rounded-full bg-[#FFF8E7] border border-[#EBD9A8] px-3 py-1 text-xs font-semibold text-[#8A6A1C]" }, "⏳ " + ms.label + " — আর প্রায় " + toBn(isTomorrow ? ms.days + 1 : ms.days) + " দিন (সম্ভবত)")
    ),
    history.length > 0 && React.createElement("p", { className: "mt-2 text-[11px] text-slate-400 text-center" }, "ইতিহাসের তারিখ সর্বাধিক প্রচলিত মত অনুযায়ী; ভিন্ন মতও আছে।"),
    special && React.createElement("p", { className: "mt-1 text-[11px] text-slate-400 text-center" }, "হিজরি তারিখ ১ দিন এদিক-ওদিক হতে পারে; চাঁদ দেখা সাপেক্ষে।")
  );
}
