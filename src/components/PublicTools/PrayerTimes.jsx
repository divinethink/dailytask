// PrayerTimes.jsx — "সময়সূচি" bottom-nav ট্যাব(Public Tools Phase A, item ২)।
// UI layout 3_2_Public_Tools_Architecture_Plan.md §৪.২ ও visual reference
// 3_3_Public_Tools_Final_Mockup.md §৫ ভিত্তিতে, ১৮ সেপ্টেম্বর ২০২৬-এ owner-feedback
// অনুযায়ী premium-redesign + accuracy fix। data/lib separation(Dev Rule ২): এই
// ফাইল কখনো সরাসরি fetch() করে না — publicToolsPrayerApi.js/publicToolsGeocode.js
// (data-layer) ব্যবহার করে। React global(window.React, globals.js)।

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
import { searchBangladeshLocation, reverseGeocodeBangladesh } from "../../legacy/publicToolsGeocode.js";
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

// ১২-ঘণ্টা ফরম্যাট, AM/PM ছাড়া(owner-instruction, ১৮ সেপ্টেম্বর ২০২৬ — দ্বিতীয়
// রাউন্ড: "am/pm তুলে দিলে ফন্ট বাড়বে, সুন্দর লাগবে")। সেহরি/ইফতার footer-এ
// আলাদাভাবে বাংলা দিনাংশ-শব্দ("ভোর"/"সন্ধ্যা") জোড়া হয়, নিচে দ্রষ্টব্য।
function formatHHMM(date) {
  if (!date) return "--:--";
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  h = h % 12;
  if (h === 0) h = 12;
  return `${toBn(h)}:${toBn(m)}`;
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

// প্রিমিয়াম countdown-banner-এর পেছনে সাজসজ্জামূলক মসজিদ-সিলুয়েট(pure inline
// SVG vector — কোনো image asset না, app-এর "হালকা/দ্রুত" নীতি অক্ষুণ্ণ রাখতে)।
function MosqueSilhouette() {
  return /*#__PURE__*/React.createElement(
    "svg",
    {
      viewBox: "0 0 400 160",
      preserveAspectRatio: "xMaxYMax slice",
      className: "absolute inset-0 w-full h-full pointer-events-none",
      style: { opacity: 0.16 },
      "aria-hidden": "true",
    },
    /*#__PURE__*/React.createElement("circle", { cx: 356, cy: 26, r: 2.5, fill: "#fff" }),
    /*#__PURE__*/React.createElement("circle", { cx: 312, cy: 14, r: 1.8, fill: "#fff" }),
    /*#__PURE__*/React.createElement("circle", { cx: 268, cy: 34, r: 1.8, fill: "#fff" }),
    /*#__PURE__*/React.createElement("rect", { x: 226, y: 64, width: 7, height: 96, fill: "#fff" }),
    /*#__PURE__*/React.createElement("circle", { cx: 229.5, cy: 60, r: 5.5, fill: "#fff" }),
    /*#__PURE__*/React.createElement("rect", { x: 372, y: 74, width: 7, height: 86, fill: "#fff" }),
    /*#__PURE__*/React.createElement("circle", { cx: 375.5, cy: 70, r: 5.5, fill: "#fff" }),
    /*#__PURE__*/React.createElement("path", { d: "M258,160 L258,112 Q258,72 300,72 Q342,72 342,112 L342,160 Z", fill: "#fff" }),
    /*#__PURE__*/React.createElement("circle", { cx: 300, cy: 64, r: 4, fill: "#fff" }),
    /*#__PURE__*/React.createElement("rect", { x: 292, y: 54, width: 3, height: 12, fill: "#fff" })
  );
}

// §লোকেশন-রো vs GPS-পিল — আলাদা icon(owner-instruction, ১৮ সেপ্টেম্বর ২০২৬): আগে
// দুই জায়গাতেই একই 📍 emoji ছিল, বিভ্রান্তিকর। এখন GPS-পিলে crosshair/target(GpsIcon)
// ও এলাকা-রো-তে classic map-pin/teardrop(PinIcon) — দুটো visually স্পষ্ট আলাদা।
function PinIcon({ size = 14, className }) {
  return /*#__PURE__*/React.createElement(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className },
    /*#__PURE__*/React.createElement("path", { d: "M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z" }),
    /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 10, r: 2.5 })
  );
}

function GpsIcon({ size = 12, className }) {
  return /*#__PURE__*/React.createElement(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className },
    /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 3 }),
    /*#__PURE__*/React.createElement("line", { x1: 12, y1: 2, x2: 12, y2: 5 }),
    /*#__PURE__*/React.createElement("line", { x1: 12, y1: 19, x2: 12, y2: 22 }),
    /*#__PURE__*/React.createElement("line", { x1: 2, y1: 12, x2: 5, y2: 12 }),
    /*#__PURE__*/React.createElement("line", { x1: 19, y1: 12, x2: 22, y2: 12 })
  );
}

function WaqtIconChip({ emoji, bg }) {
  return /*#__PURE__*/React.createElement(
    "span",
    { className: "w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0", style: { background: bg } },
    emoji
  );
}

const WAQT_CHIP = {
  fajr: { emoji: "🌅", bg: "linear-gradient(135deg,#BFE3FF,#EAF6FF)" },
  dhuhr: { emoji: "☀️", bg: "linear-gradient(135deg,#FFE9A8,#FFF6DC)" },
  asr: { emoji: "🔆", bg: "linear-gradient(135deg,#FFD59E,#FFEDD5)" },
  maghrib: { emoji: "🌇", bg: "linear-gradient(135deg,#FFB199,#FFE1D6)" },
  isha: { emoji: "🌙", bg: "linear-gradient(135deg,#C9D6E3,#EDF1F5)" },
};

export function PrayerTimes() {
  const [location, setLocationState] = useState(() => getSavedLocation());
  const [madhab, setMadhabState] = useState(() => getSavedMadhab());
  const [timings, setTimings] = useState(null);
  const [approximate, setApproximate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [madhabPanelOpen, setMadhabPanelOpen] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  // §জেলা/উপজেলা ফিল্টার(নতুন, ১৮ সেপ্টেম্বর ২০২৬, owner-instruction) — bangladeshGeoData.js
  // lazy-load হয়(শুধু panel খোলার পরে, ৪১KB dataset PrayerTimes-এর মূল chunk-কে ভারী না করতে)।
  const [geoData, setGeoData] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [filterDistrictId, setFilterDistrictId] = useState("");
  const [filterUpazilaId, setFilterUpazilaId] = useState("");
  const [filterBusy, setFilterBusy] = useState(false);
  const reqIdRef = useRef(0);
  const searchReqIdRef = useRef(0);

  // প্রতি সেকেন্ডে countdown আপডেট(existing timer-pattern reuse, 3_2 §৪.২ item ৩)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Location/মাযহাব বদলালেই দৈনিক সময়সূচি নতুন করে fetch(cache-fallback data-layer-এই হয়)
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

  // §এলাকা-সার্চ(debounced, ৫০০ms) — Nominatim usage-policy-সৌজন্যে অকারণ
  // request এড়াতে ২ অক্ষরের কম হলে বা typing চলাকালীন call হয় না।
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    const myReqId = ++searchReqIdRef.current;
    const timer = setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      searchBangladeshLocation(searchQuery)
        .then((results) => {
          if (myReqId !== searchReqIdRef.current) return;
          setSearchResults(results);
        })
        .catch(() => {
          if (myReqId !== searchReqIdRef.current) return;
          setSearchError("এলাকা খুঁজে পাওয়া যায়নি, আবার চেষ্টা করুন");
        })
        .finally(() => {
          if (myReqId !== searchReqIdRef.current) return;
          setSearchLoading(false);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // §জেলা/উপজেলা geo-dataset lazy-load — panel প্রথমবার খোলার সময়ে, অথবা
  // location এখনো সেট-না-থাকা প্রথমবার(initial no-location screen-ও একই
  // renderLocationPicker() ব্যবহার করে) — দুই ক্ষেত্রেই একবার fetch, cache(state)।
  useEffect(() => {
    if ((!locationPanelOpen && location) || geoData || geoLoading) return;
    setGeoLoading(true);
    import("../../legacy/bangladeshGeoData.js")
      .then((mod) => setGeoData({ districts: mod.BD_DISTRICTS, upazilas: mod.BD_UPAZILAS }))
      .catch(() => setGeoData(null))
      .finally(() => setGeoLoading(false));
  }, [locationPanelOpen, location, geoData, geoLoading]);

  function applyLocation(loc) {
    setLocationState(loc);
    saveLocation(loc);
    setLocationPanelOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setFilterDistrictId("");
    setFilterUpazilaId("");
  }

  // §GPS reverse-geocode(owner-instruction, ১৮ সেপ্টেম্বর ২০২৬): শুধু lat/lon
  // পাওয়ার পর Nominatim reverse দিয়ে "এলাকা, জেলা" নাম বের করা হয়(উদাহরণ:
  // "গুলশান, ঢাকা") — জেনেরিক "GPS অবস্থান" লেবেলের বদলে। reverse-geocode fail
  // করলেও lat/lon সঠিক থাকে বলে generic label-এ gracefully fallback করে(সময়সূচি
  // ভুল হয় না, শুধু লেবেল কম-informative থাকে)।
  function handleUseGps() {
    setGpsBusy(true);
    detectGpsLocation()
      .then((loc) =>
        reverseGeocodeBangladesh(loc.lat, loc.lon)
          .then((name) => applyLocation({ ...loc, name }))
          .catch(() => applyLocation(loc))
      )
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

  // §জেলা/উপজেলা ফিল্টার প্রয়োগ(নতুন, owner-instruction) — জেলা-শুধু বাছাই হলে
  // সরকারি DC-office lat/lon(bangladeshGeoData.js) সরাসরি ব্যবহার হয়(কোনো extra
  // API-call লাগে না); উপজেলা-সহ বাছাই হলে Nominatim দিয়ে সেই নির্দিষ্ট উপজেলার
  // সঠিক lat/lon আনা হয়(fail করলে জেলা-কেন্দ্রের coordinate-এ gracefully fallback,
  // ইউজার কখনো আটকে যাবে না)।
  function applyFilterSelection() {
    if (!geoData || !filterDistrictId) return;
    const district = geoData.districts.find((d) => d.id === filterDistrictId);
    if (!district) return;
    if (!filterUpazilaId) {
      applyLocation({ lat: district.lat, lon: district.lon, name: district.name, source: "filter" });
      return;
    }
    const upazila = geoData.upazilas.find((u) => u.id === filterUpazilaId);
    if (!upazila) return;
    const combinedName = `${upazila.name}, ${district.name}`;
    setFilterBusy(true);
    searchBangladeshLocation(`${upazila.name}, ${district.name}`)
      .then((results) => {
        if (results.length > 0) applyLocation({ ...results[0], name: combinedName });
        else applyLocation({ lat: district.lat, lon: district.lon, name: combinedName, source: "filter" });
      })
      .catch(() => applyLocation({ lat: district.lat, lon: district.lon, name: combinedName, source: "filter" }))
      .finally(() => setFilterBusy(false));
  }

  // §৪.১ bonus-derive — পূর্ণ schedule(আজকের সব ওয়াক্ত+সংশ্লিষ্ট time)
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
    // পরদিনের ফজর — নতুন API-call এড়াতে আজকের ফজর-সময়ই পরদিনের জন্য approximate
    // হিসেবে ব্যবহৃত(কয়েক মিনিটের farok থাকতে পারে, "আনুমানিক" স্পিরিট)।
    const nextFajr = addMinutes(fajr, 24 * 60);
    return { fajr, sunrise, dhuhr, asr, sunset, maghrib, isha, nextFajr };
  }, [timings]);

  // বর্তমান/পরবর্তী ওয়াক্ত(countdown banner) + list-highlight
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

  // §রমজান সেহরি/ইফতার countdown — data-layer/schema(owner-instruction, ১৮
  // সেপ্টেম্বর ২০২৬): "রমজান মাস আসলে এই পেজেই ইফতার ও সেহরি কাউন্টডাউন দেখানোর
  // অপশন রাখতে হবে, পর্যাপ্ত data layer/schema রাখবেন"। হিজরি মাস "রমজান"(existing
  // getHijriDate()/HIJRI_MONTHS_BN reuse, appHelpers.js) হলেই স্বয়ংক্রিয়ভাবে সক্রিয়
  // হবে — কোনো manual toggle/flag লাগে না, এখন(hijri মাস রমজান না) কিছুই render
  // করবে না(null), তাই বর্তমান UI অপরিবর্তিত থাকে। রমজান মাস এলে schedule.fajr/
  // schedule.maghrib থেকেই সরাসরি derive হবে(নতুন API/storage লাগবে না)।
  const hijriNow = useMemo(() => getHijriDate(now), [now]);
  const isRamadan = hijriNow.month === "রমজান";
  const ramadanCountdown = useMemo(() => {
    if (!isRamadan || !schedule) return null;
    const { fajr, maghrib, nextFajr } = schedule;
    if (now < fajr) return { label: "সেহরি শেষ হতে বাকি", target: fajr };
    if (now < maghrib) return { label: "ইফতার হতে বাকি", target: maghrib };
    return { label: "সেহরি শেষ হতে বাকি", target: nextFajr };
  }, [isRamadan, schedule, now]);

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

  // §Owner-instruction(১৮ সেপ্টেম্বর): তাহাজ্জুদ+ইশরাক+চাশত+আওয়াবিন — কলাপসিবল
  // বাদ, সবসময় visible। ইশরাক(সূর্যোদয়ের অল্প পরে, ছোট window) ও চাশত(তার পরে
  // যোহরের আগ পর্যন্ত) আলাদা করে দেখানো হচ্ছে(আগে একত্রে "দুহা" ছিল)।
  const otherTimes = useMemo(() => {
    if (!schedule) return null;
    const { sunrise, dhuhr, maghrib, isha, nextFajr } = schedule;
    const nightMs = nextFajr.getTime() - isha.getTime();
    const tahajjudStart = new Date(isha.getTime() + nightMs * (2 / 3));
    const ishraqStart = addMinutes(sunrise, 20);
    const ishraqEnd = addMinutes(sunrise, 40);
    const chashtEnd = addMinutes(dhuhr, -10);
    return {
      tahajjud: { start: tahajjudStart, end: nextFajr },
      ishraq: { start: ishraqStart, end: ishraqEnd },
      chasht: { start: ishraqEnd, end: chashtEnd },
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

  // ---- এলাকা-সার্চ+quick-shortcut+GPS — একই panel initial-state ও header দুই
  // জায়গাতেই reuse হয়(§Nominatim-নোট, publicToolsGeocode.js) ----
  function renderLocationPicker() {
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "flex flex-col gap-2 w-full" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          disabled: gpsBusy,
          onClick: handleUseGps,
          className:
            "h-10 px-4 rounded-xl font-bold text-white text-sm bg-emerald-900 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50",
        },
        gpsBusy && /*#__PURE__*/React.createElement(Loader2, { size: 15, className: "animate-spin" }),
        "📍 GPS দিয়ে সঠিক অবস্থান নিন"
      ),
      // §জেলা/উপজেলা ফিল্টার(নতুন) — cascading dropdown, geoData lazy-loaded
      /*#__PURE__*/React.createElement(
        "div",
        { className: "border-t border-slate-100 pt-2 flex flex-col gap-1.5" },
        /*#__PURE__*/React.createElement("div", { className: "text-[11px] text-slate-400 px-1" }, "ফিল্টার করে বাছাই করুন:"),
        geoLoading &&
          /*#__PURE__*/React.createElement(
            "div",
            { className: "text-xs text-slate-500 flex items-center gap-1.5 px-1" },
            /*#__PURE__*/React.createElement(Loader2, { size: 12, className: "animate-spin" }),
            "জেলার তালিকা আনা হচ্ছে..."
          ),
        geoData &&
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex gap-1.5" },
            /*#__PURE__*/React.createElement(
              "select",
              {
                value: filterDistrictId,
                onChange: (e) => {
                  setFilterDistrictId(e.target.value);
                  setFilterUpazilaId("");
                },
                className: "flex-1 h-9 px-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white",
              },
              /*#__PURE__*/React.createElement("option", { value: "" }, "জেলা বাছাই করুন"),
              geoData.districts.map((d) => /*#__PURE__*/React.createElement("option", { key: d.id, value: d.id }, d.name))
            ),
            /*#__PURE__*/React.createElement(
              "select",
              {
                value: filterUpazilaId,
                disabled: !filterDistrictId,
                onChange: (e) => setFilterUpazilaId(e.target.value),
                className: "flex-1 h-9 px-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white disabled:opacity-50",
              },
              /*#__PURE__*/React.createElement("option", { value: "" }, "উপজেলা(ঐচ্ছিক)"),
              geoData.upazilas
                .filter((u) => u.districtId === filterDistrictId)
                .map((u) => /*#__PURE__*/React.createElement("option", { key: u.id, value: u.id }, u.name))
            )
          ),
        geoData &&
          filterDistrictId &&
          /*#__PURE__*/React.createElement(
            "button",
            {
              type: "button",
              disabled: filterBusy,
              onClick: applyFilterSelection,
              className: "h-9 rounded-lg bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50",
            },
            filterBusy && /*#__PURE__*/React.createElement(Loader2, { size: 12, className: "animate-spin" }),
            "এই এলাকা নির্বাচন করুন"
          )
      ),
      /*#__PURE__*/React.createElement("div", { className: "text-[11px] text-slate-400 px-1 pt-1" }, "অথবা লিখে সার্চ করুন:"),
      /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: searchQuery,
        onChange: (e) => setSearchQuery(e.target.value),
        placeholder: "এলাকা/উপজেলা/জেলার নাম লিখুন...",
        className: "h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700",
      }),
      searchLoading &&
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-xs text-slate-500 flex items-center gap-1.5 px-1" },
          /*#__PURE__*/React.createElement(Loader2, { size: 12, className: "animate-spin" }),
          "খোঁজা হচ্ছে..."
        ),
      searchError && /*#__PURE__*/React.createElement("div", { className: "text-xs text-red-600 px-1" }, searchError),
      searchResults.length > 0 &&
        /*#__PURE__*/React.createElement(
          "div",
          { className: "flex flex-col gap-0.5 max-h-40 overflow-y-auto border border-slate-100 rounded-xl" },
          searchResults.map((r, i) =>
            /*#__PURE__*/React.createElement(
              "button",
              {
                key: i,
                type: "button",
                onClick: () => applyLocation(r),
                className: "text-left text-xs px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-b-0",
              },
              r.name
            )
          )
        ),
      /*#__PURE__*/React.createElement("div", { className: "text-[11px] text-slate-400 px-1" }, "অথবা জনপ্রিয় শহর:"),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex flex-wrap gap-1.5" },
        MANUAL_LOCATIONS.map((loc) =>
          /*#__PURE__*/React.createElement(
            "button",
            {
              key: loc.id,
              type: "button",
              onClick: () => applyLocation({ lat: loc.lat, lon: loc.lon, name: loc.name, source: "manual" }),
              className: "px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-emerald-900",
            },
            loc.name
          )
        )
      )
    );
  }

  // ---- Location সেটআপ এখনো করা হয়নি(প্রথমবার) ----
  if (!location) {
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "min-h-screen pb-24 bg-[#F4F7F1] flex flex-col items-center justify-center px-6 text-center gap-4" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-lg font-semibold", style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" } },
        "সালাতের সময়সূচি দেখতে অবস্থান লাগবে"
      ),
      /*#__PURE__*/React.createElement("div", { className: "w-full max-w-xs" }, renderLocationPicker()),
      error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-600 mt-1" }, error)
    );
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pt-3 pb-1 flex items-start justify-between gap-2" },
      /*#__PURE__*/React.createElement(
        "div",
        null,
        /*#__PURE__*/React.createElement("div", { className: "text-sm font-bold text-emerald-950" }, formatGregorianDate(now)),
        /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-500" }, formatHijriDate(now))
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex flex-col gap-1.5 items-end" },
        // §GPS পিল — এখন ফিল্টার/সার্চ-সহ একই panel খোলে(owner-instruction: "জিপিএস
        // চিহ্নেই ফিল্টার অপশন যুক্ত করা হোক", আগে এটা সরাসরি GPS-detect ট্রিগার
        // করত, লোকেশন-রো থেকে আলাদা ছিল — এখন দুটোই একই একক panel-এ consolidate)।
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              setLocationPanelOpen((v) => !v);
              setMadhabPanelOpen(false);
            },
            className:
              "text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-1 " +
              (location.source === "gps" ? "text-emerald-700 font-bold" : "text-slate-500"),
          },
          /*#__PURE__*/React.createElement(GpsIcon, { size: 12 }),
          location.source === "gps" ? "GPS চালু" : "GPS"
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
                setLocationPanelOpen(false);
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
    // §Location row(3_2 §৪.২ item ২) — GPS-পিলের একই panel খোলে(consolidated)।
    // ২-লাইন প্রদর্শন(owner-instruction): নাম কমা দিয়ে split করে প্রথম অংশ(এলাকা)
    // বড়+বোল্ড লাইনে, বাকি অংশ(উপজেলা/জেলা) ছোট ধূসর লাইনে — যেমন "গুলশান" /
    // "ঢাকা"। কমা না থাকলে(যেমন quick-shortcut শহরের নাম) স্বাভাবিকভাবে এক-লাইনই থাকে।
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pb-1.5 relative" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setLocationPanelOpen((v) => !v);
            setMadhabPanelOpen(false);
          },
          className: "flex items-center gap-1.5 text-left",
        },
        /*#__PURE__*/React.createElement(PinIcon, { size: 15, className: "text-emerald-800 shrink-0" }),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "leading-tight" },
          /*#__PURE__*/React.createElement("div", { className: "text-sm text-emerald-950 font-semibold" }, (location.name || "").split(",")[0].trim()),
          (location.name || "").split(",").length > 1 &&
            /*#__PURE__*/React.createElement(
              "div",
              { className: "text-[11px] text-slate-500" },
              (location.name || "").split(",").slice(1).join(",").trim()
            )
        ),
        /*#__PURE__*/React.createElement(ChevronDown, { size: 13, style: { transform: locationPanelOpen ? "rotate(180deg)" : "none" } })
      ),
      locationPanelOpen &&
        /*#__PURE__*/React.createElement(
          "div",
          { className: "absolute left-4 right-4 mt-2 bg-white rounded-2xl shadow-md border border-slate-200 p-3 z-20 max-h-[70vh] overflow-y-auto" },
          renderLocationPicker()
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
          className: "mx-4 mb-2 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden min-h-[92px] flex flex-col justify-center border border-[#C89B3C]/50 shadow-[0_0_12px_rgba(200,155,60,0.35)]",
          style: { background: "linear-gradient(135deg, #0E4B43, #16302B)" },
        },
        /*#__PURE__*/React.createElement(MosqueSilhouette, null),
        /*#__PURE__*/React.createElement("div", { className: "relative text-sm opacity-90" }, `🌙 ${waqtInfo.name} ${waqtInfo.label}`),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "relative text-2xl font-bold tracking-wide mt-1", style: { fontFamily: "'IBM Plex Mono', monospace" } },
          formatCountdown(waqtInfo.target.getTime() - now.getTime())
        )
      ),
    // §রমজান সেহরি/ইফতার countdown(schema উপরে, isRamadan true হলেই সক্রিয় —
    // এখন hijri মাস রমজান না বলে null, কিছুই render হয় না)। ভিন্ন gradient(সোনালী/
    // বেগুনি) দিয়ে মূল ওয়াক্ত-banner থেকে visually আলাদা রাখা হয়েছে।
    ramadanCountdown &&
      /*#__PURE__*/React.createElement(
        "div",
        {
          className: "mx-4 mb-2 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden min-h-[80px] flex flex-col justify-center border border-[#C89B3C]/60 shadow-[0_0_12px_rgba(200,155,60,0.4)]",
          style: { background: "linear-gradient(135deg, #4A2E6B, #2B1A45)" },
        },
        /*#__PURE__*/React.createElement("div", { className: "relative text-sm opacity-90" }, `🌙 রমজান · ${ramadanCountdown.label}`),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "relative text-2xl font-bold tracking-wide mt-1", style: { fontFamily: "'IBM Plex Mono', monospace" } },
          formatCountdown(ramadanCountdown.target.getTime() - now.getTime())
        )
      ),
    // §Owner-instruction(১৮ সেপ্টেম্বর): সালাতের সময়সূচি কার্ড চওড়া(col-span-3)+
    // বড় ফন্ট, নিষিদ্ধ সময় কার্ড সরু(col-span-2)
    schedule &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "px-4 grid grid-cols-5 gap-2 mb-2" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "col-span-3 bg-white rounded-2xl p-2.5 border border-[#C89B3C]/50 shadow-[0_0_10px_rgba(200,155,60,0.35)]" },
          /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-emerald-950 mb-1" }, "🕌 সালাতের সময়সূচি"),
          rows.map((r) =>
            /*#__PURE__*/React.createElement(
              "div",
              {
                key: r.key,
                className:
                  "flex items-center gap-1.5 text-xs py-1 px-1 rounded-lg " +
                  (waqtInfo && waqtInfo.currentKey === r.key ? "bg-[#E8F0EE] font-bold text-emerald-950" : "text-slate-700"),
              },
              /*#__PURE__*/React.createElement(WaqtIconChip, WAQT_CHIP[r.key]),
              /*#__PURE__*/React.createElement("span", { className: "flex-1" }, r.label),
              /*#__PURE__*/React.createElement(
                "span",
                { className: "text-xs whitespace-nowrap", style: { fontFamily: "'IBM Plex Mono', monospace" } },
                r.end ? `${formatHHMM(r.start)}–${formatHHMM(r.end)}` : formatHHMM(r.start)
              )
            )
          )
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "col-span-2 bg-white rounded-2xl p-2 border border-[#C89B3C]/50 shadow-[0_0_10px_rgba(200,155,60,0.35)]" },
          /*#__PURE__*/React.createElement("div", { className: "text-[11px] font-bold text-emerald-950 mb-1" }, "⛔ নিষিদ্ধ সময়"),
          forbiddenWindows.map((w) =>
            /*#__PURE__*/React.createElement(
              "div",
              { key: w.label, className: "text-[11px] py-0.5 px-0.5 text-slate-600" },
              /*#__PURE__*/React.createElement("div", null, w.label),
              /*#__PURE__*/React.createElement(
                "div",
                { className: "whitespace-nowrap", style: { fontFamily: "'IBM Plex Mono', monospace" } },
                `${formatHHMM(w.start)}–${formatHHMM(w.end)}`
              )
            )
          )
        )
      ),
    // §Owner-instruction: কলাপসিবল বাদ, সবসময় visible, ইশরাক+চাশত যোগ
    otherTimes &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 mb-2 bg-white rounded-2xl border border-[#C89B3C]/50 shadow-[0_0_10px_rgba(200,155,60,0.35)] overflow-hidden" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "px-3 pt-2 pb-1 text-xs font-bold text-emerald-950" },
          "✨ অন্যান্য সালাতের সময়সূচি"
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "px-3 pb-2 grid grid-cols-2 gap-x-2 gap-y-0.5" },
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex items-center justify-between text-[11px] text-slate-600 whitespace-nowrap" },
            /*#__PURE__*/React.createElement("span", null, "🌙 তাহাজ্জুদ"),
            /*#__PURE__*/React.createElement("span", null, `${formatHHMM(otherTimes.tahajjud.start)}–${formatHHMM(otherTimes.tahajjud.end)}`)
          ),
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex items-center justify-between text-[11px] text-slate-600 whitespace-nowrap" },
            /*#__PURE__*/React.createElement("span", null, "🌤️ ইশরাক"),
            /*#__PURE__*/React.createElement("span", null, `${formatHHMM(otherTimes.ishraq.start)}–${formatHHMM(otherTimes.ishraq.end)}`)
          ),
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex items-center justify-between text-[11px] text-slate-600 whitespace-nowrap" },
            /*#__PURE__*/React.createElement("span", null, "☀️ চাশত"),
            /*#__PURE__*/React.createElement("span", null, `${formatHHMM(otherTimes.chasht.start)}–${formatHHMM(otherTimes.chasht.end)}`)
          ),
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex items-center justify-between text-[11px] text-slate-600 whitespace-nowrap" },
            /*#__PURE__*/React.createElement("span", null, "🌤️ আওয়াবিন"),
            /*#__PURE__*/React.createElement("span", null, `${formatHHMM(otherTimes.awabin.start)}–${formatHHMM(otherTimes.awabin.end)}`)
          )
        )
      ),
    // §Owner-instruction: "সেহরির শেষ সময়:"/"আজকের ইফতার:" wording — ২-কলাম
    // mini-card(icon+label+time স্ট্যাক করা) যাতে লম্বা টেক্সট রো-wrap করে
    // উচ্চতা না বাড়ায়(আগের এক-লাইন justify-between ভার্সনে narrow স্ক্রিনে wrap
    // হয়ে scroll-issue তৈরি করছিল — owner-reported, ১৮ সেপ্টেম্বর ২০২৬)।
    schedule &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 grid grid-cols-2 gap-2" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "rounded-xl px-2.5 py-2 flex items-center gap-2 overflow-hidden border border-[#C89B3C]/50 shadow-[0_0_8px_rgba(200,155,60,0.3)]", style: { background: "#E8F0EE" } },
          /*#__PURE__*/React.createElement(WaqtIconChip, { emoji: "🍽️", bg: "#fff" }),
          /*#__PURE__*/React.createElement(
            "div",
            { className: "min-w-0" },
            /*#__PURE__*/React.createElement("div", { className: "text-[9px] text-emerald-700 leading-tight" }, "সেহরির সময়:"),
            /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-emerald-900 whitespace-nowrap" }, `ভোর ${formatHHMM(schedule.fajr)}`)
          )
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "rounded-xl px-2.5 py-2 flex items-center gap-2 overflow-hidden border border-[#C89B3C]/50 shadow-[0_0_8px_rgba(200,155,60,0.3)]", style: { background: "#FDF1E4" } },
          /*#__PURE__*/React.createElement(WaqtIconChip, { emoji: "🌆", bg: "#fff" }),
          /*#__PURE__*/React.createElement(
            "div",
            { className: "min-w-0" },
            /*#__PURE__*/React.createElement("div", { className: "text-[9px] text-amber-700 leading-tight" }, "ইফতারের সময়:"),
            /*#__PURE__*/React.createElement("div", { className: "text-xs font-bold text-amber-900 whitespace-nowrap" }, `সন্ধ্যা ${formatHHMM(schedule.maghrib)}`)
          )
        )
      )
  );
}
