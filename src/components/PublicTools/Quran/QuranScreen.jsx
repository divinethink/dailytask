// QuranScreen.jsx — "কুরআন" নেভ-ট্যাবের মূল স্ক্রিন: শেষ পাঠ, দ্রুত লিংক, আয়াতে যান,
// এবং সূরা / পারা / পৃষ্ঠা — তিন ট্যাবে সূচি। ট্যাপ করলে QuranReader পূর্ণ-স্ক্রিনে খোলে।
// React global(window.React, globals.js)।

import { loadMeta, loadSearchIndex, packComplete } from "../../../legacy/quranData.js";
import {
  readLastRead, writeLastRead, readPrefs, writePrefs, readMarks, writeMarks, readDirty, writeDirty,
} from "../../../legacy/quranState.js";
import { getQuranUid, loadQuranState, saveQuranState } from "../../../legacy/quranCloud.js";
import {
  QUICK_SURAHS, PARA_NAMES, refLabel, sanitizeLastRead, pushLastRead, surahTypeLabel, toBnDigits,
  parseRef, buildMarkers, sanitizePrefs, locateAyah, sanitizeMarks, toggleMark, mergeMarks, mergeLastRead, markKey,
  searchSurahNames, searchIndex, SEARCH_MIN, SEARCH_LIMIT,
} from "../../../legacy/quranCore.js";
import { GOTO_KEY, countsOf, readGoto } from "../../../legacy/hifzPlan.js";
import { QuranReader } from "./QuranReader.jsx";
import { QuranSettingsOverlay } from "./quranUi.jsx";

const { useState, useEffect, useRef, useCallback, useMemo } = React;
const h = React.createElement;

const PRIMARY = "var(--theme-primary, #0E4B43)";
const CARD = { borderColor: "#E4E7E2" };
const HAIR = "#ECEFEA";

// সরল চিপ: আগের পাঠ ও দ্রুত লিংক একই ধাঁচে, অনুভূমিক স্ক্রল।
function Chip({ label, onClick }) {
  return h("button", {
    type: "button",
    onClick,
    className: "shrink-0 px-4 rounded-full border text-sm font-semibold bg-white",
    style: { borderColor: "#D7DFD9", color: PRIMARY, minHeight: 40 },
  }, label);
}

function ChipRow({ children }) {
  return h("div", { className: "flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 bg-white", style: { scrollbarWidth: "none" } }, children);
}

// আলাদা কার্ড: গোল কোণ, বর্ডার, হালকা ছায়া — অংশগুলো আলাদা বোঝার জন্য।
function Card({ children }) {
  return h("div", { className: "mx-3 mt-3 rounded-2xl border overflow-hidden bg-white shadow-sm", style: { borderColor: "#D7DFD9" } }, children);
}

// হালকা ধূসর ব্যান্ড-শিরোনাম।
function Heading({ children }) {
  return h("div", { className: "px-4 py-2 text-sm font-semibold", style: { background: "#ECEFEA", color: "#4A5A53" } }, children);
}

function Tabs({ tab, onTab }) {
  const items = [["surah", "সূরা"], ["para", "পারা"], ["search", "খুঁজুন"], ["saved", "সংরক্ষিত"]];
  return h("div", { className: "flex gap-1 px-3 py-2 bg-white", style: { borderTop: "1px solid " + HAIR, borderBottom: "1px solid " + HAIR }, role: "tablist" },
    items.map(([id, label]) =>
      h("button", {
        key: id, type: "button", role: "tab", "aria-selected": tab === id, onClick: () => onTab(id),
        className: "flex-1 rounded-full text-sm",
        style: { minHeight: 40, fontWeight: tab === id ? 700 : 500, background: tab === id ? "#E8F0EE" : "transparent", color: tab === id ? PRIMARY : "#5B6B64" },
      }, label)
    )
  );
}

// তালিকার এক সারি: বাঁয়ে নম্বর, মাঝে নাম ও বিবরণ, ডানে আরবি (থাকলে)।
function Row({ n, title, sub, ar, onClick }) {
  return h("button", {
    type: "button", onClick,
    className: "w-full flex items-center gap-4 px-4 py-3 text-left bg-white",
    style: { borderBottom: "1px solid " + HAIR },
  },
    h("span", { className: "shrink-0 text-lg text-gray-500 text-center", style: { width: 30 } }, n),
    h("span", { className: "flex-1 min-w-0" },
      h("span", { className: "block text-base font-semibold", style: { color: PRIMARY } }, title),
      h("span", { className: "block text-xs text-gray-500" }, sub)
    ),
    ar && h("span", { dir: "rtl", lang: "ar", style: { fontFamily: "'Amiri Quran', serif", fontSize: 24, color: "#1F2D2A" } }, ar)
  );
}

function SurahList({ surahs, onOpen }) {
  return h("div", null,
    surahs.map((s) => h(Row, { key: s.n, n: toBnDigits(s.n), title: s.bn, sub: s.mean + " · " + surahTypeLabel(s.type) + " · " + toBnDigits(s.ayahs) + " আয়াত", ar: s.ar, onClick: () => onOpen(s.n, 1) }))
  );
}

function ParaList({ meta, onOpen }) {
  return h("div", null,
    meta.juz.map(([s, a], i) => h(Row, { key: i, n: toBnDigits(i + 1), title: "পারা " + toBnDigits(i + 1) + " · " + PARA_NAMES[i], sub: "শুরু: " + refLabel(meta.surahs[s - 1], a), onClick: () => onOpen(s, a) }))
  );
}

// খুঁজুন: সূরার নাম ও সূরা:আয়াত নম্বর ডেটা ছাড়াই মেলে; আরবি/বাংলা শব্দ খুঁজতে পুরো কুরআন একবার নামাতে হয় (~৭৫০ KB, এরপর অফলাইনেও চলে)।
function SearchPanel({ meta, onOpen, script, font }) {
  const surahs = meta.surahs;
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [st, setSt] = useState({ status: "idle", done: 0 }); // idle | loading | ready | error
  const [index, setIndex] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t); }, [q]);

  const start = useCallback(() => {
    setSt({ status: "loading", done: 0 });
    loadSearchIndex(surahs, undefined, (done) => { if (aliveRef.current) setSt({ status: "loading", done }); })
      .then((idx) => { if (aliveRef.current && idx) { setIndex(idx); setSt({ status: "ready", done: 114 }); } })
      .catch(() => { if (aliveRef.current) setSt({ status: "error", done: 0 }); });
  }, [surahs]);

  // আগে নামানো থাকলে নিজে থেকেই ইনডেক্স তৈরি (ক্যাশ থেকে, নেট লাগে না)।
  useEffect(() => { packComplete().then((ok) => { if (ok && aliveRef.current) start(); }); }, [start]);

  const query = dq.trim();
  const ref = query ? parseRef(query, surahs) : null;
  const names = query && !ref ? searchSurahNames(query, surahs) : [];
  const res = index && query && !ref ? searchIndex(index, query) : null;
  const tooShort = query && !ref && query.replace(/\s/g, "").length < SEARCH_MIN;

  const row = (key, onClick, title, sub, body) => h("button", {
    key, type: "button", onClick, className: "w-full text-left px-3 py-3 border-b last:border-b-0", style: { borderColor: "#EEF2EF" },
  },
    h("span", { className: "block text-sm font-semibold", style: { color: PRIMARY } }, title),
    sub && h("span", { className: "block text-xs text-gray-500" }, sub),
    body
  );
  const clamp = (n) => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });

  return h("div", null,
    h("input", {
      type: "search", value: q, onChange: (e) => setQ(e.target.value),
      placeholder: "সূরার নাম, শব্দ বা ২:২৫৫ লিখুন",
      className: "w-full rounded-xl border px-3 bg-white mb-2", style: { minHeight: 44, fontSize: 16, borderColor: "#D7DFD9" },
      "aria-label": "কুরআনে খুঁজুন",
    }),
    st.status === "idle" && h("div", { className: "rounded-xl border bg-white p-3 mb-3 text-sm", style: CARD },
      h("p", { className: "mb-2 text-gray-700" }, "আরবি বা বাংলা শব্দ খুঁজতে পুরো কুরআন একবার ফোনে নামাতে হবে (প্রায় ৭৫০ KB)। নামানোর পর ইন্টারনেট ছাড়াই পুরো কুরআন পড়া ও খোঁজা যাবে।"),
      h("button", { type: "button", onClick: start, className: "px-4 rounded-xl text-sm font-semibold text-white", style: { minHeight: 44, background: PRIMARY } }, "ডাউনলোড করুন")
    ),
    st.status === "loading" && h("div", { className: "rounded-xl border bg-white p-3 mb-3 text-sm", style: CARD },
      h("p", { className: "mb-2 text-gray-700" }, "নামানো হচ্ছে… " + toBnDigits(st.done) + "/" + toBnDigits(114) + " সূরা"),
      h("div", { style: { height: 6, borderRadius: 3, background: "#E8EEE9" } }, h("div", { style: { height: 6, borderRadius: 3, background: PRIMARY, width: Math.round((st.done / 114) * 100) + "%" } }))
    ),
    st.status === "error" && h("div", { className: "rounded-xl border bg-white p-3 mb-3 text-sm", style: CARD },
      h("p", { className: "mb-2", style: { color: "#D64545" } }, "পুরোটা নামানো যায়নি। যা নেমেছে তা জমা আছে; ইন্টারনেট দেখে আবার চেষ্টা করুন।"),
      h("button", { type: "button", onClick: start, className: "px-4 rounded-xl text-sm font-semibold text-white", style: { minHeight: 44, background: PRIMARY } }, "আবার চেষ্টা করুন")
    ),
    st.status === "ready" && !query && h("p", { className: "text-xs text-gray-500 px-1 mb-2" }, "ডাউনলোড সম্পন্ন ✓ — এখন ইন্টারনেট ছাড়াই পড়া ও খোঁজা যায়।"),
    tooShort && h("p", { className: "text-xs text-gray-500 px-1" }, "অন্তত " + toBnDigits(SEARCH_MIN) + "টি অক্ষর লিখুন।"),
    ref && h("div", { className: "bg-white rounded-2xl border overflow-hidden mb-3", style: CARD },
      row("ref", () => onOpen(ref.s, ref.a), "সূরা " + refLabel(surahs[ref.s - 1], ref.a), "এই আয়াতে যান")),
    names.length > 0 && h("div", null,
      h(Heading, null, "সূরা (" + toBnDigits(names.length) + ")"),
      h("div", { className: "bg-white rounded-2xl border overflow-hidden mb-3", style: CARD },
        names.map((x) => row("n" + x.n, () => onOpen(x.n, 1), toBnDigits(x.n) + ". " + x.bn, x.mean + " · " + toBnDigits(x.ayahs) + " আয়াত")))
    ),
    res && h("div", null,
      h(Heading, null, res.total === 0 ? "কোনো আয়াত পাওয়া যায়নি" : toBnDigits(res.total) + "টি আয়াত" + (res.total > SEARCH_LIMIT ? " (প্রথম " + toBnDigits(SEARCH_LIMIT) + "টি)" : "")),
      res.total > 0 && h("div", { className: "bg-white rounded-2xl border overflow-hidden", style: CARD },
        res.hits.map((x) => row(x.s + ":" + x.a, () => onOpen(x.s, x.a), "সূরা " + refLabel(surahs[x.s - 1], x.a), null,
          h("span", { className: "block mt-1" },
            h("span", { dir: "rtl", lang: "ar", className: "block", style: { fontFamily: "'Amiri Quran', serif", fontSize: 20, lineHeight: 1.9, color: "#1F2D2A", ...clamp(2) } }, x.ar),
            h("span", { className: "block text-sm text-gray-700", style: clamp(3) }, x.tr)
          )))
      )
    ),
    query && !ref && st.status !== "ready" && st.status !== "loading" && names.length === 0 && !tooShort && h("p", { className: "text-xs text-gray-500 px-1" }, "আয়াতের লেখায় খুঁজতে আগে ডাউনলোড করুন।")
  );
}

const SYNC_TEXT = {
  local: "শুধু এই ফোনে জমা আছে (লগইন বা ইন্টারনেট নেই)।",
  saving: "ক্লাউডে সংরক্ষণ হচ্ছে…",
  synced: "ক্লাউডে সংরক্ষিত ✓ — নতুন ফোনে Google-লগইনেও পাবেন।",
  error: "ক্লাউডে পাঠানো যায়নি; এই ফোনে জমা আছে।",
};

function SavedList({ meta, marks, sync, onOpen, onRemove, onRetry }) {
  const [kind, setKind] = useState("b");
  const list = marks.filter((x) => x.k === kind);
  const count = (k) => marks.filter((x) => x.k === k).length;
  const kinds = [["b", "বুকমার্ক"], ["f", "পছন্দের"]];
  return h("div", null,
    h("div", { className: "flex gap-2 mb-2" },
      kinds.map(([k, label]) => h("button", {
        key: k, type: "button", onClick: () => setKind(k), "aria-pressed": kind === k,
        className: "px-4 py-2 rounded-full border text-sm font-semibold",
        style: { minHeight: 40, borderColor: "#D7DFD9", background: kind === k ? PRIMARY : "#fff", color: kind === k ? "#fff" : PRIMARY },
      }, label + " (" + toBnDigits(count(k)) + ")"))
    ),
    h("p", { className: "text-xs text-gray-500 px-1 mb-2" },
      SYNC_TEXT[sync] || "",
      (sync === "error" || sync === "local") && h("button", { type: "button", onClick: onRetry, className: "ml-2 underline font-semibold", style: { color: PRIMARY } }, "আবার চেষ্টা")
    ),
    list.length === 0
      ? h("p", { className: "text-center text-sm text-gray-500 py-10" }, kind === "b"
        ? "এখনো কোনো বুকমার্ক নেই। আয়াতের নিচের “বুকমার্ক” চাপুন।"
        : "এখনো কোনো পছন্দের আয়াত নেই। আয়াতের নিচের “পছন্দ” চাপুন।")
      : h("div", { className: "bg-white rounded-2xl border overflow-hidden", style: CARD },
        list.map((x) => h("div", { key: markKey(x.s, x.a, x.k), className: "flex items-center border-b last:border-b-0", style: { borderColor: "#EEF2EF" } },
          h("button", { type: "button", onClick: () => onOpen(x.s, x.a), className: "flex-1 min-w-0 text-left px-3 py-3" },
            h("span", { className: "block text-base font-semibold", style: { color: PRIMARY } }, "সূরা " + refLabel(meta.surahs[x.s - 1], x.a)),
            h("span", { className: "block text-xs text-gray-500" }, "পারা " + toBnDigits(locateAyah(meta, x.s, x.a).juz))
          ),
          h("button", { type: "button", onClick: () => onRemove(x), className: "px-4 text-sm", style: { minHeight: 44, color: "#D64545" }, "aria-label": refLabel(meta.surahs[x.s - 1], x.a) + " সরান" }, "সরান")
        ))
      )
  );
}

// settingsOpen/onSettingsClose: কুরআন-কার্ডের সেটিং-আইকন (QuranTab) থেকে আসে।
export function QuranScreen({ settingsOpen, onSettingsClose, searchTick }) {
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [open, setOpen] = useState(null); // { s, a }
  const [tab, setTab] = useState("surah");
  useEffect(() => { if (searchTick > 0) setTab("search"); }, [searchTick]);
  const [last, setLast] = useState(() => readLastRead());
  const [prefs, setPrefsState] = useState(() => readPrefs());
  const lastRef = useRef(last);
  const [marks, setMarksState] = useState(() => readMarks());
  const [sync, setSync] = useState("local");
  const [syncTries, setSyncTries] = useState(0);
  const marksRef = useRef(marks);
  const surahsRef = useRef(null);
  const uidRef = useRef(null);
  const loadedRef = useRef(false); // ক্লাউড থেকে প্রথম পড়া সফল হয়েছে কি (না হলে অন্ধভাবে ওভাররাইট নয়)
  const timerRef = useRef(null);
  const verRef = useRef(0); // সংরক্ষণ চলাকালে নতুন পরিবর্তন এলে "dirty" চিহ্ন রেখে দিতে

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadMeta()
      .then((m) => { if (alive) setMeta(m); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [tries]);

  // হিফজ প্ল্যানার থেকে আসা "এই আয়াতে খুলুন" — তাজা ও বৈধ হলে একবার খুলে চাবি মুছে ফেলা হয়।
  useEffect(() => {
    if (!meta) return;
    try {
      const raw = window.localStorage.getItem(GOTO_KEY);
      if (!raw) return;
      window.localStorage.removeItem(GOTO_KEY);
      const g = readGoto(JSON.parse(raw), countsOf(meta.surahs), Date.now());
      if (g) setOpen({ s: g.s, a: g.a });
    } catch (e) { /* ignore */ }
  }, [meta]);

  // ক্লাউডে পাঠানো। ব্যর্থ হলে dirty থাকে; পরের খোলায় আবার চেষ্টা (মিলন, ওভাররাইট নয়)।
  const push = useCallback(async () => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!loadedRef.current || !uidRef.current || !surahsRef.current) return;
    const ver = verRef.current;
    setSync("saving");
    try {
      await saveQuranState(uidRef.current, { marks: marksRef.current, last: lastRef.current }, surahsRef.current);
      if (ver === verRef.current) writeDirty(false);
      setSync("synced");
    } catch (e) {
      setSync("error");
    }
  }, []);

  const touch = useCallback(() => {
    verRef.current += 1;
    writeDirty(true);
    if (!loadedRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(push, 4000);
  }, [push]);

  // meta এলে (বা "আবার চেষ্টা"য়) ক্লাউডের সাথে মিলানো।
  useEffect(() => {
    if (!meta) return undefined;
    let alive = true;
    const surahs = meta.surahs;
    surahsRef.current = surahs;
    (async () => {
      const uid = await getQuranUid();
      if (!alive) return;
      if (!uid) { setSync("local"); return; }
      uidRef.current = uid;
      try {
        const remote = await loadQuranState(uid, surahs);
        if (!alive) return;
        const dirty = readDirty();
        const localMarks = sanitizeMarks(marksRef.current, surahs);
        let nextMarks = localMarks;
        let need = dirty;
        if (!remote) { need = need || localMarks.length > 0 || lastRef.current.length > 0; } else if (dirty) nextMarks = mergeMarks(remote.marks, localMarks, surahs);
        else nextMarks = remote.marks;
        const nextLast = remote ? mergeLastRead(remote.last, lastRef.current, surahs) : sanitizeLastRead(lastRef.current, surahs);
        marksRef.current = nextMarks;
        lastRef.current = nextLast;
        setMarksState(nextMarks);
        setLast(nextLast);
        writeMarks(nextMarks);
        writeLastRead(nextLast);
        loadedRef.current = true;
        if (need) { verRef.current += 1; await push(); } else setSync("synced");
      } catch (e) {
        if (alive) setSync("error");
      }
    })();
    return () => { alive = false; };
  }, [meta, syncTries, push]);

  // ছাড়ার সময় অপেক্ষমাণ পরিবর্তন সাথে সাথে পাঠানো।
  useEffect(() => () => { if (timerRef.current) push(); }, [push]);

  const onMark = useCallback((s, a, k) => {
    const r = toggleMark(marksRef.current, s, a, k, Date.now());
    if (r.full) return r;
    marksRef.current = r.list;
    setMarksState(r.list);
    writeMarks(r.list);
    touch();
    return r;
  }, [touch]);

  const markers = useMemo(() => (meta ? buildMarkers(meta) : null), [meta]);

  const savePos = useCallback((s, a) => {
    const next = pushLastRead(lastRef.current, s, a, Date.now());
    lastRef.current = next;
    setLast(next);
    writeLastRead(next);
    touch();
  }, [touch]);

  const setPrefs = useCallback((p) => {
    const clean = sanitizePrefs(p);
    setPrefsState(clean);
    writePrefs(clean);
  }, []);

  if (failed) {
    return h("div", { className: "text-center py-16 px-4" },
      h("p", { className: "text-sm text-gray-700 mb-3" }, "কুরআনের তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
      h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")
    );
  }
  if (!meta) return h("p", { className: "text-center text-sm text-gray-500 py-16" }, "লোড হচ্ছে…");

  const surahs = meta.surahs;
  const markedSet = new Set(marks.map((x) => markKey(x.s, x.a, x.k)));
  const lastList = sanitizeLastRead(last, surahs);
  const openAt = (s, a) => setOpen({ s, a: a || 1 });
  return h("div", { className: "pb-4" },
    lastList.length > 0 && h(Card, null,
      h(Heading, null, "শেষ পাঠ"),
      h(ChipRow, null, lastList.map((x) => h(Chip, { key: x.s, label: refLabel(surahs[x.s - 1], x.a), onClick: () => openAt(x.s, x.a) })))
    ),
    h(Card, null,
      h(Heading, null, "দ্রুত লিংক"),
      h(ChipRow, null, QUICK_SURAHS.map((n) => h(Chip, { key: n, label: surahs[n - 1].bn, onClick: () => openAt(n, 1) })))
    ),
    h(Card, null,
      h(Tabs, { tab, onTab: setTab }),
      tab === "surah" && h(SurahList, { surahs, onOpen: openAt }),
      tab === "para" && h(ParaList, { meta, onOpen: openAt }),
      tab === "search" && h("div", { className: "px-4 pt-3 pb-3" }, h(SearchPanel, { meta, onOpen: openAt, script: prefs.arScript, font: prefs.arFont })),
      tab === "saved" && h("div", { className: "px-4 pt-3 pb-3" }, h(SavedList, {
        meta, marks, sync, onOpen: openAt,
        onRemove: (x) => onMark(x.s, x.a, x.k),
        onRetry: () => setSyncTries((t) => t + 1),
      }))
    ),
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
      marked: markedSet,
      onMark,
    }),
    settingsOpen && h(QuranSettingsOverlay, { prefs, onPrefs: setPrefs, onClose: onSettingsClose })
  );
}
