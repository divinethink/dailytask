// tools/quran/build-tafsir.mjs — তাফসীরে ইবনে কাসীর (বাংলা) ডেটা-ফাইল বানানো (একবার চালানো; অ্যাপ চালাতে লাগে না)।
// ব্যবহার: node tools/quran/build-tafsir.mjs --src <bn-tafseer-ibn-e-kaseer.json ("সূরা:আয়াত" → লেখা | {text, ayah_keys?} | অন্য আয়াতের কী)> [--out public/quran/v1]
// উৎস: QUL (Tarteel) — লেখা অপরিবর্তিত। শুধু গঠন বদল: একই তাফসির-ভাগের আয়াতগুলো একবারই রাখা হয় ([শুরু, শেষ, লেখা])।
// নিরাপত্তা: ৬২৩৬ আয়াত সবই ঢাকা; প্রতি সূরার সংখ্যা meta.json-এর সাথে মিল; ভাগ সূরার ভেতরে ও পরপর; শুধু <p>/<b> ট্যাগ।
// আউটপুট: tafsir/ibn-kathir-bn/NNN.json, tafsir/ibn-kathir-bn/NOTICE.txt, tafsir.json, tools/quran/integrity-tafsir.json।
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
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const fail = (m) => { console.error("❌ " + m); process.exit(1); };
const pad3 = (n) => String(n).padStart(3, "0");

const src = arg("src");
const out = arg("out", "public/quran/v1");
const raw = fs.readFileSync(src);
const data = JSON.parse(raw.toString("utf8"));
const meta = JSON.parse(fs.readFileSync(path.join(out, "meta.json"), "utf8"));
const counts = meta.surahs.map((s) => s.ayahs);
const total = counts.reduce((a, b) => a + b, 0);
const parse = (k) => {
  const m = /^(\d+):(\d+)$/.exec(k);
  if (!m) fail("অবৈধ কী: " + k);
  const s = +m[1], a = +m[2];
  if (s < 1 || s > 114 || a < 1 || a > counts[s - 1]) fail("সীমার বাইরের কী: " + k);
  return [s, a];
};
if (Object.keys(data).length !== total) fail("আয়াত-সংখ্যা " + Object.keys(data).length + " ≠ " + total);

// ১) প্রতিটি আয়াতের মালিক-কী খোঁজা (লেখা-ওয়ালা কী নিজেই মালিক; স্ট্রিং = অন্য কী-র দিকে ইঙ্গিত)।
const owner = {};
for (const [k, v] of Object.entries(data)) {
  parse(k);
  if (typeof v === "string") {
    if (!data[v] || typeof data[v] !== "object") fail(k + " → " + v + ": ইঙ্গিতের লক্ষ্য লেখা-ওয়ালা নয়");
    owner[k] = v;
  } else if (v && typeof v.text === "string" && v.text.trim()) owner[k] = k;
  else fail("অবৈধ মান: " + k);
}
// ২) ভাগ বানানো ও যাচাই: সূরার ভেতরে, পরপর, মালিক = প্রথম আয়াত।
const groups = new Map(); // মালিক → আয়াত-নম্বরের তালিকা
for (const [k, o] of Object.entries(owner)) {
  if (!groups.has(o)) groups.set(o, []);
  groups.get(o).push(parse(k));
}
const perSurah = Array.from({ length: 114 }, () => []);
for (const [o, list] of groups) {
  const [os, oa] = parse(o);
  const nums = list.map(([s, a]) => { if (s !== os) fail(o + ": ভাগ সূরা পেরিয়েছে"); return a; }).sort((x, y) => x - y);
  for (let i = 1; i < nums.length; i++) if (nums[i] !== nums[i - 1] + 1) fail(o + ": ভাগ পরপর নয়");
  if (nums[0] !== oa) fail(o + ": মালিক ভাগের প্রথম আয়াত নয়");
  const ak = data[o].ayah_keys;
  if (ak && (ak.length !== nums.length || !ak.every((x) => list.some(([s, a]) => s + ":" + a === x)))) fail(o + ": ayah_keys মেলেনি");
  const html = data[o].text;
  if (/<\s*\/?\s*(?!p\b|b\b)[a-z]/i.test(html) || /<\s*(script|iframe)|\bon\w+\s*=|javascript:/i.test(html)) fail(o + ": অনুমোদিত নয় এমন ট্যাগ");
  perSurah[os - 1].push([nums[0], nums[nums.length - 1], html]);
}
// ৩) ফাইল লেখা + প্রতি সূরায় পূর্ণ ঢাকা যাচাই।
const dir = path.join(out, "tafsir", "ibn-kathir-bn");
fs.mkdirSync(dir, { recursive: true });
const files = {};
for (let n = 1; n <= 114; n++) {
  const g = perSurah[n - 1].sort((x, y) => x[0] - y[0]);
  let next = 1;
  for (const [f, t] of g) { if (f !== next) fail("সূরা " + n + ": আয়াত " + next + " ঢাকা পড়েনি/দ্বিগুণ"); next = t + 1; }
  if (next - 1 !== counts[n - 1]) fail("সূরা " + n + ": শেষ আয়াত মেলেনি");
  const body = JSON.stringify({ v: 1, s: n, g });
  const p = "tafsir/ibn-kathir-bn/" + pad3(n) + ".json";
  fs.writeFileSync(path.join(out, p), body);
  files[p] = { bytes: Buffer.byteLength(body), sha256: sha(body) };
}
fs.writeFileSync(path.join(dir, "NOTICE.txt"), "তাফসীরে ইবনে কাসীর (বাংলা): লেখা QUL (Tarteel, qul.tarteel.ai) থেকে, অপরিবর্তিত। শুধু গঠন বদল (একই তাফসির-ভাগের আয়াতগুলো একবার রাখা)। লাইসেন্স: Owner-নিশ্চিত (ওপেন সোর্স)।\n");
fs.writeFileSync(path.join(out, "tafsir.json"), JSON.stringify({ v: 1, default: "ibn_kathir_bn", items: [{ id: "ibn_kathir_bn", lang: "bn", name: "তাফসীরে ইবনে কাসীর", nameEn: "Tafsir Ibn Kathir (Bengali)", dir: "tafsir/ibn-kathir-bn", source: "QUL (Tarteel)", sourceUrl: "https://qul.tarteel.ai", licenseStatus: "owner-confirmed" }] }));
fs.writeFileSync("tools/quran/integrity-tafsir.json", JSON.stringify({ input: sha(raw), files }, null, 1));
const sizes = Object.values(files).map((f) => f.bytes);
console.log("✅ ১১৪ সূরা, " + total + " আয়াত, " + groups.size + " তাফসির-ভাগ; সবচেয়ে বড় ফাইল " + Math.round(Math.max(...sizes) / 1024) + " KB, মোট " + Math.round(sizes.reduce((a, b) => a + b, 0) / 1024) + " KB");
