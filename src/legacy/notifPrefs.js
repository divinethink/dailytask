// §Notification Settings (১৫ নভেম্বর ২০২৬, owner-requested) — মেনুর "নোটিফিকেশন" কার্ডের সেটিং।
// Pure module(React/Firebase নেই)। সেটিং প্রতি-ডিভাইস localStorage-এ (সংবেদনশীল নয়; নতুন
// Firestore schema/rules নেই)। এখন শুধু সেটিং সংরক্ষণ — আসল নোটিফিকেশন পাঠানো পরে
// অ্যান্ড্রয়েড অ্যাপ (Capacitor) ধাপে যুক্ত হবে।
export const NOTIF_PREFS_VERSION = 1;
export const PRAYER_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
export const SPECIAL_IDS = ["jumuah", "ashura", "arafah", "qadr", "eid", "bidh"];
export const PRAYER_LEAD = ["start", "min10", "jamaat"];
export const WEEKLY_TIMES = ["18:00", "20:00", "21:00"];
export const MEETING_DAYS = ["1", "15", "25", "last"];
export const DAILY_TIMES = ["20:00", "21:00", "22:00"];

export function defaultNotifPrefs() {
  return {
    v: NOTIF_PREFS_VERSION,
    master: true,
    prayer: { on: false, which: [...PRAYER_IDS], lead: "start" },
    weekly: { on: false, time: "21:00" },
    meeting: { on: false, day: "15" },
    special: { on: false, items: ["jumuah", "ashura", "arafah", "qadr", "eid"] },
    daily: { on: false, time: "21:00" }
  };
}

const pickOne = (v, allowed, dflt) => (allowed.includes(v) ? v : dflt);
const pickMany = (arr, allowed, dflt) =>
  Array.isArray(arr) ? allowed.filter(x => arr.includes(x)) : [...dflt];

// অজানা/ভাঙা ইনপুটে ডিফল্ট; অজানা ফিল্ড বাদ। কখনো throw করে না।
export function sanitizeNotifPrefs(raw) {
  const d = defaultNotifPrefs();
  const r = raw && typeof raw === "object" ? raw : {};
  const sub = k => (r[k] && typeof r[k] === "object" ? r[k] : {});
  return {
    v: NOTIF_PREFS_VERSION,
    master: r.master === false ? false : true,
    prayer: {
      on: sub("prayer").on === true,
      which: pickMany(sub("prayer").which, PRAYER_IDS, d.prayer.which),
      lead: pickOne(sub("prayer").lead, PRAYER_LEAD, d.prayer.lead)
    },
    weekly: { on: sub("weekly").on === true, time: pickOne(sub("weekly").time, WEEKLY_TIMES, d.weekly.time) },
    meeting: { on: sub("meeting").on === true, day: pickOne(sub("meeting").day, MEETING_DAYS, d.meeting.day) },
    special: { on: sub("special").on === true, items: pickMany(sub("special").items, SPECIAL_IDS, d.special.items) },
    daily: { on: sub("daily").on === true, time: pickOne(sub("daily").time, DAILY_TIMES, d.daily.time) }
  };
}

export function countEnabled(p) {
  return ["prayer", "weekly", "meeting", "special", "daily"].filter(k => p[k] && p[k].on).length;
}

const key = uid => `dt_notif_prefs_v${NOTIF_PREFS_VERSION}_${uid || "anon"}`;
export function loadNotifPrefs(uid) {
  try {
    const s = localStorage.getItem(key(uid));
    return sanitizeNotifPrefs(s ? JSON.parse(s) : null);
  } catch {
    return defaultNotifPrefs();
  }
}
export function saveNotifPrefs(uid, prefs) {
  try {
    localStorage.setItem(key(uid), JSON.stringify(sanitizeNotifPrefs(prefs)));
    return true;
  } catch {
    return false;
  }
}
