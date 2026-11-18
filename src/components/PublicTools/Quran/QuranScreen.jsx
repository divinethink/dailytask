// QuranScreen.jsx — "কুরআন" নেভ-ট্যাবের মূল স্ক্রিন: শেষ পাঠ, দ্রুত লিংক, আয়াতে যান,
// এবং সূরা / পারা / পৃষ্ঠা — তিন ট্যাবে সূচি। ট্যাপ করলে QuranReader পূর্ণ-স্ক্রিনে খোলে।
// React global(window.React, globals.js)।

import { loadMeta, loadSearchIndex, packComplete, warmScript } from "../../../legacy/quranData.js";
import {
  readLastRead, writeLastRead, readPrefs, writePrefs, readMarks, writeMarks, readDirty, writeDirty,
} from "../../../legacy/quranState.js";
import { getQuranUid, loadQuranState, saveQuranState } from "../../../legacy/quranCloud.js";
import {
  QUICK_SURAHS, PARA_NAMES, refLabel, sanitizeLastRead, pushLastRead, surahTypeLabel, toBnDigits,
  parseRef, buildMarkers, sanitizePrefs, locateAyah, sanitizeMarks, toggleMark, mergeMarks, mergeLastRead, markKey,
  searchSurahNames, searchIndex, SEARCH_MIN, SEARCH_LIMIT,
} from "../../../legacy/quranCore.js";
import { ChevronRight } from "../../icons.jsx";
import { QuranReader } from "./QuranReader.jsx";
import { QuranMushaf } from "./QuranMushaf.jsx";
import { QuranSettingsOverlay, Rosette } from "./quranUi.jsx";

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

// "পড়া চালিয়ে যান": শেষ পাঠের বড় কার্ড — এক ট্যাপে ওই আয়াতে।
function ContinueCard({ meta, item, onOpen }) {
  const sm = meta.surahs[item.s - 1];
  const loc = locateAyah(meta, item.s, item.a);
  return h("button", {
    type: "button", onClick: () => onOpen(item.s, item.a),
    className: "w-full text-left rounded-2xl bg-white border flex items-center gap-3 px-4 py-3 mt-4 active:scale-[0.99] transition-transform",
    style: { borderColor: "#E4E7E2", borderLeft: "5px solid " + PRIMARY, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  },
    h("span", { className: "flex-1 min-w-0" },
      h("span", { className: "block text-xs font-semibold text-gray-500" }, "পড়া চালিয়ে যান"),
      h("span", { className: "block text-lg font-bold", style: { color: PRIMARY } }, sm.bn),
      h("span", { className: "block text-xs text-gray-500" }, "আয়াত " + toBnDigits(item.a) + " · পারা " + toBnDigits(loc.juz) + " · পৃষ্ঠা " + toBnDigits(loc.page))),
    h("span", { dir: "rtl", lang: "ar", style: { fontFamily: "'Amiri Quran', serif", fontSize: 26, color: "#1F2D2A" } }, sm.ar),
    h("span", { className: "shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white", style: { background: PRIMARY } }, h(ChevronRight, { size: 20 })));
}

// দ্রুত লিংকের গোল টাইল।
function QuickTile({ label, glyph, onClick }) {
  return h("button", { type: "button", onClick, className: "shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform", style: { width: 76 } },
    h("span", { className: "flex items-center justify-center rounded-full", style: { width: 58, height: 58, background: "#fff", border: "1.5px solid #D7DFD9", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", color: PRIMARY } }, glyph),
    h("span", { className: "text-xs font-semibold text-center leading-tight", style: { color: "#33433D" } }, label));
}

function Heading({ children }) {
  return h("div", { className: "text-xs font-semibold text-gray-500 mt-4 mb-2 px-1" }, children);
}

function Tabs({ tab, onTab }) {
  const items = [["surah", "সূরা"], ["para", "পারা"], ["page", "পৃষ্ঠা"], ["search", "খুঁজুন"], ["saved", "সংরক্ষিত"]];
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
        h(Rosette, { n: toBnDigits(s.n), size: 36, font: "14px", color: PRIMARY, bg: "#E8F0EE" }),
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
        h(Rosette, { n: toBnDigits(i + 1), size: 36, font: "14px", color: PRIMARY, bg: "#E8F0EE" }),
        h("span", { className: "flex-1 min-w-0" },
          h("span", { className: "block text-base font-semibold", style: { color: PRIMARY } }, "পারা " + toBnDigits(i + 1) + " · " + PARA_NAMES[i]),
          h("span", { className: "block text-xs text-gray-500" }, "শুরু: " + refLabel(meta.surahs[s - 1], a))
        )
      )
    )
  );
}

function PageGrid({ meta, onPage }) {
  return h("div", null,
    h("p", { className: "text-xs text-gray-500 px-1 mb-2" }, "মাদানী মুসহাফের ৬০৪ পৃষ্ঠা। পৃষ্ঠা খুলে সোয়াইপ করলে পাতা উল্টাবে, সূরা পেরিয়েও পড়া যাবে।"),
    h("div", { className: "grid grid-cols-5 gap-2" },
      meta.pages.map((_pg, i) =>
        h("button", {
          key: i, type: "button", onClick: () => onPage(i + 1),
          className: "rounded-xl border bg-white text-sm font-semibold",
          style: { minHeight: 44, borderColor: "#D7DFD9", color: PRIMARY },
          "aria-label": "পৃষ্ঠা " + toBnDigits(i + 1),
        }, toBnDigits(i + 1))
      )
    )
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
      .then((idx) => { if (aliveRef.current && idx) { setIndex(idx); setSt({ status: "ready", done: 114 }); warmScript(surahs, script, font); } }) // বাছা উসমানি লেখা+ফন্টও অফলাইনের জন্য (ব্যর্থ হলে নীরব; পড়ার সময় আবার চেষ্টা)
      .catch(() => { if (aliveRef.current) setSt({ status: "error", done: 0 }); });
  }, [surahs, script, font]);

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
      placeholder: "সূরার নাম, আরবি বা বাংলা শব্দ লিখুন",
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
export function QuranScreen({ settingsOpen, onSettingsClose }) {
  const [meta, setMeta] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const [open, setOpen] = useState(null); // { s, a }
  const [mushaf, setMushaf] = useState(null); // পৃষ্ঠা-নম্বর
  const [tab, setTab] = useState("surah");
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
    return h("div", { className: "text-center py-16" },
      h("p", { className: "text-sm text-gray-700 mb-3" }, "কুরআনের তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
      h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")
    );
  }
  if (!meta) return h("p", { className: "text-center text-sm text-gray-500 py-16" }, "লোড হচ্ছে…");

  const surahs = meta.surahs;
  const markedSet = new Set(marks.map((x) => markKey(x.s, x.a, x.k)));
  const lastList = sanitizeLastRead(last, surahs);
  const openAt = (s, a) => setOpen({ s, a: a || 1 });
  // এক স্তর বন্ধ হওয়ার "back" শেষ হলে তবেই পরেরটা খোলা; নইলে সেই back নতুন স্তরকেও বন্ধ করে দেয়।
  const afterBack = (fn) => {
    let done = false;
    const go = () => { if (done) return; done = true; window.removeEventListener("popstate", go); fn(); };
    window.addEventListener("popstate", go);
    setTimeout(go, 400);
  };
  const openMushafFromReader = (p) => { setOpen(null); afterBack(() => setMushaf(p)); };
  // মুসহাফ থেকে তালিকা/রিডিং-এ ফেরা: মোড বদলে ওই পৃষ্ঠার প্রথম আয়াতে রিডার।
  const openReaderFromMushaf = (mode, s, a) => {
    setPrefs({ ...prefs, mode });
    setMushaf(null);
    afterBack(() => setOpen({ s, a }));
  };

  return h("div", null,
    lastList.length > 0 && h(ContinueCard, { meta, item: lastList[0], onOpen: openAt }),
    lastList.length > 1 && h("div", null,
      h(Heading, null, "আগের পাঠ"),
      h("div", { className: "flex gap-2 overflow-x-auto pb-1 no-scrollbar", style: { scrollbarWidth: "none" } },
        lastList.slice(1).map((x) => h(Chip, { key: x.s, label: refLabel(surahs[x.s - 1], x.a), onClick: () => openAt(x.s, x.a) }))
      )
    ),
    h(Heading, null, "দ্রুত লিংক"),
    h("div", { className: "flex gap-1 overflow-x-auto pb-1 no-scrollbar", style: { scrollbarWidth: "none" } },
      QUICK_SURAHS.map((n) => h(QuickTile, { key: n, label: surahs[n - 1].bn, glyph: h("span", { dir: "rtl", lang: "ar", style: { fontFamily: "'Amiri Quran', serif", fontSize: 18, lineHeight: 1.4 } }, surahs[n - 1].ar), onClick: () => openAt(n, 1) }))
    ),
    h(Heading, null, "সরাসরি আয়াতে যান"),
    h(JumpBox, { surahs, onGo: openAt }),
    h(Tabs, { tab, onTab: setTab }),
    tab === "surah" && h(SurahList, { surahs, onOpen: openAt }),
    tab === "para" && h(ParaList, { meta, onOpen: openAt }),
    tab === "page" && h(PageGrid, { meta, onPage: setMushaf }),
    tab === "search" && h(SearchPanel, { meta, onOpen: openAt, script: prefs.arScript, font: prefs.arFont }),
    tab === "saved" && h(SavedList, {
      meta, marks, sync, onOpen: openAt,
      onRemove: (x) => onMark(x.s, x.a, x.k),
      onRetry: () => setSyncTries((t) => t + 1),
    }),
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
      onOpenMushaf: openMushafFromReader,
    }),
    settingsOpen && h(QuranSettingsOverlay, { prefs, onPrefs: setPrefs, onClose: onSettingsClose }),
    mushaf && h(QuranMushaf, {
      key: "mushaf",
      meta, markers, prefs, onPrefs: setPrefs,
      startPage: mushaf,
      onClose: () => setMushaf(null),
      onSwitchMode: openReaderFromMushaf,
      onPosition: savePos,
      marked: markedSet,
      onMark,
    })
  );
}
