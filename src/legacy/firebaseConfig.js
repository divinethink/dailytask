// Firebase Setup
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
firebase.initializeApp(firebaseConfig);

// --- Firebase Analytics ---
// Wrapped in try/catch because Analytics can fail to init in environments
// without a real browser context (e.g. some in-app webviews) or when the
// firebase-analytics-compat.js script hasn't loaded — a failure here must
// never block the rest of the app from booting.
let analytics = null;
try {
  analytics = firebase.analytics();
} catch (e) {
  console.error("Firebase Analytics init failed:", e);
}
// Small helper so every call site doesn't need its own null-check/try-catch.
function logAnalyticsEvent(name, params) {
  try {
    if (analytics) analytics.logEvent(name, params);
  } catch (e) {
    // Analytics is a best-effort convenience layer — never throw from here.
  }
}

// --- Firebase App Check (reCAPTCHA v3) ---
// Runs completely in the background — no puzzle, no visible UI for the user.
// Get your site key from: Firebase Console → App Check → Apps → your web app → reCAPTCHA v3
// (You must also register/enable App Check for Firestore in the console.)
firebase.appCheck().activate(
  new firebase.appCheck.ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  true // isTokenAutoRefreshEnabled
);

const db = firebase.firestore();
// §অফলাইন ফিক্স(১৯ সেপ্টেম্বর ২০২৬, owner-রিপোর্টেড "অ্যাপ অফলাইনে চলে না"):
// আগে synchronizeTabs ছাড়া enablePersistence() কল হতো — PWA হোম-স্ক্রিন
// ইনস্ট্যান্স + ব্রাউজার ট্যাব(বা দুইটা ট্যাব) একসাথে খোলা থাকলে দ্বিতীয়
// instance-এ persistence 'failed-precondition' দিয়ে silently fail করত(শুধু
// প্রথম ট্যাবেই IndexedDB lock পেত) — catch(()=>{}) থাকায় কোনো log-ও হতো
// না, তাই এতদিন ধরা পড়েনি। Fix: synchronizeTabs:true দিয়ে একাধিক ট্যাব
// নিরাপদে persistence শেয়ার করে; সাথে diagnostic log(silent-swallow না
// রেখে) যোগ করা হলো, যাতে ভবিষ্যতে persistence fail করলে(যেমন সত্যিকারের
// unsupported browser) console-এ দেখা যায়।
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  console.error("[DT-Diag] Firestore offline-persistence enable ব্যর্থ — code:", err && err.code, err);
});
const auth = firebase.auth();

// --- Diagnostic helper(নতুন, ১৩ সেপ্টেম্বর ২০২৬, owner-reported sudden
// Google Sign-in/Add-Member ব্যর্থতা ইনসিডেন্ট-এর পরে) ---
// Firestore-এর "Missing or insufficient permissions" ও Google Sign-in
// popup-এর generic ব্যর্থতা — দুটোই App Check(reCAPTCHA v3) token mint
// ব্যর্থ হলে ঠিক একই রকম দেখায়(Firebase-এর পরিচিত confusing আচরণ — App
// Check reject করলে আলাদা কোনো distinguishing error code দেয় না, Rules-
// denial-এর মতোই দেখায়)। এই helper কোনো existing flow/logic পরিবর্তন করে
// না(pure-additive, fire-and-forget) — শুধু catch-block থেকে ডাকা হয়,
// console-এ প্রকৃত error.code/message + App Check স্বাস্থ্য log করে, যাতে
// পরের বার এই সমস্যা হলে browser console(বা remote-debug/screen-record)
// দেখে দ্রুত root-cause(App Check/network vs প্রকৃত Rules-denial) ধরা যায়।
function logAuthDiagnostics(context, err) {
  console.error(`[DT-Diag] ${context} ব্যর্থ — code: ${err && err.code}, message:`, err && err.message, err);
  try {
    firebase.appCheck().getToken(true)
      .then(() => console.log(`[DT-Diag] App Check টোকেন ঠিক আছে (${context})।`))
      .catch(acErr => console.error(`[DT-Diag] App Check টোকেন ব্যর্থ (${context}) — এটাই সম্ভবত মূল কারণ:`, acErr));
  } catch (e) { /* diagnostic কখনো app-flow block করবে না */ }
}

export { db, auth, analytics, logAnalyticsEvent, logAuthDiagnostics };
