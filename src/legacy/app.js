import { db, auth, analytics, logAnalyticsEvent } from "./firebaseConfig.js";
import {
  FAMILY_CODE_CHARS, generateSecureCode, sha256Hex, useFonts, THEME_PRESETS, hexToRgba,
  getThemeColor, applyThemeColor, useThemeColor, DEFAULT_DEEN_FIELDS, DEFAULT_DUNIYA_FIELDS,
  fieldApplies, isExcused, isFieldExcusable, BN_DIGITS, toBn, BN_MONTHS, BN_WEEKDAYS,
  DAILY_INSPIRATIONS, AYAT_LIST, HADITH_LIST, QUOTE_LIST, INSPIRATION_TYPE_CYCLE,
  getDailyInspiration, pad2, dateKey, formatBnDateTime, isFutureDate, monthPrefix,
  daysInMonth, isLastDayOfMonth, HIJRI_MONTHS_BN, gregorianToJD, islamicToJD, getHijriDate,
  dailyScore, scoreColor, fieldPercent, calculateStreak, getWeekRanges
} from "./appHelpers.js";
import {
  isCreatorAuth, enterFamilyAsCreator, exitCreatorOverride, getFamilyCode,
  isFamilyCodeCharsetValid, normalizeFamilyKey, setFamilyCode, changeFamilyCodeForExistingFamily,
  createNewFamily, resolveFamilyIdFromCode, joinExistingFamily, checkFamilyCodeExists, getFamilyId,
  ensureFamilyCodeMapping, familyDocRef, ensureFamilyMeta, ensureDataCollectionName,
  ensureLegacyCollectionMap, claimFirstAdminIfEligible, loadUserFamilyCode, saveUserFamilyCode,
  loadUserFamilyMapping, syncFamilyCodeWithAccount, getCollectionName, appStorage,
  resolvePathContext, FAMILY_CODE_MIN_LENGTH, FAMILY_CODE_MAX_LENGTH, isGoogleLinked
} from "./familyIdentity.js";
import {
  dryRunPhaseCReadinessCheck, copyPhaseCData, verifyPhaseCData, reverseSyncPhaseCData,
  healthCheckFamily, auditAllFamiliesHealthCheck, extractOwnerUidsFromMemberData,
  auditGrandfatherCandidates, migrateOwnerUidsToArray, migrateApprovedGrandfatherAccess,
  auditOrphanFamilies, cleanupOrphanFamilies, backfillLastActiveAt, backfillFirstAdminUid,
  backfillMemberRoles
} from "./legacyMigrationTools.js";
import {
  meetingKey, saveMeetingData, loadWeekly, saveWeekly, loadLegacyMembers, stampLastActive,
  tsToMillis, memberDocId, loadMembersV2, saveMemberDoc, deleteMemberDoc, claimMemberDoc,
  releaseMemberDoc, memberPrivateKeyRef, isMemberKeyCharsetValid, generateMemberKeyPlain,
  generateReadableMemberKey, generateUniqueReadableMemberKey, createMemberWithKey,
  fetchMemberKey, changeMemberKey, claimMemberWithKey, directIdentifyLogin, migrateMembersIfNeeded,
  loadCustomFields, saveCustomFields, loadEntry, saveEntry, entryDocId, pushEntryHistory,
  fetchEntryHistory
} from "./memberData.js";
import {
  isGoogleDriveConfigured, ensureDriveTokenClient, requestDriveAccessToken, getDriveAccessToken,
  driveFetch, findDriveBackupFile, findOrCreateDriveBackupFolder, readAllFamilyDataForBackup,
  writeParsedBackupToFamily, buildDriveBackupPayload, uploadDriveBackup, downloadDriveBackupContent,
  backupToGoogleDrive, mergeBackupData, restoreFromGoogleDrive, isFileSystemAccessSupported,
  openFsaIdb, saveFsaDirHandle, loadFsaDirHandle, clearStoredFsaDirHandle, ensureFsaPermission,
  getOrRequestFsaBaseDir, writeFsaBackupFile, DRIVE_BACKUP_SCHEMA_VERSION
} from "./backup.js";

// Feedback submission — powered by Web3Forms (no server/coding needed).
// 1. Go to https://web3forms.com and enter your email to get a free
//    "Access Key" (arrives instantly by email, no account required).
// 2. Paste that key below, replacing the placeholder text.
const WEB3FORMS_ACCESS_KEY = "4e0befa2-68c6-4c9e-92fb-ecffa3b4b2de";
// ভুল করে ভুল অক্ষর পড়া এড়াতে 0/O এবং 1/I বাদ দেওয়া হয়েছে
// --- App creator-only client-side helper (Rules-এর isAppCreator()-এর সাথে
// সামঞ্জস্যপূর্ণ একই UID) — শুধু convenience check, কোনো নিজস্ব
// security boundary না (আসল নিরাপত্তা সবসময় Firestore Rules-এই enforced)।
// --- Creator family override (শুধু browser console, শুধু creator UID) ---
// উদ্দেশ্য: creator-এর Google account অন্য family-র সাথে link করা থাকলেও
// (users/{uid}.familyCode), boot-এ syncFamilyCodeWithAccount() যেন এই
// ম্যানুয়ালি বেছে নেওয়া family-কে account-linked কোডে ফিরিয়ে না দেয়।
// শুধু read/verify-এর জন্য — write permission পেতে হলে সেই family-র
// adminUids-এ owner Firebase Console থেকে সাময়িকভাবে uid যোগ করতে হবে
// (এই ফাংশন সেটা করে না)।
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
// createNewFamily(newCode): সম্পূর্ণ নতুন familyId + familyCode +
// dataCollectionName — stale localStorage.family_id কখনো reuse হয় না
// (generateSecureCode(20) দিয়ে fresh id)। এটি একটি সম্পূর্ণ blank/নতুন
// family তৈরি করে — বিদ্যমান কোনো family/data স্পর্শ করে না।
// joinExistingFamily(code): বিদ্যমান কোনো family-তে "যোগ দেওয়া" — নতুন কোনো
// family/data তৈরি হয় না। শুধু familyCodes/<code> lookup করে টার্গেট
// familyId বের করা হয়, migrationState=="v2" কিনা যাচাই হয় (v2 ছাড়া blocked
// — legacy read-gate এখনো implement হয়নি), তারপর এই ডিভাইসের localStorage
// টার্গেট family-তে সুইচ করে reload হয়। এরপর বুট-টাইমের বিদ্যমান
// accessDenied/self-request হ্যান্ডলিং (migrateMembersIfNeeded catch ব্লক)
// নিজে থেকেই pending accessRequest তৈরি করবে অথবা আগে থেকে approved থাকলে
// সরাসরি ঢুকিয়ে দেবে — এখানে নতুন করে সেই লজিক ডুপ্লিকেট করা হয়নি।
// §Member Key Direct-Identify(১৯ আগস্ট ২০২৬) — joinExistingFamily()-এর
// family-lookup+validate অংশ আলাদা reusable helper-এ বের করা হয়েছে(কোনো
// localStorage write/reload নেই, শুধু resolve+validate)। joinExistingFamily()
// নিজে নিচে এটাই ব্যবহার করে — আচরণ/log/reason সব অপরিবর্তিত, শুধু delegate।
// checkFamilyCodeExists(code): নতুন, শুধু read-only যাচাই — কোনো
// localStorage/commit/reload করে না। Onboarding-এর "বিদ্যমান Family"
// ধাপে কোড লেখার সাথে সাথে valid/v2 কিনা দেখানোর জন্য। আসল commit
// (join) এখনো joinExistingFamily()-ই করে — এই ফাংশন তার কোনো লজিক
// duplicate করে না, শুধু আগে থেকে না জানিয়ে ভুল কোডে commit এড়াতে সাহায্য করে।
// =====================================================================
// --- Phase A (Family ID Foundation) — শুধু প্রস্তুতি, কোনো read/write ---
// --- path এখনো বদলায়নি। app এখনও data_<familyCode>-ই পড়ে/লেখে। এই ---
// --- অংশ শুধু নীরবে familyId তৈরি করে ও familyCodes/<code> → familyId ---
// --- lookup mapping লেখে (best-effort, ব্যর্থ হলেও app-এর মূল কাজ ---
// --- অপ্রভাবিত থাকে) — যাতে ভবিষ্যতে migration সহজে শুরু করা যায়। ---
// =====================================================================
// families/<familyId> ডকুমেন্টই family-এর "root/meta" ডকুমেন্ট হিসেবে
// কাজ করবে (design doc-এর "families/<familyId>/meta" ধারণার একটি ছোট,
// সরলীকৃত বাস্তবায়ন — future members/entries subcollection এই একই
// root doc-এর নিচে নেস্ট হবে)। এই মুহূর্তে এটি শুধু background prep;
// কোনো UI feature এখনো এর ওপর নির্ভর করে না।
// §৫ fix: বিদ্যমান (এই fix-এর আগে তৈরি হওয়া) family-দের dataCollectionName
// field নেই — এই ফাংশন সেটা একবারই, নিরাপদে ব্যাকফিল করে। derived মান
// সবসময় বর্তমান familyCode থেকেই বের করা হয় (getCollectionName() আগে
// প্রতিটি কলে ঠিক এই একই মান লাইভ গণনা করত) — তাই কোনো ডাটা move/copy/
// rename হয় না, শুধু এই নতুন metadata field একবার persist হয়। ব্যর্থ হলেও
// (network/rules-not-yet-deployed) local cache-এ derived মান বসিয়ে app
// আগের মতোই কাজ করে — পরের সফল বুটে আবার ব্যাকফিল চেষ্টা হবে (idempotent)।
// প্রথম Admin claim — ডিজাইন অনুযায়ী তিনটি ট্রিগারে ডাকা হয়:
// (১) কেউ custom Family Code সেট করলে, (২) কেউ Google Sign-in link করলে,
// (৩) প্রতিটি app boot-এ (Legacy read-rule gate fix, নতুন) — যাতে
// ব্র্যান্ড-নতুন/একা (adminUids:[]) family নিজের data পড়তে trigger #১/#২-এর
// অপেক্ষা না করে। যে uid প্রথমে claim করে, সে-ই প্রথম Admin হবে —
// "প্রথম-আসা" নিয়মটি Firestore Rules-এ server-side enforced (adminUids
// ফাঁকা থাকলেই কেবল লেখা গৃহীত হয়), শুধু client-side check নয়।
// §Performance Fix(২২ আগস্ট ২০২৬, Finding #2 ধাপ ১) — optional `preloaded`
// ({exists, data}) parameter; boot থেকে দিলে ensureFamilyMeta()-এর
// রিটার্ন-করা state-ই reuse হয় (আলাদা `ref.get()` আর লাগে না)। parameter
// না দিলে (standalone caller, custom-code-set/Google-link trigger) আগের
// মতোই ensureFamilyMeta() নিজের `.get()` করবে — backward-compatible।
// রিটার্ন-টাইপ(boolean) অপরিবর্তিত — বিদ্যমান caller-রা(৯০৫৪) কোনো পরিবর্তন
// ছাড়াই কাজ করবে।
// =====================================================================
// --- §Recovery Key(First Admin) — Spark-compatible, plaintext কখনো
// Firestore-এ যায় না ---
// =====================================================================
// SHA-256 hex hash(browser-native SubtleCrypto — কোনো library লাগে না)।
// [সরানো হয়েছে, Member Key সেশন] Admin Recovery Key(generateRecoveryKey/
// setupRecoveryKeyForCurrentAdmin/claimAdminWithRecoveryKey) সম্পূর্ণ বাদ
// দেওয়া হয়েছে — owner-approved সিদ্ধান্ত, প্রতিস্থাপিত হয়েছে নিচের
// §Member Key সিস্টেম দিয়ে(প্রতি member-এর নিজস্ব key, Admin-নির্ভরতা
// কমাতে)। families/{id}/private/recovery-এ পুরনো hash doc(যদি কোনো
// family-তে থেকে থাকে) অপরিবর্তিত/অব্যবহৃত রাখা হয়েছে — delete করলে
// অতিরিক্ত ঝুঁকি ছাড়া কোনো লাভ নেই, তাই touch করা হয়নি। sha256Hex()
// নিচে Member Key hash verify-এর জন্য reuse হচ্ছে।
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
// =====================================================================
// --- Phase C: Verify ধাপ (READ-ONLY — কোনো write/auto-fix/re-copy নেই) ---
// =====================================================================
// শুধু browser console থেকে ম্যানুয়ালি (`verifyPhaseCData()`)। এই
// ফাংশন কোনো write করে না, কিছু auto-fix/re-copy করে না, এবং কোনো
// পরবর্তী ধাপ (Switch/Cleanup) নিজে থেকে ডাকে না — শুধু source
// (data_<familyCode>) ও target (families/<familyId>/...) পাশাপাশি পড়ে
// একটা তুলনা-রিপোর্ট দেয়, সিদ্ধান্ত সবসময় ম্যানুয়াল থাকে।
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
// =====================================================================
// --- Multi-family Audit (সম্পূর্ণ READ-ONLY — কোনো write/fix/migration
// করে না) — শুধু browser console থেকে ম্যানুয়ালি (`auditAllFamiliesHealthCheck()`)।
// =====================================================================
// উদ্দেশ্য: §৩-এ পাওয়া bug pattern (familyCode stale / adminUids
// bracket-wrapped bug) অন্য যেকোনো family-তেও আছে কিনা — healthCheckFamily()-এর
// একই checks প্রতিটি families/<id> ডকুমেন্টের ওপর প্রয়োগ করে একটা সংক্ষিপ্ত
// summary টেবিল দেয়। প্রাইভেসি: কোনো পরিবারের raw familyCode বা adminUids
// মান কখনো log করা হয় না — শুধু status/ফলাফল (OK/সমস্যা আছে) ও issue-সংখ্যা।
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
// §Multi-device: v2 member doc থেকে সব owner uid বের করা (ownerUids array)।
// Migration সম্পূর্ণ ও verified(১৬ আগস্ট ২০২৬)-এর পর dual-fallback সরানো হয়েছে।
// =====================================================================
// --- Multi-device Migration: ownerUid(single) → ownerUids(array) ---
// (শুধু ম্যানুয়ালি browser console থেকে — `migrateOwnerUidsToArray()`)
// =====================================================================
// নিয়ম (owner-approved, কড়াভাবে মানা হয়েছে):
//   • শুধু v2 family, শুধু members collection স্পর্শ করে।
//   • যে member doc-এ ইতিমধ্যে ownerUids (array) আছে — সম্পূর্ণ স্কিপ (idempotent,
//     বারবার চালালেও নিরাপদ)।
//   • যে member doc-এ ownerUid(string, non-empty) আছে কিন্তু ownerUids নেই —
//     শুধু { ownerUids: [ownerUid] } লেখা হয় (merge:true, শুধু এই একটি key)।
//   • unclaimed(ownerUid null/নেই) member — কোনো write হয় না, স্কিপ (স্কোপ-বহির্ভূত,
//     app.js ইতিমধ্যে missing ownerUids-কে unclaimed হিসেবেই ব্যবহার করে —
//     functionally কোনো পার্থক্য পড়ে না)।
//   • পুরনো `ownerUid` field কখনো delete হয় না — dual-fallback নিরাপত্তা-জাল
//     হিসেবে থেকে যায় (পরবর্তী cleanup session-এ সরানো হবে, সব family
//     migration-verified হওয়ার পরে)।
//   • কোনো entry/weekly/অন্য কোনো field/collection touch হয় না।
// ব্যবহার:
//   dryRun (default true) — শুধু রিপোর্ট দেখায়, কোনো write হয় না।
//   migrateOwnerUidsToArray()                       → বর্তমান family, dry-run
//   migrateOwnerUidsToArray(false)                   → বর্তমান family, LIVE write
//   migrateOwnerUidsToArray(true, "otherFamilyId")   → নির্দিষ্ট family, dry-run
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
// --- Data Lifecycle Policy: one-time lastActiveAt backfill (owner-approved,
// ১৪ আগস্ট ২০২৬) — console-only, dry-run first, প্রতিটি real family-তে ম্যানুয়ালি
// familyId পাস করে চালাতে হবে। Baseline = আজকের timestamp (conservative — কোনো
// সদস্য/family ভুলবশত early-inactive হিসেবে চিহ্নিত হবে না)। Idempotent: আগে থেকে
// lastActiveAt থাকা doc merge:true-তে override হয় (re-run নিরাপদ, ক্ষতি নেই)।
// §First Admin Protection — বিদ্যমান family(এই feature deploy হওয়ার আগে
// claim হয়ে যাওয়া)-তে firstAdminUid field নেই। এই console-only, owner-manual
// ফাংশন একবার চালিয়ে সঠিক uid সেট করে দিতে হবে(কোন uid firstAdmin তা owner
// নিজেই জানেন — grandfather migration-এ যিনি প্রথম admin হয়েছিলেন)। ইতিমধ্যে
// firstAdminUid সেট থাকলে overwrite করবে না(নিরাপত্তা — ভুলবশত দ্বিতীয়বার
// চালালেও কোনো ক্ষতি নেই)।
// --- users/{uid} <-> familyCode mapping (Google-account-based recovery) ---
// ছোট, ঐচ্ছিক কালেকশন — Google-linked uid-কে familyCode-এর সাথে যুক্ত রাখে
// যাতে নতুন ডিভাইসে বা cache-clear-এর পরও শুধু Google sign-in করলেই সঠিক
// family code (এবং তাই সব সদস্য/রেকর্ড) স্বয়ংক্রিয়ভাবে ফিরে আসে। Family
// code দিয়ে সরাসরি sync করার existing flow অপরিবর্তিত থাকছে — এটি শুধু
// একটি অতিরিক্ত, বিকল্প recovery-পথ, কোনো breaking change নয়।
// §৫ fix: এখন cache-ব্যাকড — boot-এ ensureDataCollectionName() একবার
// families/{id}.dataCollectionName পড়ে/ব্যাকফিল করে cache পূরণ করে
// (App-এর boot useEffect-এ awaited)। cache পূরণ হওয়ার আগে বা কোনো কারণে
// ব্যর্থ হলে (network ইত্যাদি) আগের মতোই লাইভ familyCode থেকে derive করা
// হয় — fully backward-compatible fallback, কোনো call site (৩০+ জায়গা)
// পরিবর্তন করতে হয়নি কারণ ফাংশনটি এখনও সম্পূর্ণ synchronous।

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
// Google Drive থেকে ডাউনলোড করা ব্যাকআপ যাচাই করে, প্রয়োজনে এই ডিভাইসের
// family_code ব্যাকআপের সাথে মিলিয়ে সুইচ করে (নতুন ডিভাইসে "আগের অবস্থায়
// ফেরা"-র মূল অংশ), তারপর Firestore-এ merge করে।
// Switch prep fix: migrationState নতুন দ্বিতীয় param — mergeBackupData()-এ
// forward করা হয় (Switch-aware write path)।

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

// Auto-update(fresh-load-only, one-time): controllerchange শুধু page-load-এর
// প্রথম ৮ সেকেন্ডের "arm window"-এ শোনা হয়(fresh-open-এ আগে থেকে pending
// update থাকলে সেটাই ধরার জন্য)। Window পার হলে listener remove — mid-session
// background SW update কখনো এই পথে reload trigger করবে না। `reloaded` flag
// দিয়ে one-time guard(reload-loop প্রতিরোধ)। প্রকৃত reload dt-sw-updated
// event dispatch করে App()-এর ভেতরের dirty-state-aware handler করে(নিচে)।
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      let reloaded = false;
      const ARM_MS = 8000;
      const onControllerChange = () => {
        if (reloaded) return;
        reloaded = true;
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        window.dispatchEvent(new CustomEvent("dt-sw-updated"));
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }, ARM_MS);
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
import {
  Icon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Printer,
  Check,
  X,
  User,
  CalIcon,
  DownloadIcon,
  UploadIcon,
  Trash,
  LogOutIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  MenuIcon,
  CopyIcon,
  ShareIcon,
  MessageSquare,
  UsersIcon,
  ChevronDown,
  EditIcon,
  InfoIcon,
  GoogleIcon,
  RefreshIcon,
  Loader2,
  ClockIcon,
  AppLogo
} from "../components/icons.jsx";
import {
  MemberInfoModal,
  ExcuseInfoModal,
  WeeklyInfoModal,
  MeetingInfoModal
} from "../components/InfoModals.jsx";
import { HistoryModal } from "../components/HistoryModal.jsx";
import { NotificationPanel } from "../components/NotificationPanel.jsx";
import { ProfileDropdown } from "../components/ProfileDropdown.jsx";
import { AccessRequestsModal, CreateNewFamilyModal, FamilyCodeChoiceModal, JoinFamilyModal, RenameFamilyCodeModal } from "../components/FamilyManagement.jsx";
import { ArchiveModal, BackupOptionsModal, DriveRestoreModal, ImportOptionsModal } from "../components/BackupRestore.jsx";
import { MemberRequestsModal } from "../components/MemberRequests.jsx";
import { MemberKeyModal } from "../components/MemberKeyModal.jsx";
import { BecomeMemberModal, ClaimKeyModal } from "../components/MemberOnboardingModals.jsx";
import { MemberListSection } from "../components/MemberListSection.jsx";
import { DashboardHeader } from "../components/DashboardHeader.jsx";
import { PrintReport } from "../components/PrintReport.jsx";
import { WeeklyReflectionSection, MonthlyOverviewSection, MeetingMinutesSection, DeleteAccountWarningModal, AddCustomFieldModal, FeedbackModal, MilestoneToast } from "../components/DashboardSections.jsx";
import { DailyEntrySection } from "../components/DailyEntrySection.jsx";
import { GoogleAccountModal } from "../components/GoogleAccountModal.jsx";
import { OnboardingBridge } from "../components/OnboardingBridge.jsx";
import { Onboarding } from "../components/Onboarding.jsx";

// ---- Theme color (per-device display preference, kept in localStorage only) ----

// Approximate Hijri (tabular Islamic calendar) conversion — accurate within ~1 day
// of moon-sighting-based calendars used locally; for general reference only.

// Computes week rows (1..N) for the currently open month so week 5 only
// shows up when the month actually has 29-31 days. Keeps the "সপ্তাহ" label
// in sync with the same 7-day buckets the progress graph uses (১-৭, ৮-১৪, ...).

// =====================================================================
// --- Switch prep: Path Resolver (Step 1 — শুধু DEFINE করা হলো, এখনো
// কোনো caller/ফাংশন এটি ব্যবহার করছে না। migrationState অনুযায়ী legacy
// বনাম v2 collection ও doc-id convention নির্ধারণ করবে — future Step-এ
// ধাপে ধাপে saveEntry/loadMembersV2/monthEntries listener ইত্যাদিকে এই
// resolver-aware করা হবে। "locked" state ইচ্ছাকৃতভাবে legacy resolver
// পায় (read তখনো legacy-ই authoritative; write আটকানো Rules+UI গার্ড
// দিয়ে হবে, resolver-এর দায়িত্ব না)। ---
// =====================================================================

// --- Data Lifecycle Policy: activity stamp (owner-approved, ১৪ আগস্ট ২০২৬) ---
// lastActiveAt শুধুমাত্র inactivity/TTL cleanup-এর জন্য — ইচ্ছাকৃতভাবে নেটিভ
// Firestore Timestamp (app-এর বাকি সব timestamp ফিল্ডের মতো Date.now()
// epoch-number না), কারণ Firestore-এর TTL Policy শুধু native Timestamp
// ফিল্ডে কাজ করে। এটা existing `updatedAt` (conflict-resolution/backup-merge
// semantics)-কে স্পর্শ করে না — সম্পূর্ণ আলাদা, dedicated ফিল্ড।
// memberRef/familyId যেকোনো একটি null দিলে সেই অংশ স্কিপ হয়।
// uid(optional, ১৭ আগস্ট ২০২৬): দিলে memberRef-এর ownerActivity.<uid>-ও একই
// merge-এ stamp হয় (FIFO Member-Claim device-limit fix-এর জন্য per-uid
// recency ট্র্যাক) — deep-merge(nested map, একটাই key touch, বাকি
// ownerActivity entries অক্ষুণ্ণ থাকে)।
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
// H-2 fix: previously a plain update() with no read-check, so two devices
// claiming the same unclaimed member at nearly the same time could race —
// whichever write landed last would silently win, with no indication to
// the earlier device that its claim had been overwritten. Wrapping this in
// a transaction makes the check-then-write atomic: we read the member's
// CURRENT ownerUid inside the transaction and only proceed if it's still
// unowned (or already owned by this same uid); otherwise we throw so the
// caller's existing catch/alert can inform the user, instead of silently
// overwriting another device's claim.
// ১০-১২ digit numeric key — crypto-secure random(Math.random() নয়),
// মনে রাখা/টাইপ করা সহজ রাখতে বিশুদ্ধ সংখ্যা।
// §Member Key(শক্তিশালী ফরম্যাট, owner-approved ১৬ আগস্ট ২০২৬): সংখ্যা+
// অক্ষর+সিম্বল মিশ্রিত, দৈর্ঘ্য ৯-১২(random)। বিভ্রান্তিকর ক্যারেক্টার(0/O/o,
// 1/l/I) generation-এ বাদ দেওয়া হয়েছে(হাতে টাইপ করা সহজ রাখতে)। প্রতিটি
// key-তে অন্তত ১টি সংখ্যা + ১টি অক্ষর + ১টি সিম্বল guarantee করা হয়, বাকি
// ক্যারেক্টার পুরো pool থেকে cryptographically random, তারপর shuffle।
// পুরনো(numeric-only, ইতিমধ্যে ইস্যু করা) key অপরিবর্তিত/বৈধ থাকবে(verify
// শুধু hash-ভিত্তিক, charset-নির্ভর নয়) — শুধু নতুন/rotate করা key-এ এই
// ফরম্যাট প্রযোজ্য। firestore.rules-এ memberKey regex একসাথে আপডেট করা
// হয়েছে(superset — পুরনো numeric-ও এখনো match করে)।
// §English-only validation(২৩ আগস্ট ২০২৬, owner-approved) — Member Password-এ
// allow: English letter(A-Za-z), digit(0-9), এবং নিচের generateMemberKeyPlain()-এ
// ব্যবহৃত একই symbol pool(!@#$%&*+-_) — নতুন কোনো charset পুল না বানিয়ে
// existing auto-gen pattern-ই reuse করা হয়েছে।
// §Readable Member Password(২৩ আগস্ট ২০২৬, owner-approved): আগের ৯-১২
// ক্যারেক্টার জটিল random key-এর বদলে সহজে মনে-রাখা/পড়া যায় এমন প্যাটার্ন —
// সদস্যের নামের English অংশ(Capitalize প্রথম অক্ষর) + ২-৩টি random digit,
// যেমন "Nika21"। নামে ব্যবহারযোগ্য English letter(অন্তত ৩টি) না থাকলে(যেমন
// বাংলা নাম) generic fallback "Member" + ৩টি digit(যেমন "Member482")।
// Rules-এর min-length(৬) নিশ্চিত করতে প্রয়োজনে digit বাড়ানো হয়। পুরনো
// generateMemberKeyPlain() অপরিবর্তিত রাখা হয়েছে — extreme-fallback(নিচে)
// ও changeMemberKey()-এর dead-but-existing internal fallback branch-এ
// এখনো ব্যবহৃত।
// Member তৈরির সাথে সাথেই(admin-only path) key তৈরি — member doc ও
// private/key doc একই batch-এ লেখা হয়, যাতে কখনো key-বিহীন member
// তৈরি না হয়। শুধু plaintext key caller-কে return হয়(display/copy-এর
// জন্য); hash claim-verify-এর জন্য Firestore-এ থাকে(sha256Hex reuse,
// আগে Admin Recovery Key-তে ব্যবহৃত একই ফাংশন)।
// নিজের(owner) অথবা admin — member-এর plaintext key fetch(শুধু
// প্রদর্শন/copy-এর জন্য; Rules owner/admin ছাড়া reject করবে)।
// Member Key দিয়ে claim(existing member-এর ownership ফিরে পাওয়া) —
// client শুধু hash পাঠায়(plaintext কখনো network-এ যায় না), Rules
// hidden memberKeyHash-এর সাথে মিলিয়ে ownerUids বদলানোর অনুমতি দেয়।
// §Multi-device(v2-only, max 3): single ownerUid overwrite-এর বদলে এখন
// transaction দিয়ে বর্তমান ownerUids পড়ে, ৩টির কম থাকলে/এই uid ইতিমধ্যে
// থাকলে(no-op duplicate-prevention) append করা হয়।
// §Admin FIFO(১৯ আগস্ট ২০২৬, ৭-দিন threshold তুলে দেওয়া হয়েছে): আগে
// admin পূর্ণ(৩) থাকলে সবসময় hard-reject হতো, তারপর ৭-দিন-stale gate
// যোগ হয়েছিল — এখন সেই সময়-শর্ত সম্পূর্ণ সরানো হয়েছে(owner-সিদ্ধান্ত)।
// non-admin-এর মতোই unconditional FIFO: stalest ownerActivity বাদ দিয়ে
// নতুন device যোগ হয়। ব্যতিক্রম শুধু firstAdminUid — নিচের stale-uid
// নির্বাচনের সময় candidate থেকে বাদ রাখা হয়, ফলে সে কখনো evict-attempt
// হয় না(rules-এর family-root swap clause-ও আলাদাভাবে একই সুরক্ষা দেয়)।
// §Member Key Direct-Identify(১৯ আগস্ট ২০২৬) — Family Code + Member
// Password একসাথে দিয়ে সরাসরি login(member নাম বেছে নেওয়ার প্রয়োজন নেই)।
// পুরো ফাংশন non-committing পর্যন্ত claim সফল না হয়: family resolve ও
// keyIndex lookup কোনোটাই localStorage/reload স্পর্শ করে না। শুধু
// keyIndex hit + claimMemberWithKey() সফল হলেই family state
// commit(localStorage)+reload হয় — miss বা ভুল password হলে কলার একই
// screen-এ থেকে generic error দেখাবে, বিদ্যমান family/session অক্ষত থাকে।
// One-time migration: if no v2 (member:*) docs exist yet but a legacy v1
// array-doc has members, copy each into its own v2 doc as "unclaimed"
// (ownerUid: null) — any device may claim them later from the member list.
// The legacy doc is left untouched (not deleted) as a safety net.
// Step 2 (Switch prep): migrationState-এর প্রথম parameter হিসেবে নেওয়া
// হয় resolvePathContext()-কে ফিড করতে। migrationState "legacy" হলে
// (বর্তমানে সবসময়ই তাই, যেহেতু Rules-এ এই field এখনো deploy হয়নি)
// আউটপুট আগের হার্ডকোডেড আচরণের সাথে বিট-ফর-বিট অভিন্ন — resolver শুধু
// db.collection(getCollectionName()) + entry:<memberId>:<key> ফেরত দেয়,
// ঠিক যেমন আগে ছিল। familyCode/familyId প্রতিটি কলে fresh নেওয়া হয়
// (কোনো cache/stale variable ব্যবহার হয় না)।
// Edit History / Data Integrity: before overwriting a day's entry with a new
// edit, the previous saved version is archived into a "history" subcollection
// under that day's document. Only the last 5 versions are kept per day —
// older ones are pruned right after each push so the subcollection never
// grows unbounded.
// Note: month entries are no longer fetched with a one-off list+get batch
// (loadMonthEntries) — the live onSnapshot subscription in App's
// monthEntries effect replaced it, so that unused function was removed.


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
  // Admin Visibility UI — বর্তমান family-র adminUids array (একই boot
  // fetch থেকে সেট, কোনো extra read না)। badge/Make-Admin/Remove-Admin
  // বাটন দেখানোর জন্য প্রয়োজন।
  const [adminUidsList, setAdminUidsList] = useState([]);
  // §First Admin Protection — বর্তমান family-র firstAdminUid(একই boot
  // fetch থেকে সেট, extra read নেই)। null/undefined মানে পুরনো family
  // যেখানে backfill হয়নি — সেক্ষেত্রে protection স্বয়ংক্রিয়ভাবে বাইপাস হয়।
  const [firstAdminUid, setFirstAdminUid] = useState(null);
  // §Notification System(২৩ আগস্ট ২০২৬ সংশোধন) — read+unread উভয় notification
  // live-updated(boot-এ onSnapshot দিয়ে) ও panel খোলা আছে কিনা। আগে শুধু
  // unread(read==false) filter করা হতো, ফলে "seen" করলেই item panel থেকে
  // হারিয়ে যেত(bug)। এখন পুরো list রাখা হয়, শুধু delete/Clear-all দিয়েই
  // item সরে; badge/unread-count আলাদাভাবে notifications.filter(!read) থেকে
  // derive করা হয়।
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  // §Recovery Key — first-admin claim-এর ঠিক পরে key দেখানোর modal, ও
  // [সরানো, Member Key সেশন] showRecoveryKeyModal/generatedRecoveryKey/
  // showRecoveryClaim/recoveryKeyInput/recoveryClaimBusy — Admin Recovery
  // Key UI toggle-গুলো বাদ দেওয়া হয়েছে(নিচে §Member Key state দেখুন)।
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  // §Member Key(নতুন) — key প্রদর্শন/copy/change মোডাল, claim-with-key
  // মোডাল, এবং "সদস্য হোন" self-request মোডাল+admin-approval প্যানেল।
  const [showMemberKeyModal, setShowMemberKeyModal] = useState(false);
  const [memberKeyTarget, setMemberKeyTarget] = useState(null);
  const [memberKeyValue, setMemberKeyValue] = useState(null);
  // fetch শেষ হয়েছে কিন্তু key doc-ই নেই(পুরনো, Member Key System-এর আগে
  // তৈরি member) — এই অবস্থাকে "এখনো লোড হচ্ছে"(null) থেকে আলাদা করতে।
  const [memberKeyLoading, setMemberKeyLoading] = useState(false);
  const [memberKeyRevealed, setMemberKeyRevealed] = useState(false);
  const [showChangeKeyForm, setShowChangeKeyForm] = useState(false);
  const [memberKeyBusy, setMemberKeyBusy] = useState(false);
  const [copiedMemberKey, setCopiedMemberKey] = useState(false);
  // §Manual Member Password set(২০ আগস্ট ২০২৬) — খালি রাখলে auto-generate,
  // পূরণ করলে owner নিজে টাইপ করা password সেভ হয়(changeMemberKey customKey)।
  const [manualKeyInput, setManualKeyInput] = useState("");
  // §Password UI revamp(২০ আগস্ট ২০২৬): oldKeyInput এখন "পূর্বের Password
  // verify" এর বদলে confirm-password ঘর হিসেবে reuse হচ্ছে — পূর্বের
  // password শুধু masked display(readonly), যাচাই করার প্রয়োজন নেই(owner
  // নিজে ঠিক করেছেন — এই অ্যাপ শুধু daily-amal ট্র্যাকার, risk গ্রহণযোগ্য)।
  const [confirmKeyInput, setConfirmKeyInput] = useState("");
  const [showClaimKeyModal, setShowClaimKeyModal] = useState(false);
  const [claimKeyTarget, setClaimKeyTarget] = useState(null);
  const [claimKeyInput, setClaimKeyInput] = useState("");
  const [claimKeyBusy, setClaimKeyBusy] = useState(false);
  const [showBecomeMemberModal, setShowBecomeMemberModal] = useState(false);
  const [becomeMemberName, setBecomeMemberName] = useState("");
  const [becomeMemberGender, setBecomeMemberGender] = useState("male");
  const [becomeMemberBusy, setBecomeMemberBusy] = useState(false);
  const [myMemberRequestStatus, setMyMemberRequestStatus] = useState(null);
  // §"সদস্য হোন" pre-generated password(২২ আগস্ট ২০২৬): pending screen-এ
  // দেখানোর জন্য — memberRequests/{uid}.presetKey থেকেই আসে(নতুন কোনো
  // persistence-layer না, memberRequest doc-ই single source of truth)।
  const [myMemberRequestKey, setMyMemberRequestKey] = useState(null);
  // §Onboarding Gate reopen-fix(২৩ আগস্ট ২০২৬): নিচের myMemberRequestStatus
  // effect সম্পন্ন(success/error/bail — যেকোনোভাবে) হওয়ার আগে বুট-loading গেট
  // ছাড়া হবে না(নিচে দ্রষ্টব্য), যাতে pending status Firestore থেকে confirm
  // হওয়ার আগেই Dashboard-এর transient bypass না ঘটে। একবার true হলে পরের
  // re-run-গুলোতে আর false-এ reset হয় না(normal user-দের জন্য flicker এড়াতে)।
  const [myMemberRequestChecked, setMyMemberRequestChecked] = useState(false);
  // §Onboarding continuation — Family Code submit-এর পরে reload হওয়া
  // সত্ত্বেও Onboarding() flow ধারাবাহিক রাখতে। sessionStorage flag
  // Onboarding()-এ সেট হয়েছে; এখানে শুধু পড়া+ধাপ-অনুসরণ। কোনো নতুন
  // Firestore collection/rule নেই — শুধু existing modal/function সঠিক
  // ক্রমে auto-trigger হয় (OnboardingBridge কম্পোনেন্ট, নিচে render)।
  const [onbFlow] = useState(() => {
    try { return sessionStorage.getItem("dt_onboarding_flow"); } catch { return null; }
  });
  const [onbStep, setOnbStepRaw] = useState(() => {
    try { return sessionStorage.getItem("dt_onboarding_step"); } catch { return null; }
  });
  function onbAdvance(nextStep) {
    setOnbStepRaw(nextStep);
    try {
      if (nextStep) {
        sessionStorage.setItem("dt_onboarding_step", nextStep);
      } else {
        sessionStorage.removeItem("dt_onboarding_step");
        sessionStorage.removeItem("dt_onboarding_flow");
      }
    } catch {}
  }
  useEffect(() => {
    if (onbFlow && !onbStep) {
      // বাগ-ফিক্স(২০ আগস্ট ২০২৬): নতুন page-2(Onboarding()) নিজেই
      // Google/Login/Join-এর choice দেয় বলে "choose"(পুরনো ৩য় পেজ) আর
      // দরকার নেই — "existingFamily" flow(join-as-new-member ও Google
      // fallback উভয়ই) সরাসরি "becomeMember"-এ যায়। "choose" definition
      // এখনো আছে শুধু becomeMember-cancel fallback-এর safety-net হিসেবে(নিচে)।
      onbAdvance(onbFlow === "newFamily" ? "addMember" : "becomeMember");
    }
  }, [onbFlow]);
  const [showMemberRequestsModal, setShowMemberRequestsModal] = useState(false);
  const [pendingMemberRequests, setPendingMemberRequests] = useState([]);
  const [loadingMemberRequests, setLoadingMemberRequests] = useState(false);
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
  // Auto-update reload(fresh-load-only, dt-sw-updated event — dispatch হয়
  // top-level SW-registration কোড থেকে, দেখুন ফাইলের শুরুর দিকে)। Unsaved
  // entry/weekly/meeting থাকলে reload skip করা হয়(data-loss এড়াতে); পরের
  // স্বাভাবিক নেভিগেশন/reload-এ আপডেট এমনিতেই প্রযোজ্য হয়ে যাবে।
  useEffect(() => {
    const handler = () => {
      const hasUnsaved = entryDirtyRef.current || weeklyDirtyRef.current || meetingDirtyRef.current;
      if (hasUnsaved) return;
      window.location.reload();
    };
    window.addEventListener("dt-sw-updated", handler);
    return () => window.removeEventListener("dt-sw-updated", handler);
  }, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  // §Approved-member Google welcome(২৩ আগস্ট ২০২৬) — নিচের myMemberRequestStatus
  // effect-এ trigger হয়(main App render-এ, onboarding gate-এর বাইরে)।
  const [showApprovedGoogleWelcome, setShowApprovedGoogleWelcome] = useState(false);
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
  const [showRenameChangeForm, setShowRenameChangeForm] = useState(false);
  const [renameConfirmInput, setRenameConfirmInput] = useState("");
  const [renameCodeRevealed, setRenameCodeRevealed] = useState(false);
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
    let notifUnsub = null;
    (async () => {
      // Google sign-in বা family code — যেটাই আগে পাওয়া যায়, সেই অনুযায়ী
      // একই family/profile/records auto-load হওয়া নিশ্চিত করতে, member
      // লোড করার আগেই (Google-linked থাকলে) account-এর সংরক্ষিত family
      // code দিয়ে local code sync করে নেওয়া হচ্ছে।
      await syncFamilyCodeWithAccount();
      // Switch prep (Step 1): migrationState listener attach করার আগে
      // ensureFamilyCodeMapping() await করা হচ্ছে (Performance Audit fix,
      // ২২ আগস্ট ২০২৬: আগে এখানে একটি non-blocking fire-and-forget কলও
      // ছিল — সেটি awaited না হওয়ায় কোনো real ordering guarantee দিত না,
      // শুধু প্রতি boot-এ একটি অতিরিক্ত duplicate familyCodes read যোগ
      // করছিল, তাই সরানো হয়েছে) — কারণ local family_id boot-এর প্রথম
      // মুহূর্তে server-এর সাথে out-of-sync/stale থাকতে পারে (self-heal
      // সম্পন্ন না হওয়া পর্যন্ত)। getFamilyId() এখানে কল করার আগে সেই
      // self-heal সম্পন্ন হয়েছে কিনা নিশ্চিত করতে এই awaited কলটি প্রয়োজন।
      await ensureFamilyCodeMapping();
      // §Performance Fix(২২ আগস্ট ২০২৬, Finding #2 ধাপ ১) — families/{id}
      // এখন এখানে একবারই fetch হয়(self-heal-পরবর্তী, সঠিক familyId দিয়ে);
      // আগের redundant non-awaited "Phase A prep" fire-and-forget কলটি
      // (self-heal-এর *আগে* ফায়ার হতো, ভুল/stale familyId-এর ঝুঁকি ছিল)
      // সম্পূর্ণ সরানো হয়েছে — নিচের awaited ensureFamilyMeta() একই কাজ
      // idempotent-ভাবে করে, তাই কোনো functional পরিবর্তন নেই। এই একটিমাত্র
      // read-এর state ensureFamilyMeta→ensureDataCollectionName→
      // claimFirstAdminIfEligible — তিনটিতেই thread হয় (প্রতিটি write-এর
      // পর in-memory state আপডেট হয়ে পরের ধাপে যায়), ফলে এই চেইনে আগে
      // ৫টা আলাদা `.get()` লাগত, এখন ১টা।
      const initialFamSnap = await familyDocRef().get();
      let famState = { exists: initialFamSnap.exists, data: initialFamSnap.exists ? initialFamSnap.data() : null };
      // §৫ fix: familyId self-heal সম্পন্ন হওয়ার পরই family doc নিশ্চিত
      // (idempotent — আগে থেকে থাকলে no-op) ও dataCollectionName cache
      // পূরণ করা হচ্ছে — এর পরের যেকোনো read/write (migrateMembersIfNeeded
      // থেকে শুরু করে) getCollectionName()-এর সঠিক, familyCode-independent
      // মান পাবে।
      famState = await ensureFamilyMeta(famState);
      famState = await ensureDataCollectionName(famState);
      // Legacy read-rule gate fix: ব্র্যান্ড-নতুন/একা (auto-generated,
      // adminUids:[]) family-তে আগে শুধু "custom code সেট" বা "Google
      // link" trigger-এ admin claim হতো — legacy read-gate deploy হওয়ার
      // পর এই দুই trigger না ঘটা পর্যন্ত এমন family নিজেই নিজের data পড়তে
      // পারছিল না (isApprovedMember()-এ admin/approved কেউ ছিল না)।
      // এখানে boot-এই (idempotent, awaited) claim করে এই gap বন্ধ করা
      // হলো — বিদ্যমান শেয়ার্ড family-তে (adminUids ইতিমধ্যে অ-খালি)
      // কোনো প্রভাব নেই (ফাংশন internally no-op করে), Rules-এর
      // "প্রথম-আসা" নিয়ম অপরিবর্তিত।
      await claimFirstAdminIfEligible(famState);
      // [সরানো, Member Key সেশন] Recovery Key modal trigger বাদ।
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
        (err) => {
          // Fail-closed: listener error হলে migrationState ইচ্ছাকৃতভাবে
          // অপরিবর্তিত (undefined-ই) রাখা হচ্ছে — কোনো "legacy" fallback
          // বা কোনো SDK auto-retry আচরণের ওপর নির্ভরতা নেই। App
          // loading-gate-এ থেকে যাবে যতক্ষণ না একটি সফল snapshot আসে।
          // Diagnostic(১৫ আগস্ট ২০২৬, Item ৩১): root cause pin করার জন্য
          // সাময়িক console.error — permission-denied হলে ঠিক কোন
          // familyId/uid-এ deny হচ্ছে তা দেখা যাবে।
          console.error(
            "[migrationState listener error]",
            err && err.code,
            err && err.message,
            "familyId:", migrationFamilyId,
            "uid:", auth.currentUser ? auth.currentUser.uid : null
          );
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
        setAdminUidsList(Array.isArray(famAdminUids) ? famAdminUids : []);
        // [DEBUG, temporary] Diagnosis-purpose log — remove after root-cause confirmed.
        console.log("[DEBUG boot] myUid:", myUid, "famAdminUids:", famAdminUids, "isAdmin:", Array.isArray(famAdminUids) && myUid ? famAdminUids.includes(myUid) : false);
        // §First Admin Protection — একই fetch থেকে, extra read ছাড়াই।
        setFirstAdminUid(migFamSnap.exists ? (migFamSnap.data().firstAdminUid || null) : null);
        // §Notification System(২৩ আগস্ট ২০২৬ সংশোধন) — নিজের সব
        // notification(read+unread)-এ live listener, যাতে "seen"(read:true)
        // করার পরও item panel থেকে হারিয়ে না যায়(শুধু explicit delete/Clear-all
        // দিয়েই সরবে)। badge unread-count আলাদাভাবে filter করে বের করা হয়।
        // Spark-এ negligible cost(৩-member স্কেলে খুবই কম doc)।
        if (myUid) {
          notifUnsub = db.collection("families").doc(migrationFamilyId)
            .collection("notifications")
            .where("targetUid", "==", myUid)
            .orderBy("createdAt", "desc")
            .limit(30)
            .onSnapshot(
              (nsnap) => {
                // [DEBUG, temporary] Diagnosis-purpose log — remove after root-cause confirmed.
                console.log("[DEBUG notif-listener] SNAPSHOT received, doc count:", nsnap.docs.length, "docs:", nsnap.docs.map(d => ({ id: d.id, targetUid: d.data().targetUid, createdAt: d.data().createdAt })));
                setNotifications(nsnap.docs.map(d => ({ id: d.id, ...d.data() })));
              },
              (err) => {
                // [DEBUG, temporary] Diagnosis-purpose log — remove after root-cause confirmed.
                console.error("[DEBUG notif-listener] ERROR:", err);
              }
            );
        }
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
                // সাময়িক moderation-off (১৫ আগস্ট ২০২৬, owner-approved):
                // নতুন access-request এখন সরাসরি "approved"-এ create হয়
                // (আগে "pending" থাকত, admin approve করা লাগত)। Rules-এ
                // self-create-এ approved status-ও allow করা হয়েছে।
                // isApprovedMember() ও অন্য কোনো security boundary বদলায়নি।
                await reqRef.set({ status: "approved", requestedAt: Date.now() });
                // যেহেতু মডারেশন অটো-অন, "অনুমোদনের অপেক্ষায়" স্ক্রিন
                // দেখানোর দরকার নেই — সাথে সাথেই approved, তাই একবার
                // reload করলে migrateMembersIfNeeded() স্বাভাবিকভাবে সফল
                // হবে(নতুন accessRequest doc এখন approved অবস্থায় আছে)।
                window.location.reload();
                return;
              }
              // reqSnap আগে থেকেই exists(status যাই হোক — approved/pending/
              // denied legacy leftover) হলে এখানে কিছু করা হচ্ছে না, নিচের
              // pending-screen fallback-এ যাবে(rare inconsistency-তে
              // infinite-reload এড়াতে)।
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
      if (notifUnsub) notifUnsub();
    };
  }, []);
  const [recoveryMessage, setRecoveryMessage] = useState(false);
  const [weeklyReminderBanner, setWeeklyReminderBanner] = useState(false);
  const [monthlyReminderBanner, setMonthlyReminderBanner] = useState(false);
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
  const isLockedForThisDevice = !!(selectedMember && selectedMember.ownerUids && selectedMember.ownerUids.length && (!auth.currentUser || !selectedMember.ownerUids.includes(auth.currentUser.uid)));
  // Step 5 (Switch prep): UI-level (app) guard — server-side Rules enforcement
  // (approved design) is the real safety boundary; this is purely UX so the
  // person sees a clear message instead of a raw Firestore permission error
  // during the brief "locked" window of a family's Switch.
  const isLockedForSwitch = migrationState === "locked";
  // §"সদস্য হোন" — নিজের memberRequest status(pending/approved/denied)
  // জানার জন্য(v2-only)। members বদলালে(নিজের member approve হলে) আবার
  // চেক হয়, যাতে status স্বয়ংক্রিয়ভাবে আপডেট হয়।
  useEffect(() => {
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (!myUid || migrationState !== "v2" || !getFamilyId()) {
      setMyMemberRequestStatus(null);
      setMyMemberRequestKey(null);
      setMyMemberRequestChecked(true);
      return;
    }
    db.collection("families").doc(getFamilyId())
      .collection("memberRequests").doc(myUid).get()
      .then(snap => {
        setMyMemberRequestStatus(snap.exists ? snap.data().status : null);
        setMyMemberRequestKey(snap.exists ? (snap.data().presetKey || null) : null);
      })
      .catch(() => {})
      .finally(() => setMyMemberRequestChecked(true));
  }, [members, migrationState]);
  // §Approved-member Google welcome(২৩ আগস্ট ২০২৬): নিজের memberRequest
  // "approved" হলে ও এখনো Google-linked না হলে, মূল App page-এ একবার
  // welcome-popup দেখানো হয়(existing GoogleAccountModal/linkGoogleAccount()
  // reuse, নতুন auth logic নেই)। localStorage flag শুধুই UX "একবার দেখানো"
  // মনে রাখতে — এটা কোনো access/authorization নির্ধারণ করে না, শুধু
  // popup আবার দেখানো এড়ায়(worst-case flag miss হলেও শুধু popup আবার
  // দেখাবে, কোনো নিরাপত্তা-ঝুঁকি নেই)।
  useEffect(() => {
    if (myMemberRequestStatus !== "approved") return;
    if (isGoogleLinked()) return;
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (!myUid) return;
    const flagKey = "dt_google_welcome_shown_" + myUid;
    let alreadyShown = false;
    try { alreadyShown = !!localStorage.getItem(flagKey); } catch {}
    if (alreadyShown) return;
    setShowApprovedGoogleWelcome(true);
  }, [myMemberRequestStatus]);
  function dismissApprovedGoogleWelcome() {
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (myUid) {
      try { localStorage.setItem("dt_google_welcome_shown_" + myUid, "1"); } catch {}
    }
    setShowApprovedGoogleWelcome(false);
  }
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
            text: `Daily Task ডেটা ব্যাকআপ — ${fileName}`
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
      alert("ডেটা এক্সপোর্ট করতে সমস্যা হয়েছে: " + err.message);
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
      // H-1 fix(Audit, ১৫ আগস্ট ২০২৬): explicit=false(auto-check, যেমন
      // Google link-এর পরপরই বা বুট-টাইমে) হলে token আগেই silent-only
      // (allowConsentPopup:false) fetch করে নেওয়া হচ্ছে — silent ব্যর্থ
      // হলে এখানেই থেমে যাবে(নিচের catch), findDriveBackupFile()-এর
      // ভেতরের driveFetch()/getDriveAccessToken() default(true)-এ পৌঁছাবে
      // না, তাই কোনো consent popup খুলবে না। token একবার cache হয়ে গেলে
      // (driveAccessToken module-level) পরের driveFetch() কলগুলো সেই cache
      // থেকেই পাবে, নতুন করে prompt করবে না। explicit=true(ব্যবহারকারীর
      // সরাসরি ক্লিক)-এ এই pre-fetch skip — আগের মতোই consent popup পাবে।
      if (!explicit) {
        await getDriveAccessToken(false);
      }
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
      window.alert("Google Drive থেকে ডেটা সফলভাবে রিস্টোর (মার্জ) করা হয়েছে।");
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
            alert(`ডেটা ইম্পোর্ট হয়েছে। তবে ${result.skippedKeys.length}টি এন্ট্রি স্কিপ করা হয়েছে, কারণ সেগুলো অন্য ডিভাইসের দায়িত্বে থাকা সদস্যের — সেগুলো সেই সদস্যের নিজের ডিভাইস থেকে ইম্পোর্ট করতে হবে।`);
          } else {
            alert("ডেটা সফলভাবে ইম্পোর্ট করা হয়েছে!");
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
  // §"সদস্য হোন" — Admin-only pending memberRequests লোড(accessRequests-এর
  // একই pattern)।
  async function loadPendingMemberRequests() {
    setLoadingMemberRequests(true);
    try {
      const famId = getFamilyId();
      const snap = await db.collection("families").doc(famId)
        .collection("memberRequests").where("status", "==", "pending").get();
      setPendingMemberRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      setPendingMemberRequests([]);
    } finally {
      setLoadingMemberRequests(false);
    }
  }
  // decision: "approved" | "denied"। approved হলে member doc + private/key
  // একই সময়ে(createMemberWithKey) তৈরি হয়, ownerUid = অনুরোধকারীর uid —
  // অর্থাৎ approval-এর সাথে সাথেই সে নিজের member auto-claimed অবস্থায়
  // পায়, আলাদা করে "দায়িত্ব নিন" লাগে না।
  async function decideMemberRequest(req, decision) {
    // §Race-fix(২৩ আগস্ট ২০২৬): member-list ও notification-panel উভয় জায়গা
    // থেকেই একই pendingMemberRequests state থেকে render হয়(single source)।
    // কোনো await-এর আগেই(synchronously) list থেকে সরানো হয়, যাতে দুই জায়গা
    // থেকে quick double-tap হলেও দ্বিতীয় call approve/reject আর কিছু খুঁজে
    // না পায়(duplicate member তৈরি/duplicate write প্রতিরোধ)। ব্যর্থ হলে
    // item ফিরিয়ে আনা হয়, যাতে retry করা যায়।
    setPendingMemberRequests(list => list.filter(r => r.id !== req.id));
    try {
      const famId = getFamilyId();
      if (decision === "approved") {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newMember = {
          id,
          name: req.name,
          gender: req.gender || "male",
          ownerUids: [req.id],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await createMemberWithKey(newMember, req.presetKey);
        setMembers(prev => [...(prev || []), newMember]);
      }
      await db.collection("families").doc(famId)
        .collection("memberRequests").doc(req.id)
        .update({ status: decision, decidedAt: Date.now() });
    } catch (err) {
      setPendingMemberRequests(list => list.some(r => r.id === req.id) ? list : [...list, req]);
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
      window.alert(`ফ্যামিলি ইউজারনেম কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
      return;
    }
    if (!isFamilyCodeCharsetValid(code)) {
      window.alert("অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।");
      return;
    }
    if (!window.confirm(`"${code}" কোড দিয়ে সম্পূর্ণ নতুন, খালি একটি ফ্যামিলি স্পেস তৈরি হবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডেটা অক্ষত থাকবে, কিন্তু এই ডিভাইস থেকে আর দেখা যাবে না। এগিয়ে যাবেন?`)) return;
    setNewFamCodeBusy(true);
    try {
      const result = await createNewFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          length: `কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`,
          charset: "অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।",
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
    if (!window.confirm(`"${code}" কোড দিয়ে সেই ফ্যামিলিতে যোগ দেওয়ার অনুরোধ পাঠানো হবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডেটা অক্ষত থাকবে, কিন্তু এই ডিভাইস থেকে আর দেখা যাবে না। এগিয়ে যাবেন?`)) return;
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
      window.alert(`ফ্যামিলি ইউজারনেম কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
      return;
    }
    if (!isFamilyCodeCharsetValid(code)) {
      window.alert("অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।");
      return;
    }
    if (!window.confirm(`কোড "${code}"-তে পরিবর্তন করবেন? আপনার পরিবারের সব ডেটা অক্ষত থাকবে (কোনো কপি/লস হবে না) — শুধু পরিবারের পরিচিতি-কোড বদলাবে। বাকি সদস্যদের ডিভাইসে অটো নতুন কোড বসে যাবে ও নোটিশ দেখাবে।`)) return;
    setRenameFamCodeBusy(true);
    try {
      const result = await changeFamilyCodeForExistingFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          length: `কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`,
          charset: "অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।",
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
          message: `${feedbackMsg}\n\nFamily Username: ${getFamilyCode()}`
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
  // §Member Key সেশন — এই বাটন এখন শুধু Admin-এর(স্মার্টফোন-বিহীন
  // সদস্যকে সরাসরি যোগ করার জন্য — যেমন বাবা/মা)। সাধারণ সদস্য এখন
  // "সদস্য হোন" দিয়ে অনুরোধ করেন(handleRequestToBecomeMember)। ownerUid
  // ইচ্ছাকৃতভাবে null(unclaimed) — admin নিজে যাকে যোগ করছেন, ভবিষ্যতে
  // Member Key দিয়ে সেই ব্যক্তি নিজেই claim করতে পারবেন।
  async function handleAddMember() {
    if (!isAdmin) {
      alert("নতুন সদস্য শুধু এডমিন যোগ করতে পারবেন। নিজে সদস্য হতে \"সদস্য হোন\" ব্যবহার করুন।");
      return;
    }
    const name = newName.trim();
    if (!name) return;
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMember = {
      id,
      name,
      gender: newGender,
      ownerUids: [],
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
      if (migrationState === "v2") {
        await createMemberWithKey(newMember);
      } else {
        // legacy fallback(real family-দুটোই v2-তে, তাই এই path বাস্তবে
        // ব্যবহৃত হওয়ার কথা না) — Member Key ছাড়া পুরনো আচরণ।
        await saveMemberDoc(migrationState, newMember);
      }
    } catch (err) {
      alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleRemoveMember(m) {
    // Firestore rules এখন ownerUid-ভিত্তিক isUnownedOrMine() চেক করে delete
    // অনুমতি দেয় — অন্য ডিভাইসের claim করা সদস্য মুছতে গেলে সার্ভার সেটা
    // reject করবে। আগে থেকে একই চেক না করলে UI optimistically সদস্যকে
    // লিস্ট থেকে সরিয়ে ফেলত, অথচ আসল ডিলিট ব্যর্থ হতো — বিভ্রান্তিকর।
    if ((m.ownerUids && m.ownerUids.length) && (!auth.currentUser || !m.ownerUids.includes(auth.currentUser.uid))) {
      alert("এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে বাদ দেওয়া যাবে না। প্রথমে সেই ডিভাইস থেকে দায়িত্ব ছাড়তে বলুন, তারপর বাদ দিন।");
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const ok = window.confirm(`আপনি কি নিশ্চিত "${m.name}" কে সদস্য তালিকা থেকে বাদ দিতে চান? এই সদস্যের নাম আর দেখা যাবে না, তবে পূর্বের সেভ করা ডেটা মুছে যাবে না।`);
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
  // [Legacy fallback-only] Member Key ছাড়া free-claim — শুধু legacy(v1)
  // path-এ ব্যবহৃত হয়(বাস্তবে উভয় real family v2-তে, তাই কার্যত অব্যবহৃত)।
  // v2-তে ভুলবশত কল হলেও এখানেই আটকে যাবে — key-based claim
  // (claimMemberWithKey, উপরে) v2-এর একমাত্র বৈধ path।
  async function handleClaimMember(m) {
    if (migrationState === "v2") {
      alert("এই family-তে Member Password দিয়ে দায়িত্ব নিতে হবে।");
      return;
    }
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
  // §Admin Force-Release(নতুন, ১৫ আগস্ট ২০২৬) — অন্য (হয়তো অনুপস্থিত/lost)
  // ডিভাইসের claim করা member-কে admin জোরপূর্বক unclaim করতে পারবেন,
  // যাতে সেই ব্যক্তি নতুন ডিভাইস থেকে আবার "দায়িত্ব নিন" দিয়ে claim করতে
  // পারেন। Rules ইতিমধ্যে admin-কে যেকোনো member-এর ownerUid পরিবর্তনের
  // অনুমতি দেয় (isAdminOfFamily শাখা) — তাই কোনো Rules পরিবর্তন লাগেনি,
  // শুধু existing releaseMemberDoc() reuse করা হচ্ছে admin path থেকে।
  async function handleAdminForceRelease(m) {
    // §First Admin Protection(Force-Release, ১৯ আগস্ট ২০২৬) — client-side
    // pre-check(UX-এর জন্য, Rules-level protection এখনো ব্যাকলগে)। প্রথম
    // Admin-কে অন্য কোনো admin force-release করতে পারবেন না, শুধু তিনি
    // নিজে(Self-demote/নিজ ডিভাইস থেকে normal release দিয়ে) পারবেন।
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (firstAdminUid && m.ownerUids && m.ownerUids.includes(firstAdminUid) && myUid !== firstAdminUid) {
      alert("প্রথম এডমিনের দায়িত্ব অন্য কোনো এডমিন জোরপূর্বক মুক্ত করতে পারবেন না — শুধু তিনি নিজেই তার ডিভাইস থেকে ছাড়তে পারেন।");
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const ok = window.confirm(`"${m.name}"-এর দায়িত্ব বর্তমানে অন্য একটি ডিভাইসে সংরক্ষিত আছে। এডমিন হিসেবে জোরপূর্বক মুক্ত করতে চান? এরপর যেকোনো ডিভাইস এই সদস্যের দায়িত্ব নিতে পারবে (নিশ্চিত হয়ে নিন যে আসল সদস্যই নতুন ডিভাইস থেকে দাবি করবেন)।`);
    if (!ok) return;
    try {
      await releaseMemberDoc(migrationState, m.id);
      setMembers(prev => prev.map(x => x.id === m.id ? {
        ...x,
        ownerUids: []
      } : x));
    } catch (err) {
      alert("জোরপূর্বক মুক্ত করতে সমস্যা হয়েছে: " + err.message);
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
    if ((m.ownerUids && m.ownerUids.length) && !m.ownerUids.includes(myUid)) {
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
        ownerUids: []
      } : x));
    } catch (err) {
      alert("দায়িত্ব ছাড়তে সমস্যা হয়েছে: " + err.message);
    }
  }
  // Admin Visibility UI — একজন claimed সদস্যকে Admin করা। Rules-এ scoped
  // update clause (adminUids-এ ঠিক ১টা নতুন uid যোগ, বাকি সব অপরিবর্তিত)
  // দিয়ে server-side enforced — এই ফাংশন শুধু সেই call করে, permission
  // নিজে দেয় না।
  async function handleMakeAdmin(m) {
    if (!m.ownerUids || !m.ownerUids.length) {
      alert("এই সদস্যের দায়িত্ব এখনো কেউ নেয়নি — আগে দায়িত্ব নেওয়া প্রয়োজন, তারপর এডমিন করা যাবে।");
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const ok = window.confirm(`"${m.name}"-কে এডমিন করতে চান? এডমিন সদস্য ব্যবস্থাপনা ও প্রবেশাধিকার অনুমোদন করতে পারবেন।`);
    if (!ok) return;
    try {
      // §Hybrid Admin Role Model — role(authoritative) ও adminUids(derived
      // index) একই atomic batch-এ sync।
      const famRef = db.collection("families").doc(getFamilyId());
      const memberRef = famRef.collection("members").doc(m.id);
      const batch = db.batch();
      batch.update(famRef, {
        adminUids: firebase.firestore.FieldValue.arrayUnion(...m.ownerUids),
        updatedAt: Date.now()
      });
      batch.update(memberRef, {
        role: "admin",
        updatedAt: Date.now()
      });
      await batch.commit();
      setAdminUidsList(prev => Array.from(new Set([...prev, ...m.ownerUids])));
      // §Notification System — নতুন admin-কে জানানো, best-effort(ব্যর্থ
      // হলেও মূল Make-Admin action আগেই সফল হয়ে গেছে, তাই silently ignore)।
      try {
        await Promise.all(m.ownerUids.map(uid => db.collection("families").doc(getFamilyId())
          .collection("notifications").add({
            targetUid: uid,
            type: "admin_assigned",
            message: "আপনাকে এই পরিবারের এডমিন করা হয়েছে।",
            createdAt: Date.now(),
            read: false
          })));
      } catch {}
    } catch (err) {
      alert("এডমিন করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  // অন্য একজন Admin-কে পদ থেকে বাদ দেওয়া (নিজেকে নয় — self-demote আলাদা,
  // profile dropdown থেকে, যাতে ভুলবশত lockout না হয়)। ক্লায়েন্ট-সাইডেও
  // last-admin চেক করা হচ্ছে, তবে আসল সুরক্ষা Rules-এ(size>=1)।
  async function handleRemoveAdmin(m) {
    if (!m.ownerUids || !m.ownerUids.length) return;
    // §Hybrid Admin Role Model bugfix(১৬ আগস্ট ২০২৬) — "সর্বশেষ admin" এখন
    // distinct ব্যক্তি(role==="admin" member সংখ্যা) দিয়ে গণনা, adminUids
    // UID-count দিয়ে না(একই ব্যক্তির multi-device একাধিক UID থাকলে আগে এই
    // guard ভুলভাবে bypass হতো)।
    const adminPersonCount = (members || []).filter(x => x.role === "admin").length;
    if (adminPersonCount <= 1) {
      alert("সর্বশেষ এডমিনকে বাদ দেওয়া যাবে না — পরিবারে অন্তত একজন এডমিন থাকা আবশ্যক।");
      return;
    }
    // §First Admin Protection — client-side pre-check(UX-এর জন্য, আসল
    // সুরক্ষা Rules-এ)। প্রথম Admin-কে শুধু তিনি নিজেই পদ থেকে সরাতে
    // পারবেন(profile dropdown-এর self-demote দিয়ে), অন্য কোনো admin না।
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (firstAdminUid && m.ownerUids.includes(firstAdminUid) && myUid !== firstAdminUid) {
      alert("প্রথম এডমিনকে অন্য কোনো এডমিন পদ থেকে সরাতে পারবেন না — শুধু তিনি নিজেই নিজের পদ ছাড়তে পারেন।");
      return;
    }
    if (isLockedForSwitch) {
      alert("সিস্টেম আপডেট চলছে — একটু পর আবার চেষ্টা করুন।");
      return;
    }
    const ok = window.confirm(`"${m.name}"-কে এডমিন পদ থেকে বাদ দিতে চান?`);
    if (!ok) return;
    try {
      // §Hybrid Admin Role Model — role ও adminUids একই atomic batch-এ sync।
      const famRef = db.collection("families").doc(getFamilyId());
      const memberRef = famRef.collection("members").doc(m.id);
      const batch = db.batch();
      batch.update(famRef, {
        adminUids: firebase.firestore.FieldValue.arrayRemove(...m.ownerUids),
        updatedAt: Date.now()
      });
      batch.update(memberRef, {
        role: "member",
        updatedAt: Date.now()
      });
      await batch.commit();
      setAdminUidsList(prev => prev.filter(u => !m.ownerUids.includes(u)));
    } catch (err) {
      alert("এডমিন বাদ দিতে সমস্যা হয়েছে: " + err.message);
    }
  }
  // নিজের এডমিন পদ ছাড়া (self-demote) — profile dropdown থেকে, ইচ্ছাকৃতভাবে
  // member-list বাটন থেকে আলাদা রাখা হয়েছে যাতে ভুল ক্লিকে নিজে lock-out
  // না হয়ে যান।
  async function handleSelfDemote() {
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (!myUid) return;
    // §Hybrid Admin Role Model bugfix(১৬ আগস্ট ২০২৬) — "একমাত্র admin" এখন
    // distinct ব্যক্তি(role==="admin") দিয়ে গণনা, UID-count দিয়ে না।
    const adminPersonCount = (members || []).filter(x => x.role === "admin").length;
    if (adminPersonCount <= 1) {
      alert("আপনিই একমাত্র এডমিন — এই মুহূর্তে নিজের এডমিন পদ ছাড়তে পারবেন না। আগে অন্য কাউকে এডমিন করুন।");
      return;
    }
    const ok = window.confirm("আপনি কি নিশ্চিত নিজের এডমিন পদ ছাড়তে চান?");
    if (!ok) return;
    try {
      // §Hybrid Admin Role Model — role ও adminUids একই atomic batch-এ sync।
      // নিজের ownerUids-এ myUid থাকা member খুঁজে বের করা হচ্ছে(role
      // authoritative source, না মিললে role sync বাদ যায় — adminUids
      // sync তবুও হবে, যাতে lockout না হয়)।
      const myMember = (members || []).find(x => x.ownerUids && x.ownerUids.includes(myUid));
      // বাগফিক্স — শুধু current-session myUid না, এই ব্যক্তির নিজের সব
      // UID(multi-device claim থেকে) যেগুলো adminUids-এ আছে, একসাথে সরানো
      // হচ্ছে(নাহলে role="member" হওয়ার পরও অন্য নিজস্ব UID adminUids-এ
      // থেকে যেত — inconsistency)। ব্যতিক্রম: firstAdminUid-marked UID তখনই
      // bundle-এ যাবে যখন caller ঠিক সেই UID দিয়ে authenticated — নাহলে
      // rules-এর First Admin Protection পুরো write block করে দিত; তাই সেই
      // UID বাদ রেখে বাকিগুলো সরানো হয়(protection invariant অক্ষুণ্ণ)।
      const myOwnAdminUids = myMember
        ? (myMember.ownerUids || []).filter(u =>
            adminUidsList.includes(u) && (u !== firstAdminUid || myUid === firstAdminUid)
          )
        : [myUid];
      const famRef = db.collection("families").doc(getFamilyId());
      const batch = db.batch();
      batch.update(famRef, {
        adminUids: firebase.firestore.FieldValue.arrayRemove(...myOwnAdminUids),
        updatedAt: Date.now()
      });
      if (myMember) {
        batch.update(famRef.collection("members").doc(myMember.id), {
          role: "member",
          updatedAt: Date.now()
        });
      }
      await batch.commit();
      setAdminUidsList(prev => prev.filter(u => !myOwnAdminUids.includes(u)));
      setIsAdmin(false);
      setShowProfileDropdown(false);
    } catch (err) {
      alert("এডমিন পদ ছাড়তে সমস্যা হয়েছে: " + err.message);
    }
  }
  // Single Logout — Family code session + Google session, দুটোই একসাথে
  // পরিষ্কার। কোনো Firestore/member ownership data পরিবর্তন হয় না — শুধু
  // এই ডিভাইসের local session/identity রিসেট হয়। multi-family ব্যবহারকারী
  // fresh state-এ শুরু করতে পারবেন; আবার প্রবেশ করতে Family Code লাগবে।
  async function handleFullLogout() {
    const wasGoogleLinked = isGoogleLinked();
    const ok = window.confirm("লগ আউট করবেন নিশ্চিত?");
    if (!ok) return;
    try {
      if (wasGoogleLinked) {
        // Google-linked অবস্থায় fresh anonymous uid তৈরি করলে পুরনো
        // uid-এর সাথে ownership/admin-role সম্পর্ক ছিন্ন হয়ে যায়(lockout
        // risk)। তাই এখানে শুধু sign-out করা হচ্ছে, নতুন anonymous uid
        // তৈরি করা হচ্ছে না — একটি flag রেখে দেওয়া হচ্ছে যাতে পরের বুটে
        // Google re-auth gate দেখানো হয়(signInWithPopup একই পুরনো uid
        // ফিরিয়ে দেবে, continuity বজায় থাকবে)।
        try {
          localStorage.setItem("dt_pending_google_reauth", "1");
        } catch {}
        await auth.signOut();
      } else {
        await signOutToFreshAnonymous();
      }
    } catch (err) {
      try {
        localStorage.removeItem("dt_pending_google_reauth");
      } catch {}
      alert("লগআউট করতে সমস্যা হয়েছে: " + err.message);
      return;
    }
    localStorage.removeItem("family_id");
    localStorage.removeItem("family_code");
    localStorage.removeItem("family_code_is_custom");
    window.location.reload();
  }
  // §Gmail পরিবর্তন — unlink(uid অপরিবর্তিত) + সাথে সাথে নতুন Google
  // popup দিয়ে link। প্রথম ধাপ(unlink) সফল হওয়ার পর দ্বিতীয় ধাপ(link)
  // ব্যর্থ/বাতিল হলেও uid/ownerUid/adminUids অক্ষুণ্ণ থাকে — শুধু account
  // unlinked অবস্থায় থেকে যায়(পরে আবার সংযুক্ত করা যাবে)।
  async function handleChangeGmail() {
    setIsMenuOpen(false);
    setShowAccountMenu(false);
    try {
      await unlinkGoogleAccount();
      try {
        await linkGoogleAccount();
        window.location.reload();
      } catch (linkErr) {
        if (linkErr && linkErr.code === "auth/credential-already-in-use") {
          alert("এই Google Account ইতিমধ্যে অন্য কোনো পরিচয়ের সাথে যুক্ত আছে। ভিন্ন একটি Google Account দিয়ে চেষ্টা করুন।");
        } else if (linkErr && (linkErr.code === "auth/popup-closed-by-user" || linkErr.code === "auth/cancelled-popup-request")) {
          // ব্যবহারকারী নিজেই বাতিল করেছেন — নীরবে থেমে যাওয়া, পুরনো
          // Google account unlink অবস্থায় থেকে যাবে(uid অপরিবর্তিত)।
        } else {
          alert("নতুন Google Account সংযুক্ত করতে সমস্যা হয়েছে: " + (linkErr && linkErr.message));
        }
        window.location.reload();
      }
    } catch (err) {
      alert("জিমেইল পরিবর্তন করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  async function handleDeleteGoogleAccount() {
    try {
      // একই কারণে এখানেও অতিরিক্ত signOutToFreshAnonymous() কল বাদ দেওয়া
      // হয়েছে — unlinkGoogleAccount() একাই যথেষ্ট এবং একই ডিভাইস uid
      // বজায় রাখে, তাই সদস্যদের এডিট-অধিকার অক্ষুণ্ণ থাকে।
      await unlinkGoogleAccount();
      setShowDeleteAccountWarning(false);
      window.alert("গুগল অ্যাকাউন্ট সফলভাবে রিমুভ করা হয়েছে এবং সাইন আউট সম্পন্ন হয়েছে। আপনার অ্যাপের সম্পূর্ণ ডেটা নিরাপদে আপনার ফ্যামিলি কাস্টম কোডের সাথে সংরক্ষিত আছে।");
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
      alert("ডেটা সেভ করতে সমস্যা হয়েছে: " + err.message);
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
  if (members === null || migrationState === undefined || !myMemberRequestChecked) return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center bg-[#F4F7F1]"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    color: "var(--theme-primary)",
    size: 32
  }));
  // §Onboarding Gate fix(১৮ আগস্ট ২০২৬): GoogleAccountModal ও ClaimKey
  // মোডাল আগে শুধু Dashboard-এর মূল JSX-এর ভিতরে বাঁধা ছিল, তাই early-
  // return branch-এ(নিচে) কখনো render হতো না — ফলে Google Sign-in ধাপে
  // সাদা পেজ এবং keyClaim ধাপে নাম ক্লিক করলে কিছু হতো না। এখন একবার
  // variable-এ বের করে দুই জায়গাতেই(early-return branch + নিচের আগের
  // অবস্থান) reuse করা হচ্ছে — কোনো নতুন logic/state/collection নেই।
  const googleAccountModalNode = showGoogleAccountModal && /*#__PURE__*/React.createElement(GoogleAccountModal, {
    onClose: () => setShowGoogleAccountModal(false),
    onLinked: checkDriveBackupAfterLink,
    memberName: selectedMember?.name,
    auth: auth,
    claimFirstAdminIfEligible: claimFirstAdminIfEligible,
    googleProvider: googleProvider,
    linkGoogleAccount: linkGoogleAccount,
    syncFamilyCodeWithAccount: syncFamilyCodeWithAccount
  });
  // §Approved-member Google welcome — existing GoogleAccountModal reuse,
  // শুধু welcomeMode/onLater prop দিয়ে body/বাটন আলাদা। onClose/onLater
  // দুটোই dismissApprovedGoogleWelcome() কল করে(one-time flag সেট + বন্ধ),
  // সফল link হলেও একই dismiss হয় onLinked-এ(নিচে)।
  const approvedGoogleWelcomeNode = showApprovedGoogleWelcome && /*#__PURE__*/React.createElement(GoogleAccountModal, {
    welcomeMode: true,
    onClose: dismissApprovedGoogleWelcome,
    onLater: dismissApprovedGoogleWelcome,
    onLinked: () => { dismissApprovedGoogleWelcome(); checkDriveBackupAfterLink(); },
    memberName: selectedMember?.name,
    auth: auth,
    claimFirstAdminIfEligible: claimFirstAdminIfEligible,
    googleProvider: googleProvider,
    linkGoogleAccount: linkGoogleAccount,
    syncFamilyCodeWithAccount: syncFamilyCodeWithAccount
  });
  // A4-G4(part B): ClaimKeyModal.jsx-এ extract করা হয়েছে(verbatim)। dual-use
  // pattern(gate-branch+normal-tree) অপরিবর্তিত — variable name একই রাখা হয়েছে।
  const claimKeyModalNode = React.createElement(ClaimKeyModal, {
    showClaimKeyModal,
    claimKeyTarget,
    claimKeyInput,
    setClaimKeyInput,
    claimKeyBusy,
    setClaimKeyBusy,
    setShowClaimKeyModal,
    setClaimKeyTarget,
    setMembers,
    auth,
    claimMemberWithKey,
    isGoogleLinked,
    saveUserFamilyCode,
    getFamilyCode
  });
  // §Onboarding Gate fix(১৮ আগস্ট ২০২৬, পর্ব-২): becomeMember মোডাল আগে
  // শুধু নিচের(নন-গেট) JSX-এর ভিতরে বাঁধা ছিল, googleAccountModalNode/
  // claimKeyModalNode-এর মতো variable-এ বের করা হয়নি — ফলে onbStep===
  // "becomeMember" অবস্থায় early-return branch-এ এটি render হতো না এবং
  // সাদা পেজ দেখাতো। এখন একই pattern-এ variable-এ বের করে দুই জায়গাতেই
  // reuse করা হচ্ছে — কোনো নতুন logic/state নেই।
  // A4-G4(part C): BecomeMemberModal.jsx-এ extract করা হয়েছে(verbatim)।
  // dual-use pattern(gate-branch+normal-tree) অপরিবর্তিত।
  const becomeMemberModalNode = React.createElement(BecomeMemberModal, {
    showBecomeMemberModal,
    becomeMemberName,
    setBecomeMemberName,
    becomeMemberGender,
    setBecomeMemberGender,
    becomeMemberBusy,
    setBecomeMemberBusy,
    setShowBecomeMemberModal,
    auth,
    db,
    getFamilyId,
    generateUniqueReadableMemberKey,
    setMyMemberRequestStatus,
    setMyMemberRequestKey,
    adminUidsList
  });
  // §Onboarding Gate — Family Code submit-এর পর authentication/onboarding
  // সম্পূর্ণ না হওয়া পর্যন্ত Dashboard(blurred/background সহ) কোনোভাবেই
  // render হবে না। শুধু OnboardingBridge দেখানো হয়। onAdvance(null) কল
  // হলেই(সফল Google/Member-Password/approved onboarding) onbStep null
  // হয়ে স্বাভাবিক Dashboard render হবে।
  // §Onboarding Gate reopen-fix(২৩ আগস্ট ২০২৬): আগে শুধু onbStep(sessionStorage,
  // ব্রাউজার-সেশন বন্ধ হলে হারিয়ে যায়) দিয়ে গেট হতো — ফলে "সদস্য হোন" পাঠানোর
  // পর ব্রাউজার বন্ধ করে আবার খুললে pending থাকা সত্ত্বেও সরাসরি Dashboard
  // render হয়ে যেত(write অবশ্য Rules-এই block হতো, কিন্তু UX ভুল)। এখন
  // Firestore-persisted myMemberRequestStatus(session-independent)ও গেট
  // trigger করে — onbStep না থাকলেও pending হলে একই pending-screen(step:
  // "becomeMember") reuse হবে। denied/approved flow অপরিবর্তিত(এই condition
  // শুধু "pending"-এ trigger করে)।
  // §Onboarding Gate — newFamily/addMember reopen-fix(২৩ আগস্ট ২০২৬, একই
  // session-independent প্যাটার্ন উপরের myMemberRequestStatus fix-এর মতো):
  // createNewFamily() family doc+admin-claim কমিট করে reload করে, কিন্তু
  // creator-এর নিজের members doc addMember-স্টেপ সম্পূর্ণ না হওয়া পর্যন্ত
  // তৈরিই হয় না। onbStep শুধু sessionStorage-এ থাকায় ব্রাউজার-সেশন হারালে
  // (refresh/reopen) গেট bypass হয়ে normal Dashboard render হয়ে যেত(Rules-side
  // admin অনুযায়ী বৈধ কিন্তু নিজের member profile ছাড়াই)। needsOwnMemberProfile
  // শুধু তখনই true হয় যখন পুরো family-তে একটাও member doc নেই — এই অবস্থা
  // শুধু family-creation থেকে addMember-সম্পূর্ণ হওয়ার মাঝের window-এই সত্য
  // (অন্য কোনো legitimate কেস, যেমন Force-Release-এ member doc-ই বিদ্যমান
  // থাকে, শুধু ownerUids খালি হয় — তাই ভুলভাবে trigger হয় না)।
  const myUid = auth.currentUser ? auth.currentUser.uid : null;
  const needsOwnMemberProfile = isAdmin && Array.isArray(members) && members.length === 0 && !!myUid;
  if (onbStep || myMemberRequestStatus === "pending" || needsOwnMemberProfile) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(OnboardingBridge, {
    flow: onbFlow,
    step: onbStep || (needsOwnMemberProfile ? "addMember" : "becomeMember"),
    onAdvance: onbAdvance,
    isAdmin: isAdmin,
    myUid: auth.currentUser ? auth.currentUser.uid : null,
    familyCode: getFamilyCode(),
    members: members,
    setMembers: setMembers,
    setSelectedId: setSelectedId,
    showGoogleAccountModal: showGoogleAccountModal,
    setShowGoogleAccountModal: setShowGoogleAccountModal,
    showBecomeMemberModal: showBecomeMemberModal,
    setShowBecomeMemberModal: setShowBecomeMemberModal,
    showClaimKeyModal: showClaimKeyModal,
    setClaimKeyTarget: setClaimKeyTarget,
    setShowClaimKeyModal: setShowClaimKeyModal,
    myMemberRequestStatus: myMemberRequestStatus,
    myMemberRequestKey: myMemberRequestKey,
    createMemberWithKey: createMemberWithKey
  }), googleAccountModalNode, claimKeyModalNode, becomeMemberModalNode);
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
  }, "এই পরিবারের ডেটা দেখতে এডমিনের অনুমোদন প্রয়োজন। অনুমোদন হলে এই পেজ রিফ্রেশ করুন।"), /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 rounded-2xl border shadow-sm bg-white",
    style: { color: "var(--theme-primary)" },
    onClick: () => window.location.reload()
  }, "রিফ্রেশ করুন"));
  if (printMode) return React.createElement(PrintReport, {
    allFields: allFields,
    meetingState: meetingState,
    monthCursor: monthCursor,
    monthEntries: monthEntries,
    monthStats: monthStats,
    printMode: printMode,
    selectedMember: selectedMember,
    setPrintMode: setPrintMode,
    weekly: weekly,
    weeklyRowCount: weeklyRowCount,
    BN_MONTHS: BN_MONTHS,
    dailyScore: dailyScore,
    fieldApplies: fieldApplies,
    fieldPercent: fieldPercent,
    getWeekRanges: getWeekRanges,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    pad2: pad2,
    toBn: toBn
  });
  const total = monthStats.total;
  const firstOfMonth = new Date(monthCursor.year, monthCursor.month0, 1);
  const leadBlanks = firstOfMonth.getDay();
  const themeColorPickerEl = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
  }, "✓"))))));
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen pb-20 bg-[#F4F7F1]"
  }, /*#__PURE__*/React.createElement(DashboardHeader, {
    addingMember: addingMember,
    adminUidsList: adminUidsList,
    copiedCode: copiedCode,
    decideMemberRequest: decideMemberRequest,
    entryDirtyRef: entryDirtyRef,
    firstAdminUid: firstAdminUid,
    handleAddMember: handleAddMember,
    handleAdminForceRelease: handleAdminForceRelease,
    handleChangeGmail: handleChangeGmail,
    handleClaimMember: handleClaimMember,
    handleCopyCode: handleCopyCode,
    handleFullLogout: handleFullLogout,
    handleMakeAdmin: handleMakeAdmin,
    handleReleaseMember: handleReleaseMember,
    handleRemoveAdmin: handleRemoveAdmin,
    handleRemoveMember: handleRemoveMember,
    handleSelfDemote: handleSelfDemote,
    isAdmin: isAdmin,
    isLockedForSwitch: isLockedForSwitch,
    isMenuOpen: isMenuOpen,
    loadPendingMemberRequests: loadPendingMemberRequests,
    members: members,
    migrationState: migrationState,
    monthCursor: monthCursor,
    newGender: newGender,
    newName: newName,
    notifications: notifications,
    pendingMemberRequests: pendingMemberRequests,
    selectedId: selectedId,
    selectedMember: selectedMember,
    setAddingMember: setAddingMember,
    setArchiveMonth0: setArchiveMonth0,
    setArchiveYear: setArchiveYear,
    setClaimKeyInput: setClaimKeyInput,
    setClaimKeyTarget: setClaimKeyTarget,
    setConfirmKeyInput: setConfirmKeyInput,
    setDriveBackupStatus: setDriveBackupStatus,
    setIsMenuOpen: setIsMenuOpen,
    setManualKeyInput: setManualKeyInput,
    setMemberKeyLoading: setMemberKeyLoading,
    setMemberKeyRevealed: setMemberKeyRevealed,
    setMemberKeyTarget: setMemberKeyTarget,
    setMemberKeyValue: setMemberKeyValue,
    setNewGender: setNewGender,
    setNewName: setNewName,
    setNotifications: setNotifications,
    setSelectedId: setSelectedId,
    setShowAccountMenu: setShowAccountMenu,
    setShowArchiveModal: setShowArchiveModal,
    setShowBackupOptionsModal: setShowBackupOptionsModal,
    setShowChangeKeyForm: setShowChangeKeyForm,
    setShowClaimKeyModal: setShowClaimKeyModal,
    setShowFamilyCodeChoiceModal: setShowFamilyCodeChoiceModal,
    setShowFeedbackModal: setShowFeedbackModal,
    setShowGoogleAccountModal: setShowGoogleAccountModal,
    setShowImportOptionsModal: setShowImportOptionsModal,
    setShowMemberKeyModal: setShowMemberKeyModal,
    setShowMemberRequestsModal: setShowMemberRequestsModal,
    setShowNotifPanel: setShowNotifPanel,
    setShowProfileDropdown: setShowProfileDropdown,
    showAccountMenu: showAccountMenu,
    showNotifPanel: showNotifPanel,
    showProfileDropdown: showProfileDropdown,
    streak: streak,
    themeColorPickerEl: themeColorPickerEl,
    weeklyDirtyRef: weeklyDirtyRef,
    AppLogo: AppLogo,
    BN_MONTHS: BN_MONTHS,
    auth: auth,
    db: db,
    fetchMemberKey: fetchMemberKey,
    getFamilyCode: getFamilyCode,
    getFamilyId: getFamilyId,
    isGoogleLinked: isGoogleLinked,
    toBn: toBn
  }), /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl mx-auto"
  }, React.createElement(DailyEntrySection, {
    codeChangeNotice: codeChangeNotice,
    customFields: customFields,
    dismissMonthlyReminder: dismissMonthlyReminder,
    dismissWeeklyReminder: dismissWeeklyReminder,
    entry: entry,
    entryDirtyRef: entryDirtyRef,
    handleDateTouchEnd: handleDateTouchEnd,
    handleDateTouchStart: handleDateTouchStart,
    handleSave: handleSave,
    isLockedForSwitch: isLockedForSwitch,
    isLockedForThisDevice: isLockedForThisDevice,
    monthlyReminderBanner: monthlyReminderBanner,
    openHistoryModal: openHistoryModal,
    recoveryMessage: recoveryMessage,
    savedTick: savedTick,
    saving: saving,
    selectedMember: selectedMember,
    setCodeChangeNotice: setCodeChangeNotice,
    setRecoveryMessage: setRecoveryMessage,
    setShowAddCustom: setShowAddCustom,
    setShowExcuseInfoModal: setShowExcuseInfoModal,
    setViewDate: setViewDate,
    updateExcuse: updateExcuse,
    updateField: updateField,
    viewDate: viewDate,
    weeklyReminderBanner: weeklyReminderBanner,
    BN_MONTHS: BN_MONTHS,
    DEFAULT_DEEN_FIELDS: DEFAULT_DEEN_FIELDS,
    DEFAULT_DUNIYA_FIELDS: DEFAULT_DUNIYA_FIELDS,
    dateKey: dateKey,
    formatBnDateTime: formatBnDateTime,
    getDailyInspiration: getDailyInspiration,
    getHijriDate: getHijriDate,
    isFutureDate: isFutureDate,
    toBn: toBn,
    fieldApplies: fieldApplies,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable
  }), /*#__PURE__*/React.createElement(WeeklyReflectionSection, {
    addWeeklyRow: addWeeklyRow,
    handleSaveWeekly: handleSaveWeekly,
    isLockedForSwitch: isLockedForSwitch,
    isLockedForThisDevice: isLockedForThisDevice,
    monthStats: monthStats,
    savingWeekly: savingWeekly,
    setShowWeeklyInfoModal: setShowWeeklyInfoModal,
    updateWeekly: updateWeekly,
    weekly: weekly,
    weeklyRowCount: weeklyRowCount,
    weeklySavedTick: weeklySavedTick,
    getWeekRanges: getWeekRanges,
    toBn: toBn
  }), /*#__PURE__*/React.createElement(MonthlyOverviewSection, {
    allFields: allFields,
    entryDirtyRef: entryDirtyRef,
    leadBlanks: leadBlanks,
    meetingDirtyRef: meetingDirtyRef,
    monthCursor: monthCursor,
    monthEntries: monthEntries,
    monthStats: monthStats,
    selectedMember: selectedMember,
    setMonthCursor: setMonthCursor,
    setMonthRefreshKey: setMonthRefreshKey,
    setPrintMode: setPrintMode,
    setViewDate: setViewDate,
    total: total,
    weeklyDirtyRef: weeklyDirtyRef,
    BN_MONTHS: BN_MONTHS,
    BN_WEEKDAYS: BN_WEEKDAYS,
    dailyScore: dailyScore,
    pad2: pad2,
    scoreColor: scoreColor,
    toBn: toBn,
    getThemeColor: getThemeColor,
    hexToRgba: hexToRgba,
    getWeekRanges: getWeekRanges
  }), /*#__PURE__*/React.createElement(MeetingMinutesSection, {
    addMeetingRow: addMeetingRow,
    handleSaveMeeting: handleSaveMeeting,
    isLockedForSwitch: isLockedForSwitch,
    meetingSavedTick: meetingSavedTick,
    meetingState: meetingState,
    monthCursor: monthCursor,
    removeMeetingRow: removeMeetingRow,
    savingMeeting: savingMeeting,
    setShowMeetingInfoModal: setShowMeetingInfoModal,
    updateMeetingRow: updateMeetingRow,
    BN_MONTHS: BN_MONTHS,
    toBn: toBn
  })), React.createElement(ArchiveModal, {show: showArchiveModal, onClose: () => setShowArchiveModal(false), archiveMonth0, setArchiveMonth0, archiveYear, setArchiveYear, BN_MONTHS, toBn, handleGoToArchive}), React.createElement(FamilyCodeChoiceModal, {
    show: showFamilyCodeChoiceModal,
    onClose: () => setShowFamilyCodeChoiceModal(false),
    isAdmin,
    setRenameFamCodeInput,
    setShowRenameFamilyCodeModal
  }), React.createElement(CreateNewFamilyModal, {
    show: showCreateNewFamilyModal,
    onClose: () => setShowCreateNewFamilyModal(false),
    newFamCodeInput,
    setNewFamCodeInput,
    newFamCodeBusy,
    handleCreateNewFamily
  }), React.createElement(JoinFamilyModal, {
    show: showJoinFamilyModal,
    onClose: () => setShowJoinFamilyModal(false),
    joinFamCodeInput,
    setJoinFamCodeInput,
    joinFamCodeBusy,
    handleJoinExistingFamily
  }), React.createElement(RenameFamilyCodeModal, {
    show: showRenameFamilyCodeModal,
    onClose: () => setShowRenameFamilyCodeModal(false),
    showRenameChangeForm,
    setShowRenameChangeForm,
    renameFamCodeInput,
    setRenameFamCodeInput,
    renameConfirmInput,
    setRenameConfirmInput,
    renameFamCodeBusy,
    renameCodeRevealed,
    setRenameCodeRevealed,
    getFamilyCode,
    handleRenameFamilyCode,
    FAMILY_CODE_MIN_LENGTH
  }), React.createElement(AccessRequestsModal, {
    show: showAccessRequestsModal,
    onClose: () => setShowAccessRequestsModal(false),
    loadingAccessRequests,
    pendingAccessRequests,
    decideAccessRequest
  }), googleAccountModalNode, approvedGoogleWelcomeNode,

  // --- §Member Key(নতুন) — key display/copy/change মোডাল(masked-by-
  // default, click করলে reveal, Family Code masking-এর মতো একই প্যাটার্ন)।
  // A4-G4(part A): MemberKeyModal.jsx-এ extract করা হয়েছে(verbatim)।
  React.createElement(MemberKeyModal, {
    show: showMemberKeyModal,
    memberKeyTarget,
    onClose: () => setShowMemberKeyModal(false),
    memberKeyLoading,
    memberKeyValue,
    setMemberKeyValue,
    memberKeyRevealed,
    setMemberKeyRevealed,
    showChangeKeyForm,
    setShowChangeKeyForm,
    manualKeyInput,
    setManualKeyInput,
    confirmKeyInput,
    setConfirmKeyInput,
    memberKeyBusy,
    setMemberKeyBusy,
    isMemberKeyCharsetValid,
    changeMemberKey
  }),

  // --- §Member Key claim("দায়িত্ব নিন") মোডাল — সব member-এর জন্য প্রযোজ্য
  // (claimed/unclaimed নির্বিশেষে), সঠিক key দিলেই ownerUid বদলায়।
  claimKeyModalNode,

  // --- §"সদস্য হোন" — non-admin self-request মোডাল(নাম+জেন্ডার দিয়ে
  // memberRequests-এ pending তৈরি, Admin অনুমোদনের পর member+key তৈরি হয়)।
  becomeMemberModalNode,

  // --- §"সদস্য অনুরোধ" — Admin-only অনুমোদন প্যানেল(accessRequests
  // মোডালের একই ডিজাইন-প্যাটার্ন)। অনুমোদনে member+key একসাথে তৈরি হয়।
  // A4-G4(part D): MemberRequests.jsx-এ extract করা হয়েছে(verbatim)।
  React.createElement(MemberRequestsModal, {
    show: showMemberRequestsModal,
    onClose: () => setShowMemberRequestsModal(false),
    loadingMemberRequests,
    pendingMemberRequests,
    decideMemberRequest
  }),

  React.createElement(BackupOptionsModal, {show: showBackupOptionsModal, onClose: () => setShowBackupOptionsModal(false), driveBackupStatus, driveBackupBusy, handleDriveBackupClick, isGoogleLinked, handleExportData, handleBothBackupClick}), /*#__PURE__*/React.createElement("input", {
    ref: importFileInputRef,
    type: "file",
    accept: ".json,application/json,text/plain,text/json,application/octet-stream",
    onChange: e => {
      handleImportData(e);
      setShowImportOptionsModal(false);
    },
    className: "hidden"
  }), React.createElement(ImportOptionsModal, {show: showImportOptionsModal, onClose: () => setShowImportOptionsModal(false), handleManualDriveRestoreClick, driveRestoreChecking, importFileInputRef}), React.createElement(DriveRestoreModal, {show: showDriveRestoreModal, candidate: driveRestoreCandidate, onClose: () => setShowDriveRestoreModal(false), driveRestoreBusy, handleConfirmDriveRestore}), React.createElement(DeleteAccountWarningModal, {
    handleDeleteGoogleAccount: handleDeleteGoogleAccount,
    setShowDeleteAccountWarning: setShowDeleteAccountWarning,
    showDeleteAccountWarning: showDeleteAccountWarning
  }), /*#__PURE__*/React.createElement(MemberInfoModal, { show: showMemberInfoModal, onClose: () => setShowMemberInfoModal(false) }), /*#__PURE__*/React.createElement(ExcuseInfoModal, { show: showExcuseInfoModal, onClose: () => setShowExcuseInfoModal(false) }), /*#__PURE__*/React.createElement(WeeklyInfoModal, { show: showWeeklyInfoModal, onClose: () => setShowWeeklyInfoModal(false) }), /*#__PURE__*/React.createElement(MeetingInfoModal, { show: showMeetingInfoModal, onClose: () => setShowMeetingInfoModal(false) }), React.createElement(AddCustomFieldModal, {
    handleAddCustomField: handleAddCustomField,
    isLockedForSwitch: isLockedForSwitch,
    newCustomLabel: newCustomLabel,
    setNewCustomLabel: setNewCustomLabel,
    setShowAddCustom: setShowAddCustom,
    showAddCustom: showAddCustom
  }), React.createElement(FeedbackModal, {
    feedbackMsg: feedbackMsg,
    feedbackSending: feedbackSending,
    feedbackStatus: feedbackStatus,
    handleSendFeedback: handleSendFeedback,
    setFeedbackMsg: setFeedbackMsg,
    setFeedbackStatus: setFeedbackStatus,
    setShowFeedbackModal: setShowFeedbackModal,
    showFeedbackModal: showFeedbackModal
  }), /*#__PURE__*/React.createElement(HistoryModal, { show: showHistoryModal, onClose: () => setShowHistoryModal(false), loadingHistory, historyList, restoreHistoryVersion, formatBnDateTime }), React.createElement(MilestoneToast, {
    milestoneToast: milestoneToast,
    setMilestoneToast: setMilestoneToast,
    toBn: toBn
  }));
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

// =====================================================================
// --- Onboarding (নতুন/Incognito device — Analyze→Plan approved, ---
// --- Option B: Family Code সবসময় আগে, তারপর existing App()-এর ---
// --- বিদ্যমান Google/Member-Key/"সদস্য হোন"/pending UI-ই বাকি কাজ করে) ---
// =====================================================================
// শুধু boot-gate + Family Code সংগ্রহ পর্যন্ত এই component-এর দায়িত্ব।
// কোড কমিট(createNewFamily/joinExistingFamily) সফল হলে সেই ফাংশনগুলোই
// reload করে — এরপর App()-এর বিদ্যমান UI(Google modal, Member Key claim
// modal, "সদস্য হোন" modal, pending-approval screen) স্বাভাবিকভাবেই
// দেখা যাবে। এখানে সেসবের কোনো কিছু duplicate করা হয়নি, existing
// business logic-ও ছোঁয়া হয়নি।
// §Onboarding continuation — Family Code দেওয়ার পরে (নতুন Family হলে
// নাম/Gender/Google/Key-reveal/Sharing, বিদ্যমান Family হলে Google/
// Member-Key/"সদস্য হোন") existing modal/function-গুলো সঠিক ক্রমে
// auto-trigger করে। কোনো নতুন Firestore logic নেই — শুধু existing
// createMemberWithKey()/GoogleAccountModal/claimKeyModal/
// becomeMemberModal wiring। App()-এর ভিতরের state/setter props হিসেবে
// পাস করা হয়েছে যাতে App()-এর existing modal ঠিক সেগুলোই reuse করে,
// duplicate না হয়।


function mountApp() {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container);
  // Boot-gate: existing user/session কোনোভাবেই প্রভাবিত হয় না — শুধু
  // raw localStorage(family_id + family_code) না থাকলেই(সত্যিকারের
  // নতুন/Incognito context) Onboarding দেখানো হয়। এখানে ইচ্ছাকৃতভাবে
  // getFamilyId()/getFamilyCode() কল করা হয়নি(ওগুলো কল করলেই নিজে থেকে
  // random id/code তৈরি+persist হয়ে যায়) — শুধু raw localStorage read।
  const hasExistingSession = !!(localStorage.getItem("family_id") && localStorage.getItem("family_code"));
  if (hasExistingSession) {
    root.render(/*#__PURE__*/React.createElement(App, null));
  } else {
    root.render(/*#__PURE__*/React.createElement(Onboarding, {
      AppLogo: AppLogo,
      FAMILY_CODE_MAX_LENGTH: FAMILY_CODE_MAX_LENGTH,
      FAMILY_CODE_MIN_LENGTH: FAMILY_CODE_MIN_LENGTH,
      auth: auth,
      createNewFamily: createNewFamily,
      directIdentifyLogin: directIdentifyLogin,
      isGoogleLinked: isGoogleLinked,
      joinExistingFamily: joinExistingFamily,
      loadUserFamilyMapping: loadUserFamilyMapping,
      linkGoogleAccount: linkGoogleAccount,
      resolveFamilyIdFromCode: resolveFamilyIdFromCode
    }));
  }
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
// Google-linked Full Logout একটি "pending re-auth" flag রেখে যায়(uid
// continuity রক্ষার জন্য fresh anonymous sign-in ইচ্ছাকৃতভাবে skip করা
// হয়েছে ওই flow-এ)। সেই flag থাকলে auto-anonymous sign-in না করে একটি
// ছোট gate দেখানো হয় — কারণ signInWithPopup() ব্যবহারকারীর click ছাড়া
// (page-load-এ automatic) ব্রাউজার popup-blocker আটকে দেয়। Gate-এ ব্যর্থ/
// বাতিল হলে "Family Code দিয়ে চালিয়ে যান" বাটন স্বাভাবিক anonymous flow-এ
// পড়ে — কোনো loop নেই, non-Google flow সম্পূর্ণ অপরিবর্তিত।
function renderPendingGoogleReauthGate() {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container);
  function GoogleReauthGate() {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    function proceedAnonymous() {
      setBusy(true);
      auth.signInAnonymously().catch(e => {
        console.error("Anonymous sign-in failed:", e);
      }).finally(() => {
        // mountApp() নিজে আবার এই একই #root container-এ createRoot()
        // করবে — তার আগে এই gate-এর root unmount করা জরুরি, নাহলে React
        // "already has a root" warning দেয়(duplicate root)।
        root.unmount();
        bootOnce();
      });
    }
    function handleGoogleClick() {
      setBusy(true);
      setErr(null);
      auth.signInWithPopup(googleProvider).then(() => {
        root.unmount();
        bootOnce();
      }).catch(e => {
        setBusy(false);
        if (!(e && e.code === "auth/popup-closed-by-user")) {
          setErr("Google সাইন-ইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন, অথবা Family Username দিয়ে চালিয়ে যান।");
        }
      });
    }
    function handleFallbackClick() {
      proceedAnonymous();
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-base font-medium text-slate-700 max-w-xs leading-relaxed"
    }, "আপনি লগ আউট হয়েছেন"), err && /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-medium text-red-600 max-w-xs"
    }, err), /*#__PURE__*/React.createElement("button", {
      onClick: handleGoogleClick,
      disabled: busy,
      className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60",
      style: { borderColor: "#1D7A68", color: "#1D7A68" }
    }, busy ? /*#__PURE__*/React.createElement(Loader2, { className: "animate-spin", size: 14 }) : null, "Google দিয়ে সাইন-ইন করুন"), /*#__PURE__*/React.createElement("button", {
      onClick: handleFallbackClick,
      disabled: busy,
      className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center disabled:opacity-60",
      style: { background: "#FBF3E1", borderColor: "#C89B3C", color: "#8A6D2F" }
    }, "প্রথম পেজে ফিরে আসুন"));
  }
  root.render(/*#__PURE__*/React.createElement(GoogleReauthGate, null));
}
const unsubscribeAuth = auth.onAuthStateChanged(user => {
  unsubscribeAuth();
  if (user) {
    bootOnce();
  } else {
    let pendingGoogleReauth = false;
    try {
      pendingGoogleReauth = localStorage.getItem("dt_pending_google_reauth") === "1";
    } catch {}
    if (pendingGoogleReauth) {
      try {
        localStorage.removeItem("dt_pending_google_reauth");
      } catch {}
      renderPendingGoogleReauthGate();
    } else {
      auth.signInAnonymously().catch(err => {
        console.error("Anonymous sign-in failed:", err);
      }).finally(() => {
        bootOnce(); // don't leave the user stuck on a blank screen
      });
    }
  }
});