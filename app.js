// Firebase Setup
const firebaseConfig = {
  apiKey: "AIzaSyCqvGSmjEY6PRnsdGh016Ta1m8PLjolqgA",
  authDomain: "daily-task-family.firebaseapp.com",
  projectId: "daily-task-family",
  storageBucket: "daily-task-family.firebasestorage.app",
  messagingSenderId: "10031644603",
  appId: "1:10031644603:web:afaf01434c65147d988e9e",
  measurementId: "G-G8EDTPLW52"
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
  new firebase.appCheck.ReCaptchaV3Provider("6LetBG8tAAAAAG8XPxIC3RIWkG9hPnCXY3ZCN4fz"),
  true // isTokenAutoRefreshEnabled
);

const db = firebase.firestore();
db.enablePersistence().catch(() => {});
const auth = firebase.auth();

// Feedback submission — powered by Web3Forms (no server/coding needed).
// 1. Go to https://web3forms.com and enter your email to get a free
//    "Access Key" (arrives instantly by email, no account required).
// 2. Paste that key below, replacing the placeholder text.
const WEB3FORMS_ACCESS_KEY = "4e0befa2-68c6-4c9e-92fb-ecffa3b4b2de";
// ভুল করে ভুল অক্ষর পড়া এড়াতে 0/O এবং 1/I বাদ দেওয়া হয়েছে
const FAMILY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateSecureCode(length) {
  const cryptoObj = window.crypto || window.msCrypto;
  let out = "";
  if (cryptoObj && cryptoObj.getRandomValues) {
    const arr = new Uint32Array(length);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < length; i++) out += FAMILY_CODE_CHARS[arr[i] % FAMILY_CODE_CHARS.length];
  } else {
    // পুরনো ব্রাউজারের জন্য fallback
    for (let i = 0; i < length; i++) out += FAMILY_CODE_CHARS[Math.floor(Math.random() * FAMILY_CODE_CHARS.length)];
  }
  return out;
}
// --- App creator-only client-side helper (Rules-এর isAppCreator()-এর সাথে
// সামঞ্জস্যপূর্ণ একই UID) — শুধু convenience check, কোনো নিজস্ব
// security boundary না (আসল নিরাপত্তা সবসময় Firestore Rules-এই enforced)।
const APP_CREATOR_UID = "yiirNJKJHlM27guiiS10zsp2FYT2";
function isCreatorAuth() {
  return !!(auth.currentUser && auth.currentUser.uid === APP_CREATOR_UID);
}
// --- Creator family override (শুধু browser console, শুধু creator UID) ---
// উদ্দেশ্য: creator-এর Google account অন্য family-র সাথে link করা থাকলেও
// (users/{uid}.familyCode), boot-এ syncFamilyCodeWithAccount() যেন এই
// ম্যানুয়ালি বেছে নেওয়া family-কে account-linked কোডে ফিরিয়ে না দেয়।
// শুধু read/verify-এর জন্য — write permission পেতে হলে সেই family-র
// adminUids-এ owner Firebase Console থেকে সাময়িকভাবে uid যোগ করতে হবে
// (এই ফাংশন সেটা করে না)।
const CREATOR_OVERRIDE_KEY = "dt_creator_family_override";
async function enterFamilyAsCreator(code) {
  if (!isCreatorAuth()) {
    console.error("[Creator override] শুধু app creator-এর জন্য।");
    return { aborted: true, reason: "not-creator" };
  }
  const normalized = (code || "").trim();
  if (!normalized) return { aborted: true, reason: "empty" };
  try {
    const snap = await db.collection("familyCodes").doc(normalized).get();
    if (!snap.exists) {
      console.error("[Creator override] এই কোডের কোনো family পাওয়া যায়নি।");
      return { aborted: true, reason: "not-found" };
    }
    const targetFamilyId = snap.data() ? snap.data().familyId : null;
    if (!targetFamilyId) return { aborted: true, reason: "not-found" };
    console.log(`[Creator override] সুইচ হচ্ছে — কোড: ${normalized}, familyId: ${targetFamilyId}। রিলোড হচ্ছে...`);
    localStorage.setItem("family_code", normalized);
    localStorage.setItem("family_id", targetFamilyId);
    localStorage.setItem(CREATOR_OVERRIDE_KEY, normalized);
    window.location.reload();
    return { success: true };
  } catch (err) {
    console.error("[Creator override] ব্যর্থ:", err.message);
    return { aborted: true, reason: "error", error: err.message };
  }
}
function exitCreatorOverride() {
  localStorage.removeItem(CREATOR_OVERRIDE_KEY);
  localStorage.removeItem("family_code");
  localStorage.removeItem("family_id");
  window.location.reload();
}
if (typeof window !== "undefined") {
  window.enterFamilyAsCreator = enterFamilyAsCreator;
  window.exitCreatorOverride = exitCreatorOverride;
}
function getFamilyCode() {
  let code = localStorage.getItem("family_code");
  if (!code) {
    // ৬ থেকে বাড়িয়ে ৯ ক্যারেক্টার করা হয়েছে — brute-force আরও কঠিন করতে
    code = "FAM-" + generateSecureCode(9);
    localStorage.setItem("family_code", code);
  }
  return code;
}
const FAMILY_CODE_MIN_LENGTH = 9;
const FAMILY_CODE_MAX_LENGTH = 30;
// শুধু যেসব ক্যারেক্টার Firestore-এর path/collection নাম ভাঙতে পারে বা কপি-পেস্টে সমস্যা করে,
// সেগুলোই বাদ: space, / (path separator), \ , ' এবং " (quoting সমস্যা এড়াতে)।
// বাকি সব ইংরেজি অক্ষর (ছোট/বড় হাতের), সংখ্যা এবং বিশেষ চিহ্ন (@#*!$%^&()_+= ইত্যাদি) allow।
const FAMILY_CODE_CHARSET_PATTERN = /^(?!\.+$)(?!__.*__$)[^\s/\\'"]+$/;
function isFamilyCodeCharsetValid(code) {
  return FAMILY_CODE_CHARSET_PATTERN.test(code);
}
function setFamilyCode(code) {
  if (!code || !code.trim()) return;
  const normalized = code.trim();
  if (normalized.length < FAMILY_CODE_MIN_LENGTH || normalized.length > FAMILY_CODE_MAX_LENGTH) {
    alert(`ফ্যামিলি কোড ${FAMILY_CODE_MIN_LENGTH} থেকে ${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`);
    return;
  }
  if (!isFamilyCodeCharsetValid(normalized)) {
    alert("ফ্যামিলি কোডে স্পেস, / (স্ল্যাশ), \\ (ব্যাকস্ল্যাশ), বা কোটেশন চিহ্ন ( ' \" ) ব্যবহার করা যাবে না।");
    return;
  }
  localStorage.setItem("family_code", normalized);
  localStorage.setItem("family_code_is_custom", "1");
  window.location.reload();
}
// =====================================================================
// --- §৫ Family Code Lifecycle Fix: দুটি পৃথক, স্পষ্ট-সীমাবদ্ধ অপারেশন ---
// =====================================================================
// এই দুটি ফাংশন এখনো কোনো UI বাটনের সাথে যুক্ত নয় এবং boot flow-এ ডাকা
// হয় না — শুধু browser console থেকে ম্যানুয়ালি (owner-approved টেস্টিং/
// রোলআউটের জন্য প্রস্তুত রাখা হলো)। বিদ্যমান "কাস্টম ফ্যামিলি কোড সেট
// করুন" মেনু বাটন এখনো পুরনো setFamilyCode()-ই ব্যবহার করছে — এই fix
// UI-তে wire করা একটি আলাদা, পরবর্তী owner-approved ধাপ।
//
// changeFamilyCodeForExistingFamily(newCode): একই familyId, শুধু নতুন
// familyCode — dataCollectionName (আসল ডাটা কালেকশনের নাম) কখনো ছোঁয়া
// হয় না, তাই বিদ্যমান data_<oldCode> কালেকশনই (কোনো copy/rename/delete
// ছাড়া) স্বাভাবিকভাবে ব্যবহৃত হতে থাকে — শুধু পরিবারের "পরিচিতি কোড"
// বদলায়। Admin-only (adminUids-এ থাকা uid ছাড়া কেউ পারবে না — Rules-এও
// server-side enforced)। transaction ব্যবহার করা হয়েছে যাতে
// familyCode-update ও নতুন/পুরনো familyCodes mapping — সব atomic হয়।
async function changeFamilyCodeForExistingFamily(newCode) {
  const normalized = (newCode || "").trim();
  if (!normalized) return { aborted: true, reason: "empty" };
  if (normalized.length < FAMILY_CODE_MIN_LENGTH || normalized.length > FAMILY_CODE_MAX_LENGTH) {
    console.error(`[Family Code change] কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`);
    return { aborted: true, reason: "length" };
  }
  if (!isFamilyCodeCharsetValid(normalized)) {
    console.error("[Family Code change] অবৈধ ক্যারেক্টার।");
    return { aborted: true, reason: "charset" };
  }
  const familyId = getFamilyId();
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  if (!uid) {
    console.error("[Family Code change] সাইন ইন করা নেই।");
    return { aborted: true, reason: "no-auth" };
  }
  try {
    let oldCode = null;
    await db.runTransaction(async tx => {
      const familyRef = db.collection("families").doc(familyId);
      const snap = await tx.get(familyRef);
      if (!snap.exists) throw new Error("families ডকুমেন্ট পাওয়া যায়নি।");
      const fam = snap.data();
      if (!Array.isArray(fam.adminUids) || !fam.adminUids.includes(uid)) {
        throw new Error("শুধুমাত্র এই family-এর Admin কোড পরিবর্তন করতে পারবেন।");
      }
      oldCode = fam.familyCode || null;
      const newCodeRef = db.collection("familyCodes").doc(normalized);
      const newCodeSnap = await tx.get(newCodeRef);
      if (newCodeSnap.exists && newCodeSnap.data().familyId !== familyId) {
        throw new Error("এই কোড ইতিমধ্যে অন্য একটি family ব্যবহার করছে।");
      }
      tx.set(newCodeRef, { familyId, createdAt: Date.now() });
      tx.update(familyRef, { familyCode: normalized, updatedAt: Date.now() });
      // পুরনো familyCodes/<oldCode> mapping delete করা হচ্ছে (owner
      // নিশ্চিত করেছেন এই ছোট family-তে ডাটা-হারানোর ঝুঁকি নেই) —
      // dataCollectionName অপরিবর্তিত থাকায় আসল ডাটা কোনোভাবেই touched
      // হয় না, শুধু code→familyId lookup-এর পুরনো এন্ট্রি সরানো হচ্ছে।
      if (oldCode && oldCode !== normalized) {
        tx.delete(db.collection("familyCodes").doc(oldCode));
      }
    });
    console.log(`[Family Code change] সফল — পুরনো কোড: ${oldCode || "(ছিল না)"}, নতুন কোড: ${normalized}। dataCollectionName অপরিবর্তিত (আসল ডাটা একই কালেকশনে)। রিলোড হচ্ছে...`);
    // §৫ fix — Google-linked হলে account-এর সাথে সংরক্ষিত familyCode-ও
    // (users/{uid}.familyCode) আপডেট করা হচ্ছে, নইলে পরের বুটে
    // syncFamilyCodeWithAccount() পুরনো account-linked কোড দেখে এই
    // device-কে আবার পুরনো কোডে ফিরিয়ে দিতে পারে (ও ensureFamilyCodeMapping()
    // তখন পুরনো familyCodes/<oldCode> mapping ভুলবশত পুনরায় তৈরি করে
    // ফেলবে)। Best-effort — ব্যর্থ হলেও rename নিজে সফলই থাকে।
    if (isGoogleLinked()) {
      try {
        await saveUserFamilyCode(uid, normalized);
      } catch {}
    }
    localStorage.setItem("family_code", normalized);
    localStorage.setItem("family_code_is_custom", "1");
    window.location.reload();
    return { success: true };
  } catch (err) {
    console.error("[Family Code change] ব্যর্থ:", err.message);
    return { aborted: true, reason: "error", error: err.message };
  }
}
if (typeof window !== "undefined") {
  window.changeFamilyCodeForExistingFamily = changeFamilyCodeForExistingFamily;
}
// createNewFamily(newCode): সম্পূর্ণ নতুন familyId + familyCode +
// dataCollectionName — stale localStorage.family_id কখনো reuse হয় না
// (generateSecureCode(20) দিয়ে fresh id)। এটি একটি সম্পূর্ণ blank/নতুন
// family তৈরি করে — বিদ্যমান কোনো family/data স্পর্শ করে না।
async function createNewFamily(newCode) {
  const normalized = (newCode || "").trim();
  if (!normalized) return { aborted: true, reason: "empty" };
  if (normalized.length < FAMILY_CODE_MIN_LENGTH || normalized.length > FAMILY_CODE_MAX_LENGTH) {
    console.error(`[New Family] কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`);
    return { aborted: true, reason: "length" };
  }
  if (!isFamilyCodeCharsetValid(normalized)) {
    console.error("[New Family] অবৈধ ক্যারেক্টার।");
    return { aborted: true, reason: "charset" };
  }
  const newFamilyId = generateSecureCode(20);
  try {
    const codeRef = db.collection("familyCodes").doc(normalized);
    const codeSnap = await codeRef.get();
    if (codeSnap.exists) {
      console.error("[New Family] এই কোড ইতিমধ্যে ব্যবহৃত হচ্ছে।");
      return { aborted: true, reason: "code-taken" };
    }
    await codeRef.set({ familyId: newFamilyId, createdAt: Date.now() });
    await db.collection("families").doc(newFamilyId).set({
      familyId: newFamilyId,
      familyCode: normalized,
      isCustomCode: true,
      dataCollectionName: `data_${normalized}`,
      createdAt: Date.now(),
      createdByUid: auth.currentUser ? auth.currentUser.uid : null,
      schemaVersion: 1,
      adminUids: []
    });
    // §৫ Flow A fix — creation-এর সময় Rules অনুযায়ী adminUids বাধ্যতামূলক
    // [] থাকে (দেখুন firestore.rules create clause), তাই এখানে আলাদা
    // update() call দিয়ে first admin claim করা হচ্ছে (Rules-এর update
    // clause: adminUids.size()==0 → [request.auth.uid], শুধু
    // adminUids+updatedAt diff) — reload-এর আগে, যাতে নতুন family
    // admin-বিহীন অবস্থায় শুরু না হয়। Best-effort: ব্যর্থ হলেও পুরো
    // family-creation abort হবে না (family তৈরি হয়ে গেছে), শুধু log হবে —
    // পরে claimFirstAdminIfEligible() বা ম্যানুয়াল রিকভারি সম্ভব।
    if (auth.currentUser) {
      try {
        await db.collection("families").doc(newFamilyId).update({
          adminUids: [auth.currentUser.uid],
          updatedAt: Date.now()
        });
      } catch (claimErr) {
        console.error("[New Family] Admin claim ব্যর্থ (family তৈরি হয়েছে, কিন্তু admin claim হয়নি):", claimErr.message);
      }
    } else {
      console.error("[New Family] auth.currentUser নেই — admin claim স্কিপ হলো।");
    }
    console.log(`[New Family] সফল — নতুন familyId: ${newFamilyId}, কোড: ${normalized}। রিলোড হচ্ছে...`);
    localStorage.setItem("family_id", newFamilyId);
    localStorage.setItem("family_code", normalized);
    localStorage.setItem("family_code_is_custom", "1");
    window.location.reload();
    return { success: true, familyId: newFamilyId };
  } catch (err) {
    console.error("[New Family] ব্যর্থ:", err.message);
    return { aborted: true, reason: "error", error: err.message };
  }
}
if (typeof window !== "undefined") {
  window.createNewFamily = createNewFamily;
}
// joinExistingFamily(code): বিদ্যমান কোনো family-তে "যোগ দেওয়া" — নতুন কোনো
// family/data তৈরি হয় না। শুধু familyCodes/<code> lookup করে টার্গেট
// familyId বের করা হয়, migrationState=="v2" কিনা যাচাই হয় (v2 ছাড়া blocked
// — legacy read-gate এখনো implement হয়নি), তারপর এই ডিভাইসের localStorage
// টার্গেট family-তে সুইচ করে reload হয়। এরপর বুট-টাইমের বিদ্যমান
// accessDenied/self-request হ্যান্ডলিং (migrateMembersIfNeeded catch ব্লক)
// নিজে থেকেই pending accessRequest তৈরি করবে অথবা আগে থেকে approved থাকলে
// সরাসরি ঢুকিয়ে দেবে — এখানে নতুন করে সেই লজিক ডুপ্লিকেট করা হয়নি।
async function joinExistingFamily(code) {
  const normalized = (code || "").trim();
  if (!normalized) return { aborted: true, reason: "empty" };
  if (normalized === getFamilyCode()) {
    return { aborted: true, reason: "same-family" };
  }
  try {
    const codeSnap = await db.collection("familyCodes").doc(normalized).get();
    if (!codeSnap.exists) {
      return { aborted: true, reason: "not-found" };
    }
    const targetFamilyId = codeSnap.data() ? codeSnap.data().familyId : null;
    if (!targetFamilyId) {
      return { aborted: true, reason: "not-found" };
    }
    const famSnap = await db.collection("families").doc(targetFamilyId).get();
    if (!famSnap.exists) {
      return { aborted: true, reason: "not-found" };
    }
    const migrationState = famSnap.data().migrationState || "legacy";
    if (migrationState !== "v2") {
      return { aborted: true, reason: "not-v2" };
    }
    console.log(`[Join Family] সফল লুকআপ — কোড: ${normalized}, familyId: ${targetFamilyId}। এই ডিভাইস সুইচ হচ্ছে, রিলোড হচ্ছে...`);
    localStorage.setItem("family_id", targetFamilyId);
    localStorage.setItem("family_code", normalized);
    localStorage.removeItem("family_code_is_custom");
    window.location.reload();
    return { success: true };
  } catch (err) {
    console.error("[Join Family] ব্যর্থ:", err.message);
    return { aborted: true, reason: "error", error: err.message };
  }
}
if (typeof window !== "undefined") {
  window.joinExistingFamily = joinExistingFamily;
}
// =====================================================================
// --- Phase A (Family ID Foundation) — শুধু প্রস্তুতি, কোনো read/write ---
// --- path এখনো বদলায়নি। app এখনও data_<familyCode>-ই পড়ে/লেখে। এই ---
// --- অংশ শুধু নীরবে familyId তৈরি করে ও familyCodes/<code> → familyId ---
// --- lookup mapping লেখে (best-effort, ব্যর্থ হলেও app-এর মূল কাজ ---
// --- অপ্রভাবিত থাকে) — যাতে ভবিষ্যতে migration সহজে শুরু করা যায়। ---
// =====================================================================
function getFamilyId() {
  let id = localStorage.getItem("family_id");
  if (!id) {
    // FAMILY_CODE_CHARS/generateSecureCode() পুনর্ব্যবহার — একই নিরাপদ,
    // ভুল-পড়া-প্রতিরোধী charset।
    id = generateSecureCode(20);
    localStorage.setItem("family_id", id);
  }
  return id;
}
// একবারই লেখে (setOnce) — বিদ্যমান mapping থাকলে ছোঁয়া হয় না, ফলে
// একাধিক ডিভাইস থেকে একই family-এর জন্য বারবার কল হলেও নিরাপদ।
async function ensureFamilyCodeMapping() {
  try {
    const code = getFamilyCode();
    const ref = db.collection("familyCodes").doc(code);
    const snap = await ref.get();
    if (snap.exists) {
      // BUG FIX: আগে এখানে কিছুই করা হতো না যখন mapping আগে থেকেই থাকত
      // (যেমন অন্য device থেকে তৈরি) — ফলে এই device-এর local family_id
      // কখনো server-এর familyId-এর সাথে sync হতো না, এবং getFamilyId()
      // (অন্য কোনো কল-সাইট থেকে প্রথমবার ডাকা হলে) ভুলভাবে একটা নতুন,
      // ভিন্ন random id বানিয়ে ফেলত। এখন server-ই সবসময় source of truth —
      // local family_id server-এর familyId-এর সাথে না মিললে (বা না
      // থাকলে) local-কে server অনুযায়ী মিলিয়ে নেওয়া হয়। এটি self-healing:
      // আগে থেকে ভুল/mismatched local family_id থাকলেও পরের বুটেই ঠিক
      // হয়ে যাবে।
      const serverFamilyId = snap.data() ? snap.data().familyId : null;
      if (serverFamilyId && localStorage.getItem("family_id") !== serverFamilyId) {
        localStorage.setItem("family_id", serverFamilyId);
      }
    } else {
      await ref.set({ familyId: getFamilyId(), createdAt: Date.now() });
    }
  } catch {
    // Best-effort — future-migration prep, app boot কখনো এর জন্য আটকাবে না।
  }
}
// families/<familyId> ডকুমেন্টই family-এর "root/meta" ডকুমেন্ট হিসেবে
// কাজ করবে (design doc-এর "families/<familyId>/meta" ধারণার একটি ছোট,
// সরলীকৃত বাস্তবায়ন — future members/entries subcollection এই একই
// root doc-এর নিচে নেস্ট হবে)। এই মুহূর্তে এটি শুধু background prep;
// কোনো UI feature এখনো এর ওপর নির্ভর করে না।
function familyDocRef() {
  return db.collection("families").doc(getFamilyId());
}
async function ensureFamilyMeta() {
  try {
    const ref = familyDocRef();
    const snap = await ref.get();
    if (!snap.exists) {
      // §৫ Family Code Lifecycle fix: dataCollectionName এখন থেকেই family
      // তৈরির মুহূর্তে একবার স্থায়ীভাবে সেট হয় — এটাই সেই আসল Firestore
      // কালেকশনের নাম যেখানে entries/members/weekly সবসময় থাকবে।
      // familyCode ভবিষ্যতে যতবারই বদলাক (changeFamilyCodeForExistingFamily),
      // dataCollectionName কখনো বদলাবে না — তাই আসল ডাটা কালেকশন কখনো
      // "হারিয়ে যাবে না" বা code-change-এর সাথে ভেঙে পড়বে না।
      await ref.set({
        familyId: getFamilyId(),
        familyCode: getFamilyCode(),
        isCustomCode: localStorage.getItem("family_code_is_custom") === "1",
        dataCollectionName: `data_${getFamilyCode()}`,
        createdAt: Date.now(),
        createdByUid: auth.currentUser ? auth.currentUser.uid : null,
        schemaVersion: 1,
        adminUids: []
      });
    }
  } catch {
    // Best-effort — future-migration prep।
  }
}
// §৫ fix: বিদ্যমান (এই fix-এর আগে তৈরি হওয়া) family-দের dataCollectionName
// field নেই — এই ফাংশন সেটা একবারই, নিরাপদে ব্যাকফিল করে। derived মান
// সবসময় বর্তমান familyCode থেকেই বের করা হয় (getCollectionName() আগে
// প্রতিটি কলে ঠিক এই একই মান লাইভ গণনা করত) — তাই কোনো ডাটা move/copy/
// rename হয় না, শুধু এই নতুন metadata field একবার persist হয়। ব্যর্থ হলেও
// (network/rules-not-yet-deployed) local cache-এ derived মান বসিয়ে app
// আগের মতোই কাজ করে — পরের সফল বুটে আবার ব্যাকফিল চেষ্টা হবে (idempotent)।
let cachedDataCollectionName = null;
async function ensureDataCollectionName() {
  try {
    const ref = familyDocRef();
    const snap = await ref.get();
    const existing = snap.exists ? snap.data().dataCollectionName : null;
    if (existing) {
      cachedDataCollectionName = existing;
      return;
    }
    const derived = `data_${getFamilyCode()}`;
    if (snap.exists) {
      try {
        await ref.update({ dataCollectionName: derived, updatedAt: Date.now() });
      } catch {
        // Best-effort ব্যাকফিল — persist ব্যর্থ হলেও নিচের cache assignment
        // দিয়ে app চলতি সেশনে ঠিকভাবেই কাজ করবে।
      }
    }
    cachedDataCollectionName = derived;
  } catch {
    cachedDataCollectionName = null; // getCollectionName() নিচে নিরাপদ fallback করবে
  }
}
// legacyCollectionMap backfill — আগে এই mapping শুধু Phase C copy script
// (copyPhaseCData()) চালানোর সময় তৈরি হতো, তাই এখনো legacy-তে থাকা
// family-দের (যেমন বোনের family) জন্য এই doc নেই। Legacy read-rule gate
// (isApprovedMember() ভিত্তিক) deploy করার আগে এই mapping সব family-র জন্য
// থাকা বাধ্যতামূলক — নাহলে rule deploy-এর সাথে সাথেই এখনো-legacy family-রা
// lock out হয়ে যাবে। ensureFamilyCodeMapping()-এর মতোই setOnce (আগে থেকে
// থাকলে ছোঁয়া হয় না), best-effort — ব্যর্থ হলেও app boot আটকাবে না, শুধু
// পরের বুটে আবার চেষ্টা হবে। বিদ্যমান rule-ই এই create allow করে (কোনো
// rule change ছাড়াই কাজ করে)।
async function ensureLegacyCollectionMap() {
  try {
    const collectionName = getCollectionName();
    if (!collectionName) return;
    const mapRef = db.collection("legacyCollectionMap").doc(collectionName);
    const snap = await mapRef.get();
    if (!snap.exists) {
      await mapRef.set({ familyId: getFamilyId(), createdAt: Date.now() });
    }
  } catch {
    // Best-effort — legacy read-rule gate deploy-এর আগে backfill নিশ্চিত
    // করতে সাহায্য করা এর উদ্দেশ্য, কিন্তু ব্যর্থ হলে app boot কখনো এর
    // জন্য আটকাবে না; পরের বুটে আবার চেষ্টা হবে।
  }
}
// প্রথম Admin claim — ডিজাইন অনুযায়ী তিনটি ট্রিগারে ডাকা হয়:
// (১) কেউ custom Family Code সেট করলে, (২) কেউ Google Sign-in link করলে,
// (৩) প্রতিটি app boot-এ (Legacy read-rule gate fix, নতুন) — যাতে
// ব্র্যান্ড-নতুন/একা (adminUids:[]) family নিজের data পড়তে trigger #১/#২-এর
// অপেক্ষা না করে। যে uid প্রথমে claim করে, সে-ই প্রথম Admin হবে —
// "প্রথম-আসা" নিয়মটি Firestore Rules-এ server-side enforced (adminUids
// ফাঁকা থাকলেই কেবল লেখা গৃহীত হয়), শুধু client-side check নয়।
async function claimFirstAdminIfEligible() {
  if (!auth.currentUser) return;
  try {
    await ensureFamilyMeta();
    const ref = familyDocRef();
    const snap = await ref.get();
    const current = snap.exists ? snap.data().adminUids || [] : [];
    if (current.length === 0) {
      await ref.update({ adminUids: [auth.currentUser.uid], updatedAt: Date.now() });
    }
  } catch {
    // Best-effort — Admin claim ব্যর্থ হলেও মূল ফিচার (Family Code set /
    // Google link) কখনো ব্লক হবে না; পরের trigger-এ আবার চেষ্টা হবে।
  }
}
// =====================================================================
// --- Phase C prep: Dry-run Readiness Check (READ-ONLY, শুধু ম্যানুয়াল) ---
// =====================================================================
// এই ফাংশন কোনো UI বাটনের সাথে যুক্ত নয় এবং boot/app flow-এর কোনো অংশে
// স্বয়ংক্রিয়ভাবে ডাকা হয় না — শুধু browser DevTools console থেকে
// ম্যানুয়ালি চালানোর জন্য (`dryRunPhaseCReadinessCheck()` লিখে Enter)।
// এটি data_<familyCode> collection-এর ওপর একটিমাত্র read (.get()) করে
// এবং শুধু গণনা/রিপোর্ট করে — কোনো write/update/delete করে না। উদ্দেশ্য:
// Phase C-এর আসল migration script লেখার আগে scope (কতগুলো ডকুমেন্ট) ও
// edge-case (updatedAt-বিহীন পুরনো ডকুমেন্ট, অপরিচিত key প্যাটার্ন)
// আগে থেকে জানা।
async function dryRunPhaseCReadinessCheck() {
  console.log("[Phase C dry-run] শুরু হচ্ছে — শুধু read, কোনো write হবে না। Family:", getFamilyCode());
  const snap = await db.collection(getCollectionName()).get();
  const report = {
    totalDocs: snap.size,
    members: 0,
    entries: 0,
    weekly: 0,
    customFields: 0,
    meetings: 0,
    other: 0,
    missingUpdatedAt: [],
    unexpectedKeyPattern: []
  };
  snap.docs.forEach(doc => {
    const id = doc.id;
    const data = doc.data();
    if (id.startsWith("member:")) report.members += 1;
    else if (id.startsWith("entry:")) report.entries += 1;
    else if (id.startsWith("weekly:")) report.weekly += 1;
    else if (id === "custom_fields") report.customFields += 1;
    else if (id.startsWith("meeting_rows_v2:")) report.meetings += 1;
    else report.other += 1;

    const isMemberScoped = id.startsWith("member:") || id.startsWith("entry:") || id.startsWith("weekly:");
    if (isMemberScoped && (data.updatedAt === undefined || data.updatedAt === null)) {
      report.missingUpdatedAt.push(id);
    }

    const parts = id.split(":");
    const isKnownPrefix = ["member", "entry", "weekly"].includes(parts[0])
      || id === "custom_fields"
      || id.startsWith("meeting_rows_v2:");
    if (!isKnownPrefix) report.unexpectedKeyPattern.push(id);
  });
  console.log("[Phase C dry-run] সম্পন্ন — রিপোর্ট (কোনো ডাটা পরিবর্তিত হয়নি):");
  console.table({
    "মোট ডকুমেন্ট": report.totalDocs,
    "member:": report.members,
    "entry:": report.entries,
    "weekly:": report.weekly,
    "custom_fields": report.customFields,
    "meeting_rows_v2:": report.meetings,
    "অপরিচিত/other": report.other
  });
  if (report.missingUpdatedAt.length) {
    console.warn("[Phase C dry-run] updatedAt-বিহীন ডকুমেন্ট (backward-compat fallback দরকার হতে পারে):", report.missingUpdatedAt);
  }
  if (report.unexpectedKeyPattern.length) {
    console.warn("[Phase C dry-run] অপরিচিত key প্যাটার্ন (ম্যানুয়াল রিভিউ দরকার):", report.unexpectedKeyPattern);
  }
  return report;
}
// শুধু ম্যানুয়াল console-invocation-এর জন্য window-এ এক্সপোজ — কোনো UI
// বাটন/মেনু আইটেম নেই, তাই সাধারণ ব্যবহারকারীর জন্য এটি অদৃশ্য/অপ্রবেশ্য।
if (typeof window !== "undefined") {
  window.dryRunPhaseCReadinessCheck = dryRunPhaseCReadinessCheck;
}
// =====================================================================
// --- Phase C: Copy ধাপ (শুধু কপি — Verify/Switch/Cleanup এখানে নেই) ---
// =====================================================================
// এই ফাংশনও UI বাটনের সাথে যুক্ত নয়, boot flow-এ ডাকা হয় না — শুধু
// browser console থেকে ম্যানুয়ালি (`copyPhaseCData()`)। কাজ:
//   ১. Guard — familyCodes/<code>-এ server-side mapped familyId, local
//      getFamilyId()-এর সাথে মেলা বাধ্যতামূলক। না মিললে/না পাওয়া গেলে
//      সাথে সাথে return করে থামে — এর নিচের কোনো write কোডই চলে না।
//   ২. member:/entry:/weekly: prefix-ওয়ালা ডকুমেন্ট (legacy bare
//      "members" doc বাদ) families/<verifiedFamilyId>/members|entries|
//      weekly-তে কপি করে — data_<familyCode> সম্পূর্ণ অস্পৃশ্য থাকে।
//   ৩. শেষে শুধু একটা report log করে থামে — কোনো Verify/Switch/Cleanup
//      ফাংশন এখানে (বা কোথাও) এখনো লেখাই হয়নি, তাই chain হওয়ার সুযোগ নেই।
async function copyPhaseCData() {
  console.log("[Phase C copy] শুরু হচ্ছে — প্রথমে guard যাচাই (server-verified familyId)...");
  const code = getFamilyCode();
  const localId = getFamilyId();
  let serverId = null;
  try {
    const codeSnap = await db.collection("familyCodes").doc(code).get();
    serverId = codeSnap.exists ? codeSnap.data().familyId : null;
  } catch (err) {
    console.error("[Phase C copy] Guard ব্যর্থ — familyCodes লুকআপ করতে সমস্যা হয়েছে। কোনো write হয়নি।", err);
    return { aborted: true, reason: "lookup-failed" };
  }
  if (!serverId) {
    console.error("[Phase C copy] Guard ব্যর্থ — familyCodes/<code> ডকুমেন্ট পাওয়া যায়নি। কোনো write হয়নি। আগে ensureFamilyCodeMapping() চালান।");
    return { aborted: true, reason: "no-mapping" };
  }
  if (serverId !== localId) {
    console.error(`[Phase C copy] Guard ব্যর্থ — local familyId (${localId}) ও server-verified familyId (${serverId}) ভিন্ন। কোনো write হয়নি — এগোনো নিরাপদ নয়।`);
    return { aborted: true, reason: "mismatch", localId, serverId };
  }
  console.log("[Phase C copy] Guard পাস — server-verified familyId:", serverId);

  // legacyCollectionMap — Rules-level migrationState gating-এর জন্য
  // প্রয়োজনীয় mapping (আগে approved Integration Plan অনুযায়ী)। setOnce:
  // doc আগে থেকেই থাকলে touch করা হয় না, শুধু existing value
  // server-verified familyId-এর সাথে মেলে কিনা guard করা হয় (উপরের
  // familyCodes guard-এর একই disciplined pattern) — না মিললে থামে।
  const mapRef = db.collection("legacyCollectionMap").doc(getCollectionName());
  try {
    const mapSnap = await mapRef.get();
    if (mapSnap.exists) {
      const existingFamilyId = mapSnap.data().familyId;
      if (existingFamilyId !== serverId) {
        console.error(`[Phase C copy] Guard ব্যর্থ — legacyCollectionMap-এ বিদ্যমান familyId (${existingFamilyId}) ও server-verified familyId (${serverId}) ভিন্ন। কোনো data write হয়নি।`);
        return { aborted: true, reason: "map-mismatch", existingFamilyId, serverId };
      }
    } else {
      await mapRef.set({ familyId: serverId, createdAt: Date.now() });
    }
  } catch (err) {
    console.error("[Phase C copy] Guard ব্যর্থ — legacyCollectionMap read/write করতে সমস্যা হয়েছে। কোনো data write হয়নি।", err);
    return { aborted: true, reason: "map-write-failed" };
  }

  const snap = await db.collection(getCollectionName()).get();
  const memberDocs = [];
  const entryDocs = [];
  const weeklyDocs = [];
  const skipped = [];
  snap.docs.forEach(doc => {
    const id = doc.id;
    const data = doc.data();
    if (id.startsWith("member:")) {
      memberDocs.push({ id: id.slice("member:".length), data });
    } else if (id.startsWith("entry:")) {
      const rest = id.slice("entry:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) { skipped.push(id); return; }
      entryDocs.push({ id: `${rest.slice(0, idx)}_${rest.slice(idx + 1)}`, data });
    } else if (id.startsWith("weekly:")) {
      const rest = id.slice("weekly:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) { skipped.push(id); return; }
      weeklyDocs.push({ id: `${rest.slice(0, idx)}_${rest.slice(idx + 1)}`, data });
    }
    // custom_fields, meeting_rows_v2:, legacy bare "members" — এই Copy
    // ধাপে ইচ্ছাকৃতভাবে বাদ (স্কোপ শুধু member/entry/weekly, design doc
    // অনুযায়ী — বাকিগুলো পরবর্তী কোনো ধাপে, আলাদা approval-এ)।
  });

  const familyRoot = db.collection("families").doc(serverId);
  const CHUNK_SIZE = 450;
  async function writeChunked(items, subcollection) {
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const batch = db.batch();
      items.slice(i, i + CHUNK_SIZE).forEach(({ id, data }) => {
        batch.set(familyRoot.collection(subcollection).doc(id), data);
      });
      await batch.commit();
    }
  }
  await writeChunked(memberDocs, "members");
  await writeChunked(entryDocs, "entries");
  await writeChunked(weeklyDocs, "weekly");

  const report = {
    familyId: serverId,
    copiedMembers: memberDocs.length,
    copiedEntries: entryDocs.length,
    copiedWeekly: weeklyDocs.length,
    skipped
  };
  console.log("[Phase C copy] সম্পন্ন — এখানে কোনো Verify/Switch/Cleanup হয়নি, শুধু কপি। data_<familyCode> সম্পূর্ণ অপরিবর্তিত, app এখনও পুরনো path-ই পড়ছে/লিখছে। রিপোর্ট:");
  console.table({
    "verified familyId": report.familyId,
    "কপি হওয়া members": report.copiedMembers,
    "কপি হওয়া entries": report.copiedEntries,
    "কপি হওয়া weekly": report.copiedWeekly
  });
  if (skipped.length) console.warn("[Phase C copy] অপরিচিত ফরম্যাটের কারণে skip:", skipped);
  return report;
}
if (typeof window !== "undefined") {
  window.copyPhaseCData = copyPhaseCData;
}
// =====================================================================
// --- Phase C: Verify ধাপ (READ-ONLY — কোনো write/auto-fix/re-copy নেই) ---
// =====================================================================
// শুধু browser console থেকে ম্যানুয়ালি (`verifyPhaseCData()`)। এই
// ফাংশন কোনো write করে না, কিছু auto-fix/re-copy করে না, এবং কোনো
// পরবর্তী ধাপ (Switch/Cleanup) নিজে থেকে ডাকে না — শুধু source
// (data_<familyCode>) ও target (families/<familyId>/...) পাশাপাশি পড়ে
// একটা তুলনা-রিপোর্ট দেয়, সিদ্ধান্ত সবসময় ম্যানুয়াল থাকে।
async function verifyPhaseCData() {
  console.log("[Phase C verify] শুরু হচ্ছে — সম্পূর্ণ read-only, প্রথমে guard যাচাই...");
  const code = getFamilyCode();
  const localId = getFamilyId();
  let serverId = null;
  try {
    const codeSnap = await db.collection("familyCodes").doc(code).get();
    serverId = codeSnap.exists ? codeSnap.data().familyId : null;
  } catch (err) {
    console.error("[Phase C verify] Guard ব্যর্থ — familyCodes লুকআপ করতে সমস্যা হয়েছে। থামানো হলো।", err);
    return { aborted: true, reason: "lookup-failed" };
  }
  if (!serverId) {
    console.error("[Phase C verify] Guard ব্যর্থ — familyCodes/<code> ডকুমেন্ট পাওয়া যায়নি। থামানো হলো।");
    return { aborted: true, reason: "no-mapping" };
  }
  if (serverId !== localId) {
    console.error(`[Phase C verify] Guard ব্যর্থ — local familyId (${localId}) ও server-verified familyId (${serverId}) ভিন্ন। থামানো হলো।`);
    return { aborted: true, reason: "mismatch", localId, serverId };
  }
  console.log("[Phase C verify] Guard পাস — server-verified familyId:", serverId);

  // --- Source (data_<familyCode>) থেকে expected target-id -> data ম্যাপ তৈরি ---
  const sourceSnap = await db.collection(getCollectionName()).get();
  const expected = { members: {}, entries: {}, weekly: {} };
  sourceSnap.docs.forEach(doc => {
    const id = doc.id;
    const data = doc.data();
    if (id.startsWith("member:")) {
      expected.members[id.slice("member:".length)] = data;
    } else if (id.startsWith("entry:")) {
      const rest = id.slice("entry:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) return;
      expected.entries[`${rest.slice(0, idx)}_${rest.slice(idx + 1)}`] = data;
    } else if (id.startsWith("weekly:")) {
      const rest = id.slice("weekly:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) return;
      expected.weekly[`${rest.slice(0, idx)}_${rest.slice(idx + 1)}`] = data;
    }
  });

  // --- Target (families/<familyId>/...) থেকে actual পড়া ---
  const familyRoot = db.collection("families").doc(serverId);
  const [membersSnap, entriesSnap, weeklySnap] = await Promise.all([
    familyRoot.collection("members").get(),
    familyRoot.collection("entries").get(),
    familyRoot.collection("weekly").get()
  ]);
  const actual = {
    members: Object.fromEntries(membersSnap.docs.map(d => [d.id, d.data()])),
    entries: Object.fromEntries(entriesSnap.docs.map(d => [d.id, d.data()])),
    weekly: Object.fromEntries(weeklySnap.docs.map(d => [d.id, d.data()]))
  };

  // গুরুত্বপূর্ণ ফিল্ড (ownerUid, updatedAt, value/name/gender) key-by-key
  // deep-compare করা হয় — শুধু doc-সংখ্যা মেলা যথেষ্ট নয়।
  function compareDoc(exp, act) {
    if (!exp || !act) return false;
    const keys = new Set([...Object.keys(exp), ...Object.keys(act)]);
    for (const k of keys) {
      if (JSON.stringify(exp[k]) !== JSON.stringify(act[k])) return false;
    }
    return true;
  }

  function diffSection(name, expMap, actMap) {
    const expIds = Object.keys(expMap);
    const actIds = Object.keys(actMap);
    const missingInTarget = expIds.filter(id => !(id in actMap));
    const extraInTarget = actIds.filter(id => !(id in expMap));
    const fieldMismatches = expIds
      .filter(id => id in actMap)
      .filter(id => !compareDoc(expMap[id], actMap[id]));
    return {
      section: name,
      expectedCount: expIds.length,
      actualCount: actIds.length,
      missingInTarget,
      extraInTarget,
      fieldMismatches
    };
  }

  const results = [
    diffSection("members", expected.members, actual.members),
    diffSection("entries", expected.entries, actual.entries),
    diffSection("weekly", expected.weekly, actual.weekly)
  ];

  const allOk = results.every(r =>
    r.expectedCount === r.actualCount &&
    r.missingInTarget.length === 0 &&
    r.extraInTarget.length === 0 &&
    r.fieldMismatches.length === 0
  );

  console.log(`[Phase C verify] সম্পন্ন — ${allOk ? "✅ সব মিলেছে" : "⚠️ অমিল পাওয়া গেছে"}। কোনো write/fix করা হয়নি, শুধু রিপোর্ট।`);
  console.table(results.map(r => ({
    section: r.section,
    expected: r.expectedCount,
    actual: r.actualCount,
    missing: r.missingInTarget.length,
    extra: r.extraInTarget.length,
    fieldMismatch: r.fieldMismatches.length
  })));
  results.forEach(r => {
    if (r.missingInTarget.length) console.warn(`[Phase C verify] ${r.section}: target-এ নেই —`, r.missingInTarget);
    if (r.extraInTarget.length) console.warn(`[Phase C verify] ${r.section}: target-এ অতিরিক্ত (অপ্রত্যাশিত) —`, r.extraInTarget);
    if (r.fieldMismatches.length) console.warn(`[Phase C verify] ${r.section}: field মিলছে না —`, r.fieldMismatches);
  });
  return { familyId: serverId, allOk, results };
}
if (typeof window !== "undefined") {
  window.verifyPhaseCData = verifyPhaseCData;
}
// =====================================================================
// --- Phase C Switch: Reverse-sync ধাপ (v2 → legacy, Flip-পরবর্তী rollback
// prep) — শুধু browser console থেকে ম্যানুয়ালি (`reverseSyncPhaseCData()`)।
// =====================================================================
// উদ্দেশ্য: Switch-এর Flip ধাপের পর যদি rollback প্রয়োজন হয়, তাহলে
// migrationState "legacy"-তে ফিরিয়ে দেওয়ার *আগে* এই ফাংশন v2-তে ঘটে
// যাওয়া সব পরিবর্তন (নতুন/আপডেট হওয়া entries-weekly, নতুন/আপডেট/ডিলিট
// হওয়া members) legacy collection-এ প্রতিফলিত করে — যাতে rollback-এর পর
// app legacy পড়া শুরু করলে কোনো ডাটা "হারিয়ে যাওয়া" মনে না হয়।
//
// এই ফাংশন কখনো v2 ডাটা touch করে না (শুধু read) — শুধু legacy collection-এ
// write করে। data_<familyCode> ছাড়া অন্য কোনো কিছু পরিবর্তিত হয় না।
//
// Flip-timestamp source: families/<familyId>.updatedAt নিজেই ব্যবহার করা
// হচ্ছে — কারণ migrationState পরিবর্তনের rule (firestore.rules-এ) বাধ্য
// করে যে সেই update-এ updatedAt-ও একসাথে সেট হতে হবে (diff().affectedKeys()
// hasOnly(['migrationState','updatedAt']))। তাই families doc-এর updatedAt-ই
// নির্ভরযোগ্য "কবে Flip হয়েছিল" রেফারেন্স — আলাদা কোনো ম্যানুয়াল timestamp
// input লাগে না।
//
// entries/weekly: delete function নেই (শুধু create/update path আছে,
// deleteMemberDoc()-এর মতো কিছু নেই) — তাই এখানে শুধু updatedAt > flip
// timestamp হলে candidate, timestamp-diff-ই যথেষ্ট।
//
// members: deleteMemberDoc() hard-delete করে, কোনো tombstone/updatedAt
// marker রাখে না — তাই শুধু timestamp-diff দিয়ে deletion ধরা সম্ভব না।
// এর বদলে members-এর জন্য সম্পূর্ণ id-set compare করা হয়: v2-তে নেই কিন্তু
// legacy-তে আছে এমন member = Flip-পরবর্তী v2-তে deleted, তাই legacy থেকেও
// delete করা হয়।
//
// Idempotent: বারবার চালানো নিরাপদ — প্রতিটি write conflict-resolution
// করে (existing legacy updatedAt vs incoming v2 updatedAt, নতুনটাই থাকে,
// কখনো পুরনো দিয়ে নতুন ডাটা ওভাররাইট হয় না), এবং delete শুধু তখনই হয়
// যখন v2-তে সেই member সত্যিই অনুপস্থিত (state পুনরায় গণনা হয় প্রতি রান-এ,
// আগের রান-এর ওপর নির্ভর করে না)।
async function reverseSyncPhaseCData() {
  console.log("[Reverse-sync] শুরু হচ্ছে — প্রথমে guard যাচাই (server-verified familyId)...");
  const code = getFamilyCode();
  const localId = getFamilyId();
  let serverId = null;
  try {
    const codeSnap = await db.collection("familyCodes").doc(code).get();
    serverId = codeSnap.exists ? codeSnap.data().familyId : null;
  } catch (err) {
    console.error("[Reverse-sync] Guard ব্যর্থ — familyCodes লুকআপ করতে সমস্যা হয়েছে। কোনো write হয়নি।", err);
    return { aborted: true, reason: "lookup-failed" };
  }
  if (!serverId) {
    console.error("[Reverse-sync] Guard ব্যর্থ — familyCodes/<code> ডকুমেন্ট পাওয়া যায়নি। কোনো write হয়নি।");
    return { aborted: true, reason: "no-mapping" };
  }
  if (serverId !== localId) {
    console.error(`[Reverse-sync] Guard ব্যর্থ — local familyId (${localId}) ও server-verified familyId (${serverId}) ভিন্ন। কোনো write হয়নি।`);
    return { aborted: true, reason: "mismatch", localId, serverId };
  }
  console.log("[Reverse-sync] Guard পাস — server-verified familyId:", serverId);

  const familyRef = db.collection("families").doc(serverId);
  const familySnap = await familyRef.get();
  if (!familySnap.exists) {
    console.error("[Reverse-sync] families ডকুমেন্ট পাওয়া যায়নি। থামানো হলো।");
    return { aborted: true, reason: "no-family-doc" };
  }
  const famData = familySnap.data();
  if (famData.migrationState !== "locked") {
    console.error(`[Reverse-sync] নিরাপত্তা-চেক ব্যর্থ — migrationState বর্তমানে "${famData.migrationState}", কিন্তু reverse-sync শুধুমাত্র "locked" state-এ চালানো নিরাপদ (v2-তে নতুন write বন্ধ থাকা অবস্থায়)। আগে migrationState "locked" করুন, তারপর আবার চেষ্টা করুন।`);
    return { aborted: true, reason: "not-locked", currentState: famData.migrationState };
  }
  const flipTimestamp = famData.updatedAt || 0;
  console.log("[Reverse-sync] flip-timestamp (families.updatedAt):", flipTimestamp, new Date(flipTimestamp).toISOString());

  const familyRoot = db.collection("families").doc(serverId);
  const CHUNK_SIZE = 450;
  async function writeChunked(items) {
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const batch = db.batch();
      items.slice(i, i + CHUNK_SIZE).forEach(({ ref, data, del }) => {
        if (del) batch.delete(ref);
        else batch.set(ref, data, { merge: true });
      });
      await batch.commit();
    }
  }

  const legacyColRef = db.collection(getCollectionName());

  // --- entries/weekly: timestamp-diff (delete function নেই, শুধু candidate নির্বাচন) ---
  async function reverseSyncTimestampScoped(subcollection, legacyPrefix, splitFn) {
    const [v2Snap, legacySnap] = await Promise.all([
      familyRoot.collection(subcollection).get(),
      legacyColRef.where(firebase.firestore.FieldPath.documentId(), ">=", legacyPrefix)
        .where(firebase.firestore.FieldPath.documentId(), "<", legacyPrefix + "\uf8ff").get()
    ]);
    const existingLegacy = {};
    legacySnap.docs.forEach(d => { existingLegacy[d.id] = d.data(); });

    const writes = [];
    let candidates = 0, written = 0, skippedOlder = 0;
    v2Snap.docs.forEach(doc => {
      const data = doc.data();
      const updatedAt = data.updatedAt || 0;
      if (updatedAt <= flipTimestamp) return; // Flip-এর আগেই কপি হয়ে গেছে, touch করার দরকার নেই
      candidates += 1;
      const legacyId = splitFn(doc.id);
      const existing = existingLegacy[legacyId];
      const existingUpdatedAt = existing ? (existing.updatedAt || 0) : 0;
      if (existing && existingUpdatedAt >= updatedAt) { skippedOlder += 1; return; }
      writes.push({ ref: legacyColRef.doc(legacyId), data });
      written += 1;
    });
    await writeChunked(writes);
    return { candidates, written, skippedOlder };
  }

  const entryResult = await reverseSyncTimestampScoped("entries", `entry:`, id => {
    // v2 id: "<memberId>_<date>" → legacy id: "entry:<memberId>:<date>"
    const idx = id.indexOf("_");
    return `entry:${id.slice(0, idx)}:${id.slice(idx + 1)}`;
  });
  const weeklyResult = await reverseSyncTimestampScoped("weekly", `weekly:`, id => {
    const idx = id.indexOf("_");
    return `weekly:${id.slice(0, idx)}:${id.slice(idx + 1)}`;
  });

  // --- members: সম্পূর্ণ id-set compare (delete detection-এর জন্য আবশ্যক) ---
  const [v2MembersSnap, legacyMembersSnap] = await Promise.all([
    familyRoot.collection("members").get(),
    legacyColRef.where(firebase.firestore.FieldPath.documentId(), ">=", "member:")
      .where(firebase.firestore.FieldPath.documentId(), "<", "member:\uf8ff").get()
  ]);
  const v2Members = {};
  v2MembersSnap.docs.forEach(d => { v2Members[d.id] = d.data(); });
  const legacyMembers = {};
  legacyMembersSnap.docs.forEach(d => { legacyMembers[d.id.slice("member:".length)] = d.data(); });

  const memberWrites = [];
  let memberUpdated = 0, memberSkippedOlder = 0, memberDeleted = 0;
  Object.keys(v2Members).forEach(id => {
    const data = v2Members[id];
    const updatedAt = data.updatedAt || 0;
    if (updatedAt <= flipTimestamp) return;
    const legacyId = `member:${id}`;
    const existing = legacyMembers[id];
    const existingUpdatedAt = existing ? (existing.updatedAt || 0) : 0;
    if (existing && existingUpdatedAt >= updatedAt) { memberSkippedOlder += 1; return; }
    memberWrites.push({ ref: legacyColRef.doc(legacyId), data });
    memberUpdated += 1;
  });
  Object.keys(legacyMembers).forEach(id => {
    if (!(id in v2Members)) {
      // v2-তে নেই কিন্তু legacy-তে আছে — Flip-পরবর্তী v2-deletion, legacy থেকেও সরাতে হবে
      memberWrites.push({ ref: legacyColRef.doc(`member:${id}`), del: true });
      memberDeleted += 1;
    }
  });
  await writeChunked(memberWrites);

  const report = {
    familyId: serverId,
    flipTimestamp,
    entries: entryResult,
    weekly: weeklyResult,
    members: { updated: memberUpdated, deleted: memberDeleted, skippedOlder: memberSkippedOlder }
  };
  console.log("[Reverse-sync] সম্পন্ন — v2 ডাটা অস্পৃশ্য, শুধু legacy collection-এ প্রয়োজনীয় write/delete হয়েছে। রিপোর্ট:");
  console.table({
    "entries — candidate (post-flip)": report.entries.candidates,
    "entries — লেখা হয়েছে": report.entries.written,
    "weekly — candidate (post-flip)": report.weekly.candidates,
    "weekly — লেখা হয়েছে": report.weekly.written,
    "members — আপডেট/নতুন": report.members.updated,
    "members — ডিলিট (v2-তে অনুপস্থিত)": report.members.deleted
  });
  return report;
}
if (typeof window !== "undefined") {
  window.reverseSyncPhaseCData = reverseSyncPhaseCData;
}
// =====================================================================
// --- Health-check: একটি family-এর migration-related consistency যাচাই
// (সম্পূর্ণ READ-ONLY — কোনো write/fix করে না) — শুধু browser console
// থেকে ম্যানুয়ালি (`healthCheckFamily()` — বর্তমান device-এর family,
// অথবা `healthCheckFamily("<অন্য familyId>")` — নির্দিষ্ট কোনো family)।
// =====================================================================
// উদ্দেশ্য: প্রতিবার আলাদা আলাদা console command চালিয়ে familyCode/
// adminUids/legacyCollectionMap/migrationState নিজে নিজে মিলিয়ে দেখার
// বদলে — একটি কল-এ সবকিছু একসাথে পরীক্ষা করে একটা সংক্ষিপ্ত রিপোর্ট দেয়,
// যাতে owner-কে বারবার ম্যানুয়াল ধাপে ধাপে ডায়াগনস্টিক চালাতে না হয়।
// এই ফাংশন কোনো guard-abort করে না (verify-only ফাংশনের মতোই) — বরং
// প্রতিটা সমস্যা একটা "issues" তালিকায় জমা করে শেষে একসাথে দেখায়, যাতে
// একটামাত্র সমস্যার কারণে বাকি checks স্কিপ না হয়।
async function healthCheckFamily(familyIdOverride) {
  const familyId = familyIdOverride || getFamilyId();
  console.log("[Health-check] শুরু হচ্ছে (read-only) — familyId:", familyId);
  const issues = [];
  const info = {};

  const familySnap = await db.collection("families").doc(familyId).get();
  if (!familySnap.exists) {
    console.error("[Health-check] families/" + familyId + " ডকুমেন্ট পাওয়া যায়নি — থামানো হলো।");
    return { familyId, issues: ["families doc missing"], info };
  }
  const fam = familySnap.data();
  info.familyCode = fam.familyCode;
  info.migrationState = fam.migrationState || "(unset — legacy হিসেবে গণ্য হয়)";
  info.adminUids = fam.adminUids;

  // --- familyCode field validity ---
  if (typeof fam.familyCode !== "string" || !fam.familyCode) {
    issues.push("families.familyCode অনুপস্থিত বা স্ট্রিং নয়।");
  }

  // --- adminUids format validity (bracket-wrapped string bug pattern ধরার জন্য) ---
  if (!Array.isArray(fam.adminUids)) {
    issues.push("families.adminUids array না — টাইপ ভুল।");
  } else {
    fam.adminUids.forEach((uid, i) => {
      if (typeof uid !== "string") {
        issues.push(`adminUids[${i}] স্ট্রিং না।`);
      } else if (uid.trim().startsWith("[") || uid.includes(",\"") || uid.includes("\",")) {
        issues.push(`adminUids[${i}] সন্দেহজনক — একটার ভেতরে একাধিক uid bracket-wrapped থাকতে পারে: ${uid}`);
      }
    });
  }

  // --- familyCodes bidirectional consistency (familyCode -> familyId -> ফিরে একই familyCode) ---
  if (typeof fam.familyCode === "string" && fam.familyCode) {
    const codeSnap = await db.collection("familyCodes").doc(fam.familyCode).get();
    if (!codeSnap.exists) {
      issues.push(`familyCodes/${fam.familyCode} ডকুমেন্ট নেই — এই family-এর code দিয়ে familyId খুঁজে পাওয়া যাবে না।`);
    } else if (codeSnap.data().familyId !== familyId) {
      issues.push(`familyCodes/${fam.familyCode}.familyId (${codeSnap.data().familyId}) এই family-এর নিজের ID-এর সাথে মেলে না।`);
    }

    // --- legacyCollectionMap equation consistency ---
    const expectedCollectionName = "data_" + fam.familyCode;
    const mapSnap = await db.collection("legacyCollectionMap").doc(expectedCollectionName).get();
    info.legacyCollectionMapExists = mapSnap.exists;
    if (mapSnap.exists && mapSnap.data().familyId !== familyId) {
      issues.push(`legacyCollectionMap/${expectedCollectionName}.familyId (${mapSnap.data().familyId}) এই family-এর নিজের ID-এর সাথে মেলে না।`);
    }
  }

  // --- migrationState sanity ---
  if (fam.migrationState !== undefined && !["legacy", "locked", "v2"].includes(fam.migrationState)) {
    issues.push(`migrationState অপ্রত্যাশিত মান: "${fam.migrationState}" (শুধু legacy/locked/v2 বৈধ)।`);
  }

  console.log(issues.length === 0
    ? "[Health-check] ✅ কোনো সমস্যা পাওয়া যায়নি।"
    : `[Health-check] ⚠️ ${issues.length}টি সমস্যা পাওয়া গেছে —`);
  console.table({
    familyId,
    familyCode: info.familyCode,
    migrationState: info.migrationState,
    "legacyCollectionMap আছে": info.legacyCollectionMapExists,
    "adminUids সংখ্যা": Array.isArray(fam.adminUids) ? fam.adminUids.length : "N/A"
  });
  if (issues.length) issues.forEach(msg => console.warn("[Health-check]", msg));
  return { familyId, issues, info };
}
if (typeof window !== "undefined") {
  window.healthCheckFamily = healthCheckFamily;
}
// =====================================================================
// --- Multi-family Audit (সম্পূর্ণ READ-ONLY — কোনো write/fix/migration
// করে না) — শুধু browser console থেকে ম্যানুয়ালি (`auditAllFamiliesHealthCheck()`)।
// =====================================================================
// উদ্দেশ্য: §৩-এ পাওয়া bug pattern (familyCode stale / adminUids
// bracket-wrapped bug) অন্য যেকোনো family-তেও আছে কিনা — healthCheckFamily()-এর
// একই checks প্রতিটি families/<id> ডকুমেন্টের ওপর প্রয়োগ করে একটা সংক্ষিপ্ত
// summary টেবিল দেয়। প্রাইভেসি: কোনো পরিবারের raw familyCode বা adminUids
// মান কখনো log করা হয় না — শুধু status/ফলাফল (OK/সমস্যা আছে) ও issue-সংখ্যা।
async function auditAllFamiliesHealthCheck() {
  console.log("[Multi-family audit] শুরু হচ্ছে (সম্পূর্ণ read-only, কোনো write/fix হবে না)...");
  const familiesSnap = await db.collection("families").get();
  const rows = [];
  for (const doc of familiesSnap.docs) {
    const familyId = doc.id;
    const fam = doc.data();
    const issues = [];

    // --- familyCode presence/type (মান নয়, শুধু আছে/সঠিক টাইপ কিনা) ---
    let familyCodeStatus = "OK";
    if (typeof fam.familyCode !== "string" || !fam.familyCode) {
      familyCodeStatus = "অনুপস্থিত/ভুল টাইপ";
      issues.push("familyCode অনুপস্থিত/ভুল টাইপ");
    } else {
      // familyCodes/<code> <-> families/<id> bidirectional consistency —
      // শুধু match/mismatch বলা হয়, code-এর মান কখনো log হয় না।
      try {
        const codeSnap = await db.collection("familyCodes").doc(fam.familyCode).get();
        if (!codeSnap.exists) {
          familyCodeStatus = "mapping অনুপস্থিত";
          issues.push("familyCodes mapping অনুপস্থিত");
        } else if (codeSnap.data().familyId !== familyId) {
          familyCodeStatus = "mismatch";
          issues.push("familyCodes.familyId এই family-এর সাথে মেলে না");
        }
      } catch {
        familyCodeStatus = "যাচাই ব্যর্থ";
        issues.push("familyCodes লুকআপ ব্যর্থ (নেটওয়ার্ক/পারমিশন)");
      }
      // legacyCollectionMap equation consistency (এখানেও শুধু exists/match বলা হয়)
      try {
        const mapSnap = await db.collection("legacyCollectionMap").doc("data_" + fam.familyCode).get();
        if (mapSnap.exists && mapSnap.data().familyId !== familyId) {
          issues.push("legacyCollectionMap.familyId এই family-এর সাথে মেলে না");
        }
      } catch {
        issues.push("legacyCollectionMap লুকআপ ব্যর্থ");
      }
    }

    // --- adminUids format (মান নয়, শুধু টাইপ/প্যাটার্ন সমস্যা আছে কিনা) ---
    let adminUidsStatus = "OK";
    if (!Array.isArray(fam.adminUids)) {
      adminUidsStatus = "টাইপ ভুল";
      issues.push("adminUids array না");
    } else {
      const hasSuspicious = fam.adminUids.some(uid =>
        typeof uid !== "string" ||
        uid.trim().startsWith("[") ||
        uid.includes(",\"") ||
        uid.includes("\",")
      );
      if (hasSuspicious) {
        adminUidsStatus = "সন্দেহজনক প্যাটার্ন";
        issues.push("adminUids-এ bracket-wrapped/multi-uid সন্দেহজনক প্যাটার্ন");
      } else if (fam.adminUids.length === 0) {
        adminUidsStatus = "খালি";
      }
    }

    // --- migrationState sanity (শুধু valid/invalid) ---
    if (fam.migrationState !== undefined && !["legacy", "locked", "v2"].includes(fam.migrationState)) {
      issues.push("migrationState অপ্রত্যাশিত মান");
    }

    rows.push({
      familyId,
      "familyCode status": familyCodeStatus,
      "adminUids status": adminUidsStatus,
      "issues": issues.length
    });
  }

  const totalIssues = rows.reduce((sum, r) => sum + r.issues, 0);
  console.log(totalIssues === 0
    ? `[Multi-family audit] ✅ মোট ${rows.length}টি family স্ক্যান হয়েছে — কোনো সমস্যা পাওয়া যায়নি।`
    : `[Multi-family audit] ⚠️ মোট ${rows.length}টি family স্ক্যান হয়েছে — ${totalIssues}টি সমস্যা পাওয়া গেছে (নিচের টেবিলে দেখুন, শুধু status/সংখ্যা — কোনো raw code/uid নেই)।`);
  console.table(rows);
  return { totalFamilies: rows.length, totalIssues, rows };
}
if (typeof window !== "undefined") {
  window.auditAllFamiliesHealthCheck = auditAllFamiliesHealthCheck;
}
// =====================================================================
// --- Access Approval Gate — Step 1: Grandfather Candidate Audit
// (সম্পূর্ণ READ-ONLY — কোনো write/fix/migration করে না) — শুধু browser
// console থেকে ম্যানুয়ালি (`auditGrandfatherCandidates()`, বা নির্দিষ্ট
// familyId-গুলো নিশ্চিত করতে `auditGrandfatherCandidates(["<familyId1>", ...])`)।
// =====================================================================
// উদ্দেশ্য: Access Approval Gate চালু করার আগে, প্রতিটি family-এর যেসব
// uid ইতিমধ্যে বৈধভাবে সক্রিয় (কোনো member-এর ownerUid অথবা family-এর
// adminUids-এ আছে) — তাদের একটি তালিকা তৈরি করা, যাতে পরের ধাপে
// (grandfather migration — এখনো implement করা হয়নি, শুধু audit) এই
// uid-গুলোকে auto-approved হিসেবে accessRequests-এ বসানো যায়। এই ফাংশন
// নিজে কোনো write করে না — শুধু রিপোর্ট দেয়, চূড়ান্ত সিদ্ধান্ত owner-এর।
//
// সীমাবদ্ধতা (§৩-এ আগে চিহ্নিত): `families` collection-এর ওপর নির্ভর করে
// সব family খুঁজে বের করা অনির্ভরযোগ্য, কারণ families/{id} doc lazily
// তৈরি হয় (ensureFamilyMeta())। তাই এই ফাংশন `families` collection স্ক্যান
// করার পাশাপাশি ঐচ্ছিক `extraFamilyIds` প্যারামিটার নেয় — Firebase Console-
// এর root-level collection browser দিয়ে ম্যানুয়ালি শনাক্ত করা familyId
// (owner ইতিমধ্যে জানেন: real family + বোনের family) এখানে পাস করলে সেগুলোও
// নিশ্চিতভাবে audit-এ অন্তর্ভুক্ত হবে, `families` collection-এ miss হলেও।
//
// প্রতিটি family-এর জন্য migrationState অনুযায়ী সঠিক জায়গা থেকে সদস্যদের
// ownerUid পড়া হয় (legacy: data_<collection>-এ "member:" prefix; v2:
// families/{id}/members subcollection) — resolvePathContext()-এর একই
// migrationState-branching নীতি অনুসরণ করা হয়েছে, তবে এই ফাংশন কোনো লেখা
// করে না বলে resolvePathContext() নিজে ব্যবহার না করে সরাসরি read করা
// হয়েছে (সরলতার জন্য, আচরণ একই)।
async function auditGrandfatherCandidates(extraFamilyIds) {
  console.log("[Grandfather audit] শুরু হচ্ছে (সম্পূর্ণ read-only, কোনো write/fix/migration হবে না)...");
  const extra = Array.isArray(extraFamilyIds) ? extraFamilyIds.filter(Boolean) : [];
  const familyIdSet = new Set(extra);
  try {
    const familiesSnap = await db.collection("families").get();
    familiesSnap.docs.forEach(doc => familyIdSet.add(doc.id));
  } catch (err) {
    console.warn("[Grandfather audit] families collection স্ক্যান ব্যর্থ (শুধু extraFamilyIds দিয়ে এগোনো হচ্ছে):", err);
  }
  if (familyIdSet.size === 0) {
    console.warn("[Grandfather audit] কোনো familyId পাওয়া যায়নি (families collection খালি/অনুপস্থিত এবং extraFamilyIds দেওয়া হয়নি)। থামানো হলো।");
    return { totalFamilies: 0, rows: [], details: {} };
  }
  console.log(`[Grandfather audit] মোট ${familyIdSet.size}টি familyId নিয়ে audit চলছে (families collection scan + extraFamilyIds মিলিয়ে)। মনে রাখবেন: families collection lazily তৈরি হয় বলে এটি সব real family নাও ধরতে পারে — Console root-browse দিয়ে চেনা familyId extraFamilyIds-এ পাস করা নিরাপদ (§৩)।`);

  const rows = [];
  const details = {};
  for (const familyId of familyIdSet) {
    try {
      const famSnap = await db.collection("families").doc(familyId).get();
      if (!famSnap.exists) {
        console.warn(`[Grandfather audit] families/${familyId} ডকুমেন্ট পাওয়া যায়নি — স্কিপ করা হলো।`);
        continue;
      }
      const fam = famSnap.data();
      const familyCode = typeof fam.familyCode === "string" ? fam.familyCode : null;
      const migrationState = fam.migrationState || "legacy";
      const adminUids = Array.isArray(fam.adminUids) ? fam.adminUids.filter(u => typeof u === "string" && u) : [];

      let ownerUids = [];
      let memberCount = 0;
      if (migrationState === "v2") {
        const membersSnap = await db.collection("families").doc(familyId).collection("members").get();
        memberCount = membersSnap.size;
        ownerUids = membersSnap.docs.map(d => d.data().ownerUid).filter(u => typeof u === "string" && u);
      } else {
        // legacy/locked/undefined — dataCollectionName থাকলে সেটাই source of
        // truth (§৫ fix), না থাকলে familyCode থেকে derive (আগের আচরণের সাথে
        // সামঞ্জস্যপূর্ণ fallback)।
        const collectionName = fam.dataCollectionName || (familyCode ? `data_${familyCode}` : null);
        if (collectionName) {
          const memberSnap = await db.collection(collectionName)
            .where(firebase.firestore.FieldPath.documentId(), ">=", "member:")
            .where(firebase.firestore.FieldPath.documentId(), "<", "member:\uf8ff")
            .get();
          memberCount = memberSnap.size;
          ownerUids = memberSnap.docs.map(d => d.data().ownerUid).filter(u => typeof u === "string" && u);
        } else {
          console.warn(`[Grandfather audit] families/${familyId}-এ familyCode/dataCollectionName কিছুই নেই — সদস্য-owner পড়া সম্ভব হয়নি।`);
        }
      }

      const candidateSet = new Set([...adminUids, ...ownerUids]);
      const candidateUids = Array.from(candidateSet);

      rows.push({
        familyId,
        familyCode: familyCode || "(নেই)",
        migrationState,
        মোটSদস্য: memberCount,
        adminসংখ্যা: adminUids.length,
        গ্র্যান্ডফাদারCandidateসংখ্যা: candidateUids.length
      });
      details[familyId] = { familyCode, migrationState, adminUids, ownerUids, candidateUids };
    } catch (err) {
      console.error(`[Grandfather audit] familyId ${familyId} প্রসেস করতে সমস্যা হয়েছে (read ব্যর্থ, কোনো write হয়নি):`, err);
    }
  }

  console.log(`[Grandfather audit] সম্পন্ন — ${rows.length}টি family প্রসেস হয়েছে। সারসংক্ষেপ (নিচে) ও প্রতিটি family-এর candidate uid তালিকা (console-এ 'details' অবজেক্টে, বা এই ফাংশনের রিটার্ন ভ্যালুতে) দেখুন। কোনো write/approve এখনো হয়নি — এটি শুধু পরবর্তী owner-approved migration ধাপের জন্য প্রস্তুতিমূলক রিপোর্ট।`);
  console.table(rows);
  Object.entries(details).forEach(([familyId, d]) => {
    console.log(`[Grandfather audit] familyId=${familyId} (${d.familyCode || "কোড নেই"}, ${d.migrationState}) — candidate uids:`, d.candidateUids);
  });
  return { totalFamilies: rows.length, rows, details };
}
if (typeof window !== "undefined") {
  window.auditGrandfatherCandidates = auditGrandfatherCandidates;
}
// =====================================================================
// --- Access Approval Gate — Step 2: Grandfather Migration Write ---
// (শুধু ম্যানুয়ালি browser console থেকে — `migrateApprovedGrandfatherAccess()`)
// =====================================================================
// এই ফাংশন শুধু owner-approved একটি নির্দিষ্ট (familyId, uid) তালিকার জন্য
// families/{familyId}/accessRequests/{uid} = {status:"approved", ...} write
// করে। কোনো Rules বদলায় না, কোনো existing data touch করে না। প্রতিটি
// write-এর আগে uid বর্তমান adminUids/ownerUid তালিকায় আছে কিনা re-check
// করা হয় (auditGrandfatherCandidates()-এর মতোই logic) — না থাকলে সেই
// entry SKIP হয়, write হয় না। Write-এর পর read-back করে status যাচাই
// করা হয়। তালিকা owner-approved ও hardcoded — কোনো dynamic input নেয় না।
async function migrateApprovedGrandfatherAccess() {
  const approvedList = [
    { familyId: "R8K8B3KA33B4BMELD3C3", uid: "yiirNJKJHlM27guiiS10zsp2FYT2", label: "TU_HI_RA@2022" },
    { familyId: "R8K8B3KA33B4BMELD3C3", uid: "Wz6iZPY56zP14r7CUO9g2YvJNq32", label: "TU_HI_RA@2022" },
    { familyId: "M83JR2MA7A69UJ8MQEK3", uid: "0w24Er3vL9QXaElgpT0jGlRSP4E2", label: "FAM-LN3B10" }
  ];
  console.log("[Grandfather migration] শুরু হচ্ছে — শুধু owner-approved তালিকার জন্য write+verify হবে। কোনো Rules/other data বদলাবে না।");
  const results = [];
  for (const { familyId, uid, label } of approvedList) {
    try {
      const famSnap = await db.collection("families").doc(familyId).get();
      if (!famSnap.exists) {
        results.push({ familyCode: label, familyId, uid, status: "SKIPPED", কারণ: "families doc পাওয়া যায়নি" });
        continue;
      }
      const fam = famSnap.data();
      const migrationState = fam.migrationState || "legacy";
      const adminUids = Array.isArray(fam.adminUids) ? fam.adminUids.filter(u => typeof u === "string" && u) : [];

      let ownerUids = [];
      if (migrationState === "v2") {
        const membersSnap = await db.collection("families").doc(familyId).collection("members").get();
        ownerUids = membersSnap.docs.map(d => d.data().ownerUid).filter(u => typeof u === "string" && u);
      } else {
        const collectionName = fam.dataCollectionName || (fam.familyCode ? `data_${fam.familyCode}` : null);
        if (collectionName) {
          const memberSnap = await db.collection(collectionName)
            .where(firebase.firestore.FieldPath.documentId(), ">=", "member:")
            .where(firebase.firestore.FieldPath.documentId(), "<", "member:\uf8ff")
            .get();
          ownerUids = memberSnap.docs.map(d => d.data().ownerUid).filter(u => typeof u === "string" && u);
        }
      }

      const isValid = adminUids.includes(uid) || ownerUids.includes(uid);
      if (!isValid) {
        results.push({ familyCode: label, familyId, uid, status: "SKIPPED", কারণ: "re-check ব্যর্থ — uid এখন admin/owner তালিকায় নেই" });
        continue;
      }

      const reqRef = db.collection("families").doc(familyId).collection("accessRequests").doc(uid);
      await reqRef.set({
        status: "approved",
        source: "grandfather-migration",
        approvedAt: Date.now()
      }, { merge: true });

      const verifySnap = await reqRef.get();
      const verifiedOk = verifySnap.exists && verifySnap.data().status === "approved";
      results.push({ familyCode: label, familyId, uid, status: verifiedOk ? "OK" : "VERIFY_FAILED" });
    } catch (err) {
      results.push({ familyCode: label, familyId, uid, status: "ERROR", কারণ: String(err && err.message || err) });
    }
  }
  console.log("[Grandfather migration] সম্পন্ন — ফলাফল:");
  console.table(results);
  return results;
}
if (typeof window !== "undefined") {
  window.migrateApprovedGrandfatherAccess = migrateApprovedGrandfatherAccess;
}
// =====================================================================
// --- Access Approval Gate — Step 1b: Orphan Families Audit
// (সম্পূর্ণ READ-ONLY — কোনো write/fix/delete করে না) — শুধু browser
// console থেকে ম্যানুয়ালি (`auditOrphanFamilies()`, বা
// `auditOrphanFamilies(["<familyId1>", ...])`)।
// =====================================================================
// প্রেক্ষাপট: আগের stray/test collection cleanup (§৩) শুধু top-level
// data_<code> কালেকশন ডিলিট করেছিল — কিন্তু সংশ্লিষ্ট families/{id} root
// doc, familyCodes/{code} mapping, ও legacyCollectionMap entry কখনো
// ডিলিট হয়নি (এগুলো ensureFamilyMeta() দিয়ে lazily তৈরি হয়, bounce
// visitor app খুললেই)। ফলে auditGrandfatherCandidates()-এর মতো যেকোনো
// families collection-নির্ভর audit-এ এই "orphan" (মেটাডাটা আছে, আসল ডাটা
// নেই) family-গুলোও ধরা পড়ে — কখনো কখনো তাদের adminUids-এ একটি stale uid
// থাকতে পারে (bounce visitor custom code set/Google sign-in চেষ্টা করলে)।
//
// উদ্দেশ্য: প্রতিটি families/{id}-এর জন্য migrationState অনুযায়ী সঠিক
// জায়গায় (legacy: data_<code> কালেকশনে যেকোনো ডকুমেন্ট; v2: members
// subcollection-এ যেকোনো ডকুমেন্ট) সত্যিই কোনো ডাটা আছে কিনা .limit(1)
// দিয়ে (read-quota সাশ্রয়ী) চেক করা — না থাকলে সেটিকে "orphan candidate"
// হিসেবে চিহ্নিত করা। এই ফাংশন নিজে কিছুই ডিলিট করে না — শুধু owner
// manual review-এর জন্য একটি তালিকা দেয়; পরবর্তী (এখনো implement করা
// হয়নি) owner-approved ধাপে এই তালিকা থেকে families/familyCodes/
// legacyCollectionMap — এই তিনটে doc একসাথে cleanup করা হবে।
async function auditOrphanFamilies(extraFamilyIds) {
  console.log("[Orphan audit] শুরু হচ্ছে (সম্পূর্ণ read-only, কোনো write/delete হবে না)...");
  const extra = Array.isArray(extraFamilyIds) ? extraFamilyIds.filter(Boolean) : [];
  const familyIdSet = new Set(extra);
  try {
    const familiesSnap = await db.collection("families").get();
    familiesSnap.docs.forEach(doc => familyIdSet.add(doc.id));
  } catch (err) {
    console.warn("[Orphan audit] families collection স্ক্যান ব্যর্থ (শুধু extraFamilyIds দিয়ে এগোনো হচ্ছে):", err);
  }
  if (familyIdSet.size === 0) {
    console.warn("[Orphan audit] কোনো familyId পাওয়া যায়নি। থামানো হলো।");
    return { totalFamilies: 0, orphanCount: 0, rows: [], details: {} };
  }
  console.log(`[Orphan audit] মোট ${familyIdSet.size}টি familyId নিয়ে audit চলছে।`);

  const rows = [];
  const details = {};
  for (const familyId of familyIdSet) {
    try {
      const famSnap = await db.collection("families").doc(familyId).get();
      if (!famSnap.exists) {
        console.warn(`[Orphan audit] families/${familyId} ডকুমেন্ট পাওয়া যায়নি — স্কিপ করা হলো।`);
        continue;
      }
      const fam = famSnap.data();
      const familyCode = typeof fam.familyCode === "string" ? fam.familyCode : null;
      const migrationState = fam.migrationState || "legacy";
      const adminUids = Array.isArray(fam.adminUids) ? fam.adminUids.filter(u => typeof u === "string" && u) : [];
      const collectionName = fam.dataCollectionName || (familyCode ? `data_${familyCode}` : null);

      let hasV2Data = false;
      let hasLegacyData = false;
      if (migrationState === "v2") {
        const membersSnap = await db.collection("families").doc(familyId).collection("members").limit(1).get();
        hasV2Data = !membersSnap.empty;
      }
      if (collectionName) {
        const legacySnap = await db.collection(collectionName).limit(1).get();
        hasLegacyData = !legacySnap.empty;
      }
      const dataExists = hasV2Data || hasLegacyData;
      const isOrphan = !dataExists;

      // অতিরিক্ত consistency তথ্য (শুধু informational, orphan-নির্ধারণে ব্যবহৃত হয় না)
      let familyCodesMappingExists = null;
      if (familyCode) {
        try {
          const codeSnap = await db.collection("familyCodes").doc(familyCode).get();
          familyCodesMappingExists = codeSnap.exists;
        } catch {
          familyCodesMappingExists = "যাচাই ব্যর্থ";
        }
      }

      rows.push({
        familyId,
        familyCode: familyCode || "(নেই)",
        migrationState,
        collectionName: collectionName || "(নেই)",
        ডাটাআছে: dataExists ? "হ্যাঁ" : "না",
        orphanCandidate: isOrphan ? "⚠️ হ্যাঁ" : "না",
        adminসংখ্যা: adminUids.length
      });
      details[familyId] = { familyCode, migrationState, collectionName, dataExists, isOrphan, adminUids, familyCodesMappingExists };
    } catch (err) {
      console.error(`[Orphan audit] familyId ${familyId} প্রসেস করতে সমস্যা হয়েছে (read ব্যর্থ, কোনো write হয়নি):`, err);
    }
  }

  const orphanRows = rows.filter(r => r.orphanCandidate.includes("হ্যাঁ"));
  console.log(`[Orphan audit] সম্পন্ন — ${rows.length}টি family প্রসেস হয়েছে, এর মধ্যে ${orphanRows.length}টি orphan candidate (কোনো real ডাটা নেই)। কোনো delete এখনো হয়নি — এটি শুধু owner review-এর জন্য প্রস্তুতিমূলক রিপোর্ট।`);
  console.table(rows);
  if (orphanRows.length) {
    console.log("[Orphan audit] Orphan candidate familyId তালিকা (cleanup-এর জন্য পরবর্তী ধাপে ব্যবহার হবে, owner review-এর পর):", orphanRows.map(r => r.familyId));
  }
  return { totalFamilies: rows.length, orphanCount: orphanRows.length, rows, details };
}
if (typeof window !== "undefined") {
  window.auditOrphanFamilies = auditOrphanFamilies;
}
// =====================================================================
// --- Access Approval Gate — Step 1c: Orphan Families Cleanup (owner-
// approved WRITE — শুধু browser console থেকে ম্যানুয়ালি, explicit তালিকা
// দিয়ে: `cleanupOrphanFamilies([...auditOrphanFamilies()-এর orphan
// familyId তালিকা...])`)।
// =====================================================================
// এই ফাংশন ইচ্ছাকৃতভাবে familyId-এর তালিকা নিজে থেকে (families collection
// পুনরায় স্ক্যান করে) বের করে না — শুধুমাত্র caller-এর দেওয়া explicit
// অ্যারে গ্রহণ করে (auditOrphanFamilies()-এর owner-verified আউটপুট থেকে
// কপি-পেস্ট করে দিতে হবে)। এটি ইচ্ছাকৃত নিরাপত্তা সিদ্ধান্ত: delete-এর
// সময় নতুন করে auto-discovery চালালে ঠিক ঐ মুহূর্তে তৈরি হওয়া কোনো নতুন
// (বৈধ) family ভুলবশত স্ক্যান-এ ঢুকে যাওয়ার তাত্ত্বিক ঝুঁকি (যদিও familyId
// 20-char random বলে বাস্তবে অসম্ভবের কাছাকাছি) সম্পূর্ণ বাদ দেয় — শুধু
// owner যা explicitly review করে দিয়েছেন, ঠিক তার ওপরেই কাজ হবে।
//
// প্রতিটি familyId-এর জন্য ডিলিট করার *ঠিক আগে* fresh read দিয়ে আবার
// নিশ্চিত করা হয় যে family এখনো সত্যিই orphan (কোনো real data নেই) —
// audit ও cleanup-এর মাঝের সময়ে কেউ যদি সেই familyCode দিয়ে নতুন কিছু
// শুরু করে থাকেন (যতই অসম্ভাব্য হোক), সেই family স্বয়ংক্রিয়ভাবে skip
// হয়ে যাবে, force-delete হবে না — কোনো data-loss ঝুঁকি নেই।
//
// শুধুমাত্র তিনটি "খালি মেটাডাটা" doc ডিলিট হয় — কোনো data_<code>
// কালেকশন বা members/entries/weekly subcollection কখনো এই ফাংশন touch
// করে না (সেগুলো আগে থেকেই orphan family-তে খালি/অনুপস্থিত থাকার কথা,
// তবু সুরক্ষার জন্য এই ফাংশন সেসব delete করার চেষ্টাও করে না):
//   ১. families/{familyId}
//   ২. familyCodes/{familyCode}  — শুধু তখনই, যদি সেই mapping doc-এর
//      familyId ঠিক এই familyId-এর সাথে মেলে (অন্য কোনো family যদি
//      ইতিমধ্যে এই code পুনর্ব্যবহার করে থাকে, ভুলবশত সেটা মুছে না যায়)
//   ৩. legacyCollectionMap/{collectionName} — একই matching-guard সহ
//
// --- স্থায়ী নিরাপত্তা মডেল (allowlist নয়) ---
// এই ফাংশন কোনো নির্দিষ্ট familyId তালিকায় hardcoded/সীমাবদ্ধ না — এটি
// ভবিষ্যতে যেকোনো নতুন orphan family-র জন্যও কাজ করবে। নিরাপত্তা তিনটি
// স্তরে নিশ্চিত করা হয়েছে:
//   ১. Rules-level: শুধুমাত্র app creator uid (firestore.rules-এর
//      isAppCreator()) families/familyCodes/legacyCollectionMap-এ delete
//      করতে পারে — কোনো family admin, এমনকি এই ফাংশন চালালেও, পারবে না।
//   ২. Explicit-list-only: caller-কে অবশ্যই auditOrphanFamilies()-এর
//      সাম্প্রতিক (fresh) আউটপুট থেকে familyId তালিকা explicitly পাস
//      করতে হবে — এই ফাংশন কখনো নিজে families collection স্ক্যান করে
//      "সব orphan" আপনা-আপনি বের করে delete করে না।
//   ৩. Delete-এর ঠিক আগে fresh re-verify (নিচে) — প্রতিটি familyId আবার
//      পড়ে সত্যিই এখনো orphan (কোনো real data নেই) কিনা নিশ্চিত করা হয়;
//      audit ও cleanup-এর মাঝে কেউ সেই family code দিয়ে নতুন কিছু শুরু
//      করলে সেই family স্বয়ংক্রিয়ভাবে skip হবে, force-delete হবে না।
async function cleanupOrphanFamilies(orphanFamilyIds) {
  if (!Array.isArray(orphanFamilyIds) || orphanFamilyIds.length === 0) {
    console.error("[Orphan cleanup] orphanFamilyIds একটি non-empty অ্যারে হতে হবে — auditOrphanFamilies()-এর সাম্প্রতিক (fresh) আউটপুট থেকে তালিকা কপি করে পাস করুন। কোনো auto-discovery এখানে হয় না (নিরাপত্তার জন্য ইচ্ছাকৃত)।");
    return { aborted: true, reason: "no-list" };
  }
  const proceed = window.confirm(`${orphanFamilyIds.length}টি family-এর metadata (families/familyCodes/legacyCollectionMap doc) স্থায়ীভাবে ডিলিট হবে — প্রতিটি delete-এর আগে fresh re-verify হবে (আর orphan না থাকলে skip হবে)। কোনো real ডাটা (data_<code> কালেকশন/members subcollection) touch হবে না — শুধু খালি metadata। এগিয়ে যাবেন?`);
  if (!proceed) {
    console.log("[Orphan cleanup] ব্যবহারকারী বাতিল করেছেন — কোনো delete হয়নি।");
    return { aborted: true, reason: "user-cancelled" };
  }

  console.log(`[Orphan cleanup] শুরু হচ্ছে — ${orphanFamilyIds.length}টি familyId প্রসেস হবে, প্রতিটির জন্য delete-এর আগে fresh re-verify হবে।`);
  const results = [];
  for (const familyId of orphanFamilyIds) {
    try {
      const famSnap = await db.collection("families").doc(familyId).get();
      if (!famSnap.exists) {
        results.push({ familyId, status: "skip", reason: "already-gone" });
        continue;
      }
      const fam = famSnap.data();
      const familyCode = typeof fam.familyCode === "string" ? fam.familyCode : null;
      const migrationState = fam.migrationState || "legacy";
      const collectionName = fam.dataCollectionName || (familyCode ? `data_${familyCode}` : null);

      // Fresh re-verify — audit-এর সময়ের পর কোনো real data তৈরি হয়েছে কিনা
      let hasV2Data = false;
      let hasLegacyData = false;
      if (migrationState === "v2") {
        const membersSnap = await db.collection("families").doc(familyId).collection("members").limit(1).get();
        hasV2Data = !membersSnap.empty;
      }
      if (collectionName) {
        const legacySnap = await db.collection(collectionName).limit(1).get();
        hasLegacyData = !legacySnap.empty;
      }
      if (hasV2Data || hasLegacyData) {
        console.warn(`[Orphan cleanup] familyId=${familyId} আর orphan নেই (এখন real data পাওয়া গেছে) — SKIP করা হলো, delete হয়নি।`);
        results.push({ familyId, status: "skip", reason: "no-longer-orphan" });
        continue;
      }

      // ধাপ ১: families/{familyId} delete
      await db.collection("families").doc(familyId).delete();

      // ধাপ ২: familyCodes/{familyCode} — শুধু matching familyId হলে
      let familyCodesDeleted = false;
      if (familyCode) {
        try {
          const codeSnap = await db.collection("familyCodes").doc(familyCode).get();
          if (codeSnap.exists && codeSnap.data().familyId === familyId) {
            await db.collection("familyCodes").doc(familyCode).delete();
            familyCodesDeleted = true;
          }
        } catch (err) {
          console.warn(`[Orphan cleanup] familyId=${familyId} — familyCodes/${familyCode} delete করতে সমস্যা:`, err);
        }
      }

      // ধাপ ৩: legacyCollectionMap/{collectionName} — শুধু matching familyId হলে
      let legacyMapDeleted = false;
      if (collectionName) {
        try {
          const mapSnap = await db.collection("legacyCollectionMap").doc(collectionName).get();
          if (mapSnap.exists && mapSnap.data().familyId === familyId) {
            await db.collection("legacyCollectionMap").doc(collectionName).delete();
            legacyMapDeleted = true;
          }
        } catch (err) {
          console.warn(`[Orphan cleanup] familyId=${familyId} — legacyCollectionMap/${collectionName} delete করতে সমস্যা:`, err);
        }
      }

      results.push({ familyId, familyCode, status: "deleted", familyCodesDeleted, legacyMapDeleted });
    } catch (err) {
      console.error(`[Orphan cleanup] familyId=${familyId} প্রসেস করতে ব্যর্থ:`, err);
      results.push({ familyId, status: "error", error: err.message });
    }
  }

  const deletedCount = results.filter(r => r.status === "deleted").length;
  const skippedCount = results.filter(r => r.status === "skip").length;
  const errorCount = results.filter(r => r.status === "error").length;
  console.log(`[Orphan cleanup] সম্পন্ন — ${deletedCount}টি ডিলিট হয়েছে, ${skippedCount}টি skip হয়েছে, ${errorCount}টি ত্রুটি হয়েছে।`);
  console.table(results);
  return { deletedCount, skippedCount, errorCount, results };
}
if (typeof window !== "undefined") {
  window.cleanupOrphanFamilies = cleanupOrphanFamilies;
}
// --- Data Lifecycle Policy: one-time lastActiveAt backfill (owner-approved,
// ১৪ আগস্ট ২০২৬) — console-only, dry-run first, প্রতিটি real family-তে ম্যানুয়ালি
// familyId পাস করে চালাতে হবে। Baseline = আজকের timestamp (conservative — কোনো
// সদস্য/family ভুলবশত early-inactive হিসেবে চিহ্নিত হবে না)। Idempotent: আগে থেকে
// lastActiveAt থাকা doc merge:true-তে override হয় (re-run নিরাপদ, ক্ষতি নেই)।
async function backfillLastActiveAt(familyId, confirm) {
  const familyRoot = db.collection("families").doc(familyId);
  const membersSnap = await familyRoot.collection("members").get();
  console.log(`[Lifecycle backfill] familyId=${familyId} — ${membersSnap.size}টি member doc + ১টি family doc lastActiveAt পাবে।`);
  if (!confirm) {
    console.log("[Lifecycle backfill] dry-run শেষ — আসল লেখা চালাতে backfillLastActiveAt(familyId, true) কল করুন।");
    return { familyId, memberCount: membersSnap.size, dryRun: true };
  }
  const ts = firebase.firestore.Timestamp.now();
  const batch = db.batch();
  membersSnap.docs.forEach(d => batch.set(d.ref, { lastActiveAt: ts }, { merge: true }));
  batch.set(familyRoot, { lastActiveAt: ts }, { merge: true });
  await batch.commit();
  console.log(`[Lifecycle backfill] সম্পন্ন — familyId=${familyId}, ${membersSnap.size}টি member + family doc আপডেট হয়েছে।`);
  return { familyId, memberCount: membersSnap.size, dryRun: false };
}
if (typeof window !== "undefined") {
  window.backfillLastActiveAt = backfillLastActiveAt;
}
// --- users/{uid} <-> familyCode mapping (Google-account-based recovery) ---
// ছোট, ঐচ্ছিক কালেকশন — Google-linked uid-কে familyCode-এর সাথে যুক্ত রাখে
// যাতে নতুন ডিভাইসে বা cache-clear-এর পরও শুধু Google sign-in করলেই সঠিক
// family code (এবং তাই সব সদস্য/রেকর্ড) স্বয়ংক্রিয়ভাবে ফিরে আসে। Family
// code দিয়ে সরাসরি sync করার existing flow অপরিবর্তিত থাকছে — এটি শুধু
// একটি অতিরিক্ত, বিকল্প recovery-পথ, কোনো breaking change নয়।
async function loadUserFamilyCode(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data().familyCode || null : null;
  } catch {
    return null;
  }
}
async function saveUserFamilyCode(uid, code) {
  // ফাংশনের নিজের ভেতরেই guard — caller ভুলে খালি/অবৈধ code পাঠালেও
  // users/{uid}-এ কখনো ফাঁকা familyCode লেখা হবে না।
  if (!uid || !code || !code.trim()) return;
  try {
    await db.collection("users").doc(uid).set({
      familyCode: code.trim(),
      updatedAt: Date.now()
    }, {
      merge: true
    });
  } catch {}
}
// Google দিয়ে sign-in করা থাকলে কল হয়। users/{uid}-এ আগে থেকে সংরক্ষিত
// familyCode থাকলে (অন্য ডিভাইস থেকে link করা) সেটাই এই ডিভাইসে local-এ
// বসিয়ে দেওয়া হয় (account অনুসরণ করে family/profile/records লোড হয়)।
// না থাকলে, এই ডিভাইসের বর্তমান বৈধ (non-empty) local familyCode
// account-এর সাথে save করে রাখা হয় যাতে ভবিষ্যতে অন্য ডিভাইসেও কাজে লাগে।
async function syncFamilyCodeWithAccount() {
  if (!auth.currentUser || !isGoogleLinked()) return {
    switched: false
  };
  // Creator override active থাকলে (enterFamilyAsCreator() দিয়ে ম্যানুয়ালি
  // সেট করা, এবং flag বর্তমান family_code-এর সাথে মিলছে) — account-linked
  // familyCode-এ ফিরিয়ে দেওয়া হবে না। শুধু creator UID-এর জন্য প্রযোজ্য।
  if (isCreatorAuth() && localStorage.getItem(CREATOR_OVERRIDE_KEY) === getFamilyCode()) {
    return { switched: false };
  }
  const uid = auth.currentUser.uid;
  const remoteCode = await loadUserFamilyCode(uid);
  const localCode = getFamilyCode();
  if (remoteCode && remoteCode !== localCode) {
    localStorage.setItem("family_code", remoteCode);
    localStorage.setItem("family_code_is_custom", "1");
    return {
      switched: true
    };
  }
  if (!remoteCode && localCode && localCode.trim()) {
    await saveUserFamilyCode(uid, localCode);
  }
  return {
    switched: false
  };
}
// §৫ fix: এখন cache-ব্যাকড — boot-এ ensureDataCollectionName() একবার
// families/{id}.dataCollectionName পড়ে/ব্যাকফিল করে cache পূরণ করে
// (App-এর boot useEffect-এ awaited)। cache পূরণ হওয়ার আগে বা কোনো কারণে
// ব্যর্থ হলে (network ইত্যাদি) আগের মতোই লাইভ familyCode থেকে derive করা
// হয় — fully backward-compatible fallback, কোনো call site (৩০+ জায়গা)
// পরিবর্তন করতে হয়নি কারণ ফাংশনটি এখনও সম্পূর্ণ synchronous।
const getCollectionName = () => cachedDataCollectionName || `data_${getFamilyCode()}`;
const appStorage = {
  async get(key, shared) {
    if (!shared) {
      const v = localStorage.getItem(key);
      return v !== null ? {
        key,
        value: v,
        shared
      } : null;
    }
    const doc = await db.collection(getCollectionName()).doc(key).get();
    if (!doc.exists) return null;
    return {
      key,
      value: doc.data().value,
      shared
    };
  },
  async set(key, value, shared) {
    if (!shared) {
      localStorage.setItem(key, value);
      return {
        key,
        value,
        shared
      };
    }
    await db.collection(getCollectionName()).doc(key).set({
      value,
      updatedAt: Date.now()
    });
    return {
      key,
      value,
      shared
    };
  },
  async delete(key, shared) {
    if (!shared) {
      localStorage.removeItem(key);
      return {
        key,
        deleted: true,
        shared
      };
    }
    await db.collection(getCollectionName()).doc(key).delete();
    return {
      key,
      deleted: true,
      shared
    };
  },
  async list(prefix, shared) {
    if (!shared) {
      const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
      return {
        keys,
        prefix,
        shared
      };
    }
    let q = db.collection(getCollectionName());
    if (prefix) {
      q = q.where(firebase.firestore.FieldPath.documentId(), ">=", prefix).where(firebase.firestore.FieldPath.documentId(), "<", prefix + "\uf8ff");
    }
    const snap = await q.get();
    const keys = snap.docs.map(d => d.id);
    return {
      keys,
      prefix,
      shared
    };
  }
};

// =====================================================================
// --- Google Drive Backup & Restore (personal recovery, NOT family sync) ---
// =====================================================================
// এই মডিউলটি সম্পূর্ণ ঐচ্ছিক এবং ব্যক্তিগত (এই ডিভাইসে যে Google অ্যাকাউন্ট
// লিংক করা আছে তার Drive-এ)। এটি পরিবারের রিয়েল-টাইম সিংকের বিকল্প নয় —
// Firestore-ই সবসময় পরিবারের আসল ডাটার উৎস (source of truth) থাকবে। Drive
// ব্যাকআপ শুধু ডিভাইস হারানো/পরিবর্তনের সময় রিকভারির জন্য।
//
// Auth approach: static PWA (কোনো ব্যাকএন্ড নেই) হওয়ায় Google-এর নিজস্ব
// সুপারিশ অনুযায়ী Google Identity Services (GIS)-এর token client
// (google.accounts.oauth2.initTokenClient) ব্যবহার করা হয়েছে — এটি Firebase
// Auth-এর linkWithPopup()-এর accessToken থেকে আলাদা এবং প্রয়োজনমতো রিফ্রেশ
// করা যায়। drive.file স্কোপ (non-sensitive) ব্যবহার করা হয়েছে, তাই অ্যাপ
// শুধু নিজে তৈরি করা ফাইলটুকুই দেখতে/লিখতে পারে — ব্যবহারকারীর Drive-এর
// বাকি কোনো ফাইলে অ্যাক্সেস নেই।
//
// !! সেটআপ প্রয়োজন (একবারই, কোডের বাইরে): Google Cloud Console-এ (একই
// Firebase প্রজেক্টের সাথে সংযুক্ত GCP প্রজেক্ট) Drive API enable করে নিচের
// GOOGLE_DRIVE_CLIENT_ID-এর জায়গায় Firebase Google Sign-In-এর জন্য
// অটো-তৈরি হওয়া Web OAuth Client ID বসাতে হবে (Cloud Console → APIs &
// Services → Credentials → "Web client (auto created by Google Service)"),
// এবং সেই ক্লায়েন্টের Authorized JavaScript origins-এ অ্যাপের ডোমেইন
// (যেমন https://dailytask-family.pages.dev) যোগ করতে হবে।
const GOOGLE_DRIVE_CLIENT_ID = "10031644603-a8i21oh9sookntt70k3qvr29t2ns3s9h.apps.googleusercontent.com";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_BACKUP_FILE_NAME = "daily_task_drive_backup.json";
const DRIVE_BACKUP_FOLDER_NAME = "DailyTask Backup";
const DRIVE_BACKUP_SCHEMA_VERSION = 2;
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

let driveTokenClient = null;
let driveAccessToken = null;
let driveTokenExpiresAt = 0;
// H-4 fix: shared in-flight promise so concurrent getDriveAccessToken()
// callers await the same token request instead of each reassigning the
// GIS token client's single shared callback (see getDriveAccessToken()).
let driveTokenRequestInFlight = null;

function isGoogleDriveConfigured() {
  return typeof google !== "undefined" && !!(google.accounts && google.accounts.oauth2) && !GOOGLE_DRIVE_CLIENT_ID.startsWith("YOUR_");
}
function ensureDriveTokenClient() {
  if (driveTokenClient) return driveTokenClient;
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_DRIVE_CLIENT_ID,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: () => {}
  });
  return driveTokenClient;
}
// GIS-এর requestAccessToken() একটি popup খোলে বলে ব্রাউজারের popup-blocker
// এড়াতে সাধারণত ইউজারের ক্লিক (gesture)-এর মধ্যেই কল করা উচিত। আগে একটি
// "silent" (prompt: "") চেষ্টা করা হয় — আগে থেকেই অনুমতি দেওয়া থাকলে এটি
// কোনো popup ছাড়াই কাজ করতে পারে; ব্যর্থ হলে সরাসরি consent popup দেখানো হয়।
function requestDriveAccessToken(promptMode) {
  return new Promise((resolve, reject) => {
    const client = ensureDriveTokenClient();
    client.callback = resp => {
      if (resp && resp.access_token) {
        driveAccessToken = resp.access_token;
        driveTokenExpiresAt = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3500 * 1000);
        resolve(driveAccessToken);
      } else {
        reject(new Error((resp && resp.error) || "drive-auth-failed"));
      }
    };
    client.error_callback = err => reject(err instanceof Error ? err : new Error((err && err.type) || "drive-auth-error"));
    try {
      client.requestAccessToken({ prompt: promptMode });
    } catch (err) {
      reject(err);
    }
  });
}
async function getDriveAccessToken() {
  if (!isGoogleDriveConfigured()) {
    throw new Error("Google Drive ব্যাকআপ এখনো সেটআপ করা হয়নি।");
  }
  if (driveAccessToken && Date.now() < driveTokenExpiresAt - 60000) return driveAccessToken;
  // H-4 fix: ensureDriveTokenClient()-এর client.callback/error_callback
  // module-level shared object-এর ওপর সেট হয় — requestDriveAccessToken()
  // প্রতিবার সেটা reassign করে। দুটি জায়গা থেকে (যেমন বুট-টাইম silent
  // Drive-restore চেক ও ম্যানুয়াল ব্যাকআপ ক্লিক) প্রায় একই সময়ে
  // getDriveAccessToken() ডাকা হলে দ্বিতীয় কলের callback assignment প্রথম
  // কলেরটাকে overwrite করে ফেলতে পারে, ফলে প্রথম কলের Promise কখনো
  // resolve/reject না হয়ে ঝুলে থাকতে পারে। এই in-flight promise cache
  // নিশ্চিত করে concurrent কলগুলো নতুন করে requestAccessToken() না ডেকে
  // একই চলমান promise-এ await করবে।
  if (driveTokenRequestInFlight) return driveTokenRequestInFlight;
  driveTokenRequestInFlight = (async () => {
    try {
      return await requestDriveAccessToken("");
    } catch {
      return await requestDriveAccessToken("consent");
    }
  })();
  try {
    return await driveTokenRequestInFlight;
  } finally {
    driveTokenRequestInFlight = null;
  }
}
async function driveFetch(url, options, _retriedAfter401) {
  const token = await getDriveAccessToken();
  const res = await fetch(url, {
    ...(options || {}),
    headers: {
      ...((options && options.headers) || {}),
      Authorization: `Bearer ${token}`
    }
  });
  // M-3 fix: the cached token can look valid by our local clock (within the
  // proactive expiry check in getDriveAccessToken()) yet still be rejected
  // by the server (revoked, clock skew, early expiry). On a single 401,
  // clear the cached token and retry exactly once with a freshly obtained
  // one, instead of failing the whole multi-call operation immediately.
  if (res.status === 401 && !_retriedAfter401) {
    driveAccessToken = null;
    return driveFetch(url, options, true);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res;
}
// এই Google অ্যাকাউন্টে আগে থেকে অ্যাপের তৈরি করা ব্যাকআপ ফাইল আছে কিনা
// খুঁজে বের করে (নাম দিয়ে, familyCode নির্বিশেষে — এটাই নতুন ডিভাইসে
// অন্য ফ্যামিলি কোডের ব্যাকআপ "detect" করার মূল উপায়)। প্রথমে এই ডিভাইসের
// পরিচিত fileId (localStorage cache) দিয়ে দ্রুত চেষ্টা করা হয়, ব্যর্থ হলে
// নাম দিয়ে খোঁজা হয়।
async function findDriveBackupFile() {
  const cacheKey = `drive_backup_file_id:${getFamilyCode()}`;
  const cachedId = localStorage.getItem(cacheKey);
  if (cachedId) {
    try {
      const res = await driveFetch(`${DRIVE_API_BASE}/files/${cachedId}?fields=id,name,modifiedTime,appProperties,trashed`);
      const meta = await res.json();
      if (!meta.trashed) return meta;
    } catch {}
    localStorage.removeItem(cacheKey);
  }
  const q = encodeURIComponent(`name='${DRIVE_BACKUP_FILE_NAME}' and trashed=false`);
  const res = await driveFetch(`${DRIVE_API_BASE}/files?q=${q}&fields=files(id,name,modifiedTime,appProperties)&spaces=drive&pageSize=5`);
  const json = await res.json();
  const file = json.files && json.files[0];
  return file || null;
}
// Drive-এ "DailyTask Backup" নামে একটি ফোল্ডার খুঁজে বের করে, না থাকলে
// তৈরি করে (drive.file স্কোপে অ্যাপ নিজে যা তৈরি করে তা পরেও দেখতে/লিখতে
// পারে, তাই এটি নির্ভরযোগ্যভাবে কাজ করে)। ফোল্ডার আইডি localStorage-এ
// cache করা হয় যাতে বারবার খুঁজতে না হয়।
async function findOrCreateDriveBackupFolder() {
  const cacheKey = "drive_backup_folder_id";
  const cachedId = localStorage.getItem(cacheKey);
  if (cachedId) {
    try {
      const res = await driveFetch(`${DRIVE_API_BASE}/files/${cachedId}?fields=id,trashed`);
      const meta = await res.json();
      if (!meta.trashed) return meta.id;
    } catch {}
    localStorage.removeItem(cacheKey);
  }
  const q = encodeURIComponent(`name='${DRIVE_BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const listRes = await driveFetch(`${DRIVE_API_BASE}/files?q=${q}&fields=files(id)&spaces=drive&pageSize=1`);
  const listJson = await listRes.json();
  if (listJson.files && listJson.files[0]) {
    localStorage.setItem(cacheKey, listJson.files[0].id);
    return listJson.files[0].id;
  }
  const createRes = await driveFetch(`${DRIVE_API_BASE}/files?fields=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: DRIVE_BACKUP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder"
    })
  });
  const createJson = await createRes.json();
  localStorage.setItem(cacheKey, createJson.id);
  return createJson.id;
}
// =====================================================================
// --- Backup/Restore Switch-awareness (helper): migrationState অনুযায়ী
// legacy collection বা v2 subcollection থেকে সঠিক জায়গায় read/write করে,
// কিন্তু backup ফাইলের বাইরের ফরম্যাট (legacy-style compound key:
// "member:<id>", "entry:<id>:<date>", "weekly:<id>:<yyyy-mm>") সবসময়
// অপরিবর্তিত রাখে — তাই পুরনো backup ফাইল এখনো import করা যাবে এবং
// legacy family-তে এই দুই ফাংশনের আউটপুট/আচরণ আগের মতোই বিট-ফর-বিট
// থাকে (mode !== "v2" শাখা)। custom_fields ও meeting_rows_v2: — এই দুটো
// key v2 migration-এর স্কোপের বাইরে (app.js নিজেই এগুলো এখনো শুধু legacy
// collection-এ রাখে), তাই এরা সবসময় legacy collection থেকেই পড়া/লেখা হয়,
// migrationState নির্বিশেষে।
// =====================================================================
async function readAllFamilyDataForBackup(migrationState) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const result = {};
  if (ctx.mode !== "v2") {
    const snap = await db.collection(getCollectionName()).get();
    snap.docs.forEach(doc => {
      result[doc.id] = doc.data();
    });
    return result;
  }
  const [membersSnap, entriesSnap, weeklySnap, legacySnap] = await Promise.all([
    ctx.membersRef.get(),
    ctx.entriesRef.get(),
    ctx.weeklyRef.get(),
    db.collection(getCollectionName()).get()
  ]);
  membersSnap.docs.forEach(d => {
    result[`member:${d.id}`] = d.data();
  });
  entriesSnap.docs.forEach(d => {
    const idx = d.id.indexOf("_");
    if (idx === -1) return;
    result[`entry:${d.id.slice(0, idx)}:${d.id.slice(idx + 1)}`] = d.data();
  });
  weeklySnap.docs.forEach(d => {
    const idx = d.id.indexOf("_");
    if (idx === -1) return;
    result[`weekly:${d.id.slice(0, idx)}:${d.id.slice(idx + 1)}`] = d.data();
  });
  legacySnap.docs.forEach(doc => {
    const id = doc.id;
    if (id === "custom_fields" || id.startsWith("meeting_rows_v2:")) {
      result[id] = doc.data();
    }
  });
  return result;
}
// items: [{key, data}] — key সবসময় উপরের legacy-style compound format-এই
// আসে (Drive/local backup ফাইল থেকে parse করা)। migrationState অনুযায়ী
// সঠিক legacy doc বা v2 subcollection doc-এ translate করে merge-write করে।
async function writeParsedBackupToFamily(migrationState, items) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const CHUNK_SIZE = 450;
  async function commitInChunks(writes) {
    for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
      const batch = db.batch();
      writes.slice(i, i + CHUNK_SIZE).forEach(({ ref, data }) => {
        batch.set(ref, data, { merge: true });
      });
      await batch.commit();
    }
  }
  if (ctx.mode !== "v2") {
    const colRef = db.collection(getCollectionName());
    await commitInChunks(items.map(({ key, data }) => ({ ref: colRef.doc(key), data })));
    return;
  }
  const legacyColRef = db.collection(getCollectionName());
  const writes = items.map(({ key, data }) => {
    if (key.startsWith("member:")) {
      return { ref: ctx.membersRef.doc(key.slice("member:".length)), data };
    }
    if (key.startsWith("entry:")) {
      const rest = key.slice("entry:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) return null;
      return { ref: ctx.entriesRef.doc(`${rest.slice(0, idx)}_${rest.slice(idx + 1)}`), data };
    }
    if (key.startsWith("weekly:")) {
      const rest = key.slice("weekly:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) return null;
      return { ref: ctx.weeklyRef.doc(`${rest.slice(0, idx)}_${rest.slice(idx + 1)}`), data };
    }
    // custom_fields / meeting_rows_v2: — legacy-only (উপরের নোট দেখুন)
    return { ref: legacyColRef.doc(key), data };
  }).filter(Boolean);
  await commitInChunks(writes);
}
// পুরো ফ্যামিলি Firestore কালেকশন + এই ডিভাইসের প্রয়োজনীয় সেটিংস একসাথে
// করে একটি Versioned, Extensible ব্যাকআপ অবজেক্ট বানায়। ভবিষ্যতে
// familyId/Family Metadata/Admin System যোগ হলে "family" অবজেক্টে নতুন
// key যোগ করলেই হবে — schemaVersion বাড়িয়ে migration করা যাবে, পুরনো
// ব্যাকআপ ফাইল ভাঙবে না।
// Switch prep fix: migrationState param যোগ হয়েছে — readAllFamilyDataForBackup()
// v2 family-তে সঠিক (live) subcollection থেকে পড়ে, legacy/undefined হলে
// আগের hardcoded getCollectionName() আচরণ বিট-ফর-বিট অপরিবর্তিত থাকে।
async function buildDriveBackupPayload(migrationState) {
  const data = await readAllFamilyDataForBackup(migrationState);
  let isCustomCode = false;
  let themeColor = null;
  try {
    isCustomCode = localStorage.getItem("family_code_is_custom") === "1";
  } catch {}
  try {
    themeColor = localStorage.getItem("theme_color") || null;
  } catch {}
  return {
    schemaVersion: DRIVE_BACKUP_SCHEMA_VERSION,
    appVersion: "1.0.0",
    backupTime: Date.now(),
    family: {
      familyCode: getFamilyCode(),
      isCustomCode
      // ভবিষ্যতে: familyId, memberIdVersion ইত্যাদি এখানে যোগ হবে
    },
    preferences: {
      themeColor
    },
    data
  };
}
// existingFileId দিলে সেই একই ফাইল আপডেট (PATCH) হয়, নাহলে নতুন ফাইল
// তৈরি (POST) হয় — এভাবে সবসময় একটিমাত্র ফাইলই ব্যবহৃত হয়, প্রতিবার নতুন
// ফাইল জমা হয় না। appProperties-এ familyCode রাখা হয় (Drive UI-তে অদৃশ্য,
// শুধু API দিয়ে পড়া যায়) — future multi-family backup সাপোর্টের জন্য এই
// একই মেকানিজম দিয়ে familyCode-ভিত্তিক আলাদা ফাইল খোঁজা সহজে যোগ করা যাবে।
// folderId শুধু নতুন ফাইল তৈরির সময় প্রযোজ্য (parents সেট করতে) — বিদ্যমান
// ফাইল আপডেট করার সময় তার লোকেশন বদলানো হয় না (move করতে হলে আলাদা
// addParents/removeParents প্যারামিটার লাগে, যা এখানে প্রয়োজন নেই)।
async function uploadDriveBackup(payload, existingFileId, folderId) {
  const appProperties = {
    app: "daily-task",
    familyCode: payload.family.familyCode,
    schemaVersion: String(payload.schemaVersion)
  };
  const metadata = existingFileId ? { appProperties } : {
    name: DRIVE_BACKUP_FILE_NAME,
    mimeType: "application/json",
    appProperties,
    ...(folderId ? { parents: [folderId] } : {})
  };
  const boundary = "dailytask_" + Math.random().toString(36).slice(2);
  const body = `--${boundary}\r\n` + `Content-Type: application/json; charset=UTF-8\r\n\r\n` + `${JSON.stringify(metadata)}\r\n` + `--${boundary}\r\n` + `Content-Type: application/json\r\n\r\n` + `${JSON.stringify(payload)}\r\n` + `--${boundary}--`;
  const url = existingFileId ? `${DRIVE_UPLOAD_BASE}/files/${existingFileId}?uploadType=multipart&fields=id,appProperties,modifiedTime` : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,appProperties,modifiedTime`;
  const res = await driveFetch(url, {
    method: existingFileId ? "PATCH" : "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  const json = await res.json();
  try {
    localStorage.setItem(`drive_backup_file_id:${payload.family.familyCode}`, json.id);
  } catch {}
  return json;
}
async function downloadDriveBackupContent(fileId) {
  const res = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`);
  return res.json();
}
// ফ্যামিলি কোড ভিন্ন হলে নীরবে ওভাররাইট না করে ব্যবহারকারীকে জিজ্ঞাসা করে,
// তারপর Firestore থেকে বর্তমান স্ন্যাপশট নিয়ে Drive-এ আপলোড করে।
// Switch prep fix: migrationState param buildDriveBackupPayload()-এ forward
// করা হয় যাতে v2 family-তে সঠিক (live) ডাটা backup হয়।
async function backupToGoogleDrive(migrationState) {
  const existing = await findDriveBackupFile();
  const currentFamilyCode = getFamilyCode();
  if (existing && existing.appProperties && existing.appProperties.familyCode && existing.appProperties.familyCode !== currentFamilyCode) {
    const proceed = window.confirm(`এই Google অ্যাকাউন্টে ইতিমধ্যে অন্য একটি ফ্যামিলি কোডের (${existing.appProperties.familyCode}) ব্যাকআপ সংরক্ষিত আছে। এগিয়ে গেলে সেটি এই ফ্যামিলির (${currentFamilyCode}) ডাটা দিয়ে প্রতিস্থাপিত হয়ে যাবে এবং আগের ফ্যামিলির ব্যাকআপ আর পাওয়া যাবে না। আপনি কি নিশ্চিতভাবে এগিয়ে যেতে চান?`);
    if (!proceed) return { skipped: true };
  }
  const payload = await buildDriveBackupPayload(migrationState);
  let folderId = null;
  if (!existing) {
    // শুধু নতুন ফাইল তৈরির সময়ই ফোল্ডার লাগবে — বিদ্যমান ফাইল আপডেটে
    // দরকার নেই। ফোল্ডার তৈরি ব্যর্থ হলেও (যেমন সাময়িক নেটওয়ার্ক সমস্যা)
    // ব্যাকআপ যেন আটকে না থাকে — সেক্ষেত্রে ফাইলটি Drive-এর রুটে তৈরি হবে।
    try {
      folderId = await findOrCreateDriveBackupFolder();
    } catch {}
  }
  await uploadDriveBackup(payload, existing ? existing.id : null, folderId);
  return { success: true };
}
// --- Shared merge logic (local-file Import ও Drive Restore উভয়ই ব্যবহার করে) ---
// নিয়ম:
//   • member: — এখন entry/weekly-এর মতোই updatedAt-ভিত্তিক conflict
//     resolution হয় (compareUpdatedAt=true হলে): নতুনটি রাখা হয়, তবে লাইভ
//     দায়িত্ব/ownerUid কখনো ব্যাকআপ দিয়ে ওভাররাইট হয় না — শুধু নাম/জেন্ডার
//     ইত্যাদি বাকি ফিল্ড আপডেট হয়। মিসিং updatedAt (এই ফিচারের আগে তৈরি
//     পুরনো সদস্য ডকুমেন্ট) 0 ধরা হয় — backward-compatible fallback।
//     compareUpdatedAt=false (local-file Import)-এ আগের আচরণ অপরিবর্তিত:
//     সদস্য আগে থেকে থাকলে কখনো ছোঁয়া হয় না। শুধু একেবারে নতুন সদস্য
//     থাকলে তা তৈরি হয়।
//   • entry:/weekly:/অন্যান্য — compareUpdatedAt সত্য হলে updatedAt দেখে
//     নতুনটি রাখা হয়; মিথ্যা হলে (বর্তমান লোকাল-ফাইল Import) আগের আচরণ
//     অপরিবর্তিত থাকে (backup সবসময় লেখা হয়)।
//   • Firestore-এ থাকা কোনো কিছু কখনো ডিলিট করা হয় না — শুধু backup-এর
//     key-গুলোর ওপর দিয়ে লুপ চলে, Firestore-only key স্পর্শ করা হয় না।
//   • অন্য ডিভাইসের claim করা সদস্যের entry/weekly/নিজের member: ডকুমেন্ট
//     স্কিপ করা হয় (আগের মতোই)।
// Switch prep fix: migrationState নতুন প্রথম param — loadMembersV2()-কে
// সঠিক migrationState পাস করা হয় (আগে param ছাড়া কল হতো, v2 family-তে
// ownerByMemberId ভুলভাবে legacy collection থেকে গণনা হতো), existingDocsByKey
// এখন readAllFamilyDataForBackup() (Switch-aware) থেকে আসে, এবং শেষের write
// writeParsedBackupToFamily() দিয়ে হয় — legacy/undefined migrationState-এ
// আউটপুট/আচরণ আগের মতোই বিট-ফর-বিট থাকে।
async function mergeBackupData(migrationState, parsed, options) {
  const compareUpdatedAt = !!(options && options.compareUpdatedAt);
  const myUid = auth.currentUser ? auth.currentUser.uid : null;
  const currentMembers = await loadMembersV2(migrationState);
  const ownerByMemberId = {};
  currentMembers.forEach(m => {
    ownerByMemberId[m.id] = m.ownerUid ?? null;
  });
  function isMineOrUnclaimed(uid) {
    return !uid || uid === myUid;
  }
  let existingDocsByKey = {};
  if (compareUpdatedAt) {
    existingDocsByKey = await readAllFamilyDataForBackup(migrationState);
  }
  const keys = Object.keys(parsed);
  const memberKeys = [];
  const otherKeys = [];
  const skippedKeys = [];
  let skippedOlder = 0;
  keys.forEach(key => {
    const parts = key.split(":");
    const isMemberScoped = parts[0] === "entry" || parts[0] === "weekly" || parts[0] === "member";
    const memberId = isMemberScoped ? parts[1] : null;
    if (memberId !== null && Object.prototype.hasOwnProperty.call(ownerByMemberId, memberId) && !isMineOrUnclaimed(ownerByMemberId[memberId])) {
      skippedKeys.push(key);
      return;
    }
    if (parts[0] === "member") {
      // compareUpdatedAt=false (local-file Import) — আগের আচরণ অপরিবর্তিত:
      // সদস্য আগে থেকে থাকলে কখনো ছোঁয়া হয় না।
      const alreadyExists = compareUpdatedAt ? !!existingDocsByKey[key] : ownerByMemberId.hasOwnProperty(memberId);
      if (!compareUpdatedAt && alreadyExists) {
        return;
      }
      if (compareUpdatedAt && alreadyExists) {
        // entry/weekly-এর মতোই updatedAt-ভিত্তিক conflict resolution —
        // মিসিং updatedAt-কে 0 ধরা হয় (এই ফিচারের আগে তৈরি হওয়া পুরনো
        // সদস্য ডকুমেন্টের জন্য backward-compatible fallback)।
        const incomingUpdatedAt = parsed[key]?.updatedAt || 0;
        const existingUpdatedAt = existingDocsByKey[key]?.updatedAt || 0;
        if (existingUpdatedAt >= incomingUpdatedAt) {
          skippedOlder += 1;
          return; // বিদ্যমান Firestore ভার্সনই বহাল থাকবে
        }
        // backup নতুন — নাম/জেন্ডার ইত্যাদি ফিল্ড আপডেট হবে, কিন্তু বর্তমান
        // (লাইভ) দায়িত্ব/ownerUid কখনো ব্যাকআপ দিয়ে ওভাররাইট হয় না। claim/
        // release স্বাধীনভাবে ঘটে থাকে — একটি পুরনো ব্যাকআপ সেই লাইভ
        // দায়িত্ব-অবস্থাকে "টাইম-ট্রাভেল" করে বদলে দিতে পারবে না।
        memberKeys.push({
          key,
          data: { ...parsed[key], ownerUid: existingDocsByKey[key].ownerUid ?? null }
        });
        return;
      }
      // একেবারে নতুন সদস্য — brand-new create
      const backupOwner = parsed[key].ownerUid ?? null;
      const normalizedOwner = backupOwner === myUid ? myUid : null;
      memberKeys.push({
        key,
        data: { ...parsed[key], ownerUid: normalizedOwner }
      });
      return;
    }
    if (compareUpdatedAt && existingDocsByKey[key]) {
      const incomingUpdatedAt = parsed[key]?.updatedAt || 0;
      const existingUpdatedAt = existingDocsByKey[key]?.updatedAt || 0;
      if (existingUpdatedAt >= incomingUpdatedAt) {
        skippedOlder += 1;
        return;
      }
    }
    otherKeys.push({ key, data: parsed[key] });
  });
  await writeParsedBackupToFamily(migrationState, [...memberKeys, ...otherKeys]);
  return {
    skippedKeys,
    skippedOlder,
    createdMembers: memberKeys.length,
    mergedOthers: otherKeys.length
  };
}
// Google Drive থেকে ডাউনলোড করা ব্যাকআপ যাচাই করে, প্রয়োজনে এই ডিভাইসের
// family_code ব্যাকআপের সাথে মিলিয়ে সুইচ করে (নতুন ডিভাইসে "আগের অবস্থায়
// ফেরা"-র মূল অংশ), তারপর Firestore-এ merge করে।
// Switch prep fix: migrationState নতুন দ্বিতীয় param — mergeBackupData()-এ
// forward করা হয় (Switch-aware write path)।
async function restoreFromGoogleDrive(fileId, migrationState) {
  const backup = await downloadDriveBackupContent(fileId);
  if (!backup || typeof backup !== "object" || !backup.data || !backup.family || !backup.family.familyCode) {
    throw new Error("ব্যাকআপ ফাইলের ফরম্যাট চেনা যাচ্ছে না।");
  }
  // M-2 fix: a backup written by a newer app build (higher schemaVersion)
  // may contain a data shape this build's mergeBackupData() doesn't know
  // how to handle safely. Missing schemaVersion (older backups, before this
  // field existed) is treated as compatible — only a version strictly
  // greater than what this build supports is blocked.
  if (backup.schemaVersion && backup.schemaVersion > DRIVE_BACKUP_SCHEMA_VERSION) {
    throw new Error("এই ব্যাকআপ ফাইলটি অ্যাপের নতুন ভার্সনে তৈরি হয়েছে — অনুগ্রহ করে আগে অ্যাপ আপডেট করুন, তারপর রিস্টোর করুন।");
  }
  const backupFamilyCode = backup.family.familyCode;
  if (backupFamilyCode !== getFamilyCode()) {
    localStorage.setItem("family_code", backupFamilyCode);
    if (backup.family.isCustomCode) {
      localStorage.setItem("family_code_is_custom", "1");
    } else {
      localStorage.removeItem("family_code_is_custom");
    }
  }
  if (backup.preferences && backup.preferences.themeColor) {
    try {
      localStorage.setItem("theme_color", backup.preferences.themeColor);
    } catch {}
  }
  const result = await mergeBackupData(migrationState, backup.data, { compareUpdatedAt: true });
  return { ...result, familyCode: backupFamilyCode };
}

// =====================================================================
// --- Android File System Access (device-local "DailyTask Backup" folder) ---
// =====================================================================
// Android Chrome M132+ (stable থেকে জানুয়ারি ২০২৫) File System Access API
// সাপোর্ট করে — তাই প্রথমবার showDirectoryPicker() দিয়ে একটি বেস ফোল্ডার
// (যেমন Downloads) বেছে নিতে বলা হয়, তারপর তার ভেতরে "DailyTask Backup"
// সাবফোল্ডার স্বয়ংক্রিয়ভাবে তৈরি/পুনঃব্যবহার করে টাইমস্ট্যাম্প-সহ .json
// ফাইল লেখা হয় — পরবর্তীতে আর কোনো prompt ছাড়াই (যতক্ষণ permission বহাল
// থাকে)। API না থাকলে, ব্যবহারকারী পিকার বাতিল করলে, বা permission না
// পেলে — handleExportData নিজেই Web Share/Download fallback-এ চলে যায়।
const FSA_IDB_NAME = "daily_task_fsa";
const FSA_IDB_STORE = "handles";
const FSA_IDB_KEY = "backup_base_dir_handle";
const FSA_BACKUP_FOLDER_NAME = "DailyTask Backup";
function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
function openFsaIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FSA_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(FSA_IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveFsaDirHandle(handle) {
  const idb = await openFsaIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FSA_IDB_STORE, "readwrite");
    tx.objectStore(FSA_IDB_STORE).put(handle, FSA_IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function loadFsaDirHandle() {
  const idb = await openFsaIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FSA_IDB_STORE, "readonly");
    const req = tx.objectStore(FSA_IDB_STORE).get(FSA_IDB_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
// সংরক্ষিত ডিরেক্টরি হ্যান্ডেলটি বাতিল (IndexedDB থেকে মুছে) করে — যখন
// লেখার সময় ধরা পড়ে যে হ্যান্ডেলটি stale/অবৈধ (ফোল্ডার মুছে ফেলা হয়েছে,
// সরানো হয়েছে, ইত্যাদি) হয়ে গেছে। এর ফলে *পরবর্তী* ব্যাকআপ চেষ্টায় (একটি
// নতুন, তাজা ক্লিক থেকে, তাই নিরাপদে showDirectoryPicker() ডাকা যায়)
// getOrRequestFsaBaseDir() স্বয়ংক্রিয়ভাবে আবার ফোল্ডার বেছে নিতে বলবে।
async function clearStoredFsaDirHandle() {
  try {
    const idb = await openFsaIdb();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(FSA_IDB_STORE, "readwrite");
      tx.objectStore(FSA_IDB_STORE).delete(FSA_IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}
// একটি ডিরেক্টরি হ্যান্ডেলের readwrite পারমিশন আছে কিনা নীরবে যাচাই করে
// (queryPermission); না থাকলে requestPermission() দিয়ে চাওয়া হয়।
async function ensureFsaPermission(handle) {
  const opts = {
    mode: "readwrite"
  };
  try {
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if ((await handle.requestPermission(opts)) === "granted") return true;
  } catch {}
  return false;
}
// আগে থেকে সংরক্ষিত (IndexedDB) বেস-ফোল্ডার হ্যান্ডেল ও তার পারমিশন থাকলে
// সেটাই নীরবে ব্যবহার করে (কোনো prompt ছাড়াই)। না থাকলে showDirectoryPicker()
// দিয়ে নতুন করে বেছে নিতে বলে — এই কলটি user gesture-এর মধ্যেই থাকা
// আবশ্যক, তাই handleExportData-এর একদম শুরুতে (Firestore fetch-এর আগেই)
// এটি কল করা হয়; মাঝে শুধু একটি দ্রুত IndexedDB lookup থাকে, যা browser-এর
// transient-activation টাইমআউট (কয়েক সেকেন্ড) অতিক্রম করে না।
async function getOrRequestFsaBaseDir() {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const stored = await loadFsaDirHandle();
    if (stored && (await ensureFsaPermission(stored))) {
      return stored;
    }
  } catch {}
  try {
    const handle = await window.showDirectoryPicker({
      id: "daily-task-backup",
      startIn: "downloads"
    });
    if (!(await ensureFsaPermission(handle))) return null;
    try {
      await saveFsaDirHandle(handle);
    } catch {}
    return handle;
  } catch {
    // AbortError (ব্যবহারকারী পিকার বাতিল করেছেন) সহ যেকোনো ব্যর্থতায়
    // নীরবে null রিটার্ন — কলার তখন Web Share/Download fallback-এ যাবে।
    return null;
  }
}
// বেস ফোল্ডারের ভেতরে "DailyTask Backup" সাবফোল্ডার (না থাকলে তৈরি করে)
// খুঁজে সেখানে ফাইল লিখে দেয়।
async function writeFsaBackupFile(baseDirHandle, fileName, jsonStr) {
  const folderHandle = await baseDirHandle.getDirectoryHandle(FSA_BACKUP_FOLDER_NAME, {
    create: true
  });
  const fileHandle = await folderHandle.getFileHandle(fileName, {
    create: true
  });
  const writable = await fileHandle.createWritable();
  await writable.write(jsonStr);
  await writable.close();
  // নতুন backup সফলভাবে লেখা+close হওয়ার *পরেই* একই family-র পুরনো backup
  // ফাইলগুলো (নতুনটি বাদে) মুছে ফেলা হয় — folder-এ সবসময় latest ১টিই থাকে।
  // filePrefix (familyCode-সহ) ম্যাচ করা ফাইলগুলোই টার্গেট, অন্য family/manual
  // ফাইল অক্ষত থাকে। কোনো ফাইল delete ব্যর্থ হলে নীরবে skip — নতুন backup তো
  // থেকেই গেছে, তাই data loss নেই।
  try {
    const filePrefix = fileName.replace(/_\d{8}_\d{4}\.json$/, "_");
    for await (const [entryName, entryHandle] of folderHandle.entries()) {
      if (entryName === fileName) continue;
      if (entryHandle.kind !== "file") continue;
      if (!entryName.startsWith(filePrefix) || !entryName.endsWith(".json")) continue;
      try {
        await folderHandle.removeEntry(entryName);
      } catch {}
    }
  } catch {}
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("dt-update-available"));
          }
        });
      });
    }).catch(() => {});
  });
}

// --- PWA Install Tracking ---
// beforeinstallprompt fires when the browser is willing to show its own
// "Add to Home Screen" prompt — we don't build a custom install button here,
// just record that the prompt became available and keep a reference in case
// a future UI wants to trigger it manually.
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", e => {
  deferredInstallPrompt = e;
  logAnalyticsEvent("pwa_install_prompt_shown");
});
// appinstalled fires once the user actually completes installation
// (regardless of whether it was via the browser's own prompt or an OS-level
// "Add to Home Screen" flow) — this is the actual install-count signal.
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  logAnalyticsEvent("pwa_installed");
  db.collection("app_stats").doc("pwa_installs").set({
    count: firebase.firestore.FieldValue.increment(1),
    lastInstalledAt: Date.now()
  }, {
    merge: true
  }).catch(() => {});
});
const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} = React;
function Icon({
  children,
  size = 18,
  color = "currentColor",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: style
  }, children);
}
function Plus({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }));
}
function ChevronLeft({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  }));
}
function ChevronRight({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  }));
}
function Printer({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 6 2 18 2 18 9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "14",
    width: "12",
    height: "8"
  }));
}
function Check({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }));
}
function X({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }));
}
function User({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  }));
}
function CalIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }));
}
function DownloadIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7 10 12 15 17 10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "15",
    x2: "12",
    y2: "3"
  }));
}
function UploadIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  }));
}
function Trash({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3 6 5 6 21 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  }));
}
function LogOutIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  }));
}
function MenuIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "18",
    x2: "21",
    y2: "18"
  }));
}
function CopyIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
  }));
}
function HelpCircle({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  }));
}
function MessageSquare({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  }));
}
function UsersIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 21v-2a4 4 0 0 1 3-3.87"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "3.13",
    r: "3"
  }));
}
function ChevronDown({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }));
}
function EditIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
  }));
}
function InfoIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  }));
}
function RefreshIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "23 4 23 10 17 10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "1 20 1 14 7 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
  }));
}
function Loader2({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "2",
    x2: "12",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "4.93",
    x2: "7.76",
    y2: "7.76"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "16.24",
    x2: "19.07",
    y2: "19.07"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "12",
    x2: "6",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "12",
    x2: "22",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "19.07",
    x2: "7.76",
    y2: "16.24"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "7.76",
    x2: "19.07",
    y2: "4.93"
  }));
}
function ClockIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 7 12 12 15 15"
  }));
}
function useFonts() {
  useEffect(() => {
    const id = "dt-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ---- Theme color (per-device display preference, kept in localStorage only) ----
const THEME_PRESETS = [{
  id: "green",
  name: "সবুজ (ডিফল্ট)",
  color: "#0E4B43"
}, {
  id: "pink",
  name: "পিংক",
  color: "#E0559A"
}, {
  id: "maroon",
  name: "মেরুন",
  color: "#9F1239"
}, {
  id: "purple",
  name: "বেগুনি",
  color: "#6D28D9"
}, {
  id: "blue",
  name: "নীল",
  color: "#1D4ED8"
}, {
  id: "teal",
  name: "টিল",
  color: "#0F766E"
}];
function hexToRgba(hex, alpha) {
  const h = (hex || "#0E4B43").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  const r = bigint >> 16 & 255;
  const g = bigint >> 8 & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getThemeColor(fallback) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim();
  return v || fallback;
}
function applyThemeColor(color) {
  document.documentElement.style.setProperty("--theme-primary", color);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}
function useThemeColor() {
  const [themeColor, setThemeColorState] = useState(() => {
    try {
      return localStorage.getItem("theme_color") || THEME_PRESETS[0].color;
    } catch {
      return THEME_PRESETS[0].color;
    }
  });
  useEffect(() => {
    applyThemeColor(themeColor);
  }, [themeColor]);
  function setThemeColor(color) {
    setThemeColorState(color);
    try {
      localStorage.setItem("theme_color", color);
    } catch {}
  }
  return [themeColor, setThemeColor];
}
const DEFAULT_DEEN_FIELDS = [{
  key: "fardPrayers",
  label: "ফরজ কাযা সালাত (কয় ওয়াক্ত?)",
  shortLabel: "ফরজ কাযা",
  type: "count",
  max: 5,
  excusable: true
}, {
  key: "jamaat",
  label: "জামায়াতে সালাত (কয় ওয়াক্ত?)",
  shortLabel: "জামায়াতে সালাত",
  type: "count",
  max: 5,
  appliesTo: "male",
  excusable: true
}, {
  key: "sunnahNafl",
  label: "সুন্নত ও নফল সালাত",
  shortLabel: "সুন্নত/নফল",
  type: "bool",
  excusable: true
}, {
  key: "tahajjud",
  label: "সিয়াম (ফরজ/নফল) / তাহাজ্জুদ",
  shortLabel: "সিয়াম/তাহাজ্জুদ",
  type: "bool",
  excusable: true
}, {
  key: "morningEveningAzkar",
  label: "সকাল-সন্ধ্যার ও ঘুমানোর সময়ের আমল",
  shortLabel: "সকাল-সন্ধ্যার আমল",
  type: "bool"
}, {
  key: "dhikr",
  label: "ইস্তেগফার, যিকির, দরুদ শরীফ ও দু'আ",
  shortLabel: "যিকির/দু'আ",
  type: "bool"
}, {
  key: "quranPages",
  label: "কুরআন/তাফসীর ও আরবি শেখা (পৃষ্ঠা)",
  shortLabel: "কুরআন",
  type: "number",
  target: 5
}, {
  key: "seerah",
  label: "সীরাত/জীবনী/ইতিহাস",
  shortLabel: "সীরাত",
  type: "bool"
}, {
  key: "selfStudy",
  label: "ইলম অর্জন/কোর্সের পড়া",
  shortLabel: "ইলম অর্জন",
  type: "bool"
}, {
  key: "taleem",
  label: "তালিম/পাঠচক্র/দ্বীনি সোহবত",
  shortLabel: "তালিম",
  type: "bool"
}, {
  key: "dawah",
  label: "দ্বীনের দাওয়াত",
  shortLabel: " দাওয়াত",
  type: "bool"
}, {
  key: "sadaqah",
  label: "দান/সাদাকা/পরোপকার",
  shortLabel: "সাদাকা",
  type: "bool"
}];
const DEFAULT_DUNIYA_FIELDS = [{
  key: "earlyMorning",
  label: "ভোরের বরকতময় সময়কে কাজে লাগানো",
  shortLabel: "ভোরের সময়",
  type: "bool"
}, {
  key: "exercise",
  label: "ব্যায়াম/শরীরচর্চা",
  shortLabel: "ব্যায়াম",
  type: "bool"
}, {
  key: "healthyFood",
  label: "অপ্রক্রিয়াজাত ও স্বাস্থ্যকর খাবার",
  shortLabel: "স্বাস্থ্যকর খাবার",
  type: "bool"
}, {
  key: "familyTime",
  label: "মা-বাবা, পরিবার ও আত্মীয়দের হক আদায়",
  shortLabel: "পারিবারিক সময়",
  type: "bool"
}, {
  key: "screenLimit",
  label: "সোশ্যাল মিডিয়া/মোবাইল সীমিত ব্যবহার",
  shortLabel: "সীমিত স্ক্রিন",
  type: "bool"
}, {
  key: "noLyingBackbitingPride",
  label: "মিথ্যা, গীবত ও অহংকার থেকে বেঁচে আছি?",
  shortLabel: "মিথ্যা, গীবত মুক্ত",
  type: "bool"
}, {
  key: "noHurtingOthers",
  label: "অন্যের হক নষ্ট/মনে কষ্ট না দেয়া",
  shortLabel: "সদাচরণ",
  type: "bool"
}, {
  key: "noProcrastination",
  label: "অলসতা/কাজ ফেলে না রাখা",
  shortLabel: "অলসতা মুক্ত",
  type: "bool"
}, {
  key: "phoneOffBy11",
  label: "ঘুমানোর অন্তত ১ ঘণ্টা আগে ফোন/ইন্টারনেট বন্ধ",
  shortLabel: "ঘুমের আগে ফোন বন্ধ",
  type: "bool"
}];
function fieldApplies(field, member) {
  if (!field.appliesTo) return true;
  if (!member || !member.gender) return true;
  return field.appliesTo === member.gender;
}
function isExcused(entry, key) {
  return !!(entry && entry.excused && entry.excused[key]);
}
// Shari'ah note: men have no valid excuse to skip qaza of obligatory (fard)
// prayers — they remain obligated to make them up later. So the "ওজর"
// (excuse) option is intentionally unavailable for fardPrayers when the
// member's gender is male, even though the field is otherwise excusable
// (e.g. for jamaat, sunnah/nafl, siyam/tahajjud, and for female members'
// fardPrayers during valid excuse periods).
function isFieldExcusable(field, member) {
  if (!field.excusable) return false;
  if (field.key === "fardPrayers" && member && member.gender === "male") return false;
  return true;
}
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBn = n => String(n).replace(/[0-9]/g, d => BN_DIGITS[d]);

// Wraps any Bengali-digit run inside a label string in a distinct monospace,
// bold, emerald-colored span so numbers embedded mid-sentence (e.g. "১ ঘণ্টা")
// don't visually blend into the surrounding text at small font sizes.
function LabelText({
  text
}) {
  const parts = String(text ?? "").split(/([০-৯]+)/g);
  return parts.map((part, i) => /^[০-৯]+$/.test(part) ? /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      fontWeight: 700,
      color: "var(--theme-primary)"
    }
  }, part) : /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, part));
}
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const BN_WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
const DAILY_INSPIRATIONS = [{
  type: "ayat",
  text: "তোমরা ভয় কর সেদিনকে, যেদিন এক ব্যক্তি থেকে অন্য ব্যক্তি বিন্দুমাত্র উপকৃত হবে না, কারও কাছ থেকে বিনিময় গৃহীত হবে না, কারও সুপারিশ ফলপ্রদ হবে না এবং তারা সাহায্যপ্রাপ্তও হবে না।",
  ref: "সূরা আল-বাকারাহ: ১২৩"
}, {
  type: "ayat",
  text: "হে মুমিনগণ! তোমরা ধৈর্য ও নামাজের মাধ্যমে সাহায্য প্রার্থনা কর। নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে রয়েছেন।",
  ref: "সূরা আল-বাকারাহ: ১৫৩"
}, {
  type: "ayat",
  text: "এবং অবশ্যই আমি তোমাদেরকে পরীক্ষা করব কিছুটা ভয়, ক্ষুধা, মাল ও জানের ক্ষতি এবং ফল-ফসল বিনষ্টের মাধ্যমে। তবে সুসংবাদ দাও সবরকারীদের।",
  ref: "সূরা আল-বাকারাহ: ১৫৫"
}, {
  type: "ayat",
  text: "হে ঈমানদারগণ! তোমরা পরিপূর্ণভাবে ইসলামের অন্তর্ভুক্ত হয়ে যাও এবং শয়তানের পদাঙ্ক অনুসরণ করো না। নিশ্চিতরূপে সে তোমাদের প্রকাশ্য শত্রু।",
  ref: "সূরা আল-বাকারাহ: ২০৮"
}, {
  type: "ayat",
  text: "যাঁরা দাঁড়িয়ে, বসে ও শায়িত অবস্থায় আল্লাহকে স্মরণ করে এবং আসমান ও জমিন সৃষ্টির বিষয়ে চিন্তা-গবেষণা করে, (তারা বলে) পরওয়ারদেগার! এসব তুমি অনর্থক সৃষ্টি করোনি।",
  ref: "সূরা আল-ইমরান: ১৯১"
}, {
  type: "ayat",
  text: "আর এমন লোকদের জন্য কোনো ক্ষমা নেই, যারা মন্দ কাজ করতেই থাকে, এমনকি যখন তাদের কারো মাথার উপর মৃত্যু উপস্থিত হয়, তখন বলতে থাকে: আমি এখন তওবা করছি।",
  ref: "সূরা আন-নিসা: ১৮"
}, {
  type: "ayat",
  text: "যেগুলো সম্পর্কে তোমাদের নিষেধ করা হয়েছে যদি তোমরা সেসব বড় গুনাহগুলো থেকে বেঁচে থাকতে পার, তবে আমি তোমাদের ত্রুটি-বিচ্যুতিগুলো ক্ষমা করে দেব এবং সম্মানজনক স্থানে তোমাদের প্রবেশ করাব।",
  ref: "সূরা আন-নিসা: ৩১"
}, {
  type: "ayat",
  text: "যে লোক সৎকাজের জন্য কোনো সুপারিশ করবে, তা থেকে সেও একটি অংশ পাবে। আর যে লোক সুপারিশ করবে মন্দ কাজের জন্যে সে তার বোঝারও একটি অংশ পাবে।",
  ref: "সূরা আন-নিসা: ৮৫"
}, {
  type: "ayat",
  text: "পার্থিব জীবন ক্রীড়া ও কৌতুক ব্যতীত কিছুই নয়। পরকালের আবাস পরহেজগারদের জন্য শ্রেষ্ঠতর।",
  ref: "সূরা আল-আনআম: ৩২"
}, {
  type: "ayat",
  text: "তোমরা প্রকাশ্য ও প্রচ্ছন্ন গুনাহ পরিত্যাগ কর। নিশ্চয় যারা গুনাহ করেছে, তারা অতিসত্বর তাদের কৃতকর্মের শাস্তি পাবে।",
  ref: "সূরা আল-আনআম: ১২০"
}, {
  type: "ayat",
  text: "যে একটি সৎকর্ম করবে, সে তার দশগুণ পাবে এবং যে একটি মন্দ কাজ করবে, সে তার সমান শাস্তিই পাবে।",
  ref: "সূরা আল-আনআম: ১৬০"
}, {
  type: "ayat",
  text: "আপনি বলুন: আমার নামাজ, আমার কোরবানি এবং আমার জীবন ও মরণ বিশ্ব-প্রতিপালক আল্লাহরই জন্যে।",
  ref: "সূরা আল-আনআম: ১৬২"
}, {
  type: "ayat",
  text: "যারা ঈমানদার, তারা এমন যে, যখন আল্লাহর নাম নেওয়া হয় তখন তাদের অন্তর ভীত হয়ে পড়ে।",
  ref: "সূরা আল-আনফাল: ০২"
}, {
  type: "ayat",
  text: "অবশ্যই যেসব লোক আমার সাক্ষাৎ লাভের আশা রাখে না এবং পার্থিব জীবন নিয়েই উৎফুল্ল রয়েছে... এমন লোকদের ঠিকানা হলো আগুন।",
  ref: "সূরা ইউনুস: ০৭-০৮"
}, {
  type: "ayat",
  text: "মুমিনগণ সফলকাম হয়ে গেছে, যারা নিজেদের নামাজে বিনয়-নম্র; যারা অনর্থক কথাবার্তায় নির্লিপ্ত, যারা জাকাত দান করে থাকে।",
  ref: "সূরা আল-মুমিনুন: ১-৫"
}, {
  type: "ayat",
  text: "হে নবী! মুমিন পুরুষদের বলে দাও তারা যেন নিজেদের দৃষ্টি সংযত করে রাখে এবং নিজেদের লজ্জাস্থান সমূহের হেফাজত করে।",
  ref: "সূরা আন-নূর: ৩০"
}, {
  type: "ayat",
  text: "তোমাদের এ কী অবস্থা, প্রত্যেক উঁচু জায়গায় অনর্থক একটি ইমারত বানিয়ে ফেলেছ এবং বড় বড় প্রাসাদ নির্মাণ করছ, যেন তোমরা চিরকাল থাকবে?",
  ref: "সূরা আশ-শুআরা: ১২৮-১২৯"
}, {
  type: "ayat",
  text: "লোকেরা কি মনে করে রেখেছে, 'আমরা ঈমান এনেছি' কেবলমাত্র এ কথাটুকু বললেই তাদেরকে ছেড়ে দেয়া হবে, আর পরীক্ষা করা হবে না?",
  ref: "সূরা আল-আনকাবুত: ২-৩"
}, {
  type: "ayat",
  text: "নির্দেশ দিয়েছি যে, আমার প্রতি ও তোমার পিতা-মাতার প্রতি কৃতজ্ঞ হও। অবশেষে আমারই নিকট ফিরে আসতে হবে।",
  ref: "সূরা লোকমান: ১৪"
}, {
  type: "ayat",
  text: "বলুন, যারা জানে এবং যারা জানে না; তারা কি সমান হতে পারে? চিন্তাভাবনা কেবল তারাই করে, যারা বুদ্ধিমান।",
  ref: "সূরা আজ-জুমার: ০৯"
}, {
  type: "ayat",
  text: "মুমিনগণ, তোমরা অনেক ধারণা থেকে বেঁচে থাকো। নিশ্চয় কতক ধারণা গুনাহ এবং গোপনীয় বিষয় সন্ধান করো না।",
  ref: "সূরা আল-হুজরাত: ১২"
}, {
  type: "ayat",
  text: "মুমিনগণ! তোমরা আল্লাহ তাআলার কাছে তওবা কর; আন্তরিক তওবা।",
  ref: "সূরা আত-তাহরীম: ০৮"
}, {
  type: "hadith",
  text: "আল্লাহ যার মঙ্গল চান, তাকে দুঃখ-কষ্টে ফেলেন।",
  ref: "রিয়াদুস সালেহীন: ৪০; সহীহ বুখারী: ৫৬৪৫"
}, {
  type: "hadith",
  text: "দুটি কালেমা আছে, যেগুলো দয়াময়ের কাছে অতি প্রিয়, মুখে উচ্চারণ করা খুবই সহজ, দাঁড়িপাল্লায় অত্যন্ত ভারী: 'সুবহানাল্লাহি ওয়া বিহামদিহি সুবহানাল্লাহিল আজীম'।",
  ref: "সহীহ বুখারী: ৬৪৬"
}, {
  type: "hadith",
  text: "কুরআনের তিরিশ আয়াতবিশিষ্ট একটি সূরা এমন আছে, যা তার পাঠকারীর জন্য সুপারিশ করবে... সেটা হচ্ছে 'সূরা মুলক'।",
  ref: "আবু দাউদ: ১৪০০"
}, {
  type: "hadith",
  text: "গোটা দুনিয়াই সম্পদে পরিপূর্ণ। এর মধ্যে সবচেয়ে উত্তম সম্পদ হলো পুণ্যবতী স্ত্রী।",
  ref: "সহীহ মুসলিম; রিয়াদুস স্বা-লিহীন: ২৮৪"
}, {
  type: "hadith",
  text: "মুমিনদের মধ্যে সবার চেয়ে পূর্ণ মুমিন ঐ ব্যক্তি যে চরিত্রে সবার চেয়ে সুন্দর।",
  ref: "তিরমিযী; রিয়াদুস স্বা-লিহীন: ২৮৩"
}, {
  type: "hadith",
  text: "উত্তম স্ত্রী সে, যার প্রতি দৃষ্টিপাত করলে তোমাকে আনন্দিত করে, আদেশ করলে আনুগত্য করে, তুমি দূরে থাকলে তার নিজের ব্যাপারে এবং তোমার সম্পদের ব্যাপারে তোমার অধিকার রক্ষা করে।",
  ref: "তাফসীরে তবারী: ৯৩২৯; মুসনাদে ত্বয়ালিসী: ২৩২৫"
}, {
  type: "hadith",
  text: "যখনই কোনো পুরুষ কোনো মহিলার সাথে নির্জনতা অবলম্বন করে, তখনই শয়তান তাদের তৃতীয় সাথী হয়।",
  ref: "তিরমিযী: ৯৩৪"
}, {
  type: "hadith",
  text: "আমার গত হওয়ার পরে পুরুষের পক্ষে নারীর চেয়ে অধিক ক্ষতিকর কোনো ফিতনা অন্য কিছু ছেড়ে যাচ্ছি না।",
  ref: "সহীহ বুখারী: ৫০৯৬"
}, {
  type: "hadith",
  text: "নারীদের জন্য ঘরই উত্তম।",
  ref: "আবু দাউদ: ৫৭৬"
}, {
  type: "hadith",
  text: "হে নারীরা! তোমরা দান-সদকা কর। কারণ আমি অধিকাংশ জাহান্নামি দেখেছি তোমাদের নারীদেরকে... কারণ তোমরা স্বামীর প্রতি অকৃতজ্ঞতা প্রকাশ কর।",
  ref: "সহীহ বুখারী: ১/৪৪"
}, {
  type: "hadith",
  text: "নারী যখন পাঁচ ওয়াক্ত নামাজ আদায় করবে, রমজান মাসের রোজা রাখবে, নিজ লজ্জাস্থানের হেফাজত করবে এবং স্বামীর আনুগত্য করবে তখন তাকে বলা হবে, যে দরজা দিয়ে ইচ্ছা জান্নাতে প্রবেশ কর।",
  ref: "মুসনাদে আহমাদ: ১৬৬১"
}, {
  type: "hadith",
  text: "কেবলমাত্র দুটি বিষয়ে ঈর্ষা করা যায়: ১) ঐ ব্যক্তি যাকে আল্লাহ কুরআন শিক্ষা দিয়েছেন এবং সে দিবারাত্রি তা তিলাওয়াত ও আমল করে এবং ২) ঐ ব্যক্তি যাকে আল্লাহ সম্পদ দিয়েছেন এবং সে দিবারাত্রি তা দান করে।",
  ref: "সহীহ বুখারী: ৫০২৫; সহীহ মুসলিম: ৮১৫"
}, {
  type: "hadith",
  text: "দোজখীরা হলো: প্রত্যেক অহঙ্কারী, সীমালঙ্ঘনকারী, অবিনয়ী ও উদ্ধত লোক।",
  ref: "সহীহ বুখারী; সহীহ মুসলিম"
}, {
  type: "hadith",
  text: "চরম সর্বনাশ ঐ ব্যক্তির জন্য যে মানুষকে হাসানোর উদ্দেশ্যে মিথ্যা কথা বলে থাকে।",
  ref: "তিরমিযী: ২৩১৫"
}, {
  type: "hadith",
  text: "যে ব্যক্তি গণকের নিকট এসে কোনো বিষয়ে প্রশ্ন করে, তার চল্লিশ দিনের নামাজ কবুল করা হয় না।",
  ref: "সহীহ মুসলিম: ২২৩০"
}, {
  type: "hadith",
  text: "মানুষ দুনিয়াতে যে চরিত্রের মানুষকে ভালোবাসে, কিয়ামতে সে তারই সাথী হবে।",
  ref: "রিয়াদুস স্বা-লিহীন: ৩৭২"
}, {
  type: "hadith",
  text: "প্রকৃত বীর সে নয়, যে কাউকে কুস্তিতে হারিয়ে দেয়। বরং সেই আসল বীর, যে রাগের সময় নিজেকে নিয়ন্ত্রণ করতে পারে।",
  ref: "সহীহ বুখারী: ৬১১৪"
}, {
  type: "hadith",
  text: "যে ব্যক্তি চায় যে তার রিজিক প্রশস্ত হোক এবং আয়ু বৃদ্ধি হোক, সে যেন তার আত্মীয়তার সম্পর্ক অক্ষুণ্ণ রাখে।",
  ref: "সহীহ বুখারী: ২০৬৭"
}, {
  type: "quote",
  text: "হয়ত একটি ক্ষুদ্র কাজ অনেক বিশাল হয়ে যায় কাজটির পেছনে করা নিয়তের কারণে এবং হয়ত অনেক বড় একটা কাজ একদমই তুচ্ছ হয়ে যায় কাজটির পেছনে করা নিয়তের কারণে।",
  ref: "আবদুল্লাহ ইবনে মুবারাক (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "আল্লাহর ওপর নির্ভর করে আপনি যা-ই করবেন তা কখনই কঠিন হবে না, এবং আপনার নিজের ওপর নির্ভর করে আপনি যা-ই করবেন তা কখনই সহজ হবে না।",
  ref: "ইবনে আতাউল্লাহ আল-ইসকান্দারি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "একটি নোংরা পোশাকের জন্য সুগন্ধির চাইতে সাবানের প্রয়োজনীয়তা অনেক বেশি (তসবিহ পাঠের চেয়ে ইস্তিগফারের গুরুত্ব বোঝাতে)।",
  ref: "ইমাম ইবনে আল-জাওজি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "মুনাফিকের জ্ঞান তার কথাবার্তার মাঝে, মুমিনের জ্ঞান তার কাজের মাঝে।",
  ref: "আবদুল্লাহ ইবনে আল-মুতাজ"
}, {
  type: "quote",
  text: "নিজেকে যতই গভীর করে লক্ষ্য করবেন এবং বুঝতে পারবেন, ততই আপনি অন্যদের প্রতি কম বিচারপ্রবণ হবেন।",
  ref: "তারিক রামাদান"
}, {
  type: "quote",
  text: "নিজেকে জোর করে বিনয়ী করুন যতক্ষণ না পর্যন্ত তা আপনার সহজাত স্বভাব হিসেবে প্রতিষ্ঠিত হয়।",
  ref: "শাইখ হামজা ইউসুফ"
}, {
  type: "quote",
  text: "আধ্যাত্মিকতা অর্জনের ব্যাপারটাই হলো নিজের নফসের সাথে ক্রমাগত জিহাদ করা।",
  ref: "তারিক রামাদান"
}, {
  type: "quote",
  text: "আপনি যখন কাউকে সাহায্য করার সুযোগ পেয়ে থাকেন, তখন আনন্দিত হোন এইজন্য যে আল্লাহ ওই ব্যক্তির দু'আর সাড়া আপনার মাধ্যমেই দিচ্ছেন।",
  ref: "নুমান আলী খান"
}, {
  type: "quote",
  text: "একাকী হয়ে যাওয়ার অর্থ হলো তুমি খারাপ সঙ্গ পরিত্যাগ করেছ। কিন্তু একজন ভালো বন্ধু থাকা একাকীত্বের চাইতে উত্তম।",
  ref: "উমর ইবনুল খাত্তাব (রাদিয়াল্লাহু আনহু)"
}, {
  type: "quote",
  text: "নারীদের সীমাবদ্ধতাগুলোর ব্যাপারে ধৈর্য ধারণ করুন। দাম্পত্য জীবনকে ক্ষতিগ্রস্ত করে এমন ভুলগুলো ছাড়া অন্যগুলোকে উপেক্ষা করুন।",
  ref: "শাইখ সালিহ আল-ফাওজান"
}, {
  type: "quote",
  text: "নিজের দোষ-ত্রুটি যে অন্যদের চেয়ে ভালো জানে; তার জন্য রয়েছে সুসংবাদ।",
  ref: "ইবনে হাজম (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "যে কথা ভেবে আমার অন্তর প্রশান্ত হয় তা হলো আমার জন্য যা নির্ধারিত আছে তা কখনো আমাকে ছেড়ে যাবে না এবং যা কিছু আমার পাওয়া হয় না তা কখনো আমার জন্য নির্ধারিত ছিল না।",
  ref: "ইমাম শাফিঈ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "তাহাজ্জুদের সময়ে করা দু'আ হলো এমন একটি তীরের মতন যা লক্ষ্যভ্রষ্ট হয় না।",
  ref: "ইমাম শাফিঈ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "একজন বান্দার জন্য সবচেয়ে জঘন্য পাপগুলোর একটি হলো তার নিজের পাপকাজগুলোকে ছোট করে দেখা।",
  ref: "মুহাম্মাদ বিন আবু বকর আস-সিদ্দিক (রাদিয়াল্লাহু আনহু)"
}, {
  type: "quote",
  text: "ভরপেট খাওয়ার ব্যাপারে সতর্ক হোন কেননা এটা অন্তরকে কঠিন করে দেয়। মাত্রাতিরিক্ত হাসাহাসিতে অন্তর মরে যায়।",
  ref: "ইমাম সুফিয়ান আস-সাওরি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "আপনি যদি একটি জাতিকে কোনো রকম যুদ্ধ ছাড়াই ধ্বংস করে দিতে চান, তাহলে তাদের তরুণ প্রজন্মের মাঝে অশ্লীলতা আর ব্যভিচারের প্রচলনের ব্যবস্থা করে দিন।",
  ref: "সুলতান সালাহ আদ-দ্বীন ইউসুফ আইয়ুবী (রহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "সে কী পেল যে আল্লাহকে হারালো? সে কী হারালো যে আল্লাহকে পেল?",
  ref: "ইবনে আতাউল্লাহ আল-ইসকান্দারি (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "ইমাম আহমাদকে তাঁর ছেলে প্রশ্ন করলেন, 'বাবা, আমরা কবে শান্তি পাবো?' তিনি উত্তর দিলেন, 'জান্নাতে আমাদের প্রথম পদচিহ্নটি রাখার মুহূর্তটি থেকেই'।",
  ref: "ইমাম আহমাদ (রাহিমাহুল্লাহ)"
}, {
  type: "quote",
  text: "অনেক মানুষ দেখেছি যাদের জড়িয়ে রাখার মতন কোনো কাপড় ছিল না, অনেক কাপড় দেখেছি যা তাদের জড়িয়ে রেখেছিল কিন্তু তারা মানুষ ছিল না।",
  ref: "জালালুদ্দিন রুমী (রাহিমাহুল্লাহ)"
}];
const AYAT_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "ayat");
const HADITH_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "hadith");
const QUOTE_LIST = DAILY_INSPIRATIONS.filter(i => i.type === "quote");
const INSPIRATION_TYPE_CYCLE = [AYAT_LIST, HADITH_LIST, QUOTE_LIST];
function getDailyInspiration(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / 86400000);
  const typeList = INSPIRATION_TYPE_CYCLE[dayOfYear % 3];
  const idx = Math.floor(dayOfYear / 3) % typeList.length;
  return typeList[idx];
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatBnDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBn(d.getFullYear())}, ${toBn(hours)}:${toBn(minutes)} ${ampm}`;
}
function isFutureDate(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(d);
  compare.setHours(0, 0, 0, 0);
  return compare.getTime() > today.getTime();
}
function monthPrefix(year, month0) {
  return `${year}-${pad2(month0 + 1)}`;
}
function daysInMonth(year, month0) {
  return new Date(year, month0 + 1, 0).getDate();
}
function isLastDayOfMonth(d) {
  return d.getDate() === daysInMonth(d.getFullYear(), d.getMonth());
}

// Approximate Hijri (tabular Islamic calendar) conversion — accurate within ~1 day
// of moon-sighting-based calendars used locally; for general reference only.
const HIJRI_MONTHS_BN = ["মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলক্বদ", "জিলহজ্জ"];
function gregorianToJD(year, month, day) {
  return Math.floor(1461 * (year + 4800 + Math.floor((month - 14) / 12)) / 4) + Math.floor(367 * (month - 2 - 12 * Math.floor((month - 14) / 12)) / 12) - Math.floor(3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100) / 4) + day - 32075;
}
function islamicToJD(year, month, day) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948440 - 1;
}
function getHijriDate(date) {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const adjustedJd = Math.floor(jd) + 0.5;
  const year = Math.floor((30 * (adjustedJd - 1948440) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((adjustedJd - (29 + islamicToJD(year, 1, 1))) / 29.5) + 1);
  const day = Math.floor(adjustedJd - islamicToJD(year, month, 1) + 1);
  return {
    day,
    month: HIJRI_MONTHS_BN[month - 1],
    year
  };
}
function dailyScore(entry, member, allFields) {
  if (!entry) return null;
  let sum = 0;
  let count = 0;
  for (const f of allFields) {
    if (!fieldApplies(f, member)) continue;
    if (isFieldExcusable(f, member) && isExcused(entry, f.key)) continue;
    count += 1;
    if (f.type === "bool") {
      sum += entry[f.key] ? 1 : 0;
    } else if (f.type === "count") {
      const capped = Math.min(f.max, Number(entry[f.key]) || 0);
      // fardPrayers-এর কাউন্ট আসলে "কাযা" (মিসড) ওয়াক্তের সংখ্যা — তাই
      // বেশি সংখ্যা মানে কম ওয়াক্ত সময়মতো পড়া হয়েছে, অর্থাৎ স্কোর কম
      // হওয়া উচিত (ইনভার্টেড)। বাকি "count" টাইপ ফিল্ড (যেমন জামায়াতে
      // সালাত) স্বাভাবিক — বেশি সংখ্যা মানে বেশি স্কোর।
      sum += f.key === "fardPrayers" ? (f.max - capped) / f.max : capped / f.max;
    } else if (f.type === "number") {
      if (f.target) {
        sum += Math.min(f.target, Number(entry[f.key]) || 0) / f.target;
      } else {
        sum += Number(entry[f.key]) > 0 ? 1 : 0;
      }
    }
  }
  return count ? sum / count : null;
}
function scoreColor(score) {
  if (score === null || score === undefined) return "#E7EEE3";
  if (score >= 0.85) return "var(--theme-primary)";
  if (score >= 0.6) return "#4C8C74";
  if (score >= 0.35) return "#C89B3C";
  if (score > 0) return "#C1666B";
  return "#E7EEE3";
}
function fieldPercent(field, monthEntries, totalDays, member) {
  if (!fieldApplies(field, member)) return null;
  const excusableHere = isFieldExcusable(field, member);
  let effectiveDays = totalDays;
  if (excusableHere) {
    let excusedDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (isExcused(monthEntries[pad2(d)], field.key)) excusedDays += 1;
    }
    effectiveDays = totalDays - excusedDays;
  }
  if (effectiveDays <= 0) return null;
  let hit = 0;
  if (field.type === "count") {
    let sum = 0;
    for (let d = 1; d <= totalDays; d++) {
      const e = monthEntries[pad2(d)];
      if (excusableHere && isExcused(e, field.key)) continue;
      // BUG FIX: fardPrayers-এর জন্য ইনভার্টেড স্কোরিং হওয়ায় আগে একটি খালি
      // (কোনো এন্ট্রি নেই এমন) দিনকে "০টি কাযা" ধরে নেওয়া হতো, যা ইনভার্শনের
      // পর "সর্বোচ্চ স্কোর" (৫/৫, অর্থাৎ পুরোপুরি সময়মতো পড়া) হিসেবে গণনা
      // হয়ে যাচ্ছিল — অথচ ওই দিনের কোনো তথ্যই সেভ করা হয়নি। ফাংশনের বাকি
      // সব ফিল্ডে "খালি দিন = ০ ক্রেডিট" নিয়ম মানা হয় (bool/number শাখায়
      // `if (!e) continue;` দিয়ে); শুধু fardPrayers-এই এই নিয়ম উল্টে গিয়ে
      // "খালি দিন = পূর্ণ ক্রেডিট" হয়ে যাচ্ছিল, যা মাসিক ওভারভিউ ও প্রিন্ট
      // PDF-এর "ফরজ কাযা"-র শতাংশকে কৃত্রিমভাবে বাড়িয়ে দেখাচ্ছিল, বিশেষত
      // যেসব মাসে অনেক দিন পূরণ করা হয়নি। এখন খালি দিনকে বাকি সব ফিল্ডের
      // মতোই "০ ক্রেডিট" হিসেবে গণনা করা হচ্ছে।
      if (field.key === "fardPrayers") {
        const hasValue = e && e[field.key] !== undefined && e[field.key] !== "";
        if (hasValue) {
          const capped = Math.min(field.max, Number(e[field.key]) || 0);
          sum += field.max - capped;
        }
        // খালি দিন হলে কিছুই যোগ হবে না (০ ক্রেডিট) — বাকি ফিল্ডগুলোর
        // আচরণের সাথে সামঞ্জস্যপূর্ণ।
      } else {
        const capped = Math.min(field.max, Number(e?.[field.key]) || 0);
        sum += capped;
      }
    }
    return Math.round(sum / (effectiveDays * field.max) * 100);
  }
  if (field.type === "number" && field.target) {
    // BUG FIX: এই শাখায় আগে excused দিনগুলো বাদ দেওয়া হতো না (উপরের
    // excusedDays গণনা করা সত্ত্বেও ব্যবহৃত হতো না) এবং ভাজক হিসেবে সবসময়
    // totalDays ব্যবহৃত হতো, effectiveDays নয় — যদিও ফাংশনের বাকি সব শাখা
    // effectiveDays ব্যবহার করে। বর্তমান ডিফল্ট ফিল্ডগুলোর মধ্যে "quranPages"
    // (একমাত্র number+target ফিল্ড) excusable নয় বলে এতদিন এটি কোনো
    // দৃশ্যমান পার্থক্য তৈরি করেনি (effectiveDays == totalDays সবসময়), কিন্তু
    // ভবিষ্যতে কোনো excusable number+target ফিল্ড যোগ হলে এই অসামঞ্জস্য
    // ভুল শতাংশ দেখাত। এখন বাকি শাখাগুলোর সাথে সামঞ্জস্যপূর্ণ করা হলো।
    let sum = 0;
    for (let d = 1; d <= totalDays; d++) {
      const e = monthEntries[pad2(d)];
      if (excusableHere && isExcused(e, field.key)) continue;
      sum += Math.min(field.target, Number(e?.[field.key]) || 0);
    }
    return Math.round(sum / (effectiveDays * field.target) * 100);
  }
  for (let d = 1; d <= totalDays; d++) {
    const e = monthEntries[pad2(d)];
    if (excusableHere && isExcused(e, field.key)) continue;
    if (!e) continue;
    if (field.type === "bool" && e[field.key]) hit += 1;
    if (field.type === "number" && !field.target && Number(e[field.key]) > 0) hit += 1;
  }
  return Math.round(hit / effectiveDays * 100);
}
function calculateStreak(monthEntries, member, allFields, cursorYear, cursorMonth0) {
  let streak = 0;
  const today = new Date();
  const d = new Date(today);
  for (let i = 0; i < 365; i++) {
    // monthEntries only holds data for the currently-loaded month (keyed by
    // day-of-month, e.g. "05"). Once we step outside that month we no longer
    // have real data for that day, so stop rather than wrongly reusing a
    // same-numbered day from a different month.
    if (d.getFullYear() !== cursorYear || d.getMonth() !== cursorMonth0) break;
    const dayStr = pad2(d.getDate());
    const entry = monthEntries[dayStr];
    if (entry && dailyScore(entry, member, allFields) >= 0.5) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Computes week rows (1..N) for the currently open month so week 5 only
// shows up when the month actually has 29-31 days. Keeps the "সপ্তাহ" label
// in sync with the same 7-day buckets the progress graph uses (১-৭, ৮-১৪, ...).
function getWeekRanges(totalDays) {
  const numWeeks = Math.ceil(totalDays / 7);
  const ranges = [];
  for (let w = 1; w <= numWeeks; w++) {
    const start = (w - 1) * 7 + 1;
    const end = Math.min(start + 6, totalDays);
    ranges.push({
      week: w,
      start,
      end
    });
  }
  return ranges;
}
function weeklyKey(memberId, year, month0) {
  return `weekly:${memberId}:${monthPrefix(year, month0)}`;
}
function meetingKey(year, month0) {
  return `meeting_rows_v2:${monthPrefix(year, month0)}`;
}
async function saveMeetingData(year, month0, data) {
  await appStorage.set(meetingKey(year, month0), JSON.stringify(data), true);
  // Data Lifecycle Policy: family-level activity stamp. Meeting doc lives in
  // getCollectionName() (v2 schema migration deferred — see roadmap), so this
  // is a separate write, not part of that batch.
  db.collection("families").doc(getFamilyId()).set({
    lastActiveAt: firebase.firestore.Timestamp.now()
  }, { merge: true }).catch(() => {});
}
async function loadWeekly(migrationState, memberId, year, month0) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const doc = await ctx.weeklyRef.doc(ctx.weeklyDocId(memberId, monthPrefix(year, month0))).get();
    if (!doc.exists) return {};
    return JSON.parse(doc.data().value);
  } catch {
    return {};
  }
}
async function saveWeekly(migrationState, memberId, year, month0, data, ownerUid) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const batch = db.batch();
  batch.set(ctx.weeklyRef.doc(ctx.weeklyDocId(memberId, monthPrefix(year, month0))), {
    value: JSON.stringify(data),
    updatedAt: Date.now(),
    ownerUid: ownerUid ?? null
  }, {
    merge: true
  });
  stampLastActive(batch, ctx.membersRef.doc(ctx.memberDocId(memberId)), getFamilyId());
  await batch.commit();
}
// --- Legacy (v1) member storage — single "members" doc holding a JSON array.
// Kept ONLY as a one-time migration source; do not write to it anymore.
async function loadLegacyMembers() {
  try {
    const res = await appStorage.get("members", true);
    return res ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}

// =====================================================================
// --- Switch prep: Path Resolver (Step 1 — শুধু DEFINE করা হলো, এখনো
// কোনো caller/ফাংশন এটি ব্যবহার করছে না। migrationState অনুযায়ী legacy
// বনাম v2 collection ও doc-id convention নির্ধারণ করবে — future Step-এ
// ধাপে ধাপে saveEntry/loadMembersV2/monthEntries listener ইত্যাদিকে এই
// resolver-aware করা হবে। "locked" state ইচ্ছাকৃতভাবে legacy resolver
// পায় (read তখনো legacy-ই authoritative; write আটকানো Rules+UI গার্ড
// দিয়ে হবে, resolver-এর দায়িত্ব না)। ---
// =====================================================================
function resolvePathContext(migrationState, familyCode, familyId) {
  if (migrationState === "v2") {
    const familyRoot = db.collection("families").doc(familyId);
    return {
      mode: "v2",
      membersRef: familyRoot.collection("members"),
      entriesRef: familyRoot.collection("entries"),
      weeklyRef: familyRoot.collection("weekly"),
      memberDocId: (id) => id,
      entryDocId: (memberId, dateKey) => `${memberId}_${dateKey}`,
      weeklyDocId: (memberId, monthPref) => `${memberId}_${monthPref}`
    };
  }
  // legacy ("legacy" বা "locked" বা fallback)
  // §৫ fix: আগে এখানে সরাসরি `data_${familyCode}` (লাইভ familyCode থেকে)
  // ব্যবহার হতো — familyCode বদলালে saveEntry/loadEntry/saveMemberDoc
  // ইত্যাদি সব ভুল কালেকশনে চলে যেত। এখন getCollectionName()
  // (dataCollectionName-ব্যাকড, familyCode-independent) ব্যবহার হচ্ছে —
  // familyCode যতবারই বদলাক, আসল ডাটা কালেকশন একই থাকে। বিদ্যমান সব
  // caller familyCode param পাঠাতে থাকবে (API অপরিবর্তিত, harmless —
  // legacy branch-এ শুধু আর ব্যবহৃত হচ্ছে না)।
  const legacyRef = db.collection(getCollectionName());
  return {
    mode: "legacy",
    membersRef: legacyRef,
    entriesRef: legacyRef,
    weeklyRef: legacyRef,
    memberDocId: (id) => `member:${id}`,
    entryDocId: (memberId, dateKey) => `entry:${memberId}:${dateKey}`,
    weeklyDocId: (memberId, monthPref) => `weekly:${memberId}:${monthPref}`
  };
}

// --- Data Lifecycle Policy: activity stamp (owner-approved, ১৪ আগস্ট ২০২৬) ---
// lastActiveAt শুধুমাত্র inactivity/TTL cleanup-এর জন্য — ইচ্ছাকৃতভাবে নেটিভ
// Firestore Timestamp (app-এর বাকি সব timestamp ফিল্ডের মতো Date.now()
// epoch-number না), কারণ Firestore-এর TTL Policy শুধু native Timestamp
// ফিল্ডে কাজ করে। এটা existing `updatedAt` (conflict-resolution/backup-merge
// semantics)-কে স্পর্শ করে না — সম্পূর্ণ আলাদা, dedicated ফিল্ড।
// memberRef/familyId যেকোনো একটি null দিলে সেই অংশ স্কিপ হয়।
function stampLastActive(batch, memberRef, familyId) {
  const ts = firebase.firestore.Timestamp.now();
  if (memberRef) batch.set(memberRef, { lastActiveAt: ts }, { merge: true });
  if (familyId) batch.set(db.collection("families").doc(familyId), { lastActiveAt: ts }, { merge: true });
}
// --- Device-Claim member storage (v2) — one real Firestore document per
// member (doc id: "member:<id>") with plain top-level fields, so Firestore
// security rules can read `ownerUid` directly (rules cannot see inside a
// JSON-stringified "value" field, which is why v1's single array-doc
// couldn't support per-member ownership).
function memberDocId(id) {
  return `member:${id}`;
}
// Switch prep fix: আগে এই ফাংশন সবসময় hardcoded db.collection(getCollectionName())
// (legacy data_<code>) থেকে "member:" prefix দিয়ে member: docs পড়ত —
// migrationState-নির্বিশেষে, resolvePathContext() ব্যবহার করত না। Flip
// (migrationState "v2") হওয়ার পর saveMemberDoc/claimMemberDoc/deleteMemberDoc
// resolver-aware হওয়ায় নতুন সদস্য families/{id}/members/<id> (plain id, কোনো
// "member:" prefix ছাড়া)-তে লেখা হতে থাকে — কিন্তু এই ফাংশন তখনো পুরনো legacy
// path-েই খুঁজত, ফলে Flip-পরবর্তী কোনো নতুন সদস্য কখনো member-list-এ (UI-তে)
// দেখা যেত না (silent mismatch, কোনো error ছাড়াই)। এখন migrationState param
// নিয়ে resolvePathContext() ব্যবহার করা হচ্ছে — v2 হলে families/{id}/members
// collection-এর সব doc সরাসরি পড়া হয় (id ইতিমধ্যে plain, কোনো slice দরকার
// নেই); legacy/locked/undefined হলে আগের মতোই data_<code>-তে "member:" prefix
// দিয়ে range-query হয় — বিদ্যমান আচরণ বিট-ফর-বিট অপরিবর্তিত থাকে।
async function loadMembersV2(migrationState) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    if (ctx.mode === "v2") {
      const snap = await ctx.membersRef.get();
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }
    const snap = await ctx.membersRef.where(firebase.firestore.FieldPath.documentId(), ">=", "member:").where(firebase.firestore.FieldPath.documentId(), "<", "member:\uf8ff").get();
    return snap.docs.map(d => ({
      id: d.id.slice("member:".length),
      ...d.data()
    }));
  } catch (err) {
    // Access Approval Gate — Step 4: permission-denied আলাদাভাবে চিনতে
    // হবে যাতে caller "সদস্য নেই" আর "access নেই" গুলিয়ে না ফেলে।
    // অন্য সব error (network ইত্যাদি) আগের মতোই [] fallback।
    if (err && err.code === "permission-denied") {
      const tagged = new Error("access-denied");
      tagged.accessDenied = true;
      throw tagged;
    }
    return [];
  }
}
// entry:/weekly: ডকুমেন্টের মতোই member: ডকুমেন্টেও প্রতিটি লেখায় updatedAt
// (Date.now()) স্ট্যাম্প করা হয় — এটাই Drive Restore-এর mergeBackupData()-কে
// entry/weekly-এর মতো updatedAt-ভিত্তিক conflict resolution করতে দেয়।
// পুরনো (এই পরিবর্তনের আগে তৈরি) সদস্য ডকুমেন্টে updatedAt না-ও থাকতে
// পারে — mergeBackupData() সেটাকে 0 ধরে নিরাপদ fallback আচরণ করে।
async function saveMemberDoc(migrationState, member) {
  const {
    id,
    ...fields
  } = member;
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const memberRef = ctx.membersRef.doc(ctx.memberDocId(id));
  const batch = db.batch();
  batch.set(memberRef, {
    ...fields,
    updatedAt: Date.now(),
    lastActiveAt: firebase.firestore.Timestamp.now()
  }, {
    merge: true
  });
  stampLastActive(batch, null, getFamilyId());
  await batch.commit();
}
async function deleteMemberDoc(migrationState, id) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  await ctx.membersRef.doc(ctx.memberDocId(id)).delete();
}
// H-2 fix: previously a plain update() with no read-check, so two devices
// claiming the same unclaimed member at nearly the same time could race —
// whichever write landed last would silently win, with no indication to
// the earlier device that its claim had been overwritten. Wrapping this in
// a transaction makes the check-then-write atomic: we read the member's
// CURRENT ownerUid inside the transaction and only proceed if it's still
// unowned (or already owned by this same uid); otherwise we throw so the
// caller's existing catch/alert can inform the user, instead of silently
// overwriting another device's claim.
async function claimMemberDoc(migrationState, id, uid) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const docRef = ctx.membersRef.doc(ctx.memberDocId(id));
  await db.runTransaction(async tx => {
    const snap = await tx.get(docRef);
    const currentOwner = snap.exists ? snap.data().ownerUid ?? null : null;
    if (currentOwner && currentOwner !== uid) {
      throw new Error("এই সদস্যের দায়িত্ব ইতিমধ্যে অন্য একটি ডিভাইস নিয়ে নিয়েছে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।");
    }
    tx.update(docRef, {
      ownerUid: uid,
      updatedAt: Date.now()
    });
  });
}
async function releaseMemberDoc(migrationState, id) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  await ctx.membersRef.doc(ctx.memberDocId(id)).update({
    ownerUid: null,
    updatedAt: Date.now()
  });
}
// One-time migration: if no v2 (member:*) docs exist yet but a legacy v1
// array-doc has members, copy each into its own v2 doc as "unclaimed"
// (ownerUid: null) — any device may claim them later from the member list.
// The legacy doc is left untouched (not deleted) as a safety net.
async function migrateMembersIfNeeded(migrationState) {
  const v2 = await loadMembersV2(migrationState);
  if (v2.length) return v2;
  const legacy = await loadLegacyMembers();
  if (!legacy.length) return [];
  const migrated = legacy.map(m => ({
    ...m,
    ownerUid: m.ownerUid ?? null,
    createdAt: m.createdAt || Date.now()
  }));
  try {
    // Switch prep fix: আগে এখানে hardcoded "legacy" পাস করা হতো —
    // migrationState param যোগ হওয়ার পর এখন caller-এর প্রকৃত (server-verified)
    // migrationState পাস করা হচ্ছে, যাতে কোনো family ইতিমধ্যে v2-তে থাকা
    // অবস্থায় (edge case: v1 legacy array-doc আছে কিন্তু কোনো v2 member: doc
    // এখনো নেই) এই one-time migration ভুল (legacy) path-এ লিখে না ফেলে।
    await Promise.all(migrated.map(m => saveMemberDoc(migrationState, m)));
  } catch {}
  return migrated;
}
async function loadCustomFields() {
  try {
    const res = await appStorage.get("custom_fields", true);
    return res ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}
async function saveCustomFields(fields) {
  await appStorage.set("custom_fields", JSON.stringify(fields), true);
}
// Step 2 (Switch prep): migrationState-এর প্রথম parameter হিসেবে নেওয়া
// হয় resolvePathContext()-কে ফিড করতে। migrationState "legacy" হলে
// (বর্তমানে সবসময়ই তাই, যেহেতু Rules-এ এই field এখনো deploy হয়নি)
// আউটপুট আগের হার্ডকোডেড আচরণের সাথে বিট-ফর-বিট অভিন্ন — resolver শুধু
// db.collection(getCollectionName()) + entry:<memberId>:<key> ফেরত দেয়,
// ঠিক যেমন আগে ছিল। familyCode/familyId প্রতিটি কলে fresh নেওয়া হয়
// (কোনো cache/stale variable ব্যবহার হয় না)।
async function loadEntry(migrationState, memberId, key) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const doc = await ctx.entriesRef.doc(ctx.entryDocId(memberId, key)).get();
    if (!doc.exists) return null;
    return JSON.parse(doc.data().value);
  } catch {
    return null;
  }
}
async function saveEntry(migrationState, memberId, key, data, ownerUid) {
  // ownerUid is stamped from the member's CURRENT ownerUid at save time (not
  // the writer's own uid) so the entry stays consistent with claim state and
  // future Firestore rules can check request.auth.uid == resource.data.ownerUid
  // directly on this same document (no extra get() lookup needed).
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const batch = db.batch();
  batch.set(ctx.entriesRef.doc(ctx.entryDocId(memberId, key)), {
    value: JSON.stringify(data),
    updatedAt: Date.now(),
    ownerUid: ownerUid ?? null
  }, {
    merge: true
  });
  stampLastActive(batch, ctx.membersRef.doc(ctx.memberDocId(memberId)), getFamilyId());
  await batch.commit();
}
function entryDocId(memberId, key) {
  return `entry:${memberId}:${key}`;
}
// Edit History / Data Integrity: before overwriting a day's entry with a new
// edit, the previous saved version is archived into a "history" subcollection
// under that day's document. Only the last 5 versions are kept per day —
// older ones are pruned right after each push so the subcollection never
// grows unbounded.
async function pushEntryHistory(migrationState, memberId, key, oldData) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const histRef = ctx.entriesRef.doc(ctx.entryDocId(memberId, key)).collection("history");
    await histRef.add({
      value: JSON.stringify(oldData),
      editedAt: Date.now()
    });
    const snap = await histRef.orderBy("editedAt", "desc").get();
    if (snap.size > 5) {
      const excess = snap.docs.slice(5);
      const batch = db.batch();
      excess.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // History is a best-effort convenience layer — a failure here should
    // never block the actual save of the day's entry.
  }
}
async function fetchEntryHistory(migrationState, memberId, key) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const histRef = ctx.entriesRef.doc(ctx.entryDocId(memberId, key)).collection("history");
    const snap = await histRef.orderBy("editedAt", "desc").limit(5).get();
    return snap.docs.map(d => ({
      id: d.id,
      editedAt: d.data().editedAt,
      value: d.data().value
    }));
  } catch {
    return [];
  }
}
// Note: month entries are no longer fetched with a one-off list+get batch
// (loadMonthEntries) — the live onSnapshot subscription in App's
// monthEntries effect replaced it, so that unused function was removed.
function StarMark({
  size = 18,
  color = "#C89B3C"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 1L14.6 8.2L22 8.5L16.2 13.3L18.2 21L12 16.8L5.8 21L7.8 13.3L2 8.5L9.4 8.2L12 1Z",
    fill: color
  }));
}
function BoolToggle({
  value,
  onChange,
  disabled
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(!value),
    className: "flex items-center justify-center w-11 h-11 rounded-xl border-2 transition-all shrink-0 shadow-sm",
    style: {
      borderColor: value ? "var(--theme-primary)" : "#D8DED3",
      background: value ? "var(--theme-primary)" : "#FFFFFF"
    }
  }, value ? /*#__PURE__*/React.createElement(Check, {
    size: 20,
    color: "#F4F7F1"
  }) : /*#__PURE__*/React.createElement(X, {
    size: 16,
    color: "#B9C2B2"
  }));
}
function CountStepper({
  value,
  onChange,
  max,
  disabled
}) {
  const v = Number(value) || 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(Math.max(0, v - 1)),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "−"), /*#__PURE__*/React.createElement("span", {
    className: "w-8 text-center font-bold text-sm",
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "#16302B"
    }
  }, toBn(v)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => onChange(Math.min(max, v + 1)),
    className: "w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-lg font-bold shadow-sm",
    style: {
      borderColor: "#D8DED3",
      color: "#16302B"
    }
  }, "+"));
}
function NumberField({
  value,
  onChange,
  disabled,
  target
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    inputMode: "decimal",
    disabled: disabled,
    value: value ?? "",
    onChange: e => onChange(e.target.value),
    placeholder: "০",
    className: "w-16 h-9 rounded-xl border px-2 text-right outline-none font-bold text-sm bg-slate-50 focus:bg-white transition-all",
    style: {
      borderColor: "#D8DED3",
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace",
      color: "#16302B"
    }
  }), target ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold",
    style: {
      color: "#8A9A8F",
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, "/", toBn(target)) : null);
}
function ProgressChart({
  monthEntries,
  totalDays,
  member,
  allFields
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  useEffect(() => {
    if (!chartRef.current) return;
    // আগে এখানে সবসময় হার্ডকোডেড ৫টি সপ্তাহ প্লট করা হতো, ফলে ২৮ দিনের
    // ফেব্রুয়ারির মতো মাসে অস্তিত্বহীন "সপ্তাহ ৫" ভুলভাবে ০% হিসেবে দেখাতো।
    // getWeekRanges() ব্যবহার করে এখন শুধু ঐ মাসে আসলে যে কয়টা সপ্তাহ আছে
    // (৪ বা ৫) সেটাই প্লট হবে — সাপ্তাহিক রিফ্লেকশন টেবিল ও প্রিন্ট PDF-এ
    // এই একই ফাংশন যেভাবে ব্যবহৃত হয়, সেভাবে।
    const weekRanges = getWeekRanges(totalDays);
    const weekLabels = weekRanges.map(({
      week
    }) => `সপ্তাহ ${toBn(week)}`);
    const weekScores = weekRanges.map(({
      start,
      end
    }) => {
      let sum = 0;
      let count = 0;
      for (let d = start; d <= end; d++) {
        const e = monthEntries[pad2(d)];
        const s = dailyScore(e, member, allFields);
        if (s !== null) {
          sum += s;
          count += 1;
        }
      }
      return count ? Math.round(sum / count * 100) : 0;
    });
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    const ctx = chartRef.current.getContext("2d");
    const themePrimary = getThemeColor("#0E4B43");
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: weekLabels,
        datasets: [{
          label: "সাপ্তাহিক গড় স্কোর (%)",
          data: weekScores,
          borderColor: themePrimary,
          backgroundColor: hexToRgba(themePrimary, 0.1),
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#C89B3C"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              font: {
                size: 10
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 10
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [monthEntries, totalDays, member, allFields]);
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full h-32 mt-2"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: chartRef
  }));
}
function App() {
  useFonts();
  const [themeColor, setThemeColor] = useThemeColor();
  const [members, setMembers] = useState(null);
  // Switch prep (Step 1): families/<familyId>.migrationState-এর লাইভ
  // অবস্থা। undefined = "এখনো জানা যায়নি" (fail-closed) — "legacy" ধরে
  // নেওয়া হয় না যতক্ষণ না সার্ভার থেকে প্রকৃত মান (বা নিশ্চিত absence)
  // পাওয়া যায়। এই মুহূর্তে কোনো caller এই state ব্যবহার করছে না
  // (unwired), শুধু loading-gate-কে প্রভাবিত করে।
  const [migrationState, setMigrationState] = useState(undefined);
  // Access Approval Gate — Step 4: বর্তমান ব্যবহারকারী এই family-র admin
  // কিনা (existing migFamSnap boot-fetch থেকেই সেট হয়, কোনো extra read
  // যোগ করা হয়নি)। null = এখনো জানা যায়নি।
  const [isAdmin, setIsAdmin] = useState(null);
  // pending = নিজের accessRequest এখনো admin-approval-এর অপেক্ষায়;
  // null = জানা যায়নি বা প্রযোজ্য না (admin/approved/legacy path)।
  const [accessPending, setAccessPending] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("male");
  const [customFields, setCustomFields] = useState([]);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [entry, setEntry] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month0: d.getMonth()
    };
  });
  const [monthEntries, setMonthEntries] = useState({});
  const [monthRefreshKey, setMonthRefreshKey] = useState(0);
  const [printMode, setPrintMode] = useState(false);
  const [weekly, setWeekly] = useState({});
  const [weeklyRowCount, setWeeklyRowCount] = useState(1);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [weeklySavedTick, setWeeklySavedTick] = useState(false);
  const [meetingState, setMeetingState] = useState({
    rows: [{
      id: "1",
      topic: "",
      decision: "",
      person: ""
    }]
  });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingSavedTick, setMeetingSavedTick] = useState(false);
  // H-1 fix: tracks whether meetingState has local, unsaved edits. While
  // true, the live onSnapshot listener below skips applying incoming data,
  // so another device's save can't silently overwrite in-progress typing.
  const meetingDirtyRef = useRef(false);
  // H-3 fix: track unsaved edits in the day entry and weekly reflection so
  // navigating away (date/month/member change) can warn before silently
  // discarding them — mirrors the existing meetingDirtyRef pattern.
  const entryDirtyRef = useRef(false);
  const weeklyDirtyRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  // পুরনো "কাস্টম ফ্যামিলি কোড সেট করুন" মোডাল (showFamilyCodeModal,
  // legacy dual-purpose setFamilyCode() ভিত্তিক) সরিয়ে এখন একটি একক
  // EditIcon → দুই-অপশনের choice পপআপে merge করা হয়েছে (নিচে দেখুন)।
  const [showFamilyCodeChoiceModal, setShowFamilyCodeChoiceModal] = useState(false);
  const [showCreateNewFamilyModal, setShowCreateNewFamilyModal] = useState(false);
  const [newFamCodeInput, setNewFamCodeInput] = useState("");
  const [newFamCodeBusy, setNewFamCodeBusy] = useState(false);
  const [showJoinFamilyModal, setShowJoinFamilyModal] = useState(false);
  const [joinFamCodeInput, setJoinFamCodeInput] = useState("");
  const [joinFamCodeBusy, setJoinFamCodeBusy] = useState(false);
  // Access Approval Gate — Step 4: admin-only pending-request panel state।
  const [showAccessRequestsModal, setShowAccessRequestsModal] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState([]);
  const [loadingAccessRequests, setLoadingAccessRequests] = useState(false);
  const [showGoogleAccountModal, setShowGoogleAccountModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showBackupOptionsModal, setShowBackupOptionsModal] = useState(false);
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [driveBackupBusy, setDriveBackupBusy] = useState(false);
  const [driveBackupStatus, setDriveBackupStatus] = useState(null); // {type: "ok"|"error", text}
  const [showDriveRestoreModal, setShowDriveRestoreModal] = useState(false);
  const [driveRestoreCandidate, setDriveRestoreCandidate] = useState(null); // Drive file metadata
  const [driveRestoreBusy, setDriveRestoreBusy] = useState(false);
  const [driveRestoreChecking, setDriveRestoreChecking] = useState(false);
  const [showDeleteAccountWarning, setShowDeleteAccountWarning] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveYear, setArchiveYear] = useState(() => new Date().getFullYear());
  const [archiveMonth0, setArchiveMonth0] = useState(() => new Date().getMonth());
  const [isCustomFamilyCode, setIsCustomFamilyCode] = useState(() => {
    try {
      return localStorage.getItem("family_code_is_custom") === "1";
    } catch {
      return false;
    }
  });
  const [showFamilyCodeInfoModal, setShowFamilyCodeInfoModal] = useState(false);
  const [showMemberInfoModal, setShowMemberInfoModal] = useState(false);
  const [showExcuseInfoModal, setShowExcuseInfoModal] = useState(false);
  const [showWeeklyInfoModal, setShowWeeklyInfoModal] = useState(false);
  const [showMeetingInfoModal, setShowMeetingInfoModal] = useState(false);
  // §৫ Family Code Lifecycle Fix — Admin-only "কোড রিনেম" মোডাল (একই
  // familyId+data, শুধু কোড বদলায়) — বিদ্যমান "কাস্টম কোড" মোডাল থেকে
  // ইচ্ছাকৃতভাবে আলাদা রাখা হয়েছে যাতে ভুলবশত ডাটা-বিচ্ছিন্নতা না ঘটে।
  const [showRenameFamilyCodeModal, setShowRenameFamilyCodeModal] = useState(false);
  const [renameFamCodeInput, setRenameFamCodeInput] = useState("");
  const [renameFamCodeBusy, setRenameFamCodeBusy] = useState(false);
  // Family Code auto-propagate + notify: Admin কোড পরিবর্তন করলে বাকি
  // সদস্যদের ডিভাইসে পরের বুটেই (families/{id} listener থেকে) নতুন কোড
  // অটো বসে যায় ও রিলোডের পর একবার এই নোটিশ ব্যানার দেখানো হয় —
  // localStorage flag দিয়ে "একবারই দেখানো" নিশ্চিত করা হয়েছে।
  const [codeChangeNotice, setCodeChangeNotice] = useState(() => {
    try {
      const v = localStorage.getItem("family_code_change_notice");
      if (v) {
        localStorage.removeItem("family_code_change_notice");
        return v;
      }
    } catch {}
    return null;
  });
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // null | "sent" | "error"
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const originalEntryRef = useRef(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const touchStartXRef = useRef(null);
  const importFileInputRef = useRef(null);
  function handleDateTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX;
  }
  function handleDateTouchEnd(e) {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < 40) return; // ignore small taps/scrolls
    if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
    setViewDate(d => {
      const n = new Date(d);
      n.setDate(n.getDate() + (deltaX < 0 ? 1 : -1));
      return n;
    });
  }
  useEffect(() => {
    let migrationUnsub = null;
    (async () => {
      // Google sign-in বা family code — যেটাই আগে পাওয়া যায়, সেই অনুযায়ী
      // একই family/profile/records auto-load হওয়া নিশ্চিত করতে, member
      // লোড করার আগেই (Google-linked থাকলে) account-এর সংরক্ষিত family
      // code দিয়ে local code sync করে নেওয়া হচ্ছে।
      await syncFamilyCodeWithAccount();
      // Phase A prep — non-blocking, best-effort; app boot এর জন্য অপেক্ষা করে না।
      ensureFamilyCodeMapping();
      ensureFamilyMeta();
      // Switch prep (Step 1): migrationState listener attach করার আগে
      // ensureFamilyCodeMapping()-কে আলাদাভাবে await করা হচ্ছে (উপরের
      // fire-and-forget কলটি অপরিবর্তিত রাখা হয়েছে, বিদ্যমান আচরণ ভাঙা
      // হয়নি) — কারণ local family_id boot-এর প্রথম মুহূর্তে server-এর
      // সাথে out-of-sync/stale থাকতে পারে (self-heal সম্পন্ন না হওয়া
      // পর্যন্ত)। getFamilyId() এখানে কল করার আগে সেই self-heal সম্পন্ন
      // হয়েছে কিনা নিশ্চিত করতে এই দ্বিতীয়, awaited কলটি প্রয়োজন —
      // ফাংশনটি idempotent/best-effort বলে দ্বিতীয়বার কল করা নিরাপদ।
      await ensureFamilyCodeMapping();
      // §৫ fix: familyId self-heal সম্পন্ন হওয়ার পরই family doc নিশ্চিত
      // (idempotent — আগে থেকে থাকলে no-op) ও dataCollectionName cache
      // পূরণ করা হচ্ছে — এর পরের যেকোনো read/write (migrateMembersIfNeeded
      // থেকে শুরু করে) getCollectionName()-এর সঠিক, familyCode-independent
      // মান পাবে।
      await ensureFamilyMeta();
      await ensureDataCollectionName();
      // Legacy read-rule gate fix: ব্র্যান্ড-নতুন/একা (auto-generated,
      // adminUids:[]) family-তে আগে শুধু "custom code সেট" বা "Google
      // link" trigger-এ admin claim হতো — legacy read-gate deploy হওয়ার
      // পর এই দুই trigger না ঘটা পর্যন্ত এমন family নিজেই নিজের data পড়তে
      // পারছিল না (isApprovedMember()-এ admin/approved কেউ ছিল না)।
      // এখানে boot-এই (idempotent, awaited) claim করে এই gap বন্ধ করা
      // হলো — বিদ্যমান শেয়ার্ড family-তে (adminUids ইতিমধ্যে অ-খালি)
      // কোনো প্রভাব নেই (ফাংশন internally no-op করে), Rules-এর
      // "প্রথম-আসা" নিয়ম অপরিবর্তিত।
      await claimFirstAdminIfEligible();
      // Legacy read-rule gate prep — non-blocking, best-effort; dataCollectionName
      // cache পূরণ হওয়ার পরই কল করা হচ্ছে (getCollectionName()-এর সঠিক মান
      // দরকার), কিন্তু boot এর জন্য অপেক্ষা করে না।
      ensureLegacyCollectionMap();
      const migrationFamilyId = getFamilyId();
      migrationUnsub = db.collection("families").doc(migrationFamilyId).onSnapshot(
        (snap) => {
          const state = snap.exists ? (snap.data().migrationState || "legacy") : "legacy";
          setMigrationState(state);
          // Family Code auto-propagate + notify: সার্ভারের families/{id}.familyCode
          // এই ডিভাইসের local কোড থেকে ভিন্ন হলে (Admin অন্য কোথাও কোড
          // পরিবর্তন করেছেন) — অটো নতুন কোড বসিয়ে, Google-linked হলে
          // account-এও সংরক্ষণ করে, একবার রিলোড করা হয়; রিলোডের পর
          // "family_code_change_notice" flag দেখে ব্যানার দেখানো হবে।
          // familyId অপরিবর্তিত থাকায় এটি সম্পূর্ণ নিরাপদ — শুধু লেবেল sync।
          try {
            const serverCode = snap.exists ? snap.data().familyCode : null;
            const localCode = getFamilyCode();
            if (serverCode && serverCode.trim() && serverCode !== localCode) {
              localStorage.setItem("family_code", serverCode);
              localStorage.setItem("family_code_is_custom", "1");
              localStorage.setItem("family_code_change_notice", serverCode);
              const uid = auth.currentUser ? auth.currentUser.uid : null;
              const doReload = () => window.location.reload();
              if (uid && isGoogleLinked()) {
                saveUserFamilyCode(uid, serverCode).then(doReload).catch(doReload);
              } else {
                doReload();
              }
            }
          } catch {}
        },
        () => {
          // Fail-closed: listener error হলে migrationState ইচ্ছাকৃতভাবে
          // অপরিবর্তিত (undefined-ই) রাখা হচ্ছে — কোনো "legacy" fallback
          // বা কোনো SDK auto-retry আচরণের ওপর নির্ভরতা নেই। App
          // loading-gate-এ থেকে যাবে যতক্ষণ না একটি সফল snapshot আসে।
        }
      );
      // loadMembersV2() fix: migrateMembersIfNeeded()-কে সঠিক migrationState
      // পাস করার জন্য এখানে একটি পৃথক one-time get() করা হচ্ছে — উপরের
      // onSnapshot() fire-and-forget (attach করা হয়েছে, awaited না), তাই তার
      // প্রথম snapshot এই মুহূর্তে এসে পৌঁছেছে এই নিশ্চয়তা নেই (React state
      // setMigrationState()-এর ওপর race-condition নির্ভরতা তৈরি করলে
      // মাঝেমধ্যে stale/undefined migrationState দিয়ে সদস্য-তালিকা লোড হতে
      // পারত)। এই get() ব্যর্থ হলেও (network ইত্যাদি) "legacy" ধরে নেওয়া
      // নিরাপদ — resolvePathContext()-এর ডিফল্ট branch legacy-ই, তাই এটি
      // আগের (এই fix-এর আগের) hardcoded আচরণের সাথে সামঞ্জস্যপূর্ণ fallback।
      let bootMigrationState = "legacy";
      try {
        const migFamSnap = await db.collection("families").doc(migrationFamilyId).get();
        bootMigrationState = migFamSnap.exists ? (migFamSnap.data().migrationState || "legacy") : "legacy";
        // Access Approval Gate — Step 4: একই fetch থেকে isAdmin বের করা,
        // কোনো অতিরিক্ত read ছাড়াই।
        const famAdminUids = migFamSnap.exists ? migFamSnap.data().adminUids : null;
        const myUid = auth.currentUser ? auth.currentUser.uid : null;
        setIsAdmin(Array.isArray(famAdminUids) && myUid ? famAdminUids.includes(myUid) : false);
      } catch {}
      let m;
      try {
        m = await migrateMembersIfNeeded(bootMigrationState);
      } catch (err) {
        if (err && err.accessDenied) {
          // Access Approval Gate — Step 4: নিজের accessRequest দেখা, না
          // থাকলে "pending" তৈরি করা (Rules-এ self-create শুধু pending-এ
          // সীমাবদ্ধ)। এরপর UI "অনুমোদনের অপেক্ষায়" স্ক্রিন দেখাবে —
          // members/customFields ইত্যাদি লোড করার চেষ্টা করা হবে না।
          try {
            const myUid = auth.currentUser ? auth.currentUser.uid : null;
            if (myUid) {
              const reqRef = db.collection("families").doc(migrationFamilyId)
                .collection("accessRequests").doc(myUid);
              const reqSnap = await reqRef.get();
              if (!reqSnap.exists) {
                await reqRef.set({ status: "pending", requestedAt: Date.now() });
              }
            }
          } catch {}
          setAccessPending(true);
          setMembers([]);
          return;
        }
        m = [];
      }
      setMembers(m);
      // Fires once per app load (not per re-render) so the Analytics
      // dashboard can show how many distinct family spaces are actively
      // syncing data, without generating noise on every state change.
      logAnalyticsEvent("family_active", {
        family_code: getFamilyCode(),
        member_count: m.length
      });
      const cf = await loadCustomFields();
      setCustomFields(cf);
      let last = null;
      try {
        const r = await appStorage.get(`last-selected-member:${getFamilyCode()}`, false);
        last = r ? JSON.parse(r.value) : null;
      } catch {}
      if (last && m.find(x => x.id === last)) {
        setSelectedId(last);
      } else if (m.length) {
        setSelectedId(m[0].id);
      }
      // "credential-already-in-use" রিকভারি-রিলোডের পর (Incognito-তে আগে
      // থেকে Google-লিংকড অ্যাকাউন্টে সাইন ইন করলে এই path-ই চলে) এই flag
      // সেট থাকে — সেই মুহূর্তে onLinked() কল করার সুযোগ ছিল না, তাই এখন
      // বুট হওয়ার সময় সেটা পূরণ করা হচ্ছে।
      let pendingDriveCheck = false;
      try {
        if (localStorage.getItem("dt_check_drive_after_reload") === "1") {
          pendingDriveCheck = true;
          localStorage.removeItem("dt_check_drive_after_reload");
        }
      } catch {}
      if (isGoogleLinked() && (!m.length || pendingDriveCheck)) {
        // নতুন/খালি ডিভাইস অথবা এইমাত্র রিকভারি-রিলোড হয়েছে, আর Google
        // সাইন ইন করা আছে — Drive-এ ব্যাকআপ আছে কিনা নীরবে চেক করা হচ্ছে।
        const found = await findAndOfferDriveRestore(false);
        if (!found && !m.length) {
          setAddingMember(true);
        }
      } else if (!m.length) {
        // No members yet, no Google link — first-time setup, prompt for name & gender right away
        setAddingMember(true);
      }
    })();
    return () => {
      if (migrationUnsub) migrationUnsub();
    };
  }, []);
  const [recoveryMessage, setRecoveryMessage] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [weeklyReminderBanner, setWeeklyReminderBanner] = useState(false);
  const [monthlyReminderBanner, setMonthlyReminderBanner] = useState(false);
  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener("dt-update-available", handler);
    return () => window.removeEventListener("dt-update-available", handler);
  }, []);
  useEffect(() => {
    const lastActive = localStorage.getItem("last_active_date");
    const todayKey = dateKey(new Date());
    if (!lastActive) {
      // First-ever visit — just start tracking, don't show the message.
      localStorage.setItem("last_active_date", todayKey);
      return;
    }
    const gapDays = Math.round((new Date(todayKey) - new Date(lastActive)) / 86400000);
    const dismissedFor = localStorage.getItem("recovery_dismissed_on");
    if (gapDays >= 3 && dismissedFor !== todayKey) {
      setRecoveryMessage(true);
    }
  }, []);
  useEffect(() => {
    function checkReminders() {
      const now = new Date();
      const todayKey = dateKey(now);
      const hour = now.getHours();
      const weeklyDismissed = localStorage.getItem("weekly_reminder_dismissed_on");
      if (now.getDay() === 4 && hour >= 19 && weeklyDismissed !== todayKey) {
        setWeeklyReminderBanner(true);
      }
      const monthlyDismissed = localStorage.getItem("monthly_reminder_dismissed_on");
      if (isLastDayOfMonth(now) && hour >= 17 && monthlyDismissed !== todayKey) {
        setMonthlyReminderBanner(true);
      }
    }
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, []);
  function dismissWeeklyReminder() {
    localStorage.setItem("weekly_reminder_dismissed_on", dateKey(new Date()));
    setWeeklyReminderBanner(false);
  }
  function dismissMonthlyReminder() {
    localStorage.setItem("monthly_reminder_dismissed_on", dateKey(new Date()));
    setMonthlyReminderBanner(false);
  }
  const allFields = useMemo(() => {
    return [...DEFAULT_DEEN_FIELDS, ...DEFAULT_DUNIYA_FIELDS, ...customFields];
  }, [customFields]);
  const selectedMember = useMemo(() => (members || []).find(m => m.id === selectedId) || null, [members, selectedId]);
  // True when this member has been claimed ("দায়িত্ব নিন") by a different
  // Firebase Auth uid than the one this device is currently signed in as.
  // Unclaimed members (ownerUid null) are editable by anyone — that's the
  // "manual member, no phone of their own" case. Read access is never
  // restricted, only writing.
  const isLockedForThisDevice = !!(selectedMember && selectedMember.ownerUid && (!auth.currentUser || selectedMember.ownerUid !== auth.currentUser.uid));
  // Step 5 (Switch prep): UI-level (app) guard — server-side Rules enforcement
  // (approved design) is the real safety boundary; this is purely UX so the
  // person sees a clear message instead of a raw Firestore permission error
  // during the brief "locked" window of a family's Switch.
  const isLockedForSwitch = migrationState === "locked";
  useEffect(() => {
    // Guard: on first render selectedId is still null (real value loads async).
    // Skip that null write so it never overwrites the previously saved
    // device-owner profile — otherwise every refresh would silently reset
    // to the first member in the family list.
    if (!selectedId) return;
    appStorage.set(`last-selected-member:${getFamilyCode()}`, JSON.stringify(selectedId), false).catch(() => {});
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId || migrationState === undefined) return;
    loadEntry(migrationState, selectedId, dateKey(viewDate)).then(data => {
      setEntry(data || {});
      originalEntryRef.current = data || null;
      entryDirtyRef.current = false;
    });
  }, [selectedId, viewDate, migrationState]);

  // Live-synced month entries: a single collection-scoped range query on
  // documentId() (entry:<memberId>:<YYYY-MM>-*) replaces what used to be
  // one onSnapshot listener PER DAY of the month (up to 31 simultaneous
  // listeners for a single member/month, re-opened on every member/month
  // switch). The original per-day approach existed because of a concern
  // that Firestore rules might silently block list/range queries on this
  // collection — that concern was investigated against the live production
  // rules (Audit Round #01, item [#1]) and closed as a false alarm: the
  // current rules (`allow read: if request.auth != null && ...`, no
  // resource.data reference) permit both get() and list()/query() the same
  // way. Collapsing 31 listeners into 1 meaningfully cuts daily Firestore
  // read-quota usage on the Spark (free) plan as more family members join
  // and use the app simultaneously — each open calendar view now costs one
  // listener instead of up to 31, and reads only the days that actually
  // have a saved entry (no doc = no read), instead of always issuing 31
  // reads whether or not a day was ever filled in.
  useEffect(() => {
    if (!selectedId || migrationState === undefined) {
      setMonthEntries({});
      return;
    }
    const year = monthCursor.year;
    const month0 = monthCursor.month0;
    // Step 2 (Switch prep): resolver দিয়ে collection ও prefix নির্ধারণ।
    // migrationState "legacy" হলে (বর্তমানে সবসময়ই তাই) prefix ও colRef
    // আগের হার্ডকোডেড মানের সাথে বিট-ফর-বিট অভিন্ন থাকে।
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const prefix = ctx.mode === "v2"
      ? `${selectedId}_${year}-${pad2(month0 + 1)}-`
      : `entry:${selectedId}:${year}-${pad2(month0 + 1)}-`;
    const q = ctx.entriesRef
      .where(firebase.firestore.FieldPath.documentId(), ">=", prefix)
      .where(firebase.firestore.FieldPath.documentId(), "<", prefix + "\uf8ff");
    const unsub = q.onSnapshot(snap => {
      const liveData = {};
      snap.docs.forEach(doc => {
        const dayStr = doc.id.slice(prefix.length);
        try {
          liveData[dayStr] = JSON.parse(doc.data().value);
        } catch {
          // Skip a malformed single entry rather than break the whole
          // month's view over one bad document.
        }
      });
      setMonthEntries(liveData);
    }, () => {});
    return () => unsub();
  }, [selectedId, monthCursor, monthRefreshKey, migrationState]);
  const refreshWeekly = useCallback(() => {
    if (!selectedId || migrationState === undefined) return;
    loadWeekly(migrationState, selectedId, monthCursor.year, monthCursor.month0).then(data => {
      setWeekly(data);
      weeklyDirtyRef.current = false;
      const maxPossible = getWeekRanges(daysInMonth(monthCursor.year, monthCursor.month0)).length;
      let highestFilled = 1;
      for (let w = 1; w <= maxPossible; w++) {
        const rec = data[w];
        if (rec && (rec.good || rec.gap || rec.plan)) highestFilled = w;
      }
      setWeeklyRowCount(Math.min(Math.max(highestFilled, 1), maxPossible));
    });
  }, [selectedId, monthCursor, migrationState]);
  useEffect(() => {
    refreshWeekly();
  }, [refreshWeekly]);
  useEffect(() => {
    // New document (different month) — nothing local worth protecting yet.
    meetingDirtyRef.current = false;
    const docKey = meetingKey(monthCursor.year, monthCursor.month0);
    const docRef = db.collection(getCollectionName()).doc(docKey);
    const unsubscribe = docRef.onSnapshot(doc => {
      // H-1 fix: while the user has unsaved local edits, ignore incoming
      // snapshots (e.g. another device's save) so typing isn't overwritten.
      if (meetingDirtyRef.current) return;
      if (doc.exists) {
        try {
          const data = JSON.parse(doc.data().value);
          setMeetingState(data);
        } catch (e) {}
      } else {
        setMeetingState({
          rows: [{
            id: "1",
            topic: "",
            decision: "",
            person: ""
          }]
        });
      }
    });
    return () => unsubscribe();
  }, [monthCursor]);
  async function handleExportData() {
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    try {
      // File System Access (থাকলে) সবচেয়ে আগে চেষ্টা করা হয় —
      // showDirectoryPicker() অবশ্যই user gesture-এর মধ্যেই কল করতে হয়,
      // তাই এটি Firestore fetch-এর আগেই (handleExportData শুরু হওয়ার পর
      // প্রথম await হিসেবে) করা হচ্ছে।
      const fsaBaseDir = await getOrRequestFsaBaseDir();
      // Switch prep fix: আগে এখানে সরাসরি db.collection(getCollectionName())
      // (legacy) থেকে পড়া হতো — v2 family-তে এটি ভুল (stale) ডাটা export
      // করত। এখন readAllFamilyDataForBackup() ব্যবহার করা হচ্ছে, যা
      // migrationState অনুযায়ী সঠিক (live) জায়গা থেকে পড়ে এবং legacy-style
      // key ফরম্যাটেই রিটার্ন করে — legacy family-তে আউটপুট অপরিবর্তিত।
      const exportObj = await readAllFamilyDataForBackup(migrationState);
      // একই backup schema যা Google Drive ব্যাকআপেও ব্যবহৃত হয় (single
      // schema — আলাদা local-only format নেই)। family/preferences এখানে
      // অন্তর্ভুক্ত নয় কারণ mergeBackupData() শুধু .data ব্যবহার করে।
      const exportPayload = {
        schemaVersion: DRIVE_BACKUP_SCHEMA_VERSION,
        appVersion: "1.0.0",
        backupTime: Date.now(),
        data: exportObj
      };
      const jsonStr = JSON.stringify(exportPayload, null, 2);
      // ফাইলের নামে টাইমস্ট্যাম্প যোগ করা হয়েছে যাতে একাধিকবার এক্সপোর্ট
      // করলে আগেরগুলো চেনা/বাছাই করা সহজ হয়।
      const now = new Date();
      const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}`;
      const fileName = `daily_task_backup_${getFamilyCode()}_${stamp}.json`;
      // ধাপ ১: File System Access API — Android Chrome M132+ (stable,
      // জানুয়ারি ২০২৫ থেকে) এবং ডেস্কটপ Chrome/Edge-এ সাপোর্ট করে। প্রথমবার
      // ব্যবহারকারীর বেছে নেওয়া বেস-ফোল্ডারের ভেতরে "DailyTask Backup"
      // সাবফোল্ডার স্বয়ংক্রিয়ভাবে তৈরি/পুনঃব্যবহার করে সরাসরি ফাইল লেখা
      // হয় — কোনো prompt ছাড়াই (পারমিশন বহাল থাকা পর্যন্ত)।
      if (fsaBaseDir) {
        try {
          await writeFsaBackupFile(fsaBaseDir, fileName, jsonStr);
          return;
        } catch (fsaErr) {
          // NotFoundError/InvalidStateError/NotAllowedError মানে হ্যান্ডেলটি
          // নিশ্চিতভাবে অবৈধ (ফোল্ডার মুছে ফেলা হয়েছে/সরানো হয়েছে, বা
          // permission নিঃশব্দে বাতিল হয়ে গেছে) — এক্ষেত্রে cached হ্যান্ডেল
          // বাতিল করে ব্যবহারকারীকে একবার সংক্ষিপ্ত বার্তা দেখানো হচ্ছে, যাতে
          // তিনি বুঝতে পারেন পরের বার কেন নতুন ফোল্ডার বেছে নিতে বলা হবে।
          // এই মুহূর্তে আবার showDirectoryPicker() দেখানো নিরাপদ নয়
          // (user-gesture window ইতিমধ্যে ব্যবহৃত হয়ে যেতে পারে, ফলে
          // SecurityError হতে পারে) — তাই *পরের* ব্যাকআপ চেষ্টায় (নতুন,
          // তাজা ক্লিক থেকে) getOrRequestFsaBaseDir() স্বয়ংক্রিয়ভাবে আবার
          // ফোল্ডার বেছে নিতে বলবে।
          const invalidHandleErrors = ["NotFoundError", "InvalidStateError", "NotAllowedError"];
          if (fsaErr && invalidHandleErrors.includes(fsaErr.name)) {
            try {
              await clearStoredFsaDirHandle();
            } catch {}
            alert("নির্বাচিত ব্যাকআপ ফোল্ডারটি আর ব্যবহারযোগ্য নয়। পরবর্তী ব্যাকআপের সময় নতুন ফোল্ডার নির্বাচন করুন।");
          }
          // অন্য যেকোনো (সাময়িক) ত্রুটিতে হ্যান্ডেল অক্ষত রাখা হচ্ছে —
          // পরের বার আবার এই একই ফোল্ডার ব্যবহারের চেষ্টা হবে, অকারণে নতুন
          // করে prompt করা হবে না। এখন নিচের Web Share/Download fallback-এ
          // যাওয়া হচ্ছে।
        }
      }
      // ধাপ ২ (fallback): Web Share API — File System Access সাপোর্ট না
      // থাকলে, ব্যবহারকারী পিকার বাতিল করলে, বা permission না পেলে এখানে
      // আসা হয়। মোবাইলে নেটিভ "Share" শিট দেখায়, যেখান থেকে ব্যবহারকারী
      // চাইলে Files অ্যাপে বা সরাসরি Google Drive-এও পাঠাতে পারবেন।
      try {
        const file = new File([jsonStr], fileName, {
          type: "application/json"
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Daily Task ব্যাকআপ",
            text: `Daily Task ডাটা ব্যাকআপ — ${fileName}`
          });
          return;
        }
      } catch (shareErr) {
        if (shareErr && shareErr.name === "AbortError") return; // ব্যবহারকারী শেয়ার বাতিল করেছেন
        // অন্য যেকোনো ব্যর্থতায় নিচের সরাসরি-ডাউনলোড ফলব্যাকে যাওয়া হচ্ছে
      }
      // ধাপ ৩ (চূড়ান্ত fallback): সরাসরি ব্রাউজার ডাউনলোড — আগের মতোই,
      // কোনো ব্রেকিং চেঞ্জ নেই।
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("ডাটা এক্সপোর্ট করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  // --- Google Drive Backup/Restore UI handlers ---
  async function handleDriveBackupClick() {
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    if (!isGoogleLinked()) {
      setShowBackupOptionsModal(false);
      setShowGoogleAccountModal(true);
      return;
    }
    setDriveBackupBusy(true);
    setDriveBackupStatus(null);
    try {
      const result = await backupToGoogleDrive(migrationState);
      if (result.skipped) {
        setDriveBackupStatus({ type: "error", text: "ব্যাকআপ বাতিল করা হয়েছে।" });
      } else {
        setDriveBackupStatus({ type: "ok", text: "Google Drive-এ ব্যাকআপ সংরক্ষিত হয়েছে।" });
      }
    } catch (err) {
      setDriveBackupStatus({ type: "error", text: "Google Drive ব্যাকআপ ব্যর্থ হয়েছে: " + err.message });
    } finally {
      setDriveBackupBusy(false);
    }
  }
  async function handleBothBackupClick() {
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    await handleExportData();
    await handleDriveBackupClick();
  }
  // Drive-এ ব্যাকআপ খুঁজে পেলে Restore Popup দেখায়, না পেলে/ব্যর্থ হলে
  // explicit=true (ব্যবহারকারীর সরাসরি ক্লিকে) হলে alert দেখায়, নাহলে
  // (explicit=false — সাইন-ইনের পর automatic চেক) নীরবে থাকে যাতে সাইন-ইন
  // প্রবাহ আটকে না যায়। রিটার্ন ভ্যালু: ব্যাকআপ পাওয়া গেছে কিনা (boolean)।
  async function findAndOfferDriveRestore(explicit) {
    if (!isGoogleDriveConfigured()) {
      if (explicit) alert("Google Drive ব্যাকআপ এখনো সেটআপ করা হয়নি।");
      return false;
    }
    setDriveRestoreChecking(true);
    try {
      const file = await findDriveBackupFile();
      if (file) {
        setDriveRestoreCandidate(file);
        setShowDriveRestoreModal(true);
        return true;
      }
      if (explicit) alert("এই Google অ্যাকাউন্টে কোনো Drive ব্যাকআপ পাওয়া যায়নি।");
      return false;
    } catch (err) {
      if (explicit) alert("Drive ব্যাকআপ খুঁজতে সমস্যা হয়েছে: " + err.message);
      return false;
    } finally {
      setDriveRestoreChecking(false);
    }
  }
  // Google সাইন-ইন (link) সফল হওয়ার পর কল হয় — এই অ্যাকাউন্টে আগে থেকে
  // কোনো Drive ব্যাকআপ থাকলে সেটা নীরবে detect করে Restore-এর Popup
  // দেখানো হয় (GoogleAccountModal-এর onLinked prop হিসেবে ব্যবহৃত)।
  function checkDriveBackupAfterLink() {
    return findAndOfferDriveRestore(false);
  }
  // "ইম্পোর্ট ব্যাকআপ ফাইল" বটম-শিট থেকে "Google Drive থেকে রিস্টোর করুন"
  // ক্লিক করলে কল হয় — এটি ব্যবহারকারীর সরাসরি অ্যাকশন, তাই ব্যাকআপ না
  // পাওয়া গেলে/ব্যর্থ হলে স্পষ্ট বার্তা দেখানো হয়।
  async function handleManualDriveRestoreClick() {
    setShowImportOptionsModal(false);
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    if (!isGoogleLinked()) {
      setShowGoogleAccountModal(true);
      return;
    }
    await findAndOfferDriveRestore(true);
  }
  async function handleConfirmDriveRestore() {
    if (!driveRestoreCandidate) return;
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    setDriveRestoreBusy(true);
    try {
      await restoreFromGoogleDrive(driveRestoreCandidate.id, migrationState);
      window.alert("Google Drive থেকে ডাটা সফলভাবে রিস্টোর (মার্জ) করা হয়েছে।");
      window.location.reload();
    } catch (err) {
      alert("রিস্টোর করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setDriveRestoreBusy(false);
      setShowDriveRestoreModal(false);
    }
  }
  async function handleImportData(e) {
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async event => {
        try {
          const parsed = JSON.parse(event.target.result);

          // একই backup schema যা Drive ব্যাকআপে ব্যবহৃত হয় (schemaVersion +
          // data wrapper) — local ও Drive-এর জন্য পৃথক ফরম্যাট নেই।
          if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
            throw new Error("ব্যাকআপ ফাইলের ফরম্যাট চেনা যাচ্ছে না।");
          }
          if (parsed.schemaVersion && parsed.schemaVersion > DRIVE_BACKUP_SCHEMA_VERSION) {
            throw new Error("এই ব্যাকআপ ফাইলটি অ্যাপের নতুন ভার্সনে তৈরি হয়েছে — অনুগ্রহ করে আগে অ্যাপ আপডেট করুন।");
          }

          // [C-1 FIX] আগে এখানে একটি পৃথক ইনলাইন import logic ছিল যা
          // existing member: ডকুমেন্ট কোনো check ছাড়াই ওভাররাইট করে ফেলত
          // (Drive Restore-এর mergeBackupData() থেকে ভিন্ন আচরণ)। এখন
          // local-file Import ও Drive Restore উভয়ই একই mergeBackupData()
          // ব্যবহার করছে যাতে member ডকুমেন্টের জন্য একই নিরাপদ নিয়ম প্রযোজ্য
          // হয়: compareUpdatedAt: false দেওয়ায় আগের (local-file Import-এর)
          // আচরণই বহাল থাকছে — বিদ্যমান সদস্য কখনো ছোঁয়া হবে না, শুধু নতুন
          // সদস্য যোগ হবে; entry:/weekly:/অন্যান্য ডকুমেন্ট আগের মতোই সবসময়
          // লেখা হবে (merge: true সহ)। ownerUid normalize logic এবং অন্য
          // ডিভাইসের claim করা সদস্যের ডাটা স্কিপ করার নিয়ম অপরিবর্তিত আছে
          // (mergeBackupData()-এর ভেতরেই)।
          const result = await mergeBackupData(migrationState, parsed.data, { compareUpdatedAt: false });
          if (result.skippedKeys.length) {
            alert(`ডাটা ইম্পোর্ট হয়েছে। তবে ${result.skippedKeys.length}টি এন্ট্রি স্কিপ করা হয়েছে, কারণ সেগুলো অন্য ডিভাইসের দায়িত্বে থাকা সদস্যের — সেগুলো সেই সদস্যের নিজের ডিভাইস থেকে ইম্পোর্ট করতে হবে।`);
          } else {
            alert("ডাটা সফলভাবে ইম্পোর্ট করা হয়েছে!");
          }
          window.location.reload();
        } catch (err) {
          alert("ইম্পোর্ট করতে সমস্যা হয়েছে (ভুল ব্যাকআপ ফাইল হতে পারে): " + err.message);
        }
      };
    }
  }
  function handleCopyCode() {
    navigator.clipboard.writeText(getFamilyCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }
  // Access Approval Gate — Step 4: admin-only pending accessRequests লোড।
  async function loadPendingAccessRequests() {
    setLoadingAccessRequests(true);
    try {
      const famId = getFamilyId();
      const snap = await db.collection("families").doc(famId)
        .collection("accessRequests").where("status", "==", "pending").get();
      setPendingAccessRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      setPendingAccessRequests([]);
    } finally {
      setLoadingAccessRequests(false);
    }
  }
  // decision: "approved" | "denied"। Rules-এ শুধু pending→approved/denied
  // এবং শুধু status+decidedAt field অনুমোদিত।
  async function decideAccessRequest(uid, decision) {
    try {
      const famId = getFamilyId();
      await db.collection("families").doc(famId)
        .collection("accessRequests").doc(uid)
        .update({ status: decision, decidedAt: Date.now() });
      setPendingAccessRequests(list => list.filter(r => r.id !== uid));
    } catch (err) {
      alert("সিদ্ধান্ত সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  // "নতুন ফ্যামিলি কোড তৈরি করুন" — সব সদস্যের জন্য উন্মুক্ত (কারো নিজস্ব
  // পৃথক family স্পেস দরকার হলে)। সম্পূর্ণ নতুন familyId+data — বর্তমান
  // family/data কোনোভাবে touch হয় না, শুধু এই ডিভাইসটি নতুন (blank)
  // family-তে সুইচ হয়ে যায়। createNewFamily() নিজেই এই ডিভাইসের uid-কে
  // নতুন family-এর প্রথম Admin হিসেবে claim করে।
  async function handleCreateNewFamily() {
    const code = newFamCodeInput.trim();
    if (!code) return;
    if (code.length < FAMILY_CODE_MIN_LENGTH) {
      window.alert(`ফ্যামিলি কোড কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
      return;
    }
    if (!isFamilyCodeCharsetValid(code)) {
      window.alert("ফ্যামিলি কোডে স্পেস, / (স্ল্যাশ), \\ (ব্যাকস্ল্যাশ), বা কোটেশন চিহ্ন ( ' \" ) ব্যবহার করা যাবে না।");
      return;
    }
    if (!window.confirm(`"${code}" কোড দিয়ে সম্পূর্ণ নতুন, খালি একটি ফ্যামিলি স্পেস তৈরি হবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডাটা অক্ষত থাকবে, কিন্তু এই ডিভাইস থেকে আর দেখা যাবে না। এগিয়ে যাবেন?`)) return;
    setNewFamCodeBusy(true);
    try {
      const result = await createNewFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          length: `কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`,
          charset: "অবৈধ ক্যারেক্টার।",
          "code-taken": "এই কোড ইতিমধ্যে ব্যবহৃত হচ্ছে, অন্য একটি কোড ব্যবহার করুন।",
          error: result.error || "একটি সমস্যা হয়েছে।"
        }[result.reason] || "নতুন ফ্যামিলি তৈরি করা যায়নি।";
        window.alert(reasonMsg);
      }
      // success হলে createNewFamily নিজেই reload করে।
    } finally {
      setNewFamCodeBusy(false);
    }
  }
  // "বিদ্যমান ফ্যামিলি কোড দিয়ে যোগ দিন" — সব সদস্যের জন্য উন্মুক্ত (নতুন
  // device-এ আগে থেকে থাকা কোনো Family Code দিয়ে ঢোকার জন্য)। শুধু v2
  // family-তে কাজ করে (legacy read-gate এখনো implement হয়নি বলে ইচ্ছাকৃতভাবে
  // সীমিত)। joinExistingFamily() নিজেই device সুইচ করে reload করে — এরপর
  // বুট-টাইম accessDenied হ্যান্ডলিং pending accessRequest তৈরি/approved
  // চেক করবে।
  async function handleJoinExistingFamily() {
    const code = joinFamCodeInput.trim();
    if (!code) return;
    if (!window.confirm(`"${code}" কোড দিয়ে সেই ফ্যামিলিতে যোগ দেওয়ার অনুরোধ পাঠানো হবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডাটা অক্ষত থাকবে, কিন্তু এই ডিভাইস থেকে আর দেখা যাবে না। এগিয়ে যাবেন?`)) return;
    setJoinFamCodeBusy(true);
    try {
      const result = await joinExistingFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          "same-family": "আপনি ইতিমধ্যে এই ফ্যামিলিতে আছেন।",
          "not-found": "এই কোডের কোনো ফ্যামিলি পাওয়া যায়নি। কোডটি আবার যাচাই করুন।",
          "not-v2": "এই ফ্যামিলি এখনো এই ফিচারের জন্য প্রস্তুত নয়। ফ্যামিলির Admin-এর সাথে সরাসরি যোগাযোগ করুন।",
          error: result.error || "একটি সমস্যা হয়েছে।"
        }[result.reason] || "যোগ দেওয়া যায়নি।";
        window.alert(reasonMsg);
      }
      // success হলে joinExistingFamily নিজেই reload করে।
    } finally {
      setJoinFamCodeBusy(false);
    }
  }
  // §৫ Family Code Lifecycle Fix — Admin-only: বর্তমান family-এর কোড
  // পরিবর্তন, dataCollectionName/data অপরিবর্তিত থাকে (changeFamilyCodeForExistingFamily
  // নিজেই Rules-এ admin-enforced, তাই এখানে আলাদা করে isAdmin চেক না
  // করলেও নিরাপদ — তবু UI-তে ভুল ব্যবহার এড়াতে বাটনটি isAdmin-গেটেড)।
  async function handleRenameFamilyCode() {
    const code = renameFamCodeInput.trim();
    if (!code) return;
    if (code.length < FAMILY_CODE_MIN_LENGTH) {
      window.alert(`ফ্যামিলি কোড কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
      return;
    }
    if (!isFamilyCodeCharsetValid(code)) {
      window.alert("ফ্যামিলি কোডে স্পেস, / (স্ল্যাশ), \\ (ব্যাকস্ল্যাশ), বা কোটেশন চিহ্ন ( ' \" ) ব্যবহার করা যাবে না।");
      return;
    }
    if (!window.confirm(`কোড "${code}"-তে পরিবর্তন করবেন? আপনার পরিবারের সব ডাটা অক্ষত থাকবে (কোনো কপি/লস হবে না) — শুধু পরিবারের পরিচিতি-কোড বদলাবে। বাকি সদস্যদের ডিভাইসে অটো নতুন কোড বসে যাবে ও নোটিশ দেখাবে।`)) return;
    setRenameFamCodeBusy(true);
    try {
      const result = await changeFamilyCodeForExistingFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          length: `কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`,
          charset: "অবৈধ ক্যারেক্টার।",
          "no-auth": "সাইন ইন করা নেই।",
          error: result.error || "একটি সমস্যা হয়েছে।"
        }[result.reason] || "কোড পরিবর্তন করা যায়নি।";
        window.alert(reasonMsg);
      }
      // success হলে changeFamilyCodeForExistingFamily নিজেই reload করে।
    } finally {
      setRenameFamCodeBusy(false);
    }
  }
  function handleGoToArchive() {
    // আর্কাইভে যাওয়া একসাথে মাস ও তারিখ উভয়ই পরিবর্তন করে — তাই তিনটি
    // dirty flag-ই একসাথে চেক করে একটিমাত্র (duplicate নয়) confirm দেখানো
    // হচ্ছে।
    const hasUnsaved = entryDirtyRef.current || weeklyDirtyRef.current || meetingDirtyRef.current;
    if (hasUnsaved && !window.confirm("সেভ না করা পরিবর্তন আছে। আর্কাইভে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
    setMonthCursor({
      year: archiveYear,
      month0: archiveMonth0
    });
    setViewDate(new Date(archiveYear, archiveMonth0, 1));
    setShowArchiveModal(false);
  }
  async function handleSendFeedback() {
    if (!feedbackMsg.trim() || feedbackSending) return;
    setFeedbackSending(true);
    setFeedbackStatus(null);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: "Daily Task App — নতুন পরামর্শ",
          message: feedbackMsg
        })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Request failed");
      setFeedbackStatus("sent");
      setFeedbackMsg("");
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackStatus(null);
      }, 1200);
    } catch (err) {
      setFeedbackStatus("error");
    } finally {
      setFeedbackSending(false);
    }
  }
  function updateWeekly(weekIdx, field, value) {
    weeklyDirtyRef.current = true;
    setWeekly(prev => ({
      ...prev,
      [weekIdx]: {
        ...(prev[weekIdx] || {}),
        [field]: value
      }
    }));
  }
  function addWeeklyRow() {
    const maxPossible = getWeekRanges(daysInMonth(monthCursor.year, monthCursor.month0)).length;
    setWeeklyRowCount(c => Math.min(c + 1, maxPossible));
  }
  function addMeetingRow() {
    meetingDirtyRef.current = true;
    setMeetingState(prev => ({
      ...prev,
      rows: [...(prev.rows || []), {
        id: String(Date.now()),
        topic: "",
        decision: "",
        person: ""
      }]
    }));
  }
  function removeMeetingRow(idx) {
    meetingDirtyRef.current = true;
    setMeetingState(prev => {
      const nextRows = [...prev.rows];
      nextRows.splice(idx, 1);
      return {
        ...prev,
        rows: nextRows
      };
    });
  }
  function updateMeetingRow(idx, field, value) {
    meetingDirtyRef.current = true;
    setMeetingState(prev => {
      const nextRows = [...prev.rows];
      nextRows[idx] = {
        ...nextRows[idx],
        [field]: value
      };
      return {
        ...prev,
        rows: nextRows
      };
    });
  }
  async function handleSaveWeekly() {
    if (!selectedId) return;
    if (isLockedForThisDevice) {
      alert("এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে এডিট করা যাবে না।");
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    setSavingWeekly(true);
    try {
      await saveWeekly(migrationState, selectedId, monthCursor.year, monthCursor.month0, weekly, selectedMember?.ownerUid ?? null);
      weeklyDirtyRef.current = false;
      setWeeklySavedTick(true);
      setTimeout(() => setWeeklySavedTick(false), 1600);
    } catch (err) {
      alert("সাপ্তাহিক রিফ্লেকশন সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSavingWeekly(false);
    }
  }
  async function handleSaveMeeting() {
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    setSavingMeeting(true);
    try {
      await saveMeetingData(monthCursor.year, monthCursor.month0, meetingState);
      meetingDirtyRef.current = false;
      setMeetingSavedTick(true);
      setTimeout(() => setMeetingSavedTick(false), 1600);
    } catch (err) {
      alert("মাসিক সভা সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSavingMeeting(false);
    }
  }
  async function handleAddCustomField() {
    if (!newCustomLabel.trim()) return;
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const key = `custom_${Date.now()}`;
    const newField = {
      key,
      label: newCustomLabel.trim(),
      shortLabel: newCustomLabel.trim(),
      type: "bool",
      isCustom: true
    };
    const updated = [...customFields, newField];
    setCustomFields(updated);
    setNewCustomLabel("");
    setShowAddCustom(false);
    try {
      await saveCustomFields(updated);
    } catch (err) {
      alert("কাস্টম টাস্ক সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleAddMember() {
    const name = newName.trim();
    if (!name) return;
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Creating a member on this device claims it for the signed-in Google
    // account right away — that account's uid becomes the only one allowed
    // to edit this member's data (Device-Claim), until it's released.
    const newMember = {
      id,
      name,
      gender: newGender,
      ownerUid: auth.currentUser ? auth.currentUser.uid : null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const next = [...(members || []), newMember];
    setMembers(next);
    setSelectedId(id);
    setNewName("");
    setNewGender("male");
    setAddingMember(false);
    try {
      await saveMemberDoc(migrationState, newMember);
    } catch (err) {
      alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleRemoveMember(m) {
    // Firestore rules এখন ownerUid-ভিত্তিক isUnownedOrMine() চেক করে delete
    // অনুমতি দেয় — অন্য ডিভাইসের claim করা সদস্য মুছতে গেলে সার্ভার সেটা
    // reject করবে। আগে থেকে একই চেক না করলে UI optimistically সদস্যকে
    // লিস্ট থেকে সরিয়ে ফেলত, অথচ আসল ডিলিট ব্যর্থ হতো — বিভ্রান্তিকর।
    if (m.ownerUid && (!auth.currentUser || m.ownerUid !== auth.currentUser.uid)) {
      alert("এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে বাদ দেওয়া যাবে না। প্রথমে সেই ডিভাইস থেকে দায়িত্ব ছাড়তে বলুন, তারপর বাদ দিন।");
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const ok = window.confirm(`আপনি কি নিশ্চিত "${m.name}" কে সদস্য তালিকা থেকে বাদ দিতে চান? এই সদস্যের নাম আর দেখা যাবে না, তবে পূর্বের সেভ করা ডাটা মুছে যাবে না।`);
    if (!ok) return;
    const next = (members || []).filter(x => x.id !== m.id);
    setMembers(next);
    try {
      await deleteMemberDoc(migrationState, m.id);
    } catch (err) {
      alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
    if (selectedId === m.id) {
      setSelectedId(next.length ? next[0].id : null);
    }
  }
  async function handleClaimMember(m) {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    if (!uid) return;
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    try {
      await claimMemberDoc(migrationState, m.id, uid);
      setMembers(prev => prev.map(x => x.id === m.id ? {
        ...x,
        ownerUid: uid
      } : x));
    } catch (err) {
      alert("দায়িত্ব নিতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleReleaseMember(m) {
    // Firestore rules-এ isUnownedOrMine() চেক করে — অন্য ডিভাইসের claim
    // করা সদস্যকে release করার চেষ্টা করলে সার্ভার সবসময় reject করবে
    // (UI আগে "সংরক্ষিত" বাটনে এই একই ফাংশন কল করত, ফলে ব্যর্থ Firestore
    // রিকোয়েস্টের পর একটা অস্পষ্ট এরর দেখাত)। এখন আগে থেকেই চেক করে
    // স্পষ্ট বার্তা দেখানো হচ্ছে, যাতে ব্যবহারকারী বুঝতে পারে এটা কেন
    // সম্ভব নয় এবং কী করতে হবে।
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (m.ownerUid && m.ownerUid !== myUid) {
      alert(`"${m.name}"-এর দায়িত্ব বর্তমানে অন্য একটি ডিভাইসে আছে — এই সদস্যের দায়িত্ব শুধুমাত্র সেই ডিভাইস থেকেই ছাড়া যাবে, এখান থেকে সম্ভব নয়।`);
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const ok = window.confirm(`"${m.name}"-এর দায়িত্ব ছেড়ে দিতে চান? এরপর যেকোনো সাইন-ইন করা ডিভাইস এই সদস্যের দায়িত্ব নিতে পারবে।`);
    if (!ok) return;
    try {
      await releaseMemberDoc(migrationState, m.id);
      setMembers(prev => prev.map(x => x.id === m.id ? {
        ...x,
        ownerUid: null
      } : x));
    } catch (err) {
      alert("দায়িত্ব ছাড়তে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleGoogleSignOut() {
    setIsMenuOpen(false);
    setShowAccountMenu(false);
    try {
      // পূর্বে এখানে signOutToFreshAnonymous() (auth.signOut() + নতুন
      // signInAnonymously()) কল হতো, যা একটা সম্পূর্ণ নতুন Firebase uid
      // তৈরি করত। এতে এই ডিভাইসে আগে claim করা সদস্যদের ownerUid-এর সাথে
      // নতুন uid আর মিলত না — ফলে "সাইন আউট" করার পরই দিনের এন্ট্রি
      // এডিট করা বন্ধ হয়ে যেত (device-claim লক)। শুধু Google লিংক সরালে
      // (unlink) একই uid বজায় থাকে, তাই আগের এডিট-অধিকার অক্ষুণ্ণ থাকে।
      await unlinkGoogleAccount();
      window.location.reload();
    } catch (err) {
      alert("সাইন আউট করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleDeleteGoogleAccount() {
    try {
      // একই কারণে এখানেও অতিরিক্ত signOutToFreshAnonymous() কল বাদ দেওয়া
      // হয়েছে — unlinkGoogleAccount() একাই যথেষ্ট এবং একই ডিভাইস uid
      // বজায় রাখে, তাই সদস্যদের এডিট-অধিকার অক্ষুণ্ণ থাকে।
      await unlinkGoogleAccount();
      setShowDeleteAccountWarning(false);
      window.alert("গুগল অ্যাকাউন্ট সফলভাবে রিমুভ করা হয়েছে এবং সাইন আউট সম্পন্ন হয়েছে। আপনার অ্যাপের সম্পূর্ণ ডাটা নিরাপদে আপনার ফ্যামিলি কাস্টম কোডের সাথে সংরক্ষিত আছে।");
      window.location.reload();
    } catch (err) {
      window.alert("একাউন্ট ডিলিট করতে সমস্যা হয়েছে: " + (err && err.message));
    }
  }
  function updateField(key, value) {
    if (isFutureDate(viewDate) || isLockedForThisDevice) return;
    entryDirtyRef.current = true;
    setEntry(prev => ({
      ...prev,
      [key]: value
    }));
  }
  function updateExcuse(key, value) {
    if (isFutureDate(viewDate) || isLockedForThisDevice) return;
    entryDirtyRef.current = true;
    setEntry(prev => ({
      ...prev,
      excused: {
        ...(prev.excused || {}),
        [key]: value
      }
    }));
  }
  async function handleSave() {
    if (!selectedId || isFutureDate(viewDate)) return;
    if (isLockedForThisDevice) {
      alert("এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে এডিট করা যাবে না।");
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    setSaving(true);
    try {
      const key = dateKey(viewDate);
      if (originalEntryRef.current) {
        await pushEntryHistory(migrationState, selectedId, key, originalEntryRef.current);
      }
      const toSave = {
        ...entry,
        lastEditedAt: Date.now()
      };
      await saveEntry(migrationState, selectedId, key, toSave, selectedMember?.ownerUid ?? null);
      originalEntryRef.current = toSave;
      setEntry(toSave);
      entryDirtyRef.current = false;
      localStorage.setItem("last_active_date", dateKey(new Date()));
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1600);
    } catch (err) {
      alert("ডাটা সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSaving(false);
    }
  }
  async function openHistoryModal() {
    if (!selectedId) return;
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const list = await fetchEntryHistory(migrationState, selectedId, dateKey(viewDate));
      setHistoryList(list);
    } finally {
      setLoadingHistory(false);
    }
  }
  function restoreHistoryVersion(versionValue) {
    try {
      const restored = JSON.parse(versionValue);
      setEntry(restored);
      setShowHistoryModal(false);
    } catch {
      alert("এই সংস্করণটি পুনরুদ্ধার করতে সমস্যা হয়েছে।");
    }
  }
  const streak = useMemo(() => calculateStreak(monthEntries, selectedMember, allFields, monthCursor.year, monthCursor.month0), [monthEntries, selectedMember, allFields, monthCursor]);
  const [milestoneToast, setMilestoneToast] = useState(null);
  useEffect(() => {
    if (!selectedId || !streak) return;
    const MILESTONES = [7, 30, 100, 365];
    const hit = MILESTONES.find(m => streak === m);
    if (!hit) return;
    const seenKey = `milestone_seen_${selectedId}_${hit}`;
    if (localStorage.getItem(seenKey)) return;
    localStorage.setItem(seenKey, "1");
    setMilestoneToast(hit);
  }, [streak, selectedId]);
  const monthStats = useMemo(() => {
    const total = daysInMonth(monthCursor.year, monthCursor.month0);
    let filled = 0;
    let scoreSum = 0;
    for (let d = 1; d <= total; d++) {
      const e = monthEntries[pad2(d)];
      const s = dailyScore(e, selectedMember, allFields);
      if (s !== null) {
        filled += 1;
        scoreSum += s;
      }
    }
    const avg = filled ? scoreSum / filled : 0;
    return {
      total,
      filled,
      avgPct: Math.round(avg * 100)
    };
  }, [monthEntries, monthCursor, selectedMember, allFields]);
  if (members === null || migrationState === undefined) return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center bg-[#F4F7F1]"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    color: "var(--theme-primary)",
    size: 32
  }));
  // Access Approval Gate — Step 4: pending accessRequest থাকলে সদস্য/এন্ট্রি
  // UI না দেখিয়ে শুধু এই স্ক্রিন দেখানো হচ্ছে। "রিফ্রেশ করুন" বাটনে সরাসরি
  // page reload — admin approve করলে পরের বার boot flow পাশ করে যাবে।
  if (accessPending) return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-semibold",
    style: { color: "var(--theme-primary)", fontFamily: "'Noto Serif Bengali', serif" }
  }, "অনুমোদনের অপেক্ষায়"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 max-w-xs"
  }, "এই পরিবারের ডাটা দেখতে এডমিনের অনুমোদন প্রয়োজন। অনুমোদন হলে এই পেজ রিফ্রেশ করুন।"), /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 rounded-2xl border shadow-sm bg-white",
    style: { color: "var(--theme-primary)" },
    onClick: () => window.location.reload()
  }, "রিফ্রেশ করুন"));
  if (printMode) {
    const total = monthStats.total;
    const rows = Array.from({
      length: total
    }, (_, i) => i + 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#111",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("style", null, `
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 3px 2px; font-size: 9px; text-align: center; vertical-align: middle; word-wrap: break-word; }
          th { background: var(--theme-primary) !important; color: #fff !important; font-weight: 600; font-size: 7.5px; padding: 2px; height: 42px; }
          tr { height: 27px; }

          .meeting-table th { background: #f0f4f1 !important; color: #000 !important; font-size: 11px; font-weight: 700; height: 30px; border: 1px solid #333; }
          .meeting-table td { font-size: 10px; padding: 6px; border: 1px solid #333; text-align: left; }
          .meeting-table tr { page-break-inside: avoid; break-inside: avoid; }
        `), /*#__PURE__*/React.createElement("div", {
      className: "w-full mx-auto print-page",
      style: {
        minHeight: "270mm"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2 no-print"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setPrintMode(false),
      className: "px-3 py-1.5 rounded-lg border text-sm font-semibold bg-white",
      style: {
        borderColor: "#D8DED3"
      }
    }, "← ফিরে যান"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.print(),
      className: "px-4 py-1.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2",
      style: {
        background: "var(--theme-primary)"
      }
    }, /*#__PURE__*/React.createElement(Printer, {
      size: 14
    }), " প্রিন্ট / PDF ডাউনলোড (২টি পেজ)")), /*#__PURE__*/React.createElement("div", {
      style: {
        borderBottom: "2px solid var(--theme-primary)",
        paddingBottom: "4px",
        marginBottom: "6px"
      },
      className: "flex justify-between items-end"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "'Noto Serif Bengali', serif",
        fontSize: 15,
        fontWeight: 700,
        margin: 0,
        color: "var(--theme-primary)"
      }
    }, "মাসিক আমল ও পারফরম্যান্স রিপোর্ট"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 9,
        margin: "2px 0 0 0",
        color: "#444"
      }
    }, "মাস: ", /*#__PURE__*/React.createElement("b", null, BN_MONTHS[monthCursor.month0], " ", toBn(monthCursor.year)), " \xA0|\xA0 সদস্য: ", /*#__PURE__*/React.createElement("b", null, selectedMember?.name))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        textAlign: "right",
        color: "#333"
      }
    }, "পূরণ করা দিন: ", /*#__PURE__*/React.createElement("b", null, toBn(monthStats.filled), "/", toBn(total)), " \xA0|\xA0 গড় স্কোর: ", /*#__PURE__*/React.createElement("b", null, toBn(monthStats.avgPct), "%"))), /*#__PURE__*/React.createElement("table", {
      className: "print-daily-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "26px"
      }
    }, "তাং"), allFields.map(f => /*#__PURE__*/React.createElement("th", {
      key: f.key
    }, f.shortLabel || f.label)), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "34px"
      }
    }, "স্কোর"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(d => {
      const e = monthEntries[pad2(d)];
      const s = dailyScore(e, selectedMember, allFields);
      return /*#__PURE__*/React.createElement("tr", {
        key: d
      }, /*#__PURE__*/React.createElement("td", {
        style: {
          fontWeight: 700,
          background: "#f0f4f1"
        }
      }, toBn(d)), allFields.map(f => {
        if (!fieldApplies(f, selectedMember)) return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: "#ccc"
          }
        }, "—");
        if (isFieldExcusable(f, selectedMember) && isExcused(e, f.key)) return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: "#9A8A5C",
            fontStyle: "italic",
            fontSize: "7px"
          }
        }, "ওজর");
        if (!e) return /*#__PURE__*/React.createElement("td", {
          key: f.key
        });
        const v = e[f.key];
        let disp = f.type === "bool" ? v ? "✓" : "" : v !== undefined && v !== "" ? toBn(v) : "";
        return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: f.type === "bool" && v ? "var(--theme-primary)" : "#111",
            fontWeight: f.type === "bool" && v ? "bold" : "normal"
          }
        }, disp);
      }), /*#__PURE__*/React.createElement("td", {
        style: {
          fontWeight: 700,
          background: "#f0f4f1"
        }
      }, s === null ? "" : toBn(Math.round(s * 100)) + "%"));
    })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        background: "#E7EEE3",
        fontWeight: 700
      }
    }, /*#__PURE__*/React.createElement("td", null, "%"), allFields.map(f => {
      const pct = fieldPercent(f, monthEntries, total, selectedMember);
      return /*#__PURE__*/React.createElement("td", {
        key: f.key
      }, pct === null ? "—" : toBn(pct) + "%");
    }), /*#__PURE__*/React.createElement("td", null, toBn(monthStats.avgPct), "%")))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        textTransform: "uppercase",
        color: "#888",
        textAlign: "right",
        marginTop: "4px"
      }
    }, "পৃষ্ঠা ১")), /*#__PURE__*/React.createElement("div", {
      className: "page-break w-full mx-auto print-page",
      style: {
        paddingTop: "8mm"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: "15px"
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: "16px",
        fontFamily: "'Noto Serif Bengali', serif",
        fontWeight: "bold",
        margin: "0 0 6px 0",
        color: "var(--theme-primary)",
        textAlign: "center"
      }
    }, "সাপ্তাহিক রিফ্লেকশন (Weekly Reflection)"), /*#__PURE__*/React.createElement("table", {
      className: "meeting-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "10%"
      }
    }, "সপ্তাহ"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "যা ভালো হয়েছে"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "কোথায় ঘাটতি ছিল"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "আগামী পরিকল্পনা"))), /*#__PURE__*/React.createElement("tbody", null, getWeekRanges(total).slice(0, weeklyRowCount).map(({
      week: w,
      start,
      end
    }) => /*#__PURE__*/React.createElement("tr", {
      key: w
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        fontWeight: "bold"
      }
    }, toBn(w), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        fontWeight: 400,
        color: "#555"
      }
    }, "(", toBn(start), "-", toBn(end), ")")), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.good || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.gap || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.plan || "")))))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: "12px",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "'Noto Serif Bengali', serif",
        fontSize: 20,
        fontWeight: 700,
        margin: 0,
        color: "#000"
      }
    }, "মাসিক পারিবারিক সভা ও সিদ্ধান্ত"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        right: "0",
        top: "5px",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#111"
      }
    }, (() => {
      const t = new Date();
      return `${toBn(t.getDate())} ${BN_MONTHS[t.getMonth()]}, ${toBn(t.getFullYear())}`;
    })())), /*#__PURE__*/React.createElement("table", {
      className: "meeting-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "8%",
        textAlign: "center"
      }
    }, "ক্রমিক"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "25%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "বিষয়"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "47%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "কার্যপরিধি/সিদ্ধান্ত"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "20%",
        textAlign: "center"
      }
    }, "বাস্তবায়নকারী"))), /*#__PURE__*/React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : [{}]).map((row, idx) => /*#__PURE__*/React.createElement("tr", {
      key: idx,
      style: {
        height: "40px"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        fontWeight: "bold"
      }
    }, toBn(idx + 1)), /*#__PURE__*/React.createElement("td", {
      style: {
        fontWeight: "600",
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, row.topic || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, row.decision || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        verticalAlign: "middle"
      }
    }, row.person || ""))))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        textTransform: "uppercase",
        color: "#888",
        textAlign: "right",
        marginTop: "10px"
      }
    }, "পৃষ্ঠা ২")));
  }
  const total = monthStats.total;
  const firstOfMonth = new Date(monthCursor.year, monthCursor.month0, 1);
  const leadBlanks = firstOfMonth.getDay();
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen pb-20 bg-[#F4F7F1]"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--theme-primary)"
    },
    className: "px-5 pt-6 pb-9 shadow-md relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement(StarMark, {
    size: 22
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold tracking-tight",
    style: {
      fontFamily: "'Noto Serif Bengali', serif",
      color: "#F4F7F1"
    }
  }, "Daily Task"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-emerald-200/80 -mt-1 font-medium"
  }, "আমল ও পারিবারিক ট্র্যাকার"))), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setIsMenuOpen(!isMenuOpen);
      setCodeRevealed(!isCustomFamilyCode);
    },
    className: "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/15 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all shadow-sm active:scale-95"
  }, /*#__PURE__*/React.createElement(MenuIcon, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "মেনু"), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 14,
    className: `transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`
  })), isMenuOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => setIsMenuOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 text-xs transition-all"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2 border-b border-slate-100 bg-slate-50/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement("span", null, "ফ্যামিলি কাস্টম কোড"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowFamilyCodeInfoModal(true);
    },
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-emerald-900 text-sm flex items-center justify-between mt-1"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => isCustomFamilyCode && setCodeRevealed(v => !v),
    className: "inline-block" + (isCustomFamilyCode ? " cursor-pointer" : ""),
    title: isCustomFamilyCode ? codeRevealed ? "লুকাতে ট্যাপ করুন" : "দেখতে ট্যাপ করুন" : undefined
  }, /*#__PURE__*/React.createElement("span", {
    className: "tracking-wide select-none"
  }, isCustomFamilyCode && !codeRevealed ? "••••••••" : getFamilyCode())), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowFamilyCodeChoiceModal(true);
      setIsMenuOpen(false);
    },
    className: "text-slate-500 hover:text-emerald-800 shrink-0 ml-2",
    title: "ফ্যামিলি কোড পরিবর্তন করুন"
  }, /*#__PURE__*/React.createElement(EditIcon, {
    size: 13
  })))), isAdmin && /*#__PURE__*/React.createElement("div", {
    className: "px-2 py-1 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setIsMenuOpen(false);
      setShowAccessRequestsModal(true);
      loadPendingAccessRequests();
    },
    className: "w-full text-left px-2 py-1.5 rounded-xl hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 text-xs font-semibold"
  }, /*#__PURE__*/React.createElement(UsersIcon, {
    size: 13
  }), " প্রবেশাধিকার অনুরোধ")), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(UsersIcon, {
    size: 12
  }), " সদস্যবৃন্দ"), /*#__PURE__*/React.createElement("div", {
    className: "max-h-36 overflow-y-auto custom-scrollbar px-2"
  }, members.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    onClick: () => {
      if (m.id !== selectedId && (entryDirtyRef.current || weeklyDirtyRef.current) && !window.confirm("সেভ না করা পরিবর্তন আছে (দৈনিক এন্ট্রি/সাপ্তাহিক রিফ্লেকশন)। সদস্য পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setSelectedId(m.id);
      setIsMenuOpen(false);
    },
    className: `flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer group ${m.id === selectedId ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-slate-50 text-slate-700"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(User, {
    size: 13
  }), " ", m.name), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, m.id === selectedId && /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-600"
  }), !m.ownerUid ? /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleClaimMember(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0",
    title: "এই সদস্যের দায়িত্ব নিন"
  }, "দায়িত্ব নিন") : m.ownerUid === (auth.currentUser && auth.currentUser.uid) ? /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleReleaseMember(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0",
    title: "আপনার দায়িত্বে আছে — ছেড়ে দিতে ট্যাপ করুন"
  }, "আপনার") : /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
    },
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 shrink-0 flex items-center gap-0.5 cursor-default",
    title: "অন্য ডিভাইসের দায়িত্বে আছে — শুধুমাত্র সেই ডিভাইস থেকেই দায়িত্ব ছাড়া যাবে"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 9
  }), " সংরক্ষিত"), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleRemoveMember(m);
    },
    disabled: isLockedForSwitch,
    className: "p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity",
    title: "সদস্য বাদ দিন"
  }, /*#__PURE__*/React.createElement(Trash, {
    size: 12
  })))))), !addingMember ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 mt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setAddingMember(true);
      setIsMenuOpen(false);
    },
    className: "flex-1 text-left px-4 py-1.5 text-emerald-800 font-bold hover:bg-slate-50 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 14
  }), " নতুন সদস্য যোগ করুন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowMemberInfoModal(true);
    },
    className: "text-slate-400 hover:text-emerald-700 pr-3 shrink-0",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 14
  }))) : null), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, "থিম কালার"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 px-4 py-1 flex-wrap"
  }, THEME_PRESETS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    type: "button",
    onClick: () => setThemeColor(t.color),
    title: t.name,
    className: "w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 border-2",
    style: {
      background: t.color,
      borderColor: themeColor === t.color ? "#16302B" : "transparent"
    }
  }, themeColor === t.color && /*#__PURE__*/React.createElement("span", {
    className: "text-white text-xs font-bold"
  }, "✓"))))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, "ডাটা ম্যানেজমেন্ট"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      handleCopyCode();
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CopyIcon, {
    size: 14
  }), " ফ্যামিলি কোড কপি করুন"), copiedCode && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-emerald-600 font-bold"
  }, "কপি হয়েছে!")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDriveBackupStatus(null);
      setShowBackupOptionsModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 14
  }), " ডাটা ব্যাকআপ রাখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowImportOptionsModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), " ইম্পোর্ট ব্যাকআপ ফাইল"), /*#__PURE__*/React.createElement("input", {
    ref: importFileInputRef,
    type: "file",
    accept: ".json,application/json,text/plain,text/json,application/octet-stream",
    onChange: e => {
      handleImportData(e);
      setShowImportOptionsModal(false);
    },
    className: "hidden"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setArchiveYear(monthCursor.year);
      setArchiveMonth0(monthCursor.month0);
      setShowArchiveModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 14
  }), " আর্কাইভ দেখুন (মাস/সাল)")), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowHelpModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 14
  }), " ব্যবহারের নিয়মাবলী"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium text-emerald-800"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 14
  }), " আমাদের জানান (পরামর্শ)"), isGoogleLinked() ? /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowAccountMenu(v => !v);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2 font-semibold text-emerald-900 truncate max-w-[160px]"
  }, /*#__PURE__*/React.createElement(User, {
    size: 14
  }), " ", (auth.currentUser && (auth.currentUser.displayName || auth.currentUser.email)) || "Google ব্যবহারকারী"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-500"
  }), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 12,
    className: `transition-transform duration-200 ${showAccountMenu ? "rotate-180" : ""}`
  }))), showAccountMenu && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 bg-slate-50/60"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGoogleSignOut,
    className: "w-full text-left pl-9 pr-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700 text-xs"
  }, /*#__PURE__*/React.createElement(LogOutIcon, {
    size: 13
  }), " সাইন আউট"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowAccountMenu(false);
      setShowDeleteAccountWarning(true);
    },
    className: "w-full text-left pl-9 pr-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 text-xs"
  }, /*#__PURE__*/React.createElement(Trash, {
    size: 13
  }), " ডিলিট গুগল একাউন্ট"))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowGoogleAccountModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-amber-50 flex items-center gap-2 text-amber-800 font-semibold"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 14,
    color: "#C89B3C"
  }), " Google অ্যাকাউন্ট (রিকমন্ডেড)")))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm",
    style: {
      background: "#C89B3C",
      color: "#16302B"
    }
  }, /*#__PURE__*/React.createElement(User, {
    size: 13
  }), " ", selectedMember ? selectedMember.name : "সদস্য বেছে নিন"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl shrink-0 border border-white/10"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "🔥"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-white"
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(streak)), " দিন"))), addingMember && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md"
  }, members.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-100 font-semibold px-1 mb-1.5"
  }, "শুরু করতে আপনার নাম ও জেন্ডার দিয়ে নিজেকে একজন সদস্য হিসেবে যোগ করুন 👇"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: newName,
    onChange: e => setNewName(e.target.value),
    placeholder: "সদস্যের নাম...",
    className: "flex-1 px-3 py-1.5 rounded-xl text-xs text-slate-900 outline-none font-medium"
  }), /*#__PURE__*/React.createElement("select", {
    value: newGender,
    onChange: e => setNewGender(e.target.value),
    className: "px-2 py-1.5 rounded-xl text-xs text-slate-900 bg-white outline-none font-medium"
  }, /*#__PURE__*/React.createElement("option", {
    value: "male"
  }, "পুরুষ"), /*#__PURE__*/React.createElement("option", {
    value: "female"
  }, "নারী")), /*#__PURE__*/React.createElement("button", {
    onClick: handleAddMember,
    disabled: isLockedForSwitch,
    className: "px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C89B3C] text-[#16302B]"
  }, "যোগ"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddingMember(false),
    className: "p-1.5 text-white/80"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl mx-auto"
  }, updateAvailable && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#C89B3C] rounded-2xl p-3.5 flex items-center gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "🔔"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-[#16302B]"
  }, "নতুন আপডেট এসেছে!"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#16302B]/80 mt-0.5"
  }, "নতুন ফিচার যুক্ত হয়েছে — রিফ্রেশ করে দেখুন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.location.reload(),
    className: "bg-[#16302B] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shrink-0"
  }, "রিফ্রেশ করুন"))), recoveryMessage && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-[#0E4B43] to-[#153f39] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🌱"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আবার শুরু করুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-100/90 leading-relaxed mt-0.5"
  }, "আগের দিনগুলো নিয়ে ভাববেন না — আজ থেকেই নতুনভাবে শুরু করুন।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      localStorage.setItem("recovery_dismissed_on", dateKey(new Date()));
      setRecoveryMessage(false);
    },
    className: "text-emerald-200/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), weeklyReminderBanner && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#C0286B] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🗓️"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "সাপ্তাহিক রিফ্লেকশন করতে ভুলবেন না যেন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "এই সপ্তাহের ভালো-মন্দ ও পরিকল্পনা লিখে রাখুন — নিচে স্ক্রল করে পূরণ করতে পারবেন।")), /*#__PURE__*/React.createElement("button", {
    onClick: dismissWeeklyReminder,
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), monthlyReminderBanner && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#9F1239] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "👨‍👩‍👧‍👦"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আজ মাসিক পারিবারিক পর্যালোচনার দিন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "পরিবারের সবাইকে নিয়ে বসুন এবং অগ্রগতি মূল্যায়ন করুন। সভা শেষে পিডিএফ ফাইল ডাউনলোড ও ডাটার ব্যাকআপ নিতে ভুলবেন না।")), /*#__PURE__*/React.createElement("button", {
    onClick: dismissMonthlyReminder,
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), codeChangeNotice && /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#0E4B43] rounded-2xl p-4 flex items-start gap-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🔔"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-white"
  }, "আপনাদের ফ্যামিলি কোড এডমিন কর্তৃক পরিবর্তন করা হয়েছে"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-white/80 leading-relaxed mt-0.5"
  }, "বর্তমান কোড: " + codeChangeNotice)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCodeChangeNotice(null),
    className: "text-white/70 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    onTouchStart: handleDateTouchStart,
    onTouchEnd: handleDateTouchEnd,
    className: "bg-white rounded-2xl shadow-sm px-4 py-2.5 flex items-center justify-between border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setViewDate(d => {
        const n = new Date(d);
        n.setDate(n.getDate() - 1);
        return n;
      });
    },
    className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm text-slate-800 flex flex-col items-center gap-0.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace", fontWeight: 700 }
  }, toBn(viewDate.getDate())), " ", BN_MONTHS[viewDate.getMonth()], " ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace", fontWeight: 700 }
  }, toBn(viewDate.getFullYear())))), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-semibold text-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, toBn(getHijriDate(viewDate).day)), " ", getHijriDate(viewDate).month, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
    }
  }, toBn(getHijriDate(viewDate).year)), " হিজরি")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setViewDate(d => {
        const n = new Date(d);
        n.setDate(n.getDate() + 1);
        return n;
      });
    },
    className: "w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-700"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-3"
  }, (() => {
    const insp = getDailyInspiration(viewDate);
    const tagLabel = insp.type === "ayat" ? "আয়াত" : insp.type === "hadith" ? "হাদীস" : "উক্তি";
    return /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl p-4 shadow-sm",
      style: {
        background: "linear-gradient(135deg, var(--theme-primary), #153f39)"
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] font-bold mb-1.5",
      style: {
        color: "#C89B3C"
      }
    }, "✦ আজকের তাযকিরাহ · ", tagLabel), /*#__PURE__*/React.createElement("p", {
      className: "text-[12px] text-white leading-relaxed"
    }, insp.text), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-emerald-200/70 mt-1.5 text-right"
    }, "— ", insp.ref));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-5 space-y-4"
  }, /*#__PURE__*/React.createElement(FieldGroup, {
    title: "দৈনন্দিন আমল",
    fields: DEFAULT_DEEN_FIELDS,
    entry: entry,
    onChange: updateField,
    onToggleExcuse: updateExcuse,
    onInfoClick: () => setShowExcuseInfoModal(true),
    member: selectedMember,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice
  }), /*#__PURE__*/React.createElement(FieldGroup, {
    title: "ব্যক্তিগত ও পারিবারিক অভ্যাস",
    fields: DEFAULT_DUNIYA_FIELDS,
    entry: entry,
    onChange: updateField,
    member: selectedMember,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-900"
  }, "কাস্টম টাস্ক (ব্যক্তিগত লক্ষ্য)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddCustom(true),
    className: "text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " নতুন টাস্ক")), customFields.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 text-center py-2"
  }, "কোন কাস্টম টাস্ক নেই। উপরে বোতামে ক্লিক করে যোগ করুন।") : customFields.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    className: "flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0" + (isFutureDate(viewDate) || isLockedForThisDevice ? " opacity-40" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-slate-700"
  }, /*#__PURE__*/React.createElement(LabelText, {
    text: f.label
  })), /*#__PURE__*/React.createElement(BoolToggle, {
    value: !!entry[f.key],
    onChange: v => updateField(f.key, v),
    disabled: isFutureDate(viewDate) || isLockedForThisDevice
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold text-slate-800 mb-2"
  }, "দিনের নোট / আত্ম-সমালোচনা"), /*#__PURE__*/React.createElement("textarea", {
    value: entry.note || "",
    onChange: e => updateField("note", e.target.value),
    rows: 2,
    placeholder: "আজকের অনুভূতি, অর্জন বা শেখা বিষয় লিখুন...",
    disabled: isFutureDate(viewDate) || isLockedForThisDevice,
    className: "w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-emerald-700 transition-all resize-none bg-slate-50/50 focus:bg-white disabled:opacity-40"
  })), entry.lastEditedAt && !isFutureDate(viewDate) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400 font-medium"
  }, "সর্বশেষ পরিবর্তন: ", formatBnDateTime(entry.lastEditedAt)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openHistoryModal,
    className: "flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950"
  }, /*#__PURE__*/React.createElement(ClockIcon, {
    size: 12
  }), " ইতিহাস দেখুন")), isFutureDate(viewDate) && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3"
  }, "ভবিষ্যতের তারিখের জন্য আমল টিক দেওয়া যাবে না — আজকের তারিখে ফিরে যান।"), isLockedForThisDevice && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-center text-slate-600 bg-slate-100 border border-slate-200 rounded-xl py-2 px-3"
  }, "এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে শুধু দেখা যাবে, এডিট করা যাবে না।"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: isFutureDate(viewDate) || isLockedForThisDevice || isLockedForSwitch,
    className: "w-full h-12 rounded-2xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100",
    style: {
      background: savedTick ? "#4C8C74" : "var(--theme-primary)"
    }
  }, saving ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 18
  }) : savedTick ? "সেভ হয়েছে!" : "আজকের ডাটা সেভ করুন")), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-sm text-slate-800"
  }, "সাপ্তাহিক রিফ্লেকশন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowWeeklyInfoModal(true),
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), weeklyRowCount < getWeekRanges(monthStats.total).length && /*#__PURE__*/React.createElement("button", {
    onClick: addWeeklyRow,
    className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " সারি যোগ করুন")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse min-w-[560px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-2 border-r border-slate-200 text-center w-16"
  }, "সপ্তাহ"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "যা ভালো হয়েছে"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "কোথায় ঘাটতি ছিল"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 text-left"
  }, "আগামী সপ্তাহের পরিকল্পনা"))), /*#__PURE__*/React.createElement("tbody", null, getWeekRanges(monthStats.total).slice(0, weeklyRowCount).map(({
    week: w,
    start,
    end
  }) => /*#__PURE__*/React.createElement("tr", {
    key: w,
    className: "border-b border-slate-200 hover:bg-slate-50/50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-emerald-900 bg-slate-50/80"
  }, "সপ্তাহ ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(w)), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] font-semibold text-slate-400 mt-0.5",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, "(", toBn(start), "-", toBn(end), ")")), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.good || "",
    onChange: e => updateWeekly(w, "good", e.target.value),
    placeholder: "এই সপ্তাহে যা ভালো হয়েছে...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.gap || "",
    onChange: e => updateWeekly(w, "gap", e.target.value),
    placeholder: "কোথায় ঘাটতি ছিল...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: weekly[w]?.plan || "",
    onChange: e => updateWeekly(w, "plan", e.target.value),
    placeholder: "আগামী সপ্তাহের পরিকল্পনা...",
    rows: 2,
    disabled: isLockedForThisDevice,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none disabled:opacity-50 disabled:bg-slate-50"
  }))))))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveWeekly,
    disabled: isLockedForThisDevice || isLockedForSwitch,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
  }, savingWeekly ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : weeklySavedTick ? "সেভ হয়েছে!" : "সাপ্তাহিক রিফ্লেকশন সেভ করুন"))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold flex items-center gap-1.5 text-sm text-slate-800"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " মাসিক ওভারভিউ"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMonthRefreshKey(k => k + 1),
    title: "ক্যালেন্ডার রিফ্রেশ করুন",
    className: "w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-emerald-800 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(RefreshIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if ((weeklyDirtyRef.current || meetingDirtyRef.current) && !window.confirm("সাপ্তাহিক রিফ্লেকশন বা মাসিক সভায় সেভ না করা পরিবর্তন আছে। মাস পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setMonthCursor(c => c.month0 === 0 ? {
        year: c.year - 1,
        month0: 11
      } : {
        year: c.year,
        month0: c.month0 - 1
      });
    },
    className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold px-1 text-slate-700"
  }, BN_MONTHS[monthCursor.month0], " ", /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthCursor.year))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if ((weeklyDirtyRef.current || meetingDirtyRef.current) && !window.confirm("সাপ্তাহিক রিফ্লেকশন বা মাসিক সভায় সেভ না করা পরিবর্তন আছে। মাস পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setMonthCursor(c => c.month0 === 11 ? {
        year: c.year + 1,
        month0: 0
      } : {
        year: c.year,
        month0: c.month0 + 1
      });
    },
    className: "w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 14
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 pb-3 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold"
  }, "গড় স্কোর"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-emerald-950",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthStats.avgPct), "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold"
  }, "পূরণ করা দিন"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-emerald-950",
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(monthStats.filled), "/", toBn(total))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPrintMode(true),
    className: "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-100 hover:bg-emerald-100 transition-all"
  }, /*#__PURE__*/React.createElement(Printer, {
    size: 13
  }), " PDF / প্রিন্ট (২ পেজ)")), /*#__PURE__*/React.createElement(ProgressChart, {
    monthEntries: monthEntries,
    totalDays: monthStats.total,
    member: selectedMember,
    allFields: allFields
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7 gap-1.5"
  }, BN_WEEKDAYS.map(w => /*#__PURE__*/React.createElement("div", {
    key: w,
    className: "text-center text-[9px] font-bold text-slate-400"
  }, w)), Array.from({
    length: leadBlanks
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: "b" + i
  })), Array.from({
    length: total
  }, (_, i) => i + 1).map(d => {
    const e = monthEntries[pad2(d)];
    const s = dailyScore(e, selectedMember, allFields);
    const cellDate = new Date(monthCursor.year, monthCursor.month0, d);
    return /*#__PURE__*/React.createElement("button", {
      key: d,
      onClick: () => {
        if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
        setViewDate(cellDate);
      },
      className: "h-7 w-full rounded-lg flex items-center justify-center text-[10px] font-bold transition-transform active:scale-90 shadow-sm",
      style: {
        background: scoreColor(s),
        color: s !== null && s >= 0.35 ? "#fff" : "#555",
        fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace"
      }
    }, toBn(d));
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "px-5 mt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-sm text-slate-800"
  }, "মাসিক পারিবারিক সভা ও সিদ্ধান্ত"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowMeetingInfoModal(true),
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold"
  }, "লাইভ সিংক")), /*#__PURE__*/React.createElement("button", {
    onClick: addMeetingRow,
    className: "px-2.5 py-1 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-900 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12
  }), " সারি যোগ করুন")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pb-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 font-medium"
  }, BN_MONTHS[monthCursor.month0], "'", toBn(monthCursor.year), " — সভার তারিখ অটোমেটিক আজকের তারিখ (", (() => {
    const t = new Date();
    return `${toBn(t.getDate())} ${BN_MONTHS[t.getMonth()]}, ${toBn(t.getFullYear())}`;
  })(), ") হিসেবে দেখাবে")), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse min-w-[500px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
  }, /*#__PURE__*/React.createElement("th", {
    onClick: addMeetingRow,
    title: "নতুন সারি যোগ করতে ক্লিক করুন",
    className: "py-2.5 px-2 border-r border-slate-200 text-center w-12 cursor-pointer hover:bg-emerald-100 text-emerald-900 transition-colors select-none"
  }, "ক্র. ✚"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left w-1/4"
  }, "বিষয়"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-left"
  }, "কার্যপরিধি/সিদ্ধান্ত"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-3 border-r border-slate-200 text-center w-1/4"
  }, "বাস্তবায়নকারী"), /*#__PURE__*/React.createElement("th", {
    className: "py-2.5 px-1 text-center w-8"
  }))), /*#__PURE__*/React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : []).map((row, idx) => /*#__PURE__*/React.createElement("tr", {
    key: row.id || idx,
    className: "border-b border-slate-200 hover:bg-slate-50/50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 px-1 border-r border-slate-200 text-center font-bold text-xs text-slate-700 bg-slate-50/80"
  }, toBn(idx + 1)), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: row.topic || "",
    onChange: e => updateMeetingRow(idx, "topic", e.target.value),
    placeholder: "বিষয়...",
    rows: 2,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 font-semibold bg-white resize-none"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("textarea", {
    value: row.decision || "",
    onChange: e => updateMeetingRow(idx, "decision", e.target.value),
    placeholder: "কার্যপরিধি/সিদ্ধান্ত...",
    rows: 2,
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white resize-none"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1.5 border-r border-slate-200"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: row.person || "",
    onChange: e => updateMeetingRow(idx, "person", e.target.value),
    placeholder: "বাস্তবায়নকারী",
    className: "w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 text-center font-medium bg-white"
  })), /*#__PURE__*/React.createElement("td", {
    className: "p-1 text-center"
  }, meetingState.rows.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => removeMeetingRow(idx),
    className: "text-red-400 hover:text-red-600 p-1"
  }, /*#__PURE__*/React.createElement(Trash, {
    size: 14
  })))))))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveMeeting,
    disabled: isLockedForSwitch,
    className: "w-full h-11 rounded-2xl font-bold text-white text-xs bg-emerald-900 flex items-center justify-center gap-2 shadow-sm"
  }, savingMeeting ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 16
  }) : meetingSavedTick ? "সেভ ও সিংক হয়েছে!" : "মাসিক সভা ও সিদ্ধান্ত সেভ করুন")))), showArchiveModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "আর্কাইভ দেখুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "যে মাস ও সালের ডাটা দেখতে চান তা বেছে নিন — সাথে সাথে সেই মাসের দৈনিক এন্ট্রি, মাসিক ওভারভিউ ও সভার তথ্য দেখা যাবে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("select", {
    value: archiveMonth0,
    onChange: e => setArchiveMonth0(parseInt(e.target.value, 10)),
    className: "flex-1 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white"
  }, BN_MONTHS.map((m, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, m))), /*#__PURE__*/React.createElement("select", {
    value: archiveYear,
    onChange: e => setArchiveYear(parseInt(e.target.value, 10)),
    className: "w-28 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white"
  }, Array.from({
    length: 8
  }, (_, i) => new Date().getFullYear() - 6 + i).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, toBn(y))))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGoToArchive,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold"
  }, "দেখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowArchiveModal(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showFamilyCodeChoiceModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-3 text-slate-800"
  }, "ফ্যামিলি কোড"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowFamilyCodeChoiceModal(false);
      setNewFamCodeInput("");
      setShowCreateNewFamilyModal(true);
    },
    className: "w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 text-xs font-semibold border border-slate-100"
  }, /*#__PURE__*/React.createElement(EditIcon, {
    size: 13
  }), " নতুন ফ্যামিলি কোড তৈরি করুন"), isAdmin && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowFamilyCodeChoiceModal(false);
      setRenameFamCodeInput("");
      setShowRenameFamilyCodeModal(true);
    },
    className: "w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 text-xs font-semibold border border-slate-100"
  }, /*#__PURE__*/React.createElement(EditIcon, {
    size: 13
  }), " বিদ্যমান ফ্যামিলি কোড পরিবর্তন করুন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowFamilyCodeChoiceModal(false);
      setJoinFamCodeInput("");
      setShowJoinFamilyModal(true);
    },
    className: "w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 text-xs font-semibold border border-slate-100"
  }, /*#__PURE__*/React.createElement(EditIcon, {
    size: 13
  }), " বিদ্যমান ফ্যামিলি কোড দিয়ে যোগ দিন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFamilyCodeChoiceModal(false),
    className: "w-full h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold mt-3"
  }, "বাতিল"))), showCreateNewFamilyModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "নতুন ফ্যামিলি কোড তৈরি করুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "একটি অনন্য কোড দিন — এটি সম্পূর্ণ নতুন, খালি একটি ফ্যামিলি স্পেস তৈরি করবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডাটা অক্ষত থাকবে। ছোট/বড় হাতের ইংরেজি অক্ষর, সংখ্যা ও বিশেষ চিহ্ন ব্যবহার করা যাবে (space, /, \\, ' এবং \" ছাড়া), কমপক্ষে ৯ ক্যারেক্টার।"), /*#__PURE__*/React.createElement("input", {
    value: newFamCodeInput,
    onChange: e => setNewFamCodeInput(e.target.value),
    placeholder: "যেমন: Fam-Khan-2026",
    maxLength: 30,
    disabled: newFamCodeBusy,
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-bold text-emerald-900 focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCreateNewFamily,
    disabled: newFamCodeBusy,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
  }, newFamCodeBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : "তৈরি করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowCreateNewFamilyModal(false),
    disabled: newFamCodeBusy,
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showJoinFamilyModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "বিদ্যমান ফ্যামিলি কোড দিয়ে যোগ দিন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "যে ফ্যামিলিতে যোগ দিতে চান তার কোড লিখুন — এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে এবং আপনার যোগদানের অনুরোধ সেই ফ্যামিলির Admin-এর অনুমোদনের অপেক্ষায় থাকবে। বর্তমান ফ্যামিলির ডাটা অক্ষত থাকবে।"), /*#__PURE__*/React.createElement("input", {
    value: joinFamCodeInput,
    onChange: e => setJoinFamCodeInput(e.target.value),
    placeholder: "যেমন: FAM-XXXXXXXXX",
    maxLength: 30,
    disabled: joinFamCodeBusy,
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-bold text-emerald-900 focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleJoinExistingFamily,
    disabled: joinFamCodeBusy,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
  }, joinFamCodeBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : "যোগ দিন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowJoinFamilyModal(false),
    disabled: joinFamCodeBusy,
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showRenameFamilyCodeModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "নিজের ফ্যামিলির কোড পরিবর্তন করুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "শুধু পরিবারের পরিচিতি-কোড বদলাবে — আপনার পরিবারের সব ডাটা (সদস্য, দৈনিক এন্ট্রি, সাপ্তাহিক রিফ্লেকশন) সম্পূর্ণ অক্ষত থাকবে, কোনো কপি বা লস হবে না। পরিবর্তনের পর বাকি সদস্যদের ডিভাইসে অ্যাপ খোলার সাথে সাথেই নতুন কোড অটো বসে যাবে এবং একটি নোটিশ দেখাবে — আলাদাভাবে জানানোর দরকার নেই।"), /*#__PURE__*/React.createElement("input", {
    value: renameFamCodeInput,
    onChange: e => setRenameFamCodeInput(e.target.value),
    placeholder: "নতুন কোড লিখুন",
    maxLength: 30,
    disabled: renameFamCodeBusy,
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-bold text-emerald-900 focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleRenameFamilyCode,
    disabled: renameFamCodeBusy,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
  }, renameFamCodeBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : "কোড পরিবর্তন করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowRenameFamilyCodeModal(false),
    disabled: renameFamCodeBusy,
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showAccessRequestsModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "প্রবেশাধিকার অনুরোধ"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAccessRequestsModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), loadingAccessRequests ? /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center py-6"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 20,
    color: "var(--theme-primary)"
  })) : pendingAccessRequests.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 py-3 text-center"
  }, "কোনো পেন্ডিং অনুরোধ নেই।") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 max-h-72 overflow-y-auto"
  }, pendingAccessRequests.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    className: "flex items-center justify-between gap-2 border border-slate-100 rounded-xl px-3 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600 truncate",
    title: r.id
  }, r.id.slice(0, 10) + "…"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => decideAccessRequest(r.id, "approved"),
    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-700 text-white"
  }, "অনুমোদন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => decideAccessRequest(r.id, "denied"),
    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-600"
  }, "প্রত্যাখ্যান"))))))), showGoogleAccountModal && /*#__PURE__*/React.createElement(GoogleAccountModal, {
    onClose: () => setShowGoogleAccountModal(false),
    onLinked: checkDriveBackupAfterLink
  }), showBackupOptionsModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ডাটা ব্যাকআপ রাখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowBackupOptionsModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "কোথায় ব্যাকআপ রাখতে চান তা বেছে নিন।"), driveBackupStatus && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-3 " + (driveBackupStatus.type === "ok" ? "text-emerald-700" : "text-red-600")
  }, driveBackupStatus.text), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleDriveBackupClick,
    disabled: driveBackupBusy,
    className: "w-full h-11 rounded-xl text-left px-3 bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
  }, driveBackupBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), isGoogleLinked() ? "Google Drive-এ ব্যাকআপ রাখুন" : "Google Drive-এ ব্যাকআপ রাখুন (আগে সাইন ইন করতে হবে)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      handleExportData();
      setShowBackupOptionsModal(false);
    },
    className: "w-full h-11 rounded-xl text-left px-3 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 14
  }), "আপনার ডিভাইসে ব্যাকআপ রাখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: handleBothBackupClick,
    disabled: driveBackupBusy,
    className: "w-full h-11 rounded-xl text-left px-3 border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-2 disabled:opacity-60"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), "Google Drive ও আপনার ডিভাইস — উভয় জায়গায় ব্যাকআপ রাখুন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowBackupOptionsModal(false),
    className: "w-full h-9 mt-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বন্ধ করুন"))), showImportOptionsModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ইম্পোর্ট ব্যাকআপ ফাইল"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImportOptionsModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "কোথা থেকে ইম্পোর্ট করতে চান তা বেছে নিন।"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleManualDriveRestoreClick,
    disabled: driveRestoreChecking,
    className: "w-full h-11 rounded-xl text-left px-3 bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
  }, driveRestoreChecking ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 14
  }), "Google Drive থেকে Restore করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowImportOptionsModal(false);
      importFileInputRef.current && importFileInputRef.current.click();
    },
    className: "w-full h-11 rounded-xl text-left px-3 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), "ডিভাইস থেকে ইম্পোর্ট করুন (.json)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImportOptionsModal(false),
    className: "w-full h-9 mt-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বন্ধ করুন"))), showDriveRestoreModal && driveRestoreCandidate && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "☁️"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "Google Drive-এ ব্যাকআপ পাওয়া গেছে")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-2"
  }, "ফ্যামিলি কোড: ", /*#__PURE__*/React.createElement("b", null, (driveRestoreCandidate.appProperties && driveRestoreCandidate.appProperties.familyCode) || "অজানা"), driveRestoreCandidate.modifiedTime ? " · সর্বশেষ পরিবর্তন: " + new Date(driveRestoreCandidate.modifiedTime).toLocaleString("bn-BD") : ""), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "এই ব্যাকআপ থেকে ডাটা রিস্টোর (মার্জ) করবেন? বর্তমান ডিভাইসের ডাটার সাথে merge হবে — কোনো ডাটা হারাবে না; দুই জায়গায় একই এন্ট্রি থাকলে যেটি বেশি সাম্প্রতিক (updatedAt) সেটি রাখা হবে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDriveRestoreModal(false),
    disabled: driveRestoreBusy,
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold disabled:opacity-50"
  }, "এখন না"), /*#__PURE__*/React.createElement("button", {
    onClick: handleConfirmDriveRestore,
    disabled: driveRestoreBusy,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
  }, driveRestoreBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : null, "রিস্টোর করুন")))), showDeleteAccountWarning && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "⚠️"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "গুগল একাউন্ট ডিলিট নিশ্চিত করুন")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "এটি আপনার ডিভাইস থেকে গুগল অ্যাকাউন্ট সরিয়ে ফেলবে এবং সাইন আউট করে দেবে। তবে এতে আপনার অ্যাপের মূল ডাটার কোনো ক্ষতি হবে না — আপনার সম্পূর্ণ ডাটা নিরাপদে আপনার ফ্যামিলি কাস্টম কোডের সাথে সংরক্ষিত থাকবে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteAccountWarning(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল"), /*#__PURE__*/React.createElement("button", {
    onClick: handleDeleteGoogleAccount,
    className: "flex-1 h-9 bg-red-600 text-white rounded-xl text-xs font-bold"
  }, "হ্যাঁ, ডিলিট করুন")))), showFamilyCodeInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ফ্যামিলি কাস্টম কোড"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFamilyCodeInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "একটি ইউনিক ফ্যামিলি কোড তৈরি করুন (যেমন: Fam-Khan@2026)। পরিবারের সবাই একই কোড ব্যবহার করলে সবার ডাটা স্বয়ংক্রিয়ভাবে সিংক হবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800 mb-1.5"
  }, "নিয়ম:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-600 leading-relaxed mb-3 space-y-1 list-disc pl-4"
  }, /*#__PURE__*/React.createElement("li", null, "কোড কমপক্ষে ৯ অক্ষরের হতে হবে।"), /*#__PURE__*/React.createElement("li", null, "ইংরেজি বড়/ছোট হাতের অক্ষর, সংখ্যা ও বিশেষ চিহ্ন ব্যবহার করা যাবে।"), /*#__PURE__*/React.createElement("li", null, "Space, / (স্ল্যাশ), \\ (ব্যাকস্ল্যাশ) এবং ' \" (কোটেশন চিহ্ন) ব্যবহার করা যাবে না।"), /*#__PURE__*/React.createElement("li", null, "কোডটি স্বয়ংক্রিয়ভাবে masked (••••) থাকবে — দেখতে চাইলে ডটের ওপর ট্যাপ করুন।")), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-amber-900 mb-1"
  }, "বিশেষ দ্রষ্টব্য:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed"
  }, "ডাটা সিংক হওয়ার পর \"সদস্যবৃন্দ\" তালিকায় আপনার নাম দেখা যাবে — সেখানে আপনার নামের পাশে \"দায়িত্ব নিন\" বাটনে ট্যাপ করুন।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowFamilyCodeInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showMemberInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " তথ্য / নির্দেশনা"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMemberInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "যাদের নিজস্ব স্মার্টফোন নেই, শুধু তাদের নাম এখানে ম্যানুয়ালি যোগ করুন। তাদের আমল ও তথ্য এই ডিভাইস থেকেই সংরক্ষণ ও পরিচালনা করা যাবে।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMemberInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showExcuseInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ওজর কী?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExcuseInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "অসুস্থতা, সফর কিংবা নারীদের বিশেষ সময়ে কোনো আমল পূর্ণ করা সম্ভব না হলে পাশের \"ওজর\" বাটনে ট্যাপ করুন।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800 mb-1.5"
  }, "ওজর সিলেক্ট করলে যা হবে:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-600 leading-relaxed mb-3 space-y-1 list-disc pl-4"
  }, /*#__PURE__*/React.createElement("li", null, "ইনপুট অপশনটি বন্ধ হয়ে যাবে।"), /*#__PURE__*/React.createElement("li", null, "সেদিনের দৈনিক স্কোর, স্ট্রীক (ধারাবাহিকতা), ক্যালেন্ডার, গ্রাফ ও রিপোর্টে আমলটি সেদিনের \"হিসাবের বাইরে\" থাকবে — অর্থাৎ নেগেটিভ বা মিসড হিসেবে গণ্য হবে না।")), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-amber-900 mb-1"
  }, "বিশেষ দ্রষ্টব্য:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed mb-1.5"
  }, "১. পুরুষদের ক্ষেত্রে: ফরজ সালাতে \"ওজর\" প্রযোজ্য নয়। শরঈ বিধান অনুযায়ী অসুস্থতা বা সফরেও সাধ্যমতো ওয়াক্তেই ফরজ সালাত আদায় করতে হবে। ওয়াক্তে আদায় না হলে পরে তা কাযা আদায় করতে হবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed"
  }, "২. নারীদের ক্ষেত্রে: কেবল হায়েজ ও নেফাস অবস্থায় ফরজ সালাতে \"ওজর\" প্রযোজ্য। এ সময়ের সালাত পরে কাযা করতে হয় না। তবে অসুস্থতা বা সফরের কারণে ফরজ সালাতে \"ওজর\" প্রযোজ্য নয়; সাধ্যমতো ওয়াক্তেই সালাত আদায় করতে হবে। ওয়াক্তে আদায় না হলে পরে তা কাযা আদায় করতে হবে।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExcuseInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showWeeklyInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " সাপ্তাহিক রিফ্লেকশন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowWeeklyInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "প্রতি সপ্তাহ শেষে নিজের আমল ও কাজের পর্যালোচনা করুন। এই সপ্তাহে কোন কাজগুলো ভালো হয়েছে এবং কোথায় আরও উন্নতি করা প্রয়োজন, তা এখানে সংক্ষিপ্ত নোট হিসেবে লিখে রাখুন। নতুন সপ্তাহ বা তথ্য যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হয়ে যাবে।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowWeeklyInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showMeetingInfoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " মাসিক পারিবারিক সভা"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMeetingInfoModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "মাস শেষে পরিবারের সবাইকে নিয়ে বসুন এবং বিগত মাসের অগ্রগতি মূল্যায়ন করুন। নতুন বিষয় বা সিদ্ধান্ত যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হবে। সভায় আলোচিত গুরুত্বপূর্ণ বিষয় ও সিদ্ধান্তগুলো লিখুন এবং সভা শেষে চাইলে পিডিএফ ফাইল ডাউনলোড এবং ডাটা ব্যাকআপ করে রাখতে পারেন।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMeetingInfoModal(false),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showAddCustom && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-2 text-slate-800"
  }, "নতুন কাস্টম টাস্কের নাম"), /*#__PURE__*/React.createElement("input", {
    value: newCustomLabel,
    onChange: e => setNewCustomLabel(e.target.value),
    placeholder: "যেমন: ২ লিটার পানি পান",
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-medium focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleAddCustomField,
    disabled: isLockedForSwitch,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold"
  }, "যোগ করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddCustom(false),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showHelpModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-md shadow-xl border border-slate-100 max-h-[80vh] overflow-y-auto custom-scrollbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 border-b pb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ব্যবহারের নিয়মাবলী"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHelpModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 space-y-2.5 leading-relaxed font-medium"
  }, /*#__PURE__*/React.createElement("p", null, "১. কাস্টম ফ্যামিলি কোড তৈরি করে পরিবারের সকল সদস্যের ডিভাইসে একই কোড বসিয়ে ডাটা রিয়েল-টাইমে সিংক করুন।"), /*#__PURE__*/React.createElement("p", null, "২. মাসের শেষে দৈনিক রিপোর্ট, সাপ্তাহিক রিফ্লেকশন এবং পারিবারিক সভার কার্যপরিধি — সবকিছু একসাথে ২ পৃষ্ঠার PDF ফাইল হিসেবে প্রিন্ট/সেভ দেওয়া যাবে।"), /*#__PURE__*/React.createElement("p", null, "৩. প্রিন্ট কপির বাম পাশে পাঞ্চ মার্জিন রাখা হয়েছে যা ফাইলে বাইন্ডিং করার উপযুক্ত।"), /*#__PURE__*/React.createElement("p", null, "৪. মেনু থেকে \"ডাটা ব্যাকআপ রাখুন\"-এ ক্লিক করে Google Drive ও ডিভাইসে আপনার ডাটা ব্যাকআপ রাখুন।"), /*#__PURE__*/React.createElement("p", null, "৫. অ্যাপটির সকল ফিচার সঠিকভাবে ব্যবহার করতে বিভিন্ন অপশনের পাশে থাকা ⓘ (ইনফো) আইকনে ট্যাপ করে নির্দেশনাগুলো পড়ে নিন।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHelpModal(false),
    className: "w-full mt-5 h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি"))), showFeedbackModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 16,
    color: "var(--theme-primary)"
  }), " পরামর্শ জানান"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(false);
      setFeedbackStatus(null);
    }
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "আপনার মতামত বা পরামর্শ লিখুন। এটি সরাসরি Daily Task Team-এর কাছে চলে যাবে।"), /*#__PURE__*/React.createElement("textarea", {
    value: feedbackMsg,
    onChange: e => setFeedbackMsg(e.target.value),
    rows: 4,
    placeholder: "আপনার অমূল্য পরামর্শ লিখুন...",
    disabled: feedbackSending,
    className: "w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-800 resize-none mb-2 bg-slate-50/50 disabled:opacity-60"
  }), feedbackStatus === "error" && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-red-600 mb-2"
  }, "পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।"), feedbackStatus === "sent" && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-700 mb-2"
  }, "ধন্যবাদ! আপনার পরামর্শ পাঠানো হয়েছে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSendFeedback,
    disabled: feedbackSending || !feedbackMsg.trim(),
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
  }, feedbackSending ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : feedbackStatus === "sent" ? "পাঠানো হয়েছে!" : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 14
  }), " পাঠিয়ে দিন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(false);
      setFeedbackStatus(null);
    },
    className: "h-9 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল")))), showHistoryModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100 max-h-[75vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ClockIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " এন্ট্রি ইতিহাস"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHistoryModal(false)
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "সর্বশেষ ৫টি পূর্ববর্তী সংস্করণ এখানে দেখা যাবে। পুনরুদ্ধার করলে সেই সংস্করণটি ফর্মে বসে যাবে — পরিবর্তন সংরক্ষণ করতে আবার \"সেভ করুন\" বাটনে চাপ দিতে হবে।"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-y-auto custom-scrollbar space-y-2 flex-1"
  }, loadingHistory ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center py-8"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    color: "var(--theme-primary)",
    size: 22
  })) : historyList.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 text-center py-6"
  }, "কোনো পূর্ববর্তী সংস্করণ নেই — এই দিনের এন্ট্রি এখনো এডিট করা হয়নি।") : historyList.map(h => /*#__PURE__*/React.createElement("div", {
    key: h.id,
    className: "flex items-center justify-between gap-2 border border-slate-200 rounded-xl p-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-slate-600"
  }, formatBnDateTime(h.editedAt)), /*#__PURE__*/React.createElement("button", {
    onClick: () => restoreHistoryVersion(h.value),
    className: "text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0"
  }, "পুনরুদ্ধার করুন")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowHistoryModal(false),
    className: "w-full h-9 mt-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shrink-0"
  }, "বন্ধ করুন"))), milestoneToast && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-x-0 bottom-6 flex justify-center px-5 z-[60]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#16302B] text-white rounded-2xl shadow-xl px-5 py-4 max-w-sm w-full flex items-center gap-3 border border-[#C89B3C]/40"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "🎉"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold",
    style: {
      color: "#C89B3C"
    }
  }, "অভিনন্দন!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-200 mt-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    style: { fontFamily: "'IBM Plex Mono', 'Hind Siliguri', monospace" }
  }, toBn(milestoneToast)), " দিনের ধারাবাহিকতা পূর্ণ হয়েছে — মাশাআল্লাহ, চালিয়ে যান!")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMilestoneToast(null),
    className: "text-slate-400 hover:text-white shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))));
}
function FieldGroup({
  title,
  fields,
  entry,
  onChange,
  onToggleExcuse,
  onInfoClick,
  member,
  disabled
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-bold text-emerald-950"
  }, title), onInfoClick && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onInfoClick,
    className: "text-slate-400 hover:text-emerald-700",
    title: "তথ্য"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, fields.filter(f => fieldApplies(f, member)).map(f => {
    const fieldExcusable = isFieldExcusable(f, member);
    const excused = !!(fieldExcusable && isExcused(entry, f.key));
    const rowDisabled = disabled || excused;
    return /*#__PURE__*/React.createElement("div", {
      key: f.key,
      className: "flex items-center justify-between gap-3" + (disabled ? " opacity-40" : "")
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-medium text-slate-700"
    }, /*#__PURE__*/React.createElement(LabelText, {
      text: f.label
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, fieldExcusable && /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: disabled,
      onClick: () => onToggleExcuse(f.key, !excused),
      className: "px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 transition-all",
      style: excused ? {
        background: "#C89B3C",
        borderColor: "#C89B3C",
        color: "#16302B"
      } : {
        background: "#fff",
        borderColor: "#D8DED3",
        color: "#8A9A8F"
      }
    }, "ওজর"), f.type === "bool" && /*#__PURE__*/React.createElement(BoolToggle, {
      value: !!entry[f.key],
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled
    }), f.type === "count" && /*#__PURE__*/React.createElement(CountStepper, {
      value: entry[f.key],
      max: f.max,
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled
    }), f.type === "number" && /*#__PURE__*/React.createElement(NumberField, {
      value: entry[f.key],
      target: f.target,
      onChange: v => onChange(f.key, v),
      disabled: rowDisabled
    })));
  })));
}
// --- Google Account Linking (fully optional) ---
// Default flow stays zero-login: every device auto-signs-in anonymously, no
// screen, no friction (see bottom of file). A person MAY optionally link
// their anonymous session to a real Google account from the menu. Linking
// (not switching) keeps the exact same Firebase Auth uid, so any members
// already claimed on this device stay claimed — nothing about existing data
// changes. The benefit of linking: that uid becomes tied to the Google
// account instead of this one device/browser cache, so signing in with the
// same Google account on a different device (or after clearing this
// device's cache) recovers the same identity — no re-claiming needed.
//
// Redirect-based flows survive a full page reload, so any pending
// action/result is remembered across that reload via localStorage.
const googleProvider = new firebase.auth.GoogleAuthProvider();
function isGoogleLinked() {
  return !!(auth.currentUser && auth.currentUser.providerData.some(p => p.providerId === "google.com"));
}
// Popup instead of redirect: a redirect round-trip depends on session/local
// storage surviving the navigation away to Google and back, which silently
// fails on browsers that partition storage for third-party contexts (this
// is now the default in Safari and increasingly Chrome/Firefox) — the
// classic symptom is "I picked my Google account, it came back, and
// nothing changed." Popup resolves the promise directly on this same page,
// so it doesn't depend on that storage round-trip surviving.
function linkGoogleAccount() {
  return auth.currentUser.linkWithPopup(googleProvider);
}
function unlinkGoogleAccount() {
  return auth.currentUser.unlink("google.com");
}
function signOutToFreshAnonymous() {
  return auth.signOut().then(() => auth.signInAnonymously());
}
function GoogleAccountModal({
  onClose,
  onLinked
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  async function handleLink() {
    setBusy(true);
    setNotice(null);
    try {
      await linkGoogleAccount();
      // এই Google অ্যাকাউন্টে আগে থেকে সংরক্ষিত familyCode থাকলে (অন্য
      // ডিভাইস থেকে link করা), সেটাই এখন এই ডিভাইসে load করা হচ্ছে —
      // থাকলে reload করে পুরো family/profile/records নতুন code দিয়ে
      // fresh state-এ আনা হয় (না থাকলে বর্তমান code-ই account-এ save
      // হয়ে যায়, নিচের syncFamilyCodeWithAccount()-এর ভেতরেই)।
      const sync = await syncFamilyCodeWithAccount();
      if (sync.switched) {
        window.location.reload();
        return;
      }
      // Phase A: প্রথম Admin claim — শুধু non-switched case-এ (অর্থাৎ এই
      // ডিভাইস তার নিজের বর্তমান family-তেই Google link করছে)। switched
      // case-এ (অন্য ডিভাইস থেকে আগে link করা account, ভিন্ন family)
      // ইচ্ছাকৃতভাবে claim করা হচ্ছে না — সেই family-এর Admin status
      // ইতিমধ্যে নির্ধারিত থাকার কথা, ভুলভাবে নতুন claim এড়াতে।
      await claimFirstAdminIfEligible();
      onClose();
      // সাইন-ইন সফল — এই Google অ্যাকাউন্টে আগে থেকে কোনো Drive ব্যাকআপ
      // থাকলে detect করে Restore-এর Popup দেখানোর সুযোগ App-কে দেওয়া হচ্ছে।
      if (onLinked) onLinked();
    } catch (err) {
      if (err && err.code === "auth/popup-closed-by-user") {
        // ব্যবহারকারী নিজেই পপআপ বন্ধ করেছেন — কোনো বার্তা দরকার নেই
      } else if (err && err.code === "auth/credential-already-in-use") {
        // এই Google অ্যাকাউন্ট আগে থেকেই অন্য একটি (সম্ভবত আগের সাইন-আউট
        // হওয়া) সেশনের সাথে লিংক করা আছে — নতুন anonymous সেশনে আবার লিংক
        // করা যাবে না। এক্ষেত্রে লিংক না করে সরাসরি সেই পুরনো Google-লিংকড
        // অ্যাকাউন্টেই সাইন ইন করাই সঠিক "রিকভারি" পদ্ধতি — err.credential-এ
        // Firebase নিজেই সেই ক্রেডেনশিয়াল দিয়ে দেয়।
        try {
          await auth.signInWithCredential(err.credential);
          // এই path-এ window.location.reload()-এর কারণে onLinked() কল করার
          // সুযোগ থাকে না (পুরো অ্যাপ রিলোড হয়ে যায়, React state হারিয়ে
          // যায়) — তাই একটি localStorage flag রেখে দেওয়া হচ্ছে, রিলোডের
          // পর অ্যাপ বুট হওয়ার সময় এটি দেখে Drive ব্যাকআপ চেক করা হবে।
          // এটাই আগে "Incognito-তে সাইন ইন করার পর Auto Restore Popup
          // আসছে না" বাগটির মূল কারণ ছিল।
          try {
            localStorage.setItem("dt_check_drive_after_reload", "1");
          } catch {}
          onClose();
          window.location.reload();
          return;
        } catch (signInErr) {
          setNotice({
            type: "error",
            text: "সাইন ইন করতে সমস্যা হয়েছে: " + (signInErr && (signInErr.message || signInErr.code))
          });
        }
      } else {
        setNotice({
          type: "error",
          text: "সমস্যা হয়েছে: " + (err && (err.message || err.code))
        });
      }
    } finally {
      setBusy(false);
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "#C89B3C"
  }), " Google অ্যাকাউন্ট (রিকমন্ডেড)"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), notice && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-3 " + (notice.type === "ok" ? "text-emerald-700" : "text-red-600")
  }, notice.text), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800 mb-2"
  }, "Google দিয়ে সাইন ইন করার সুবিধা:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "Google দিয়ে সাইন ইন বাধ্যতামূলক নয়। তবে সাইন ইন করলে নিম্নোক্ত সুবিধা পাওয়া যাবে —"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-2"
  }, "☁️ Google Drive-এ নিরাপদে ব্যাকআপ রাখা এবং প্রয়োজনে Restore করা যাবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-2"
  }, "📱 ফোন পরিবর্তন, ডাটা মুছে যাওয়া বা অ্যাপ পুনরায় ইনস্টল করার পর একই Google অ্যাকাউন্টে সাইন ইন করে সহজেই সব ডাটা, সদস্যপদ, দায়িত্ব (Claim) ও এডিট-অধিকার ফিরে পাওয়া যাবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "💻 একই Google অ্যাকাউন্ট দিয়ে একাধিক ডিভাইস থেকে নিরাপদে অ্যাপ ব্যবহার করা যাবে।"), /*#__PURE__*/React.createElement("button", {
    onClick: handleLink,
    disabled: busy,
    className: "w-full h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
  }, busy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : null, " Google দিয়ে সাইন ইন করুন")));
}
function mountApp() {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container);
  root.render(/*#__PURE__*/React.createElement(App, null));
}

// --- Anonymous Authentication (background, no login UI) ---
// Zero-login by default: we wait for a signed-in (anonymous, or previously
// Google-linked) user before mounting so every Firestore call the app makes
// already has request.auth != null. getRedirectResult() is checked first so
// an optional Google link/recovery action (which reloads the page) can
// leave a result/notice behind for the Google Account modal to show.
let appMounted = false;
function bootOnce() {
  if (appMounted) return;
  appMounted = true;
  mountApp();
}
// Wait for Firebase to report the REAL restored session (anonymous,
// Google-linked, or none) before deciding whether a fresh anonymous
// sign-in is needed. The old code called signInAnonymously()
// unconditionally, in parallel with this restore — if it ran before the
// persisted (possibly Google-linked) user had finished loading, it could
// create a brand-new anonymous identity and silently throw away the link,
// which is exactly the "picked my Google account, it came back looking
// like before" symptom. Now we only sign in anonymously if, after
// Firebase reports its true state, there is genuinely no user yet.
const unsubscribeAuth = auth.onAuthStateChanged(user => {
  unsubscribeAuth();
  if (user) {
    bootOnce();
  } else {
    auth.signInAnonymously().catch(err => {
      console.error("Anonymous sign-in failed:", err);
    }).finally(() => {
      bootOnce(); // don't leave the user stuck on a blank screen
    });
  }
});