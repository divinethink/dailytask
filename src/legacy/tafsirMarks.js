// tafsirMarks.js — তাফসিরে হাইলাইট/আন্ডারলাইনের pure লজিক (Firebase/React-মুক্ত, node --test-যোগ্য)।
// তাফসিরের অনুচ্ছেদগুলো জুড়ে একটাই টেক্সট বানায়; মার্কের offset সেই টেক্সটের। মার্কের যাচাই/সেভ
// readerCore.js ও readerMarks.js-এই (ব্লগের সাথে একই)। ডেটা: users/{uid}/readerMarks/{key}।

import { readerKey } from "./readerCore.js";

// kind: "ik" (ইবনে কাসীর) | "fm" (ফাতহুল মাজীদ); from = তাফসির-ভাগের প্রথম আয়াত।
// কয়েক আয়াতের সম্মিলিত তাফসিরে একই key, তাই মার্ক সব আয়াতে একই দেখায়।
export function tafsirMarkKey(kind, surahN, from) {
  const k = kind === "fm" ? "fm" : "ik";
  return readerKey("tf_" + k + "_" + Number(surahN) + "_" + Number(from));
}

// paras: [{ ar?:bool, segs:[{t, b?}] }] → { text, items:[{ar,s,e,segs:[{s,e,b}]}], cuts:[…] }
// অনুচ্ছেদের মাঝে "\n\n" (শুধু offset-হিসাবে; পর্দায় আঁকা হয় না)। cuts = প্রতিটা টুকরোর সীমা।
export function layoutParas(paras) {
  const list = Array.isArray(paras) ? paras : [];
  let text = "";
  const items = [];
  const cuts = [];
  for (const p of list) {
    const segs = p && Array.isArray(p.segs) ? p.segs.filter((x) => x && typeof x.t === "string" && x.t) : [];
    if (!segs.length) continue;
    if (items.length) text += "\n\n";
    const ps = text.length;
    const out = [];
    for (const x of segs) {
      const s = text.length;
      text += x.t;
      out.push({ s, e: text.length, b: !!x.b });
      cuts.push(s, text.length);
    }
    items.push({ ar: !!p.ar, s: ps, e: text.length, segs: out });
  }
  return { text, items, cuts };
}

// ইবনে কাসীর: tafsirBlocks() → paras
export function parasFromIk(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((segs) => ({ ar: false, segs }));
}
// ফাতহুল মাজীদ: fmBlocks() → paras (kind "ar" = আরবি অনুচ্ছেদ)
export function parasFromFm(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((b) => ({ ar: !!b && b.kind === "ar", segs: (b && b.parts) || [] }));
}
