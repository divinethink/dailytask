// MonthlyPrayerSchedule.jsx — "সহায়িকা"→"ইসলামি টুলস ও ট্র্যাকিং", item ১০(3_1 Phase B)।
// একই publicToolsPrayerApi.js(data-layer, Dev Rule ২)-এর fetchMonthlyPrayerTimes()
// reuse করে — নতুন API/fetch-লজিক নেই। Location/মাযহাব publicToolsSettings.js-এর
// সাথে shared(সময়সূচি ট্যাবের সাথে একই localStorage key)।
// React global(window.React, globals.js)।

import { toBn, BN_MONTHS } from "../../legacy/appHelpers.js";
import { getSavedLocation, saveLocation, getSavedMadhab, detectGpsLocation, MANUAL_LOCATIONS } from "../../legacy/publicToolsSettings.js";
import { fetchMonthlyPrayerTimes } from "../../legacy/publicToolsPrayerApi.js";
import { ChevronLeft, ChevronRight, Loader2 } from "../icons.jsx";

const { useState, useEffect, useRef } = React;

// Aladhan timing string("04:25 (+06)")-এর টাইমজোন-অংশ বাদ দিয়ে "HH:MM" বের করে
// (publicToolsPrayerApi.js-এর cleanTimeStr()-এর একই ছোট helper, ওই ফাইল
// টাচ না করে এখানে স্বাধীনভাবে duplicate করা হলো — Zero-Risk: verified
// সময়সূচি ফাইল অপরিবর্তিত রাখা)।
function cleanTimeStr(raw) {
  if (typeof raw !== "string") return raw;
  return raw.split(" ")[0];
}

const ROW_KEYS = [
  { key: "Fajr", label: "ফজর" },
  { key: "Dhuhr", label: "যোহর" },
  { key: "Asr", label: "আসর" },
  { key: "Maghrib", label: "মাগরিব" },
  { key: "Isha", label: "ইশা" },
];

export function MonthlyPrayerSchedule() {
  const [location, setLocationState] = useState(() => getSavedLocation());
  const [gpsBusy, setGpsBusy] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [days, setDays] = useState(null);
  const [approximate, setApproximate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!location) return;
    const madhab = getSavedMadhab();
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    fetchMonthlyPrayerTimes({ lat: location.lat, lon: location.lon, madhab, year: cursor.year, month: cursor.month })
      .then((res) => {
        if (myReqId !== reqIdRef.current) return;
        setDays(res.days);
        setApproximate(!!res.approximate);
      })
      .catch((err) => {
        if (myReqId !== reqIdRef.current) return;
        setDays(null);
        setError(err && err.message ? err.message : "মাসিক সময়সূচি আনতে ব্যর্থ হয়েছে");
      })
      .finally(() => {
        if (myReqId !== reqIdRef.current) return;
        setLoading(false);
      });
  }, [location, cursor.year, cursor.month]);

  function applyLocation(loc) {
    setLocationState(loc);
    saveLocation(loc);
  }

  function handleUseGps() {
    setGpsBusy(true);
    detectGpsLocation()
      .then((loc) => applyLocation(loc))
      .catch((err) => setError(err && err.message ? err.message : "GPS অবস্থান পাওয়া যায়নি"))
      .finally(() => setGpsBusy(false));
  }

  function shiftMonth(delta) {
    setCursor((c) => {
      let m = c.month + delta;
      let y = c.year;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      return { year: y, month: m };
    });
  }

  if (!location) {
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "flex flex-col items-center justify-center px-6 text-center gap-4 py-10" },
      /*#__PURE__*/React.createElement("p", { className: "text-sm text-slate-500" }, "মাসিক সময়সূচি দেখতে অবস্থান লাগবে"),
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
      error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-600" }, error)
    );
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "px-4 pb-6" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "flex items-center justify-between mb-3" },
      /*#__PURE__*/React.createElement(
        "button",
        { type: "button", onClick: () => shiftMonth(-1), className: "p-1.5 rounded-full bg-white border border-slate-200" },
        /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 })
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-sm font-bold text-emerald-950" },
        (BN_MONTHS[cursor.month - 1] || "") + " " + toBn(cursor.year)
      ),
      /*#__PURE__*/React.createElement(
        "button",
        { type: "button", onClick: () => shiftMonth(1), className: "p-1.5 rounded-full bg-white border border-slate-200" },
        /*#__PURE__*/React.createElement(ChevronRight, { size: 16 })
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "text-xs text-slate-500 mb-2" },
      "📍 " + (location.name || "GPS অবস্থান") + (approximate ? " · আনুমানিক(cache)" : "")
    ),
    loading && /*#__PURE__*/React.createElement(
      "div",
      { className: "flex items-center justify-center py-8 text-slate-500 gap-2 text-sm" },
      /*#__PURE__*/React.createElement(Loader2, { size: 16, className: "animate-spin" }),
      "লোড হচ্ছে..."
    ),
    !loading && error && !days && /*#__PURE__*/React.createElement("p", { className: "text-sm text-red-600 text-center py-6" }, error),
    !loading && Array.isArray(days) && days.length > 0 && /*#__PURE__*/React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-x-auto" },
      /*#__PURE__*/React.createElement(
        "table",
        { className: "w-full text-xs min-w-[420px]" },
        /*#__PURE__*/React.createElement(
          "thead",
          null,
          /*#__PURE__*/React.createElement(
            "tr",
            { className: "border-b border-slate-100 text-slate-500" },
            /*#__PURE__*/React.createElement("th", { className: "py-2 px-2 text-left font-semibold" }, "তারিখ"),
            ROW_KEYS.map((r) => /*#__PURE__*/React.createElement("th", { key: r.key, className: "py-2 px-2 font-semibold" }, r.label))
          )
        ),
        /*#__PURE__*/React.createElement(
          "tbody",
          null,
          days.map((d, idx) => {
            const dayNum = d && d.date && d.date.gregorian ? d.date.gregorian.day : String(idx + 1).padStart(2, "0");
            return /*#__PURE__*/React.createElement(
              "tr",
              { key: idx, className: idx % 2 === 1 ? "bg-[#F4F7F1]/60" : "" },
              /*#__PURE__*/React.createElement("td", { className: "py-1.5 px-2 font-semibold text-emerald-950" }, toBn(Number(dayNum))),
              ROW_KEYS.map((r) =>
                /*#__PURE__*/React.createElement(
                  "td",
                  { key: r.key, className: "py-1.5 px-2 text-center", style: { fontFamily: "'IBM Plex Mono', monospace" } },
                  toBn(cleanTimeStr(d && d.timings ? d.timings[r.key] : "--:--"))
                )
              )
            );
          })
        )
      )
    )
  );
}
