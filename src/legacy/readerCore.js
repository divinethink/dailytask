// readerCore.js — রিডিং-মোডের pure লজিক (Firebase/React-মুক্ত, node --test-যোগ্য)।
// লেখা → একটাই টেক্সট; হাইলাইট/আন্ডারলাইন = সেই টেক্সটের offset-মার্ক {id,s,e,t,k,c}।
// sanitizeMarks = মার্কের একমাত্র validation সোর্স (client); Rules শুধু আকার/ফিল্ড-সীমা দেখে।

export const MAX_MARKS = 300;
export const MAX_MARK_TEXT = 1500;
export const FONT_MIN = 12;
export const FONT_MAX = 38;
export const FONT_DEFAULT = 18;
export const COLORS = ["#FFF176", "#C8E6C9", "#BBDEFB", "#F8BBD0"];
export const THEMES = [
  { bg: "#FFFFFF", fg: "#1F2D2A", bar: "#EEF5F0" },
  { bg: "#F4ECD8", fg: "#3B2F1E", bar: "#E8DCC0" },
  { bg: "#1E2423", fg: "#D8E2DE", bar: "#2A3331" },
];

export function clampFont(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return FONT_DEFAULT;
  return Math.min(FONT_MAX, Math.max(FONT_MIN, v));
}

// Firestore doc-id-র জন্য নিরাপদ key (শুধু a-z A-Z 0-9 _ -, ≤১০০)।
export function readerKey(raw) {
  const k = String(raw == null ? "" : raw).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100);
  return k || "section";
}

// একই sectionId-তে একাধিক ট্যাব (filterItems) থাকলে ট্যাব আলাদা key পায়: আইটেম-id-র djb2 hash।
export function itemsHashKey(items) {
  const ids = (Array.isArray(items) ? items : []).map((it) => (it && it.itemId) || "").join("|");
  let hsh = 5381;
  for (let i = 0; i < ids.length; i++) hsh = ((hsh << 5) + hsh + ids.charCodeAt(i)) >>> 0;
  return "t" + hsh.toString(36);
}

// ব্লগ পোস্টের পূর্ণ টেক্সট ([MORE] মার্কার বাদ)।
export function postText(post) {
  const body = (post && post.body) || "";
  const i = body.indexOf("[MORE]");
  return i === -1 ? body : (body.slice(0, i).trim() + "\n\n" + body.slice(i + 6).trim()).trim();
}

// EditableSection-এর কনটেন্ট → পড়ার টেক্সট। আইটেমের শিরোনাম "▌ শিরোনাম" হেডিং লাইন।
export function flattenAccordion(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((it) => {
      const title = it && typeof it.title === "string" ? it.title.trim() : "";
      const body = it && typeof it.body === "string" ? it.body.trim() : "";
      return (title ? "▌ " + title + "\n" : "") + body;
    })
    .filter((s) => s.trim())
    .join("\n\n");
}
export function flattenRichtext(body) {
  return typeof body === "string"
    ? body.split("\n\n").map((p) => p.trim()).filter(Boolean).join("\n\n")
    : "";
}
export function flattenTable(table) {
  const cols = table && Array.isArray(table.columns) ? table.columns : [];
  const rows = table && Array.isArray(table.rows) ? table.rows : [];
  const line = (r) => (Array.isArray(r) ? r : []).map((c) => String(c == null ? "" : c).trim()).join(" | ");
  return [cols.length ? "▌ " + line(cols) : "", ...rows.map(line)].filter((s) => s.trim()).join("\n");
}

// "▌ ..." হেডিং-লাইনের সীমা (শুধু স্টাইলের জন্য; টেক্সট/offset অপরিবর্তিত)।
export function analyzeText(text) {
  const heads = [];
  const re = /^▌[^\n]*/gm;
  let m;
  while ((m = re.exec(text)) !== null) heads.push({ s: m.index, e: m.index + m[0].length });
  return heads;
}

// মার্কের cut-পয়েন্টে টেক্সটকে সেগমেন্টে ভাগ; প্রতিটা সেগমেন্টে কোন কোন মার্ক ঢাকে।
export function buildSegments(text, marks, extra) {
  const cuts = new Set([0, text.length]);
  (extra || []).forEach((c) => { if (c >= 0 && c <= text.length) cuts.add(c); });
  marks.forEach((m) => { cuts.add(m.s); cuts.add(m.e); });
  const pts = Array.from(cuts).sort((a, b) => a - b);
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const s = pts[i], e = pts[i + 1];
    if (e <= s) continue;
    segs.push({ s, e, covering: marks.filter((m) => m.s <= s && m.e >= e) });
  }
  return segs;
}

// অবৈধ/অচেনা মার্ক বাদ; ≤MAX_MARKS; ডুপ্লিকেট id বাদ।
export function sanitizeMarks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const { id, s, e, t, k, c } = m;
    if (typeof id !== "string" || !id || id.length > 40 || seen.has(id)) continue;
    if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e <= s) continue;
    if (typeof t !== "string" || !t || t.length > MAX_MARK_TEXT || t.length !== e - s) continue;
    if (k !== "hl" && k !== "ul") continue;
    const color = k === "hl" && COLORS.indexOf(c) !== -1 ? c : null;
    seen.add(id);
    out.push({ id, s, e, t, k, c: color });
    if (out.length >= MAX_MARKS) break;
  }
  return out;
}

// লেখা এডিট হয়ে মার্কের টেক্সট আর না মিললে সেই মার্ক দেখানো হয় না (ডেটা মোছা হয় না)।
export function validMarks(marks, text) {
  return (marks || []).filter((m) => m.e <= text.length && text.slice(m.s, m.e) === m.t);
}

export function makeMark(text, sel, kind, color, id) {
  if (!sel || !(sel.e > sel.s) || sel.s < 0 || sel.e > text.length) return null;
  if (sel.e - sel.s > MAX_MARK_TEXT) return null;
  const k = kind === "ul" ? "ul" : "hl";
  return { id, s: sel.s, e: sel.e, t: text.slice(sel.s, sel.e), k, c: k === "hl" ? (COLORS.indexOf(color) !== -1 ? color : COLORS[0]) : null };
}
