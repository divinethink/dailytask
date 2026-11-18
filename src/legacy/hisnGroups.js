// hisnGroups.js — হিসনুল মুসলিমের অধ্যায়গুলো বিষয়ভিত্তিক গ্রুপে ভাগ (pure, node --test-যোগ্য)।
// ডেটা-ফাইলে কোনো নতুন ফিল্ড নেই: অধ্যায়-নম্বর (id) → গ্রুপ, এই তালিকাই একমাত্র সোর্স।
// নতুন ব্যাচের কোনো অধ্যায় এখানে না থাকলে "অন্যান্য" গ্রুপে আসে — কখনো হারায় না।

export const HISN_GROUPS = [
  { key: "dailyRest", title: "সকাল-সন্ধ্যা, ঘুম ও জাগা", ids: [27, 1, 28, 29, 30, 31] },
  { key: "dressClean", title: "পোশাক ও পবিত্রতা", ids: [2, 3, 4, 5, 6, 7, 8, 9] },
  { key: "homeMosque", title: "ঘর ও মসজিদ", ids: [10, 11, 12, 13, 14, 15] },
  { key: "salah", title: "নামাজ", ids: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 32, 33] },
  { key: "foodFast", title: "খাওয়া ও রোযা", ids: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76] },
  { key: "social", title: "পরিবার ও সামাজিক জীবন", ids: [48, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 89, 90, 91, 93, 106, 108, 109, 112, 113, 114] },
  { key: "hardship", title: "বিপদ, ভয় ও দুশ্চিন্তা", ids: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 53, 88, 92, 94, 122, 123, 124, 125, 126, 128, 129] },
  { key: "illDeath", title: "রোগ, মৃত্যু ও কবর", ids: [49, 50, 51, 52, 54, 55, 56, 57, 58, 59, 60] },
  { key: "nature", title: "আবহাওয়া ও প্রকৃতি", ids: [61, 62, 63, 64, 65, 66, 110, 111] },
  { key: "travelHajj", title: "সফর, হজ্জ ও কুরবানি", ids: [95, 96, 97, 99, 100, 101, 102, 103, 104, 105, 115, 116, 117, 118, 119, 120, 121, 127] },
  { key: "virtue", title: "ফযীলত ও আদব", ids: [107, 130, 131, 132] },
];

const OTHER = { key: "other", title: "অন্যান্য" };

// chapters = buildChapters(...)-এর ফল। ফেরত: [{key,title,chapters:[...]}]; গ্রুপের ভেতরে ids-এর ক্রম, খালি গ্রুপ বাদ।
export function groupChapters(chapters) {
  const byId = new Map(chapters.map((c) => [c.id, c]));
  const used = new Set();
  const out = [];
  for (const g of HISN_GROUPS) {
    const list = g.ids.map((id) => byId.get(id)).filter(Boolean);
    list.forEach((c) => used.add(c.id));
    if (list.length) out.push({ key: g.key, title: g.title, chapters: list });
  }
  const rest = chapters.filter((c) => !used.has(c.id));
  if (rest.length) out.push({ ...OTHER, chapters: rest });
  return out;
}

// হোম পেজের "দ্রুত যান" চিপ: সরাসরি একটা অধ্যায়ে (id হিসনের অধ্যায়-নম্বর)। এক নজরে সবচেয়ে বেশি লাগে এমন বিষয়।
export const QUICK_CHIPS = [
  { label: "ঘুমানোর সময়", id: 28 },
  { label: "খাওয়ার আগে", id: 69 },
  { label: "খাওয়ার পরে", id: 70 },
  { label: "টয়লেট", id: 6 },
  { label: "ঘর থেকে বের হওয়া", id: 10 },
  { label: "মসজিদে প্রবেশ", id: 13 },
  { label: "সফরের দু'আ", id: 96 },
  { label: "বিপদে পড়লে", id: 53 },
];

// গ্রুপের ক্রম ধরে সব অধ্যায়ের চ্যাপ্টার-id-এর সমতল তালিকা।
export function flatChapterIds(groups) {
  return groups.flatMap((g) => g.chapters.map((c) => c.id));
}

// আগের/পরের অধ্যায় (গ্রুপের ক্রমে); প্রান্তে বা অজানা id-তে null।
export function neighbors(groups, id) {
  const ids = flatChapterIds(groups);
  const i = ids.indexOf(id);
  if (i < 0) return { prev: null, next: null };
  return { prev: i > 0 ? ids[i - 1] : null, next: i < ids.length - 1 ? ids[i + 1] : null };
}

// id যে গ্রুপে আছে (ফেরার বোতামের লেখার জন্য); না পেলে null।
export function groupOf(groups, id) {
  return groups.find((g) => g.chapters.some((c) => c.id === id)) || null;
}

// সোয়াইপ-দিশা (swipeDelta: -1 = আগের, +1 = পরের) অনুযায়ী যে অধ্যায়ে যাবে; প্রান্তে/০ হলে null।
export function chapterBySwipe(groups, id, delta) {
  if (delta === 0) return null;
  const nb = neighbors(groups, id);
  return delta < 0 ? nb.prev : nb.next;
}
