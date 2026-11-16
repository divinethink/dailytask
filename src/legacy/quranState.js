// quranState.js — কুরআন-রিডারের ডিভাইস-লোকাল অবস্থা (শেষ পাঠ, দেখার পছন্দ)। localStorage অনুপলব্ধ হলে নীরবে বাদ।
// (ক্লাউড-সিঙ্ক ধাপ ৪-এ; তখনো এই লোকাল কপি থাকবে।)
import { sanitizePrefs } from "./quranCore.js";

const LAST_KEY = "dt_quran_last";
const PREFS_KEY = "dt_quran_prefs";

export function readLastRead() {
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function writeLastRead(list) {
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(list));
  } catch (e) { /* ignore */ }
}

export function readPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return sanitizePrefs(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return sanitizePrefs(null);
  }
}

export function writePrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) { /* ignore */ }
}
