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

// ── ধাপ ৪: বুকমার্ক/পছন্দ (লোকাল কপি) ও "ক্লাউডে পাঠানো বাকি" চিহ্ন ──
const MARKS_KEY = "dt_quran_marks";
const DIRTY_KEY = "dt_quran_dirty";

export function readMarks() {
  try {
    const raw = window.localStorage.getItem(MARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function writeMarks(list) {
  try {
    window.localStorage.setItem(MARKS_KEY, JSON.stringify(list));
  } catch (e) { /* ignore */ }
}

export function readDirty() {
  try {
    return window.localStorage.getItem(DIRTY_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function writeDirty(on) {
  try {
    if (on) window.localStorage.setItem(DIRTY_KEY, "1");
    else window.localStorage.removeItem(DIRTY_KEY);
  } catch (e) { /* ignore */ }
}
