// familyIdentity.js — familyId/Family Code lifecycle, resolvePathContext()
// (legacy/v2 routing), App Creator override, account-based family recovery
// mapping, isGoogleLinked() (moved here from app.js boot-section — needed
// by both this file ও memberData.js, single source of truth).
import { db, auth } from "./firebaseConfig.js";
import { FAMILY_CODE_CHARS, generateSecureCode } from "./appHelpers.js";

const APP_CREATOR_UID = "yiirNJKJHlM27guiiS10zsp2FYT2";
function isCreatorAuth() {
  return !!(auth.currentUser && auth.currentUser.uid === APP_CREATOR_UID);
}

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
const FAMILY_CODE_MIN_LENGTH = 6;
const FAMILY_CODE_MAX_LENGTH = 30;
// §English-only validation(২৩ আগস্ট ২০২৬, owner-approved): শুধু English
// letter(A-Z/a-z), digit(0-9), underscore(_), hyphen(-) allow — আগের
// broader pattern(শুধু space/slash/backslash/quote বাদ, বাকি সব unicode-সহ
// allow করত) সংকুচিত করে English-only করা হয়েছে। "__...__" reserved-prefix
// guard(Firestore-সম্মত নাম এড়াতে) অপরিবর্তিত রাখা হয়েছে।
const FAMILY_CODE_CHARSET_PATTERN = /^(?!__.*__$)[A-Za-z0-9_-]+$/;
function isFamilyCodeCharsetValid(code) {
  return FAMILY_CODE_CHARSET_PATTERN.test(code);
}
// §Family Username case-insensitive uniqueness — শুধু familyCodes lookup/
// uniqueness-key তৈরির জন্য (lowercase)। Display value (family.familyCode,
// dataCollectionName ইত্যাদি) user-typed আসল casing-ই রাখে, এখানে ছোঁয়া হয় না।
function normalizeFamilyKey(code) {
  return (code || "").trim().toLowerCase();
}
function setFamilyCode(code) {
  if (!code || !code.trim()) return;
  const normalized = code.trim();
  if (normalized.length < FAMILY_CODE_MIN_LENGTH || normalized.length > FAMILY_CODE_MAX_LENGTH) {
    alert(`ফ্যামিলি ইউজারনেম ${FAMILY_CODE_MIN_LENGTH} থেকে ${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`);
    return;
  }
  if (!isFamilyCodeCharsetValid(normalized)) {
    alert("অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।");
    return;
  }
  localStorage.setItem("family_code", normalized);
  localStorage.setItem("family_code_is_custom", "1");
  window.location.reload();
}

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
      const newKey = normalizeFamilyKey(normalized);
      const newCodeRef = db.collection("familyCodes").doc(newKey);
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
      // §Case-insensitive fix — পুরনো কোড normalize করার আগের scheme-এ
      // raw(uppercase) doc-id হিসেবে সেভ থাকতে পারে, তাই normalized-key ও
      // raw oldCode উভয় doc-id-তে delete try করা হচ্ছে যাতে stale mapping
      // orphan না থেকে যায় (নতুন key-এর সাথে সংঘর্ষ হলে skip)।
      if (oldCode) {
        const oldKey = normalizeFamilyKey(oldCode);
        if (oldKey !== newKey) {
          tx.delete(db.collection("familyCodes").doc(oldKey));
        }
        if (oldCode !== oldKey && oldCode !== newKey) {
          tx.delete(db.collection("familyCodes").doc(oldCode));
        }
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
    // §Race-fix(atomic uniqueness) — আগে get()+set() আলাদা কল ছিল, যা
    // দুই ইউজার একই মুহূর্তে একই কোড দাবি করলে TOCTOU race তৈরি করতে
    // পারত (উভয়ের get() "available" দেখে, পরে একজনের mapping অন্যজন
    // overwrite)। changeFamilyCodeForExistingFamily()-এর একই প্যাটার্নে
    // get+set একই transaction-এ এনে atomic করা হলো — lookup key/flow
    // অপরিবর্তিত, শুধু atomicity যোগ হয়েছে।
    const codeRef = db.collection("familyCodes").doc(normalizeFamilyKey(normalized));
    await db.runTransaction(async tx => {
      const codeSnap = await tx.get(codeRef);
      if (codeSnap.exists) {
        throw new Error("code-taken");
      }
      tx.set(codeRef, { familyId: newFamilyId, createdAt: Date.now() });
    });
    await db.collection("families").doc(newFamilyId).set({
      familyId: newFamilyId,
      familyCode: normalized,
      isCustomCode: true,
      dataCollectionName: `data_${normalized}`,
      // বাগ-ফিক্স(২৭.৩): migrationState explicit "v2" — নইলে field-না-থাকা
      // অবস্থায় joinExistingFamily() ডিফল্ট "legacy" ধরে ব্লক করে দিত
      // ("এই ফ্যামিলি এখনো এই ফিচারের জন্য প্রস্তুত নয়" ভুল মেসেজ)।
      migrationState: "v2",
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
          firstAdminUid: auth.currentUser.uid,
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
    if (err.message === "code-taken") {
      return { aborted: true, reason: "code-taken" };
    }
    return { aborted: true, reason: "error", error: err.message };
  }
}
if (typeof window !== "undefined") {
  window.createNewFamily = createNewFamily;
}

async function resolveFamilyIdFromCode(code) {
  const normalized = (code || "").trim();
  if (!normalized) return { ok: false, reason: "empty" };
  try {
    // §Case-insensitive fix — নতুন scheme lowercase key-তে সেভ হয়, কিন্তু
    // বিদ্যমান সব production family raw(uppercase, auto-generated) doc-id-তে
    // আছে — তাই normalized-key প্রথমে try, miss হলে raw-code fallback।
    // এতে কোনো migration ছাড়াই existing lookup আচরণ অক্ষুণ্ণ থাকে।
    let codeSnap = await db.collection("familyCodes").doc(normalizeFamilyKey(normalized)).get();
    if (!codeSnap.exists) {
      codeSnap = await db.collection("familyCodes").doc(normalized).get();
    }
    if (!codeSnap.exists) {
      return { ok: false, reason: "not-found" };
    }
    const targetFamilyId = codeSnap.data() ? codeSnap.data().familyId : null;
    if (!targetFamilyId) {
      return { ok: false, reason: "not-found" };
    }
    // পুরনো unapproved/নতুন ডিভাইস থেকে এই family-র উপর এখনো approval নেই,
    // তাই families/{familyId} read rules (isApprovedMember) block করতে
    // পারে — সেক্ষেত্রে pre-check skip করে এগিয়ে যাওয়া হয়, বুট-ফ্লো নিজেই
    // migrationState নিরাপদে resolve করবে (একই fallback pattern যা
    // বুট-টাইমে আগে থেকেই ব্যবহৃত হয়)।
    try {
      const famSnap = await db.collection("families").doc(targetFamilyId).get();
      if (!famSnap.exists) {
        return { ok: false, reason: "not-found" };
      }
      const migrationState = famSnap.data().migrationState || "legacy";
      if (migrationState !== "v2") {
        return { ok: false, reason: "not-v2" };
      }
    } catch (preCheckErr) {
      console.warn("[resolveFamilyIdFromCode] pre-check read blocked (সম্ভবত unapproved), চালিয়ে যাওয়া হচ্ছে:", preCheckErr.message);
    }
    return { ok: true, familyId: targetFamilyId, code: normalized };
  } catch (err) {
    console.error("[resolveFamilyIdFromCode] ব্যর্থ:", err.message);
    return { ok: false, reason: "error", error: err.message };
  }
}
async function joinExistingFamily(code) {
  const normalized = (code || "").trim();
  if (!normalized) return { aborted: true, reason: "empty" };
  if (normalized === getFamilyCode()) {
    return { aborted: true, reason: "same-family" };
  }
  const resolved = await resolveFamilyIdFromCode(normalized);
  if (!resolved.ok) {
    if (resolved.reason === "error") {
      console.error("[Join Family] ব্যর্থ:", resolved.error);
    }
    return { aborted: true, reason: resolved.reason, error: resolved.error };
  }
  console.log(`[Join Family] সফল লুকআপ — কোড: ${normalized}, familyId: ${resolved.familyId}। এই ডিভাইস সুইচ হচ্ছে, রিলোড হচ্ছে...`);
  localStorage.setItem("family_id", resolved.familyId);
  localStorage.setItem("family_code", normalized);
  localStorage.setItem("family_code_is_custom", "1");
  window.location.reload();
  return { success: true };
}
if (typeof window !== "undefined") {
  window.joinExistingFamily = joinExistingFamily;
}

async function checkFamilyCodeExists(code) {
  const normalized = (code || "").trim();
  if (!normalized) return { exists: false, reason: "empty" };
  try {
    let codeSnap = await db.collection("familyCodes").doc(normalizeFamilyKey(normalized)).get();
    if (!codeSnap.exists) {
      codeSnap = await db.collection("familyCodes").doc(normalized).get();
    }
    if (!codeSnap.exists) return { exists: false, reason: "not-found" };
    const targetFamilyId = codeSnap.data() ? codeSnap.data().familyId : null;
    if (!targetFamilyId) return { exists: false, reason: "not-found" };
    const famSnap = await db.collection("families").doc(targetFamilyId).get();
    if (!famSnap.exists) return { exists: false, reason: "not-found" };
    const migrationState = famSnap.data().migrationState || "legacy";
    if (migrationState !== "v2") return { exists: false, reason: "not-v2" };
    return { exists: true };
  } catch (err) {
    return { exists: false, reason: "error", error: err.message };
  }
}

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

function familyDocRef() {
  return db.collection("families").doc(getFamilyId());
}
// §Performance Fix(২২ আগস্ট ২০২৬, Finding #2 ধাপ ১) — এখন একটি optional
// `preloaded`({exists, data}) parameter নেয়: boot sequence থেকে একবার
// fetch করা family-doc state এখানে reuse করা যায়, নিজের `.get()` না করে।
// parameter না দিলে (standalone caller, যেমন custom-code-set/Google-link
// trigger) আগের মতোই নিজের `.get()` করে — backward-compatible।
// রিটার্ন: হালনাগাদ {exists, data} state(পরের ধাপে thread করার জন্য) —
// caller চাইলে ignore করতে পারে(আগের void-return caller-দের কোনো ক্ষতি নেই)।
async function ensureFamilyMeta(preloaded) {
  try {
    const ref = familyDocRef();
    const snap = preloaded || (await ref.get().then(s => ({ exists: s.exists, data: s.exists ? s.data() : null })));
    if (!snap.exists) {
      // §৫ Family Code Lifecycle fix: dataCollectionName এখন থেকেই family
      // তৈরির মুহূর্তে একবার স্থায়ীভাবে সেট হয় — এটাই সেই আসল Firestore
      // কালেকশনের নাম যেখানে entries/members/weekly সবসময় থাকবে।
      // familyCode ভবিষ্যতে যতবারই বদলাক (changeFamilyCodeForExistingFamily),
      // dataCollectionName কখনো বদলাবে না — তাই আসল ডাটা কালেকশন কখনো
      // "হারিয়ে যাবে না" বা code-change-এর সাথে ভেঙে পড়বে না।
      const payload = {
        familyId: getFamilyId(),
        familyCode: getFamilyCode(),
        isCustomCode: localStorage.getItem("family_code_is_custom") === "1",
        dataCollectionName: `data_${getFamilyCode()}`,
        createdAt: Date.now(),
        createdByUid: auth.currentUser ? auth.currentUser.uid : null,
        schemaVersion: 1,
        adminUids: []
      };
      await ref.set(payload);
      return { exists: true, data: payload };
    }
    return snap;
  } catch {
    // Best-effort — future-migration prep। ব্যর্থ হলে ইনপুট state (থাকলে)
    // অপরিবর্তিতই ফেরত, নাহলে "নেই" ধরে নেওয়া — আগের error-swallow আচরণ অক্ষুণ্ণ।
    return preloaded || { exists: false, data: null };
  }
}

let cachedDataCollectionName = null;
// §Performance Fix(২২ আগস্ট ২০২৬, Finding #2 ধাপ ১) — ensureFamilyMeta()-এর
// মতোই optional `preloaded`({exists, data}) parameter; না দিলে আগের মতোই
// নিজের `.get()` করে(backward-compatible)। রিটার্ন: হালনাগাদ state।
async function ensureDataCollectionName(preloaded) {
  try {
    const ref = familyDocRef();
    const snap = preloaded || (await ref.get().then(s => ({ exists: s.exists, data: s.exists ? s.data() : null })));
    const existing = snap.exists && snap.data ? snap.data.dataCollectionName : null;
    if (existing) {
      cachedDataCollectionName = existing;
      return snap;
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
    return snap.exists ? { exists: true, data: { ...(snap.data || {}), dataCollectionName: derived } } : snap;
  } catch {
    cachedDataCollectionName = null; // getCollectionName() নিচে নিরাপদ fallback করবে
    return preloaded || { exists: false, data: null };
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

async function claimFirstAdminIfEligible(preloaded) {
  if (!auth.currentUser) return false;
  try {
    const metaState = await ensureFamilyMeta(preloaded);
    const ref = familyDocRef();
    const current = metaState && metaState.exists && metaState.data ? (metaState.data.adminUids || []) : [];
    if (current.length === 0) {
      // §First Admin Protection — firstAdminUid একই write-এ, একবারই সেট
      // (Rules-এ enforced — এই clause claim-মুহূর্তে ছাড়া আর কখনো fire
      // করে না)।
      await ref.update({
        adminUids: [auth.currentUser.uid],
        firstAdminUid: auth.currentUser.uid,
        updatedAt: Date.now()
      });
      return true; // এই ডিভাইস/কলই সদ্য প্রথম Admin হলো — caller Recovery
      // Key setup modal দেখাতে পারে।
    }
  } catch {
    // Best-effort — Admin claim ব্যর্থ হলেও মূল ফিচার (Family Code set /
    // Google link) কখনো ব্লক হবে না; পরের trigger-এ আবার চেষ্টা হবে।
  }
  return false;
}

async function loadUserFamilyCode(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data().familyCode || null : null;
  } catch {
    return null;
  }
}
async function saveUserFamilyCode(uid, code, memberId) {
  // ফাংশনের নিজের ভেতরেই guard — caller ভুলে খালি/অবৈধ code পাঠালেও
  // users/{uid}-এ কখনো ফাঁকা familyCode লেখা হবে না।
  if (!uid || !code || !code.trim()) return;
  try {
    const payload = {
      familyCode: code.trim(),
      updatedAt: Date.now()
    };
    // §Member Key Direct-Identify(১৯ আগস্ট ২০২৬, touch-point 3) — optional
    // memberId, existing call site-গুলো(৩টি) এই param পাস করে না বলে
    // অপরিবর্তিত থাকে।
    if (memberId) payload.memberId = memberId;
    await db.collection("users").doc(uid).set(payload, {
      merge: true
    });
  } catch {}
}
// Google One-click Sign-in(touch-point 6)-এর জন্য — loadUserFamilyCode()
// (existing, শুধু string ফেরত দেয়)-এর contract না ভেঙে আলাদা ফাংশন।
async function loadUserFamilyMapping(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return null;
    const d = doc.data() || {};
    return { familyCode: d.familyCode || null, memberId: d.memberId || null };
  } catch {
    return null;
  }
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

function isGoogleLinked() {
  return !!(auth.currentUser && auth.currentUser.providerData.some(p => p.providerId === "google.com"));
}

export {
  isCreatorAuth,
  enterFamilyAsCreator,
  exitCreatorOverride,
  getFamilyCode,
  isFamilyCodeCharsetValid,
  normalizeFamilyKey,
  setFamilyCode,
  changeFamilyCodeForExistingFamily,
  createNewFamily,
  resolveFamilyIdFromCode,
  joinExistingFamily,
  checkFamilyCodeExists,
  getFamilyId,
  ensureFamilyCodeMapping,
  familyDocRef,
  ensureFamilyMeta,
  ensureDataCollectionName,
  ensureLegacyCollectionMap,
  claimFirstAdminIfEligible,
  loadUserFamilyCode,
  saveUserFamilyCode,
  loadUserFamilyMapping,
  syncFamilyCodeWithAccount,
  getCollectionName,
  appStorage,
  resolvePathContext,
  FAMILY_CODE_MIN_LENGTH,
  FAMILY_CODE_MAX_LENGTH,
  isGoogleLinked
};
