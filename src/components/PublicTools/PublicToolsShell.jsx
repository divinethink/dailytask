// PublicToolsShell.jsx — "সহায়িকা" bottom-nav ট্যাব(Phase A item ৫)। ৬-ক্যাটাগরি
// grid(3_1 গ্রুপিং-টেবিল/3_2 §২.২/3_3 §৭)। সাধারণ item(Qibla/ZakatCalculator
// ইত্যাদি) ট্যাপে এই শেল নিজেই back+title header দেখিয়ে ActiveComponent বসায়।
// একক-এন্ট্রি ক্যাটাগরি(কুইজ/ব্লগ) ব্যতিক্রম — এরা নিজস্ব পূর্ণাঙ্গ
// header+back-navigation বহন করে(BlogSection.jsx/QuizSection.jsx), তাই শেল
// generic wrapper না বসিয়ে সরাসরি component render করে, শুধু onBack prop
// দিয়ে(SINGLE_ENTRY_COMPONENTS, নিচে)।
// React global(window.React, globals.js)।

import { ChevronRight, ChevronLeft } from "../icons.jsx";
import { Qibla } from "./Qibla.jsx";
import { MonthlyPrayerSchedule } from "./MonthlyPrayerSchedule.jsx";
import { ZakatCalculator } from "./ZakatCalculator.jsx";
import { FitraCalculator } from "./FitraCalculator.jsx";
import { SadaqaLog } from "./SadaqaLog.jsx";
import { QuizSection } from "./Quiz/QuizSection.jsx";
import { BlogSection } from "./Blog/BlogSection.jsx";
import { LearnSalahGuide } from "./LearnSalahGuide.jsx";
import { PrayerImportance } from "./PrayerImportance.jsx";
import { SahuSijdahGuide } from "./SahuSijdahGuide.jsx";
import { QasrPrayerGuide } from "./QasrPrayerGuide.jsx";
import { JanazahPrayerGuide } from "./JanazahPrayerGuide.jsx";
import { WuduGuide } from "./WuduGuide.jsx";
import { GhuslGuide } from "./GhuslGuide.jsx";
import { TayammumGuide } from "./TayammumGuide.jsx";
import { IstikharaGuide } from "./IstikharaGuide.jsx";
import { ParaIndex } from "./ParaIndex.jsx";
import { JumuahAmol } from "./JumuahAmol.jsx";
import { RamadanPrep } from "./RamadanPrep.jsx";
import { EidPrayerGuide } from "./EidPrayerGuide.jsx";
import { QurbaniGuide } from "./QurbaniGuide.jsx";
import { HajjGuide } from "./HajjGuide.jsx";
import { HijriImportantDays } from "./HijriImportantDays.jsx";

const { useState } = React;

// "ইসলামি টুলস ও ট্র্যাকিং" ক্যাটাগরির যে ৫টা item এখন actual component পেয়েছে
// (৬ষ্ঠ item "অন্যান্য আমল/অগ্রগতি ট্র্যাকিং" এখনো scope-নির্ধারণ-পেন্ডিং, বাদ)।
// key → component map, "শীঘ্রই আসছে" fallback-এর বদলে এই map-এ থাকলে actual UI বসে।
const ACTIVE_ITEM_COMPONENTS = {
  qibla: Qibla,
  monthlySchedule: MonthlyPrayerSchedule,
  zakat: ZakatCalculator,
  fitra: FitraCalculator,
  sadaqaLog: SadaqaLog,
  learnSalah: LearnSalahGuide,
  prayerImportance: PrayerImportance,
  sahuSijdah: SahuSijdahGuide,
  qasrPrayer: QasrPrayerGuide,
  janazah: JanazahPrayerGuide,
  wudu: WuduGuide,
  ghusl: GhuslGuide,
  tayammum: TayammumGuide,
  istikhara: IstikharaGuide,
  paraIndex: ParaIndex,
  jumuahAmol: JumuahAmol,
  ramadanPrep: RamadanPrep,
  eidPrayer: EidPrayerGuide,
  qurbani: QurbaniGuide,
  hajj: HajjGuide,
  hijriDates: HijriImportantDays,
};

// একক-এন্ট্রি ক্যাটাগরি(কুইজ/ব্লগ) — id দিয়ে lookup, নিজস্ব header/back বহন করে
// বলে ACTIVE_ITEM_COMPONENTS-এর generic wrapped-header pattern এখানে প্রযোজ্য না।
const SINGLE_ENTRY_COMPONENTS = {
  quiz: QuizSection,
  blog: BlogSection,
};

// প্রতিটা ক্যাটাগরির item-list(3_1 "সহায়িকা ট্যাবের ভিতরে গ্রুপিং" টেবিল অনুযায়ী)।
// কুইজ/ব্লগ(single-entry ক্যাটাগরি) আলাদাভাবে নিচে handle হয়েছে(§renderCategory)।
const CATEGORIES = [
  {
    id: "salah",
    icon: "🕌",
    label: "সালাত ও পবিত্রতা",
    items: [
      { key: "learnSalah", label: "নামাজ শিক্ষা" },
      { key: "prayerImportance", label: "নামাজের গুরুত্ব" },
      { key: "sahuSijdah", label: "সাহু সিজদার নিয়ম" },
      { key: "qasrPrayer", label: "কসর নামাজের নিয়ম" },
      { key: "janazah", label: "জানাজার নামাজের নিয়ম" },
      { key: "wudu", label: "অযুর নিয়ম" },
      { key: "ghusl", label: "ফরজ গোসলের নিয়ম" },
      { key: "tayammum", label: "তায়াম্মুমের নিয়ম" },
      { key: "istikhara", label: "ইস্তিখারার সালাতের নিয়ম" },
    ],
  },
  {
    id: "quran",
    icon: "📖",
    label: "কুরআন",
    items: [
      { key: "paraIndex", label: "৩০ পারার সূচি" },
      { key: "khatmTracker", label: "কুরআন খতম ট্র্যাকিং" },
    ],
  },
  {
    id: "toolsTracking",
    icon: "🧰",
    label: "ইসলামি টুলস ও ট্র্যাকিং",
    items: [
      { key: "qibla", label: "কিবলা" },
      { key: "monthlySchedule", label: "মাসিক নামাজ-সময়সূচি" },
      { key: "zakat", label: "যাকাত ক্যালকুলেটর" },
      { key: "fitra", label: "ফিতরা ক্যালকুলেটর" },
      { key: "sadaqaLog", label: "সদকা লগ" },
      { key: "otherTracking", label: "অন্যান্য আমল/অগ্রগতি ট্র্যাকিং" },
    ],
  },
  {
    id: "specialDays",
    icon: "🌙",
    label: "বিশেষ দিন ও উপলক্ষ",
    items: [
      { key: "jumuahAmol", label: "জুমার দিনের বিশেষ আমল" },
      { key: "ramadanPrep", label: "রমজান প্রস্তুতি" },
      { key: "eidCountdown", label: "রমজান/ঈদ কাউন্টডাউন" },
      { key: "eidPrayer", label: "ঈদের নামাজের নিয়ম" },
      { key: "qurbani", label: "কুরবানির নিয়ম" },
      { key: "hajj", label: "হজের নিয়ম" },
      { key: "hijriDates", label: "হিজরি ও গুরুত্বপূর্ণ দিন" },
    ],
  },
];

// একক-বাটন ক্যাটাগরি(header+CTA দুই-ধাপ প্যাটার্ন) — বর্তমানে খালি(কুইজ নিচের
// SINGLE_ROW_ENTRIES-এ সরানো হয়েছে, ১৮ সেপ্টেম্বর ২০২৬)। খালি array harmless
// no-op হিসেবে রাখা হলো(map কিছু render করবে না) — future single-entry
// ক্যাটাগরির জন্য pattern অক্ষুণ্ণ রাখতে সম্পূর্ণ সরানো হয়নি।
const SINGLE_ENTRY_CATEGORIES = [];

// একক-সারি সরাসরি-ক্লিকযোগ্য এন্ট্রি(ব্লগ, ১৮ সেপ্টেম্বর ২০২৬ owner-request) —
// আলাদা header+CTA-button দুই-ধাপ প্যাটার্নের বদলে CATEGORIES-item-এর মতোই
// একটাই সারি, ক্লিকেই সরাসরি BlogSection/QuizSection খোলে।
// কুইজ(১৮ সেপ্টেম্বর ২০২৬, owner-request) — আগে SINGLE_ENTRY_CATEGORIES-এ
// header("🧠 ইসলামি কুইজ")+আলাদা CTA-বাটন("কুইজ খেলুন") দুই-অংশে ছিল, এখন
// ব্লগের মতোই একটাই combined row।
const SINGLE_ROW_ENTRIES = [
  { id: "quiz", icon: "🧠", label: "ইসলামি কুইজ খেলুন" },
  { id: "blog", icon: "📚", label: "ডিভাইন ব্লগ", subtitle: "ইসলামি লেখার সমাহার" },
];

export function PublicToolsShell() {
  const [activeItem, setActiveItem] = useState(null); // { key, label } | { id, label } | null

  if (activeItem) {
    // কুইজ/ব্লগ — নিজস্ব header/back, শেল-wrapper ছাড়াই সরাসরি render।
    const SingleComponent = activeItem.id ? SINGLE_ENTRY_COMPONENTS[activeItem.id] : null;
    if (SingleComponent) {
      return /*#__PURE__*/React.createElement(SingleComponent, { onBack: () => setActiveItem(null) });
    }

    const ActiveComponent = ACTIVE_ITEM_COMPONENTS[activeItem.key];
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setActiveItem(null),
          className: "flex items-center gap-1 px-4 pt-4 pb-2 text-sm font-semibold text-emerald-950",
        },
        /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
        "সহায়িকা"
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "px-4 pb-2 text-base font-bold text-emerald-950", style: { fontFamily: "'Noto Serif Bengali', serif" } },
        activeItem.label
      ),
      ActiveComponent
        ? /*#__PURE__*/React.createElement(ActiveComponent, null)
        : /*#__PURE__*/React.createElement(
            "div",
            { className: "flex-1 flex flex-col items-center justify-center px-6 text-center gap-2 py-16" },
            /*#__PURE__*/React.createElement("p", { className: "text-sm text-gray-500" }, "শীঘ্রই আসছে")
          )
    );
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1] pt-4 px-4" },
    CATEGORIES.map((cat) =>
      /*#__PURE__*/React.createElement(
        "div",
        { key: cat.id, className: "mb-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "px-4 py-2.5 text-sm font-bold text-emerald-950 border-b border-slate-100" },
          cat.icon + " " + cat.label
        ),
        cat.items.map((item, idx) =>
          /*#__PURE__*/React.createElement(
            "button",
            {
              key: item.key,
              type: "button",
              onClick: () => setActiveItem(item),
              className:
                "w-full px-4 py-3 flex items-center justify-between text-left " +
                (idx < cat.items.length - 1 ? "border-b border-slate-100" : ""),
            },
            /*#__PURE__*/React.createElement("span", { className: "text-sm text-slate-700" }, item.label),
            /*#__PURE__*/React.createElement(ChevronRight, { size: 16, color: "#8A9A8F" })
          )
        )
      )
    ),
    SINGLE_ENTRY_CATEGORIES.map((cat) =>
      /*#__PURE__*/React.createElement(
        "div",
        { key: cat.id, className: "mb-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "px-4 py-2.5 text-sm font-bold text-emerald-950 border-b border-slate-100" },
          cat.icon + " " + cat.label
        ),
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setActiveItem({ id: cat.id, label: cat.label }),
            className: "w-full px-4 py-4 flex items-center justify-center gap-2 font-semibold text-sm",
            style: { color: "var(--theme-primary, #0E4B43)" },
          },
          cat.icon + "  " + cat.ctaLabel + "  →"
        )
      )
    ),
    SINGLE_ROW_ENTRIES.map((entry) =>
      /*#__PURE__*/React.createElement(
        "div",
        { key: entry.id, className: "mb-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden" },
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setActiveItem({ id: entry.id, label: entry.label }),
            className: "w-full px-4 py-3 flex items-center justify-between text-left",
          },
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex flex-col" },
            /*#__PURE__*/React.createElement(
              "span",
              { className: "text-sm font-bold text-emerald-950" },
              entry.icon + " " + entry.label
            ),
            entry.subtitle &&
              /*#__PURE__*/React.createElement(
                "span",
                { className: "text-xs text-slate-500 mt-0.5" },
                "(" + entry.subtitle + ")"
              )
          ),
          /*#__PURE__*/React.createElement(ChevronRight, { size: 16, color: "#8A9A8F" })
        )
      )
    )
  );
}
