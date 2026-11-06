// Phase-5: accessRequests/memberRequests বন্ধ, কিন্তু Google-claimed সদস্যের পড়া অক্ষুণ্ণ।
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-dailytask-p5",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "families/famA"), {
      familyId: "famA", familyCode: "FAMILYA1", isCustomCode: false, createdAt: 1,
      createdByUid: "uidA", schemaVersion: 2, adminUids: ["uidA"],
      dataCollectionName: "data_FAMILYA1", migrationState: "v2", identityModel: "google-only",
    });
    await setDoc(doc(db, "families/famA/members/m1"), { name: "A", googleUid: "uidA", role: "admin" });
    await setDoc(doc(db, "families/famA/members/m2"), { name: "C", googleUid: "uidC", role: "member" });
    await setDoc(doc(db, "users/uidC"), { familyId: "famA", memberId: "m2" });
  });
});
const as = (uid) => env.authenticatedContext(uid).firestore();

test("claimed সদস্য নিজের পরিবারের members পড়তে পারে (accessRequests ছাড়াই)", async () => {
  await assertSucceeds(getDocs(collection(as("uidC"), "families/famA/members")));
});
test("অচেনা ইউজার accessRequests বানিয়ে নিজেকে approved করতে পারে না", async () => {
  const db = as("uidX");
  await assertFails(setDoc(doc(db, "families/famA/accessRequests/uidX"), { status: "approved", requestedAt: 1 }));
  await assertFails(getDocs(collection(db, "families/famA/members")));
});
test("memberRequests তৈরি করা যায় না", async () => {
  await assertFails(setDoc(doc(as("uidX"), "families/famA/memberRequests/uidX"),
    { name: "x", gender: "male", status: "pending", requestedAt: 1, presetKey: "abcdef12" }));
});
