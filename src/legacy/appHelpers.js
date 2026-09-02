// appHelpers.js — pure utility functions (Bengali digit/date/Hijri format,
// scoring/field-config/daily-inspiration, theme). কোনো Firebase dependency নেই।
import { useState, useEffect } from "react";

const FAMILY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateSecureCode(length) {
  const cryptoObj = window.crypto || window.msCrypto;
  let out = "";
  if (cryptoObj && cryptoObj.getRandomValues) {
    const arr = new Uint32Array(length);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < length; i++) out += FAMILY_CODE_CHARS[arr[i] % FAMILY_CODE_CHARS.length];
  } else {
    // পুরনো ব্রাউজারের জন্য fallback
    for (let i = 0; i < length; i++) out += FAMILY_CODE_CHARS[Math.floor(Math.random() * FAMILY_CODE_CHARS.length)];
  }
  return out;
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function useFonts() {
  useEffect(() => {
    const id = "dt-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

const THEME_PRESETS = [{
  id: "green",
  name: "সবুজ (ডিফল্ট)",
  color: "#0E4B43"
}, {
  id: "pink",
  name: "পিংক",
  color: "#E0559A"
}, {
  id: "maroon",
  name: "মেরুন",
  color: "#9F1239"
}, {
  id: "purple",
  name: "বেগুনি",
  color: "#6D28D9"
}, {
  id: "blue",
  name: "নীল",
  color: "#1D4ED8"
}, {
  id: "teal",
  name: "টিল",
  color: "#0F766E"
}];
function hexToRgba(hex, alpha) {
  const h = (hex || "#0E4B43").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  const r = bigint >> 16 & 255;
  const g = bigint >> 8 & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getThemeColor(fallback) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim();
  return v || fallback;
}
function applyThemeColor(color) {
  document.documentElement.style.setProperty("--theme-primary", color);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}
function useThemeColor() {
  const [themeColor, setThemeColorState] = useState(() => {
    try {
      return localStorage.getItem("theme_color") || THEME_PRESETS[0].color;
    } catch {
      return THEME_PRESETS[0].color;
    }
  });
  useEffect(() => {
    applyThemeColor(themeColor);
  }, [themeColor]);
  function setThemeColor(color) {
    setThemeColorState(color);
    try {
      localStorage.setItem("theme_color", color);
    } catch {}
  }
  return [themeColor, setThemeColor];
}

const DEFAULT_DEEN_FIELDS = [{
  key: "fardPrayers",
  label: "ফরজ কাযা সালাত (কয় ওয়াক্ত?)",
  shortLabel: "ফরজ কাযা",
  type: "count",
  max: 5,
  excusable: true
}, {
  key: "jamaat",
  label: "জামায়াতে সালাত (কয় ওয়াক্ত?)",
  shortLabel: "জামায়াতে সালাত",
  type: "count",
  max: 5,
  appliesTo: "male",
  excusable: true
}, {
  key: "sunnahNafl",
  label: "সুন্নত ও নফল সালাত",
  shortLabel: "সুন্নত/নফল",
  type: "bool",
  excusable: true
}, {
  key: "tahajjud",
  label: "সিয়াম (ফরজ/নফল) / তাহাজ্জুদ",
  shortLabel: "সিয়াম/তাহাজ্জুদ",
  type: "bool",
  excusable: true
}, {
  key: "morningEveningAzkar",
  label: "সকাল-সন্ধ্যার ও ঘুমানোর সময়ের আমল",
  shortLabel: "সকাল-সন্ধ্যার আমল",
  type: "bool"
}, {
  key: "dhikr",
  label: "ইস্তেগফার, যিকির, দরুদ শরীফ ও দু'আ",
  shortLabel: "যিকির/দু'আ",
  type: "bool"
}, {
  key: "quranPages",
  label: "কুরআন/তাফসীর ও আরবি শেখা (পৃষ্ঠা)",
  shortLabel: "কুরআন",
  type: "number",
  target: 5
}, {
  key: "seerah",
  label: "সীরাত/জীবনী/ইতিহাস",
  shortLabel: "সীরাত",
  type: "bool"
}, {
  key: "selfStudy",
  label: "ইলম অর্জন/কোর্সের পড়া",
  shortLabel: "ইলম অর্জন",
  type: "bool"
}, {
  key: "taleem",
  label: "তালিম/পাঠচক্র/দ্বীনি সোহবত",
  shortLabel: "তালিম",
  type: "bool"
}, {
  key: "dawah",
  label: "দ্বীনের দাওয়াত",
  shortLabel: " দাওয়াত",
  type: "bool"
}, {
  key: "sadaqah",
  label: "দান/সাদাকা/পরোপকার",
  shortLabel: "সাদাকা",
  type: "bool"
}];

const DEFAULT_DUNIYA_FIELDS = [{
  key: "earlyMorning",
  label: "ভোরের বরকতময় সময়কে কাজে লাগানো",
  shortLabel: "ভোরের সময়",
  type: "bool"
}, {
  key: "exercise",
  label: "ব্যায়াম/শরীরচর্চা",
  shortLabel: "ব্যায়াম",
  type: "bool"
}, {
  key: "healthyFood",
  label: "অপ্রক্রিয়াজাত ও স্বাস্থ্যকর খাবার",
  shortLabel: "স্বাস্থ্যকর খাবার",
  type: "bool"
}, {
  key: "familyTime",
  label: "মা-বাবা, পরিবার ও আত্মীয়দের হক আদায়",
  shortLabel: "পারিবারিক সময়",
  type: "bool"
}, {
  key: "screenLimit",
  label: "সোশ্যাল মিডিয়া/মোবাইল সীমিত ব্যবহার",
  shortLabel: "সীমিত স্ক্রিন",
  type: "bool"
}, {
  key: "noLyingBackbitingPride",
  label: "মিথ্যা, গীবত ও অহংকার থেকে বেঁচে আছি?",
  shortLabel: "মিথ্যা, গীবত মুক্ত",
  type: "bool"
}, {
  key: "noHurtingOthers",
  label: "অন্যের হক নষ্ট/মনে কষ্ট না দেয়া",
  shortLabel: "সদাচরণ",
  type: "bool"
}, {
  key: "noProcrastination",
  label: "অলসতা/কাজ ফেলে না রাখা",
  shortLabel: "অলসতা মুক্ত",
  type: "bool"
}, {
  key: "phoneOffBy11",
  label: "ঘুমানোর অন্তত ১ ঘণ্টা আগে ফোন/ইন্টারনেট বন্ধ",
  shortLabel: "ঘুমের আগে ফোন বন্ধ",
  type: "bool"
}];

function fieldApplies(field, member) {
  if (!field.appliesTo) return true;
  if (!member || !member.gender) return true;
  return field.appliesTo === member.gender;
}
function isExcused(entry, key) {
  return !!(entry && entry.excused && entry.excused[key]);
}
// Shari'ah note: men have no valid excuse to skip qaza of obligatory (fard)
// prayers — they remain obligated to make them up later. So the "ওজর"
// (excuse) option is intentionally unavailable for fardPrayers when the
// member's gender is male, even though the field is otherwise excusable
// (e.g. for jamaat, sunnah/nafl, siyam/tahajjud, and for female members'
// fardPrayers during valid excuse periods).
function isFieldExcusable(field, member) {
  if (!field.excusable) return false;
  if (field.key === "fardPrayers" && member && member.gender === "male") return false;
  return true;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBn = n => String(n).replace(/[0-9]/g, d => BN_DIGITS[d]);

// Wraps any Bengali-digit run inside a label string in a distinct monospace,
// bold, emerald-colored span so numbers embedded mid-sentence (e.g. "১ ঘণ্টা")
// don't visually blend into the surrounding text at small font sizes.

const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const BN_WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];

const DAILY_INSPIRATIONS = [{
  type: "ayat",
  text: "তোমরা ভয় কর সেদিনকে, যেদিন এক ব্যক্তি থেকে অন্য ব্যক্তি বিন্দুমাত্র উপকৃত হবে না, কারও কাছ থেকে বিনিময় গৃহীত হবে না, কারও সুপারিশ ফলপ্রদ হবে না এবং তারা সাহায্যপ্রাপ্তও হবে না।",
  ref: "সূরা আল-বাকারাহ: ১২৩"
}, {
  type: "ayat",
  text: "হে মুমিনগণ! তোমরা ধৈর্য ও নামাজের মাধ্যমে সাহায্য প্রার্থনা কর। নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে রয়েছেন।",
  ref: "সূরা আল-বাকারাহ: ১৫৩"
}, {
  type: "ayat",
  text: "এবং অবশ্যই আমি তোমাদেরকে পরীক্ষা করব কিছুটা ভয়, ক্ষুধা, মাল ও জানের ক্ষতি এবং ফল-ফসল বিনষ্টের মাধ্যমে। তবে সুসংবাদ দাও সবরকারীদের।",
  ref: "সূরা আল-বাকারাহ: ১৫৫"
}, {
  type: "ayat",
  text: "হে ঈমানদারগণ! তোমরা পরিপূর্ণভাবে ইসলামের অন্তর্ভুক্ত হয়ে যাও এবং শয়তানের পদাঙ্ক অনুসরণ করো না। নিশ্চিতরূপে সে তোমাদের প্রকাশ্য শত্রু।",
  ref: "সূরা আল-বাকারাহ: ২০৮"
}, {
  type: "ayat",
  text: "যাঁরা দাঁড়িয়ে, বসে ও শায়িত অবস্থায় আল্লাহকে স্মরণ করে এবং আসমান ও জমিন সৃষ্টির বিষয়ে চিন্তা-গবেষণা করে, (তারা বলে) পরওয়ারদেগার! এসব তুমি অনর্থক সৃষ্টি করোনি।",
  ref: "সূরা আল-ইমরান: ১৯১"
}, {
  type: "ayat",
  text: "আর এমন লোকদের জন্য কোনো ক্ষমা নেই, যারা মন্দ কাজ করতেই থাকে, এমনকি যখন তাদের কারো মাথার উপর মৃত্যু উপস্থিত হয়, তখন বলতে থাকে: আমি এখন তওবা করছি।",
  ref: "সূরা আন-নিসা: ১৮"
}, {
  type: "ayat",
  text: "যেগুলো সম্পর্কে তোমাদের নিষেধ করা হয়েছে যদি তোমরা সেসব বড় গুনাহগুলো থেকে বেঁচে থাকতে পার, তবে আমি তোমাদের ত্রুটি-বিচ্যুতিগুলো ক্ষমা করে দেব এবং সম্মানজনক স্থানে তোমাদের প্রবেশ করাব।",
  ref: "সূরা আন-নিসা: ৩১"
}, {
  type: "ayat",
  text: "যে লোক সৎকাজের জন্য কোনো সুপারিশ করবে, তা থেকে সেও একটি অংশ পাবে। আর যে লোক সুপারিশ করবে মন্দ কাজের জন্যে সে তার বোঝারও একটি অংশ পাবে।",
  ref: "সূরা আন-নিসা: ৮৫"
}, {
  type: "ayat",
  text: "পার্থিব জীবন ক্রীড়া ও কৌতুক ব্যতীত কিছুই নয়। পরকালের আবাস পরহেজগারদের জন্য শ্রেষ্ঠতর।",
  ref: "সূরা আল-আনআম: ৩২"
}, {
  type: "ayat",
  text: "তোমরা প্রকাশ্য ও প্রচ্ছন্ন গুনাহ পরিত্যাগ কর। নিশ্চয় যারা গুনাহ করেছে, তারা অতিসত্বর তাদের কৃতকর্মের শাস্তি পাবে।",
  ref: "সূরা আল-আনআম: ১২০"
}, {
  type: "ayat",
  text: "যে একটি সৎকর্ম করবে, সে তার দশগুণ পাবে এবং যে একটি মন্দ কাজ করবে, সে তার সমান শাস্তিই পাবে।",
  ref: "সূরা আল-আনআম: ১৬০"
}, {
  type: "ayat",
  text: "আপনি বলুন: আমার নামাজ, আমার কোরবানি এবং আমার জীবন ও মরণ বিশ্ব-প্রতিপালক আল্লাহরই জন্যে।",
  ref: "সূরা আল-আনআম: ১৬২"
}, {
  type: "ayat",
  text: "যারা ঈমানদার, তারা এমন যে, যখন আল্লাহর নাম নেওয়া হয় তখন তাদের অন্তর ভীত হয়ে পড়ে।",
  ref: "সূরা আল-আনফাল: ০২"
}, {
  type: "ayat",
  text: "অবশ্যই যেসব লোক আমার সাক্ষাৎ লাভের আশা রাখে না এবং পার্থিব জীবন নিয়েই উৎফুল্ল রয়েছে... এমন লোকদের ঠিকানা হলো আগুন।",
  ref: "সূরা ইউনুস: ০৭-০৮"
}, {
  type: "ayat",
  text: "মুমিনগণ সফলকাম হয়ে গেছে, যারা নিজেদের নামাজে বিনয়-নম্র; যারা অনর্থক কথাবার্তায় নির্লিপ্ত, যারা জাকাত দান করে থাকে।",
  ref: "সূরা আল-মুমিনুন: ১-৫"
}, {
  type: "ayat",
  text: "হে নবী! মুমিন পুরুষদের বলে দাও তারা যেন নিজেদের দৃষ্টি সংযত করে রাখে এবং নিজেদের লজ্জাস্থান সমূহের হেফাজত করে।",
  ref: "সূরা আন-নূর: ৩০"
}, {
  type: "ayat",
  text: "তোমাদের এ কী অবস্থা, প্রত্যেক উঁচু জায়গায় অনর্থক একটি ইমারত বানিয়ে ফেলেছ এবং বড় বড় প্রাসাদ নির্মাণ করছ, যেন তোমরা চিরকাল থাকবে?",
  ref: "সূরা আশ-শুআরা: ১২৮-১২৯"
}, {
  type: "ayat",
  text: "লোকেরা কি মনে করে রেখেছে, 'আমরা ঈমান এনেছি' কেবলমাত্র এ কথাটুকু বললেই তাদেরকে ছেড়ে দেয়া হবে, আর পরীক্ষা করা হবে না?",
  ref: "সূরা আল-আনকাবুত: ২-৩"
}, {
  type: "ayat",
  text: "নির্দেশ দিয়েছি যে, আমার প্রতি ও তোমার পিতা-মাতার প্রতি কৃতজ্ঞ হও। অবশেষে আমারই নিকট ফিরে আসতে হবে।",
  ref: "সূরা লোকমান: ১৪"
}, {
  type: "ayat",
  text: "বলুন, যারা জানে এবং যারা জানে না; তারা কি সমান হতে পারে? চিন্তাভাবনা কেবল তারাই করে, যারা বুদ্ধিমান।",
  ref: "সূরা আজ-জুমার: ০৯"
}, {
  type: "ayat",
  text: "মুমিনগণ, তোমরা অনেক ধারণা থেকে বেঁচে থাকো। নিশ্চয় কতক ধারণা গুনাহ এবং গোপনীয় বিষয় সন্ধান করো না।",
  ref: "সূরা আল-হুজরাত: ১২"
}, {
  type: "ayat",
  text: "মুমিনগণ! তোমরা আল্লাহ তাআলার কাছে তওবা কর; আন্তরিক তওবা।",
  ref: "সূরা আত-তাহরীম: ০৮"
}, {
  type: "hadith",
  text: "আল্লাহ যার মঙ্গল চান, তাকে দুঃখ-কষ্টে ফেলেন।",
  ref: "রিয়াদুস সালেহীন: ৪০; সহীহ বুখারী: ৫৬৪৫"
}, {
  type: "hadith",
  text: "দুটি কালেমা আছে, যেগুলো দয়াময়ের কাছে অতি প্রিয়, মুখে উচ্চারণ করা খুবই সহজ, দাঁড়িপাল্লায় অত্যন্ত ভারী: 'সুবহানাল্লাহি ওয়া বিহামদিহি সুবহানাল্লাহিল আজীম'।",
  ref: "সহীহ বুখারী: ৬৪৬"
}, {
  type: "hadith",
  text: "কুরআনের তিরিশ আয়াতবিশিষ্ট একটি সূরা এমন আছে, যা তার পাঠকারীর জন্য সুপারিশ করবে... সেটা হচ্ছে 'সূরা মুলক'।",
  ref: "আবু দাউদ: ১৪০০"
}, {
  type: "hadith",
  text: "গোটা দুনিয়াই সম্পদে পরিপূর্ণ। এর মধ্যে সবচেয়ে উত্তম সম্পদ হলো পুণ্যবতী স্ত্রী।",
  ref: "সহীহ মুসলিম; রিয়াদুস স্বা-লিহীন: ২৮৪"
}, {
  type: "hadith",
  text: "মুমিনদের মধ্যে সবার চেয়ে পূর্ণ মুমিন ঐ ব্যক্তি যে চরিত্রে সবার চেয়ে সুন্দর।",
  ref: "তিরমিযী; রিয়াদুস স্বা-লিহীন: ২৮৩"
}, {
  type: "hadith",
  text: "উত্তম স্ত্রী সে, যার প্রতি দৃষ্টিপাত করলে তোমাকে আনন্দিত করে, আদেশ করলে আনুগত্য করে, তুমি দূরে থাকলে তার নিজের ব্যাপারে এবং তোমার সম্পদের ব্যাপারে তোমার অধিকার রক্ষা করে।",
  ref: "তাফসীরে তবারী: ৯৩২৯; মুসনাদে ত্বয়ালিসী: ২৩২৫"
}, {
  type: "hadith",
  text: "যখনই কোনো পুরুষ কোনো মহিলার সাথে নির্জনতা অবলম্বন করে, তখনই শয়তান তাদের তৃতীয় সাথী হয়।",
  ref: "তিরমিযী: ৯৩৪"
}, {
  type: "hadith",
  text: "আমার গত হওয়ার পরে পুরুষের পক্ষে নারীর চেয়ে অধিক ক্ষতিকর কোনো ফিতনা অন্য কিছু ছেড়ে যাচ্ছি না।",
  ref: "সহীহ বুখারী: ৫০৯৬"
}, {
  type: "hadith",
  text: "নারীদের জন্য ঘরই উত্তম।",
  ref: "আবু দাউদ: ৫৭৬"
}, {
  type: "hadith",
  text: "হে নারীরা! তোমরা দান-সদকা কর। কারণ আমি অধিকাংশ জাহান্নামি দেখেছি তোমাদের নারীদেরকে... কারণ তোমরা স্বামীর প্রতি অকৃতজ্ঞতা প্রকাশ কর।",
  ref: "সহীহ বুখারী: ১/৪৪"
}, {
  type: "hadith",
  text: "নারী যখন পাঁচ ওয়াক্ত নামাজ আদায় করবে, রমজান মাসের রোজা রাখবে, নিজ লজ্জাস্থানের হেফাজত করবে এবং স্বামীর আনুগত্য করবে তখন তাকে বলা হবে, যে দরজা দিয়ে ইচ্ছা জান্নাতে প্রবেশ কর।",
  ref: "মুসনাদে আহমাদ: ১৬৬১"
}, {
  type: "hadith",
  text: "কেবলমাত্র দুটি বিষয়ে ঈর্ষা করা যায়: ১) ঐ ব্যক্তি যাকে আল্লাহ কুরআন শিক্ষা দিয়েছেন এবং সে দিবারাত্রি তা তিলাওয়াত ও আমল করে এবং ২) ঐ ব্যক্তি যাকে আল্লাহ সম্পদ দিয়েছেন এবং সে দিবারাত্রি তা দান করে।",
  ref: "সহীহ বুখারী: ৫০২৫; সহীহ মুসলিম: ৮১৫"
}, {
  type: "hadith",
  text: "দোজখীরা হলো: প্রত্যেক অহঙ্কারী, সীমালঙ্ঘনকারী, অবিনয়ী ও উদ্ধত লোক।",
  ref: "সহীহ বুখারী; সহীহ মুসলিম"
}, {
  type: "hadith",
  text: "চরম সর্বনাশ ঐ ব্যক্তির জন্য যে মানুষকে হাসানোর উদ্দেশ্যে মিথ্যা কথা বলে থাকে।",
  ref: "তিরমিযী: ২৩১৫"
}, {
  type: "hadith",
  text: "যে ব্যক্তি গণকের নিকট এসে কোনো বিষয়ে প্রশ্ন করে, তার চল্লিশ দিনের নামাজ কবুল করা হয় না।",
  ref: "সহীহ মুসলিম: ২২৩০"
}, {
  type: "hadith",
  text: "মানুষ দুনিয়াতে যে চরিত্রের মানুষকে ভালোবাসে, কিয়ামতে সে তারই সাথী হবে।",
  ref: "রিয়াদুস স্বা-লিহীন: ৩৭২"
}, {
  type: "hadith",
  text: "প্রকৃত বীর সে নয়, যে কাউকে কুস্তিতে হারিয়ে দেয়। বরং সেই আসল বীর, যে রাগের সময় নিজেকে নিয়ন্ত্রণ করতে পারে।",
  ref: "সহীহ বুখারী: ৬১১৪"
}, {
  type: "hadith",
  text: "যে ব্যক্তি চায় যে তার রিজিক প্রশস্ত হোক এবং আয়ু বৃদ্ধি হোক, সে যেন তার আত্মীয়তার সম্পর্ক অক্ষুণ্ণ রাখে।",
  ref: "সহীহ বুখারী: ২০৬৭"
}, {
  type: "quote",
  text: "হয়ত একটি ক্ষুদ্র কাজ অনেক বিশাল হয়ে যায় কাজটির পেছনে করা নিয়তের কারণে এবং হয়ত অনেক বড় একটা কাজ একদমই তুচ্ছ হয়ে যায় কাজটির পেছনে করা নিয়তের কারণে।",
  ref: "আবদুল্লাহ ইবনে মুবারাক (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "আল্লাহর ওপর নির্ভর করে আপনি যা-ই করবেন তা কখনই কঠিন হবে না, এবং আপনার নিজের ওপর নির্ভর করে আপনি যা-ই করবেন তা কখনই সহজ হবে না।",
  ref: "ইবনে আতাউল্লাহ আল-ইসকান্দারি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "একটি নোংরা পোশাকের জন্য সুগন্ধির চাইতে সাবানের প্রয়োজনীয়তা অনেক বেশি (তসবিহ পাঠের চেয়ে ইস্তিগফারের গুরুত্ব বোঝাতে)।",
  ref: "ইমাম ইবনে আল-জাওজি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "মুনাফিকের জ্ঞান তার কথাবার্তার মাঝে, মুমিনের জ্ঞান তার কাজের মাঝে।",
  ref: "আবদুল্লাহ ইবনে আল-মুতাজ"
}, {
  type: "quote",
  text: "নিজেকে যতই গভীর করে লক্ষ্য করবেন এবং বুঝতে পারবেন, ততই আপনি অন্যদের প্রতি কম বিচারপ্রবণ হবেন।",
  ref: "তারিক রামাদান"
}, {
  type: "quote",
  text: "নিজেকে জোর করে বিনয়ী করুন যতক্ষণ না পর্যন্ত তা আপনার সহজাত স্বভাব হিসেবে প্রতিষ্ঠিত হয়।",
  ref: "শাইখ হামজা ইউসুফ"
}, {
  type: "quote",
  text: "আধ্যাত্মিকতা অর্জনের ব্যাপারটাই হলো নিজের নফসের সাথে ক্রমাগত জিহাদ করা।",
  ref: "তারিক রামাদান"
}, {
  type: "quote",
  text: "আপনি যখন কাউকে সাহায্য করার সুযোগ পেয়ে থাকেন, তখন আনন্দিত হোন এইজন্য যে আল্লাহ ওই ব্যক্তির দু'আর সাড়া আপনার মাধ্যমেই দিচ্ছেন।",
  ref: "নুমান আলী খান"
}, {
  type: "quote",
  text: "একাকী হয়ে যাওয়ার অর্থ হলো তুমি খারাপ সঙ্গ পরিত্যাগ করেছ। কিন্তু একজন ভালো বন্ধু থাকা একাকীত্বের চাইতে উত্তম।",
  ref: "উমর ইবনুল খাত্তাব (রাদিয়াল্লাহু আনহু)"
}, {
  type: "quote",
  text: "নারীদের সীমাবদ্ধতাগুলোর ব্যাপারে ধৈর্য ধারণ করুন। দাম্পত্য জীবনকে ক্ষতিগ্রস্ত করে এমন ভুলগুলো ছাড়া অন্যগুলোকে উপেক্ষা করুন।",
  ref: "শাইখ সালিহ আল-ফাওজান"
}, {
  type: "quote",
  text: "নিজের দোষ-ত্রুটি যে অন্যদের চেয়ে ভালো জানে; তার জন্য রয়েছে সুসংবাদ।",
  ref: "ইবনে হাজম (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "যে কথা ভেবে আমার অন্তর প্রশান্ত হয় তা হলো আমার জন্য যা নির্ধারিত আছে তা কখনো আমাকে ছেড়ে যাবে না এবং যা কিছু আমার পাওয়া হয় না তা কখনো আমার জন্য নির্ধারিত ছিল না।",
  ref: "ইমাম শাফিঈ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "তাহাজ্জুদের সময়ে করা দু'আ হলো এমন একটি তীরের মতন যা লক্ষ্যভ্রষ্ট হয় না।",
  ref: "ইমাম শাফিঈ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "একজন বান্দার জন্য সবচেয়ে জঘন্য পাপগুলোর একটি হলো তার নিজের পাপকাজগুলোকে ছোট করে দেখা।",
  ref: "মুহাম্মাদ বিন আবু বকর আস-সিদ্দিক (রাদিয়াল্লাহু আনহু)"
}, {
  type: "quote",
  text: "ভরপেট খাওয়ার ব্যাপারে সতর্ক হোন কেননা এটা অন্তরকে কঠিন করে দেয়। মাত্রাতিরিক্ত হাসাহাসিতে অন্তর মরে যায়।",
  ref: "ইমাম সুফিয়ান আস-সাওরি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "আপনি যদি একটি জাতিকে কোনো রকম যুদ্ধ ছাড়াই ধ্বংস করে দিতে চান, তাহলে তাদের তরুণ প্রজন্মের মাঝে অশ্লীলতা আর ব্যভিচারের প্রচলনের ব্যবস্থা করে দিন।",
  ref: "সুলতান সালাহ আদ-দ্বীন ইউসুফ আইয়ুবী (রহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "সে কী পেল যে আল্লাহকে হারালো? সে কী হারালো যে আল্লাহকে পেল?",
  ref: "ইবনে আতাউল্লাহ আল-ইসকান্দারি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "ইমাম আহমাদকে তাঁর ছেলে প্রশ্ন করলেন, 'বাবা, আমরা কবে শান্তি পাবো?' তিনি উত্তর দিলেন, 'জান্নাতে আমাদের প্রথম পদচিহ্নটি রাখার মুহূর্তটি থেকেই'।",
  ref: "ইমাম আহমাদ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "অনেক মানুষ দেখেছি যাদের জড়িয়ে রাখার মতন কোনো কাপড় ছিল না, অনেক কাপড় দেখেছি যা তাদের জড়িয়ে রেখেছিল কিন্তু তারা মানুষ ছিল না।",
  ref: "জালালুদ্দিন রুমী (রাহিমাহুল্লাহ)"
}];
const AYAT_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "ayat");
const HADITH_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "hadith");
const QUOTE_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "quote");
const INSPIRATION_TYPE_CYCLE = [AYAT_LIST, HADITH_LIST, QUOTE_LIST];
function getDailyInspiration(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / 86400000);
  const typeList = INSPIRATION_TYPE_CYCLE[dayOfYear % 3];
  const idx = Math.floor(dayOfYear / 3) % typeList.length;
  return typeList[idx];
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatBnDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBn(d.getFullYear())}, ${toBn(hours)}:${toBn(minutes)} ${ampm}`;
}
function isFutureDate(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(d);
  compare.setHours(0, 0, 0, 0);
  return compare.getTime() > today.getTime();
}
function monthPrefix(year, month0) {
  return `${year}-${pad2(month0 + 1)}`;
}
function daysInMonth(year, month0) {
  return new Date(year, month0 + 1, 0).getDate();
}
function isLastDayOfMonth(d) {
  return d.getDate() === daysInMonth(d.getFullYear(), d.getMonth());
}

const HIJRI_MONTHS_BN = ["মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলক্বদ", "জিলহজ্জ"];
function gregorianToJD(year, month, day) {
  return Math.floor(1461 * (year + 4800 + Math.floor((month - 14) / 12)) / 4) + Math.floor(367 * (month - 2 - 12 * Math.floor((month - 14) / 12)) / 12) - Math.floor(3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100) / 4) + day - 32075;
}
function islamicToJD(year, month, day) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948440 - 1;
}
function getHijriDate(date) {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const adjustedJd = Math.floor(jd) + 0.5;
  const year = Math.floor((30 * (adjustedJd - 1948440) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((adjustedJd - (29 + islamicToJD(year, 1, 1))) / 29.5) + 1);
  const day = Math.floor(adjustedJd - islamicToJD(year, month, 1) + 1);
  return {
    day,
    month: HIJRI_MONTHS_BN[month - 1],
    year
  };
}

function dailyScore(entry, member, allFields) {
  if (!entry) return null;
  let sum = 0;
  let count = 0;
  for (const f of allFields) {
    if (!fieldApplies(f, member)) continue;
    if (isFieldExcusable(f, member) && isExcused(entry, f.key)) continue;
    count += 1;
    if (f.type === "bool") {
      sum += entry[f.key] ? 1 : 0;
    } else if (f.type === "count") {
      const capped = Math.min(f.max, Number(entry[f.key]) || 0);
      // fardPrayers-এর কাউন্ট আসলে "কাযা" (মিসড) ওয়াক্তের সংখ্যা — তাই
      // বেশি সংখ্যা মানে কম ওয়াক্ত সময়মতো পড়া হয়েছে, অর্থাৎ স্কোর কম
      // হওয়া উচিত (ইনভার্টেড)। বাকি "count" টাইপ ফিল্ড (যেমন জামায়াতে
      // সালাত) স্বাভাবিক — বেশি সংখ্যা মানে বেশি স্কোর।
      sum += f.key === "fardPrayers" ? (f.max - capped) / f.max : capped / f.max;
    } else if (f.type === "number") {
      if (f.target) {
        sum += Math.min(f.target, Number(entry[f.key]) || 0) / f.target;
      } else {
        sum += Number(entry[f.key]) > 0 ? 1 : 0;
      }
    }
  }
  return count ? sum / count : null;
}
function scoreColor(score) {
  if (score === null || score === undefined) return "#E7EEE3";
  if (score >= 0.85) return "var(--theme-primary)";
  if (score >= 0.6) return "#7C5CBF";
  if (score >= 0.35) return "#C89B3C";
  if (score > 0) return "#C1666B";
  return "#E7EEE3";
}

function fieldPercent(field, monthEntries, totalDays, member) {
  if (!fieldApplies(field, member)) return null;
  const excusableHere = isFieldExcusable(field, member);
  let effectiveDays = totalDays;
  if (excusableHere) {
    let excusedDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (isExcused(monthEntries[pad2(d)], field.key)) excusedDays += 1;
    }
    effectiveDays = totalDays - excusedDays;
  }
  if (effectiveDays <= 0) return null;
  let hit = 0;
  if (field.type === "count") {
    let sum = 0;
    for (let d = 1; d <= totalDays; d++) {
      const e = monthEntries[pad2(d)];
      if (excusableHere && isExcused(e, field.key)) continue;
      // BUG FIX: fardPrayers-এর জন্য ইনভার্টেড স্কোরিং হওয়ায় আগে একটি খালি
      // (কোনো এন্ট্রি নেই এমন) দিনকে "০টি কাযা" ধরে নেওয়া হতো, যা ইনভার্শনের
      // পর "সর্বোচ্চ স্কোর" (৫/৫, অর্থাৎ পুরোপুরি সময়মতো পড়া) হিসেবে গণনা
      // হয়ে যাচ্ছিল — অথচ ওই দিনের কোনো তথ্যই সেভ করা হয়নি। ফাংশনের বাকি
      // সব ফিল্ডে "খালি দিন = ০ ক্রেডিট" নিয়ম মানা হয় (bool/number শাখায়
      // `if (!e) continue;` দিয়ে); শুধু fardPrayers-এই এই নিয়ম উল্টে গিয়ে
      // "খালি দিন = পূর্ণ ক্রেডিট" হয়ে যাচ্ছিল, যা মাসিক ওভারভিউ ও প্রিন্ট
      // PDF-এর "ফরজ কাযা"-র শতাংশকে কৃত্রিমভাবে বাড়িয়ে দেখাচ্ছিল, বিশেষত
      // যেসব মাসে অনেক দিন পূরণ করা হয়নি। এখন খালি দিনকে বাকি সব ফিল্ডের
      // মতোই "০ ক্রেডিট" হিসেবে গণনা করা হচ্ছে।
      if (field.key === "fardPrayers") {
        const hasValue = e && e[field.key] !== undefined && e[field.key] !== "";
        if (hasValue) {
          const capped = Math.min(field.max, Number(e[field.key]) || 0);
          sum += field.max - capped;
        }
        // খালি দিন হলে কিছুই যোগ হবে না (০ ক্রেডিট) — বাকি ফিল্ডগুলোর
        // আচরণের সাথে সামঞ্জস্যপূর্ণ।
      } else {
        const capped = Math.min(field.max, Number(e?.[field.key]) || 0);
        sum += capped;
      }
    }
    return Math.round(sum / (effectiveDays * field.max) * 100);
  }
  if (field.type === "number" && field.target) {
    // BUG FIX: এই শাখায় আগে excused দিনগুলো বাদ দেওয়া হতো না (উপরের
    // excusedDays গণনা করা সত্ত্বেও ব্যবহৃত হতো না) এবং ভাজক হিসেবে সবসময়
    // totalDays ব্যবহৃত হতো, effectiveDays নয় — যদিও ফাংশনের বাকি সব শাখা
    // effectiveDays ব্যবহার করে। বর্তমান ডিফল্ট ফিল্ডগুলোর মধ্যে "quranPages"
    // (একমাত্র number+target ফিল্ড) excusable নয় বলে এতদিন এটি কোনো
    // দৃশ্যমান পার্থক্য তৈরি করেনি (effectiveDays == totalDays সবসময়), কিন্তু
    // ভবিষ্যতে কোনো excusable number+target ফিল্ড যোগ হলে এই অসামঞ্জস্য
    // ভুল শতাংশ দেখাত। এখন বাকি শাখাগুলোর সাথে সামঞ্জস্যপূর্ণ করা হলো।
    let sum = 0;
    for (let d = 1; d <= totalDays; d++) {
      const e = monthEntries[pad2(d)];
      if (excusableHere && isExcused(e, field.key)) continue;
      sum += Math.min(field.target, Number(e?.[field.key]) || 0);
    }
    return Math.round(sum / (effectiveDays * field.target) * 100);
  }
  for (let d = 1; d <= totalDays; d++) {
    const e = monthEntries[pad2(d)];
    if (excusableHere && isExcused(e, field.key)) continue;
    if (!e) continue;
    if (field.type === "bool" && e[field.key]) hit += 1;
    if (field.type === "number" && !field.target && Number(e[field.key]) > 0) hit += 1;
  }
  return Math.round(hit / effectiveDays * 100);
}
function calculateStreak(monthEntries, member, allFields, cursorYear, cursorMonth0) {
  let streak = 0;
  const today = new Date();
  const d = new Date(today);
  for (let i = 0; i < 365; i++) {
    // monthEntries only holds data for the currently-loaded month (keyed by
    // day-of-month, e.g. "05"). Once we step outside that month we no longer
    // have real data for that day, so stop rather than wrongly reusing a
    // same-numbered day from a different month.
    if (d.getFullYear() !== cursorYear || d.getMonth() !== cursorMonth0) break;
    const dayStr = pad2(d.getDate());
    const entry = monthEntries[dayStr];
    if (entry && dailyScore(entry, member, allFields) >= 0.5) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getWeekRanges(totalDays) {
  const numWeeks = Math.ceil(totalDays / 7);
  const ranges = [];
  for (let w = 1; w <= numWeeks; w++) {
    const start = (w - 1) * 7 + 1;
    const end = Math.min(start + 6, totalDays);
    ranges.push({
      week: w,
      start,
      end
    });
  }
  return ranges;
}

export {
  FAMILY_CODE_CHARS,
  generateSecureCode,
  sha256Hex,
  useFonts,
  THEME_PRESETS,
  hexToRgba,
  getThemeColor,
  applyThemeColor,
  useThemeColor,
  DEFAULT_DEEN_FIELDS,
  DEFAULT_DUNIYA_FIELDS,
  fieldApplies,
  isExcused,
  isFieldExcusable,
  BN_DIGITS,
  toBn,
  BN_MONTHS,
  BN_WEEKDAYS,
  DAILY_INSPIRATIONS,
  AYAT_LIST,
  HADITH_LIST,
  QUOTE_LIST,
  INSPIRATION_TYPE_CYCLE,
  getDailyInspiration,
  pad2,
  dateKey,
  formatBnDateTime,
  isFutureDate,
  monthPrefix,
  daysInMonth,
  isLastDayOfMonth,
  HIJRI_MONTHS_BN,
  gregorianToJD,
  islamicToJD,
  getHijriDate,
  dailyScore,
  scoreColor,
  fieldPercent,
  calculateStreak,
  getWeekRanges
};
