// QuranMushaf.jsx — পৃষ্ঠা-মুসহাফ: মাদানী মুসহাফের ৬০৪ পৃষ্ঠা, সোয়াইপে পাতা উল্টানো।
// এক পৃষ্ঠায় একাধিক সূরা থাকলে মাঝে সূরার শিরোনাম বসে — সূরা পেরিয়েও পড়া যায়।
// লাইন-বিন্যাস ছাপা মুসহাফের ১৫ লাইনের হুবহু নয়; পৃষ্ঠার আয়াত-সীমা মাদানী মুসহাফের।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../../icons.jsx";
import { useBackLayer } from "../../../legacy/backNav.js";
import { THEMES } from "../../../legacy/readerCore.js";
import { loadSurah } from "../../../legacy/quranData.js";
import { AR_SIZE, PAGE_COUNT, clampPage, pageAyahRefs, locateAyah, toBnDigits, markKey } from "../../../legacy/quranCore.js";
import { PRIMARY, LINE, Stepper, AyahFlow, AyahSheet, useAyahActions, FontPicker, ScriptPicker, LayoutPicker, Rosette, useEnsureFont } from "./quranUi.jsx";

const { useState, useEffect, useRef } = React;
const h = React.createElement;

const SWIPE_MIN = 60; // পাতা উল্টাতে ন্যূনতম আঙুল-টানা (px)

function MushafSheet({ prefs, th, accent, page, onPrefs, onJump, onClose }) {
  useBackLayer(true, onClose);
  const [val, setVal] = useState("");
  const [bad, setBad] = useState(false);
  const go = () => {
    const n = Number(String(val).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d)));
    if (!Number.isInteger(n) || n < 1 || n > PAGE_COUNT) { setBad(true); return; }
    onJump(n);
  };
  const themeBtn = (idx, label) => {
    const t = THEMES[idx];
    const on = prefs.theme === idx;
    return h("button", { key: idx, type: "button", onClick: () => onPrefs({ ...prefs, theme: idx }), "aria-pressed": on,
      style: { flex: 1, minHeight: 44, borderRadius: 12, background: t.bg, color: t.fg, fontSize: 13, fontWeight: 600, border: on ? "2px solid " + accent : "1px solid " + LINE } }, label);
  };
  return h("div", { style: { position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(0,0,0,0.4)" }, onClick: onClose },
    h("div", { onClick: (e) => e.stopPropagation(), style: { background: th.bg, color: th.fg, borderRadius: "18px 18px 0 0", padding: "14px 18px 22px", maxHeight: "85%", overflowY: "auto" } },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } },
        h("strong", { style: { fontSize: 16 } }, "মুসহাফ-সেটিংস"),
        h("button", { type: "button", onClick: onClose, style: { minHeight: 40, padding: "0 12px", color: accent, fontWeight: 600 } }, "বন্ধ করুন")),
      h("div", { style: { fontSize: 14, margin: "8px 0" } }, "পৃষ্ঠায় যান (১–" + toBnDigits(PAGE_COUNT) + ")"),
      h("div", { style: { display: "flex", gap: 8 } },
        h("input", {
          type: "text", inputMode: "numeric", value: val, placeholder: "যেমন " + toBnDigits(Math.min(PAGE_COUNT, page + 9)),
          onChange: (e) => { setVal(e.target.value); setBad(false); },
          onKeyDown: (e) => { if (e.key === "Enter") go(); },
          "aria-label": "পৃষ্ঠা নম্বর",
          style: { flex: 1, minHeight: 44, borderRadius: 12, border: "1px solid " + (bad ? "#D64545" : LINE), padding: "0 12px", fontSize: 16, background: "transparent", color: th.fg },
        }),
        h("button", { type: "button", onClick: go, style: { minHeight: 44, padding: "0 20px", borderRadius: 12, background: PRIMARY, color: "#fff", fontWeight: 600 } }, "যান")),
      bad && h("div", { style: { color: "#D64545", fontSize: 12, marginTop: 6 } }, "১ থেকে " + toBnDigits(PAGE_COUNT) + "-এর মধ্যে একটা নম্বর লিখুন।"),
      h("div", { style: { borderTop: "1px solid " + LINE, margin: "14px 0 6px" } }),
      h(Stepper, { label: "আরবি লেখার আকার", value: prefs.arSize, lim: AR_SIZE, th, onChange: (v) => onPrefs({ ...prefs, arSize: v }) }),
      h("div", { style: { borderTop: "1px solid " + LINE, margin: "10px 0" } }),
      h(LayoutPicker, { prefs, th, accent, onPrefs }),
      h("div", { style: { borderTop: "1px solid " + LINE, margin: "10px 0" } }),
      h(ScriptPicker, { prefs, th, accent, onPrefs }),
      h("div", { style: { borderTop: "1px solid " + LINE, margin: "10px 0" } }),
      h(FontPicker, { prefs, th, accent, script: prefs.arScript, onPrefs }),
      h("div", { style: { fontSize: 14, margin: "12px 0 8px" } }, "পাতার রং"),
      h("div", { style: { display: "flex", gap: 8 } }, themeBtn(0, "সাদা"), themeBtn(1, "সেপিয়া"), themeBtn(2, "ডার্ক"))
    )
  );
}

export function QuranMushaf({ meta, markers, prefs, onPrefs, startPage, onClose, onSwitchMode, onPosition, marked, onMark }) {
  const [page, setPage] = useState(clampPage(startPage));
  const [state, setState] = useState({ status: "loading", items: null });
  const [tries, setTries] = useState(0);
  const [sel, setSel] = useState(null);
  const [sheet, setSheet] = useState(false);
  const bodyRef = useRef(null);
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

  // পৃষ্ঠার সূরাগুলো (সাধারণত ১–২টা) নামিয়ে আয়াত-তালিকা বানানো; আশপাশের পৃষ্ঠা আগেভাগে নামানো।
  useEffect(() => {
    let alive = true;
    setState({ status: "loading", items: null });
    setSel(null);
    const load = (p) => {
      const refs = pageAyahRefs(meta, p);
      const nos = [...new Set(refs.map((r) => r.s))];
      return Promise.all(nos.map((n) => loadSurah(meta.surahs[n - 1], undefined, prefs.arScript))).then((all) => {
        const by = new Map(nos.map((n, i) => [n, all[i]]));
        return refs.map((r) => { const a = by.get(r.s)[r.a - 1]; return { s: r.s, n: r.a, ar: a.ar, tr: a.tr }; });
      });
    };
    load(page)
      .then((items) => {
        if (!alive) return;
        setState({ status: "ready", items });
        if (bodyRef.current) {
          bodyRef.current.scrollTop = 0;
          if (bodyRef.current.animate) bodyRef.current.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 180 });
        }
        if (page > 1) load(page - 1).catch(() => {});
        if (page < PAGE_COUNT) load(page + 1).catch(() => {});
      })
      .catch(() => { if (alive) setState({ status: "error", items: null }); });
    return () => { alive = false; };
  }, [page, tries, prefs.arScript]);

  // শেষ পাঠ: পৃষ্ঠায় ১.৫ সেকেন্ড থাকলে প্রথম আয়াত সংরক্ষণ; বন্ধ করার সময়ও।
  useEffect(() => {
    if (state.status !== "ready") return undefined;
    const first = state.items[0];
    posRef.current = first;
    const t = setTimeout(() => posCb.current(first.s, first.n), 1500);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => () => { if (posRef.current) posCb.current(posRef.current.s, posRef.current.n); }, []);

  const go = (p) => setPage(clampPage(p));

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
    go(dx < 0 ? page + 1 : page - 1); // আরবি বইয়ের মতো: বাঁয়ে টানলে পরের পৃষ্ঠা
  };

  const items = state.items || [];
  const first = items[0];
  const where = first ? locateAyah(meta, first.s, first.n) : null;
  const names = [...new Set(items.map((x) => meta.surahs[x.s - 1].bn))].join(" · ");
  const selSurah = sel ? meta.surahs[sel.s - 1] : null;
  const selKey = sel ? sel.s + ":" + sel.n : "";

  const navBtn = (label, target, dis) => h("button", {
    type: "button", disabled: dis, onClick: () => go(target),
    style: { flex: 1, minHeight: 44, borderRadius: 12, border: "1px solid " + LINE, background: "transparent", color: accent, fontSize: 14, fontWeight: 600, opacity: dis ? 0.35 : 1 },
  }, label);

  // তালিকা/রিডিং চাপলে ওই পৃষ্ঠার প্রথম আয়াতে রিডার খোলে (মোড বদলে)।
  const seg = (key, label, on, mode) => h("button", {
    key, type: "button", "aria-pressed": on, disabled: !on && !first,
    onClick: () => { if (!on && first && onSwitchMode) onSwitchMode(mode, first.s, first.n); },
    style: { minHeight: 40, padding: "0 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: "none", background: on ? "#fff" : "transparent", color: on ? "#1F2D2A" : "#fff" },
  }, label);

  return h("div", { style: { position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", background: th.bg, color: th.fg, fontFamily: "'Hind Siliguri', sans-serif" } },
    h("div", { style: { background: headBg, color: "#fff", padding: "10px 8px 10px 12px", display: "flex", alignItems: "center", gap: 8 } },
      h("button", { type: "button", onClick: onClose, "aria-label": "ফিরে যান", style: { padding: 8, color: "#fff" } }, h(ChevronLeft, { size: 22 })),
      h("div", { style: { minWidth: 0, flex: 1 } },
        h("div", { style: { fontWeight: 600, fontSize: 17, lineHeight: 1.3 } }, "পৃষ্ঠা " + toBnDigits(page) + " / " + toBnDigits(PAGE_COUNT)),
        h("div", { style: { fontSize: 12, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, where ? "পারা " + toBnDigits(where.juz) + " · " + names : "")),
      onSwitchMode && h("div", { role: "group", "aria-label": "পড়ার ধরন", style: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: 2 } },
        seg("list", "তালিকা", false, "list"), seg("read", "রিডিং", false, "read"), seg("mushaf", "মুসহাফ", true, "mushaf")),
      h("button", { type: "button", onClick: () => setSheet(true), "aria-label": "মুসহাফ-সেটিংস ও পৃষ্ঠায় যান", style: { minWidth: 48, minHeight: 44, color: "#fff", fontSize: 20, fontWeight: 600 } }, "Aa")
    ),
    h("div", { ref: bodyRef, "data-testid": "mushaf-body", onTouchStart, onTouchEnd, style: { flex: 1, overflowY: "auto", padding: "12px 12px 16px", background: th.bar } },
      h("div", { style: { background: th.bg, borderRadius: 16, border: "1px solid " + LINE, boxShadow: "0 2px 12px rgba(0,0,0,0.08), inset 0 0 0 5px " + th.bg + ", inset 0 0 0 6px " + accent + "66", padding: "14px 16px 12px" } },
        state.status === "loading" && h("p", { className: "text-center text-sm py-16", style: { opacity: 0.6 } }, "লোড হচ্ছে…"),
        state.status === "error" && h("div", { className: "text-center py-16" },
          h("p", { className: "text-sm mb-3" }, "পৃষ্ঠাটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
          h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")),
        state.status === "ready" && h(AyahFlow, { items, meta, markers, th, accent, arSize: prefs.arSize, font: prefs.arFont, script: prefs.arScript, align: prefs.arAlign, gap: prefs.arGap, activeKey: selKey, onTap: setSel, headers: true, dividers: false, withIds: false }),
        state.status === "ready" && h("div", { style: { textAlign: "center", marginTop: 10 } }, h(Rosette, { n: toBnDigits(page), size: 36, font: "12px", color: accent, bg: th.bar, ring: true }))
      ),
      state.status === "ready" && h("p", { style: { fontSize: 11, opacity: 0.55, textAlign: "center", margin: "12px 0 4px", lineHeight: 1.6 } }, "আয়াতে ট্যাপ করলে অনুবাদ; সোয়াইপ করলে পাতা উল্টাবে")
    ),
    h("div", { style: { display: "flex", gap: 8, padding: "8px 12px calc(8px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid " + LINE, background: th.bg } },
      navBtn("‹ আগের", page - 1, page <= 1),
      h("button", { type: "button", onClick: () => setSheet(true), style: { flex: 1, minHeight: 44, color: th.fg, fontSize: 13, opacity: 0.8 } }, "পৃষ্ঠায় যান"),
      navBtn("পরের ›", page + 1, page >= PAGE_COUNT)
    ),
    sel && h(AyahSheet, {
      surah: selSurah, ayah: sel, th, accent, trSize: prefs.trSize,
      flash: actions.flash.key === selKey ? actions.flash.kind : "",
      bm: marked.has(markKey(sel.s, sel.n, "b")), fav: marked.has(markKey(sel.s, sel.n, "f")),
      onCopy: actions.onCopy, onShare: actions.onShare, onMark: actions.toggle,
      onClose: () => setSel(null),
    }),
    sheet && h(MushafSheet, { prefs, th, accent, page, onPrefs, onJump: (n) => { setSheet(false); go(n); }, onClose: () => setSheet(false) })
  );
}
