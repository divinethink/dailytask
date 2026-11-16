// QuranScreen.jsx — "সহায়িকা → কুরআন → পূর্ণাঙ্গ কুরআন": শেষ পাঠ, দ্রুত লিংক, আয়াতে যান,
// এবং সূরা / পারা / পৃষ্ঠা — তিন ট্যাবে সূচি। ট্যাপ করলে QuranReader পূর্ণ-স্ক্রিনে খোলে।
// React global(window.React, globals.js)।

import { loadMeta } from "../../../legacy/quranData.js";
import { readLastRead, writeLastRead, readPrefs, writePrefs } from "../../../legacy/quranState.js";
import {
  QUICK_SURAHS, PARA_NAMES, refLabel, sanitizeLastRead, pushLastRead, surahTypeLabel, toBnDigits,
  parseRef, buildMarkers, sanitizePrefs,
} from "../../../legacy/quranCore.js";
import { QuranReader } from "./QuranReader.jsx";

const { useState, useEffect, useRef, useCallback, useMemo } = React;
const h = React.createElement;

const PRIMARY = "var(--theme-primary, #0E4B43)";
const CARD = { borderColor: "#E4E7E2" };

function Chip({ label, onClick }) {
  return h("button", {
    type: "button",
    onClick,
    className: "shrink-0 px-4 py-2 rounded-full border text-sm font-semibold bg-white",
    style: { borderColor: "#D7DFD9", color: PRIMARY, minHeight: 40 },
  }, label);
}

function Heading({ children }) {
  return h("div", { className: "text-xs font-semibold text-gray-500 mt-4 mb-2 px-1" }, children);
}

function Tabs({ tab, onTab }) {
  const items = [["surah", "সূরা"], ["para", "পারা"], ["page", "পৃষ্ঠা"]];
  return h("div", { className: "flex gap-1 p-1 rounded-xl mt-4 mb-3", style: { background: "#E8EEE9" }, role: "tablist" },
    items.map(([id, label]) =>
      h("button", {
        key: id, type: "button", role: "tab", "aria-selected": tab === id, onClick: () => onTab(id),
        className: "flex-1 rounded-lg text-sm font-semibold",
        style: { minHeight: 40, background: tab === id ? "#fff" : "transparent", color: tab === id ? PRIMARY : "#5B6B64", boxShadow: tab === id ? "0 1px 3px rgba(0,0,0,0.08)" : "none" },
      }, label)
    )
  );
}

function JumpBox({ surahs, onGo }) {
  const [val, setVal] = useState("");
  const [bad, setBad] = useState(false);
  const go = () => {
    const r = parseRef(val, surahs);
    if (!r) { setBad(true); return; }
    setBad(false);
    onGo(r.s, r.a);
  };
  return h("div", null,
    h("div", { className: "flex gap-2" },
      h("input", {
        type: "text", inputMode: "text", value: val, placeholder: "যেমন ২:২৫৫ (সূরা:আয়াত)",
        onChange: (e) => { setVal(e.target.value); setBad(false); },
        onKeyDown: (e) => { if (e.key === "Enter") go(); },
        className: "flex-1 rounded-xl border px-3 bg-white",
        style: { minHeight: 44, fontSize: 16, borderColor: bad ? "#D64545" : "#D7DFD9" },
        "aria-label": "সূরা ও আয়াত নম্বর",
      }),
      h("button", { type: "button", onClick: go, className: "px-5 rounded-xl text-sm font-semibold text-white", style: { minHeight: 44, background: PRIMARY } }, "যান")
    ),
    bad && h("div", { className: "text-xs mt-1 px-1", style: { color: "#D64545" } }, "সঠিক নম্বর লিখুন, যেমন ২:২৫৫ (বাকারার ২৫৫ নম্বর আয়াত)।")
  );
}

function SurahList({ surahs, onOpen }) {
  return h("div", { className: "bg-white rounded-2xl border overflow-hidden", style: CARD },
    surahs.map((s) =>
      h("button", {
        key: s.n, type: "button", onClick: () => onOpen(s.n, 1),
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
  );
}

function ParaList({ meta, onOpen }) {
  return h("div", { className: "bg-white rounded-2xl border overflow-hidden", style: CARD },
    meta.juz.map(([s, a], i) =>
      h("button", {
        key: i, type: "button", onClick: () => onOpen(s, a),
        className: "w-full flex items-center gap-3 px-3 py-3 text-left border-b last:border-b-0",
        style: { borderColor: "#EEF2EF" },
      },
        h("span", { className: "shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold", style: { background: "#E8F0EE", color: PRIMARY } }, toBnDigits(i + 1)),
        h("span", { className: "flex-1 min-w-0" },
          h("span", { className: "block text-base font-semibold", style: { color: PRIMARY } }, "পারা " + toBnDigits(i + 1) + " · " + PARA_NAMES[i]),
          h("span", { className: "block text-xs text-gray-500" }, "শুরু: " + refLabel(meta.surahs[s - 1], a))
        )
      )
    )
  );
}

function PageGrid({ meta, onOpen }) {
  return h("div", null,
    h("p", { className: "text-xs text-gray-500 px-1 mb-2" }, "মাদানী মুসহাফের ৬০৪ পৃষ্ঠা। পৃষ্ঠার প্রথম আয়াত থেকে পড়া শুরু হবে।"),
    h("div", { className: "grid grid-cols-5 gap-2" },
      meta.pages.map(([s, a], i) =>
        h("button", {
          key: i, type: "button", onClick: () => onOpen(s, a),
          className: "rounded-xl border bg-white text-sm font-semibold",
          style: { minHeight: 44, borderColor: "#D7DFD9", color: PRIMARY },
          "aria-label": "পৃষ্ঠা " + toBnDigits(i + 1),
        }, toBnDigits(i + 1))
      )
    )
  );
}

export function QuranScreen() {
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [open, setOpen] = useState(null); // { s, a }
  const [tab, setTab] = useState("surah");
  const [last, setLast] = useState(() => readLastRead());
  const [prefs, setPrefsState] = useState(() => readPrefs());
  const lastRef = useRef(last);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadMeta()
      .then((m) => { if (alive) setMeta(m); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [tries]);

  const markers = useMemo(() => (meta ? buildMarkers(meta) : null), [meta]);

  const savePos = useCallback((s, a) => {
    const next = pushLastRead(lastRef.current, s, a, Date.now());
    lastRef.current = next;
    setLast(next);
    writeLastRead(next);
  }, []);

  const setPrefs = useCallback((p) => {
    const clean = sanitizePrefs(p);
    setPrefsState(clean);
    writePrefs(clean);
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
  const openAt = (s, a) => setOpen({ s, a: a || 1 });

  return h("div", null,
    lastList.length > 0 && h("div", null,
      h(Heading, null, "সর্বশেষ পাঠ"),
      h("div", { className: "flex gap-2 overflow-x-auto pb-1" },
        lastList.map((x) => h(Chip, { key: x.s, label: refLabel(surahs[x.s - 1], x.a), onClick: () => openAt(x.s, x.a) }))
      )
    ),
    h(Heading, null, "দ্রুত লিংক"),
    h("div", { className: "flex gap-2 overflow-x-auto pb-1" },
      QUICK_SURAHS.map((n) => h(Chip, { key: n, label: surahs[n - 1].bn, onClick: () => openAt(n, 1) }))
    ),
    h(Heading, null, "সরাসরি আয়াতে যান"),
    h(JumpBox, { surahs, onGo: openAt }),
    h(Tabs, { tab, onTab: setTab }),
    tab === "surah" && h(SurahList, { surahs, onOpen: openAt }),
    tab === "para" && h(ParaList, { meta, onOpen: openAt }),
    tab === "page" && h(PageGrid, { meta, onOpen: openAt }),
    open && h(QuranReader, {
      key: open.s + ":" + open.a,
      surah: surahs[open.s - 1],
      meta,
      markers,
      prefs,
      onPrefs: setPrefs,
      startAyah: open.a,
      bismillah: meta.bismillah || null,
      onClose: () => setOpen(null),
      onPosition: savePos,
      onNavigate: (n) => openAt(n, 1),
    })
  );
}
