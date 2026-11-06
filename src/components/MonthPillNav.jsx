// শিরোনামের সারিতে বসা ছোট মাস-নেভ: ‹ মাসের নাম বছর › — ◀ ▶ সোয়াইপের হুবহু একই onShift(dirty-confirm সহ)।
// বাটন ট্যাপে কার্ডের ভাঁজ খোলা/বন্ধ হয় না(stopPropagation)। চার কার্ডে (রিপোর্ট/সাপ্তাহিক/ধারা/সভা) একই মাপ।
// label দিলে মাস-বছরের বদলে সেই লেখা দেখায়(যেমন "সেপ্টেম্বর–নভেম্বর")। ফন্ট ১০px; ছোট বাটনের ট্যাপ-এলাকা অদৃশ্য প্যাডে বাড়ানো।

export const NAV_BTN = "relative w-5 h-7 flex items-center justify-center rounded-md hover:bg-black/10 before:content-[''] before:absolute before:-inset-x-1 before:-inset-y-2";

import { ChevronLeft, ChevronRight } from "./icons.jsx";

export function MonthPillNav({ monthCursor, BN_MONTHS, toBn, onShift, label }) {
  if (!monthCursor || !onShift) return null;
  // ট্যাপের পর উপরের কার্ডের উচ্চতা বদলালেও চিপ আঙুলের নিচেই থাকে(স্ক্রল-অ্যাঙ্কর)।
  // ডেটা দেরিতে এলে ধরতে ~০.৬ সেকেন্ড দেখে; ইউজার স্ক্রল/টাচ করলেই থামে।
  const stop = (e, d) => {
    e.stopPropagation();
    const el = e.currentTarget;
    const top0 = el.getBoundingClientRect().top;
    onShift(d);
    let alive = true;
    const end = () => { alive = false; };
    window.addEventListener("touchstart", end, { once: true, passive: true });
    window.addEventListener("wheel", end, { once: true, passive: true });
    const t0 = performance.now();
    const tick = () => {
      if (!alive || !el.isConnected || performance.now() - t0 > 600) {
        window.removeEventListener("touchstart", end);
        window.removeEventListener("wheel", end);
        return;
      }
      const dy = el.getBoundingClientRect().top - top0;
      if (Math.abs(dy) > 0.5) window.scrollBy(0, dy);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  return (
    <div className="flex items-center shrink-0 bg-white px-0.5 rounded-lg border border-[#C89B3C] shadow-sm text-emerald-950 w-fit" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={e => stop(e, -1)} className={NAV_BTN} aria-label="আগের মাস">
        <ChevronLeft size={11} />
      </button>
      <span className={"text-[10px] font-bold px-0.5 text-center whitespace-nowrap " + (label ? "min-w-[88px]" : "min-w-[72px]")}>{label || (BN_MONTHS[monthCursor.month0] + " " + toBn(monthCursor.year))}</span>
      <button type="button" onClick={e => stop(e, 1)} className={NAV_BTN} aria-label="পরের মাস">
        <ChevronRight size={11} />
      </button>
    </div>
  );
}
