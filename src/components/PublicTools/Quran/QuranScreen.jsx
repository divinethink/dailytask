// QuranScreen.jsx — "সহায়িকা → কুরআন → পূর্ণাঙ্গ কুরআন": শেষ পাঠ, দ্রুত লিংক, ১১৪ সূরার তালিকা।
// সূরায় ট্যাপ করলে QuranReader পূর্ণ-স্ক্রিনে খোলে। React global(window.React, globals.js)।

import { loadMeta } from "../../../legacy/quranData.js";
import { readLastRead, writeLastRead } from "../../../legacy/quranState.js";
import {
  QUICK_SURAHS, refLabel, sanitizeLastRead, pushLastRead, surahTypeLabel, toBnDigits,
} from "../../../legacy/quranCore.js";
import { QuranReader } from "./QuranReader.jsx";

const { useState, useEffect, useRef, useCallback } = React;
const h = React.createElement;

const PRIMARY = "var(--theme-primary, #0E4B43)";

function Chip({ label, onClick }) {
  return h("button", {
    type: "button",
    onClick,
    className: "shrink-0 px-4 py-2 rounded-full border text-sm font-semibold bg-white",
    style: { borderColor: "#D7DFD9", color: PRIMARY },
  }, label);
}

function Heading({ children }) {
  return h("div", { className: "text-xs font-semibold text-gray-500 mt-4 mb-2 px-1" }, children);
}

export function QuranScreen() {
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [open, setOpen] = useState(null); // { s, a }
  const [last, setLast] = useState(() => readLastRead());
  const lastRef = useRef(last);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadMeta()
      .then((m) => { if (alive) setMeta(m); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [tries]);

  const savePos = useCallback((s, a) => {
    const next = pushLastRead(lastRef.current, s, a, Date.now());
    lastRef.current = next;
    setLast(next);
    writeLastRead(next);
  }, []);

  if (failed) {
    return h("div", { className: "text-center py-16" },
      h("p", { className: "text-sm text-gray-700 mb-3" }, "কুরআনের তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
      h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")
    );
  }
  if (!meta) return h("p", { className: "text-center text-sm text-gray-500 py-16" }, "লোড হচ্ছে…");

  const surahs = meta.surahs;
  const lastList = sanitizeLastRead(last, surahs);
  const openSurah = (s, a) => setOpen({ s, a: a || 1 });

  return h("div", null,
    lastList.length > 0 && h("div", null,
      h(Heading, null, "সর্বশেষ পাঠ"),
      h("div", { className: "flex gap-2 overflow-x-auto pb-1" },
        lastList.map((x) => h(Chip, { key: x.s, label: refLabel(surahs[x.s - 1], x.a), onClick: () => openSurah(x.s, x.a) }))
      )
    ),
    h(Heading, null, "দ্রুত লিংক"),
    h("div", { className: "flex gap-2 overflow-x-auto pb-1" },
      QUICK_SURAHS.map((n) => h(Chip, { key: n, label: surahs[n - 1].bn, onClick: () => openSurah(n, 1) }))
    ),
    h(Heading, null, "সূরা (১১৪টি)"),
    h("div", { className: "bg-white rounded-2xl border overflow-hidden", style: { borderColor: "#E4E7E2" } },
      surahs.map((s) =>
        h("button", {
          key: s.n,
          type: "button",
          onClick: () => openSurah(s.n, 1),
          className: "w-full flex items-center gap-3 px-3 py-3 text-left border-b last:border-b-0",
          style: { borderColor: "#EEF2EF" },
        },
          h("span", { className: "shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold", style: { background: "#E8F0EE", color: PRIMARY } }, toBnDigits(s.n)),
          h("span", { className: "flex-1 min-w-0" },
            h("span", { className: "block text-base font-semibold", style: { color: PRIMARY } }, s.bn),
            h("span", { className: "block text-xs text-gray-500" }, s.mean + " · " + surahTypeLabel(s.type) + " · " + toBnDigits(s.ayahs) + " আয়াত")
          ),
          h("span", { dir: "rtl", lang: "ar", style: { fontFamily: "'Amiri Quran', serif", fontSize: 22, color: "#1F2D2A" } }, s.ar)
        )
      )
    ),
    open && h(QuranReader, {
      key: open.s,
      surah: surahs[open.s - 1],
      meta,
      startAyah: open.a,
      bismillah: meta.bismillah || null,
      onClose: () => setOpen(null),
      onPosition: savePos,
      onNavigate: (n) => openSurah(n, 1),
    })
  );
}
