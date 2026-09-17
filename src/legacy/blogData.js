// blogData.js — "ডিভাইন ব্লগ"(Public Tools, Phase E) — CRUD(post list/create/
// update/delete + writer add/remove, Firestore) + category-তালিকা constant।
// 3_4_Blog_Feature_Plan.md §২/§৩/§৫-এর সাথে সামঞ্জস্যপূর্ণ — top-level
// `blogPosts`/`blogWriters` collection, family-Firestore থেকে সম্পূর্ণ independent।
import { db, auth } from "./firebaseConfig.js";
import { normalizeEmail } from "./googleIdentity.js";
import { isCreatorAuth } from "./familyIdentity.js";

// §১.১ — owner-চূড়ান্ত, ১৮টা(১৬ সেপ্টেম্বর ২০২৬ সংস্করণ)
const BLOG_CATEGORIES = [
  "আকীদা",
  "কুরআন",
  "হাদিস",
  "ইবাদত, আমল ও শরয়ি নির্দেশনা",
  "হালাল-হারাম",
  "আখলাক ও তাযকিয়াহ",
  "সীরাত(নবীজি ﷺ-এর জীবনী)",
  "ইসলামী ইতিহাস",
  "পরকাল",
  "পরিবার, সমাজ ও সন্তান প্রতিপালন",
  "ইসলামী অর্থনীতি",
  "সমসাময়িক প্রসঙ্গ",
  "প্রচলিত ভুল",
  "তুলনামূলক ধর্মতত্ত্ব ও নাস্তিকতা",
  "ইসলামী দর্শন ও চিন্তাধারা",
  "ইসলামী সাহিত্য",
  "বিশেষ দিবস/উপলক্ষ",
  "অন্যান্য",
];

const MORE_MARKER = "[MORE]";

// §২.১ Read-More — marker থাকলে marker-এর আগের অংশ preview, না থাকলে পুরো
// body-ই preview(fallback, শিরোনামে ক্লিক করলে পুরোটা দেখায়)।
function splitByMoreMarker(body) {
  const text = body || "";
  const idx = text.indexOf(MORE_MARKER);
  if (idx === -1) {
    return { preview: text, rest: "", hasMore: false };
  }
  return {
    preview: text.slice(0, idx).trim(),
    rest: text.slice(idx + MORE_MARKER.length).trim(),
    hasMore: true,
  };
}

function postsRef() {
  return db.collection("blogPosts");
}
function writersRef() {
  return db.collection("blogWriters");
}

// --- Writer allowlist(§২.২) ---
async function getWriters() {
  const snap = await writersRef().get();
  return snap.docs.map((d) => ({ email: d.id, ...d.data() }));
}

async function isCurrentUserWriter() {
  const user = auth.currentUser;
  if (!user || !user.email) return false;
  const emailKey = normalizeEmail(user.email);
  const doc = await writersRef().doc(emailKey).get();
  return doc.exists;
}

async function addWriter(email) {
  const emailKey = normalizeEmail(email);
  if (!emailKey) throw new Error("email প্রয়োজন");
  await writersRef().doc(emailKey).set({
    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
    addedBy: auth.currentUser ? auth.currentUser.uid : null,
  });
}

async function removeWriter(email) {
  const emailKey = normalizeEmail(email);
  await writersRef().doc(emailKey).delete();
}

// --- Posts(§২.১) ---
// একবার fetch(§৮-এর "session-এ একবার fetch"-এর মতোই ephemeral pattern reuse,
// কুইজের সাথে সাযুজ্যপূর্ণ) — onSnapshot না, কারণ ব্লগ real-time collaboration
// টুল না, প্রতিবার sub-screen খোলার সময় fresh read-ই যথেষ্ট।
async function fetchPosts() {
  const snap = await postsRef().orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function createPost({ category, title, body, tags, sourceNote }) {
  const user = auth.currentUser;
  if (!user) throw new Error("সাইন-ইন প্রয়োজন");
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const payload = {
    category,
    title: (title || "").trim(),
    body: body || "",
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    sourceNote: sourceNote ? sourceNote.trim() : null,
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await postsRef().add(payload);
  return ref.id;
}

async function updatePost(postId, { category, title, body, tags, sourceNote }) {
  await postsRef().doc(postId).update({
    category,
    title: (title || "").trim(),
    body: body || "",
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    sourceNote: sourceNote ? sourceNote.trim() : null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function deletePost(postId) {
  await postsRef().doc(postId).delete();
}

function canEditPost(post) {
  const user = auth.currentUser;
  if (!user || !post) return false;
  return post.createdBy === user.uid || isCreatorAuth();
}

export {
  BLOG_CATEGORIES,
  splitByMoreMarker,
  getWriters,
  isCurrentUserWriter,
  addWriter,
  removeWriter,
  fetchPosts,
  createPost,
  updatePost,
  deletePost,
  canEditPost,
};
