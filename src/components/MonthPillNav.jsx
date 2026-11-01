// শিরোনামের নিচের ছোট মাস-নেভ: ‹ মাসের নাম বছর › — ◀ ▶ সোয়াইপের হুবহু একই onShift(dirty-confirm সহ)।
// বাটন ট্যাপে কার্ডের ভাঁজ খোলা/বন্ধ হয় না(stopPropagation)।
import { ChevronLeft, ChevronRight } from "./icons.jsx";

export function MonthPillNav({ monthCursor, BN_MONTHS, toBn, onShift }) {
  if (!monthCursor || !onShift) return null;
  const stop = (e, d) => { e.stopPropagation(); onShift(d); };
  return (
    <div className="flex items-center gap-1 bg-[#FDFBF5] px-1 py-0.5 rounded-xl border border-[#C89B3C] shadow-sm text-emerald-950 w-fit" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={e => stop(e, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10" aria-label="আগের মাস">
        <ChevronLeft size={14} />
      </button>
      <span className="text-sm font-bold px-1 min-w-[96px] text-center">{BN_MONTHS[monthCursor.month0]} {toBn(monthCursor.year)}</span>
      <button type="button" onClick={e => stop(e, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10" aria-label="পরের মাস">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
