// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ডের ডেটা ও pure লজিক (React/DB/network কিছুই ছোঁয় না)।
// Firestore doc: publicToolsContent/homeCard_nabijiTimeline → { nabijiTimeline: { slots:[...] } }(additive, নতুন doc; Rules বদলায় না)।
// slot = { id, icon, title, from, to, items:[{ text, src }] }; from/to = ২৪-ঘণ্টার ঘণ্টা [from,to), to > from, রাত পেরোলে to ≥ ২৪ (যেমন ২২→২৭ = রাত ১০টা–ভোর ৩টা)।
// doc না থাকলে/ভুল গঠনে/slots খালি থাকলে নিচের DEFAULT_SLOTS — কার্ড আগের মতোই চলে। প্রতিটি বুলেটের সূত্র সহিহ হাদিসগ্রন্থ থেকে ওয়েবে মিলিয়ে নেওয়া।
// ভাষা নিজের লেখা (কোনো বই থেকে হুবহু নেওয়া নয়)। সময় এখনো স্থির ঘণ্টা-ভিত্তিক (আসল ওয়াক্ত-সময় নয়)।

export const NABIJI_SECTION_ID = "homeCard_nabijiTimeline";
export const MAX_SLOTS = 14;
export const MAX_ITEMS = 8;
export const LIMITS = { icon: 8, title: 60, text: 400, src: 120 };

export const DEFAULT_SLOTS = [
  { id: "s_lastNight", icon: "🌙", title: "শেষ রাত", from: 3, to: 5, items: [
    { text: "রাতের শেষ তৃতীয়াংশে আল্লাহ দুনিয়ার আসমানে নেমে এসে ডাকেন: কে দুআ করবে, কবুল করব; কে চাইবে, দেব; কে ক্ষমা চাইবে, ক্ষমা করব।", src: "সহিহ বুখারি ১১৪৫" },
    { text: "রাতে ঘুম থেকে উঠে মিসওয়াক করতেন।", src: "সহিহ বুখারি ২৪৫" },
    { text: "রাতের সালাত ছিল (সাধারণত) তের রাকাত।", src: "সহিহ বুখারি ১১৩৮" },
    { text: "এত দীর্ঘ সালাত পড়তেন যে পা ফুলে যেত। কারণ জানতে চাইলে বলতেন: আমি কি কৃতজ্ঞ বান্দা হব না?", src: "সহিহ বুখারি ১১৩০" },
    { text: "বিতরের সময় ঘুমন্ত স্ত্রীকে জাগিয়ে দিতেন, তিনিও বিতর পড়তেন।", src: "সহিহ বুখারি ৯৯৭" },
  ] },
  { id: "s_fajr", icon: "🌅", title: "ফজর", from: 5, to: 7, items: [
    { text: "ফজরের দুই রাকাত সুন্নতকে দুনিয়া ও তার সবকিছুর চেয়ে উত্তম বলেছেন।", src: "সহিহ মুসলিম ৭২৫" },
    { text: "ফজরের ফরজের পর সূর্য ভালোভাবে উঠা পর্যন্ত সালাতের জায়গায় বসে থাকতেন।", src: "সহিহ মুসলিম ৬৭০" },
  ] },
  { id: "s_duha", icon: "☀️", title: "সকাল (দুহা)", from: 7, to: 11, items: [
    { text: "দুহার সালাত পড়তেন চার রাকাত, কখনো আল্লাহর ইচ্ছায় আরও বেশি।", src: "সহিহ মুসলিম ৭১৯" },
    { text: "প্রতিদিন শরীরের প্রতিটি জোড়ার সদকা আছে; দুহার দুই রাকাত সব জোড়ার সদকার জন্য যথেষ্ট।", src: "সহিহ মুসলিম ৭২০" },
    { text: "আবু হুরায়রা (রা.)-কে তিনটি অসিয়ত করেছিলেন: প্রতি মাসে তিন দিন রোজা, দুহার দুই রাকাত এবং ঘুমের আগে বিতর।", src: "সহিহ বুখারি ১৯৮১" },
  ] },
  { id: "s_family", icon: "🏠", title: "দিনের কাজ ও পরিবার", from: 11, to: 12, items: [
    { text: "ঘরে ঢুকে প্রথমেই মিসওয়াক করতেন।", src: "সহিহ মুসলিম ২৫৩" },
    { text: "ঘরে থাকলে পরিবারের কাজে ব্যস্ত থাকতেন; সালাতের সময় হলে সালাতে চলে যেতেন।", src: "সহিহ বুখারি ৬৭৬" },
    { text: "নাতি হাসানকে চুমু দিয়ে বলেছেন: যে দয়া করে না, তাকে দয়া করা হয় না।", src: "সহিহ বুখারি ৫৯৯৭" },
    { text: "শিশুদের পাশ দিয়ে গেলে তাদের সালাম দিতেন।", src: "সহিহ বুখারি ৬২৪৭" },
    { text: "আনাস (রা.) দশ বছর খেদমত করেছেন; নবিজি কখনো \"উফ\" বলেননি, \"কেন করলে/করোনি\"ও বলেননি।", src: "সহিহ মুসলিম ২৩০৯" },
    { text: "প্রতিবেশীকে কষ্ট না দেওয়া, মেহমানের সম্মান করা এবং ভালো কথা বলা বা চুপ থাকার শিক্ষা দিতেন।", src: "সহিহ বুখারি ৬০১৮" },
    { text: "দিনে সত্তর বারের বেশি আল্লাহর কাছে ক্ষমা চাইতেন ও তাওবা করতেন।", src: "সহিহ বুখারি ৬৩০৭" },
  ] },
  { id: "s_afternoon", icon: "🤝", title: "দুপুর ও বিকাল", from: 12, to: 16, items: [
    { text: "যোহরের আগে দুই ও পরে দুই রাকাত সুন্নত পড়তেন।", src: "সহিহ বুখারি ৯৩৭" },
    { text: "অসুস্থকে দেখতে যাওয়া এক মুসলিমের ওপর আরেক মুসলিমের হক; তিনি অসুস্থ এক ইহুদি বালককেও দেখতে গিয়েছিলেন।", src: "রিয়াদুস সালিহিন ৮৯৫, ৯০০ (বুখারি-মুসলিম)" },
  ] },
  { id: "s_asr", icon: "🌤️", title: "আসর", from: 16, to: 17, items: [
    { text: "আসরের সালাতের পর দ্রুত ঘরে গিয়ে ঘরে থাকা সদকার সোনা বণ্টনের নির্দেশ দিলেন; রাতভর তা ঘরে থাকুক, চাননি।", src: "সহিহ বুখারি ১৪৩০" },
  ] },
  { id: "s_maghrib", icon: "🌇", title: "মাগরিব", from: 17, to: 19, items: [
    { text: "মাগরিবের পর ঘরে গিয়ে দুই রাকাত সুন্নত পড়তেন।", src: "সহিহ বুখারি ৯৩৭" },
  ] },
  { id: "s_isha", icon: "🌃", title: "ইশা", from: 19, to: 22, items: [
    { text: "ইশার আগে ঘুমানো এবং ইশার পরে অকারণ গল্প করা অপছন্দ করতেন।", src: "সহিহ বুখারি ৫৬৮" },
    { text: "ইশার পর ঘরে দুই রাকাত সুন্নত পড়তেন।", src: "সহিহ বুখারি ৯৩৭" },
  ] },
  { id: "s_sleep", icon: "🛏️", title: "ঘুমের আগে", from: 22, to: 27, items: [
    { text: "ঘুমের আগে সালাতের মতো ওজু করে ডান কাতে শুয়ে দুআ পড়তে শিখিয়েছেন; এটাই যেন শেষ কথা হয়।", src: "সহিহ বুখারি ৬৩১১" },
    { text: "প্রতি রাতে দুই হাতে সুরা ইখলাস, ফালাক ও নাস পড়ে ফুঁ দিয়ে মাথা-মুখ-শরীরে হাত বুলাতেন (তিনবার)।", src: "সহিহ বুখারি ৫০১৭" },
    { text: "শোয়ার সময় আয়াতুল কুরসি পড়লে সকাল পর্যন্ত আল্লাহর পক্ষ থেকে হেফাযতকারী থাকে, শয়তান কাছে আসে না।", src: "সহিহ বুখারি ২৩১১" },
    { text: "মেয়ে-জামাই ফাতিমা-আলীকে ঘুমের আগে ৩৪ বার আল্লাহু আকবার, ৩৩ বার সুবহানাল্লাহ ও ৩৩ বার আলহামদুলিল্লাহ পড়তে শিখিয়েছেন; এটি খাদেমের চেয়ে উত্তম।", src: "সহিহ বুখারি ৩৭০৫" },
  ] },
];

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const text = str(raw.text, LIMITS.text);
  if (!text) return null;
  return { text, src: str(raw.src, LIMITS.src) };
}

export function normalizeSlot(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = str(raw.title, LIMITS.title);
  const from = Number(raw.from);
  const to = Number(raw.to);
  if (!title || !Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from < 0 || from > 23 || to <= from || to - from > 24) return null;
  const items = (Array.isArray(raw.items) ? raw.items : []).map(normalizeItem).filter(Boolean).slice(0, MAX_ITEMS);
  if (!items.length) return null;
  return { id: str(raw.id, 60) || "s_" + Math.abs(hash(title + from)), icon: str(raw.icon, LIMITS.icon) || "🕌", title, from, to, items };
}

// raw = Firestore doc data(বা null)। ফেরত: বৈধ slot-তালিকা; কিছু বৈধ না থাকলে DEFAULT_SLOTS।
export function normalizeSlots(raw) {
  const src = raw && typeof raw === "object" && raw.nabijiTimeline && typeof raw.nabijiTimeline === "object" ? raw.nabijiTimeline : {};
  const slots = (Array.isArray(src.slots) ? src.slots : []).map(normalizeSlot).filter(Boolean).slice(0, MAX_SLOTS);
  return slots.length ? slots : DEFAULT_SLOTS;
}

// ঘণ্টা h(০-২৩) slot-এ পড়ে কিনা(রাত-পেরোনো slot সহ)
export function inSlot(h, slot) {
  return (((h - slot.from) % 24) + 24) % 24 < slot.to - slot.from;
}

// এখনকার ঘণ্টার slot। না মিললে(ক্রিয়েটর ফাঁক রাখলে) পরের আসন্ন slot, exact=false।
export function slotAt(slots, hour) {
  const h = ((Math.floor(Number(hour)) % 24) + 24) % 24;
  const hit = slots.find((s) => inSlot(h, s));
  if (hit) return { slot: hit, exact: true };
  let best = null;
  let bestD = 99;
  slots.forEach((s) => {
    const d = (s.from - h + 24) % 24;
    if (d < bestD) { bestD = d; best = s; }
  });
  return best ? { slot: best, exact: false } : null;
}

// ঘণ্টার বাংলা লেবেল: "ভোর ৪টা", "দুপুর ১২টা"। toBn = সংখ্যা→বাংলা ফাংশন।
export function hourLabel(h24, toBn) {
  const h = ((h24 % 24) + 24) % 24;
  const period = h < 4 ? "রাত" : h < 6 ? "ভোর" : h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 17 ? "বিকাল" : h < 19 ? "সন্ধ্যা" : "রাত";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return period + " " + (typeof toBn === "function" ? toBn(h12) : h12) + "টা";
}

export function rangeLabel(slot, toBn) {
  return hourLabel(slot.from, toBn) + " – " + hourLabel(slot.to, toBn);
}

// ফর্ম থেকে আসা slot যাচাই; ভুল থাকলে বাংলা বার্তা, ঠিক থাকলে null। সূত্র বাধ্যতামূলক(সূত্রহীন সুন্নাহ-বুলেট নয়)।
export function validateSlot(form) {
  if (!form || !str(form.title, LIMITS.title)) return "সময়ভাগের নাম লিখুন।";
  const from = Number(form.from);
  const to = Number(form.to);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 23 || to <= from || to - from > 24) return "শুরু ও শেষের সময় ঠিক করুন।";
  const items = Array.isArray(form.items) ? form.items : [];
  if (!items.length) return "অন্তত একটি বুলেট লিখুন।";
  if (items.length > MAX_ITEMS) return "সর্বোচ্চ " + MAX_ITEMS + "টি বুলেট রাখা যায়।";
  for (const it of items) {
    if (!str(it && it.text, LIMITS.text)) return "ফাঁকা বুলেট আছে — লিখুন বা মুছে দিন।";
    if (!str(it && it.src, LIMITS.src)) return "প্রতিটি বুলেটের সূত্র লিখুন (যেমন: সহিহ বুখারি ১১৪৫)।";
  }
  return null;
}

export function makeSlotId() {
  return "s_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}
