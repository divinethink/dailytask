// ডায়াগনস্টিক (সাময়িক): member-ডকের লেখার কোন অবস্থা অনুমোদিত/আটকানো তা ছাপে। কখনো ফেল করে না।
// লগে "DBG" লাইন খুঁজুন। কাজ শেষে এই ফাইল মুছে দেবেন।
import test, { before, after } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-dailytask", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
after(async () => { await env.cleanup(); });

const as = (uid) => env.authenticatedContext(uid).firestore();
const mem = (db) => doc(db, "families/famA/members/m1");
async function reset() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "families/famA"), { familyId: "famA", familyCode: "FAMILYA1", isCustomCode: false, createdAt: 1, createdByUid: "uidA", schemaVersion: 2, adminUids: ["uidA"], dataCollectionName: "data_FAMILYA1", migrationState: "v2" });
    await setDoc(doc(db, "families/famA/members/m1"), { name: "সদস্য ১", googleUid: "uidM1" });
  });
}
const tryW = async (uid, data) => {
  try { await assertSucceeds(updateDoc(mem(as(uid)), data)); return "OK"; }
  catch (e) { return "DENIED"; }
};

const fields = {
  customTasks: [{ id: "t1", label: "কাজ" }],
  customTasksStr: null, // নিচে বাদ
  homeLayout: { entry: ["a"], below: ["b"] },
  tabLayout: { prayerOrder: ["a"], toolsHidden: ["b"] },
  bestScoreEver: 50
};
delete fields.customTasksStr;

test("DBG: সব অবস্থার ছক", async () => {
  const rows = [];
  for (const [f, v] of Object.entries(fields)) {
    // ১) M1 একা, নতুন ডকে
    await reset(); rows.push([f, "M1 একা(নতুন ডক)", await tryW("uidM1", { [f]: v, updatedAt: 2 })]);
    // ২) A একা, নতুন ডকে
    await reset(); rows.push([f, "A একা(নতুন ডক)", await tryW("uidA", { [f]: v, updatedAt: 2 })]);
    // ৩) M1 তারপর A (একই মান, শুধু updatedAt বদলায়)
    await reset(); const a = await tryW("uidM1", { [f]: v, updatedAt: 2 });
    rows.push([f, "M1 তারপর A(একই মান)", a + " → " + (await tryW("uidA", { [f]: v, updatedAt: 3 }))]);
    // ৪) M1 তারপর M1 (একই মান)
    await reset(); const b = await tryW("uidM1", { [f]: v, updatedAt: 2 });
    rows.push([f, "M1 তারপর M1(একই মান)", b + " → " + (await tryW("uidM1", { [f]: v, updatedAt: 3 }))]);
  }
  await reset(); rows.push(["(শুধু updatedAt)", "M1 একা", await tryW("uidM1", { updatedAt: 2 })]);
  await reset(); rows.push(["(শুধু updatedAt)", "A একা", await tryW("uidA", { updatedAt: 2 })]);
  await reset(); rows.push(["lastActiveAt", "M1 একা", await tryW("uidM1", { lastActiveAt: new Date(), updatedAt: 2 })]);
  for (const r of rows) console.log("DBG | " + r.join(" | "));
});
