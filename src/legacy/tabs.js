// §Bottom Navigation — activeTab single source of truth(2_4_Identity_Simplification_Plan.md
// §৯.২)। App()(src/legacy/app.js) ও ভবিষ্যতের 3_1/3_2/3_3(Public Tools) উভয় পক্ষ এই
// constant-গুলো import করে ব্যবহার করবে — raw string literal লিখলে typo-drift(যেমন
// "prayertimes" vs "prayerTimes") routing নিঃশব্দে ভেঙে দিতে পারে, তাই কোথাও raw string
// লেখা হবে না।
export const TAB_FAMILY = "family";
export const TAB_PRAYER_TIMES = "prayerTimes";
export const TAB_AMOL = "amol"; // পূর্বে TAB_TASBIH("tasbih") — ১৬ সেপ্টেম্বর ২০২৬ redesign(3_1 §"আমল হাব")
export const TAB_TOOLS = "tools";
export const TAB_SETTINGS = "settings";

// sessionStorage key(browser-session বন্ধ হলে হারায়, reload/reopen একই session-এ persist)
export const ACTIVE_TAB_STORAGE_KEY = "dt_active_tab";
