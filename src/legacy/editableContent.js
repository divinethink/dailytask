// editableContent.js — "আমল"/"সহায়িকা"-র App-Creator-editable static text/guide
// কনটেন্ট(3_6_Editable_Content_Plan.md)। CRUD(get/set section-doc, Firestore) +
// accordion-item-id helper। single-owner(App-Creator-only, Rules-এ enforced),
// top-level `publicToolsContent/{sectionId}` collection — family-Firestore/
// V1-V2 structure থেকে সম্পূর্ণ independent(ব্লগ/কুইজের quizData.js pattern reuse)।
import { db, auth } from "./firebaseConfig.js";

function sectionRef(sectionId) {
  return db.collection("publicToolsContent").doc(sectionId);
}

// §২ Fallback নীতি — doc না থাকলে বা read error হলে null(কখনো throw না)।
// Format-specific presence/shape-check caller(EditableSection.jsx)-এর দায়িত্ব,
// কারণ একই doc-এ একাধিক format-field(richtext+table) একসাথে থাকতে পারে(§২) —
// এই ফাংশন শুধু raw doc data ফেরত দেয়, কোনো একক "format" ফিল্ডকে authority ধরে না।
async function fetchSection(sectionId) {
  try {
    const snap = await sectionRef(sectionId).get();
    return snap.exists ? snap.data() : null;
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
  await sectionRef(sectionId).set(
    {
      format: "richtext",
      richtext: { body: (body || "").trim() },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
  );
}

async function saveAccordion(sectionId, items) {
  const user = requireCreator();
  await sectionRef(sectionId).set(
    {
      format: "accordion",
      accordion: { items: Array.isArray(items) ? items : [] },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
  );
}

async function saveTable(sectionId, columns, rows) {
  const user = requireCreator();
  await sectionRef(sectionId).set(
    {
      format: "table",
      table: {
        columns: Array.isArray(columns) ? columns : [],
        rows: Array.isArray(rows) ? rows : [],
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true }
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
  makeAccordionItemId,
};
