// publicToolsZakat.js — যাকাত ক্যালকুলেটর লজিক(3_1 Phase B item ১১)। Pure math,
// কোনো UI/SDK না(Dev Rule ২: lib/data layer)। নিসাব-ভিত্তি: ইউজার নিজে সোনা/রুপার
// বর্তমান দর ইনপুট দেন(কোনো live gold-price API ব্যবহার হয়নি — নতুন external
// service, Dev Rule ২-এর বাইরে; owner-approved সিদ্ধান্ত)।

// Nisab(fixed শরয়ি ওজন, দর নয়): সোনা ৮৭.৪৮ গ্রাম, রুপা ৬১২.৩৬ গ্রাম।
const GOLD_NISAB_GRAMS = 87.48;
const SILVER_NISAB_GRAMS = 612.36;
const ZAKAT_RATE = 0.025;

// দুই ধাতুর নিসাব-মূল্যের মধ্যে যেটা কম(silver-basis সাধারণত কম থ্রেশহোল্ড দেয়,
// ফিকহি দিক থেকে বেশি সতর্কতামূলক/conservative — বেশি মানুষ যাকাত-প্রযোজ্য হন)।
// শুধু যে ধাতুর দর দেওয়া হয়েছে সেটাই বিবেচনা করা হয়।
function calculateNisabValue({ goldPricePerGram = 0, silverPricePerGram = 0 }) {
  const candidates = [];
  if (goldPricePerGram > 0) candidates.push(GOLD_NISAB_GRAMS * goldPricePerGram);
  if (silverPricePerGram > 0) candidates.push(SILVER_NISAB_GRAMS * silverPricePerGram);
  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
}

function calculateZakat({
  cash = 0,
  goldGrams = 0,
  goldPricePerGram = 0,
  silverGrams = 0,
  silverPricePerGram = 0,
  investments = 0,
  debts = 0,
}) {
  const goldValue = goldGrams * goldPricePerGram;
  const silverValue = silverGrams * silverPricePerGram;
  const totalAssets = cash + goldValue + silverValue + investments;
  const netAssets = Math.max(0, totalAssets - debts);
  const nisab = calculateNisabValue({ goldPricePerGram, silverPricePerGram });
  const eligible = nisab > 0 && netAssets >= nisab;
  const zakatDue = eligible ? netAssets * ZAKAT_RATE : 0;
  return { totalAssets, netAssets, nisab, eligible, zakatDue };
}

export { calculateZakat, calculateNisabValue, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, ZAKAT_RATE };
