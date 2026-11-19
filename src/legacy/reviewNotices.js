// reviewNotices.js — মুহাসাবা আনলকের নোটিফিকেশন (pure; Firebase/React-মুক্ত)।
// সার্ভার/push নেই (Spark): অ্যাপ খোলা থাকলে বা খুললে বেলে দেখায়। কিছু লেখে না।
import { chunkOfDate, weekUnlockAt, weekLockAt, monthUnlockAt, monthLockAt, windowState } from "./reviewSchema.js";
import { REVIEW_TEXT } from "./reviewText.js";

// এখন যে মুহাসাবাগুলোর জানালা খোলা, তাদের তালিকা: [{id, message, createdAt}]
function reviewNotices(now) {
  const out = [];
  // সাপ্তাহিক: সবচেয়ে সাম্প্রতিক বৃহস্পতিবার (আজ বৃহস্পতি হলে আজই)
  const back = (now.getDay() - 4 + 7) % 7;
  const thu = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
  const c = chunkOfDate(thu);
  const wu = weekUnlockAt(c.year, c.month0, c.week);
  if (windowState(wu, weekLockAt(c.year, c.month0, c.week), now) === "open") {
    out.push({ id: "local:weekly:" + wu.getFullYear() + "-" + (wu.getMonth() + 1) + "-" + wu.getDate(), message: REVIEW_TEXT.window.noticeWeekly, createdAt: wu.getTime() });
  }
  // মাসিক: আগের মাস (১–৩ তারিখ) ও চলতি মাস (শেষ দিন)
  for (const d of [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 1)]) {
    const y = d.getFullYear(), m = d.getMonth();
    const mu = monthUnlockAt(y, m);
    if (windowState(mu, monthLockAt(y, m), now) === "open") {
      out.push({ id: "local:monthly:" + y + "-" + (m + 1), message: REVIEW_TEXT.window.noticeMonthly, createdAt: mu.getTime() });
    }
  }
  return out;
}
export { reviewNotices };
