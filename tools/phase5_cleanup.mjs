// Phase-5 cleanup: পুরনো auth-artifact মোছা (হাতে-চালানো workflow থেকে)।
// mode: "dry-run" (শুধু গণনা, কিছু বদলায় না) | "delete".
// মোছা হয় শুধু: members/*-এর ফিল্ড ownerUids, ownerActivity, ownerUid; এবং প্রতি পরিবারের
// accessRequests ও memberRequests সাব-কালেকশন। entries/weekly/reviews/নাম/role/googleUid কখনো নয়।
// সুরক্ষা: googleUid ছাড়া অথচ ownerUids-এ মান আছে এমন (claim-না-হওয়া legacy) সদস্য থাকলে delete বাতিল হয়।
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const mode = process.argv[2] === "delete" ? "delete" : "dry-run";
const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const FIELDS = ["ownerUids", "ownerActivity", "ownerUid"];
const report = { families: 0, membersWithLegacyFields: 0, blockers: [], accessRequests: 0, memberRequests: 0 };
const memberJobs = [];
const subJobs = [];

const fams = await db.collection("families").get();
for (const f of fams.docs) {
  report.families++;
  const members = await f.ref.collection("members").get();
  for (const m of members.docs) {
    const d = m.data();
    const has = FIELDS.filter((k) => k in d);
    if (!has.length) continue;
    report.membersWithLegacyFields++;
    const owners = Array.isArray(d.ownerUids) ? d.ownerUids.filter(Boolean) : [];
    if (!d.googleUid && owners.length) report.blockers.push(`${f.id}/${m.id} (${d.name || "?"})`);
    memberJobs.push({ ref: m.ref, fields: has });
  }
  for (const sub of ["accessRequests", "memberRequests"]) {
    const snap = await f.ref.collection(sub).get();
    report[sub] += snap.size;
    snap.docs.forEach((x) => subJobs.push(x.ref));
  }
}

console.log(JSON.stringify({ mode, ...report }, null, 2));
if (mode === "dry-run") process.exit(0);
if (report.blockers.length) {
  console.error("বাতিল: নিচের সদস্য googleUid ছাড়া ownerUids-এ আটকে আছেন, আগে claim করান:", report.blockers);
  process.exit(1);
}
for (let i = 0; i < memberJobs.length; i += 400) {
  const b = db.batch();
  memberJobs.slice(i, i + 400).forEach((j) => {
    const upd = {};
    j.fields.forEach((k) => (upd[k] = FieldValue.delete()));
    b.update(j.ref, upd);
  });
  await b.commit();
}
for (let i = 0; i < subJobs.length; i += 400) {
  const b = db.batch();
  subJobs.slice(i, i + 400).forEach((r) => b.delete(r));
  await b.commit();
}
console.log("মোছা সম্পন্ন।");
