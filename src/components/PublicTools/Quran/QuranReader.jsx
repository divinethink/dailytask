// QuranReader.jsx — একটা সূরার পূর্ণ-স্ক্রিন পাঠ: বিসমিল্লাহ-শিরোনাম, আরবি + বাংলা অনুবাদ।
// ৩০ আয়াত করে রেন্ডার (লম্বা সূরায় ধীর হয় না); পাঠের অবস্থান থেমে থেমে onPosition-এ জানায়।
// ধাপ ৩: পাঠ-সেটিংস (ফন্ট-সাইজ, থিম, আরবি/অনুবাদ সুইচ, আয়াতে যান), পারা/পৃষ্ঠা/সিজদার দাগ, কপি ও শেয়ার।
// ধাপ ৬খ: "তালিকা / রিডিং" সুইচ — রিডিং মোডে অনুবাদ ছাড়া অবিচ্ছিন্ন আরবি (আয়াতে ট্যাপ করলে শিট)।
// React global(window.React, globals.js)।

import { ChevronLeft, CopyIcon, ShareIcon } from "../../icons.jsx";
import { useBackLayer } from "../../../legacy/backNav.js";
import { THEMES } from "../../../legacy/readerCore.js";
import { loadSurah } from "../../../legacy/quranData.js";
import {
  PAGE_SIZE, AR_SIZE, TR_SIZE, PARA_NAMES, showBismillahHeader, surahTypeLabel, toBnDigits,
  locateAyah, ayahShareText, markKey, MARKS_MAX,
} from "../../../legacy/quranCore.js";
import { fontStack } from "../../../legacy/quranFonts.js";
import { PRIMARY, TRANSLATOR, LINE, copyText, BookmarkSvg, HeartSvg, actBtn, Stepper, AyahFlow, AyahSheet, FontPicker, useEnsureFont } from "./quranUi.jsx";

const { useState, useEffect, useRef, useCallback, useMemo, memo } = React;
const h = React.createElement;

// প্রতিটা আয়াত আলাদা memo: পাঠের অবস্থান বদলালে ২৮৬টা আয়াত আবার আঁকা হয় না।
const AyahRow = memo(function AyahRow({ a, prefs, th, accent, juzNo, pageNo, sajda, flash, bm, fav, onCopy, onShare, onMark }) {
  const muted = { color: th.fg, opacity: 0.62 };
  return h("div", { id: "q-a-" + a.n, "data-a": a.n, style: { padding: "14px 0", borderBottom: "1px solid " + LINE } },
    juzNo > 0 && h("div", { style: { textAlign: "center", margin: "0 0 12px" } },
      h("span", { style: { display: "inline-block", padding: "4px 14px", borderRadius: 999, background: th.bar, color: accent, fontSize: 12, fontWeight: 600 } },
        "পারা " + toBnDigits(juzNo) + " · " + PARA_NAMES[juzNo - 1])
    ),
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } },
      h("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 14, background: th.bar, color: accent, fontSize: 13, fontWeight: 600 } }, toBnDigits(a.n)),
      h("span", { style: { fontSize: 11, ...muted } },
        sajda ? "۩ সিজদার আয়াত" : null, sajda && pageNo ? "  ·  " : null, pageNo ? "পৃষ্ঠা " + toBnDigits(pageNo) : null)
    ),
    prefs.showAr && h("div", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(prefs.arFont), fontSize: prefs.arSize, lineHeight: 2.2, color: th.fg } }, a.ar),
    prefs.showTr && h("p", { style: { fontSize: prefs.trSize, lineHeight: 1.8, color: th.fg, opacity: 0.9, marginTop: prefs.showAr ? 6 : 0 } }, a.tr),
    h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 } },
      h("button", { type: "button", onClick: () => onCopy(a), style: actBtn(accent), "aria-label": "আয়াত " + toBnDigits(a.n) + " কপি করুন" },
        h(CopyIcon, { size: 17 }), flash === "copy" ? "কপি হয়েছে ✓" : flash === "fail" ? "কপি করা যায়নি" : "কপি"),
      h("button", { type: "button", onClick: () => onShare(a), style: actBtn(accent), "aria-label": "আয়াত " + toBnDigits(a.n) + " শেয়ার করুন" },
        h(ShareIcon, { size: 17 }), "শেয়ার"),
      h("button", { type: "button", onClick: () => onMark(a, "b"), style: actBtn(accent), "aria-pressed": bm, "aria-label": "আয়াত " + toBnDigits(a.n) + (bm ? " বুকমার্ক থেকে সরান" : " বুকমার্ক করুন") },
        h(BookmarkSvg, { on: bm }), bm ? "বুকমার্কড" : "বুকমার্ক"),
      h("button", { type: "button", onClick: () => onMark(a, "f"), style: actBtn(accent), "aria-pressed": fav, "aria-label": "আয়াত " + toBnDigits(a.n) + (fav ? " পছন্দ থেকে সরান" : " পছন্দের তালিকায় রাখুন") },
        h(HeartSvg, { on: fav }), "পছন্দ")
    ),
    flash === "full" && h("div", { style: { fontSize: 12, color: "#D64545", marginTop: 2 } }, "সংরক্ষণের সীমা (" + toBnDigits(MARKS_MAX) + "টি) পূর্ণ। আগে কিছু সরান।")
  );
});

function SettingsSheet({ prefs, th, accent, total, curAyah, onPrefs, onJump, onClose }) {
  const [jumpVal, setJumpVal] = useState("");
  const [bad, setBad] = useState(false);
  const toggle = (key, other, label) => {
    const lastOne = prefs[key] && !prefs[other]; // একমাত্র চালু সুইচটা বন্ধ করা যাবে না
    return h("label", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", fontSize: 14, opacity: lastOne ? 0.6 : 1 } },
      label,
      h("input", { type: "checkbox", checked: prefs[key], disabled: lastOne, onChange: (e) => onPrefs({ ...prefs, [key]: e.target.checked }), style: { width: 22, height: 22, accentColor: "#2F9E44" } })
    );
  };
  const themeBtn = (idx, label) => {
    const t = THEMES[idx];
    const on = prefs.theme === idx;
    return h("button", {
      key: idx, type: "button", onClick: () => onPrefs({ ...prefs, theme: idx }),
      style: { flex: 1, minHeight: 44, borderRadius: 12, background: t.bg, color: t.fg, fontSize: 13, fontWeight: 600, border: on ? "2px solid " + accent : "1px solid " + LINE },
      "aria-pressed": on,
    }, label);
  };
  const go = () => {
    const n = Number(String(jumpVal).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d)));
    if (!Number.isInteger(n) || n < 1 || n > total) { setBad(true); return; }
    setBad(false);
    onJump(n);
  };
  return h("div", { style: { position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(0,0,0,0.4)" }, onClick: onClose },
    h("div", { onClick: (e) => e.stopPropagation(), style: { background: th.bg, color: th.fg, borderRadius: "18px 18px 0 0", padding: "14px 18px 22px", maxHeight: "85%", overflowY: "auto" } },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } },
        h("strong", { style: { fontSize: 16 } }, "পাঠ-সেটিংস"),
        h("button", { type: "button", onClick: onClose, style: { minHeight: 40, padding: "0 12px", color: accent, fontWeight: 600 } }, "বন্ধ করুন")
      ),
      h(Stepper, { label: "আরবি লেখার আকার", value: prefs.arSize, lim: AR_SIZE, th, onChange: (v) => onPrefs({ ...prefs, arSize: v }) }),
      h(Stepper, { label: "অনুবাদের আকার", value: prefs.trSize, lim: TR_SIZE, th, onChange: (v) => onPrefs({ ...prefs, trSize: v }) }),
      prefs.mode !== "read" && h("div", { style: { borderTop: "1px solid " + LINE, marginTop: 6 } }),
      prefs.mode !== "read" && toggle("showAr", "showTr", "আরবি দেখান"),
      prefs.mode !== "read" && toggle("showTr", "showAr", "বাংলা অনুবাদ দেখান"),
      h("div", { style: { borderTop: "1px solid " + LINE, margin: "6px 0 10px" } }),
      h("div", { style: { fontSize: 14, marginBottom: 8 } }, "পাতার রং"),
      h("div", { style: { display: "flex", gap: 8 } }, themeBtn(0, "সাদা"), themeBtn(1, "সেপিয়া"), themeBtn(2, "ডার্ক")),
      h("div", { style: { borderTop: "1px solid " + LINE, margin: "14px 0 10px" } }),
      h(FontPicker, { prefs, th, accent, script: "simple", onPrefs }),
      h("div", { style: { borderTop: "1px solid " + LINE, margin: "14px 0 10px" } }),
      h("div", { style: { fontSize: 14, marginBottom: 8 } }, "এই সূরার আয়াতে যান (১–" + toBnDigits(total) + ")"),
      h("div", { style: { display: "flex", gap: 8 } },
        h("input", {
          type: "text", inputMode: "numeric", value: jumpVal, placeholder: "যেমন " + toBnDigits(Math.max(1, Math.min(total, curAyah + 9))),
          onChange: (e) => { setJumpVal(e.target.value); setBad(false); },
          onKeyDown: (e) => { if (e.key === "Enter") go(); },
          style: { flex: 1, minHeight: 44, borderRadius: 12, border: "1px solid " + (bad ? "#D64545" : LINE), padding: "0 12px", fontSize: 16, background: "transparent", color: th.fg },
        }),
        h("button", { type: "button", onClick: go, style: { minHeight: 44, padding: "0 20px", borderRadius: 12, background: PRIMARY, color: "#fff", fontWeight: 600 } }, "যান")
      ),
      bad && h("div", { style: { color: "#D64545", fontSize: 12, marginTop: 6 } }, "১ থেকে " + toBnDigits(total) + "-এর মধ্যে একটা নম্বর লিখুন।")
    )
  );
}

export function QuranReader({ surah, meta, markers, prefs, onPrefs, startAyah, bismillah, onClose, onPosition, onNavigate, marked, onMark, onOpenMushaf }) {
  const start = startAyah > 1 ? startAyah : 1;
  const [state, setState] = useState({ status: "loading", ayahs: null });
  const [shown, setShown] = useState(Math.max(PAGE_SIZE, start + 10));
  const [tries, setTries] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [jump, setJump] = useState(null);
  const [cur, setCur] = useState(start);
  const [flash, setFlash] = useState({ n: 0, kind: "" });
  const [sel, setSel] = useState(null); // রিডিং মোডে ট্যাপ করা আয়াত
  const bodyRef = useRef(null);
  const sentinelRef = useRef(null);
  const posRef = useRef(0);
  const posCb = useRef(onPosition);
  posCb.current = onPosition;
  const flashTimer = useRef(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const onMarkRef = useRef(onMark);
  onMarkRef.current = onMark;

  useBackLayer(true, onClose);
  useEnsureFont(prefs.arFont);
  useBackLayer(sheet, () => setSheet(false));

  const th = THEMES[prefs.theme] || THEMES[0];
  const accent = prefs.theme === 2 ? "#9FD4C4" : PRIMARY;

  useEffect(() => {
    let alive = true;
    setState({ status: "loading", ayahs: null });
    loadSurah(surah)
      .then((ayahs) => { if (alive) setState({ status: "ready", ayahs }); })
      .catch(() => { if (alive) setState({ status: "error", ayahs: null }); });
    return () => { alive = false; };
  }, [surah.n, tries]);

  const ready = state.status === "ready";
  const total = surah.ayahs;

  // খোলার পর নির্দিষ্ট আয়াতে যাওয়া + প্রথম অবস্থান সংরক্ষণ।
  useEffect(() => {
    if (!ready) return;
    posRef.current = start;
    posCb.current(surah.n, start);
    if (start > 1) {
      const el = document.getElementById("q-a-" + start);
      if (el) el.scrollIntoView({ block: "start" });
    }
  }, [ready]);

  // মোড বদলালে বর্তমান আয়াতে ফিরে যাওয়া (লেআউট বদলে স্ক্রল হারিয়ে যায়)।
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) { firstMode.current = false; return undefined; }
    setSel(null);
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById("q-a-" + (posRef.current || 1));
      if ((posRef.current || 1) <= 1 && bodyRef.current) bodyRef.current.scrollTop = 0; // শুরুতে থাকলে বিসমিল্লাহসহ ওপরে
      else if (el) el.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [prefs.mode]);

  // "আয়াতে যান": আয়াত এখনো রেন্ডার না হলে আগে তালিকা বাড়ানো, তারপর স্ক্রল।
  useEffect(() => {
    if (!jump || !ready) return;
    const el = document.getElementById("q-a-" + jump);
    if (el) { el.scrollIntoView({ block: "start" }); setJump(null); }
    else setShown((s) => Math.min(total, Math.max(s, jump + 10)));
  }, [jump, shown, ready]);

  // স্ক্রল-শেষে আরও আয়াত দেখানো।
  useEffect(() => {
    if (!ready || shown >= total) return undefined;
    const root = bodyRef.current;
    const el = sentinelRef.current;
    if (!root || !el || typeof IntersectionObserver === "undefined") { setShown(total); return undefined; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setShown((s) => Math.min(total, s + PAGE_SIZE));
    }, { root, rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ready, shown, total]);

  // পাঠের অবস্থান: স্ক্রিনের ওপরের অংশে যে আয়াত, তা ০.৭ সেকেন্ড থেমে থাকলে সংরক্ষণ ও শিরোনামে পারা/পৃষ্ঠা হালনাগাদ।
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === "undefined") return undefined;
    const root = bodyRef.current;
    if (!root) return undefined;
    let timer = null;
    const io = new IntersectionObserver((es) => {
      let a = 0;
      es.forEach((e) => { if (e.isIntersecting) a = Math.max(a, Number(e.target.dataset.a) || 0); });
      if (!a || a === posRef.current) return;
      posRef.current = a;
      clearTimeout(timer);
      timer = setTimeout(() => { posCb.current(surah.n, a); setCur(a); }, 700);
    }, { root, rootMargin: "0px 0px -75% 0px" });
    root.querySelectorAll("[data-a]").forEach((el) => io.observe(el));
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [ready, shown, prefs.mode]);

  // বন্ধ করার সময় শেষ অবস্থান নিশ্চিত সংরক্ষণ।
  useEffect(() => () => {
    if (posRef.current) posCb.current(surah.n, posRef.current);
    clearTimeout(flashTimer.current);
  }, []);

  const flashFor = useCallback((n, kind) => {
    setFlash({ n, kind });
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash({ n: 0, kind: "" }), 1500);
  }, []);

  // রিডিং মোডের শিটে আরবি + অনুবাদ দুটোই দেখানো হয়, তাই কপি/শেয়ারেও দুটোই।
  const textPrefs = () => (prefsRef.current.mode === "read" ? { ...prefsRef.current, showAr: true, showTr: true } : prefsRef.current);
  const onCopy = useCallback(async (a) => {
    const ok = await copyText(ayahShareText(surah, a, textPrefs(), TRANSLATOR));
    flashFor(a.n, ok ? "copy" : "fail");
  }, [surah, flashFor]);

  const onShare = useCallback(async (a) => {
    const text = ayahShareText(surah, a, textPrefs(), TRANSLATOR);
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) {
        if (e && e.name === "AbortError") return; // ব্যবহারকারী নিজে বাতিল করেছেন
      }
    }
    const ok = await copyText(text); // শেয়ার সম্ভব না হলে কপি
    flashFor(a.n, ok ? "copy" : "fail");
  }, [surah, flashFor]);

  const toggleMarkAt = useCallback((a, kind) => {
    const r = onMarkRef.current(surah.n, a.n, kind);
    if (r && r.full) flashFor(a.n, "full");
  }, [surah.n, flashFor]);

  const ayahs = useMemo(() => (ready ? state.ayahs.slice(0, shown) : []), [ready, state.ayahs, shown]);
  const reading = prefs.mode === "read";
  const flowItems = useMemo(() => (reading ? ayahs.map((a) => ({ s: surah.n, n: a.n, ar: a.ar })) : []), [reading, ayahs, surah.n]);
  const prev = surah.n > 1 ? meta.surahs[surah.n - 2] : null;
  const next = surah.n < 114 ? meta.surahs[surah.n] : null;
  const where = locateAyah(meta, surah.n, cur);

  const navBtn = (label, target) =>
    h("button", {
      type: "button",
      onClick: () => onNavigate(target.n),
      className: "flex-1 py-3 rounded-xl border text-sm font-semibold",
      style: { borderColor: LINE, color: accent, background: "transparent" },
    }, label);

  const headBg = prefs.theme === 2 ? th.bar : PRIMARY;
  const modeBtn = (id, label) => h("button", {
    key: id, type: "button", onClick: () => prefs.mode !== id && onPrefs({ ...prefs, mode: id }), "aria-pressed": prefs.mode === id,
    style: { minHeight: 40, padding: "0 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: "1px solid " + (prefs.mode === id ? accent : LINE), background: prefs.mode === id ? th.bar : "transparent", color: prefs.mode === id ? accent : th.fg },
  }, label);

  return h("div", { style: { position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", background: th.bg, color: th.fg, fontFamily: "'Hind Siliguri', sans-serif" } },
    h("div", { style: { background: headBg, color: "#fff", padding: "10px 8px 10px 12px", display: "flex", alignItems: "center", gap: 8 } },
      h("button", { type: "button", onClick: onClose, "aria-label": "ফিরে যান", style: { padding: 8, color: "#fff" } }, h(ChevronLeft, { size: 22 })),
      h("div", { style: { minWidth: 0, flex: 1 } },
        h("div", { style: { fontWeight: 600, fontSize: 17, lineHeight: 1.3 } }, toBnDigits(surah.n) + ". " + surah.bn),
        h("div", { style: { fontSize: 12, opacity: 0.85 } },
          surah.mean + " · " + surahTypeLabel(surah.type) + " · " + toBnDigits(surah.ayahs) + " আয়াত"),
        ready && h("div", { style: { fontSize: 11, opacity: 0.75 } }, "পারা " + toBnDigits(where.juz) + " · পৃষ্ঠা " + toBnDigits(where.page))
      ),
      h("button", { type: "button", onClick: () => setSheet(true), "aria-label": "পাঠ-সেটিংস", style: { minWidth: 48, minHeight: 44, color: "#fff", fontSize: 20, fontWeight: 600 } }, "Aa")
    ),
    h("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid " + LINE } },
      modeBtn("list", "তালিকা"), modeBtn("read", "রিডিং"),
      h("span", { style: { flex: 1 } }),
      onOpenMushaf && ready && h("button", { type: "button", onClick: () => onOpenMushaf(where.page), style: { minHeight: 40, padding: "0 12px", borderRadius: 999, border: "1px solid " + LINE, color: accent, fontSize: 13, fontWeight: 600, background: "transparent" } }, "পৃষ্ঠা-মুসহাফ")
    ),
    h("div", { ref: bodyRef, style: { flex: 1, overflowY: "auto", padding: "0 16px 40px" } },
      state.status === "loading" && h("p", { className: "text-center text-sm py-16", style: { opacity: 0.6 } }, "লোড হচ্ছে…"),
      state.status === "error" && h("div", { className: "text-center py-16" },
        h("p", { className: "text-sm mb-3" }, "সূরাটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
        h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")
      ),
      ready && showBismillahHeader(surah.n) && bismillah && (prefs.showAr || reading) && h("div", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(prefs.arFont), fontSize: prefs.arSize, lineHeight: 2.2, textAlign: "center", padding: "20px 0 8px", color: th.fg } }, bismillah),
      ready && reading && h(AyahFlow, {
        items: flowItems, meta, markers, th, accent, arSize: prefs.arSize, font: prefs.arFont,
        activeKey: sel ? surah.n + ":" + sel.n : "", onTap: (it) => setSel(ayahs[it.n - 1]),
        headers: false, dividers: true, withIds: true,
      }),
      !reading && ayahs.map((a) => {
        const k = surah.n + ":" + a.n;
        return h(AyahRow, {
          key: a.n, a, prefs, th, accent,
          juzNo: markers.juz.get(k) || 0,
          pageNo: markers.page.get(k) || 0,
          sajda: markers.sajda.has(k),
          flash: flash.n === a.n ? flash.kind : "",
          bm: marked.has(markKey(surah.n, a.n, "b")),
          fav: marked.has(markKey(surah.n, a.n, "f")),
          onCopy, onShare, onMark: toggleMarkAt,
        });
      }),
      ready && shown < total && h("div", { ref: sentinelRef, style: { height: 40 }, "aria-hidden": "true" }),
      ready && shown >= total && h("div", null,
        h("div", { style: { display: "flex", gap: 10, marginTop: 24 } },
          prev ? navBtn("← " + prev.bn, prev) : null,
          next ? navBtn(next.bn + " →", next) : null
        ),
        h("p", { style: { fontSize: 11, opacity: 0.6, textAlign: "center", marginTop: 20, lineHeight: 1.6 } },
          "আরবি পাঠ: ",
          h("a", { href: "https://tanzil.net", target: "_blank", rel: "noopener noreferrer", style: { textDecoration: "underline" } }, "Tanzil.net"),
          " · বাংলা অনুবাদ: " + TRANSLATOR
        )
      )
    ),
    reading && sel && h(AyahSheet, {
      surah, ayah: sel, th, accent, trSize: prefs.trSize,
      flash: flash.n === sel.n ? flash.kind : "",
      bm: marked.has(markKey(surah.n, sel.n, "b")), fav: marked.has(markKey(surah.n, sel.n, "f")),
      onCopy, onShare, onMark: toggleMarkAt, onClose: () => setSel(null),
    }),
    sheet && h(SettingsSheet, {
      prefs, th, accent, total, curAyah: cur, onPrefs,
      onJump: (n) => { setSheet(false); setJump(n); },
      onClose: () => setSheet(false),
    })
  );
}
