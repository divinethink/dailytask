// legacyMigrationTools.js — DORMANT Phase-C migration/audit/backfill tooling
// (2_1_1_Process_Architecture_Plan.md অনুযায়ী "dormant/historical reference",
// কোনো active code-path এখান থেকে trigger হয় না — শুধু owner manual browser-
// console tool হিসেবে ব্যবহৃত হয়)। Active member/family code থেকে ইচ্ছাকৃতভাবে
// আলাদা রাখা হয়েছে যাতে active-flow maintenance-এ এই ~১,০০০ লাইন বাধা না দেয়।
import { db, auth } from "./firebaseConfig.js";
import { getFamilyCode, getFamilyId, ensureFamilyCodeMapping, getCollectionName } from "./familyIdentity.js";

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

function extractOwnerUidsFromMemberData(data) {
  const arr = Array.isArray(data.ownerUids) ? data.ownerUids : [];
  return arr.filter(u => typeof u === "string" && u);
}
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
        ownerUids = membersSnap.docs.flatMap(d => extractOwnerUidsFromMemberData(d.data()));
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

async function migrateOwnerUidsToArray(dryRun, familyIdOverride) {
  if (dryRun === undefined) dryRun = true;
  const familyId = familyIdOverride || getFamilyId();
  if (!familyId) {
    console.error("[ownerUids Migration] familyId পাওয়া যায়নি।");
    return null;
  }
  const famSnap = await db.collection("families").doc(familyId).get();
  if (!famSnap.exists) {
    console.error(`[ownerUids Migration] families/${familyId} পাওয়া যায়নি।`);
    return null;
  }
  const fam = famSnap.data();
  if (fam.migrationState !== "v2") {
    console.error(`[ownerUids Migration] families/${familyId} v2 নয় (migrationState=${fam.migrationState || "নেই"}) — স্কিপ, কোনো write হয়নি।`);
    return null;
  }
  const membersSnap = await db.collection("families").doc(familyId).collection("members").get();
  const toMigrate = [];
  const alreadyOk = [];
  const skippedUnclaimed = [];
  membersSnap.docs.forEach(doc => {
    const data = doc.data();
    if (Array.isArray(data.ownerUids)) {
      alreadyOk.push({ id: doc.id, name: data.name || null, ownerUids: data.ownerUids });
      return;
    }
    if (typeof data.ownerUid === "string" && data.ownerUid) {
      toMigrate.push({ ref: doc.ref, id: doc.id, name: data.name || null, ownerUid: data.ownerUid });
    } else {
      skippedUnclaimed.push({ id: doc.id, name: data.name || null });
    }
  });
  if (!dryRun && toMigrate.length) {
    const batch = db.batch();
    toMigrate.forEach(m => {
      batch.set(m.ref, { ownerUids: [m.ownerUid] }, { merge: true });
    });
    await batch.commit();
  }
  const summary = {
    familyId,
    familyCode: fam.familyCode || null,
    mode: dryRun ? "DRY-RUN (কোনো write হয়নি)" : "LIVE (write সম্পন্ন)",
    totalMembers: membersSnap.size,
    migrated: toMigrate.length,
    alreadyHadOwnerUids: alreadyOk.length,
    skippedUnclaimed: skippedUnclaimed.length
  };
  console.log(`[ownerUids Migration] family=${summary.familyCode || familyId} | ${summary.mode} | মোট সদস্য=${summary.totalMembers} | migrate${dryRun ? " হবে" : " হয়েছে"}=${summary.migrated} | ইতিমধ্যে ঠিক আছে=${summary.alreadyHadOwnerUids} | unclaimed(স্কিপ)=${summary.skippedUnclaimed}`);
  if (toMigrate.length) {
    console.table(toMigrate.map(m => ({ id: m.id, name: m.name, ownerUid: m.ownerUid, "→ ownerUids": `[${m.ownerUid}]` })));
  }
  return { summary, toMigrate: toMigrate.map(({ ref, ...rest }) => rest), alreadyOk, skippedUnclaimed };
}
if (typeof window !== "undefined") {
  window.migrateOwnerUidsToArray = migrateOwnerUidsToArray;
}

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
        ownerUids = membersSnap.docs.flatMap(d => extractOwnerUidsFromMemberData(d.data()));
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

async function backfillLastActiveAt(familyId, confirm) {
  const familyRoot = db.collection("families").doc(familyId);
  const membersSnap = await familyRoot.collection("members").get();
  // TTL dry-run audit(২৫ আগস্ট ২০২৬) finding: entries-এ lastActiveAt কখনো
  // stamp হতো না(saveEntry() ফিক্স হয়েছে future save-এর জন্য, কিন্তু
  // existing doc-এর জন্য এই backfill-এই scope বাড়ানো হলো — same pattern)।
  const entriesSnap = await familyRoot.collection("entries").get();
  console.log(`[Lifecycle backfill] familyId=${familyId} — ${membersSnap.size}টি member + ${entriesSnap.size}টি entry doc + ১টি family doc lastActiveAt পাবে।`);
  if (!confirm) {
    console.log("[Lifecycle backfill] dry-run শেষ — আসল লেখা চালাতে backfillLastActiveAt(familyId, true) কল করুন।");
    return { familyId, memberCount: membersSnap.size, entryCount: entriesSnap.size, dryRun: true };
  }
  const ts = firebase.firestore.Timestamp.now();
  // ৫০০/batch Firestore limit-এর কারণে entries বড় হলে chunk করা হলো
  // (member+family ছোট বলে প্রথম batch-এই থাকছে, logic অপরিবর্তিত)।
  const CHUNK = 400;
  let batch = db.batch();
  let opsInBatch = 0;
  const flush = async () => { if (opsInBatch > 0) { await batch.commit(); batch = db.batch(); opsInBatch = 0; } };
  membersSnap.docs.forEach(d => { batch.set(d.ref, { lastActiveAt: ts }, { merge: true }); opsInBatch++; });
  batch.set(familyRoot, { lastActiveAt: ts }, { merge: true });
  opsInBatch++;
  for (const d of entriesSnap.docs) {
    if (opsInBatch >= CHUNK) await flush();
    batch.set(d.ref, { lastActiveAt: ts }, { merge: true });
    opsInBatch++;
  }
  await flush();
  console.log(`[Lifecycle backfill] সম্পন্ন — familyId=${familyId}, ${membersSnap.size}টি member + ${entriesSnap.size}টি entry + family doc আপডেট হয়েছে।`);
  return { familyId, memberCount: membersSnap.size, entryCount: entriesSnap.size, dryRun: false };
}
if (typeof window !== "undefined") {
  window.backfillLastActiveAt = backfillLastActiveAt;
}

async function backfillFirstAdminUid(familyId, uid, confirm) {
  const ref = db.collection("families").doc(familyId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`[FirstAdmin backfill] familyId=${familyId} পাওয়া যায়নি।`);
    return { ok: false, reason: "not-found" };
  }
  const fam = snap.data();
  if (fam.firstAdminUid) {
    console.log(`[FirstAdmin backfill] familyId=${familyId}-এ firstAdminUid ইতিমধ্যে সেট(${fam.firstAdminUid}) — কিছু করা হয়নি।`);
    return { ok: false, reason: "already-set", current: fam.firstAdminUid };
  }
  if (!Array.isArray(fam.adminUids) || !fam.adminUids.includes(uid)) {
    console.log(`[FirstAdmin backfill] uid=${uid} এই family-র adminUids-এ নেই — বাতিল করা হলো।`);
    return { ok: false, reason: "uid-not-admin" };
  }
  if (!confirm) {
    console.log(`[FirstAdmin backfill] dry-run — familyId=${familyId}-এ firstAdminUid=${uid} সেট হবে। আসল লেখা চালাতে backfillFirstAdminUid(familyId, uid, true) কল করুন।`);
    return { ok: true, dryRun: true };
  }
  await ref.update({ firstAdminUid: uid, updatedAt: Date.now() });
  console.log(`[FirstAdmin backfill] সম্পন্ন — familyId=${familyId}, firstAdminUid=${uid}।`);
  return { ok: true, dryRun: false };
}
// §Hybrid Admin Role Model — Backfill: role field deploy-এর আগে যেসব
// member ইতিমধ্যে family.adminUids-এ আছেন(কোনো ownerUids entry match করে),
// তাদের role:"admin" সেট করা(idempotent — আগে থেকে role থাকলে skip, কোনো
// field delete হয় না)। migrateOwnerUidsToArray-এর মতোই console-only,
// dry-run-first pattern।
async function backfillMemberRoles(dryRun, familyIdOverride) {
  if (dryRun === undefined) dryRun = true;
  const familyId = familyIdOverride || getFamilyId();
  if (!familyId) {
    console.error("[Role Backfill] familyId পাওয়া যায়নি।");
    return null;
  }
  const famSnap = await db.collection("families").doc(familyId).get();
  if (!famSnap.exists) {
    console.error(`[Role Backfill] families/${familyId} পাওয়া যায়নি।`);
    return null;
  }
  const fam = famSnap.data();
  const adminUids = Array.isArray(fam.adminUids) ? fam.adminUids : [];
  const membersSnap = await db.collection("families").doc(familyId).collection("members").get();
  const toBackfill = [];
  const skipped = [];
  membersSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.role) {
      skipped.push({ id: doc.id, name: data.name || null, reason: "role আগে থেকে সেট", role: data.role });
      return;
    }
    const ownerUids = Array.isArray(data.ownerUids)
      ? data.ownerUids
      : (data.ownerUid ? [data.ownerUid] : []);
    const isInAdminUids = ownerUids.some(u => adminUids.includes(u));
    if (isInAdminUids) {
      toBackfill.push({ ref: doc.ref, id: doc.id, name: data.name || null, ownerUids, proposedRole: "admin" });
    } else {
      skipped.push({ id: doc.id, name: data.name || null, reason: "adminUids-এ নেই — role সেট হবে না" });
    }
  });
  if (!dryRun && toBackfill.length) {
    const batch = db.batch();
    toBackfill.forEach(m => {
      batch.update(m.ref, { role: "admin", updatedAt: Date.now() });
    });
    await batch.commit();
  }
  const summary = {
    familyId,
    familyCode: fam.familyCode || null,
    mode: dryRun ? "DRY-RUN (কোনো write হয়নি)" : "LIVE (write সম্পন্ন)",
    totalMembers: membersSnap.size,
    backfilled: toBackfill.length,
    skipped: skipped.length
  };
  console.log(`[Role Backfill] family=${summary.familyCode || familyId} | ${summary.mode} | মোট সদস্য=${summary.totalMembers} | role:"admin" সেট${dryRun ? " হবে" : " হয়েছে"}=${summary.backfilled} | skip=${summary.skipped}`);
  console.table(toBackfill.map(m => ({ id: m.id, name: m.name, ownerUids: JSON.stringify(m.ownerUids), "is-in-adminUids": true, "proposed role": m.proposedRole })));
  if (skipped.length) console.table(skipped);
  return { summary, toBackfill: toBackfill.map(({ ref, ...rest }) => rest), skipped };
}
if (typeof window !== "undefined") {
  window.backfillMemberRoles = backfillMemberRoles;
}
if (typeof window !== "undefined") {
  window.backfillFirstAdminUid = backfillFirstAdminUid;
}

export {
  dryRunPhaseCReadinessCheck,
  copyPhaseCData,
  verifyPhaseCData,
  reverseSyncPhaseCData,
  healthCheckFamily,
  auditAllFamiliesHealthCheck,
  extractOwnerUidsFromMemberData,
  auditGrandfatherCandidates,
  migrateOwnerUidsToArray,
  migrateApprovedGrandfatherAccess,
  auditOrphanFamilies,
  cleanupOrphanFamilies,
  backfillLastActiveAt,
  backfillFirstAdminUid,
  backfillMemberRoles
};
