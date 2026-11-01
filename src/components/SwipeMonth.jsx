// ডানে-বামে সোয়াইপে মাস বদল। শুধু gesture ধরে; মাস বদলের আসল কাজ (dirty-confirm সহ) onShift-এ।
// কোনো animation/অতিরিক্ত UI নেই। input/textarea/select ও অনুভূমিক-স্ক্রলযোগ্য অংশ থেকে শুরু হলে উপেক্ষা।
import { swipeDelta } from "../legacy/swipeMonth.js";
import { ChevronLeft, ChevronRight } from "./icons.jsx";

const IGNORE = "input, textarea, select, [contenteditable='true'], [data-no-swipe]";

function startsInBlockedArea(target, root) {
  if (!target || !target.closest) return false;
  if (target.closest(IGNORE)) return true;
  for (let el = target; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = window.getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

export function SwipeMonth({ onShift, monthCursor, label, nav, children }) {
  const start = React.useRef(null);
  const swiped = React.useRef(false);
  const [toast, setToast] = React.useState(null);
  const cy = monthCursor && monthCursor.year;
  const cm = monthCursor && monthCursor.month0;
  // সোয়াইপে মাস বদলালে ১.৫ সেকেন্ডের ছোট টোস্ট(নতুন মাসের নাম) — গেস্টার কাজ করছে বোঝার জন্য।
  React.useEffect(() => {
    if (!swiped.current || !label || cy == null) return;
    swiped.current = false;
    setToast(label({ year: cy, month0: cm }));
    const id = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(id);
  }, [cy, cm]);
  return (
    <div
      onTouchStart={(e) => {
        const t = e.touches && e.touches[0];
        const blocked = e.touches.length !== 1 || startsInBlockedArea(e.target, e.currentTarget);
        start.current = t && !blocked ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        start.current = null;
        const t = e.changedTouches && e.changedTouches[0];
        if (!s || !t) return;
        const d = swipeDelta(t.clientX - s.x, t.clientY - s.y);
        if (d !== 0) {
          swiped.current = true;
          onShift(d);
        }
      }}
      onTouchCancel={() => {
        start.current = null;
      }}
    >
      {nav && label && cy != null && (
        // মাস-চিপ(‹ মাসের নাম বছর ›): ভাঁজ-বন্ধ কার্ডেও বর্তমান মাস দেখা যায়; ◀ ▶ সোয়াইপের হুবহু একই onShift(dirty-confirm সহ)।
        <div className="mx-5 mt-4 flex justify-center" data-no-swipe>
          <div className="flex items-center gap-1.5 bg-[#FDFBF5] px-2 py-1 rounded-xl border border-[#C89B3C] shadow-sm text-emerald-950">
            <button type="button" onClick={() => onShift(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10" aria-label="আগের মাস">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold px-1 min-w-[110px] text-center">{label({ year: cy, month0: cm })}</span>
            <button type="button" onClick={() => onShift(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10" aria-label="পরের মাস">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {children}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 pointer-events-none px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg"
          style={{ background: "var(--theme-primary, #0E4B43)" }}
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
