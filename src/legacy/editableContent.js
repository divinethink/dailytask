// editableContent.js — "আমল"/"সহায়িকা"-র App-Creator-editable static text/guide
// কনটেন্ট(3_6_Editable_Content_Plan.md)। CRUD(get/set section-doc, Firestore) +
// accordion-item-id helper। single-owner(App-Creator-only, Rules-এ enforced),
// top-level `publicToolsContent/{sectionId}` collection — family-Firestore/
// V1-V2 structure থেকে সম্পূর্ণ independent(ব্লগ/কুইজের quizData.js pattern reuse)।
import { authModular as auth, dbModular as db } from "./firebaseConfig.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

function sectionRef(sectionId) {
  return doc(db, "publicToolsContent", sectionId);
}

// §২ Fallback নীতি — doc না থাকলে বা read error হলে null(কখনো throw না)।
// Format-specific presence/shape-check caller(EditableSection.jsx)-এর দায়িত্ব,
// কারণ একই doc-এ একাধিক format-field(richtext+table) একসাথে থাকতে পারে(§২) —
// এই ফাংশন শুধু raw doc data ফেরত দেয়, কোনো একক "format" ফিল্ডকে authority ধরে না।
async function fetchSection(sectionId) {
  try {
    const snap = await getDoc(sectionRef(sectionId));
    // modular v9-এ exists boolean-property না, method(snap.exists()) —
    // compat→modular-এর সবচেয়ে সাধারণ breaking-difference, এখানে সংশোধিত।
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
}

function requireCreator() {
  const user = auth.currentUser;
  if (!user) throw new Error("সাইন-ইন প্রয়োজন");
  return user;
}

// merge:true — কারণ একই sectionId-তে একাধিক format coexist করতে পারে(§২),
// একটা format সেভ করলে অন্য format-field মুছে যাবে না।
async function saveRichtext(sectionId, body) {
  const user = requireCreator();
  await setDoc(
    sectionRef(sectionId),
    {
      format: "richtext",
      richtext: { body: (body || "").trim() },
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
  );
}

async function saveAccordion(sectionId, items) {
  const user = requireCreator();
  await setDoc(
    sectionRef(sectionId),
    {
      format: "accordion",
      accordion: { items: Array.isArray(items) ? items : [] },
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
  );
}

async function saveTable(sectionId, columns, rows) {
  const user = requireCreator();
  await setDoc(
    sectionRef(sectionId),
    {
      format: "table",
      table: {
        columns: Array.isArray(columns) ? columns : [],
        rows: Array.isArray(rows) ? rows : [],
      },
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
  );
}

// হোম-কার্ডের ক্রিয়েটর-সম্পাদিত বাড়তি বাক্য(যেমন "আগামীকাল" কার্ড) — নিজস্ব doc, তাই অন্য কনটেন্টে প্রভাব নেই।
// data = { items:[...], sleepText, overrides:{ b_<id>: {hidden}|{icon,title,text,src} } } — গঠন-যাচাই tomorrowExtras.js-এ; Rules-এ শুধু App Creator লিখতে পারে।
async function saveHomeCardExtras(sectionId, data) {
  const user = requireCreator();
  await setDoc(
    sectionRef(sectionId),
    {
      format: "homeCardExtras",
      homeCardExtras: {
        items: Array.isArray(data && data.items) ? data.items : [],
        sleepText: (data && typeof data.sleepText === "string" ? data.sleepText : "").trim(),
        overrides: data && data.overrides && typeof data.overrides === "object" ? data.overrides : {},
      },
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    // homeCardExtras সম্পূর্ণ প্রতিস্থাপিত(overrides map থেকে "মূল লেখায় ফেরান"-এ মোছা কী যাতে থেকে না যায়)
    { mergeFields: ["format", "homeCardExtras", "updatedAt", "updatedBy"] }
  );
}

// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ডের সময়ভাগ-তালিকা(নিজস্ব doc; গঠন-যাচাই components/nabijiTimeline.js-এ; Rules-এ শুধু App Creator লিখতে পারে)।
// slots সম্পূর্ণ প্রতিস্থাপিত(মোছা slot যাতে থেকে না যায়); [] = "মূল তালিকায় ফেরান"(কার্ড কোডের ডিফল্টে ফেরে)।
async function saveNabijiTimeline(sectionId, slots) {
  const user = requireCreator();
  await setDoc(
    sectionRef(sectionId),
    {
      format: "nabijiTimeline",
      nabijiTimeline: { slots: Array.isArray(slots) ? slots : [] },
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { mergeFields: ["format", "nabijiTimeline", "updatedAt", "updatedBy"] }
  );
}

// পপআপ-বার্তা ওভাররাইড(App Creator-only, Rules-এ enforced)। mergeFields: popupMessages map সম্পূর্ণ
// প্রতিস্থাপিত হয়(সাধারণ merge:true-তে মুছে ফেলা আইটেম পুরনো মান নিয়ে থেকে যেত)।
async function savePopupMessages(sectionId, data) {
  const user = requireCreator();
  await setDoc(
    sectionRef(sectionId),
    {
      format: "popupMessages",
      popupMessages: data && typeof data === "object" ? data : {},
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { mergeFields: ["format", "popupMessages", "updatedAt", "updatedBy"] }
  );
}

// §৪.২ — App Creator-এর UI-তে auto-generate(client-side), ম্যানুয়ালি টাইপ না।
function makeAccordionItemId() {
  return "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

export {
  fetchSection,
  saveRichtext,
  saveAccordion,
  saveTable,
  saveHomeCardExtras,
  saveNabijiTimeline,
  savePopupMessages,
  makeAccordionItemId,
};
