// jamaatTimes.js — "সময়সূচি" ট্যাবের "মসজিদের জামায়াত" কার্ডের pure logic + per-device localStorage।
// কোনো Firestore/Rules/schema নেই; React/DOM নেই। (Dev Rule: lib purity)
// জামায়াতের সময় দুই উপায়ে: "auto" = (ওয়াক্ত-শুরু | সূর্যোদয় | সূর্যাস্ত) ± N মিনিট, "fixed" = হাতে বসানো সময়(HH:MM, ২৪-ঘণ্টা)।
// হিসাবে না মিললে Owner যেকোনো ওয়াক্ত "fixed" করে সরাসরি ঠিক করতে পারেন।

export const JAMAAT_KEY = "dt_pt_jamaat";
export const JAMAAT_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
export const JAMAAT_LABEL = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা", jumuah: "জুমা" };
export const BASES = { start: "ওয়াক্ত শুরু", sunrise: "সূর্যোদয়", sunset: "সূর্যাস্ত" };
const STALE_DAYS = 35; // মসজিদ সাধারণত ঋতুতে/মাসে সময় বদলায় — এর বেশি পুরনো হলে মিলিয়ে নিতে বলা হয়

// Edit-ফর্মের শুরুর পরামর্শ(বাইতুল আমান জামে মসজিদ বোর্ড, ২ নভেম্বর ২০২৬ থেকে)। সংরক্ষণের আগে কিছুই সেভ হয় না।
export const SUGGESTED = {
  rules: {
    fajr: { mode: "auto", base: "sunrise", offset: -25, fixed: "05:40" },
    dhuhr: { mode: "fixed", base: "start", offset: 0, fixed: "13:15" },
    asr: { mode: "fixed", base: "sunset", offset: -65, fixed: "16:15" },
    maghrib: { mode: "auto", base: "sunset", offset: 10, fixed: "17:30" },
    isha: { mode: "fixed", base: "start", offset: 70, fixed: "19:45" },
  },
  jumuah: "13:30",
  roundTo: 5,
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isValidHHMM(v) {
  return typeof v === "string" && TIME_RE.test(v);
}

function cleanRule(raw, fallback) {
  const r = raw && typeof raw === "object" ? raw : {};
  const off = Number(r.offset);
  return {
    mode: r.mode === "fixed" ? "fixed" : "auto",
    base: BASES[r.base] ? r.base : fallback.base,
    offset: Number.isFinite(off) ? Math.max(-240, Math.min(240, Math.round(off))) : fallback.offset,
    fixed: isValidHHMM(r.fixed) ? r.fixed : fallback.fixed,
  };
}

// অবৈধ/অসম্পূর্ণ ডেটা থেকে নিরাপদ config; কিছু সেভ না থাকলে null("সেট করা হয়নি")।
export function sanitizeJamaat(raw) {
  if (!raw || typeof raw !== "object" || !raw.rules) return null;
  const rules = {};
  JAMAAT_KEYS.forEach((k) => {
    rules[k] = cleanRule(raw.rules[k], SUGGESTED.rules[k]);
  });
  return {
    mosque: typeof raw.mosque === "string" ? raw.mosque.slice(0, 60) : "",
    rules,
    jumuah: isValidHHMM(raw.jumuah) ? raw.jumuah : SUGGESTED.jumuah,
    roundTo: raw.roundTo === 5 ? 5 : 0,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : null,
  };
}

export function loadJamaat() {
  try {
    const raw = localStorage.getItem(JAMAAT_KEY);
    return raw ? sanitizeJamaat(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveJamaat(cfg) {
  const clean = sanitizeJamaat({ ...cfg, updatedAt: Date.now() });
  try {
    localStorage.setItem(JAMAAT_KEY, JSON.stringify(clean));
  } catch {
    return null;
  }
  return clean;
}

export function clearJamaat() {
  try {
    localStorage.removeItem(JAMAAT_KEY);
  } catch {}
}

function atTime(day, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}
const addMin = (d, n) => new Date(d.getTime() + n * 60000);
function roundDate(d, step) {
  if (!step) return d;
  const ms = step * 60000;
  return new Date(Math.round(d.getTime() / ms) * ms);
}

// schedule = { fajr, sunrise, dhuhr, asr, sunset, maghrib, isha, nextFajr }(সব Date)।
// ফেরত: [{ key, label, start, end, time, gapMin, source, warn }]; শুক্রবারে যোহরের সারি = জুমা।
export function resolveJamaat(cfg, schedule, day) {
  if (!cfg || !schedule) return [];
  const { fajr, sunrise, dhuhr, asr, sunset, maghrib, isha, nextFajr } = schedule;
  const win = {
    fajr: { start: fajr, end: sunrise },
    dhuhr: { start: dhuhr, end: asr },
    asr: { start: asr, end: sunset || maghrib },
    maghrib: { start: maghrib, end: isha },
    isha: { start: isha, end: nextFajr },
  };
  const baseTime = (k, base) => (base === "sunrise" ? sunrise : base === "sunset" ? sunset || maghrib : win[k].start);
  const friday = day.getDay() === 5;
  return JAMAAT_KEYS.map((k) => {
    const rule = cfg.rules[k];
    const isJumuah = k === "dhuhr" && friday;
    let time;
    let source = "fixed";
    if (isJumuah) {
      time = atTime(day, cfg.jumuah);
    } else if (rule.mode === "fixed") {
      time = atTime(day, rule.fixed);
    } else {
      source = "auto";
      time = roundDate(addMin(baseTime(k, rule.base), rule.offset), cfg.roundTo);
    }
    const { start, end } = win[k];
    let warn = null;
    if (time < start) warn = "ওয়াক্ত শুরুর আগে";
    else if (time >= end) warn = "ওয়াক্ত শেষের পরে";
    else if (k === "asr" && time > addMin(sunset || maghrib, -15)) warn = "মাকরূহ সময়ের কাছে";
    return {
      key: k,
      label: isJumuah ? JAMAAT_LABEL.jumuah : JAMAAT_LABEL[k],
      start,
      end,
      time,
      gapMin: Math.round((time.getTime() - start.getTime()) / 60000),
      source,
      warn,
    };
  });
}

// এখনের পরের প্রথম জামায়াত(আজকের মধ্যে); না থাকলে null।
export function nextJamaatKey(rows, now) {
  const r = rows.find((x) => x.time > now);
  return r ? r.key : null;
}

export function isStale(cfg, nowMs) {
  return !!(cfg && cfg.updatedAt && nowMs - cfg.updatedAt > STALE_DAYS * 86400000);
}
