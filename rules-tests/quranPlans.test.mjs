// Firestore Rules: member-ডকের quranPlans (খতম/হিফজ প্ল্যান)। চালান: npm run test:rules
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-dailytask", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const fam = (id, code, admin) => ({ familyId: id, familyCode: code, isCustomCode: false, createdAt: 1, createdByUid: admin, schemaVersion: 2, adminUids: [admin], dataCollectionName: "data_" + code, migrationState: "v2" });
    await setDoc(doc(db, "families/famA"), fam("famA", "FAMILYA1", "uidA"));
    await setDoc(doc(db, "families/famB"), fam("famB", "FAMILYB1", "uidB"));
    await setDoc(doc(db, "families/famA/members/m1"), { name: "সদস্য ১", googleUid: "uidM1" });
    await setDoc(doc(db, "families/famA/members/m2"), { name: "সদস্য ২", googleUid: "uidM2" });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const ref = (db, id = "m1") => doc(db, "families/famA/members/" + id);
const plan = (over = {}) => ({ v: 1, from: { s: 1, a: 1 }, to: { s: 114, a: 6 }, perDay: 208, done: 0, last: 0, createdAt: 1, ...over });

test("নিজের সদস্য-ডকে বৈধ খতম+হিফজ প্ল্যান লেখা যায়", async () => {
  await assertSucceeds(updateDoc(ref(as("uidM1")), { quranPlans: { khatam: plan(), hifz: plan({ perDay: 5 }) }, updatedAt: 2 }));
});

test("পরিবারের এডমিনও লিখতে পারে", async () => {
  await assertSucceeds(updateDoc(ref(as("uidA")), { quranPlans: { khatam: plan() }, updatedAt: 2 }));
});

test("অন্য সদস্য বা অন্য পরিবারের এডমিন লিখতে পারে না", async () => {
  await assertFails(updateDoc(ref(as("uidM2")), { quranPlans: { khatam: plan() }, updatedAt: 2 }));
  await assertFails(updateDoc(ref(as("uidB")), { quranPlans: { khatam: plan() }, updatedAt: 2 }));
});

test("অচেনা কী/ফিল্ড বা সীমা-পার সংখ্যা আটকায়", async () => {
  const db = as("uidM1");
  await assertFails(updateDoc(ref(db), { quranPlans: { evil: plan() }, updatedAt: 2 }));
  await assertFails(updateDoc(ref(db), { quranPlans: { khatam: plan({ extra: 1 }) }, updatedAt: 2 }));
  await assertFails(updateDoc(ref(db), { quranPlans: { khatam: plan({ done: 7000 }) }, updatedAt: 2 }));
  await assertFails(updateDoc(ref(db), { quranPlans: { khatam: plan({ perDay: 0 }) }, updatedAt: 2 }));
  await assertFails(updateDoc(ref(db), { quranPlans: { khatam: plan({ done: "x" }) }, updatedAt: 2 }));
  await assertFails(updateDoc(ref(db), { quranPlans: "text", updatedAt: 2 }));
});

test("quranPlans-এর সাথে অন্য ফিল্ড (যেমন role) বদলানো যায় না", async () => {
  await assertFails(updateDoc(ref(as("uidM1")), { quranPlans: { khatam: plan() }, role: "admin", updatedAt: 2 }));
});
