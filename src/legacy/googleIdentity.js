// googleIdentity.js — 2_4 Identity Simplification: Google-only helper module.
// সম্পূর্ণ নতুন, additive ফাইল — কোনো existing file/flow এখনো এই ফাইল import
// করে না, তাই বর্তমান app আচরণে কোনো পরিবর্তন নেই। Wiring হবে পরের
// sub-phase-গুলোতে(Sign Up §২.১, Google Sign-in §২.২, Invite-Link §৫.২,
// Profile Dropdown §৯.৪) — এখানে শুধু ভিত্তি(schema/helper) তৈরি হলো।
// Firestore Rules(firestore.rules) ইতিমধ্যে এই schema সাপোর্ট করে — এই
// module সেই একই shape/convention অনুসরণ করে(§৩ Data Schema, §১০.২ Email
// Normalization)।
import { db, auth } from "./firebaseConfig.js";
import { generateSecureCode } from "./appHelpers.js";

// §১০.২ — চূড়ান্ত সংজ্ঞা: শুধু trim+lowercase, dot/plus-stripping না
// (provider-specific জটিলতা এড়াতে owner-approved সিদ্ধান্ত)।
function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

// users/{googleUid} → { familyId, memberId }(§৩ schema)। Rules-এ শুধু
// নিজের uid নিজে read/write করতে পারে — তাই caller সবসময় নিজের
// auth.currentUser.uid-ই পাঠাবে(অন্য uid দিয়ে call করলে permission-denied)।
async function writeUserMapping(googleUid, familyId, memberId) {
  // §fix(১১ সেপ্টেম্বর ২০২৬) — `users/{uid}` collection পুরনো ফিচারেও
  // ব্যবহৃত(familyIdentity.js: saveUserFamilyCode(), schema
  // {familyCode, updatedAt})। আগে এখানে plain .set() পুরনো doc সম্পূর্ণ
  // overwrite করে ফেলত(অথবা উল্টো — পুরনো doc-এ familyId না থাকায়
  // loadUserMapping() fast-path মিস করত)। merge:true দিয়ে দুই schema
  // নিরাপদে সহাবস্থান করবে, কোনো ডেটা হারাবে না।
  await db.collection("users").doc(googleUid).set({ familyId, memberId }, { merge: true });
}

async function loadUserMapping(googleUid) {
  const snap = await db.collection("users").doc(googleUid).get();
  return snap.exists ? snap.data() : null;
}

// familyMemberEmails/{normalizedEmail} → { familyId, memberId }(§৩,
// uniqueness enforce)। Rules-এ create-এর জন্য দুই বৈধ পথ আছে(claimed-self
// token-email match, অথবা admin batch-এ member.email সেট করার সাথে) —
// এই helper শুধু ref/read/delete shape দেয়, caller নিজে সঠিক context
// নিশ্চিত করবে যেন Rules pass করে।
function familyMemberEmailRef(normalizedEmail) {
  return db.collection("familyMemberEmails").doc(normalizedEmail);
}

async function lookupFamilyByEmail(email) {
  const key = normalizeEmail(email);
  const snap = await familyMemberEmailRef(key).get();
  return snap.exists ? { normalizedEmail: key, ...snap.data() } : null;
}

// §Add-Member fix(১১ সেপ্টেম্বর ২০২৬, real gap): পুরনো createMemberWithKey()
// (Member Password-ভিত্তিক, memberData.js) google-only family-তে
// firestore.rules-এর `private/key` create rule(`!isGoogleOnly(familyId)`
// guard)-এ blocked হয়ে যাওয়ায় Dashboard-এর "Add Member" বাটন ভাঙা ছিল —
// দুটো real family-ই ইতিমধ্যে identityModel:"google-only"। এই ফাংশন 2_4
// §৫.১("Admin-added Proxy Member") pattern অনুসরণ করে: email দিয়ে unclaimed
// member তৈরি(googleUid:null), সদস্য পরে নিজে Google Sign-in করলে
// signInExistingMemberByGoogle()-এর email-match branch দিয়ে auto-claim হবে
// (একই ফাইলের নিচে, existing flow — নতুন কিছু লাগেনি)।
// memberId caller(app.js) আগে থেকে generate করে পাঠায়(optimistic local UI
// update-এর জন্য, পুরনো handleAddMember()-এর প্যাটার্নের সাথে সামঞ্জস্যপূর্ণ)।
// member doc + familyMemberEmails mapping একই batch-এ লেখা হয়(Rules-এর
// admin-create branch getAfter() দিয়ে member.email verify করে বলে batch/
// transaction আবশ্যক, আলাদা sequential write permission-denied দেবে)।
// email আগে থেকে অন্য কোনো(claimed/unclaimed) সদস্যের সাথে যুক্ত থাকলে —
// প্রথমে friendly pre-check(lookupFamilyByEmail), তারপরও race হলে Rules
// নিজেই reject করবে(familyMemberEmails doc already exists → update-branch,
// যা `allow update: if false`)।
async function addProxyMemberByAdmin(familyId, memberId, name, gender, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("সঠিক ইমেইল ঠিকানা প্রয়োজন।");
  }
  const existing = await lookupFamilyByEmail(normalizedEmail);
  if (existing) {
    throw new Error("এই ইমেইল ইতিমধ্যে অন্য একজন সদস্যের সাথে যুক্ত আছে।");
  }
  const batch = db.batch();
  const memberRef = db.collection("families").doc(familyId).collection("members").doc(memberId);
  batch.set(memberRef, {
    name,
    gender: gender || "male",
    role: "member",
    email: normalizedEmail,
    googleUid: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  batch.set(familyMemberEmailRef(normalizedEmail), { familyId, memberId });
  await batch.commit();
}

// §৫.৩ — family ত্যাগ/remove-এর সময় mapping cleanup। Claimed member-এর
// email field claim-মুহূর্তেই member-doc থেকে delete হয়ে যায়(§৪), তাই
// normalizedEmail caller-কেই আলাদাভাবে জানা/পাস করা লাগবে(reverse-query
// পরের sub-phase-এ familyId+memberId দিয়ে করা হবে, এখানে শুধু delete-primitive)।
async function deleteFamilyMemberEmail(normalizedEmail) {
  await familyMemberEmailRef(normalizedEmail).delete();
}

// existing isGoogleLinked()(familyIdentity.js)-এর মতোই সহজ accessor, কিন্তু
// circular-dependency এড়াতে এই ফাইল familyIdentity.js import করে না —
// শুধু firebaseConfig.js(leaf module) থেকেই auth নেয়।
function currentGoogleUid() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

function currentGoogleEmail() {
  return auth.currentUser ? (auth.currentUser.email || null) : null;
}

// §২.৪ §২.২ — গুগল দিয়ে সাইন-ইন করুন(শুধু পুরনো সদস্যের জন্য)।
// Precondition(caller, §১০.৩): Google Sign-in(signInWithPopup) আগেই সফল
// হয়ে auth.currentUser এই ফাংশন কলের সময় সেই Google user।
//
// দুই ধাপে চেক(fastest-path আগে):
//   ১) users/{uid} আগে থেকেই থাকলে(returning claimed member) — সরাসরি
//      familyId/memberId পাওয়া যায়, কোনো নতুন write লাগে না।
//   ২) না থাকলে(প্রথমবার claim) — familyMemberEmails/{normalizedEmail}
//      lookup করে admin-added unclaimed member খুঁজে বের করা হয়, তারপর
//      সেই member doc-এ googleUid সেট + email field remove(একই write,
//      firestore.rules-এর নির্দিষ্ট claim-clause অনুযায়ী — email must
//      still match request.auth.token.email, তাই client-side এই চেক
//      করার দরকার নেই, Rules নিজেই server-verified email দিয়ে যাচাই
//      করবে) + users/{uid} mapping তৈরি(পরের বার fast-path কাজ করতে)।
//
// কোনো mapping/lookup না মিললে { matched: false } — caller(UI) তখন
// ২.৫ Screen C-এর "এই মেইল দিয়ে অদ্যাবধি সাইন ইন হয়নি..." বার্তা দেখাবে।
async function signInExistingMemberByGoogle() {
  if (!auth.currentUser) {
    return { matched: false, reason: "not-signed-in" };
  }
  const uid = auth.currentUser.uid;

  // ধাপ ১ — fast path(আগে থেকে claimed)।
  const existingMapping = await loadUserMapping(uid);
  if (existingMapping && existingMapping.familyId && existingMapping.memberId) {
    return {
      matched: true,
      familyId: existingMapping.familyId,
      memberId: existingMapping.memberId,
      firstClaim: false
    };
  }

  // ধাপ ২ — প্রথমবার claim(email-match)।
  const email = currentGoogleEmail();
  if (!email) {
    return { matched: false, reason: "no-email" };
  }
  const lookup = await lookupFamilyByEmail(email);
  if (!lookup || !lookup.familyId || !lookup.memberId) {
    return { matched: false, reason: "no-match" };
  }
  const memberRef = db.collection("families").doc(lookup.familyId)
    .collection("members").doc(lookup.memberId);
  try {
    // Rules(claim-clause) নিজেই নিশ্চিত করে যে request.auth.token.email
    // resource-এ সংরক্ষিত member.email-এর সাথে মেলে — client এখানে আলাদা
    // pre-check করছে না(server-verified token-ই একমাত্র সত্যতা)।
    await memberRef.update({
      googleUid: uid,
      email: firebase.firestore.FieldValue.delete(),
      updatedAt: Date.now()
    });
    await writeUserMapping(uid, lookup.familyId, lookup.memberId);
    return {
      matched: true,
      familyId: lookup.familyId,
      memberId: lookup.memberId,
      firstClaim: true
    };
  } catch (err) {
    console.error("[Google Sign-in] claim ব্যর্থ:", err.message);
    return { matched: false, reason: "claim-failed", error: err.message };
  }
}

// §২.৪ §১০.১/§৫.২ — Invite-Link token generation/rotate/revoke ও join।
// existing generateSecureCode()(appHelpers.js, FAMILY_CODE_CHARS ৩৩-char
// charset, ~৫.০৪ bit/char) reuse — নতুন generator লেখা হয়নি(§১০.১-এর
// নীতি অনুযায়ী)। দৈর্ঘ্য ২৬ বেছে নেওয়া হয়েছে যাতে ২৬×৫.০৪≈১৩১ bit(≥
// ন্যূনতম ১২৮-বিট এনট্রপি) এবং firestore.rules-এর token.size()>=22
// শর্তও(§১০.১) স্বয়ংক্রিয়ভাবে পূরণ হয়।
function generateInviteToken() {
  return generateSecureCode(26);
}

// Admin — নতুন/rotate(পুরনো থাকলেও overwrite, single-active-token মডেল)।
async function rotateInviteLink(familyId) {
  const token = generateInviteToken();
  await db.collection("families").doc(familyId).update({
    activeInviteToken: { token, createdAt: Date.now(), revoked: false },
    updatedAt: Date.now()
  });
  return token;
}

// Admin — revoke। caller বর্তমান activeInviteToken object পাঠাবে(token/
// createdAt অক্ষুণ্ণ রাখতে, শুধু revoked flip)।
async function revokeInviteLink(familyId, activeInviteToken) {
  await db.collection("families").doc(familyId).update({
    activeInviteToken: { ...activeInviteToken, revoked: true },
    updatedAt: Date.now()
  });
}

// §৫.২ — Invite-Link click করে join(non-admin self-serve)। Precondition:
// Google Sign-in আগেই সফল(caller, §১০.৩)। এখানে token-validity pre-check
// শুধু দ্রুত friendly error দেখানোর জন্য — চূড়ান্ত সত্যতা সবসময়
// firestore.rules-এর নিজস্ব server-side check থেকেই আসে(client bypass
// করলেও Rules reject করবে)।
async function joinFamilyViaInviteLink(familyId, token, name, gender) {
  if (!auth.currentUser) {
    return { aborted: true, reason: "google-signin-required" };
  }
  const uid = auth.currentUser.uid;
  const familyRef = db.collection("families").doc(familyId);
  let familySnap;
  try {
    familySnap = await familyRef.get();
  } catch (err) {
    return { aborted: true, reason: "error", error: err.message };
  }
  if (!familySnap.exists) {
    return { aborted: true, reason: "family-not-found" };
  }
  const fam = familySnap.data();
  const active = fam.activeInviteToken;
  if (!active || active.revoked || active.token !== token) {
    return { aborted: true, reason: "invalid-token" };
  }

  // পূর্ব-নিবন্ধিত email(rare edge-case, §৫.২) — নতুন member তৈরি না করে
  // বিদ্যমান(admin-added unclaimed) profile bind।
  const email = currentGoogleEmail();
  if (email) {
    const lookup = await lookupFamilyByEmail(email);
    if (lookup && lookup.familyId === familyId && lookup.memberId) {
      const memberRef = familyRef.collection("members").doc(lookup.memberId);
      try {
        await memberRef.update({
          googleUid: uid,
          email: firebase.firestore.FieldValue.delete(),
          updatedAt: Date.now()
        });
        await writeUserMapping(uid, familyId, lookup.memberId);
        return { success: true, familyId, memberId: lookup.memberId, bound: true };
      } catch (err) {
        console.error("[Invite-Link] pre-registered bind ব্যর্থ:", err.message);
        return { aborted: true, reason: "error", error: err.message };
      }
    }
  }

  // নতুন member — self-create(firestore.rules-এর invite-token clause,
  // role client পাঠাতে পারে শুধু "member", privilege-escalation guard)।
  const memberId = generateSecureCode(16);
  try {
    await familyRef.collection("members").doc(memberId).set({
      name: (name || "").trim(),
      gender: gender || null,
      googleUid: uid,
      role: "member",
      inviteTokenAttempt: token,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await writeUserMapping(uid, familyId, memberId);
    return { success: true, familyId, memberId, bound: false };
  } catch (err) {
    console.error("[Invite-Link] join ব্যর্থ:", err.message);
    return { aborted: true, reason: "error", error: err.message };
  }
}

// §৫.৩ — Family ত্যাগ(self-leave, claimed member)। firstAdminUid client-side
// pre-check(UX friendly-message) — চূড়ান্ত protection সবসময় firestore.rules-
// এর member-delete clause-এই enforced। মেম্বার doc delete + সংশ্লিষ্ট
// familyMemberEmails mapping(composite familyId+memberId reverse-query,
// ২.৪ §৩-এ নোট করা index প্রয়োজন) — একই batch-এ(atomic)।
async function leaveFamily(familyId, memberId) {
  if (!auth.currentUser) {
    return { aborted: true, reason: "not-signed-in" };
  }
  const uid = auth.currentUser.uid;
  const familyRef = db.collection("families").doc(familyId);
  let fam = null;
  try {
    const familySnap = await familyRef.get();
    fam = familySnap.exists ? familySnap.data() : null;
  } catch (err) {
    return { aborted: true, reason: "error", error: err.message };
  }
  if (fam && fam.firstAdminUid && fam.firstAdminUid === uid) {
    return { aborted: true, reason: "first-admin-must-transfer" };
  }
  try {
    // §Leave-Family fix(১৩ সেপ্টেম্বর ২০২৬, owner-reported "ব্যর্থ হয়েছে"):
    // আগে এখানে familyMemberEmails-এ .where(familyId).where(memberId) query
    // চালানো হতো — কিন্তু Rules-এ এই collection-এর "list" সম্পূর্ণ বন্ধ
    // (email-enumeration প্রতিরোধে, §১০.২ "allow list: if false") — তাই এই
    // query নিজেই সবসময় permission-denied দিত, batch.commit()-এ পৌঁছানোর
    // আগেই leaveFamily() পুরোপুরি ব্যর্থ হতো। Fix: query-এর বদলে নিজের
    // (claimed) Google account email দিয়ে normalizeEmail()-ভিত্তিক doc-id
    // সরাসরি "get"(Rules-এ অনুমোদিত, list শুধু বন্ধ get না) — তারপর
    // familyId/memberId মিলে কিনা cross-verify করে তবেই delete করা হয়(অন্য
    // family/member-এর mapping ভুলবশত মুছে ফেলা থেকে রক্ষা)। Invite-link
    // দিয়ে join করা সদস্যদের(কখনো email-mapping তৈরিই হয়নি) জন্য
    // mapSnap.exists false হবে, স্বাভাবিকভাবে skip — আগের behavior অক্ষুণ্ণ।
    let mappingRef = null;
    try {
      const myEmail = auth.currentUser.email;
      if (myEmail) {
        const emailKey = normalizeEmail(myEmail);
        const mapSnap = await db.collection("familyMemberEmails").doc(emailKey).get();
        if (mapSnap.exists && mapSnap.data().familyId === familyId && mapSnap.data().memberId === memberId) {
          mappingRef = mapSnap.ref;
        }
      }
    } catch {}
    const batch = db.batch();
    batch.delete(familyRef.collection("members").doc(memberId));
    if (mappingRef) {
      batch.delete(mappingRef);
    }
    // §fix(১১ সেপ্টেম্বর ২০২৬, ProfileDropdownGoogle wiring-এর সময় ধরা
    // পড়েছে): আগে users/{uid} mapping এখানে delete হতো না — leave-এর পর
    // এই একই device পরের বার Google sign-in করলে loadUserMapping()
    // fast-path(signInExistingMemberByGoogle()) পুরনো(এখন-deleted)
    // familyId/memberId-ই ফেরত দিত, dead-end/permission-denied তৈরি হতো।
    // এটা নিজের(request.auth.uid==uid) doc, Rules ইতিমধ্যে self-delete
    // অনুমোদিত — কোনো Rules change লাগেনি।
    batch.delete(db.collection("users").doc(uid));
    await batch.commit();
    return { success: true };
  } catch (err) {
    console.error("[Leave Family] ব্যর্থ:", err.message);
    return { aborted: true, reason: "error", error: err.message };
  }
}

// §৯.৪ "প্রোফাইল এডিট" — claimed member নিজে নাম/জেন্ডার বদলাতে পারবেন
// (firestore.rules: isClaimedByGoogle + affectedKeys hasOnly ['name',
// 'gender','updatedAt'])।
async function editOwnProfile(familyId, memberId, name, gender) {
  if (!auth.currentUser) {
    return { aborted: true, reason: "not-signed-in" };
  }
  try {
    await db.collection("families").doc(familyId).collection("members").doc(memberId).update({
      name: (name || "").trim(),
      gender: gender || null,
      updatedAt: Date.now()
    });
    return { success: true };
  } catch (err) {
    console.error("[Profile Edit] ব্যর্থ:", err.message);
    return { aborted: true, reason: "error", error: err.message };
  }
}

// §১০.৩ Single-Popup Pattern — shared helper। এই ফাংশন UI button-এর
// onClick-এর সবচেয়ে প্রথম synchronous statement হিসেবে সরাসরি কল হবে
// (কোনো await/.then()-এর ভিতর থেকে না) — existing GoogleAccountModal.jsx-
// এর googleProvider(app.js) প্যাটার্নের সাথে সামঞ্জস্যপূর্ণ, এখানে আলাদা
// module-level instance(কোনো extra config লাগে না, একই default provider)।
const googleSignInProvider = new firebase.auth.GoogleAuthProvider();
function triggerGoogleSignInPopup() {
  return auth.signInWithPopup(googleSignInProvider);
}

export {
  normalizeEmail,
  writeUserMapping,
  loadUserMapping,
  familyMemberEmailRef,
  lookupFamilyByEmail,
  addProxyMemberByAdmin,
  deleteFamilyMemberEmail,
  currentGoogleUid,
  currentGoogleEmail,
  signInExistingMemberByGoogle,
  generateInviteToken,
  rotateInviteLink,
  revokeInviteLink,
  joinFamilyViaInviteLink,
  leaveFamily,
  editOwnProfile,
  triggerGoogleSignInPopup
};

