// appDesign.js — গ্লোবাল অ্যাপ ডিজাইন(ক্রিয়েটরের সাজানো, সবার জন্য এক)। পড়া: যে-কেউ(read fail → null);
// লেখা: শুধু App Creator(Rules-এ enforced)। শুধু যে অংশ বদলেছে সেটাই লেখা হয়(mergeFields), অন্য অংশ অক্ষুণ্ণ।
import { authModular as auth, dbModular as db } from "./firebaseConfig.js";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { fetchSection } from "./editableContent.js";
import { DESIGN_SECTION_ID, sanitizeDesign, isDesignKey } from "./appDesignCore.js";

export async function fetchDesign() {
  return sanitizeDesign(await fetchSection(DESIGN_SECTION_ID));
}

export async function saveDesignPart(key, value) {
  if (!isDesignKey(key)) throw new Error("অচেনা অংশ");
  const user = auth.currentUser;
  if (!user) throw new Error("সাইন-ইন প্রয়োজন");
  await setDoc(
    doc(db, "publicToolsContent", DESIGN_SECTION_ID),
    { format: "appDesign", [key]: value, updatedAt: serverTimestamp(), updatedBy: user.uid },
    { mergeFields: ["format", key, "updatedAt", "updatedBy"] }
  );
}
