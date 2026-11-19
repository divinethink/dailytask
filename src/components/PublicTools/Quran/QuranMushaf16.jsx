// QuranMushaf16.jsx — ১৬-লাইন ইন্দো-পাক মুসহাফ (৫৪৮ পৃষ্ঠা): ছাপা মুসহাফের মতো প্রতিটা লাইন ঠিক এক লাইনে, পর্দার প্রস্থে ধরানো।
// শুধু আরবি লেখার ধরন "ইন্দো-পাক" থাকলে QuranScreen এটা খোলে; বাকি ধরনে আগের মাদানী QuranMushaf-ই চলে।
// লেখা পর্দার প্রস্থ অনুযায়ী নিজে বসে (সবচেয়ে চওড়া লাইনটা ধরিয়ে); তাই আকারের স্লাইডার এখানে নেই।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../../icons.jsx";
import { useBackLayer } from "../../../legacy/backNav.js";
import { THEMES } from "../../../legacy/readerCore.js";
import { loadSurah, loadMushaf16Index, loadMushaf16Page } from "../../../legacy/quranData.js";
import { pageAyahRefs, locateAyah, toBnDigits, markKey, showBismillahHeader } from "../../../legacy/quranCore.js";
import { fontStack, scriptById } from "../../../legacy/quranFonts.js";
import { M16_PAGES, M16_GAP_EM, clamp16, pageOfAyah, bismillahUnderBanner, lineWidthEm, fitFontSize, surahsOnPage, firstAyahOnPage } from "../../../legacy/mushaf16.js";
import { PRIMARY, LINE, AyahSheet, useAyahActions, SurahBanner, Rosette, useEnsureFont } from "./quranUi.jsx";
import { MushafSheet } from "./QuranMushaf.jsx";

const { useState, useEffect, useLayoutEffect, useMemo, useRef } = React;
const h = React.createElement;

const SWIPE_MIN = 60; // পাতা উল্টাতে ন্যূনতম আঙুল-টানা (px)
const SIZE_FALLBACK = 18; // মাপ নিতে না পারলে (পুরনো ব্রাউজার) এই আকার

// সব লাইনের মধ্যে সবচেয়ে চওড়াটার প্রস্থ (em); canvas-এ মাপা (ফন্টের শেপিং সহ)
function widestLineEm(lines, family) {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return 0;
    ctx.font = "100px " + family;
    ctx.direction = "rtl";
    let mx = 0;
    for (const ln of lines) {
      if (ln.t !== "a") continue;
      const ems = [];
      for (const g of ln.segs) for (const w of g.words) ems.push(ctx.measureText(w).width / 100);
      mx = Math.max(mx, lineWidthEm(ems));
    }
    return mx;
  } catch {
    return 0;
  }
}

export function QuranMushaf16({ meta, prefs, onPrefs, startPage, onClose, onSwitchMode, onPosition, marked, onMark, onLeave16 }) {
  const [page, setPage] = useState(0); // ০ = ইনডেক্স লোড হচ্ছে
  const [state, setState] = useState({ status: "loading", lines: null });
  const [tries, setTries] = useState(0);
  const [sel, setSel] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [boxW, setBoxW] = useState(0);
  const [fontTick, setFontTick] = useState(0);
  const bodyRef = useRef(null);
  const boxRef = useRef(null);
  const touch = useRef(null);
  const posRef = useRef(null);
  const posCb = useRef(onPosition);
  posCb.current = onPosition;
  const actions = useAyahActions(meta.surahs, onMark);

  useBackLayer(true, onClose);
  useEnsureFont(prefs.arFont);

  const th = THEMES[prefs.theme] || THEMES[0];
  const accent = prefs.theme === 2 ? "#9FD4C4" : PRIMARY;
  const headBg = prefs.theme === 2 ? th.bar : PRIMARY;
  const family = fontStack(prefs.arFont);
  const bismillah = (scriptById("indopak") || {}).bismillah || meta.bismillah || "";

  // শুরুর পৃষ্ঠা: মাদানী পৃষ্ঠার প্রথম আয়াত যে ১৬-লাইন পৃষ্ঠায় শুরু হয়
  useEffect(() => {
    let alive = true;
    loadMushaf16Index()
      .then((idx) => {
        if (!alive) return;
        const ref = pageAyahRefs(meta, startPage)[0];
        setPage(ref ? pageOfAyah(idx.begin, ref.s, ref.a) : 1);
      })
      .catch(() => { if (alive) setState({ status: "error", lines: null }); });
    return () => { alive = false; };
  }, [tries]);

  // পৃষ্ঠার লাইন (আগের-পরের পৃষ্ঠা পেছনে আনা থাকে)
  useEffect(() => {
    if (!page) return undefined;
    let alive = true;
    setState({ status: "loading", lines: null });
    setSel(null);
    loadMushaf16Page(page)
      .then((lines) => {
        if (!alive) return;
        setState({ status: "ready", lines });
        if (bodyRef.current) {
          bodyRef.current.scrollTop = 0;
          if (bodyRef.current.animate) bodyRef.current.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 180 });
        }
        if (page > 1) loadMushaf16Page(page - 1).catch(() => {});
        if (page < M16_PAGES) loadMushaf16Page(page + 1).catch(() => {});
      })
      .catch(() => { if (alive) setState({ status: "error", lines: null }); });
    return () => { alive = false; };
  }, [page, tries]);

  // ফন্ট লোড হলে আবার মাপ (নইলে ভুল ফন্টে মাপা হয়)
  useEffect(() => {
    let alive = true;
    if (document.fonts && document.fonts.load) {
      document.fonts.load("40px " + family, "\u0628\u0650\u0633\u0652\u0645\u0650").then(() => { if (alive) setFontTick((t) => t + 1); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [family]);

  // লেখার জায়গার প্রস্থ (পর্দা ঘোরালে/আকার বদলালে নতুন)
  useLayoutEffect(() => {
    const read = () => { if (boxRef.current) setBoxW(boxRef.current.clientWidth); };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, [state.status]);

  const lines = state.lines || [];
  const first = firstAyahOnPage(lines);
  const maxEm = useMemo(() => (state.lines ? widestLineEm(state.lines, family) : 0), [state.lines, family, fontTick]);
  const size = fitFontSize(boxW, maxEm) || SIZE_FALLBACK;
  const lh = Math.round(size * 2.1);

  // শেষ পাঠ: পৃষ্ঠায় ১.৫ সেকেন্ড থাকলে প্রথম আয়াত সংরক্ষণ
  useEffect(() => {
    if (state.status !== "ready" || !first) return undefined;
    posRef.current = first;
    const t = setTimeout(() => posCb.current(first.s, first.n), 1500);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => () => { if (posRef.current) posCb.current(posRef.current.s, posRef.current.n); }, []);

  const go = (p) => setPage(clamp16(p));

  const onTouchStart = (e) => {
    const t = e.touches && e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e) => {
    const s = touch.current;
    touch.current = null;
    const t = e.changedTouches && e.changedTouches[0];
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? page + 1 : page - 1); // আরবি বইয়ের মতো: বাঁয়ে টানলে পরের পাতা
  };

  // শব্দে ট্যাপ → ওই আয়াতের অনুবাদ/কপি/বুকমার্ক শিট
  const tap = (s, a) => {
    loadSurah(meta.surahs[s - 1], undefined, prefs.arScript)
      .then((list) => { const it = list[a - 1]; if (it) setSel({ s, n: a, ar: it.ar, tr: it.tr }); })
      .catch(() => {});
  };

  // আরবি লেখার ধরন ইন্দো-পাক ছাড়া কিছুতে বদলালে মাদানী মুসহাফে ফেরা (বর্তমান আয়াতের পৃষ্ঠায়)
  const setPrefs = (p) => {
    if (p.arScript !== "indopak" && onLeave16 && first) onLeave16(locateAyah(meta, first.s, first.n).page);
    onPrefs(p);
  };

  const names = [...new Set(surahsOnPage(lines).map((n) => meta.surahs[n - 1].bn))].join(" \u00b7 ");
  const juz = first ? locateAyah(meta, first.s, first.n).juz : 0;
  const selSurah = sel ? meta.surahs[sel.s - 1] : null;
  const selKey = sel ? sel.s + ":" + sel.n : "";

  const navBtn = (label, target, dis) => h("button", {
    type: "button", disabled: dis, onClick: () => go(target),
    style: { flex: 1, minHeight: 44, borderRadius: 12, border: "1px solid " + LINE, background: "transparent", color: accent, fontSize: 14, fontWeight: 600, opacity: dis ? 0.35 : 1 },
  }, label);

  // তালিকা/রিডিং চাপলে ওই পৃষ্ঠার প্রথম আয়াতে যাওয়া
  const seg = (key, label, on, mode) => h("button", {
    key, type: "button", "aria-pressed": on, disabled: !on && !first,
    onClick: () => { if (!on && first && onSwitchMode) onSwitchMode(mode, first.s, first.n); },
    style: { minHeight: 40, padding: "0 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: "none", background: on ? "#fff" : "transparent", color: on ? "#1F2D2A" : "#fff" },
  }, label);

  const lineBase = { fontFamily: family, fontSize: size, lineHeight: lh + "px", minHeight: lh, color: th.fg };

  const renderLine = (ln, i) => {
    if (ln.t === "s") {
      return h("div", { key: "s" + i, style: { margin: "6px 0 2px" } },
        h(SurahBanner, { s: meta.surahs[ln.s - 1], font: prefs.arFont, th, accent }),
        bismillahUnderBanner(lines, i) && showBismillahHeader(ln.s) && bismillah &&
          h("div", { dir: "rtl", lang: "ar", style: { ...lineBase, textAlign: "center" } }, bismillah));
    }
    if (ln.t === "b") return h("div", { key: "b" + i, dir: "rtl", lang: "ar", style: { ...lineBase, textAlign: "center" } }, bismillah);
    const words = [];
    ln.segs.forEach((g) => g.words.forEach((w, wi) => {
      const active = selKey === g.s + ":" + g.a;
      words.push(h("span", {
        key: g.s + ":" + g.a + ":" + wi + ":" + words.length, onClick: () => tap(g.s, g.a),
        style: { cursor: "pointer", flexShrink: 0, borderRadius: 6, background: active ? th.bar : "transparent", boxShadow: active ? "0 0 0 2px " + th.bar : "none" },
      }, w));
    }));
    return h("div", {
      key: "a" + i, dir: "rtl", lang: "ar",
      style: { ...lineBase, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: ln.c ? "center" : "space-between", gap: M16_GAP_EM + "em", whiteSpace: "nowrap" },
    }, words);
  };

  return h("div", { style: { position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", background: th.bg, color: th.fg, fontFamily: "'Hind Siliguri', sans-serif" } },
    h("div", { style: { background: headBg, color: "#fff", padding: "10px 8px 10px 12px", display: "flex", alignItems: "center", gap: 8 } },
      h("button", { type: "button", onClick: onClose, "aria-label": "ফিরে যান", style: { padding: 8, color: "#fff" } }, h(ChevronLeft, { size: 22 })),
      h("div", { style: { minWidth: 0, flex: 1 } },
        h("div", { style: { fontWeight: 600, fontSize: 17, lineHeight: 1.3 } }, page ? "পৃষ্ঠা " + toBnDigits(page) + " / " + toBnDigits(M16_PAGES) : "মুসহাফ"),
        h("div", { style: { fontSize: 12, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, (juz ? "পারা " + toBnDigits(juz) + " \u00b7 " : "") + (names || "১৬ লাইন ইন্দো-পাক"))),
      onSwitchMode && h("div", { role: "group", "aria-label": "পড়ার ধরন", style: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: 2 } },
        seg("list", "তালিকা", false, "list"), seg("read", "রিডিং", false, "read"), seg("mushaf", "মুসহাফ", true, "mushaf")),
      h("button", { type: "button", onClick: () => setSheet(true), "aria-label": "মুসহাফ-সেটিংস ও পৃষ্ঠায় যান", style: { minHeight: 44, minWidth: 44, color: "#fff", fontWeight: 700, fontSize: 18 } }, "Aa")
    ),
    h("div", { ref: bodyRef, "data-testid": "mushaf16-body", onTouchStart, onTouchEnd, style: { flex: 1, overflowY: "auto", padding: "8px 6px 14px", background: th.bar } },
      h("div", { style: { background: th.bg, borderRadius: 14, border: "1px solid " + LINE, padding: "8px 6px" } },
        state.status === "loading" && h("p", { className: "text-center text-sm py-16", style: { opacity: 0.6 } }, "লোড হচ্ছে…"),
        state.status === "error" && h("div", { className: "text-center py-16" },
          h("p", { className: "text-sm mb-3" }, "পৃষ্ঠাটি লোড করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।"),
          h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")),
        h("div", { ref: boxRef, style: { width: "100%" } }, state.status === "ready" && lines.map(renderLine)),
        state.status === "ready" && h("div", { style: { textAlign: "center", marginTop: 10 } }, h(Rosette, { n: toBnDigits(page), size: 36, font: "12px", color: accent, bg: th.bar, ring: true }))
      ),
      state.status === "ready" && h("p", { style: { fontSize: 11, opacity: 0.55, textAlign: "center", margin: "12px 0 4px", lineHeight: 1.6 } }, "শব্দে ট্যাপ করলে ওই আয়াতের অনুবাদ ও অপশন খুলবে। পাতা উল্টাতে ডানে-বামে টানুন।")
    ),
    h("div", { style: { display: "flex", gap: 8, padding: "8px 12px calc(8px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid " + LINE, background: th.bg } },
      navBtn("‹ আগের", page - 1, page <= 1),
      h("button", { type: "button", onClick: () => setSheet(true), style: { flex: 1, minHeight: 44, color: th.fg, fontSize: 13, opacity: 0.8 } }, "পৃষ্ঠায় যান"),
      navBtn("পরের ›", page + 1, page >= M16_PAGES)
    ),
    sel && h(AyahSheet, {
      surah: selSurah, ayah: sel, th, accent, trSize: prefs.trSize,
      flash: actions.flash.key === selKey ? actions.flash.kind : "",
      bm: marked.has(markKey(sel.s, sel.n, "b")), fav: marked.has(markKey(sel.s, sel.n, "f")),
      onCopy: actions.onCopy, onShare: actions.onShare, onMark: actions.toggle,
      onClose: () => setSel(null),
    }),
    sheet && h(MushafSheet, {
      prefs, th, accent, page: page || 1, total: M16_PAGES, hideSize: true, hideLayout: true,
      note: "১৬-লাইনের পৃষ্ঠায় লেখা পর্দার প্রস্থ অনুযায়ী নিজে বসে যায়। বড় করে পড়তে ফোন আড়াআড়ি ধরুন।",
      onPrefs: setPrefs, onJump: (n) => { setSheet(false); go(n); }, onClose: () => setSheet(false),
    })
  );
}
