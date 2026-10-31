// হোম কার্ড কাস্টমাইজ (ধাপ ক, owner-approved) — pure logic, React/DB নেই।
// member.homeLayout ঐচ্ছিক: না থাকলে/অবৈধ হলে ডিফল্ট = আগের আচরণ হুবহু।
// দুটো অঞ্চল(zone): entry = দৈনিক-এন্ট্রি অংশের কার্ড; below = সেভ-বাটনের নিচের সেকশন।
// অচেনা বা ডুপ্লিকেট id বাদ; নতুন কার্ড(সেভ-করা তালিকায় নেই) ডিফল্ট ক্রমে শেষে যোগ হয়।
// fold: fixed = সবসময় খোলা(ভাঁজ হয় না); open/closed = ভাঁজযোগ্য, শুরুতে খোলা/বন্ধ।

export const ZONES = ["entry", "below"];
export const ZONE_LABEL = {
  entry: "আমল-এন্ট্রির কার্ড",
  below: "সেভ-বাটনের নিচের সেকশন"
};
export const FOLDS = ["fixed", "open", "closed"];
export const FOLD_LABEL = { fixed: "স্থির (সবসময় খোলা)", open: "খোলা থাকবে", closed: "বন্ধ থাকবে" };
export const MAX_CARDS_PER_ZONE = 20;

const d = (id, title, defaultFold) => ({ id, title, defaultFold });

// ক্রম ও ডিফল্ট fold = বর্তমান হোম পেজের হুবহু আচরণ।
export const CARD_DEFS = {
  entry: [
    d("tazkirah", "আজকের বাণী", "fixed"),
    d("salah", "সালাত ও সিয়াম", "open"),
    d("quranIlm", "কুরআন ও ইলম", "closed"),
    d("dhikrDawah", "যিকির ও দাওয়াহ", "closed"),
    d("duniya", "ব্যক্তিগত ও পারিবারিক অভ্যাস", "closed"),
    d("other", "কাস্টম টাস্ক", "closed"),
    d("dayNote", "দিনের নোট", "closed")
  ],
  below: [
    d("streak", "স্ট্রিক ও আজকের অগ্রগতি", "fixed"),
    d("insight", "দৈনিক অন্তর্দৃষ্টি", "fixed"),
    d("focus", "আগামীকালের ফোকাস", "fixed"),
    d("monthly", "মাসিক ওভারভিউ", "fixed"),
    d("weekly", "সাপ্তাহিক রিফ্লেকশন", "closed"),
    d("meeting", "মাসিক পারিবারিক সভা ও সিদ্ধান্ত", "closed")
  ]
};

export function cardTitle(zone, id) {
  const f = CARD_DEFS[zone].find(x => x.id === id);
  return f ? f.title : id;
}

export function defaultCards(zone) {
  return CARD_DEFS[zone].map(x => ({ id: x.id, visible: true, fold: x.defaultFold }));
}

export function defaultLayout() {
  return { entry: defaultCards("entry"), below: defaultCards("below") };
}

const isObj = v => typeof v === "object" && v !== null && !Array.isArray(v);

/** সেভ-করা তালিকা → বৈধ তালিকা। একটা কার্ডের মান ভুল হলে শুধু সেটা বাদ যায়(ডিফল্টে ফেরে); বাকি অক্ষত। */
export function sanitizeCards(zone, raw) {
  const known = new Set(CARD_DEFS[zone].map(x => x.id));
  const seen = new Set();
  const out = [];
  if (Array.isArray(raw)) {
    for (const item of raw.slice(0, MAX_CARDS_PER_ZONE)) {
      if (!isObj(item)) continue;
      const { id, visible, fold } = item;
      if (typeof id !== "string" || !known.has(id) || seen.has(id)) continue;
      if (typeof visible !== "boolean" || !FOLDS.includes(fold)) continue;
      seen.add(id);
      out.push({ id, visible, fold });
    }
  }
  for (const x of CARD_DEFS[zone]) {
    if (!seen.has(x.id)) out.push({ id: x.id, visible: true, fold: x.defaultFold });
  }
  return out;
}

export function sanitizeLayout(raw) {
  const r = isObj(raw) ? raw : {};
  return { entry: sanitizeCards("entry", r.entry), below: sanitizeCards("below", r.below) };
}

/** একটা কার্ড ওপরে(-1)/নিচে(+1) সরানো; সীমার বাইরে হলে অপরিবর্তিত। নতুন অ্যারে ফেরত। */
export function moveCard(list, id, dir) {
  const i = list.findIndex(c => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return [...list];
  const next = [...list];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next;
}

export function updateCard(list, id, patch) {
  return list.map(c => (c.id === id ? { ...c, ...patch } : c));
}

export function sameLayout(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
