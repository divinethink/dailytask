// quizData.js — "ইসলামি কুইজ"(Public Tools, Phase F) — CRUD(question list/
// create/update/delete, Firestore) + category-তালিকা constant + client-side
// shuffle utility + personal-best(localStorage)। 3_5_Quiz_Feature_Plan.md
// §২/§৩/§৫-এর সাথে সামঞ্জস্যপূর্ণ — top-level `quizQuestions` collection,
// single-owner(App-Creator-only), ব্লগের চেয়ে সরল(কোনো writer-allowlist না)।
import { db, auth } from "./firebaseConfig.js";

// §১.১(সংশোধিত, ১৮ সেপ্টেম্বর ২০২৬, owner-approved) — কুইজের category-list এখন
// ব্লগের ১৮-ক্যাটাগরি তালিকা থেকে ইচ্ছাকৃতভাবে বিচ্ছিন্ন, কুইজ-নির্দিষ্ট সরলীকৃত
// ৫-বিষয়(3_5_Quiz_Feature_Plan.md §১.১-এর সাথে সামঞ্জস্যপূর্ণ)।
const QUIZ_CATEGORIES = [
  "কুরআন",
  "সিরাত",
  "ইতিহাস",
  "জীবন-বিধান",
  "পরকাল",
];

// UI-level virtual অপশন(§১.১) — প্রশ্নের নিজস্ব field না, category-filter ছাড়া
// পুরো bank থেকে pool করতে ব্যবহৃত হয়(fetchAllQuestions())।
const ALL_TOPICS = "★ সকল বিষয়(মিক্স কুইজ)";

// §৬ Non-Goals — fixed default, v1-এ configurable না।
const QUESTIONS_PER_SESSION = 10;

// §৩ Data Storage Strategy — personal-best per-device, একটাই localStorage key,
// ভিতরে topic(category বা ALL_TOPICS)-কী দিয়ে JSON object।
const BEST_SCORE_KEY = "dt_pt_quiz_bestscore";

function questionsRef() {
  return db.collection("quizQuestions");
}

// --- Questions(§২.১) ---
async function fetchAllQuestions() {
  const snap = await questionsRef().get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchQuestionsByCategory(category) {
  const snap = await questionsRef().where("category", "==", category).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function createQuestion({ category, question, options, correctIndex, explanation }) {
  const user = auth.currentUser;
  if (!user) throw new Error("সাইন-ইন প্রয়োজন");
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const payload = {
    category,
    question: (question || "").trim(),
    options: Array.isArray(options) ? options.map((o) => (o || "").trim()) : [],
    correctIndex: Number(correctIndex),
    explanation: explanation ? explanation.trim() : null,
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await questionsRef().add(payload);
  return ref.id;
}

async function updateQuestion(questionId, { category, question, options, correctIndex, explanation }) {
  await questionsRef().doc(questionId).update({
    category,
    question: (question || "").trim(),
    options: Array.isArray(options) ? options.map((o) => (o || "").trim()) : [],
    correctIndex: Number(correctIndex),
    explanation: explanation ? explanation.trim() : null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteQuestion(questionId) {
  await questionsRef().doc(questionId).delete();
}

// --- ডিফল্ট প্রশ্ন-ব্যাংক ইম্পোর্ট(App Creator-only, Rules-এ create শুধু creator-এর) ---
// Idempotent: স্থির doc-id(seed_<বিষয়>_<নং>) — আগে থেকে থাকা(এডিট-করা সহ) প্রশ্ন skip
// হয়, overwrite হয় না। seed ফাইল dynamic import — main bundle-এ যায় না।
async function importSeedQuestions() {
  const user = auth.currentUser;
  if (!user) throw new Error("সাইন-ইন প্রয়োজন");
  const { buildSeedQuestions } = await import("./quizSeedData.js");
  const seed = buildSeedQuestions();
  const existing = new Set((await fetchAllQuestions()).map((q) => q.id));
  const missing = seed.filter((q) => !existing.has(q.id));
  const now = firebase.firestore.FieldValue.serverTimestamp();
  for (let i = 0; i < missing.length; i += 400) {
    const batch = db.batch();
    missing.slice(i, i + 400).forEach((q) => {
      batch.set(questionsRef().doc(q.id), {
        category: q.category,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
      });
    });
    await batch.commit();
  }
  return { added: missing.length, skipped: seed.length - missing.length };
}

// --- Random selection(§১, Fisher-Yates) ---
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function pickSessionQuestions(pool, count = QUESTIONS_PER_SESSION) {
  return shuffleArray(pool).slice(0, count);
}

// --- Personal-best(per-device, localStorage, §৬ — কোনো leaderboard/global-sync না) ---
function getBestScore(topicKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(BEST_SCORE_KEY) || "{}");
    return typeof raw[topicKey] === "number" ? raw[topicKey] : null;
  } catch (e) {
    return null;
  }
}

function setBestScoreIfHigher(topicKey, score) {
  try {
    const raw = JSON.parse(localStorage.getItem(BEST_SCORE_KEY) || "{}");
    if (typeof raw[topicKey] !== "number" || score > raw[topicKey]) {
      raw[topicKey] = score;
      localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(raw));
    }
  } catch (e) {
    // localStorage best-effort — কখনো throw না, quiz-flow ব্লক করবে না।
  }
}

export {
  QUIZ_CATEGORIES,
  ALL_TOPICS,
  QUESTIONS_PER_SESSION,
  fetchAllQuestions,
  fetchQuestionsByCategory,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importSeedQuestions,
  shuffleArray,
  pickSessionQuestions,
  getBestScore,
  setBestScoreIfHigher,
};
