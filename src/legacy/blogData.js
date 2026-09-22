// blogData.js — "ডিভাইন ব্লগ"(Public Tools, Phase E) — CRUD(post list/create/
// update/delete + writer add/remove, Firestore) + category-তালিকা constant।
// 3_4_Blog_Feature_Plan.md §২/§৩/§৫-এর সাথে সামঞ্জস্যপূর্ণ — top-level
// `blogPosts`/`blogWriters` collection, family-Firestore থেকে সম্পূর্ণ independent।
import { dbModular as db, authModular as auth } from "./firebaseConfig.js";
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
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
  return collection(db, "blogPosts");
}
function writersRef() {
  return collection(db, "blogWriters");
}

// --- Writer allowlist(§২.২) ---
async function getWriters() {
  const snap = await getDocs(writersRef());
  return snap.docs.map((d) => ({ email: d.id, ...d.data() }));
}

async function isCurrentUserWriter() {
  const user = auth.currentUser;
  if (!user || !user.email) return false;
  const emailKey = normalizeEmail(user.email);
  const docSnap = await getDoc(doc(writersRef(), emailKey));
  return docSnap.exists();
}

const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function addWriter(email) {
  const emailKey = normalizeEmail(email);
  if (!emailKey) throw new Error("email প্রয়োজন");
  if (!EMAIL_FORMAT_PATTERN.test(emailKey)) throw new Error("সঠিক ইমেইল ফরম্যাট দিন(যেমন name@example.com)");
  await setDoc(doc(writersRef(), emailKey), {
    addedAt: serverTimestamp(),
    addedBy: auth.currentUser ? auth.currentUser.uid : null,
  });
}

async function removeWriter(email) {
  const emailKey = normalizeEmail(email);
  await deleteDoc(doc(writersRef(), emailKey));
}

// --- Posts(§২.১) ---
// একবার fetch(§৮-এর "session-এ একবার fetch"-এর মতোই ephemeral pattern reuse,
// কুইজের সাথে সাযুজ্যপূর্ণ) — onSnapshot না, কারণ ব্লগ real-time collaboration
// টুল না, প্রতিবার sub-screen খোলার সময় fresh read-ই যথেষ্ট।
async function fetchPosts() {
  const snap = await getDocs(query(postsRef(), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function createPost({ category, title, body, tags, sourceNote }) {
  const user = auth.currentUser;
  if (!user) throw new Error("সাইন-ইন প্রয়োজন");
  const now = serverTimestamp();
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
  const ref = await addDoc(postsRef(), payload);
  return ref.id;
}

async function updatePost(postId, { category, title, body, tags, sourceNote }) {
  await updateDoc(doc(postsRef(), postId), {
    category,
    title: (title || "").trim(),
    body: body || "",
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    sourceNote: sourceNote ? sourceNote.trim() : null,
    updatedAt: serverTimestamp(),
  });
}

async function deletePost(postId) {
  await deleteDoc(doc(postsRef(), postId));
}

// --- ডিফল্ট পোস্ট ইম্পোর্ট(App Creator-only, লেখক-তালিকাভুক্ত হতে হবে — Rules-এ create-এ
// isBlogWriter() লাগে) ---
// Idempotent: স্থির doc-id(seed_blog_NN) — আগে থেকে থাকা(এডিট-করা সহ) পোস্ট skip হয়,
// overwrite হয় না। seed ফাইল dynamic import — main bundle-এ যায় না।
async function importSeedPosts() {
  const user = auth.currentUser;
  if (!user) throw new Error("সাইন-ইন প্রয়োজন");
  if (!isCreatorAuth()) throw new Error("শুধু App Creator");
  if (!(await isCurrentUserWriter())) {
    throw new Error("NOT_WRITER");
  }
  const { BLOG_SEED_POSTS } = await import("./blogSeedData.js");
  const existing = new Set((await fetchPosts()).map((p) => p.id));
  const now = serverTimestamp();
  let added = 0;
  for (let i = 0; i < BLOG_SEED_POSTS.length; i++) {
    const id = "seed_blog_" + String(i + 1).padStart(2, "0");
    if (existing.has(id)) continue;
    const p = BLOG_SEED_POSTS[i];
    await setDoc(doc(postsRef(), id), {
      category: p.category,
      title: p.title,
      body: p.body,
      tags: p.tags || [],
      sourceNote: p.sourceNote || null,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now,
    });
    added += 1;
  }
  return { added, skipped: BLOG_SEED_POSTS.length - added };
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
  importSeedPosts,
  canEditPost,
};
