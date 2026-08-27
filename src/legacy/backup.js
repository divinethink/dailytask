// backup.js — Google Drive personal backup/restore + Android File System
// Access(FSA) device-local backup(merged, কারণ UI-ও BackupRestore.jsx-এ
// একসাথে)। mergeBackupData() উভয় path-এর shared merge logic।
import { db, auth } from "./firebaseConfig.js";
import { getFamilyCode, getFamilyId, getCollectionName, resolvePathContext } from "./familyIdentity.js";
import { loadMembersV2 } from "./memberData.js";
import { extractOwnerUidsFromMemberData } from "./legacyMigrationTools.js";

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
// H-1 fix(Audit, ১৫ আগস্ট ২০২৬, owner-approved Option A): allowConsentPopup
// param(default true, backward-compatible)। false দিলে silent(prompt:"")
// ব্যর্থ হলে আর "consent" popup fallback হবে না — সরাসরি throw করবে। এটা
// Firebase Auth-এর linkWithPopup()-এর থেকে সম্পূর্ণ আলাদা GIS OAuth popup —
// Google sign-in সফল হওয়ার সাথে সাথেই(বা reload-পরবর্তী বুটে, কোনো fresh
// click ছাড়া) এই দ্বিতীয় popup ট্রিগার হওয়াই "sign-in-এর পর popup আবার
// খুলছে" সমস্যার root cause ছিল(static audit finding)। explicit ম্যানুয়াল
// রিস্টোর ক্লিকে(handleManualDriveRestoreClick) আগের মতোই consent popup
// পাওয়া যাবে(default true পাস হয়)।
async function getDriveAccessToken(allowConsentPopup = true) {
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
    } catch (err) {
      if (!allowConsentPopup) throw err;
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
  const [membersSnap, entriesSnap, weeklySnap] = await Promise.all([
    ctx.membersRef.get(),
    ctx.entriesRef.get(),
    ctx.weeklyRef.get()
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
  // Fail-safe fix(২৫ আগস্ট ২০২৬): কিছু গ্রান্ডফাদার্ড family-র legacy
  // collection-নাম(data_<familyCode>)-এ এমন ক্যারেক্টার(যেমন "@") থাকতে
  // পারে যা বর্তমান English-only charset Rules regex(isAppCollection)-এর
  // সাথে মেলে না — ফলে এই read permission-denied হয়, যদিও family
  // ইতিমধ্যে সম্পূর্ণ v2। এই দুইটা key(custom_fields/meeting_rows_v2:)
  // optional/legacy-only বলে এই ব্যর্থতাকে fail-safe খালি ফলাফল হিসেবে
  // ধরা হচ্ছে যাতে মূল member/entry/weekly backup আটকে না যায়(Root-cause
  // Learnings pattern reuse, V1 ফাইল ১.২ §১৭)।
  try {
    const legacySnap = await db.collection(getCollectionName()).get();
    legacySnap.docs.forEach(doc => {
      const id = doc.id;
      if (id === "custom_fields" || id.startsWith("meeting_rows_v2:")) {
        result[id] = doc.data();
      }
    });
  } catch (err) {
    console.warn("[Backup] Legacy custom_fields/meeting_rows_v2 read skip(permission-denied, সম্ভবত charset-mismatch):", err);
  }
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
  const mainWrites = [];
  const legacyWrites = [];
  items.forEach(({ key, data }) => {
    if (key.startsWith("member:")) {
      mainWrites.push({ ref: ctx.membersRef.doc(key.slice("member:".length)), data });
      return;
    }
    if (key.startsWith("entry:")) {
      const rest = key.slice("entry:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) return;
      mainWrites.push({ ref: ctx.entriesRef.doc(`${rest.slice(0, idx)}_${rest.slice(idx + 1)}`), data });
      return;
    }
    if (key.startsWith("weekly:")) {
      const rest = key.slice("weekly:".length);
      const idx = rest.indexOf(":");
      if (idx === -1) return;
      mainWrites.push({ ref: ctx.weeklyRef.doc(`${rest.slice(0, idx)}_${rest.slice(idx + 1)}`), data });
      return;
    }
    // custom_fields / meeting_rows_v2: — legacy-only (উপরের নোট দেখুন)
    legacyWrites.push({ ref: legacyColRef.doc(key), data });
  });
  await commitInChunks(mainWrites);
  // Fail-safe fix(২৫ আগস্ট ২০২৬): legacy custom_fields/meeting_rows_v2
  // write আলাদা batch-এ সরানো হলো। কারণ — কিছু গ্রান্ডফাদার্ড family-র
  // legacy collection-নামে(data_<familyCode>) এমন ক্যারেক্টার(যেমন "@")
  // থাকতে পারে যা বর্তমান English-only charset Rules regex-এর সাথে না
  // মিলে permission-denied দেয়; আগে এই write মূল member/entry/weekly
  // write-এর সাথে একই batch-এ থাকায় Firestore batch atomic হওয়ার কারণে
  // এই একটা denial পুরো restore-ই ব্যর্থ করে দিত। এখন এই optional/
  // legacy-only অংশ আলাদা try/catch-এ fail-safe(main data অক্ষুণ্ণ থাকে)।
  if (legacyWrites.length > 0) {
    try {
      await commitInChunks(legacyWrites);
    } catch (err) {
      console.warn("[Restore] Legacy custom_fields/meeting_rows_v2 write skip(permission-denied, সম্ভবত charset-mismatch):", err);
    }
  }
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
    const proceed = window.confirm(`এই Google অ্যাকাউন্টে ইতিমধ্যে অন্য একটি ফ্যামিলি ইউজারনেমের (${existing.appProperties.familyCode}) ব্যাকআপ সংরক্ষিত আছে। এগিয়ে গেলে সেটি এই ফ্যামিলির (${currentFamilyCode}) ডাটা দিয়ে প্রতিস্থাপিত হয়ে যাবে এবং আগের ফ্যামিলির ব্যাকআপ আর পাওয়া যাবে না। আপনি কি নিশ্চিতভাবে এগিয়ে যেতে চান?`);
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

async function mergeBackupData(migrationState, parsed, options) {
  const compareUpdatedAt = !!(options && options.compareUpdatedAt);
  const isV2 = migrationState === "v2";
  const myUid = auth.currentUser ? auth.currentUser.uid : null;
  const currentMembers = await loadMembersV2(migrationState);
  const ownerByMemberId = {};
  currentMembers.forEach(m => {
    ownerByMemberId[m.id] = isV2 ? extractOwnerUidsFromMemberData(m) : (m.ownerUid ?? null);
  });
  function isMineOrUnclaimed(owner) {
    if (isV2) {
      return !owner || !owner.length || owner.includes(myUid);
    }
    return !owner || owner === myUid;
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
        // (লাইভ) দায়িত্ব/ownerUid(s) কখনো ব্যাকআপ দিয়ে ওভাররাইট হয় না। claim/
        // release স্বাধীনভাবে ঘটে থাকে — একটি পুরনো ব্যাকআপ সেই লাইভ
        // দায়িত্ব-অবস্থাকে "টাইম-ট্রাভেল" করে বদলে দিতে পারবে না।
        const liveOwnerData = isV2
          ? { ownerUids: extractOwnerUidsFromMemberData(existingDocsByKey[key]) }
          : { ownerUid: existingDocsByKey[key].ownerUid ?? null };
        memberKeys.push({
          key,
          data: { ...parsed[key], ...liveOwnerData }
        });
        return;
      }
      // একেবারে নতুন সদস্য — brand-new create
      let newOwnerData;
      if (isV2) {
        const backupOwners = extractOwnerUidsFromMemberData(parsed[key]);
        newOwnerData = { ownerUids: (myUid && backupOwners.includes(myUid)) ? [myUid] : [] };
      } else {
        const backupOwner = parsed[key].ownerUid ?? null;
        newOwnerData = { ownerUid: backupOwner === myUid ? myUid : null };
      }
      memberKeys.push({
        key,
        data: { ...parsed[key], ...newOwnerData }
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

export {
  isGoogleDriveConfigured,
  ensureDriveTokenClient,
  requestDriveAccessToken,
  getDriveAccessToken,
  driveFetch,
  findDriveBackupFile,
  findOrCreateDriveBackupFolder,
  readAllFamilyDataForBackup,
  writeParsedBackupToFamily,
  buildDriveBackupPayload,
  uploadDriveBackup,
  downloadDriveBackupContent,
  backupToGoogleDrive,
  mergeBackupData,
  restoreFromGoogleDrive,
  isFileSystemAccessSupported,
  openFsaIdb,
  saveFsaDirHandle,
  loadFsaDirHandle,
  clearStoredFsaDirHandle,
  ensureFsaPermission,
  getOrRequestFsaBaseDir,
  writeFsaBackupFile,
  DRIVE_BACKUP_SCHEMA_VERSION
};
