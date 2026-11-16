// quranCloud.js — বুকমার্ক/পছন্দের আয়াত/শেষ পাঠের ক্লাউড-কপি (data-layer)।
// users/{uid}/quran/state → { v:1, marks:[…], last:[…], updatedAt:number }। শুধু নিজের uid (Rules)।
// Firebase দেরিতে (dynamic import) লোড হয়: কুরআন না খুললে কিছু আসে না; লগইন/নেট না থাকলে throw → UI লোকালে চলে।
import { sanitizeCloudState } from "./quranCore.js";

async function fb() {
  const [cfg, fs] = await Promise.all([import("./firebaseConfig.js"), import("firebase/firestore")]);
  return { auth: cfg.authModular, db: cfg.dbModular, fs };
}

export async function getQuranUid() {
  try {
    const { auth } = await fb();
    const u = auth && auth.currentUser;
    return u && u.uid ? u.uid : null;
  } catch (e) {
    return null;
  }
}

// ডক না থাকলে null; ব্যর্থ হলে throw।
export async function loadQuranState(uid, surahs) {
  const { db, fs } = await fb();
  const snap = await fs.getDoc(fs.doc(db, "users", uid, "quran", "state"));
  return snap.exists() ? sanitizeCloudState(snap.data(), surahs) : null;
}

export async function saveQuranState(uid, state, surahs) {
  const { db, fs } = await fb();
  const clean = sanitizeCloudState(state, surahs);
  await fs.setDoc(fs.doc(db, "users", uid, "quran", "state"), { v: 1, marks: clean.marks, last: clean.last, updatedAt: Date.now() });
}
