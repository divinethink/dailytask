// Qibla.jsx — "সহায়িকা"→"ইসলামি টুলস ও ট্র্যাকিং" ক্যাটাগরির item(3_2 §৫)।
// Location(GPS/manual) publicToolsSettings.js-এর সাথে shared(PrayerTimes.jsx-এর
// একই key, dt_pt_location) — সময়সূচি ট্যাবে location সেট থাকলে এখানে আলাদা করে
// আবার সেট করতে হয় না। Live device-compass ব্যবহার হয় না(static bearing-arrow)।
// React global(window.React, globals.js)।

import { toBn } from "../../legacy/appHelpers.js";
import {
  getSavedLocation,
  saveLocation,
  detectGpsLocation,
  MANUAL_LOCATIONS,
} from "../../legacy/publicToolsSettings.js";
import { calculateQiblaBearing } from "../../legacy/publicToolsQibla.js";
import { Loader2 } from "../icons.jsx";

const { useState, useMemo } = React;

export function Qibla() {
  const [location, setLocationState] = useState(() => getSavedLocation());
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState(null);

  const bearing = useMemo(() => {
    if (!location) return null;
    return calculateQiblaBearing(location.lat, location.lon);
  }, [location]);

  function applyLocation(loc) {
    setLocationState(loc);
    saveLocation(loc);
    setError(null);
  }

  function handleUseGps() {
    setGpsBusy(true);
    setError(null);
    detectGpsLocation()
      .then((loc) => applyLocation(loc))
      .catch((err) => setError(err && err.message ? err.message : "GPS অবস্থান পাওয়া যায়নি"))
      .finally(() => setGpsBusy(false));
  }

  if (!location) {
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "flex flex-col items-center justify-center px-6 text-center gap-4 py-10" },
      /*#__PURE__*/React.createElement(
        "p",
        { className: "text-sm text-slate-500" },
        "কিবলা দেখতে অবস্থান লাগবে"
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
      error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-600" }, error)
    );
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex flex-col items-center gap-4 px-6 py-6" },
    /*#__PURE__*/React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setLocationState(null),
        className: "text-xs text-slate-500 underline",
      },
      "📍 ",
      location.name || "GPS অবস্থান",
      " · অবস্থান বদলান"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "relative w-56 h-56 flex items-center justify-center" },
      /*#__PURE__*/React.createElement(
        "svg",
        { viewBox: "0 0 200 200", className: "w-full h-full" },
        /*#__PURE__*/React.createElement("circle", {
          cx: 100, cy: 100, r: 96, fill: "#FFFFFF", stroke: "#E4E7E2", strokeWidth: 2,
        }),
        /*#__PURE__*/React.createElement("text", {
          x: 100, y: 22, textAnchor: "middle", fontSize: 14, fontWeight: "bold", fill: "#8A9A8F",
        }, "উত্তর"),
        // কাবামুখী তীর — bearing অনুযায়ী rotate(০° = উত্তর, clockwise)
        /*#__PURE__*/React.createElement(
          "g",
          { transform: `rotate(${bearing} 100 100)` },
          /*#__PURE__*/React.createElement("line", {
            x1: 100, y1: 100, x2: 100, y2: 28, stroke: "#0E4B43", strokeWidth: 5, strokeLinecap: "round",
          }),
          /*#__PURE__*/React.createElement("polygon", {
            points: "100,14 90,34 110,34", fill: "#C89B3C",
          })
        ),
        /*#__PURE__*/React.createElement("circle", { cx: 100, cy: 100, r: 5, fill: "#0E4B43" })
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "text-center" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-3xl font-bold", style: { fontFamily: "'IBM Plex Mono', monospace", color: "var(--theme-primary, #0E4B43)" } },
        toBn(Math.round(bearing)) + "°"
      ),
      /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500 mt-1" }, "উত্তর থেকে কাবামুখী কোণ")
    ),
    /*#__PURE__*/React.createElement(
      "p",
      { className: "text-xs text-slate-400 text-center max-w-xs" },
      "মোবাইল-কম্পাসের সাথে মিলিয়ে এই দিকে ঘুরুন। কোনো লাইভ ডিভাইস-কম্পাস এখানে ব্যবহার হয়নি — শুধু স্থানাঙ্ক অনুযায়ী হিসাবকৃত কোণ।"
    )
  );
}
