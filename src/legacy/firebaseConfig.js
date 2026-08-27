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
db.enablePersistence().catch(() => {});
const auth = firebase.auth();

export { db, auth, analytics, logAnalyticsEvent };
