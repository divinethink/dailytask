// Phase 4(চূড়ান্ত, ২১ সেপ্টেম্বর ২০২৬, modular v9 SDK Migration Plan —
// compat সম্পূর্ণ অপসারণ): সব consumer file(familyIdentity.js, memberData.js,
// backup.js, googleIdentity.js, blogData.js, quizData.js,
// legacyMigrationTools.js, editableContent.js, app.js) ইতিমধ্যে modular
// syntax-এ convert হয়ে গেছে(node --check + leftover-pattern sweep verified,
// প্রতিটা ধাপে)। এই ফাইলই ছিল compat-এর একমাত্র উৎস — global `firebase`
// bridge(globals.js)-এর উপর নির্ভরতা এখানেই শেষবারের মতো সরানো হলো।
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckToken } from "firebase/app-check";

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
const app = initializeApp(firebaseConfig);

// --- Firestore + অফলাইন persistence(একই সাথে, একবারই) ---
// §অফলাইন ফিক্স(১৯ সেপ্টেম্বর ২০২৬, owner-রিপোর্টেড "অ্যাপ অফলাইনে চলে না")-এর
// মূলনীতি অপরিবর্তিত(multi-tab-safe persistence) — শুধু API আধুনিক।
// compat-এ আগে `getFirestore()`(default settings)-এর পরে আলাদা
// `enablePersistence()` কল করতে হতো(এবং প্রথম operation-এর আগেই করতে হতো,
// নাহলে fail করত)। Modular v9-এ `initializeFirestore()`-এর একটাই কলে
// cache-strategy সেট করা যায় — এটাই এখন সেই *প্রথম ও একমাত্র*
// Firestore-instantiation, তাই persistence-timing-ঝুঁকি structurally দূর
// হয়ে গেছে(আগে যেটা comment করে সতর্ক করা হতো, Phase 1-এর নোট দ্রষ্টব্য)।
// `enableIndexedDbPersistence()`(deprecated) ব্যবহার করা হয়নি ইচ্ছাকৃতভাবে।
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

// --- Firebase Analytics ---
// Wrapped in try/catch because Analytics can fail to init in environments
// without a real browser context (e.g. some in-app webviews).
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.error("Firebase Analytics init failed:", e);
}
// Small helper so every call site doesn't need its own null-check/try-catch.
function logAnalyticsEvent(name, params) {
  try {
    if (analytics) logEvent(analytics, name, params);
  } catch (e) {
    // Analytics is a best-effort convenience layer — never throw from here.
  }
}

// --- Firebase App Check (reCAPTCHA v3) ---
// Runs completely in the background — no puzzle, no visible UI for the user.
// Get your site key from: Firebase Console → App Check → Apps → your web app → reCAPTCHA v3
// (You must also register/enable App Check for Firestore in the console.)
const appCheckInstance = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true
});

// --- Diagnostic helper(১৩ সেপ্টেম্বর ২০২৬, owner-reported sudden Google
// Sign-in/Add-Member ব্যর্থতা ইনসিডেন্ট-এর পরে) ---
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
    getAppCheckToken(appCheckInstance, true)
      .then(() => console.log(`[DT-Diag] App Check টোকেন ঠিক আছে (${context})।`))
      .catch(acErr => console.error(`[DT-Diag] App Check টোকেন ব্যর্থ (${context}) — এটাই সম্ভবত মূল কারণ:`, acErr));
  } catch (e) { /* diagnostic কখনো app-flow block করবে না */ }
}

// dbModular/authModular/analyticsModular — একই instance-এর alias-নাম,
// migration-এর সময় ধাপে-ধাপে convert হওয়া consumer file-গুলো এই নামেই
// import করেছিল(backward-compat, কোনো নতুন file-touch লাগবে না)।
export { db, auth, analytics, logAnalyticsEvent, logAuthDiagnostics, db as dbModular, auth as authModular, analytics as analyticsModular };
