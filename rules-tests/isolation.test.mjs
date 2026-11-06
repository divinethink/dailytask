// Firestore Rules: cross-family isolation। চালান: npm run test:rules
// (firebase emulators:exec এর ভিতরে চলে — Java লাগে; CI-তে অটো চলে)
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-dailytask",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const fam = (id, code, admin) => ({
      familyId: id, familyCode: code, isCustomCode: false, createdAt: 1,
      createdByUid: admin, schemaVersion: 2, adminUids: [admin],
      dataCollectionName: "data_" + code, migrationState: "v2",
    });
    await setDoc(doc(db, "families/famA"), fam("famA", "FAMILYA1", "uidA"));
    await setDoc(doc(db, "families/famB"), fam("famB", "FAMILYB1", "uidB"));
    await setDoc(doc(db, "legacyCollectionMap/data_FAMILYA1"), { familyId: "famA", createdAt: 1 });
    await setDoc(doc(db, "legacyCollectionMap/data_FAMILYB1"), { familyId: "famB", createdAt: 1 });
    await setDoc(doc(db, "families/famA/members/m1"), { name: "A-member" });
    await setDoc(doc(db, "families/famB/members/m2"), { name: "B-member" });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();

test("নিজের পরিবারের admin নিজের members list করতে পারে", async () => {
  await assertSucceeds(getDocs(collection(as("uidA"), "families/famA/members")));
});

test("অন্য পরিবারের members list করা যায় না", async () => {
  await assertFails(getDocs(collection(as("uidA"), "families/famB/members")));
});

test("অন্য পরিবারে member তৈরি করা যায় না", async () => {
  await assertFails(setDoc(doc(as("uidA"), "families/famB/members/new1"), { name: "x" }));
});

test("অন্য পরিবারের adminUids বদলে নিজেকে admin করা যায় না", async () => {
  await assertFails(updateDoc(doc(as("uidA"), "families/famB"), { adminUids: ["uidA"] }));
});

test("লগইন ছাড়া (unauthenticated) members list করা যায় না", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, "families/famA/members")));
  await assertFails(getDoc(doc(db, "families/famA")));
});

// --- legacy data_<code> (মাসিক সভা ইত্যাদি) ---
const mtg = { value: "{}", updatedAt: 1 };

test("নিজের পরিবারের admin মাসিক সভা সেভ ও পড়তে পারে", async () => {
  const db = as("uidA");
  await assertSucceeds(setDoc(doc(db, "data_FAMILYA1/meeting_rows_v2:2026-11"), mtg));
  await assertSucceeds(getDoc(doc(db, "data_FAMILYA1/meeting_rows_v2:2026-11")));
});

test("অন্য পরিবারের সভা পড়া/লেখা যায় না", async () => {
  await assertFails(setDoc(doc(as("uidA"), "data_FAMILYB1/meeting_rows_v2:2026-11"), mtg));
  await assertFails(getDoc(doc(as("uidA"), "data_FAMILYB1/meeting_rows_v2:2026-11")));
});

test("অচেনা ডক-id বা বাড়তি ফিল্ডে লেখা যায় না", async () => {
  const db = as("uidA");
  await assertFails(setDoc(doc(db, "data_FAMILYA1/random_doc"), mtg));
  await assertFails(setDoc(doc(db, "data_FAMILYA1/custom_fields"), { value: "[]", updatedAt: 1, extra: 1 }));
});

test("map-বিহীন বা data_ নয় এমন কালেকশনে অ্যাক্সেস নেই; লগইন ছাড়া নয়", async () => {
  await assertFails(setDoc(doc(as("uidA"), "data_NOMAP/custom_fields"), mtg));
  await assertFails(setDoc(doc(as("uidA"), "other_col/custom_fields"), mtg));
  const un = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(un, "data_FAMILYA1/meeting_rows_v2:2026-11")));
});
