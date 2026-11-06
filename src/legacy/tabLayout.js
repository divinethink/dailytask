// নেভ-ট্যাব কাস্টমাইজ(সময়সূচি/আমল/সহায়িকা, owner-approved ২ নভেম্বর ২০২৬) — pure logic, React/DB নেই।
// member.tabLayout ঐচ্ছিক: { prayerOrder, prayerHidden, amolOrder, amolHidden, toolsOrder, toolsHidden } (সব id-এর তালিকা)।
// না থাকলে/অবৈধ হলে ডিফল্ট = আগের আচরণ হুবহু। অচেনা/ডুপ্লিকেট id বাদ; নতুন কার্ড ডিফল্ট ক্রমে শেষে যুক্ত।
// সব কার্ড লুকানো হলে লুকানো তালিকা উপেক্ষা করে সবকটা দেখানো হয়(খালি পেজ কখনো নয়)।
import { PRAYER_CARD_DEFS } from "./homeLayout.js";

export const MAX_IDS = 20;

export const TAB_DEFS = {
  prayer: { title: "সময়সূচি", defs: PRAYER_CARD_DEFS },
  amol: {
    title: "আমল",
    defs: [
      { id: "azkar", title: "সকাল-সন্ধ্যার আমল" },
      { id: "fullDayAmol", title: "সারাদিনের আমল" },
      { id: "dhikr", title: "যিকির" },
      { id: "dua", title: "দু'আ" },
      { id: "duaAcceptance", title: "দোয়া কবুলের সময়" },
      { id: "deathReminder", title: "মৃত্যুর স্মরণ" },
      { id: "tasbih", title: "তাসবীহ কাউন্টার" }
    ]
  },
  tools: {
    title: "সহায়িকা",
    defs: [
      { id: "qibla", title: "কিবলা" },
      { id: "salah", title: "সালাত ও পবিত্রতা" },
      { id: "jumuahAmol", title: "জুমার দিনের বিশেষ আমল" },
      { id: "quran", title: "কুরআন" },
      { id: "toolsTracking", title: "ইসলামি টুলস ও ট্র্যাকিং" },
      { id: "specialDays", title: "বিশেষ দিন ও উপলক্ষ" },
      { id: "quiz", title: "ইসলামি কুইজ" },
      { id: "blog", title: "ডিভাইন ব্লগ" }
    ]
  }
};

const ids = tab => TAB_DEFS[tab].defs.map(x => x.id);
export function defaultOrder(tab) {
  return ids(tab);
}
export function tabCardTitle(tab, id) {
  const f = TAB_DEFS[tab].defs.find(x => x.id === id);
  return f ? f.title : id;
}

export function sanitizeOrder(tab, raw) {
  const known = new Set(ids(tab));
  const seen = new Set();
  const out = [];
  if (Array.isArray(raw)) {
    for (const id of raw.slice(0, MAX_IDS)) {
      if (typeof id !== "string" || !known.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of ids(tab)) if (!seen.has(id)) out.push(id);
  return out;
}

export function sanitizeHidden(tab, raw) {
  const known = new Set(ids(tab));
  const out = [];
  if (Array.isArray(raw)) {
    for (const id of raw.slice(0, MAX_IDS)) {
      if (typeof id === "string" && known.has(id) && !out.includes(id)) out.push(id);
    }
  }
  return out.length >= known.size ? [] : out;
}

// tabLayout(member.tabLayout) → { order, hidden }; সময়সূচির পুরনো ক্রম(member.prayerLayout) fallback।
export function resolveTab(tab, tabLayout, legacyPrayerOrder) {
  const t = tabLayout && typeof tabLayout === "object" && !Array.isArray(tabLayout) ? tabLayout : {};
  const rawOrder = t[tab + "Order"] !== undefined ? t[tab + "Order"] : tab === "prayer" ? legacyPrayerOrder : undefined;
  return { order: sanitizeOrder(tab, rawOrder), hidden: sanitizeHidden(tab, t[tab + "Hidden"]) };
}

// দেখানোর তালিকা: ক্রম অনুযায়ী, লুকানো বাদে।
export function visibleIds(tab, tabLayout, legacyPrayerOrder) {
  const { order, hidden } = resolveTab(tab, tabLayout, legacyPrayerOrder);
  return order.filter(id => !hidden.includes(id));
}

export function moveId(list, id, dir) {
  const i = list.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return [...list];
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
