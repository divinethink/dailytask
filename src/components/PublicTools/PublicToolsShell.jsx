// PublicToolsShell.jsx — "সহায়িকা" bottom-nav ট্যাব(Phase A item ৫)। ৬-ক্যাটাগরি
// grid(3_1 গ্রুপিং-টেবিল/3_2 §২.২/3_3 §৭)। সাধারণ item(Qibla/ZakatCalculator
// ইত্যাদি) ট্যাপে এই শেল নিজেই back+title header দেখিয়ে ActiveComponent বসায়।
// একক-এন্ট্রি ক্যাটাগরি(কুইজ/ব্লগ) ব্যতিক্রম — এরা নিজস্ব পূর্ণাঙ্গ
// header+back-navigation বহন করে(BlogSection.jsx/QuizSection.jsx), তাই শেল
// generic wrapper না বসিয়ে সরাসরি component render করে, শুধু onBack prop
// দিয়ে(SINGLE_ENTRY_COMPONENTS, নিচে)।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../icons.jsx";
import { ToolGridSection, PageHeader, VerseCard, DetailHeader } from "./ToolGrid.jsx";
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
    icon: "mosque",
    label: "সালাত ও পবিত্রতা",
    items: [
      { key: "learnSalah", icon: "cap", label: "নামাজ শিক্ষা" },
      { key: "prayerImportance", icon: "mosque", label: "নামাজের গুরুত্ব" },
      { key: "sahuSijdah", icon: "repeat", label: "সাহু সিজদার নিয়ম" },
      { key: "qasrPrayer", icon: "suitcase", label: "কসর নামাজের নিয়ম" },
      { key: "janazah", icon: "leaf", label: "জানাজার নামাজের নিয়ম" },
      { key: "wudu", icon: "drop", label: "অযুর নিয়ম" },
      { key: "ghusl", icon: "drops", label: "ফরজ গোসলের নিয়ম" },
      { key: "tayammum", icon: "palm", label: "তায়াম্মুমের নিয়ম" },
      { key: "istikhara", icon: "moonStar", label: "ইস্তিখারার সালাতের নিয়ম" },
    ],
  },
  {
    id: "quran",
    icon: "bookmarkCheck",
    label: "কুরআন",
    items: [
      { key: "paraIndex", icon: "list", label: "৩০ পারার সূচি" },
      { key: "khatmTracker", icon: "bookmarkCheck", label: "কুরআন খতম ট্র্যাকিং" },
    ],
  },
  {
    id: "toolsTracking",
    icon: "calculator",
    label: "ইসলামি টুলস ও ট্র্যাকিং",
    items: [
      { key: "monthlySchedule", icon: "calendar", label: "মাসিক নামাজ-সময়সূচি" },
      { key: "zakat", icon: "calculator", label: "যাকাত ক্যালকুলেটর" },
      { key: "fitra", icon: "wheat", label: "ফিতরা ক্যালকুলেটর" },
      { key: "sadaqaLog", icon: "heart", label: "সদকা লগ" },
      { key: "otherTracking", icon: "chart", label: "অন্যান্য আমল/অগ্রগতি ট্র্যাকিং" },
    ],
  },
  {
    id: "specialDays",
    icon: "moon",
    label: "বিশেষ দিন ও উপলক্ষ",
    items: [
      { key: "ramadanPrep", icon: "moon", label: "রমজান প্রস্তুতি" },
      { key: "eidCountdown", icon: "timer", label: "রমজান/ঈদ কাউন্টডাউন" },
      { key: "eidPrayer", icon: "star", label: "ঈদের নামাজের নিয়ম" },
      { key: "qurbani", icon: "gift", label: "কুরবানির নিয়ম" },
      { key: "hajj", icon: "kaaba", label: "হজের নিয়ম" },
      { key: "hijriDates", icon: "calendarMoon", label: "হিজরি ও গুরুত্বপূর্ণ দিন" },
    ],
  },
];

// front-level flat grid(owner-request, ১৯ সেপ্টেম্বর ২০২৬) — কিবলা ও জুমার
// দিনের বিশেষ আমল নিজ নিজ ক্যাটাগরি(toolsTracking/specialDays, উপরে) থেকে
// বের করে সরাসরি front-এ আনা হয়েছে। বাকি ৪টা ক্যাটাগরি + কুইজ/ব্লগ একই
// সারিতে, একটাই ToolGridSection দিয়ে(কোনো section-title ছাড়া, flat)।
const FRONT_ITEMS = [
  { kind: "tool", key: "qibla", icon: "compass", label: "কিবলা" },
  { kind: "category", id: "salah", icon: "mosque", label: "সালাত ও পবিত্রতা" },
  { kind: "tool", key: "jumuahAmol", icon: "calendarStar", label: "জুমার দিনের বিশেষ আমল" },
  { kind: "category", id: "quran", icon: "bookmarkCheck", label: "কুরআন" },
  { kind: "category", id: "toolsTracking", icon: "calculator", label: "ইসলামি টুলস ও ট্র্যাকিং" },
  { kind: "category", id: "specialDays", icon: "moon", label: "বিশেষ দিন ও উপলক্ষ" },
  { kind: "single", id: "quiz", icon: "help", label: "ইসলামি কুইজ খেলুন" },
  { kind: "single", id: "blog", icon: "file", label: "ডিভাইন ব্লগ", subtitle: "ইসলামি লেখার সমাহার" },
];

export function PublicToolsShell() {
  // "front" | { tool: {key,label} } | { single: {id,label} } |
  // { category: catObj } | { category: catObj, item: {key,label} }
  const [view, setView] = useState("front");

  if (view !== "front" && view.single) {
    const SingleComponent = SINGLE_ENTRY_COMPONENTS[view.single.id];
    return /*#__PURE__*/React.createElement(SingleComponent, { onBack: () => setView("front") });
  }

  if (view !== "front" && view.tool) {
    const ActiveComponent = ACTIVE_ITEM_COMPONENTS[view.tool.key];
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setView("front"),
          className: "flex items-center gap-1 px-4 pt-4 pb-2 text-sm font-semibold text-emerald-950",
        },
        /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
        "সহায়িকা"
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "px-4 pb-4" },
        /*#__PURE__*/React.createElement(DetailHeader, { icon: view.tool.icon, title: view.tool.label }),
        ActiveComponent
          ? /*#__PURE__*/React.createElement(ActiveComponent, null)
          : /*#__PURE__*/React.createElement(
              "div",
              { className: "flex flex-col items-center justify-center text-center gap-2 py-16" },
              /*#__PURE__*/React.createElement("p", { className: "text-sm text-gray-500" }, "শীঘ্রই আসছে")
            )
      )
    );
  }

  if (view !== "front" && view.category) {
    const cat = view.category;

    if (view.item) {
      const ActiveComponent = ACTIVE_ITEM_COMPONENTS[view.item.key];
      return /*#__PURE__*/React.createElement(
        "div",
        { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setView({ category: cat }),
            className: "flex items-center gap-1 px-4 pt-4 pb-2 text-sm font-semibold text-emerald-950",
          },
          /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
          cat.label
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "px-4 pb-4" },
          /*#__PURE__*/React.createElement(DetailHeader, { icon: view.item.icon, title: view.item.label, subtitle: cat.label }),
          ActiveComponent
            ? /*#__PURE__*/React.createElement(ActiveComponent, null)
            : /*#__PURE__*/React.createElement(
                "div",
                { className: "flex flex-col items-center justify-center text-center gap-2 py-16" },
                /*#__PURE__*/React.createElement("p", { className: "text-sm text-gray-500" }, "শীঘ্রই আসছে")
              )
        )
      );
    }

    return /*#__PURE__*/React.createElement(
      "div",
      { className: "min-h-screen pb-24 bg-[#F4F7F1] pt-4 px-4" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setView("front"),
          className: "flex items-center gap-1 mb-2 text-sm font-semibold text-emerald-950",
        },
        /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
        "সহায়িকা"
      ),
      /*#__PURE__*/React.createElement(DetailHeader, { icon: cat.icon, title: cat.label }),
      /*#__PURE__*/React.createElement(ToolGridSection, {
        variant: "list",
        items: cat.items,
        onSelect: (item) => setView({ category: cat, item }),
      })
    );
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1] pt-4 px-4" },
    /*#__PURE__*/React.createElement(PageHeader, { title: "সহায়িকা", subtitle: "ইবাদত • আমল • সুন্দর জীবন" }),
    /*#__PURE__*/React.createElement(ToolGridSection, {
      variant: "hero",
      items: FRONT_ITEMS,
      onSelect: (item) => {
        if (item.kind === "category") {
          setView({ category: CATEGORIES.find((c) => c.id === item.id) });
        } else if (item.kind === "tool") {
          setView({ tool: item });
        } else {
          setView({ single: item });
        }
      },
    }),
    /*#__PURE__*/React.createElement(VerseCard, { text: "“আল্লাহর স্মরণেই হৃদয় প্রশান্ত হয়।”", source: "— সূরা আর-রা'দ ১৩:২৮" })
  );
}
