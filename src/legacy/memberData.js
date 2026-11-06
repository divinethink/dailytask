// memberData.js — Member/Entry/Weekly Firestore data-layer (CRUD, stampLastActive, entry history).
import { dbModular as db, authModular as auth } from "./firebaseConfig.js";
import { collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, writeBatch, Timestamp, query, where, documentId, orderBy, limit } from "firebase/firestore";
import { monthPrefix } from "./appHelpers.js";
import { getFamilyCode, getFamilyId, appStorage, resolvePathContext } from "./familyIdentity.js";

function meetingKey(year, month0) {
  return `meeting_rows_v2:${monthPrefix(year, month0)}`;
}

async function saveMeetingData(year, month0, data) {
  await appStorage.set(meetingKey(year, month0), JSON.stringify(data), true);
  // Data Lifecycle Policy: family-level activity stamp. Meeting doc lives in
  // getCollectionName() (v2 schema migration deferred — see roadmap), so this
  // is a separate write, not part of that batch.
  setDoc(doc(db, "families", getFamilyId()), {
    lastActiveAt: Timestamp.now()
  }, { merge: true }).catch(() => {});
}
async function loadWeekly(migrationState, memberId, year, month0) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const docSnap = await getDoc(doc(ctx.weeklyRef, ctx.weeklyDocId(memberId, monthPrefix(year, month0))));
    if (!docSnap.exists()) return {};
    return JSON.parse(docSnap.data().value);
  } catch {
    return {};
  }
}
async function saveWeekly(migrationState, memberId, year, month0, data, ownerUid) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const batch = writeBatch(db);
  batch.set(doc(ctx.weeklyRef, ctx.weeklyDocId(memberId, monthPrefix(year, month0))), {
    value: JSON.stringify(data),
    updatedAt: Date.now(),
    ownerUid: ownerUid ?? null
  }, {
    merge: true
  });
  stampLastActive(batch, doc(ctx.membersRef, ctx.memberDocId(memberId)), getFamilyId(), auth.currentUser ? auth.currentUser.uid : null);
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

function stampLastActive(batch, memberRef, familyId, uid) {
  const ts = Timestamp.now();
  if (memberRef) {
    const payload = { lastActiveAt: ts };
    batch.set(memberRef, payload, { merge: true });
  }
  if (familyId) batch.set(doc(db, "families", familyId), { lastActiveAt: ts }, { merge: true });
}
// --- Device-Claim member storage (v2) — one real Firestore document per
// member (doc id: "member:<id>") with plain top-level fields, so Firestore
// security rules can read `ownerUid` directly (rules cannot see inside a
// JSON-stringified "value" field, which is why v1's single array-doc
// couldn't support per-member ownership).
function memberDocId(id) {
  return `member:${id}`;
}

async function loadMembersV2(migrationState) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    if (ctx.mode === "v2") {
      const snap = await getDocs(ctx.membersRef);
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }
    const snap = await getDocs(query(
      ctx.membersRef,
      where(documentId(), ">=", "member:"),
      where(documentId(), "<", "member:\uf8ff")
    ));
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
  const memberRef = doc(ctx.membersRef, ctx.memberDocId(id));
  const batch = writeBatch(db);
  batch.set(memberRef, {
    ...fields,
    updatedAt: Date.now(),
    lastActiveAt: Timestamp.now()
  }, {
    merge: true
  });
  stampLastActive(batch, null, getFamilyId());
  await batch.commit();
}
async function deleteMemberDoc(migrationState, id) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  await deleteDoc(doc(ctx.membersRef, ctx.memberDocId(id)));
}


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

// §লেবেল ম্যানেজ(ধাপ গ, owner-approved): family-স্তরের ঐচ্ছিক "field_overrides" doc —
// custom_fields-এর হুবহু একই storage-পথ(appStorage shared), তাই নতুন Rules লাগে না।
async function loadFieldOverrides() {
  try {
    const res = await appStorage.get("field_overrides", true);
    return res ? JSON.parse(res.value) : {};
  } catch {
    return {};
  }
}
async function saveFieldOverrides(overrides) {
  await appStorage.set("field_overrides", JSON.stringify(overrides), true);
}

// §তাযকিরাহ ম্যানেজ(ধাপ খ, owner-approved): family-স্তরের ঐচ্ছিক "tazkirah_custom" doc —
// custom_fields/field_overrides-এর হুবহু একই storage-পথ(appStorage shared), তাই নতুন Rules লাগে না।
async function loadTazkirahCustom() {
  try {
    const res = await appStorage.get("tazkirah_custom", true);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}
async function saveTazkirahCustom(data) {
  await appStorage.set("tazkirah_custom", JSON.stringify(data), true);
}

async function loadEntry(migrationState, memberId, key) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const docSnap = await getDoc(doc(ctx.entriesRef, ctx.entryDocId(memberId, key)));
    if (!docSnap.exists()) return null;
    return JSON.parse(docSnap.data().value);
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
  const batch = writeBatch(db);
  batch.set(doc(ctx.entriesRef, ctx.entryDocId(memberId, key)), {
    value: JSON.stringify(data),
    updatedAt: Date.now(),
    ownerUid: ownerUid ?? null,
    // TTL dry-run audit(২৫ আগস্ট ২০২৬) finding fix: এতদিন entry doc-এ
    // lastActiveAt কখনো stamp হতো না(শুধু family+member-এ হতো) — ফলে
    // Firestore TTL policy entry-তে কখনো trigger হতো না। existing
    // Timestamp.now() pattern(দ্রষ্টব্য লাইন ৪০৫৯/৪২২৭) reuse করে এখানে যোগ।
    lastActiveAt: Timestamp.now()
  }, {
    merge: true
  });
  stampLastActive(batch, doc(ctx.membersRef, ctx.memberDocId(memberId)), getFamilyId(), auth.currentUser ? auth.currentUser.uid : null);
  await batch.commit();
}
function entryDocId(memberId, key) {
  return `entry:${memberId}:${key}`;
}

// §Motivational Layer — Phase 1.5(owner-approved, নতুন): bestScoreEver
// denormalized field — dailyInsight.js-এর "সেরা দিন" insight-কে পুরো ইতিহাস
// scan না করে O(1) read-এ "সর্বকালের সেরা" বলতে দেয়। pushEntryHistory()-এর
// একই "best-effort convenience layer" pattern(নিচে দেখুন) — saveEntry()/
// stampLastActive()-এর মূল batch সম্পূর্ণ অপরিবর্তিত, ইচ্ছাকৃতভাবে সম্পূর্ণ
// আলাদা, independent write। ব্যর্থ হলে মূল entry-save-কে প্রভাবিত করে না —
// dailyInsight তখন শুধু "এই মাসে"-স্কোপ fallback-এ ফিরে যাবে(নিচে dailyInsight.js
// দ্রষ্টব্য)। Rules-এ monotonic guard(bestScoreEver কখনো কমতে পারবে না) থাকায়
// দেরি-হওয়া/out-of-order কল থেকেও data-corruption ঝুঁকি নেই।
async function updateBestScoreIfNeeded(migrationState, memberId, todayScorePct) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const memberRef = doc(ctx.membersRef, ctx.memberDocId(memberId));
    const snap = await getDoc(memberRef);
    const current = snap.exists() && typeof snap.data().bestScoreEver === "number" ? snap.data().bestScoreEver : 0;
    if (todayScorePct > current) {
      await setDoc(memberRef, { bestScoreEver: todayScorePct, updatedAt: Date.now() }, { merge: true });
    }
  } catch {
    // Best-effort convenience layer — ব্যর্থ হলে silently ignore(pushEntryHistory()-এর
    // মতোই), মূল entry-save flow-কে কখনো block/fail করাবে না।
  }
}

// §Motivational Layer — Phase 2(owner-approved, নতুন): tomorrowFocus —
// সদস্য নিজে(বা admin, unclaimed proxy member-এর জন্য) পরদিনের Focus বেছে
// নেন/বদলান। saveEntry()-এর batch-এর অংশ না, সরাসরি explicit user-action-এ
// (TomorrowFocusPicker.jsx) ট্রিগার হয় — তাই ব্যর্থ হলে caller নিজেই error
// দেখাবে(entry-save flow-এর সাথে কোনো সম্পর্ক নেই)।
async function saveTomorrowFocus(migrationState, memberId, focus) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const memberRef = doc(ctx.membersRef, ctx.memberDocId(memberId));
  await setDoc(memberRef, {
    tomorrowFocus: {
      fieldKey: focus.fieldKey,
      targetDateKey: focus.targetDateKey,
      source: focus.source,
      setAt: Date.now()
    },
    updatedAt: Date.now()
  }, { merge: true });
}

// §কাস্টম টাস্ক(সদস্যভিত্তিক, owner-approved): member-ডকের ঐচ্ছিক customTasks ফিল্ড।
// explicit user-action, saveEntry() batch-এর অংশ না।
async function saveCustomTasks(migrationState, memberId, tasks) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const memberRef = doc(ctx.membersRef, ctx.memberDocId(memberId));
  await setDoc(memberRef, {
    customTasks: tasks.map(t => (t.archived ? { id: t.id, label: t.label, archived: true } : { id: t.id, label: t.label })),
    updatedAt: Date.now()
  }, { merge: true });
}

async function pushEntryHistory(migrationState, memberId, key, oldData) {
  try {
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const histRef = collection(doc(ctx.entriesRef, ctx.entryDocId(memberId, key)), "history");
    await addDoc(histRef, {
      value: JSON.stringify(oldData),
      editedAt: Date.now()
    });
    const snap = await getDocs(query(histRef, orderBy("editedAt", "desc")));
    if (snap.size > 5) {
      const excess = snap.docs.slice(5);
      const batch = writeBatch(db);
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
    const histRef = collection(doc(ctx.entriesRef, ctx.entryDocId(memberId, key)), "history");
    const snap = await getDocs(query(histRef, orderBy("editedAt", "desc"), limit(5)));
    return snap.docs.map(d => ({
      id: d.id,
      editedAt: d.data().editedAt,
      value: d.data().value
    }));
  } catch {
    return [];
  }
}

export {
  meetingKey,
  saveMeetingData,
  loadWeekly,
  saveWeekly,
  loadLegacyMembers,
  stampLastActive,
  memberDocId,
  loadMembersV2,
  saveMemberDoc,
  deleteMemberDoc,
  migrateMembersIfNeeded,
  loadCustomFields,
  saveCustomFields,
  loadFieldOverrides,
  saveFieldOverrides,
  loadTazkirahCustom,
  saveTazkirahCustom,
  loadEntry,
  saveEntry,
  entryDocId,
  pushEntryHistory,
  fetchEntryHistory,
  updateBestScoreIfNeeded,
  saveTomorrowFocus,
  saveCustomTasks
};
