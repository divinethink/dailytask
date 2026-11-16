// কুরআন-রিডারের ক্লাউড-ডক: users/{uid}/quran/state — শুধু নিজ uid, আকার/ফিল্ড-সীমা।
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-dailytask-quran",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const ref = (db, uid = "u1", id = "state") => doc(db, "users", uid, "quran", id);
const mark = (i) => ({ s: 2, a: (i % 286) + 1, k: "b", t: i });
const good = (over = {}) => ({ v: 1, marks: [mark(1)], last: [{ s: 2, a: 5, t: 1 }], updatedAt: 1, ...over });

test("নিজের uid-তে লেখা, পড়া, মোছা চলে", async () => {
  const db = as("u1");
  await assertSucceeds(setDoc(ref(db), good()));
  await assertSucceeds(getDoc(ref(db)));
  await assertSucceeds(setDoc(ref(db), good({ marks: [], updatedAt: 2 })));
  await assertSucceeds(deleteDoc(ref(db)));
});

test("অন্যের uid-তে পড়া/লেখা/মোছা বন্ধ; লগইন ছাড়া বন্ধ", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(ref(ctx.firestore()), good()); });
  await assertFails(getDoc(ref(as("u2"))));
  await assertFails(setDoc(ref(as("u2")), good()));
  await assertFails(deleteDoc(ref(as("u2"))));
  await assertFails(getDoc(ref(anon())));
  await assertFails(setDoc(ref(anon()), good()));
});

test("৩০০ এন্ট্রি চলে, ৩০১ বন্ধ", async () => {
  const db = as("u1");
  await assertSucceeds(setDoc(ref(db), good({ marks: Array.from({ length: 300 }, (_, i) => mark(i)) })));
  await assertFails(setDoc(ref(db), good({ marks: Array.from({ length: 301 }, (_, i) => mark(i)) })));
});

test("last ১০টির বেশি বন্ধ", async () => {
  const db = as("u1");
  await assertSucceeds(setDoc(ref(db), good({ last: Array.from({ length: 10 }, (_, i) => ({ s: i + 1, a: 1, t: i })) })));
  await assertFails(setDoc(ref(db), good({ last: Array.from({ length: 11 }, (_, i) => ({ s: i + 1, a: 1, t: i })) })));
});

test("অতিরিক্ত ফিল্ড, ভুল ধরন/সংস্করণ, অন্য doc-id বন্ধ", async () => {
  const db = as("u1");
  await assertFails(setDoc(ref(db), good({ extra: "x" })));
  await assertFails(setDoc(ref(db), good({ marks: "x" })));
  await assertFails(setDoc(ref(db), good({ last: {} })));
  await assertFails(setDoc(ref(db), good({ updatedAt: "now" })));
  await assertFails(setDoc(ref(db), good({ v: 2 })));
  await assertFails(setDoc(ref(db, "u1", "other"), good()));
  const { v, ...noV } = good();
  await assertFails(setDoc(ref(db), noV));
});
