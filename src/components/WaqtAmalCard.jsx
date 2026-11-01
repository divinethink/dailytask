// "এখনকার আমল" কার্ড(হোম ট্যাবে, আগের "আজকের মুহাসাবা" কার্ডের জায়গায়, owner-instruction ১ নভেম্বর ২০২৬):
// চলতি ওয়াক্তের আমল-গাইড দেখায়; ওয়াক্ত বদলালে লেখা নিজে বদলায়। শুধু দেখায় — কোনো ডেটা লেখে না।
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

// সময়সূচি না পেলে আনুমানিক ডিফল্ট(ঘণ্টা:মিনিট)
const FALLBACK = { Fajr: "05:00", Dhuhr: "12:00", Asr: "15:45", Maghrib: "17:30", Isha: "19:00" };

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

  const key = useMemo(() => {
    const src = timings || FALLBACK;
    const g = (k) => parseOn(now, src[k]) || parseOn(now, FALLBACK[k]);
    return pickAmalKey(now, { fajr: g("Fajr"), dhuhr: g("Dhuhr"), asr: g("Asr"), maghrib: g("Maghrib"), isha: g("Isha") });
  }, [timings, now]);

  // নতুন ওয়াক্ত শুরু হলে ভাঁজ-করা অংশ আবার নিজে খুলে যায়
  useEffect(() => { setOpen(true); }, [key]);

  const a = WAQT_AMAL[key];
  if (!a) return null;
  return React.createElement(
    "div",
    null,
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
  );
}
