// publicToolsPrayerApi.js — "সময়সূচি" ট্যাব, Aladhan API wrapper+cache
// (3_2_Public_Tools_Architecture_Plan.md §৪.১)। data/ layer(Dev Rule ২):
// external API call এই ফাইলেই সীমাবদ্ধ, component কখনো সরাসরি fetch() করে না।

const ALADHAN_BASE = "https://api.aladhan.com/v1";
const DAILY_CACHE_KEY = "dt_pt_prayer_cache";
const MONTHLY_CACHE_KEY = "dt_pt_prayer_cache_monthly";
// method=1 = University of Islamic Sciences, Karachi(Bangladesh default, §৪.১)
const METHOD = 1;

function dateKeyFor(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Aladhan timing string("04:25 (+06)")-এর টাইমজোন-অংশ বাদ দিয়ে "HH:MM" বের করে।
function cleanTimeStr(raw) {
  if (typeof raw !== "string") return raw;
  return raw.split(" ")[0];
}

// দৈনিক নামাজের সময়সূচি — cache-key date+lat/lon(২ দশমিক)+madhab-নির্ভর, যাতে
// location/madhab বদলালে পুরনো cache ভুলভাবে ব্যবহার না হয়।
async function fetchDailyPrayerTimes({ lat, lon, madhab, date }) {
  const dKey = dateKeyFor(date);
  const cacheId = `${dKey}_${lat.toFixed(2)}_${lon.toFixed(2)}_${madhab}`;
  const cache = readCache(DAILY_CACHE_KEY);
  const cached = cache && cache.id === cacheId ? cache : null;

  const timestamp = Math.floor(date.getTime() / 1000);
  const url = `${ALADHAN_BASE}/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=${METHOD}&school=${madhab}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("prayer-time fetch failed");
    const json = await res.json();
    if (!json || !json.data || !json.data.timings) throw new Error("malformed prayer-time response");
    const timings = {};
    Object.keys(json.data.timings).forEach((k) => {
      timings[k] = cleanTimeStr(json.data.timings[k]);
    });
    const result = { id: cacheId, timings, fetchedAt: Date.now() };
    writeCache(DAILY_CACHE_KEY, result);
    return { ...result, approximate: false };
  } catch (err) {
    if (cached) return { ...cached, approximate: true };
    throw err;
  }
}

// মাসিক সময়সূচি — item ১০(Phase B, মাসিক নামাজ-সময়সূচি টেবিল)-এর জন্য wrapper,
// এই মুহূর্তে কোনো UI এটা কল করে না(future-use, একই data-layer-এ রাখা হলো যাতে
// Phase B-তে আলাদা fetch-লজিক নতুন করে লিখতে না হয়)।
async function fetchMonthlyPrayerTimes({ lat, lon, madhab, year, month }) {
  const cacheId = `${year}-${month}_${lat.toFixed(2)}_${lon.toFixed(2)}_${madhab}`;
  const cache = readCache(MONTHLY_CACHE_KEY);
  const cached = cache && cache.id === cacheId ? cache : null;
  const url = `${ALADHAN_BASE}/calendar/${year}/${month}?latitude=${lat}&longitude=${lon}&method=${METHOD}&school=${madhab}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("monthly prayer-time fetch failed");
    const json = await res.json();
    if (!json || !Array.isArray(json.data)) throw new Error("malformed monthly response");
    const result = { id: cacheId, days: json.data, fetchedAt: Date.now() };
    writeCache(MONTHLY_CACHE_KEY, result);
    return { ...result, approximate: false };
  } catch (err) {
    if (cached) return { ...cached, approximate: true };
    throw err;
  }
}

export { fetchDailyPrayerTimes, fetchMonthlyPrayerTimes };
