// PrayerTimes.jsx — "সময়সূচি" bottom-nav ট্যাব(Public Tools Phase A, item ২)।
// UI layout 3_2_Public_Tools_Architecture_Plan.md §৪.২ ও visual reference
// 3_3_Public_Tools_Final_Mockup.md §৫ অনুযায়ী। data/lib separation(Dev Rule
// ২): এই ফাইল কখনো সরাসরি fetch() করে না — publicToolsPrayerApi.js(data-layer)
// ব্যবহার করে। React global(window.React, globals.js)।

import { toBn, BN_MONTHS, getHijriDate } from "../../legacy/appHelpers.js";
import {
  getSavedLocation,
  saveLocation,
  getSavedMadhab,
  saveMadhab,
  detectGpsLocation,
  MANUAL_LOCATIONS,
} from "../../legacy/publicToolsSettings.js";
import { fetchDailyPrayerTimes } from "../../legacy/publicToolsPrayerApi.js";
import { ChevronDown, Loader2 } from "../icons.jsx";

const { useState, useEffect, useMemo, useRef } = React;

function parseTimeOnDate(baseDate, hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutes(date, mins) {
  return date ? new Date(date.getTime() + mins * 60000) : null;
}

function formatHHMM(date) {
  if (!date) return "--:--";
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return toBn(`${h}:${m}`);
}

function formatCountdown(ms) {
  const safeMs = Math.max(0, ms);
  const totalSec = Math.floor(safeMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return toBn(`${h}:${m}:${s}`);
}

function formatGregorianDate(date) {
  return `${toBn(date.getDate())} ${BN_MONTHS[date.getMonth()]} ${toBn(date.getFullYear())}`;
}

function formatHijriDate(date) {
  const h = getHijriDate(date);
  return `${toBn(h.day)} ${h.month} ${toBn(h.year)}`;
}

export function PrayerTimes() {
  const [location, setLocationState] = useState(() => getSavedLocation());
  const [madhab, setMadhabState] = useState(() => getSavedMadhab());
  const [timings, setTimings] = useState(null);
  const [approximate, setApproximate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [otherOpen, setOtherOpen] = useState(false);
  const [gpsPanelOpen, setGpsPanelOpen] = useState(false);
  const [madhabPanelOpen, setMadhabPanelOpen] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const reqIdRef = useRef(0);

  // প্রতি সেকেন্ডে countdown আপডেট(existing timer-pattern reuse, 3_2 §৪.২ item ৩)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Location/madhab বদলালেই দৈনিক সময়সূচি নতুন করে fetch(cache-fallback data-layer-এই হয়)
  useEffect(() => {
    if (!location) return;
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    fetchDailyPrayerTimes({ lat: location.lat, lon: location.lon, madhab, date: new Date() })
      .then((res) => {
        if (myReqId !== reqIdRef.current) return;
        setTimings(res.timings);
        setApproximate(!!res.approximate);
      })
      .catch((err) => {
        if (myReqId !== reqIdRef.current) return;
        setTimings(null);
        setError(err && err.message ? err.message : "সময়সূচি আনতে ব্যর্থ হয়েছে");
      })
      .finally(() => {
        if (myReqId !== reqIdRef.current) return;
        setLoading(false);
      });
  }, [location, madhab]);

  function applyLocation(loc) {
    setLocationState(loc);
    saveLocation(loc);
    setGpsPanelOpen(false);
  }

  function handleUseGps() {
    setGpsBusy(true);
    detectGpsLocation()
      .then((loc) => {
        applyLocation(loc);
      })
      .catch((err) => {
        setError(err && err.message ? err.message : "GPS অবস্থান পাওয়া যায়নি");
      })
      .finally(() => setGpsBusy(false));
  }

  function handleMadhabChange(m) {
    setMadhabState(m);
    saveMadhab(m);
    setMadhabPanelOpen(false);
  }

  // §৪.১ bonus-derive — পূর্ণ schedule(আজকের সব ওয়াক্ত+সংশ্লিষ্ট time), fetch করা
  // timings থেকে একবারই গণনা(re-render-এ পুনরায় গণনা এড়াতে useMemo)।
  const schedule = useMemo(() => {
    if (!timings) return null;
    const today = new Date();
    const get = (k) => parseTimeOnDate(today, timings[k]);
    const fajr = get("Fajr");
    const sunrise = get("Sunrise");
    const dhuhr = get("Dhuhr");
    const asr = get("Asr");
    const sunset = get("Sunset") || get("Maghrib");
    const maghrib = get("Maghrib");
    const isha = get("Isha");
    if (!fajr || !sunrise || !dhuhr || !asr || !maghrib || !isha) return null;
    // পরদিনের ফজর — নতুন API-call এড়াতে আজকের ফজর-সময়ই পরদিনের জন্য
    // approximate হিসেবে ব্যবহৃত(কয়েক মিনিটের farok থাকতে পারে, "আনুমানিক" স্পিরিট)।
    const nextFajr = addMinutes(fajr, 24 * 60);
    return { fajr, sunrise, dhuhr, asr, sunset, maghrib, isha, nextFajr };
  }, [timings]);

  // বর্তমান/পরবর্তী ওয়াক্ত(countdown banner, §৪.২ item ৩) + list-highlight(item ৪)
  const waqtInfo = useMemo(() => {
    if (!schedule) return null;
    const { fajr, sunrise, dhuhr, asr, maghrib, isha, nextFajr } = schedule;
    if (now < fajr) {
      return { name: "ইশা", label: "শেষ হতে বাকি", target: fajr, currentKey: "isha" };
    }
    const windows = [
      { key: "fajr", name: "ফজর", start: fajr, end: sunrise },
      { key: "dhuhr", name: "যোহর", start: dhuhr, end: asr },
      { key: "asr", name: "আসর", start: asr, end: maghrib },
      { key: "maghrib", name: "মাগরিব", start: maghrib, end: isha },
      { key: "isha", name: "ইশা", start: isha, end: nextFajr },
    ];
    const active = windows.find((w) => now >= w.start && now < w.end);
    if (active) return { name: active.name, label: "শেষ হতে বাকি", target: active.end, currentKey: active.key };
    const upcoming = windows.find((w) => now < w.start);
    if (upcoming) return { name: upcoming.name, label: "শুরু হতে বাকি", target: upcoming.start, currentKey: null };
    return { name: "ফজর", label: "শুরু হতে বাকি", target: nextFajr, currentKey: null };
  }, [schedule, now]);

  // নিষিদ্ধ সময় — সূর্যোদয়/মধ্যাহ্ন/সূর্যাস্ত window(§৪.১ bonus-derive)
  const forbiddenWindows = useMemo(() => {
    if (!schedule) return [];
    const { sunrise, dhuhr, sunset } = schedule;
    return [
      { label: "সূর্যোদয়", start: sunrise, end: addMinutes(sunrise, 18) },
      { label: "মধ্যাহ্ন", start: addMinutes(dhuhr, -8), end: dhuhr },
      { label: "সূর্যাস্ত", start: addMinutes(sunset, -15), end: sunset },
    ];
  }, [schedule]);

  // তাহাজ্জুদ/দুহা/আওয়াবিন — bonus-derive(§৪.১), collapsible section
  const otherTimes = useMemo(() => {
    if (!schedule) return null;
    const { sunrise, dhuhr, maghrib, isha, nextFajr } = schedule;
    const nightMs = nextFajr.getTime() - isha.getTime();
    const tahajjudStart = new Date(isha.getTime() + nightMs * (2 / 3));
    return {
      tahajjud: { start: tahajjudStart, end: nextFajr },
      duha: { start: addMinutes(sunrise, 20), end: addMinutes(dhuhr, -10) },
      awabin: { start: maghrib, end: isha },
    };
  }, [schedule]);

  const rows = useMemo(() => {
    if (!schedule) return [];
    const { fajr, sunrise, dhuhr, asr, maghrib, isha } = schedule;
    return [
      { key: "fajr", label: "ফজর", start: fajr, end: sunrise },
      { key: "dhuhr", label: "যোহর", start: dhuhr, end: asr },
      { key: "asr", label: "আসর", start: asr, end: maghrib },
      { key: "maghrib", label: "মাগরিব", start: maghrib, end: isha },
      { key: "isha", label: "ইশা", start: isha, end: null },
    ];
  }, [schedule]);

  // ---- Location/মাযহাব সেটআপ এখনো করা হয়নি(প্রথমবার) ----
  if (!location) {
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "min-h-screen pb-24 bg-[#F4F7F1] flex flex-col items-center justify-center px-6 text-center gap-4" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-lg font-semibold", style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" } },
        "নামাজের সময়সূচি দেখতে অবস্থান লাগবে"
      ),
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          disabled: gpsBusy,
          onClick: handleUseGps,
          className: "h-11 px-5 rounded-2xl font-bold text-white text-sm bg-emerald-900 flex items-center gap-2 shadow-sm disabled:opacity-50",
        },
        gpsBusy && /*#__PURE__*/React.createElement(Loader2, { size: 16, className: "animate-spin" }),
        "📍 GPS দিয়ে অবস্থান নিন"
      ),
      /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500" }, "অথবা"),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex flex-wrap gap-2 justify-center max-w-xs" },
        MANUAL_LOCATIONS.map((loc) =>
          /*#__PURE__*/React.createElement(
            "button",
            {
              key: loc.id,
              type: "button",
              onClick: () => applyLocation({ lat: loc.lat, lon: loc.lon, name: loc.name, source: "manual" }),
              className: "px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-sm text-emerald-900 shadow-sm",
            },
            loc.name
          )
        )
      ),
      error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-600 mt-2" }, error)
    );
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pt-4 pb-2 flex items-start justify-between gap-2" },
      /*#__PURE__*/React.createElement(
        "div",
        null,
        /*#__PURE__*/React.createElement("div", { className: "text-sm font-bold text-emerald-950" }, formatGregorianDate(now)),
        /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500" }, formatHijriDate(now))
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex flex-col gap-1.5 items-end" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "relative" },
          /*#__PURE__*/React.createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                setGpsPanelOpen((v) => !v);
                setMadhabPanelOpen(false);
              },
              className: "text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-1 text-emerald-950",
            },
            "📍 ",
            location.source === "gps" ? "GPS চালু" : location.name,
            /*#__PURE__*/React.createElement(ChevronDown, { size: 12 })
          ),
          gpsPanelOpen &&
            /*#__PURE__*/React.createElement(
              "div",
              { className: "absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-md border border-slate-200 p-2 z-20" },
              /*#__PURE__*/React.createElement(
                "button",
                {
                  type: "button",
                  disabled: gpsBusy,
                  onClick: handleUseGps,
                  className: "w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1",
                },
                gpsBusy ? "GPS নেওয়া হচ্ছে..." : "📍 GPS দিয়ে অবস্থান নিন"
              ),
              /*#__PURE__*/React.createElement("div", { className: "h-px bg-slate-100 my-1" }),
              MANUAL_LOCATIONS.map((loc) =>
                /*#__PURE__*/React.createElement(
                  "button",
                  {
                    key: loc.id,
                    type: "button",
                    onClick: () => applyLocation({ lat: loc.lat, lon: loc.lon, name: loc.name, source: "manual" }),
                    className: "w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50",
                  },
                  loc.name
                )
              )
            )
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "relative" },
          /*#__PURE__*/React.createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                setMadhabPanelOpen((v) => !v);
                setGpsPanelOpen(false);
              },
              className: "text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-1 text-emerald-950",
            },
            "🕌 ",
            madhab === 1 ? "হানাফী" : "অন্যান্য",
            /*#__PURE__*/React.createElement(ChevronDown, { size: 12 })
          ),
          madhabPanelOpen &&
            /*#__PURE__*/React.createElement(
              "div",
              { className: "absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-md border border-slate-200 p-1 z-20" },
              /*#__PURE__*/React.createElement(
                "button",
                { type: "button", onClick: () => handleMadhabChange(1), className: "w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50" },
                "হানাফী"
              ),
              /*#__PURE__*/React.createElement(
                "button",
                { type: "button", onClick: () => handleMadhabChange(0), className: "w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50" },
                "অন্যান্য(শাফি/মালিকি/হাম্বলি)"
              )
            )
        )
      )
    ),
    approximate &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5" },
        "⚠️ ইন্টারনেট সমস্যার কারণে আনুমানিক(পুরনো cache) সময় দেখানো হচ্ছে"
      ),
    error &&
      !timings &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5" },
        error
      ),
    loading &&
      !timings &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 mb-2 text-xs text-slate-500 flex items-center gap-1.5" },
        /*#__PURE__*/React.createElement(Loader2, { size: 14, className: "animate-spin" }),
        "সময়সূচি আনা হচ্ছে..."
      ),
    waqtInfo &&
      /*#__PURE__*/React.createElement(
        "div",
        {
          className: "mx-4 mb-3 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden",
          style: { background: "linear-gradient(135deg, #0E4B43, #16302B)" },
        },
        /*#__PURE__*/React.createElement("div", { className: "text-sm opacity-90" }, `🌙 ${waqtInfo.name} ${waqtInfo.label}`),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-2xl font-bold tracking-wide mt-1", style: { fontFamily: "'IBM Plex Mono', monospace" } },
          formatCountdown(waqtInfo.target.getTime() - now.getTime())
        )
      ),
    schedule &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "px-4 grid grid-cols-2 gap-3 mb-3" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "bg-white rounded-2xl p-3 shadow-sm border border-slate-200/80" },
          /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-emerald-950 mb-1.5" }, "🕌 নামাজের সময়সূচি"),
          rows.map((r) =>
            /*#__PURE__*/React.createElement(
              "div",
              {
                key: r.key,
                className:
                  "flex items-center justify-between text-xs py-1 px-1.5 rounded-lg " +
                  (waqtInfo && waqtInfo.currentKey === r.key ? "bg-[#E8F0EE] font-bold text-emerald-950" : "text-slate-600"),
              },
              /*#__PURE__*/React.createElement("span", null, r.label),
              /*#__PURE__*/React.createElement(
                "span",
                { style: { fontFamily: "'IBM Plex Mono', monospace" } },
                r.end ? `${formatHHMM(r.start)}–${formatHHMM(r.end)}` : formatHHMM(r.start)
              )
            )
          )
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "bg-white rounded-2xl p-3 shadow-sm border border-slate-200/80" },
          /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-emerald-950 mb-1.5" }, "⛔ নিষিদ্ধ সময়"),
          forbiddenWindows.map((w) =>
            /*#__PURE__*/React.createElement(
              "div",
              { key: w.label, className: "text-xs py-1 px-1.5 text-slate-600" },
              /*#__PURE__*/React.createElement("div", null, w.label),
              /*#__PURE__*/React.createElement(
                "div",
                { style: { fontFamily: "'IBM Plex Mono', monospace" } },
                `${formatHHMM(w.start)}–${formatHHMM(w.end)}`
              )
            )
          )
        )
      ),
    otherTimes &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 mb-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden" },
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setOtherOpen((v) => !v),
            className: "w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-emerald-950",
          },
          "✨ অন্যান্য নামাজের সময়সূচি",
          /*#__PURE__*/React.createElement(ChevronDown, { size: 14, style: { transform: otherOpen ? "rotate(180deg)" : "none" } })
        ),
        otherOpen &&
          /*#__PURE__*/React.createElement(
            "div",
            { className: "px-3 pb-2 border-t border-slate-100 pt-2 flex flex-col gap-1" },
            /*#__PURE__*/React.createElement(
              "div",
              { className: "flex items-center justify-between text-xs text-slate-600" },
              /*#__PURE__*/React.createElement("span", null, "🌙 তাহাজ্জুদ"),
              /*#__PURE__*/React.createElement("span", null, `${formatHHMM(otherTimes.tahajjud.start)} – ${formatHHMM(otherTimes.tahajjud.end)}`)
            ),
            /*#__PURE__*/React.createElement(
              "div",
              { className: "flex items-center justify-between text-xs text-slate-600" },
              /*#__PURE__*/React.createElement("span", null, "☀️ দুহা"),
              /*#__PURE__*/React.createElement("span", null, `${formatHHMM(otherTimes.duha.start)} – ${formatHHMM(otherTimes.duha.end)}`)
            ),
            /*#__PURE__*/React.createElement(
              "div",
              { className: "flex items-center justify-between text-xs text-slate-600" },
              /*#__PURE__*/React.createElement("span", null, "🌤️ আওয়াবিন"),
              /*#__PURE__*/React.createElement("span", null, `${formatHHMM(otherTimes.awabin.start)} – ${formatHHMM(otherTimes.awabin.end)}`)
            )
          )
      ),
    schedule &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 px-4 py-3 flex items-center justify-between text-xs" },
        /*#__PURE__*/React.createElement("span", { className: "text-slate-600" }, `🍽️ সেহরি শেষ ${formatHHMM(schedule.fajr)}`),
        /*#__PURE__*/React.createElement("span", { className: "text-slate-600" }, `🌆 ইফতার ${formatHHMM(schedule.maghrib)}`)
      )
  );
}
