// reviewData.js — সাপ্তাহিক মুহাসাবার data-layer (families/<id>/reviews/<memberId>_<weekKey>)।
// শুধু v2 (families subcollection)। read/write অনুমতি firestore.rules-এ (owner-only)।
// Conflict নীতি: last-write-wins (doc id নির্দিষ্ট ⇒ retry/double-tap-এ duplicate হয় না)।
import { dbModular as db, authModular as auth } from "./firebaseConfig.js";
import { collection, doc, getDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { getFamilyId } from "./familyIdentity.js";
import { stampLastActive } from "./memberData.js";
import { reviewDocId, validateReview } from "./reviewSchema.js";

function reviewsRef() {
  return collection(doc(db, "families", getFamilyId()), "reviews");
}

function requireV2(migrationState) {
  if (migrationState !== "v2") throw new Error("reviews_need_v2");
}

// নেই বা পড়া/validation ব্যর্থ ⇒ null (UI খালি ফর্ম দেখাবে)। permission-error লুকানো হয় না: throw।
async function loadReview(migrationState, memberId, weekKey) {
  requireV2(migrationState);
  const snap = await getDoc(doc(reviewsRef(), reviewDocId(memberId, weekKey)));
  if (!snap.exists()) return null;
  const r = validateReview(snap.data());
  return r.ok ? r.value : null;
}

// একাধিক সপ্তাহ (মাসিক রিপোর্ট)। list query নয়, id ধরে আলাদা get — rules list বন্ধ রাখে।
async function loadReviewsForWeeks(migrationState, memberId, weekKeys) {
  const rows = await Promise.all(weekKeys.map(k => loadReview(migrationState, memberId, k).catch(() => null)));
  return rows.filter(Boolean);
}

async function saveReview(migrationState, memberId, weekKey, data) {
  requireV2(migrationState);
  const r = validateReview({ ...data, memberId, weekKey, updatedAt: Date.now() });
  if (!r.ok) throw new Error("review_invalid:" + r.error);
  const familyId = getFamilyId();
  const batch = writeBatch(db);
  batch.set(doc(reviewsRef(), reviewDocId(memberId, weekKey)), r.value);
  stampLastActive(batch, doc(db, "families", familyId, "members", memberId), familyId, auth.currentUser ? auth.currentUser.uid : null);
  await batch.commit();
}

async function deleteReview(migrationState, memberId, weekKey) {
  requireV2(migrationState);
  await deleteDoc(doc(reviewsRef(), reviewDocId(memberId, weekKey)));
}

export { loadReview, loadReviewsForWeeks, saveReview, deleteReview };
