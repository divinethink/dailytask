// সোয়াইপ দিয়ে মাস বদলের pure logic (SDK/UI-মুক্ত, node --test দিয়ে টেস্টযোগ্য)।
// আঙুল বাম→ডান (dx>0) = আগের মাস (-1); ডান→বাম (dx<0) = পরের মাস (+1)।

export const SWIPE_MIN_PX = 60; // অনুভূমিক ন্যূনতম দূরত্ব
export const SWIPE_DOMINANCE = 1.5; // |dx| অবশ্যই |dy|-এর অন্তত এত গুণ, নইলে উপর-নিচ স্ক্রল ধরা হয়

export function swipeDelta(dx, dy, minPx = SWIPE_MIN_PX) {
  if (Math.abs(dx) < minPx) return 0;
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return 0;
  return dx > 0 ? -1 : 1;
}

// ◀ ▶ বাটনের সাথে হুবহু একই মাস-হিসাব।
export function shiftMonthCursor(c, delta) {
  const idx = c.year * 12 + c.month0 + delta;
  return { year: Math.floor(idx / 12), month0: ((idx % 12) + 12) % 12 };
}
