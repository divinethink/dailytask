// "পরবর্তী ওয়াক্ত + আমল" কার্ড(হোম ট্যাবে, আগের "আজকের মুহাসাবা" কার্ডের জায়গায়, owner-instruction ১ নভেম্বর ২০২৬):
// সময়সূচি-ট্যাবের আগের "পরবর্তী: ওয়াক্ত" কার্ড(রাকাত-চিপ+টিপ) এখানে সরানো; তার নিচে চলতি ওয়াক্তের আমল-গাইড; ওয়াক্ত বদলালে লেখা নিজে বদলায়। শুধু দেখায় — কোনো ডেটা লেখে না।
// সময়সূচি: সেভ-করা লোকেশন+মাযহাবে data-layer(publicToolsPrayerApi.js)-এর cache/fetch; না পেলে আনুমানিক ডিফল্ট সময়।
// React global(window.React, globals.js)।
import { getSavedLocation, getSavedMadhab } from "../legacy/publicToolsSettings.js";
import { fetchDailyPrayerTimes, peekCachedDailyTimings } from "../legacy/publicToolsPrayerApi.js";

const { useState, useEffect, useMemo } = React;

export const WAQT_AMAL = {
  fajr: { icon: "🌅", title: "ফজরের পরের আমল", items: [
    "সালাত শেষে সূর্যোদয় পর্যন্ত নিজ স্থানে বসে মাসনুন যিকির, তাসবীহ ও দুআ পড়া",
    "সূর্যোদয়ের ১৫-২০ মিনিট পর ২ বা ৪ রাকাত ইশরাক ও দুহার সালাত আদায় করা",
    "অর্থ বুঝে কুরআন তিলাওয়াত করা",
  ] },
  dhuhr: { icon: "☀️", title: "যোহরের আমল", items: [
    "লেনদেন, কথাবার্তা ও আচরণে সততা ও সুন্নাহর অনুসরণ করা",
    "জবানকে সর্বদা যিকির, দরূদ ও তাওবায় মশগুল রাখা",
    "সামর্থ্য অনুযায়ী ছোট হলেও কিছু সদকা করা",
  ] },
  asr: { icon: "🔆", title: "আসরের আমল", items: [
    "সূর্যাস্তের আগের সময়টি দুআ কবুলের অন্যতম গুরুত্বপূর্ণ সময়; মাগরিবের আগে বেশি বেশি দুআ ও ইস্তেগফার করা",
  ] },
  maghrib: { icon: "🌇", title: "মাগরিবের আমল", items: [
    "সন্ধ্যার মাসনুন যিকির ও দুআ সম্পন্ন করা",
    "মাগরিব ও ইশার মাঝের সময়ে রাতের খাবার খাওয়া",
    "দিনে অন্তত একবার মা-বাবা/আত্মীয়দের খোঁজ নেওয়া বা সাহায্য করা",
  ] },
  isha: { icon: "🌙", title: "ইশার আমল", items: [
    "বিসমিল্লাহ বলে মুহাসাবা শুরু করা",
    "তাহাজ্জুদ ও ফজরে সময়মতো ওঠার নিয়তে অপ্রয়োজনীয় কথা না বলে দ্রুত ঘুমের প্রস্তুতি নেওয়া",
    "সূরা বাকারার শেষ দুই আয়াত (২৮৫-২৮৬) পড়া",
    "আয়াতুল কুরসি পড়া",
    "সূরা ইখলাস, ফালাক ও নাস ৩ বার পড়ে দুই হাতে ফুঁ দিয়ে মাথা-মুখসহ পুরো শরীরে যতদূর সম্ভব মাসাহ করা (এভাবে ৩ বার)",
    "ঘুমের দুআ পড়া: আল্লাহুম্মা বিসমিকা আমূতু ওয়া আহইয়া",
    "ঘুম না আসা পর্যন্ত সুন্নাহসম্মত যিকির, ইস্তেগফার ও দরূদ পড়তে থাকা",
  ] },
  night: { icon: "🌌", title: "শেষ রাতের আমল", items: [
    "তাহাজ্জুদ বা কিয়ামুল লাইল আদায় করা (রাসূলুল্লাহ সা. সাধারণত ৮ রাকাত পড়তেন); সেজদায় ও শেষ রাতে কেঁদে কেঁদে দুআ করা",
    "সেহরির শেষ সময়ে (সুবহে সাদিকের আগে) বেশি বেশি ইস্তেগফার করা",
  ] },
};

// §আগের সময়সূচি-ট্যাবের "এখন করণীয়" কার্ডের ডেটা(হুবহু): ওয়াক্তভিত্তিক রাকাত-সংখ্যা(হানাফী=1 / অন্যান্য=0) ও টিপ
const WAQT_GUIDE = {
  1: {
    fajr: "সুন্নত ২ (ফরজের আগে) · ফরজ ২",
    dhuhr: "সুন্নত ৪ · ফরজ ৪ · সুন্নত ২ · নফল ২",
    asr: "ফরজ ৪ (আগে ৪ রাকাত গায়রে-মুয়াক্কাদা সুন্নত)",
    maghrib: "ফরজ ৩ · সুন্নত ২ · নফল ২",
    isha: "ফরজ ৪ · সুন্নত ২ · নফল ২ · বিতর ৩",
  },
  0: {
    fajr: "সুন্নত ২ (ফরজের আগে) · ফরজ ২",
    dhuhr: "সুন্নত ২ · ফরজ ৪ · সুন্নত ২",
    asr: "ফরজ ৪ রাকাত",
    maghrib: "ফরজ ৩ · সুন্নত ২",
    isha: "ফরজ ৪ · সুন্নত ২ · বিতর (১–১১)",
  },
};
const WAQT_TIP = {
  fajr: ["ফরজ নামাজের পর আয়াতুল কুরসি ও তাসবীহ", "সকালের আযকার"],
  dhuhr: ["ফরজ নামাজের পর আয়াতুল কুরসি ও তাসবীহ"],
  asr: ["ফরজ নামাজের পর আয়াতুল কুরসি ও তাসবীহ"],
  maghrib: ["ফরজ নামাজের পর আয়াতুল কুরসি ও তাসবীহ", "সন্ধ্যার আযকার"],
  isha: ["ফরজ নামাজের পর আয়াতুল কুরসি ও তাসবীহ", "শোয়ার আগের আযকার"],
};
const WAQT_NAME = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
function rakatPillClass(t) {
  if (t.startsWith("ফরজ")) return "bg-emerald-900 text-white";
  if (t.startsWith("সুন্নত")) return "bg-amber-100 text-amber-800";
  if (t.startsWith("নফল")) return "bg-sky-100 text-sky-800";
  if (t.startsWith("বিতর")) return "bg-indigo-100 text-indigo-800";
  return "bg-slate-100 text-slate-700";
}

// সময়সূচি না পেলে আনুমানিক ডিফল্ট(ঘণ্টা:মিনিট)
const FALLBACK = { Fajr: "05:00", Sunrise: "06:15", Dhuhr: "12:00", Asr: "15:45", Maghrib: "17:30", Isha: "19:00" };

function parseOn(base, hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

// চলতি অংশ: ফজর→যোহর = ফজরের পরের আমল; ইশা→শেষ-রাত-শুরু = ইশা; শেষ রাত→ফজর = শেষ রাত
export function pickAmalKey(now, t) {
  const { fajr, dhuhr, asr, maghrib, isha } = t;
  const nightMs = fajr.getTime() + 86400000 - isha.getTime();
  const nightStart = new Date(isha.getTime() + nightMs * (2 / 3));
  if (now < fajr) return now >= new Date(nightStart.getTime() - 86400000) ? "night" : "isha";
  if (now < dhuhr) return "fajr";
  if (now < asr) return "dhuhr";
  if (now < maghrib) return "asr";
  if (now < isha) return "maghrib";
  return now >= nightStart ? "night" : "isha";
}

// সময়সূচি-ট্যাবের আগের লজিক হুবহু: ফজরের ওয়াক্ত সূর্যোদয়ে শেষ; ফাঁকে থাকলে পরবর্তী ওয়াক্ত
export function pickGuide(now, t) {
  const { fajr, sunrise, dhuhr, asr, maghrib, isha } = t;
  const nextFajr = new Date(fajr.getTime() + 86400000);
  if (now < fajr) return { key: "isha", current: true };
  const w = [
    { key: "fajr", start: fajr, end: sunrise },
    { key: "dhuhr", start: dhuhr, end: asr },
    { key: "asr", start: asr, end: maghrib },
    { key: "maghrib", start: maghrib, end: isha },
    { key: "isha", start: isha, end: nextFajr },
  ];
  const active = w.find((x) => now >= x.start && now < x.end);
  if (active) return { key: active.key, current: true };
  const up = w.find((x) => now < x.start);
  return { key: up ? up.key : "fajr", current: false };
}

export function WaqtAmalCard() {
  const [now, setNow] = useState(() => new Date());
  const [timings, setTimings] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const dayStr = now.toDateString();
  useEffect(() => {
    let alive = true;
    let loc = null;
    let madhab = 1;
    try { loc = getSavedLocation(); madhab = getSavedMadhab(); } catch {}
    if (!loc) return undefined;
    const d = new Date();
    try {
      const cached = peekCachedDailyTimings({ lat: loc.lat, lon: loc.lon, madhab, date: d });
      if (cached && cached.timings) setTimings(cached.timings);
    } catch {}
    fetchDailyPrayerTimes({ lat: loc.lat, lon: loc.lon, madhab, date: d })
      .then((res) => { if (alive && res && res.timings) setTimings(res.timings); })
      .catch(() => {});
    return () => { alive = false; };
  }, [dayStr]);

  const { key, guide } = useMemo(() => {
    const src = timings || FALLBACK;
    const g = (k) => parseOn(now, src[k]) || parseOn(now, FALLBACK[k]);
    const t = { fajr: g("Fajr"), sunrise: g("Sunrise"), dhuhr: g("Dhuhr"), asr: g("Asr"), maghrib: g("Maghrib"), isha: g("Isha") };
    return { key: pickAmalKey(now, t), guide: pickGuide(now, t) };
  }, [timings, now]);
  const madhab = (() => { try { return getSavedMadhab() === 1 ? 1 : 0; } catch { return 1; } })();

  // নতুন ওয়াক্ত শুরু হলে ভাঁজ-করা অংশ আবার নিজে খুলে যায়
  useEffect(() => { setOpen(true); }, [key]);

  const a = WAQT_AMAL[key];
  if (!a) return null;
  const pills = WAQT_GUIDE[madhab][guide.key].split(" · ").map((t) => {
    const m = t.match(/^(.*?)\s*\((.{11,})\)\s*$/);
    return { label: m ? m[1] : t, note: m ? m[2] : null };
  });
  const notes = pills.map((x) => x.note).filter(Boolean);
  return React.createElement(
    "div",
    null,
    React.createElement("div", { className: "text-sm font-bold text-emerald-950" }, (guide.current ? "চলমান সালাত" : "পরবর্তী সালাত") + ": " + WAQT_NAME[guide.key]),
    React.createElement(
      "div",
      { className: "flex flex-nowrap items-center gap-1 mt-1.5 overflow-x-auto" },
      pills.map((x, i) => React.createElement("span", { key: i, className: "text-xs rounded-full px-2 py-0.5 whitespace-nowrap shrink-0 " + rakatPillClass(x.label) }, x.label))
    ),
    notes.length > 0 && React.createElement("div", { className: "text-xs text-slate-500 mt-1.5" }, notes.join(" · ")),
    React.createElement(
      "div",
      { className: "flex flex-wrap gap-x-2 gap-y-1 mt-3" },
      WAQT_TIP[guide.key].map((t) => React.createElement("span", { key: t, className: "text-xs text-slate-600" }, "💡 " + t))
    ),
    React.createElement(
      "div",
      { className: "mt-3 pt-2 border-t border-dashed border-[#C89B3C]/50" },
      React.createElement(
        "button",
        { type: "button", onClick: () => setOpen((v) => !v), "aria-expanded": open, className: "w-full min-h-[44px] flex items-center justify-between gap-2 text-left" },
        React.createElement("span", { className: "text-sm font-bold text-emerald-950" }, a.icon + " " + a.title),
        React.createElement(
          "span",
          { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-[11px] text-white bg-[#C89B3C] rounded-full px-2 py-0.5" }, "এখন"),
          React.createElement("span", { className: "text-slate-500 text-xs", "aria-hidden": true }, open ? "▲" : "▼")
        )
      ),
      open && React.createElement(
        "ul",
        { className: "mt-1 space-y-1.5" },
        a.items.map((t) =>
          React.createElement(
            "li",
            { key: t, className: "flex gap-2 text-sm text-slate-800 leading-relaxed" },
            React.createElement("span", { className: "mt-2 w-1.5 h-1.5 rounded-full bg-emerald-900 shrink-0" }),
            React.createElement("span", null, t)
          )
        )
      )
    )
  );
}
