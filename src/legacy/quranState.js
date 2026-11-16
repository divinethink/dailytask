// quranState.js — কুরআন-রিডারের ডিভাইস-লোকাল অবস্থা (শেষ পাঠ)। localStorage অনুপলব্ধ হলে নীরবে বাদ।
// (ক্লাউড-সিঙ্ক ধাপ ৪-এ; তখনো এই লোকাল কপি থাকবে।)
const LAST_KEY = "dt_quran_last";

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
