// memberData.js — Member/Entry/Weekly/Key Firestore data-layer (CRUD,
// claim/FIFO, stampLastActive, member-key system, entry history).
import { db, auth } from "./firebaseConfig.js";
import { sha256Hex, monthPrefix } from "./appHelpers.js";
import { getFamilyCode, resolveFamilyIdFromCode, getFamilyId, saveUserFamilyCode, getCollectionName, appStorage, resolvePathContext, isGoogleLinked } from "./familyIdentity.js";

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
  stampLastActive(batch, ctx.membersRef.doc(ctx.memberDocId(memberId)), getFamilyId(), auth.currentUser ? auth.currentUser.uid : null);
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
  const ts = firebase.firestore.Timestamp.now();
  if (memberRef) {
    const payload = { lastActiveAt: ts };
    if (uid) payload.ownerActivity = { [uid]: ts };
    batch.set(memberRef, payload, { merge: true });
  }
  if (familyId) batch.set(db.collection("families").doc(familyId), { lastActiveAt: ts }, { merge: true });
}
// Firestore Timestamp বা raw millis দুটোই handle করে — ownerActivity map
// read করার সময় ব্যবহার হয় (transaction snapshot-এ Timestamp আসে)।
function tsToMillis(v) {
  if (!v) return 0;
  return typeof v.toMillis === "function" ? v.toMillis() : v;
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
    ownerUids: [],
    ownerActivity: {},
    updatedAt: Date.now()
  });
}
// =====================================================================
// --- §Member Key(নতুন, ১৫ আগস্ট ২০২৬-পরবর্তী সেশন — Admin Recovery Key
// প্রতিস্থাপন করে) — প্রতিটি member-এর নিজস্ব ownership/recovery
// credential। ইচ্ছাকৃতভাবে শুধু v2(families/{id}/members) path-এ
// implement — উভয় real family ইতিমধ্যে v2-তে LIVE(legacy শুধু
// rollback-safety হিসেবে অপরিবর্তিত থাকছে, নতুন feature পায়নি)। ---
// =====================================================================
function memberPrivateKeyRef(memberId) {
  return db.collection("families").doc(getFamilyId())
    .collection("members").doc(memberId)
    .collection("private").doc("key");
}

const MEMBER_KEY_CHARSET_PATTERN = /^[A-Za-z0-9!@#$%&*+\-_]+$/;
function isMemberKeyCharsetValid(key) {
  return MEMBER_KEY_CHARSET_PATTERN.test(key);
}
function generateMemberKeyPlain() {
  const DIGITS = "23456789";
  const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const LOWER = "abcdefghjkmnpqrstuvwxyz";
  const SYMBOLS = "!@#$%&*+-_";
  const POOL = DIGITS + UPPER + LOWER + SYMBOLS;
  function randInt(maxExclusive) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  function randChar(set) {
    return set[randInt(set.length)];
  }
  const len = 9 + randInt(4); // 9,10,11,12
  const chars = [randChar(DIGITS), randChar(UPPER + LOWER), randChar(SYMBOLS)];
  const remaining = len - chars.length;
  for (let i = 0; i < remaining; i++) chars.push(randChar(POOL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function generateReadableMemberKey(name) {
  function randInt(maxExclusive) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  const letters = (name || "").replace(/[^A-Za-z]/g, "");
  const useFallback = letters.length < 3;
  const base = useFallback ? "Member" : (letters[0].toUpperCase() + letters.slice(1).toLowerCase());
  let digitCount = useFallback ? 3 : (2 + randInt(2)); // ২ বা ৩
  let digits = "";
  for (let i = 0; i < digitCount; i++) digits += String(randInt(10));
  while ((base + digits).length < 6) digits += String(randInt(10));
  return base + digits;
}
// §Collision-safe generation(২৩ আগস্ট ২০২৬, critical) — readable
// প্যাটার্নে entropy অনেক কম(আগের high-entropy format-এর তুলনায়), তাই
// keyIndex-এ duplicate-hash আছে কিনা bounded-retry দিয়ে check করা হয়।
// প্রতিটি attempt-এ ১টি করে extra read(শুধু member-creation-এর মতো rare
// action-এ, কোনো persistent listener/বাড়তি cost না)। bounded retry-ও
// ব্যর্থ হলে(অত্যন্ত বিরল) পুরনো high-entropy generator fallback(ব্যবহারিকভাবে
// collision-free) — কখনো silently duplicate key লেখা হয় না।
async function generateUniqueReadableMemberKey(name) {
  const keyIndexColl = db.collection("families").doc(getFamilyId()).collection("keyIndex");
  for (let attempt = 0; attempt < 8; attempt++) {
    const key = generateReadableMemberKey(name);
    const hash = await sha256Hex(key);
    const dupSnap = await keyIndexColl.doc(hash).get();
    if (!dupSnap.exists) return { key, hash };
  }
  const key = generateMemberKeyPlain();
  const hash = await sha256Hex(key);
  return { key, hash };
}

async function createMemberWithKey(member, presetKey) {
  const {
    id,
    ...fields
  } = member;
  const memberRef = db.collection("families").doc(getFamilyId()).collection("members").doc(id);
  const keyIndexColl = db.collection("families").doc(getFamilyId()).collection("keyIndex");
  const privateRef = memberRef.collection("private").doc("key");
  // §"সদস্য হোন" pre-generated password(২২ আগস্ট ২০২৬, অপরিবর্তিত নীতি):
  // presetKey দেওয়া হলে(admin approve path) requester-এর নিজের generate
  // করা password-ই ব্যবহার হয়, silently regenerate হয় না — approval-এর
  // আগে দেখানো password-ই approval-এর পর কার্যকর থাকতে হবে। presetKey না
  // থাকলে(admin direct-add path) readable(নাম+২-৩ digit) key duplicate-check-সহ
  // generate হয়(generateUniqueReadableMemberKey — pre-check retry)।
  let key, hash;
  if (presetKey) {
    key = presetKey;
    hash = await sha256Hex(key);
  } else {
    const generated = await generateUniqueReadableMemberKey(fields.name);
    key = generated.key;
    hash = generated.hash;
  }
  // Admin FIFO ownerActivity missing-key fix(১৯ আগস্ট ২০২৬): ownerUids-সহ
  // তৈরি হওয়া member(approved memberRequest/first admin)-এর owner uid-এর
  // জন্য সাথে সাথে ownerActivity stamp করা হয় — নাহলে সেই uid নিজে entry
  // save/re-claim না করা পর্যন্ত ownerActivity-তে entry থাকে না, ফলে FIFO
  // eviction Rules-এ missing-key error/deny দেয়(auto-eviction silently fail)।
  // ownerUids:[](unclaimed member, handleAddMember path) অপরিবর্তিত—claim
  // সময়ে আগে থেকেই stamp হয়।
  const initialOwnerActivity = {};
  if (Array.isArray(fields.ownerUids)) {
    fields.ownerUids.forEach(u => {
      initialOwnerActivity[u] = firebase.firestore.Timestamp.now();
    });
  }
  // §Collision-safe write(২৩ আগস্ট ২০২৬, critical) — batch.set()-এর বদলে
  // transaction, যা লেখার ঠিক আগমুহূর্তে keyIndex/{hash} আবার verify করে
  // (changeMemberKey()-এর existing duplicate-check pattern-এরই reuse)।
  // readable password-এ entropy কম বলে pre-check(generateUniqueReadableMemberKey)
  // ও এই final authoritative check — দুই স্তরেই duplicate silently overwrite
  // হওয়া থেকে রক্ষা করে; কলিশন হলে(অত্যন্ত বিরল race) member তৈরি না হয়ে
  // স্পষ্ট error throw হয়(caller-এর existing catch/alert দেখাবে)।
  await db.runTransaction(async tx => {
    const dupSnap = await tx.get(keyIndexColl.doc(hash));
    if (dupSnap.exists) {
      throw new Error("পাসওয়ার্ডে দ্বন্দ্ব(collision) হয়েছে — আবার চেষ্টা করুন।");
    }
    tx.set(memberRef, {
      ...fields,
      ...(Object.keys(initialOwnerActivity).length ? { ownerActivity: initialOwnerActivity } : {}),
      updatedAt: Date.now(),
      lastActiveAt: firebase.firestore.Timestamp.now()
    }, { merge: true });
    tx.set(privateRef, {
      memberKey: key,
      memberKeyHash: hash,
      updatedAt: Date.now()
    });
    // §Member Key Direct-Identify(১৯ আগস্ট ২০২৬) — routing-only ইনডেক্স,
    // কোনো authorization field না। firestore.rules-এ ইতিমধ্যে implement করা
    // আছে(cross-member injection-protected, duplicate-hash auto-block)।
    tx.set(keyIndexColl.doc(hash), { memberId: id });
    stampLastActive(tx, null, getFamilyId());
  });
  return key;
}

async function fetchMemberKey(memberId) {
  const snap = await memberPrivateKeyRef(memberId).get();
  return snap.exists ? snap.data().memberKey : null;
}
// Key পরিবর্তন(owner অথবা admin) — নতুন key generate করে plaintext+hash
// দুটোই আপডেট, পুরনো key নিষ্ক্রিয় হয়ে যায়।
async function changeMemberKey(memberId, customKey) {
  const key = (customKey && customKey.trim()) ? customKey.trim() : generateMemberKeyPlain();
  const hash = await sha256Hex(key);
  const privateRef = memberPrivateKeyRef(memberId);
  const keyIndexColl = db.collection("families").doc(getFamilyId()).collection("keyIndex");
  const newIndexRef = keyIndexColl.doc(hash);
  // §Member Key Direct-Identify(১৯ আগস্ট ২০২৬, touch-point 2) — transaction:
  // পুরনো keyIndex delete → key update → নতুন keyIndex create(duplicate-hash
  // check সহ)। set(merge:true) — update()-এর বদলে, কারণ Member Key System-এর
  // আগে তৈরি পুরনো member-দের private/key doc-ই না-ও থাকতে পারে(তখন update()
  // "No document to update" error দিত)। merge:true দিয়ে create ও overwrite
  // দুই ক্ষেত্রেই কাজ করবে।
  await db.runTransaction(async tx => {
    const oldSnap = await tx.get(privateRef);
    const oldHash = oldSnap.exists ? oldSnap.data().memberKeyHash : null;
    // নতুন hash আগের hash-এর সমান না হলে(সাধারণ ক্ষেত্র) duplicate-check —
    // hash collision(অন্য member-এর keyIndex দখল) এড়াতে read করা হচ্ছে।
    if (oldHash !== hash) {
      const dupSnap = await tx.get(newIndexRef);
      if (dupSnap.exists) {
        throw new Error("key-collision");
      }
    }
    tx.set(privateRef, {
      memberKey: key,
      memberKeyHash: hash,
      updatedAt: Date.now()
    });
    tx.set(newIndexRef, { memberId });
    if (oldHash && oldHash !== hash) {
      tx.delete(keyIndexColl.doc(oldHash));
    }
  });
  return key;
}

async function claimMemberWithKey(memberId, enteredKey, uid, familyIdOverride) {
  const trimmed = (enteredKey || "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  const targetFamilyId = familyIdOverride || getFamilyId();
  const memberRef = db.collection("families").doc(targetFamilyId).collection("members").doc(memberId);
  const famRef = db.collection("families").doc(targetFamilyId);
  let attemptedAdminEviction = false;
  try {
    const hash = await sha256Hex(trimmed);
    let wasReplaced = false;
    let outerEvictedUid = null;
    await db.runTransaction(async tx => {
      // transaction contention হলে callback retry হতে পারে — প্রতি
      // attempt-এ flag reset জরুরি, নাহলে আগের ব্যর্থ attempt-এর stale
      // মান থেকে যেতে পারে।
      wasReplaced = false;
      attemptedAdminEviction = false;
      outerEvictedUid = null;
      const snap = await tx.get(memberRef);
      const data = snap.exists ? snap.data() : {};
      // Migration-window fallback: ownerUids না থাকলে পুরনো ownerUid থেকে।
      const currentOwners = Array.isArray(data.ownerUids)
        ? data.ownerUids
        : (data.ownerUid ? [data.ownerUid] : []);
      // §Hybrid Admin Role Model — role(authoritative) already এই একই
      // transaction-এ পড়া member doc-এ আছে, তাই নতুন get() লাগে না।
      const isAdminRole = data.role === "admin";
      // Firestore transaction rule: সব read অবশ্যই write-এর আগে হতে হবে
      // — তাই admin হলে family doc(adminUids sync-এর জন্য লাগবে) এখানেই,
      // কোনো write শুরুর আগেই read করা হচ্ছে।
      const famSnap = isAdminRole ? await tx.get(famRef) : null;

      if (currentOwners.includes(uid)) {
        // এই uid ইতিমধ্যে owner — duplicate নয়, শুধু key-verify + activity stamp।
        tx.update(memberRef, {
          ownerUids: currentOwners,
          updatedAt: Date.now(),
          claimKeyHashAttempt: hash,
          [`ownerActivity.${uid}`]: firebase.firestore.Timestamp.now()
        });
        return;
      }
      // FIFO replace(ownerActivity-ভিত্তিক): password সঠিক প্রমাণিত হলে
      // ৩টি পূর্ণ থাকা অবস্থায়ও সবচেয়ে stale uid বাদ দিয়ে বর্তমান uid
      // যোগ করা হয় — member ও admin উভয়ের ক্ষেত্রেই একই গণনা(নিচে)।
      // "stale" ownerActivity map(uid→timestamp)-এর সবচেয়ে পুরনো entry
      // থেকে নির্ণয় করা হয়; entry না থাকা uid সবচেয়ে stale ধরা হয়
      // (timestamp 0)। admin-এর ক্ষেত্রে firstAdminUid(§First Admin
      // Protection, ১৯ আগস্ট ২০২৬)-কে candidate থেকে বাদ রাখা হয়, যাতে
      // সে কখনো evict-attempt না হয়(rules-এর family-root swap clause-ও
      // আলাদাভাবে একই সুরক্ষা দেয় — এটি defense-in-depth, single-source
      // নয়)। firstAdminUid ছাড়া বাকি সব uid-ই এখন non-admin-এর মতো
      // unconditional FIFO eligible(কোনো সময়-শর্ত নেই)।
      let revoked = false;
      let nextOwners = [...currentOwners, uid];
      let evictedUid = null;
      if (currentOwners.length >= 3) {
        const ownerActivity = data.ownerActivity || {};
        const firstAdminUid = isAdminRole && famSnap && famSnap.data() ? famSnap.data().firstAdminUid : null;
        const evictionCandidates = (isAdminRole && firstAdminUid)
          ? currentOwners.filter(u => u !== firstAdminUid)
          : currentOwners;
        let staleUid = evictionCandidates[0];
        let staleTs = tsToMillis(ownerActivity[staleUid]);
        for (const ou of evictionCandidates) {
          const ts = tsToMillis(ownerActivity[ou]);
          if (ts < staleTs) { staleTs = ts; staleUid = ou; }
        }
        nextOwners = currentOwners.filter(u => u !== staleUid).concat([uid]);
        revoked = true;
        evictedUid = staleUid;
        if (isAdminRole) attemptedAdminEviction = true;
      }
      const updatePayload = {
        ownerUids: nextOwners,
        updatedAt: Date.now(),
        claimKeyHashAttempt: hash,
        [`ownerActivity.${uid}`]: firebase.firestore.Timestamp.now()
      };
      // evicted uid-এর ownerActivity entry একই transaction-এ মুছে ফেলা হয়
      // (ownerUids ও ownerActivity সবসময় consistent রাখতে — stale key জমবে না)।
      if (evictedUid) updatePayload[`ownerActivity.${evictedUid}`] = firebase.firestore.FieldValue.delete();
      tx.update(memberRef, updatePayload);
      if (isAdminRole) {
        // family.adminUids index — এখানে explicit পুরো array লেখা হচ্ছে
        // (arrayUnion+arrayRemove একই field-এ একই write-এ combine করা
        // যায় না বলে)। evictedUid থাকলে(swap) সেটা বাদ দিয়ে caller uid
        // যোগ; না থাকলে(plain add, ৩-এর কম owners ছিল) শুধু যোগ।
        const currentAdminUids = Array.isArray(famSnap && famSnap.data() && famSnap.data().adminUids)
          ? famSnap.data().adminUids
          : [];
        let nextAdminUids = evictedUid
          ? currentAdminUids.filter(u => u !== evictedUid)
          : currentAdminUids;
        if (!nextAdminUids.includes(uid)) nextAdminUids = [...nextAdminUids, uid];
        tx.update(famRef, {
          adminUids: nextAdminUids,
          updatedAt: Date.now(),
          lastAdminClaimMemberId: memberId
        });
      }
      if (revoked) wasReplaced = true;
      outerEvictedUid = evictedUid;
    });
    return { ok: true, revoked: wasReplaced, evictedUid: outerEvictedUid };
  } catch (err) {
    // ভুল Member Password হলে Rules permission-denied ছোঁড়ে(reject)।
    // adminEvictionAttempt flag এখনো ফেরত দেওয়া হয়(future-diagnostic/
    // debugging-এ কাজে লাগতে পারে) কিন্তু UI আর এটি আলাদাভাবে ব্যবহার
    // করে না(১৯ আগস্ট ২০২৬, ৭-দিন gate সরানোর পর generic বার্তাই যথেষ্ট)।
    return { ok: false, reason: "denied", error: err.message, adminEvictionAttempt: attemptedAdminEviction };
  }
}

async function directIdentifyLogin(code, password) {
  const normalizedCode = (code || "").trim();
  const pw = (password || "").trim();
  if (!normalizedCode || !pw) return { ok: false, reason: "empty" };
  const resolved = await resolveFamilyIdFromCode(normalizedCode);
  // §Diagnostic(২০ আগস্ট ২০২৬, temporary): আগে সব ব্যর্থতা generic "invalid"-এ
  // চাপা পড়ত, ফলে keyIndex-miss vs claim-denied vs family-not-found আলাদা
  // করা UI থেকে অসম্ভব ছিল — এখন প্রতিটি ব্যর্থতার নির্দিষ্ট debugTag পাঠানো
  // হচ্ছে(শুধু onboarding error-এ দেখানোর জন্য, kill/production sensitive না)।
  if (!resolved.ok) return { ok: false, reason: "invalid", debugTag: "family:" + resolved.reason };
  let memberId = null;
  let keyIndexErr = null;
  try {
    const hash = await sha256Hex(pw);
    const idxSnap = await db.collection("families").doc(resolved.familyId)
      .collection("keyIndex").doc(hash).get();
    if (idxSnap.exists) memberId = idxSnap.data() ? idxSnap.data().memberId : null;
  } catch (e) {
    memberId = null; // permission-denied/network — miss হিসেবেই treat, কোনো commit না
    keyIndexErr = e && e.message;
  }
  if (!memberId) {
    // §Login feedback(পেন্ডিং/ডিনাইড, ২৩ আগস্ট ২০২৬): approval-এর আগে
    // keyIndex doc তৈরিই হয় না(দ্রষ্টব্য: ফাইল-২ §১৮), তাই সঠিক
    // username/password দিয়েও এতক্ষণ generic "invalid" দেখাত। নিজের(self-uid)
    // memberRequests doc—যা Rules-এ সবসময় নিজে পড়ার অনুমতি আছে—শুধুই
    // তখনই check করা হচ্ছে যখন keyIndex miss হয়েছে(কোনো নতুন access না,
    // শুধু বিদ্যমান allowed read)। presetKey হুবহু মিললে তবেই pending/denied
    // reason ফেরত; না মিললে(ভুল password) বা কোনো error হলে আগের মতোই
    // generic "invalid"-এ silently fallback — কোনো তথ্য leak হয় না, access-ও
    // দেওয়া হয় না(নিচে কোনো claim/commit নেই, শুধু error-message নির্বাচন)।
    const selfUid = auth.currentUser ? auth.currentUser.uid : null;
    if (selfUid) {
      try {
        const reqSnap = await db.collection("families").doc(resolved.familyId)
          .collection("memberRequests").doc(selfUid).get();
        if (reqSnap.exists) {
          const reqData = reqSnap.data() || {};
          if (reqData.presetKey === pw && (reqData.status === "pending" || reqData.status === "denied")) {
            return { ok: false, reason: reqData.status, debugTag: "memberRequest:" + reqData.status };
          }
        }
      } catch {} // permission-denied/network — miss হিসেবেই treat, fallback নিচে
    }
    return { ok: false, reason: "invalid", debugTag: keyIndexErr ? "keyIndex-err:" + keyIndexErr : "keyIndex-miss" };
  }
  const uid = auth.currentUser ? auth.currentUser.uid : null;
  if (!uid) return { ok: false, reason: "invalid", debugTag: "no-uid" };
  const claimResult = await claimMemberWithKey(memberId, pw, uid, resolved.familyId);
  if (!claimResult || !claimResult.ok) return { ok: false, reason: "invalid", debugTag: "claim:" + ((claimResult && claimResult.error) || "unknown") };
  // সফল claim — এখনই family state commit + reload।
  localStorage.setItem("family_id", resolved.familyId);
  localStorage.setItem("family_code", normalizedCode);
  localStorage.setItem("family_code_is_custom", "1");
  if (isGoogleLinked()) {
    try { await saveUserFamilyCode(uid, normalizedCode, memberId); } catch {}
  }
  window.location.reload();
  return { ok: true };
}
if (typeof window !== "undefined") {
  window.directIdentifyLogin = directIdentifyLogin;
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
    ownerUid: ownerUid ?? null,
    // TTL dry-run audit(২৫ আগস্ট ২০২৬) finding fix: এতদিন entry doc-এ
    // lastActiveAt কখনো stamp হতো না(শুধু family+member-এ হতো) — ফলে
    // Firestore TTL policy entry-তে কখনো trigger হতো না। existing
    // Timestamp.now() pattern(দ্রষ্টব্য লাইন ৪০৫৯/৪২২৭) reuse করে এখানে যোগ।
    lastActiveAt: firebase.firestore.Timestamp.now()
  }, {
    merge: true
  });
  stampLastActive(batch, ctx.membersRef.doc(ctx.memberDocId(memberId)), getFamilyId(), auth.currentUser ? auth.currentUser.uid : null);
  await batch.commit();
}
function entryDocId(memberId, key) {
  return `entry:${memberId}:${key}`;
}

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

export {
  meetingKey,
  saveMeetingData,
  loadWeekly,
  saveWeekly,
  loadLegacyMembers,
  stampLastActive,
  tsToMillis,
  memberDocId,
  loadMembersV2,
  saveMemberDoc,
  deleteMemberDoc,
  claimMemberDoc,
  releaseMemberDoc,
  memberPrivateKeyRef,
  isMemberKeyCharsetValid,
  generateMemberKeyPlain,
  generateReadableMemberKey,
  generateUniqueReadableMemberKey,
  createMemberWithKey,
  fetchMemberKey,
  changeMemberKey,
  claimMemberWithKey,
  directIdentifyLogin,
  migrateMembersIfNeeded,
  loadCustomFields,
  saveCustomFields,
  loadEntry,
  saveEntry,
  entryDocId,
  pushEntryHistory,
  fetchEntryHistory
};
