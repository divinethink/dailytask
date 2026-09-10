// googleIdentity.js — 2_4 Identity Simplification: Google-only helper module.
// সম্পূর্ণ নতুন, additive ফাইল — কোনো existing file/flow এখনো এই ফাইল import
// করে না, তাই বর্তমান app আচরণে কোনো পরিবর্তন নেই। Wiring হবে পরের
// sub-phase-গুলোতে(Sign Up §২.১, Google Sign-in §২.২, Invite-Link §৫.২,
// Profile Dropdown §৯.৪) — এখানে শুধু ভিত্তি(schema/helper) তৈরি হলো।
// Firestore Rules(firestore.rules) ইতিমধ্যে এই schema সাপোর্ট করে — এই
// module সেই একই shape/convention অনুসরণ করে(§৩ Data Schema, §১০.২ Email
// Normalization)।
import { db, auth } from "./firebaseConfig.js";

// §১০.২ — চূড়ান্ত সংজ্ঞা: শুধু trim+lowercase, dot/plus-stripping না
// (provider-specific জটিলতা এড়াতে owner-approved সিদ্ধান্ত)।
function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

// users/{googleUid} → { familyId, memberId }(§৩ schema)। Rules-এ শুধু
// নিজের uid নিজে read/write করতে পারে — তাই caller সবসময় নিজের
// auth.currentUser.uid-ই পাঠাবে(অন্য uid দিয়ে call করলে permission-denied)।
async function writeUserMapping(googleUid, familyId, memberId) {
  await db.collection("users").doc(googleUid).set({ familyId, memberId });
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

export {
  normalizeEmail,
  writeUserMapping,
  loadUserMapping,
  familyMemberEmailRef,
  lookupFamilyByEmail,
  deleteFamilyMemberEmail,
  currentGoogleUid,
  currentGoogleEmail
};
