// quranFonts.js — আরবি ফন্টের তালিকা (pure, node --test-যোগ্য)। ধাপ ৬গ-১।
// scripts: কোন আরবি লেখার ধরনের সাথে ফন্টটা মানানসই (এখন শুধু "simple"; উসমানি/IndoPak আসবে ৬গ-২/৬গ-৩-এ)।
// file: নিজেদের সার্ভারের ফাইল (/quran/v1/fonts/…, অফলাইনেও চলে); google: ফাইল না থাকলে বাছার পরে Google Fonts থেকে নামে।
// ফাইল পরে যোগ করতে চাইলে শুধু file বসান (ও google = null) — অন্য কোড বদলাতে হবে না।
// সব ফন্টের লাইসেন্স SIL OFL 1.1।

export const DEFAULT_FONT = "amiri-quran";
export const FONT_SAMPLE = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

export const QURAN_FONTS = [
  { id: "amiri-quran", name: "আমিরি কুরআন", family: "Amiri Quran", scripts: ["simple"], file: "/quran/v1/fonts/amiri-quran-arabic-400.woff2", google: null, license: "SIL OFL 1.1" },
  { id: "noto-naskh", name: "নোটো নাসখ", family: "Noto Naskh Arabic", scripts: ["simple"], file: null, google: "Noto+Naskh+Arabic:wght@400", license: "SIL OFL 1.1" },
  { id: "scheherazade", name: "শেহেরাজাদে নিউ", family: "Scheherazade New", scripts: ["simple"], file: null, google: "Scheherazade+New:wght@400", license: "SIL OFL 1.1" },
];

export const fontById = (id) => QURAN_FONTS.find((f) => f.id === id) || null;
export const isValidFont = (id) => !!fontById(id);
export const fontsForScript = (script) => QURAN_FONTS.filter((f) => f.scripts.includes(script));

// CSS font-family: বাছা ফন্ট আগে; না নামা পর্যন্ত বা ব্যর্থ হলে আমিরি ও সিস্টেমের নাসখ-এ ফিরে যায়।
export function fontStack(id) {
  const f = fontById(id) || fontById(DEFAULT_FONT);
  return "'" + f.family + "', 'Amiri Quran', 'Noto Naskh Arabic', serif";
}
