// quranFonts.js — আরবি লেখার ধরন ও ফন্টের তালিকা (pure, node --test-যোগ্য)। ধাপ ৬গ-১/৬গ-২/৬গ-৩।
// scripts: কোন লেখার ধরনের সাথে ফন্টটা মানানসই। ফন্ট শুধু তার নিজের লেখার সাথেই দেখানো হয় (জোড়া ভুল হলে অক্ষর ভাঙে)।
//   "simple" = Tanzil Simple (/quran/v1/ar), "uthmani" = Tanzil Uthmani (/quran/v1/ar-uthmani); "indopak" = IndoPak/নাস্তালিক (/quran/v1/ar-indopak-dk, DigitalKhatt)।
// file: নিজেদের সার্ভারের ফাইল (অফলাইনেও চলে); google: (এখন সব ফন্টেরই নিজের ফাইল আছে; এই ক্ষেত্র ভবিষ্যতের জন্য, বর্তমানে null)।
// লাইসেন্স: Amiri/Noto/Scheherazade = SIL OFL 1.1; KFGQPC/Me Quran = অপরিবর্তিত রাখার শর্তে; DigitalKhatt IndoPak = SIL OFL 1.1, অপরিবর্তিত (NOTICE-fonts.txt)।

export const DEFAULT_FONT = "amiri-quran";
export const FONT_SAMPLE = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

export const SCRIPTS = [
  { id: "simple", name: "সরল (Simple)", note: "সহজে পড়া যায়; খোঁজা এই লেখাতেই চলে", dir: "ar", sample: FONT_SAMPLE, bismillah: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", defaultFont: "amiri-quran" },
  { id: "uthmani", name: "উসমানি", note: "মাদানী মুসহাফের রীতি (Tanzil Uthmani)", dir: "ar-uthmani", sample: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", bismillah: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", defaultFont: "kfgqpc-hafs" },
  { id: "indopak", name: "ইন্দো-পাক (নাস্তালিক)", note: "উপমহাদেশের মুসহাফের রীতি (DigitalKhatt)", dir: "ar-indopak-dk", sample: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ", bismillah: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ", defaultFont: "alquran-indopak" },
];
export const DEFAULT_SCRIPT = "simple";
export const scriptById = (id) => SCRIPTS.find((s) => s.id === id) || null;
export const isValidScript = (id) => !!scriptById(id);

export const QURAN_FONTS = [
  { id: "amiri-quran", name: "আমিরি কুরআন", family: "Amiri Quran", scripts: ["simple", "uthmani"], file: "/quran/v1/fonts/amiri-quran-arabic-400.woff2", google: null, license: "SIL OFL 1.1" },
  { id: "noto-naskh", name: "নোটো নাসখ", family: "Noto Naskh Arabic", scripts: ["simple"], file: "/quran/v1/fonts/noto-naskh-arabic-400.woff2", google: null, license: "SIL OFL 1.1" },
  { id: "scheherazade", name: "শেহেরাজাদে নিউ", family: "Scheherazade New", scripts: ["simple"], file: "/quran/v1/fonts/scheherazade-new-400.woff2", google: null, license: "SIL OFL 1.1" },
  { id: "kfgqpc-hafs", name: "কেএফজিকিউপিসি হাফস", family: "KFGQPC Uthmanic Script HAFS", scripts: ["uthmani"], file: "/quran/v1/fonts/kfgqpc-hafs-regular.otf", google: null, license: "KFGQPC (অপরিবর্তিত রাখার শর্তে)" },
  { id: "me-quran", name: "মি কুরআন", family: "Me Quran", scripts: ["uthmani"], file: "/quran/v1/fonts/me-quran-regular.ttf", google: null, license: "Tanzil me_quran (অপরিবর্তিত)" },
  { id: "alquran-indopak", name: "ডিজিটাল খাত্ত ইন্দো-পাক", family: "DigitalKhatt IndoPak", scripts: ["indopak"], file: "/quran/v1/fonts/digitalkhatt-indopak.otf", google: null, license: "SIL OFL 1.1 (DigitalKhatt, অপরিবর্তিত)" },
];

export const fontById = (id) => QURAN_FONTS.find((f) => f.id === id) || null;
export const isValidFont = (id) => !!fontById(id);
export const fontsForScript = (script) => QURAN_FONTS.filter((f) => f.scripts.includes(script));
export const fontFitsScript = (fontId, script) => { const f = fontById(fontId); return !!f && f.scripts.includes(script); };

// CSS font-family: বাছা ফন্ট আগে; না নামা পর্যন্ত বা ব্যর্থ হলে আমিরি ও সিস্টেমের নাসখ-এ ফিরে যায়।
export function fontStack(id) {
  const f = fontById(id) || fontById(DEFAULT_FONT);
  return "'" + f.family + "', 'Amiri Quran', 'Noto Naskh Arabic', serif";
}

// লেখার ধরন-ভিত্তিক বিন্যাস + পাঠকের বাছা এলাইন ও লাইন-ফাঁক (prefs.arAlign / prefs.arGap)।
// ইন্দো-পাক: অক্ষর একটু বড়, লাইনের ফাঁক একটু বেশি। ফোনে পছন্দ না হলে শুধু এই সংখ্যাগুলো বদলান।
export const ALIGNS = [["justify", "দুই পাশ সমান"], ["right", "ডান-ঘেঁষা"], ["center", "মাঝে"]];
export const GAPS = [["tight", "ঘন"], ["normal", "মাঝারি"], ["loose", "ফাঁকা"]];
export const DEFAULT_ALIGN = "justify";
export const DEFAULT_GAP = "normal";
export const isValidAlign = (v) => ALIGNS.some((a) => a[0] === v);
export const isValidGap = (v) => GAPS.some((g) => g[0] === v);
const LINE_H = { tight: 1.8, normal: 2.1, loose: 2.5 };
// DigitalKhatt ফন্ট একই প্রস্থে পুরনো ফন্টের চেয়ে ~১৮% লম্বা, তাই বড়-করার মাত্রা কম (১.১৫ → ১.০৫)।
const SCRIPT_LAYOUT = { indopak: { sizeScale: 1.05, add: 0.3 } };
export function flowLayout(script, align, gap) {
  const sc = SCRIPT_LAYOUT[script] || { sizeScale: 1, add: 0 };
  const a = isValidAlign(align) ? align : DEFAULT_ALIGN;
  const g = isValidGap(gap) ? gap : DEFAULT_GAP;
  return { sizeScale: sc.sizeScale, lineHeight: Math.round((LINE_H[g] + sc.add) * 100) / 100, textAlign: a, textAlignLast: a === "justify" ? "center" : a };
}
