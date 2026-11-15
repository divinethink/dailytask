// readerMarks.js — রিডিং-মোডের হাইলাইট/আন্ডারলাইন (data-layer)। প্রতি সদস্যের নিজস্ব,
// Google UID-ভিত্তিক: users/{uid}/readerMarks/{key} → { v:1, marks:[…], updatedAt:number }।
// UID একই থাকে বলে নতুন ফোনে Google-লগইনে সব ফিরে আসে। Rules: শুধু নিজের uid।
import { authModular as auth, dbModular as db } from "./firebaseConfig.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sanitizeMarks, readerKey } from "./readerCore.js";

export function getReaderUid() {
  const u = auth.currentUser;
  return u && u.uid ? u.uid : null;
}

function markRef(uid, key) {
  return doc(db, "users", uid, "readerMarks", readerKey(key));
}

// ব্যর্থ হলে throw (UI বার্তা দেখায়); doc না থাকলে খালি তালিকা।
export async function getMarks(uid, key) {
  const snap = await getDoc(markRef(uid, key));
  return snap.exists() ? sanitizeMarks(snap.data().marks) : [];
}

export async function saveMarks(uid, key, marks) {
  await setDoc(markRef(uid, key), { v: 1, marks: sanitizeMarks(marks), updatedAt: Date.now() });
}
