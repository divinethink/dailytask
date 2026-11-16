// tools/quran/build-uthmani.mjs — উসমানি আরবি লেখার ডেটা-ফাইল বানানো (একবার চালানো; অ্যাপ চালাতে লাগে না)। ধাপ ৬গ-২।
// ব্যবহার: node tools/quran/build-uthmani.mjs --src <quran-uthmani.txt (Tanzil, সূরা|আয়াত|লেখা)> [--out public/quran/v1]
// উৎস: Tanzil.net Uthmani — অপরিবর্তিত। শুধু ২–১১৪ (৯ বাদে) সূরার ১ম আয়াত থেকে জুড়ে থাকা বিসমিল্লাহ-প্রিফিক্স আলাদা (Simple-এর মতোই; এটা ফাতিহার ১ম আয়াতের হুবহু মিল হলে তবেই)।
// নিরাপত্তা: ৬২৩৬ আয়াত, প্রতি সূরার সংখ্যা meta.json-এর সাথে মিল, Simple-এর সাথে ব্যঞ্জনবর্ণ-কাঠামো মিল; না মিললে কিছু লেখা হয় না।
// আউটপুট: ar-uthmani/NNN.json, ar-uthmani/LICENSE-TANZIL.txt, manifest.json-এ arabicUthmani, tools/quran/integrity-uthmani.json।
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  if (i === -1 || !process.argv[i + 1]) {
    if (def !== undefined) return def;
    console.error("অনুপস্থিত আর্গুমেন্ট: --" + name);
    process.exit(2);
  }
  return process.argv[i + 1];
}
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const pad3 = (n) => String(n).padStart(3, "0");
const fail = (m) => { console.error("❌ " + m); process.exit(1); };

const OUT = path.resolve(arg("out", "public/quran/v1"));
const raw = fs.readFileSync(arg("src"), "utf8");
const meta = JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8"));
const manifestPath = path.join(OUT, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// পার্স: কমেন্ট (#) ও খালি লাইন বাদ।
const rows = raw.split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => {
  const m = /^(\d+)\|(\d+)\|(.+)$/.exec(l);
  if (!m) fail("অচেনা লাইন: " + l.slice(0, 40));
  return { s: +m[1], a: +m[2], t: m[3] };
});
if (rows.length !== 6236) fail("৬২৩৬ আয়াত নেই (" + rows.length + ")");

const surahs = meta.surahs;
const BISMILLAH = rows[0].t;
let k = 0, stripped = 0;
const per = [];
for (const su of surahs) {
  const ar = [];
  for (let a = 1; a <= su.ayahs; a++, k++) {
    const r = rows[k];
    if (r.s !== su.n || r.a !== a) fail("ক্রম মিলছে না: প্রত্যাশিত " + su.n + ":" + a + ", পাওয়া " + r.s + ":" + r.a);
    let t = r.t;
    if (a === 1 && su.n !== 1 && su.n !== 9) {
      // উৎস-লেখার জ্ঞাত বিশেষত্ব: সূরা ৯৫ ও ৯৭-এর প্রিফিক্সে "ب"-র পরে বাড়তি তাশদীদ (U+0651) আছে। শুধু এই এক রূপই মানা হয়; লেখা বদলানো হয় না, কেবল প্রিফিক্স কাটা হয়।
      const variant = BISMILLAH[0] + "\u0651" + BISMILLAH.slice(1);
      const pre = t.startsWith(BISMILLAH + " ") ? BISMILLAH : (su.n === 95 || su.n === 97) && t.startsWith(variant + " ") ? variant : null;
      if (!pre) fail("সূরা " + su.n + ": বিসমিল্লাহ-প্রিফিক্স নেই");
      t = t.slice(pre.length + 1);
      stripped++;
    } else if (a === 1 && su.n === 9 && t.startsWith(BISMILLAH)) fail("সূরা ৯-এ বিসমিল্লাহ থাকার কথা নয়");
    if (!t.trim()) fail("খালি আয়াত " + su.n + ":" + a);
    ar.push(t);
  }
  per.push(ar);
}
if (k !== 6236 || stripped !== 112) fail("গণনা ভুল (k=" + k + ", stripped=" + stripped + ")");

// ব্যঞ্জনবর্ণ-কাঠামো: হরকত/চিহ্ন/আলিফ-ইয়া-ওয়াও-হামযা-জাতীয় বাদ। দুই লিপি-রীতির ছোট পার্থক্য সহ্য করে, বড় অমিল ধরে।
const skel = (t) => t.normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[\u0640\u200B-\u200F]/g, "")
  .replace(/[\u0671\u0622\u0623\u0625\u0621\u0670\u0627\u0624\u0626\u0648\u0649\u064A\u06E5\u06E6\u06DE\u06E9\u06FD\u0629]/g, "")
  .replace(/[\s\u06D6-\u06ED\u0653\u06DD]/g, "").replace(/(.)\1+/g, "$1"); // একই অক্ষরের পরপর সারি এক ধরা (الليل ≠ ٱلَّيْل-এর রসম-পার্থক্য)
const diffs = [];
for (const su of surahs) {
  const simple = JSON.parse(fs.readFileSync(path.join(OUT, "ar", pad3(su.n) + ".json"), "utf8")).a;
  if (simple.length !== per[su.n - 1].length) fail("সূরা " + su.n + ": Simple-এর সাথে আয়াত-সংখ্যা অমিল");
  simple.forEach((x, i) => { if (skel(x) !== skel(per[su.n - 1][i])) diffs.push(su.n + ":" + (i + 1)); });
}
// জ্ঞাত রসম-পার্থক্য (দুই লিপি-রীতিতে বানানই আলাদা): ২:২৪৫ ও ৭:৬৯ (সীন/সোয়াদ — بسط/بصط), ৭২:১৬ (أن لو / ألو)। হুবহু এই তিনটা ছাড়া আর কোনো অমিল থাকলে ডেটা নেওয়া হয় না।
const EXPECTED = ["2:245", "7:69", "72:16"];
if (diffs.join() !== EXPECTED.join()) fail("প্রত্যাশিত নয় এমন ব্যঞ্জনবর্ণ-অমিল: " + diffs.slice(0, 15).join(", "));

// লেখা
const integrity = {};
for (const su of surahs) {
  const s = JSON.stringify({ v: 1, s: su.n, a: per[su.n - 1] });
  fs.mkdirSync(path.join(OUT, "ar-uthmani"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "ar-uthmani", pad3(su.n) + ".json"), s);
  integrity["ar-uthmani/" + pad3(su.n) + ".json"] = { bytes: Buffer.byteLength(s), sha256: sha(s) };
}
const all = per.flat().join("\n");
manifest.arabicUthmani = {
  script: "tanzil-uthmani", source: "Tanzil.net", sourceUrl: "https://tanzil.net", license: "CC BY 3.0",
  sha256: sha(all), bismillahSeparated: true, bismillah: BISMILLAH,
};
const manifestStr = JSON.stringify(manifest);
fs.writeFileSync(manifestPath, manifestStr);
// manifest.json বদলালো, তাই মূল integrity.json-এর ওই এন্ট্রি হালনাগাদ (tests/quran.test.mjs এটা মেলায়)।
const mainIntPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "integrity.json");
const mainInt = JSON.parse(fs.readFileSync(mainIntPath, "utf8"));
mainInt.files["manifest.json"] = { bytes: Buffer.byteLength(manifestStr), sha256: sha(manifestStr) };
fs.writeFileSync(mainIntPath, JSON.stringify(mainInt, null, 1));
// Tanzil-এর শর্ত: কপিরাইট-ব্লক সাথে রাখতে হবে (Simple-এর ফাইলের মতোই)।
const lic = fs.readFileSync(path.join(OUT, "ar", "LICENSE-TANZIL.txt"), "utf8").replace("(Simple, version 1.0.2)", "(Uthmani)");
fs.writeFileSync(path.join(OUT, "ar-uthmani", "LICENSE-TANZIL.txt"), lic);
fs.writeFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "integrity-uthmani.json"),
  JSON.stringify({ input: sha(raw), files: integrity }, null, 1));
console.log("✅ উসমানি: ১১৪ সূরা-ফাইল, ৬২৩৬ আয়াত, বিসমিল্লাহ-প্রিফিক্স আলাদা " + stripped + " সূরায়");
console.log("   ব্যঞ্জনবর্ণ অমিল (Simple-এর সাথে): " + diffs.length + " | sha256 " + manifest.arabicUthmani.sha256.slice(0, 12) + "…");
