// শিরোনামের সারিতে বসা ছোট মাস-নেভ: ‹ মাসের নাম বছর › — ◀ ▶ সোয়াইপের হুবহু একই onShift(dirty-confirm সহ)।
// বাটন ট্যাপে কার্ডের ভাঁজ খোলা/বন্ধ হয় না(stopPropagation)। চার কার্ডে (রিপোর্ট/সাপ্তাহিক/ধারা/সভা) একই মাপ।
// label দিলে মাস-বছরের বদলে সেই লেখা দেখায়(যেমন "সেপ্টেম্বর–নভেম্বর")। ফন্ট ১০px; ছোট বাটনের ট্যাপ-এলাকা অদৃশ্য প্যাডে বাড়ানো।
import { ChevronLeft, ChevronRight } from "./icons.jsx";

export const NAV_BTN = "relative w-5 h-7 flex items-center justify-center rounded-md hover:bg-black/10 before:content-[''] before:absolute before:-inset-x-1 before:-inset-y-2";

export function MonthPillNav({ monthCursor, BN_MONTHS, toBn, onShift, label }) {
  if (!monthCursor || !onShift) return null;
  const stop = (e, d) => { e.stopPropagation(); onShift(d); };
  return (
    <div className="flex items-center shrink-0 bg-[#FDFBF5] px-0.5 rounded-lg border border-[#C89B3C] shadow-sm text-emerald-950 w-fit" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={e => stop(e, -1)} className={NAV_BTN} aria-label="আগের মাস">
        <ChevronLeft size={11} />
      </button>
      <span className="text-[10px] font-bold px-0.5 text-center whitespace-nowrap">{label || (BN_MONTHS[monthCursor.month0] + " " + toBn(monthCursor.year))}</span>
      <button type="button" onClick={e => stop(e, 1)} className={NAV_BTN} aria-label="পরের মাস">
        <ChevronRight size={11} />
      </button>
    </div>
  );
}
