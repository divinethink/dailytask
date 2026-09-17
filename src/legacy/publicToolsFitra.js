// publicToolsFitra.js — ফিতরা(সদকাতুল ফিতর) ক্যালকুলেটর লজিক(3_1 Phase B item ১২)।
// Pure math, কোনো UI/SDK না(Dev Rule ২: lib/data layer)। শস্য-ভিত্তিক নির্ধারিত
// ওজন(fiqh-standard) × ইউজার-ইনপুট কেজি-দর — কোনো live grain-price API নেই(Zakat-এর
// একই owner-approved manual-input সিদ্ধান্ত, নতুন external service নয়)।

// Hanafi fiqh-এ প্রচলিত আনুমানিক ওজন(১ সা'-ভিত্তিক হিসাব)।
const FITRA_GRAIN_WEIGHT_KG = {
  wheat: 1.75, // গম/আটা — অর্ধ সা'
  barley: 3.5, // যব — ১ সা'
  dates: 3.5, // খেজুর — ১ সা'
};

const FITRA_GRAIN_LABELS = {
  wheat: "গম/আটা",
  barley: "যব",
  dates: "খেজুর",
};

function calculateFitra({ grain, pricePerKg = 0, headCount = 1 }) {
  const weightKg = FITRA_GRAIN_WEIGHT_KG[grain] || 0;
  const perHead = weightKg * pricePerKg;
  const safeHeadCount = Math.max(0, headCount);
  const total = perHead * safeHeadCount;
  return { weightKg, perHead, total, headCount: safeHeadCount };
}

export { calculateFitra, FITRA_GRAIN_WEIGHT_KG, FITRA_GRAIN_LABELS };
