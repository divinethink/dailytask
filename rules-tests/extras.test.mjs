// Firestore Rules: readerMarks, publicToolsContent, member-ডকের customTasks/tabLayout/homeLayout। চালান: npm run test:rules
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";

const CREATOR = "yiirNJKJHlM27guiiS10zsp2FYT2";
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
    await setDoc(doc(db, "publicToolsContent/app_design"), { v: 1 });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const mem = (db, id = "m1") => doc(db, "families/famA/members/" + id);

// ---- readerMarks ----
const marks = (over = {}) => ({ v: 1, marks: [], updatedAt: 1, ...over });
test("readerMarks: নিজের uid লিখতে/পড়তে/মুছতে পারে", async () => {
  const r = doc(as("u1"), "users/u1/readerMarks/k1");
  await assertSucceeds(setDoc(r, marks()));
  await assertSucceeds(getDoc(r));
  await assertSucceeds(deleteDoc(r));
});
test("readerMarks: অন্যের বা অনলগিন-এর লেখা/পড়া আটকায়", async () => {
  await assertFails(setDoc(doc(as("u2"), "users/u1/readerMarks/k1"), marks()));
  await assertFails(getDoc(doc(as("u2"), "users/u1/readerMarks/k1")));
  await assertFails(setDoc(doc(anon(), "users/u1/readerMarks/k1"), marks()));
});
test("readerMarks: অবৈধ আকার/ফিল্ড/কী আটকায়", async () => {
  const db = as("u1"), r = (k) => doc(db, "users/u1/readerMarks/" + k);
  await assertFails(setDoc(r("k1"), marks({ marks: new Array(301).fill(1) })));
  await assertFails(setDoc(r("k1"), marks({ v: 2 })));
  await assertFails(setDoc(r("k1"), marks({ extra: 1 })));
  await assertFails(setDoc(r("k1"), marks({ marks: "x" })));
  await assertFails(setDoc(r("k1"), marks({ updatedAt: "x" })));
  await assertFails(setDoc(r("x".repeat(101)), marks()));
});

// ---- publicToolsContent (creator-only write) ----
test("publicToolsContent: সবাই পড়তে পারে, শুধু App Creator লিখতে পারে", async () => {
  await assertSucceeds(getDoc(doc(anon(), "publicToolsContent/app_design")));
  await assertSucceeds(setDoc(doc(as(CREATOR), "publicToolsContent/app_design"), { v: 2 }));
  await assertFails(setDoc(doc(as("uidA"), "publicToolsContent/app_design"), { v: 3 }));
  await assertFails(setDoc(doc(anon(), "publicToolsContent/app_design"), { v: 3 }));
  await assertFails(deleteDoc(doc(as("uidM1"), "publicToolsContent/app_design")));
});

// ---- member-ডকের customTasks / tabLayout / homeLayout ----
const cases = [
  ["customTasks", [{ id: "t1", label: "কাজ" }], 40],
  ["homeLayout", { entry: ["a"], below: ["b"] }, null],
  ["tabLayout", { prayerOrder: ["a"], toolsHidden: ["b"] }, null]
];
for (const [field, good] of cases) {
  test(field + ": নিজের সদস্য ও এডমিন লিখতে পারে; অন্যেরা পারে না", async () => {
    await assertSucceeds(updateDoc(mem(as("uidM1")), { [field]: good, updatedAt: 2 }));
    await assertSucceeds(updateDoc(mem(as("uidA")), { [field]: good, updatedAt: 3 }));
    await assertFails(updateDoc(mem(as("uidM2")), { [field]: good, updatedAt: 4 }));
    await assertFails(updateDoc(mem(as("uidB")), { [field]: good, updatedAt: 4 }));
    await assertFails(updateDoc(mem(anon()), { [field]: good, updatedAt: 4 }));
  });
  test(field + ": অন্য ফিল্ডের (role) সাথে একসাথে লেখা আটকায়", async () => {
    await assertFails(updateDoc(mem(as("uidM1")), { [field]: good, role: "admin", updatedAt: 2 }));
  });
}
test("customTasks: ৪১টি বা তালিকা-নয় আটকায়", async () => {
  const db = as("uidM1");
  await assertSucceeds(updateDoc(mem(db), { customTasks: new Array(40).fill({ id: "x", label: "y" }), updatedAt: 2 }));
  await assertFails(updateDoc(mem(db), { customTasks: new Array(41).fill({ id: "x", label: "y" }), updatedAt: 3 }));
  await assertFails(updateDoc(mem(db), { customTasks: "x", updatedAt: 3 }));
});
test("homeLayout: অচেনা কী বা ২১টি আইটেম আটকায়", async () => {
  const db = as("uidM1");
  await assertFails(updateDoc(mem(db), { homeLayout: { entry: [], below: [], evil: [] }, updatedAt: 2 }));
  await assertFails(updateDoc(mem(db), { homeLayout: { entry: new Array(21).fill("a"), below: [] }, updatedAt: 2 }));
});
test("tabLayout: অচেনা কী বা ২১টি আইটেম আটকায়", async () => {
  const db = as("uidM1");
  await assertFails(updateDoc(mem(db), { tabLayout: { evil: [] }, updatedAt: 2 }));
  await assertFails(updateDoc(mem(db), { tabLayout: { amolOrder: new Array(21).fill("a") }, updatedAt: 2 }));
});
test("tomorrowFocus clause সরানো হয়েছে — আর লেখা যায় না", async () => {
  await assertFails(updateDoc(mem(as("uidM1")), { tomorrowFocus: { fieldKey: "f", targetDateKey: "d", setAt: 1, source: "auto" }, updatedAt: 2 }));
});
