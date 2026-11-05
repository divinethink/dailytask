// popupMessages.js — অনবোর্ড/সাপ্তাহিক/মাসিক ইত্যাদি তথ্য-পপআপের লেখা App Creator সম্পাদনা করতে পারেন।
// Firestore `publicToolsContent/popup_messages`(বিদ্যমান collection+Rules: read সবার, write শুধু App Creator)।
// Fallback(critical): doc না থাকলে/read fail হলে নিচের ডিফল্টই দেখায় — কখনো ফাঁকা/crash না।
// structured=true মানে ডিফল্ট পপআপে বিশেষ নকশা(তালিকা/বক্স) আছে; সেখানে ডিফল্ট body খালি,
// লেখা দিলে পুরো পপআপ সাধারণ লেখায় বদলে যায়, খালি রাখলে আগের নকশাই থাকে।
import { fetchSection, savePopupMessages } from "./editableContent.js";

const SECTION_ID = "popup_messages";
const TITLE_MAX = 80;
const BODY_MAX = 1500;

// সময়সূচি-ট্যাবের GPS পপআপ/ব্যানারের ডিফল্ট লেখা(এটাই একমাত্র সোর্স; PrayerTimes এটা import করে)
const GPS_MESSAGES = {
  off: {
    title: "ফোনে লোকেশন বন্ধ আছে",
    body: "নামাজের সঠিক সময়ের জন্য ফোনের লোকেশন (জিপিএস) চালু করুন।",
    steps: ["ফোনের স্ক্রিন উপর থেকে নিচে টানুন", "\"লোকেশন\" আইকন চেপে চালু করুন", "এই অ্যাপে ফিরে \"আবার চেষ্টা করুন\" চাপুন"],
    short: "লোকেশন চালু করে আবার চেষ্টা করুন।",
  },
  denied: {
    title: "লোকেশনের অনুমতি বন্ধ করা আছে",
    body: "ব্রাউজার আর নিজে থেকে প্রশ্ন করবে না। সেটিংসে গিয়ে একবার অনুমতি দিতে হবে।",
    steps: [
      "ব্রাউজারে: ঠিকানা-বারের পাশে 🔒 (বা ⋮) → সাইট সেটিংস → লোকেশন → অনুমতি দিন",
      "হোম-স্ক্রিনের অ্যাপ হলে: অ্যাপ আইকন চেপে ধরুন → অ্যাপ তথ্য → অনুমতি → লোকেশন → অনুমতি",
      "ফিরে এসে \"আবার চেষ্টা করুন\" চাপুন",
    ],
    short: "সেটিংসে লোকেশনের অনুমতি দিয়ে আবার চেষ্টা করুন।",
  },
  prompt: {
    title: "লোকেশনের অনুমতি দেওয়া হয়নি",
    body: "সঠিক সময়ের জন্য অনুমতি লাগবে। \"আবার চেষ্টা করুন\" চেপে প্রশ্ন এলে \"Allow\" দিন।",
    steps: [],
    short: "আবার চেষ্টা করে অনুমতি দিন।",
  },
  timeout: {
    title: "অবস্থান পাওয়া যাচ্ছে না",
    body: "ফোনের লোকেশন চালু আছে কিনা দেখুন, দরকারে খোলা জায়গায় গিয়ে আবার চেষ্টা করুন।",
    steps: [],
    short: "লোকেশন চালু আছে কিনা দেখে আবার চেষ্টা করুন।",
  },
};
const GPS_LABELS = {
  off: "লোকেশন — ফোনে বন্ধ",
  denied: "লোকেশন — অনুমতি ব্লক করা",
  prompt: "লোকেশন — অনুমতি দেওয়া হয়নি",
  timeout: "লোকেশন — অবস্থান পাওয়া যাচ্ছে না",
};
// এডিটরে ধাপগুলো body-র নিচে নম্বরসহ লাইন হিসেবে; সম্পাদিত হলে পুরোটা সাধারণ লেখায় দেখায়
const GPS_ITEMS = Object.keys(GPS_MESSAGES).map((k) => {
  const g = GPS_MESSAGES[k];
  const steps = g.steps.length ? "\n" + g.steps.map((t, i) => i + 1 + ". " + t).join("\n") : "";
  return { id: "gps_" + k, label: GPS_LABELS[k], title: g.title, body: g.body + steps, structured: false };
});

const POPUP_ITEMS = [
  { id: "coach_0", label: "অনবোর্ড — ধাপ ১", title: "স্বাগতম! 👋", body: "প্রতিদিন এখানে আপনার আমল(সালাত, কুরআন, যিকির ইত্যাদি) রেকর্ড করুন — [+]/[−] বাটনে চেপে সংখ্যা বাড়ান-কমান, টিক দিয়ে সম্পন্ন করুন।", structured: false },
  { id: "coach_1", label: "অনবোর্ড — ধাপ ২", title: "নিচের ট্যাব থেকে ঘুরে দেখুন", body: "সময়সূচি, তাসবীহ, সহায়িকা — এই ট্যাবগুলো যে কেউ লগইন ছাড়াই ব্যবহার করতে পারবেন।", structured: false },
  { id: "coach_2", label: "অনবোর্ড — ধাপ ৩", title: "মেনু", body: "মেনু ট্যাপ করে সদস্য যোগ, ডেটা ব্যাকআপ, থিম কালার ও ডার্ক/সেপিয়া মোড(চোখের সুরক্ষা) পাবেন।", structured: false },
  { id: "coach_3", label: "অনবোর্ড — ধাপ ৪", title: "ধারাবাহিকতা 🔥", body: "প্রতিদিন পূরণ করলে স্ট্রিক বাড়বে, এবং মাসিক ওভারভিউ-তে নিজের অগ্রগতি দেখতে পারবেন।", structured: false },
  { id: "member", label: "সদস্য যোগ — তথ্য", title: "তথ্য / নির্দেশনা", body: "যাদের নিজস্ব স্মার্টফোন নেই, শুধু তাদের নাম এখানে ম্যানুয়ালি যোগ করুন। তাদের আমল ও তথ্য এই ডিভাইস থেকেই সংরক্ষণ ও পরিচালনা করা যাবে।", structured: false },
  { id: "excuse", label: "ওজর কী?", title: "ওজর কী?", body: "", structured: true },
  { id: "weekly", label: "সাপ্তাহিক রিফ্লেকশন", title: "সাপ্তাহিক রিফ্লেকশন", body: "প্রতি সপ্তাহ শেষে নিজের আমল ও কাজের পর্যালোচনা করুন। এই সপ্তাহে কোন কাজগুলো ভালো হয়েছে এবং কোথায় আরও উন্নতি করা প্রয়োজন, তা এখানে সংক্ষিপ্ত নোট হিসেবে লিখে রাখুন। নতুন সপ্তাহ বা তথ্য যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হয়ে যাবে।", structured: false },
  { id: "meeting", label: "মাসিক পারিবারিক সভা", title: "মাসিক পারিবারিক সভা", body: "মাস শেষে পরিবারের সবাইকে নিয়ে বসুন এবং বিগত মাসের অগ্রগতি মূল্যায়ন করুন। নতুন বিষয় বা সিদ্ধান্ত যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হবে। সভায় আলোচিত গুরুত্বপূর্ণ বিষয় ও সিদ্ধান্তগুলো লিখুন এবং সভা শেষে চাইলে পিডিএফ ফাইল ডাউনলোড এবং ডেটা ব্যাকআপ করে রাখতে পারেন।", structured: false },
  { id: "monthly", label: "মাসিক ওভারভিউ — ক্যালেন্ডারের রঙ", title: "ক্যালেন্ডারের রঙ কী বোঝায়?", body: "", structured: true }
].concat(GPS_ITEMS);
const ITEM_BY_ID = {};
POPUP_ITEMS.forEach((it) => { ITEM_BY_ID[it.id] = it; });

function sanitizePopupMessages(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  POPUP_ITEMS.forEach((it) => {
    const v = raw[it.id];
    if (!v || typeof v !== "object") return;
    const title = typeof v.title === "string" ? v.title.trim().slice(0, TITLE_MAX) : "";
    const body = typeof v.body === "string" ? v.body.trim().slice(0, BODY_MAX) : "";
    if (title || body) out[it.id] = { title, body };
  });
  return out;
}

// একবার lazy-load(পপআপ প্রথম দেখানোর সময়), boot-এ নয়। সেভের পর cache তাৎক্ষণিক আপডেট।
let cache = null;
let inflight = false;
const listeners = new Set();
function notify() { listeners.forEach((f) => f()); }
function loadOnce() {
  if (cache || inflight) return;
  inflight = true;
  fetchSection(SECTION_ID)
    .then((d) => { cache = sanitizePopupMessages(d && d.popupMessages); })
    .catch(() => { cache = {}; })
    .finally(() => { inflight = false; notify(); });
}

function resolveOne(id) {
  const it = ITEM_BY_ID[id];
  const ov = (cache && cache[id]) || null;
  const title = ov && ov.title ? ov.title : it.title;
  const body = ov && ov.body ? ov.body : it.body;
  const custom = it.structured ? !!(ov && ov.body) : !!(ov && (ov.title || ov.body));
  return { title, body, custom };
}

// show=true হলে তবেই (একবার) Firestore থেকে আনে; ids অনুযায়ী resolved {title, body, custom} array।
function usePopupMessages(show, ids) {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (!show) return undefined;
    const f = () => force((n) => n + 1);
    listeners.add(f);
    loadOnce();
    return () => { listeners.delete(f); };
  }, [show]);
  return ids.map(resolveOne);
}

// এডিটরের জন্য সর্বশেষ সংরক্ষিত মান(cache এড়িয়ে নতুন read)
async function loadPopupMessagesFresh() {
  const d = await fetchSection(SECTION_ID);
  return sanitizePopupMessages(d && d.popupMessages);
}

// শুধু ডিফল্ট থেকে ভিন্ন আইটেম সেভ হয়; সেভের পর cache আপডেট
async function savePopupMessageOverrides(data) {
  const clean = sanitizePopupMessages(data);
  await savePopupMessages(SECTION_ID, clean);
  cache = clean;
  notify();
}

export { GPS_MESSAGES, POPUP_ITEMS, TITLE_MAX, BODY_MAX, usePopupMessages, loadPopupMessagesFresh, savePopupMessageOverrides };
