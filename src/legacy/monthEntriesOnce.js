// monthEntriesOnce.js — একজন সদস্যের একটা মাসের এন্ট্রি একবার (one-shot) পড়া।
// app.js-এর live monthEntries effect-এর হুবহু একই query ও prefix; শুধু onSnapshot-এর বদলে getDocs,
// তাই কোনো listener খোলা থাকে না। শুধু মাসিক রিপোর্ট খুললে আগের মাসের তুলনার জন্য ডাকা হয়।
// ফেরত: { "01": entry, ... } (দিনের দুই-অঙ্কের কী)। কোনো limit নেই; ভুল/নষ্ট একটা ডক বাদ যায়।
import { query, where, documentId, getDocs } from "firebase/firestore";
import { getFamilyCode, getFamilyId, resolvePathContext } from "./familyIdentity.js";
import { pad2 } from "./appHelpers.js";

export async function loadMonthEntriesOnce(migrationState, memberId, year, month0) {
  const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
  const ym = `${year}-${pad2(month0 + 1)}-`;
  const prefix = ctx.mode === "v2" ? `${memberId}_${ym}` : `entry:${memberId}:${ym}`;
  const snap = await getDocs(query(
    ctx.entriesRef,
    where(documentId(), ">=", prefix),
    where(documentId(), "<", prefix + "")
  ));
  const out = {};
  snap.docs.forEach(d => {
    try {
      out[d.id.slice(prefix.length)] = JSON.parse(d.data().value);
    } catch {
      // একটা নষ্ট এন্ট্রির জন্য পুরো মাস বাদ নয়
    }
  });
  return out;
}
