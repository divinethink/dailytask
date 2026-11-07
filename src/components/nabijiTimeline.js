// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ডের ডেটা ও pure লজিক (React/DB/network কিছুই ছোঁয় না)।
// Firestore doc: publicToolsContent/homeCard_nabijiTimeline → { nabijiTimeline: { slots:[...] } }(additive, নতুন doc; Rules বদলায় না)।
// slot = { id, icon, title, from, to, items:[{ cat, text, src }] }; from/to = ২৪-ঘণ্টার ঘণ্টা [from,to), to > from, রাত পেরোলে to ≥ ২৪ (যেমন ২২→২৭ = রাত ১০টা–ভোর ৩টা)।
// doc না থাকলে/ভুল গঠনে/slots খালি থাকলে নিচের DEFAULT_SLOTS — কার্ড আগের মতোই চলে। প্রতিটি বুলেটের সূত্র সহিহ হাদিসগ্রন্থ থেকে ওয়েবে মিলিয়ে নেওয়া।
// ভাষা নিজের লেখা (কোনো বই থেকে হুবহু নেওয়া নয়)। সময় এখনো স্থির ঘণ্টা-ভিত্তিক (আসল ওয়াক্ত-সময় নয়)।

export const NABIJI_SECTION_ID = "homeCard_nabijiTimeline";
export const MAX_SLOTS = 14;
export const MAX_ITEMS = 12;
export const LIMITS = { icon: 8, title: 60, text: 500, src: 120 };
// বুলেটের ধরন(ঐচ্ছিক): কার্ডে ছোট লেবেল হয়ে দেখা যায়; অচেনা/খালি মান = লেবেল নেই।
export const CATS = {
  ibadat: { label: "ইবাদত", cls: "bg-emerald-100 text-emerald-800" },
  family: { label: "পরিবার", cls: "bg-rose-100 text-rose-800" },
  society: { label: "সমাজ", cls: "bg-sky-100 text-sky-800" },
  work: { label: "কর্ম", cls: "bg-amber-100 text-amber-800" },
  learn: { label: "শিক্ষা", cls: "bg-indigo-100 text-indigo-800" },
};

export const DEFAULT_SLOTS = [
  { id: "s_lastNight", icon: "🌙", title: "শেষ রাত", from: 3, to: 5, items: [
    { cat: "ibadat", text: "রাতের শেষ তৃতীয়াংশে আল্লাহ দুনিয়ার আসমানে নেমে এসে ডাকেন: কে দুআ করবে, কবুল করব; কে চাইবে, দেব; কে ক্ষমা চাইবে, ক্ষমা করব।", src: "সহিহ বুখারি ১১৪৫" },
    { cat: "ibadat", text: "রাতের সালাত ছিল (সাধারণত) তের রাকাত।", src: "সহিহ বুখারি ১১৩৮" },
    { cat: "ibadat", text: "এত দীর্ঘ সালাত পড়তেন যে পা ফুলে যেত। কারণ জানতে চাইলে বলতেন: আমি কি কৃতজ্ঞ বান্দা হব না?", src: "সহিহ বুখারি ১১৩০" },
    { cat: "ibadat", text: "রাতে ঘুম থেকে উঠে মিসওয়াক করতেন।", src: "সহিহ বুখারি ২৪৫" },
    { cat: "family", text: "বিতরের সময় ঘুমন্ত স্ত্রীকে জাগিয়ে দিতেন, তিনিও বিতর পড়তেন।", src: "সহিহ বুখারি ৯৯৭" },
  ] },
  { id: "s_fajr", icon: "🌅", title: "ফজর ও সূর্য ওঠা পর্যন্ত", from: 5, to: 7, items: [
    { cat: "ibadat", text: "ফজরের দুই রাকাত সুন্নতকে দুনিয়া ও তার সবকিছুর চেয়ে উত্তম বলেছেন।", src: "সহিহ মুসলিম ৭২৫" },
    { cat: "ibadat", text: "ফজরের ফরজের পর সূর্য ভালোভাবে উঠা পর্যন্ত সালাতের জায়গায় বসে থাকতেন, তারপর উঠতেন।", src: "সহিহ মুসলিম ৬৭০" },
    { cat: "ibadat", text: "ফজরের পর থেকে সূর্য ওঠা পর্যন্ত যারা আল্লাহর যিকির করে, তাদের সাথে বসাকে চারজন দাস মুক্ত করার চেয়েও প্রিয় বলেছেন।", src: "সুনানে আবু দাউদ ৩৬৬৭ (হাসান — আলবানি)" },
    { cat: "ibadat", text: "জামাআতে ফজর পড়ে সূর্য ওঠা পর্যন্ত যিকিরে মগ্ন থেকে, সূর্য একটু উপরে উঠলে (আলেমদের ব্যাখ্যায় প্রায় ১৫-২০ মিনিট পর) দুই রাকাত সালাত পড়লে পূর্ণ হজ ও উমরার সওয়াব। (হাদিসটির মান নিয়ে আলেমদের মতভেদ আছে; তিরমিযি ও আলবানি হাসান বলেছেন, কেউ কেউ দুর্বল বলেছেন।)", src: "জামে তিরমিযি ৫৮৬" },
    { cat: "learn", text: "সালাতের পর সাহাবিদের দিকে ফিরে জিজ্ঞেস করতেন, কেউ রাতে স্বপ্ন দেখেছে কি না। কেউ বললে শুনে \"মা শা আল্লাহ\" বলতেন।", src: "সহিহ বুখারি ১৩৮৬" },
    { cat: "society", text: "সাহাবিরা জাহেলি যুগের গল্প করে হাসতেন; তিনি শুধু মুচকি হাসতেন।", src: "সহিহ মুসলিম ৬৭০" },
  ] },
  { id: "s_duha", icon: "☀️", title: "সকাল (দুহা)", from: 7, to: 9, items: [
    { cat: "ibadat", text: "দুহার সালাত পড়তেন চার রাকাত, কখনো আল্লাহর ইচ্ছায় আরও বেশি।", src: "সহিহ মুসলিম ৭১৯" },
    { cat: "ibadat", text: "প্রতিদিন শরীরের প্রতিটি জোড়ার সদকা আছে; দুহার দুই রাকাত সব জোড়ার সদকার জন্য যথেষ্ট।", src: "সহিহ মুসলিম ৭২০" },
    { cat: "ibadat", text: "আবু হুরায়রা (রা.)-কে তিনটি অসিয়ত করেছিলেন: প্রতি মাসে তিন দিন রোজা, দুহার দুই রাকাত এবং ঘুমের আগে বিতর।", src: "সহিহ বুখারি ১৯৮১" },
  ] },
  { id: "s_work", icon: "💼", title: "দিনের কাজ ও পরিবার", from: 9, to: 12, items: [
    { cat: "family", text: "ঘরে থাকলে পরিবারের কাজে ব্যস্ত থাকতেন; সালাতের সময় হলে সালাতে চলে যেতেন।", src: "সহিহ বুখারি ৬৭৬" },
    { cat: "family", text: "ঘরে ঢুকে প্রথমেই মিসওয়াক করতেন।", src: "সহিহ মুসলিম ২৫৩" },
    { cat: "family", text: "নাতি হাসানকে চুমু দিয়ে বলেছেন: যে দয়া করে না, তাকে দয়া করা হয় না।", src: "সহিহ বুখারি ৫৯৯৭" },
    { cat: "family", text: "শিশুদের পাশ দিয়ে গেলে তাদের সালাম দিতেন।", src: "সহিহ বুখারি ৬২৪৭" },
    { cat: "work", text: "বলেছেন: নিজ হাতের উপার্জনের চেয়ে উত্তম খাবার কেউ খায়নি; দাউদ (আ.) নিজ হাতের কামাই খেতেন।", src: "সহিহ বুখারি ২০৭২" },
    { cat: "work", text: "যে ক্রয়-বিক্রয় ও পাওনা আদায়ে নম্র ও সহজ, তার জন্য আল্লাহর রহমতের দুআ করেছেন।", src: "সহিহ বুখারি ২০৭৬" },
    { cat: "work", text: "ক্রেতা-বিক্রেতা সত্য বললে ও দোষ-গুণ স্পষ্ট করলে লেনদেনে বরকত হয়; মিথ্যা বললে বা দোষ লুকালে বরকত চলে যায়।", src: "সহিহ বুখারি ২০৭৯" },
    { cat: "work", text: "খাদ্যশস্যের স্তূপের নিচে ভেজা শস্য দেখে বিক্রেতাকে তা ওপরে রাখতে বললেন, আর বললেন: যে ধোঁকা দেয় সে আমার দলের নয়।", src: "সহিহ মুসলিম ১০২" },
    { cat: "society", text: "আনাস (রা.) দশ বছর খেদমত করেছেন; নবিজি কখনো \"উফ\" বলেননি, \"কেন করলে/করোনি\"ও বলেননি।", src: "সহিহ মুসলিম ২৩০৯" },
    { cat: "society", text: "প্রতিবেশীকে কষ্ট না দেওয়া, মেহমানের সম্মান করা এবং ভালো কথা বলা বা চুপ থাকার শিক্ষা দিতেন।", src: "সহিহ বুখারি ৬০১৮" },
    { cat: "ibadat", text: "দিনে সত্তর বারের বেশি আল্লাহর কাছে ক্ষমা চাইতেন ও তাওবা করতেন।", src: "সহিহ বুখারি ৬৩০৭" },
  ] },
  { id: "s_afternoon", icon: "🤝", title: "দুপুর ও বিকাল", from: 12, to: 16, items: [
    { cat: "ibadat", text: "যোহরের আগে দুই ও পরে দুই রাকাত সুন্নত পড়তেন।", src: "সহিহ বুখারি ৯৩৭" },
    { cat: "society", text: "অসুস্থকে দেখতে যাওয়া এক মুসলিমের ওপর আরেক মুসলিমের হক।", src: "রিয়াদুস সালিহিন ৮৯৫ (বুখারি-মুসলিম)" },
    { cat: "society", text: "তাঁর খেদমত করত এমন এক অসুস্থ ইহুদি বালককে দেখতে গিয়ে মাথার কাছে বসে ইসলামের দাওয়াত দিলেন; সে মুসলিম হলে তিনি আল্লাহর শুকরিয়া জানালেন।", src: "সহিহ বুখারি ১৩৫৬" },
    { cat: "society", text: "অসুস্থ সাহাবি সাদ ইবনু উবাদা (রা.)-কে কয়েকজন সাহাবিসহ দেখতে গিয়ে কেঁদেছিলেন; বলেছেন, চোখের পানি ও অন্তরের দুঃখের জন্য আল্লাহ শাস্তি দেন না।", src: "সহিহ বুখারি ১৩০৪" },
    { cat: "society", text: "প্রতি শনিবার কুবা মসজিদে যেতেন, কখনো হেঁটে, কখনো বাহনে।", src: "সহিহ বুখারি ১১৯৩" },
    { cat: "learn", text: "সাহাবিরা যাতে বিরক্ত না হন, সেজন্য উপদেশ বেছে বেছে নির্দিষ্ট বিরতিতে দিতেন।", src: "সহিহ বুখারি ৬৮" },
  ] },
  { id: "s_asr", icon: "🌤️", title: "আসর", from: 16, to: 17, items: [
    { cat: "family", text: "আসরের সালাতের পর স্ত্রীদের ঘরে ঘুরে যেতেন এবং কারও কাছে কিছু সময় কাটাতেন।", src: "সহিহ বুখারি ৫২১৬" },
    { cat: "ibadat", text: "আসর থেকে সূর্যাস্ত পর্যন্ত যারা আল্লাহর যিকির করে, তাদের সাথে বসাকেও চারজন দাস মুক্ত করার চেয়ে প্রিয় বলেছেন।", src: "সুনানে আবু দাউদ ৩৬৬৭ (হাসান — আলবানি)" },
    { cat: "society", text: "আসরের সালাতের পর দ্রুত ঘরে গিয়ে ঘরে থাকা সদকার সোনা বণ্টনের নির্দেশ দিলেন; রাতভর তা ঘরে থাকুক, চাননি।", src: "সহিহ বুখারি ১৪৩০" },
  ] },
  { id: "s_maghrib", icon: "🌇", title: "মাগরিব", from: 17, to: 19, items: [
    { cat: "ibadat", text: "মাগরিবের পর ঘরে গিয়ে দুই রাকাত সুন্নত পড়তেন।", src: "সহিহ বুখারি ৯৩৭" },
    { cat: "family", text: "সাফিয়্যা (রা.)-কে উটে ওঠাতে নিজের হাঁটু পেতে দিতেন।", src: "সহিহ বুখারি ৪২১১" },
    { cat: "family", text: "আয়েশা (রা.) পান করে পাত্র দিলে, পাত্রের যে জায়গায় তাঁর মুখ লেগেছিল সেখানেই মুখ দিয়ে পান করতেন (ঋতুস্রাবের সময়েও)।", src: "সহিহ মুসলিম ৩০০" },
  ] },
  { id: "s_isha", icon: "🌃", title: "ইশা", from: 19, to: 22, items: [
    { cat: "ibadat", text: "ইশা দেরিতে পড়তেন; কখনো এত দেরিতে যে নারী-শিশুরা ঘুমিয়ে যেত। সাধারণত সন্ধ্যার আভা শেষ হওয়া থেকে রাতের প্রথম তৃতীয়াংশের মধ্যে পড়তেন।", src: "সহিহ বুখারি ৫৬৯" },
    { cat: "ibadat", text: "ইশার আগে ঘুমানো এবং ইশার পরে অকারণ গল্প করা অপছন্দ করতেন।", src: "সহিহ বুখারি ৫৬৮" },
    { cat: "ibadat", text: "ইশার পর ঘরে দুই রাকাত সুন্নত পড়তেন।", src: "সহিহ বুখারি ৯৩৭" },
    { cat: "family", text: "বলেছেন: তোমাদের মধ্যে সে-ই উত্তম, যে তার পরিবারের কাছে উত্তম; আমি আমার পরিবারের কাছে তোমাদের সবার চেয়ে উত্তম।", src: "জামে তিরমিযি ৩৮৯৫ (সহিহ)" },
    { cat: "family", text: "সফরে আয়েশা (রা.)-এর সাথে দৌড় প্রতিযোগিতা করেছেন; প্রথমবার আয়েশা জিতলেন, পরে তিনি জিতে বললেন: এটা সেই বারের শোধ।", src: "সুনানে আবু দাউদ ২৫৭৮ (সহিহ — আলবানি)" },
    { cat: "family", text: "নারীদের সাথে ভালো ব্যবহারের উপদেশ দিয়েছেন; বলেছেন, নারী পাঁজরের হাড়ের মতো, জোর করে সোজা করতে গেলে ভেঙে যাবে।", src: "সহিহ বুখারি ৫১৮৫-৫১৮৬" },
  ] },
  { id: "s_sleep", icon: "🛏️", title: "ঘুমের আগে", from: 22, to: 27, items: [
    { cat: "ibadat", text: "ঘুমের আগে সালাতের মতো ওজু করে ডান কাতে শুয়ে দুআ পড়তে শিখিয়েছেন; এটাই যেন শেষ কথা হয়।", src: "সহিহ বুখারি ৬৩১১" },
    { cat: "ibadat", text: "প্রতি রাতে দুই হাতে সুরা ইখলাস, ফালাক ও নাস পড়ে ফুঁ দিয়ে মাথা-মুখ-শরীরে হাত বুলাতেন (তিনবার)।", src: "সহিহ বুখারি ৫০১৭" },
    { cat: "ibadat", text: "শোয়ার সময় আয়াতুল কুরসি পড়লে সকাল পর্যন্ত আল্লাহর পক্ষ থেকে হেফাযতকারী থাকে, শয়তান কাছে আসে না।", src: "সহিহ বুখারি ২৩১১" },
    { cat: "family", text: "মেয়ে-জামাই ফাতিমা-আলীকে ঘুমের আগে ৩৪ বার আল্লাহু আকবার, ৩৩ বার সুবহানাল্লাহ ও ৩৩ বার আলহামদুলিল্লাহ পড়তে শিখিয়েছেন; এটি খাদেমের চেয়ে উত্তম।", src: "সহিহ বুখারি ৩৭০৫" },
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
  const cat = typeof raw.cat === "string" && Object.prototype.hasOwnProperty.call(CATS, raw.cat) ? raw.cat : "";
  return { cat, text, src: str(raw.src, LIMITS.src) };
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
