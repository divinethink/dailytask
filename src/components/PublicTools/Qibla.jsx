// Qibla.jsx — "সহায়িকা"→"ইসলামি টুলস ও ট্র্যাকিং" ক্যাটাগরির item(3_2 §৫)।
// Location(GPS/manual) publicToolsSettings.js-এর সাথে shared(PrayerTimes.jsx-এর
// একই key, dt_pt_location) — সময়সূচি ট্যাবে location সেট থাকলে এখানে আলাদা করে
// আবার সেট করতে হয় না।
// §লাইভ কম্পাস(নতুন, ১৮ সেপ্টেম্বর ২০২৬, owner-instruction — "স্ট্যান্ডার্ড কিবলা
// কম্পাস দেখানো সম্ভব?")। standard browser `DeviceOrientationEvent` API ব্যবহার
// করা হয়েছে(কোনো নতুন external service/dependency না — pure on-device sensor,
// Dev Rule ২-এর "external service" concern এখানে প্রযোজ্য না)। iOS 13+-এ
// `requestPermission()` user-gesture(বাটন-ক্লিক) থেকেই কল করা আবশ্যক(browser
// restriction) — তাই বাটন-চাপার আগে auto-start করা হয়নি। সেন্সর/permission না
// পেলে আগের static bearing-arrow-এ gracefully fallback করে(heading=null হলে
// dial rotation=0, ঠিক আগের আচরণের সমান)।
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

const { useState, useMemo, useEffect } = React;

// ১২টা টিক-মার্ক(৩০° পরপর) + N/E/S/W লেবেলের position — pure-trig, static-icon
// pattern থেকে আলাদা(এখানে component render-এর ভিতরেই সরল হিসাব, নতুন কোনো
// dependency লাগে না)।
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = i * 30;
  const rad = (angle * Math.PI) / 180;
  const outerR = 96;
  const innerR = angle % 90 === 0 ? 84 : 89;
  return {
    x1: 100 + outerR * Math.sin(rad),
    y1: 100 - outerR * Math.cos(rad),
    x2: 100 + innerR * Math.sin(rad),
    y2: 100 - innerR * Math.cos(rad),
    major: angle % 90 === 0,
  };
});
const CARDINALS = [
  { label: "উত্তর", angle: 0, color: "#D64545" },
  { label: "পূর্ব", angle: 90, color: "#8A9A8F" },
  { label: "দক্ষিণ", angle: 180, color: "#8A9A8F" },
  { label: "পশ্চিম", angle: 270, color: "#8A9A8F" },
];

export function Qibla() {
  const [location, setLocationState] = useState(() => getSavedLocation());
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState(null);
  const [compassActive, setCompassActive] = useState(false);
  const [heading, setHeading] = useState(null);
  const [compassError, setCompassError] = useState(null);

  const bearing = useMemo(() => {
    if (!location) return null;
    return calculateQiblaBearing(location.lat, location.lon);
  }, [location]);

  // লাইভ heading listener — শুধু compassActive true হলেই সংযুক্ত হয়(permission
  // দেওয়ার পরে)। iOS Safari: event.webkitCompassHeading(০=উত্তর, clockwise,
  // সরাসরি ব্যবহারযোগ্য)। Android Chrome: event.alpha(০=উত্তর, counter-clockwise)
  // — তাই 360-alpha দিয়ে clockwise-এ convert করা হয়েছে।
  useEffect(() => {
    if (!compassActive) return;
    function handleOrientation(e) {
      let h = null;
      if (typeof e.webkitCompassHeading === "number") {
        h = e.webkitCompassHeading;
      } else if (typeof e.alpha === "number") {
        h = 360 - e.alpha;
      }
      if (h != null && !Number.isNaN(h)) setHeading(((h % 360) + 360) % 360);
    }
    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, handleOrientation, true);
    return () => window.removeEventListener(eventName, handleOrientation, true);
  }, [compassActive]);

  function requestCompassAccess() {
    setCompassError(null);
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) {
      setCompassError("এই ব্রাউজারে লাইভ কম্পাস সাপোর্ট নেই — নিচের স্থির কোণ ব্যবহার করুন");
      return;
    }
    if (typeof DOE.requestPermission === "function") {
      // iOS 13+ — user-gesture-এর ভিতর থেকেই কল হতে হবে(এই ফাংশন বাটন onClick-এই কল হয়)
      DOE.requestPermission()
        .then((state) => {
          if (state === "granted") setCompassActive(true);
          else setCompassError("কম্পাস ব্যবহারের অনুমতি দেওয়া হয়নি(ব্রাউজার সেটিংস থেকে অনুমতি দিন)");
        })
        .catch(() => setCompassError("কম্পাস চালু করা যায়নি"));
    } else {
      setCompassActive(true);
    }
  }

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

  const dialRotation = heading != null ? -heading : 0;

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
    !compassActive &&
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: requestCompassAccess,
          className: "h-10 px-4 rounded-xl font-bold text-white text-xs bg-emerald-900 flex items-center gap-2 shadow-sm",
        },
        "🧭 লাইভ কম্পাস চালু করুন"
      ),
    compassActive &&
      heading == null &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-[11px] text-slate-500 flex items-center gap-1.5" },
        /*#__PURE__*/React.createElement(Loader2, { size: 12, className: "animate-spin" }),
        "সেন্সর থেকে দিক পড়া হচ্ছে..."
      ),
    compassError && /*#__PURE__*/React.createElement("p", { className: "text-[11px] text-red-600 text-center max-w-xs" }, compassError),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "relative w-56 h-56 flex items-center justify-center" },
      /*#__PURE__*/React.createElement(
        "svg",
        { viewBox: "0 0 200 200", className: "w-full h-full" },
        /*#__PURE__*/React.createElement("circle", {
          cx: 100, cy: 100, r: 96, fill: "#FFFFFF", stroke: "#E4E7E2", strokeWidth: 2,
        }),
        // লাইভ heading অনুযায়ী পুরো dial(tick+N/E/S/W+needle) ঘোরে — heading
        // না থাকলে(fallback) rotation=0, আগের static আচরণের সাথে হুবহু মেলে।
        /*#__PURE__*/React.createElement(
          "g",
          { transform: `rotate(${dialRotation} 100 100)`, style: { transition: "transform 0.15s linear" } },
          TICKS.map((t, i) =>
            /*#__PURE__*/React.createElement("line", {
              key: i, x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2,
              stroke: t.major ? "#5B6B64" : "#C7D0CB", strokeWidth: t.major ? 2 : 1, strokeLinecap: "round",
            })
          ),
          CARDINALS.map((c) => {
            const rad = (c.angle * Math.PI) / 180;
            const x = 100 + 72 * Math.sin(rad);
            const y = 100 - 72 * Math.cos(rad) + 5;
            return /*#__PURE__*/React.createElement(
              "text",
              { key: c.label, x, y, textAnchor: "middle", fontSize: 13, fontWeight: "bold", fill: c.color },
              c.label
            );
          }),
          // কাবামুখী তীর — dial-এর নিজস্ব coordinate-এ bearing° fixed(dial নিজে
          // heading অনুযায়ী ঘোরে বলে screen-এ effective rotation = bearing-heading)
          /*#__PURE__*/React.createElement(
            "g",
            { transform: `rotate(${bearing} 100 100)` },
            /*#__PURE__*/React.createElement("line", {
              x1: 100, y1: 100, x2: 100, y2: 28, stroke: "#0E4B43", strokeWidth: 5, strokeLinecap: "round",
            }),
            /*#__PURE__*/React.createElement("polygon", {
              points: "100,14 90,34 110,34", fill: "#C89B3C",
            })
          )
        ),
        /*#__PURE__*/React.createElement("circle", { cx: 100, cy: 100, r: 5, fill: "#0E4B43" })
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "text-center" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-3xl font-bold", style: { fontFamily: "'Hind Siliguri', sans-serif", color: "var(--theme-primary, #0E4B43)" } },
        toBn(Math.round(bearing)) + "°"
      ),
      /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500 mt-1" }, "উত্তর থেকে কাবামুখী কোণ")
    ),
    /*#__PURE__*/React.createElement(
      "p",
      { className: "text-xs text-slate-400 text-center max-w-xs" },
      compassActive
        ? "সবুজ তীর যেদিকে নির্দেশ করছে, সেদিকেই কাবা — ফোন ঘোরালে তীর নিজে থেকেই সঠিক দিক দেখাবে।"
        : "মোবাইল-কম্পাসের সাথে মিলিয়ে এই দিকে ঘুরুন, অথবা উপরে \"লাইভ কম্পাস চালু করুন\"-এ চাপুন।"
    )
  );
}
