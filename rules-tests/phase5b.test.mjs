// Phase-5 ধাপ ১: পুরনো ownerUids/Member-Key/admin-claim পথ আর কাজ করে না;
// Google-claimed সদস্যের স্বাভাবিক লেখা অক্ষুণ্ণ।
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-dailytask-p5b",
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
      createdByUid: "uidA", schemaVersion: 2, adminUids: ["uidA"], firstAdminUid: "uidA",
      dataCollectionName: "data_FAMILYA1", migrationState: "v2", identityModel: "google-only",
    });
    await setDoc(doc(db, "families/famA/members/m1"), { name: "A", googleUid: "uidA", role: "admin" });
    await setDoc(doc(db, "families/famA/members/m2"), { name: "C", googleUid: "uidC", role: "member" });
    // পুরনো-ধরনের সদস্য: শুধু ownerUids, googleUid নেই
    await setDoc(doc(db, "families/famA/members/m3"), { name: "Old", role: "member", ownerUids: ["uidOld"] });
    await setDoc(doc(db, "families/famA/members/m3/private/key"), { memberKey: "abcdef", memberKeyHash: "a".repeat(64) });
    await setDoc(doc(db, "users/uidC"), { familyId: "famA", memberId: "m2" });
  });
});
const as = (uid) => env.authenticatedContext(uid).firestore();

test("ownerUids দিয়ে সদস্য-ডক আর লেখা যায় না", async () => {
  await assertFails(updateDoc(doc(as("uidOld"), "families/famA/members/m3"), { name: "Hack", updatedAt: 2 }));
});
test("Member Key hash দিয়ে নতুন uid ownerUids-এ ঢুকতে পারে না", async () => {
  await assertFails(updateDoc(doc(as("uidX"), "families/famA/members/m3"), {
    ownerUids: ["uidOld", "uidX"], claimKeyHashAttempt: "a".repeat(64), updatedAt: 2,
  }));
});
test("private/key নতুন করে বানানো বা বদলানো যায় না (admin-ও না)", async () => {
  const db = as("uidA");
  const data = { memberKey: "abcdef", memberKeyHash: "b".repeat(64), updatedAt: 2 };
  await assertFails(setDoc(doc(db, "families/famA/members/m2/private/key"), data));
  await assertFails(setDoc(doc(db, "families/famA/members/m3/private/key"), data));
});
test("ownerUids-claim দিয়ে নিজেকে adminUids-এ যোগ করা যায় না", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "families/famA/members/m4"), { name: "X", role: "admin", ownerUids: ["uidX"] });
  });
  await assertFails(updateDoc(doc(as("uidX"), "families/famA"), {
    adminUids: ["uidA", "uidX"], lastAdminClaimMemberId: "m4", updatedAt: 2,
  }));
});
test("regression: Google-claimed সদস্য নিজের নাম বদলাতে পারে", async () => {
  await assertSucceeds(updateDoc(doc(as("uidC"), "families/famA/members/m2"), { name: "C2", updatedAt: 2 }));
});
test("regression: Admin অন্য সদস্যকে Make Admin করতে পারে (role)", async () => {
  await assertSucceeds(updateDoc(doc(as("uidA"), "families/famA/members/m2"), { role: "admin", updatedAt: 2 }));
});
