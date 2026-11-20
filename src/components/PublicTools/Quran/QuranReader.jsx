// QuranReader.jsx — একটা সূরার পূর্ণ-স্ক্রিন পাঠ: বিসমিল্লাহ-শিরোনাম, আরবি + বাংলা অনুবাদ।
// ৩০ আয়াত করে রেন্ডার (লম্বা সূরায় ধীর হয় না); পাঠের অবস্থান থেমে থেমে onPosition-এ জানায়।
// ধাপ ৩: পাঠ-সেটিংস (ফন্ট-সাইজ, থিম, আরবি/অনুবাদ সুইচ, আয়াতে যান), পারা/পৃষ্ঠা/সিজদার দাগ, কপি ও শেয়ার।
// ধাপ ৬খ: "তালিকা / রিডিং" সুইচ — রিডিং মোডে অনুবাদ ছাড়া অবিচ্ছিন্ন আরবি (আয়াতে ট্যাপ করলে শিট)।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../../icons.jsx";
import { useBackLayer } from "../../../legacy/backNav.js";
import { loadSurah, loadWbw } from "../../../legacy/quranData.js";
import {
  PAGE_SIZE, PARA_NAMES, showBismillahHeader, surahTypeLabel, toBnDigits,
  locateAyah, ayahShareText, markKey, MARKS_MAX, rukuOf, alignWords, wbwSupported, AR_SIZE, TR_SIZE,
} from "../../../legacy/quranCore.js";
import { fontStack, scriptById, DEFAULT_SCRIPT } from "../../../legacy/quranFonts.js";
import { PRIMARY, TRANSLATOR, LINE, copyText, AyahActions, AyahFlow, AyahSheet, SurahBanner, SettingsSheet, readerTheme, useEnsureFont } from "./quranUi.jsx";

const { useState, useEffect, useRef, useCallback, useMemo, memo } = React;
const h = React.createElement;

// প্রতিটা আয়াত আলাদা memo: পাঠের অবস্থান বদলালে ২৮৬টা আয়াত আবার আঁকা হয় না।
const AyahRow = memo(function AyahRow({ a, surah, prefs, th, accent, juzNo, pageNo, rukuNo, sajda, flash, bm, fav, wbwRaw, onCopy, onShare, onMark }) {
  const muted = { color: th.fg, opacity: 0.62 };
  // শব্দে শব্দে অর্থ: শুধু সমর্থিত লেখায় ও শব্দ-সংখ্যা মিললে; নইলে সাধারণ আয়াত (alignWords null)।
  const words = prefs.showAr && prefs.wbw && wbwSupported(prefs.arScript) ? alignWords(a.ar, wbwRaw) : null;
  return h("div", { id: "q-a-" + a.n, "data-a": a.n, style: { padding: "14px 0", borderBottom: "1px solid " + LINE } },
    (juzNo > 0 || pageNo > 0) && h("div", { style: { textAlign: "center", margin: "0 0 10px", padding: "3px 10px", borderRadius: 8, background: th.bar, color: accent, fontSize: 11.5, fontWeight: 600 } },
      [juzNo > 0 ? "পারা " + toBnDigits(juzNo) + " · " + PARA_NAMES[juzNo - 1] : "", pageNo > 0 ? "পৃষ্ঠা " + toBnDigits(pageNo) : "", rukuNo > 0 ? "রুকু " + toBnDigits(rukuNo) : ""].filter(Boolean).join(" · ")
    ),
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } },
      h("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 26, height: 26, padding: "0 7px", borderRadius: 13, background: th.bar, color: accent, fontSize: 12, fontWeight: 600 } }, toBnDigits(a.n)),
      sajda && h("span", { style: { fontSize: 11, ...muted } }, "۩ সিজদার আয়াত")
    ),
    prefs.showAr && !words && h("div", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(prefs.arFont), fontSize: prefs.arSize, lineHeight: 2.2, color: th.fg } }, a.ar),
    words && h("div", { dir: "rtl", style: { display: "flex", flexWrap: "wrap", gap: "10px 14px", color: th.fg } },
      words.map((w, i) => h("div", { key: i, style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 110 } },
        h("span", { lang: "ar", style: { fontFamily: fontStack(prefs.arFont), fontSize: prefs.arSize, lineHeight: 1.9 } }, w.ar),
        h("span", { dir: "ltr", lang: "en", style: { fontSize: Math.max(11, prefs.trSize - 4), lineHeight: 1.35, opacity: 0.75, marginTop: 2 } }, w.en)
      ))
    ),
    prefs.showTr && h("p", { style: { fontSize: prefs.trSize, lineHeight: 1.85, color: th.fg, opacity: 0.92, marginTop: prefs.showAr ? 8 : 0, paddingLeft: 12, borderLeft: "3px solid rgba(200,155,60,0.7)" } }, a.tr),
    h(AyahActions, { a, surah: prefs.tafsir !== false ? surah : null, th, trSize: prefs.trSize, accent, flash, bm, fav, onCopy, onShare, onMark, extraTafsir: true, arFont: prefs.arFont }),
    flash === "full" && h("div", { style: { fontSize: 12, color: "#D64545", marginTop: 2 } }, "সংরক্ষণের সীমা (" + toBnDigits(MARKS_MAX) + "টি) পূর্ণ। আগে কিছু সরান।")
  );
});

// "এই সূরার আয়াতে যান" — রিডারের সেটিংস-শিটের বাড়তি অংশ।
function AyahJump({ total, curAyah, th, onJump }) {
  const [jumpVal, setJumpVal] = useState("");
  const [bad, setBad] = useState(false);
  const go = () => {
    const n = Number(String(jumpVal).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d)));
    if (!Number.isInteger(n) || n < 1 || n > total) { setBad(true); return; }
    setBad(false);
    onJump(n);
  };
  return h("div", null,
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
  );
}

export function QuranReader({ surah, meta, markers, prefs, onPrefs, startAyah, bismillah, onClose, onPosition, onNavigate, marked, onMark }) {
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
  const onPrefsRef = useRef(onPrefs);
  onPrefsRef.current = onPrefs;

  // দুই-আঙুল পিঞ্চ → আরবি ও অনুবাদের আকার একসাথে (সেটিংসের সীমার ভেতরে)।
  // মসৃণতার জন্য: আঙুল নাড়ার সময় শুধু CSS scale (GPU, কোনো re-render/reflow/সেভ নেই);
  // আঙুল তুললে একবারই আসল আকার বসে এবং পিঞ্চের জায়গার লেখা একই স্থানে থাকে।
  const zoomRef = useRef(null);
  const pendingRef = useRef(null);
  useEffect(() => {
    const el = bodyRef.current;
    const z = zoomRef.current;
    if (!el || !z) return undefined;
    let d0 = 0, a0 = 0, t0 = 0, r = 1, lo = 1, hi = 1, raf = 0, midX = 0, midY = 0, anchor = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const clamp = (v, lim, step) => Math.min(lim.max, Math.max(lim.min, Math.round(v / step) * step));
    const paint = () => { raf = 0; z.style.transform = "scale(" + r.toFixed(4) + ")"; };
    const reset = () => { z.style.transform = ""; z.style.transformOrigin = ""; z.style.willChange = ""; };
    const ts = (e) => {
      if (e.touches.length !== 2) return;
      const p = prefsRef.current;
      d0 = dist(e.touches); a0 = p.arSize; t0 = p.trSize; r = 1;
      const reading = p.mode === "read";
      lo = reading ? AR_SIZE.min / a0 : Math.min(AR_SIZE.min / a0, TR_SIZE.min / t0);
      hi = reading ? AR_SIZE.max / a0 : Math.max(AR_SIZE.max / a0, TR_SIZE.max / t0);
      const box = el.getBoundingClientRect();
      const zb = z.getBoundingClientRect();
      midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const hit = document.elementFromPoint(midX, midY);
      const node = hit && hit.closest ? hit.closest("[data-a]") : null;
      anchor = node ? { n: node.getAttribute("data-a"), top: node.getBoundingClientRect().top - box.top } : null;
      z.style.transformOrigin = (midX - zb.left) + "px " + (midY - zb.top) + "px";
      z.style.willChange = "transform";
      pendingRef.current = { h0: z.offsetHeight, st: el.scrollTop, y: midY - box.top, anchor };
    };
    const tm = (e) => {
      if (e.touches.length !== 2 || d0 <= 0) return;
      e.preventDefault();
      r = Math.min(hi, Math.max(lo, dist(e.touches) / d0));
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const te = (e) => {
      if (e.touches.length >= 2 || d0 <= 0) return;
      d0 = 0;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      const ar = clamp(a0 * r, AR_SIZE, AR_SIZE.step);
      const tr = clamp(t0 * r, TR_SIZE, TR_SIZE.step);
      const p = prefsRef.current;
      if (ar !== p.arSize || tr !== p.trSize) onPrefsRef.current({ ...p, arSize: ar, trSize: tr });
      else { reset(); pendingRef.current = null; }
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te, { passive: true });
    el.addEventListener("touchcancel", te, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
      el.removeEventListener("touchcancel", te);
    };
  }, []);
  // নতুন আকার বসার পর (painting-এর আগে) scale সরানো ও পিঞ্চের জায়গার লেখা একই স্থানে ধরে রাখা
  React.useLayoutEffect(() => {
    const el = bodyRef.current;
    const z = zoomRef.current;
    const pd = pendingRef.current;
    if (!el || !z || !pd) return;
    pendingRef.current = null;
    z.style.transform = ""; z.style.transformOrigin = ""; z.style.willChange = "";
    const node = pd.anchor ? z.querySelector('[data-a="' + pd.anchor.n + '"]') : null;
    if (node) {
      el.scrollTop += (node.getBoundingClientRect().top - el.getBoundingClientRect().top) - pd.anchor.top;
    } else if (pd.h0 > 0) {
      el.scrollTop = (pd.st + pd.y) * (z.offsetHeight / pd.h0) - pd.y;
    }
  }, [prefs.arSize, prefs.trSize]);
  const onMarkRef = useRef(onMark);
  onMarkRef.current = onMark;

  useBackLayer(true, onClose);
  useEnsureFont(prefs.arFont);
  useBackLayer(sheet, () => setSheet(false));

  const { th, accent } = readerTheme(prefs);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading", ayahs: null });
    loadSurah(surah, undefined, prefs.arScript)
      .then((ayahs) => { if (alive) setState({ status: "ready", ayahs }); })
      .catch(() => { if (alive) setState({ status: "error", ayahs: null }); });
    return () => { alive = false; };
  }, [surah.n, tries, prefs.arScript]);

  // শব্দে শব্দে অর্থ: চালু + সমর্থিত লেখা + তালিকা-মোডে হলে তবেই লোড; ব্যর্থ হলে চুপচাপ সাধারণ আয়াত (পড়া আটকায় না)।
  const [wbw, setWbw] = useState(null);
  const wantWbw = !!prefs.wbw && wbwSupported(prefs.arScript) && prefs.mode !== "read";
  useEffect(() => {
    let alive = true;
    setWbw(null);
    if (wantWbw) loadWbw(surah).then((w) => { if (alive) setWbw(w); }).catch(() => {});
    return () => { alive = false; };
  }, [surah.n, wantWbw]);

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
  const seg = (key, label, on, onClick) => h("button", {
    key, type: "button", onClick, "aria-pressed": on,
    style: { minHeight: 40, padding: "0 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: "none", background: on ? "#fff" : "transparent", color: on ? "#1F2D2A" : "#fff" },
  }, label);

  return h("div", { style: { position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", background: th.bg, color: th.fg, fontFamily: "'Hind Siliguri', sans-serif" } },
    h("div", { style: { background: headBg, color: "#fff", padding: "6px 6px 6px 4px", display: "flex", alignItems: "center", gap: 4 } },
      h("button", { type: "button", onClick: onClose, "aria-label": "ফিরে যান", style: { padding: 8, color: "#fff" } }, h(ChevronLeft, { size: 22 })),
      h("div", { style: { minWidth: 0, flex: 1 } },
        h("div", { style: { fontWeight: 600, fontSize: 16, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
          toBnDigits(surah.n) + ". " + surah.bn),
        h("div", { style: { fontSize: 11.5, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
          ready ? "পারা " + toBnDigits(where.juz) + " · পৃষ্ঠা " + toBnDigits(where.page) : toBnDigits(surah.ayahs) + " আয়াত")
      ),
      h("div", { role: "group", "aria-label": "পড়ার ধরন", style: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: 2 } },
        seg("list", "তালিকা", prefs.mode === "list", () => prefs.mode !== "list" && onPrefs({ ...prefs, mode: "list" })),
        seg("read", "রিডিং", prefs.mode === "read", () => prefs.mode !== "read" && onPrefs({ ...prefs, mode: "read" }))
      ),
      h("button", { type: "button", onClick: () => setSheet(true), "aria-label": "পাঠ-সেটিংস", style: { minWidth: 44, minHeight: 44, color: "#fff", fontSize: 19, fontWeight: 600 } }, "Aa")
    ),
    h("div", { ref: bodyRef, style: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 16px 40px", touchAction: "pan-y" } },
    h("div", { ref: zoomRef },
      state.status === "loading" && h("p", { className: "text-center text-sm py-16", style: { opacity: 0.6 } }, "লোড হচ্ছে…"),
      state.status === "error" && h("div", { className: "text-center py-16" },
        h("p", { className: "text-sm mb-3" }, "সূরাটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
        h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")
      ),
      h("div", { style: { margin: "14px 0 4px" } }, h(SurahBanner, { s: surah, font: prefs.arFont, th, accent, extra: surah.mean + " · " + surahTypeLabel(surah.type) + " · " + toBnDigits(surah.ayahs) + " আয়াত" })),
      ready && showBismillahHeader(surah.n) && bismillah && (prefs.showAr || reading) && h("div", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(prefs.arFont), fontSize: prefs.arSize, lineHeight: 2.2, textAlign: "center", padding: "20px 0 8px", color: th.fg } }, (scriptById(prefs.arScript) || scriptById(DEFAULT_SCRIPT)).bismillah),
      ready && reading && h(AyahFlow, {
        items: flowItems, meta, markers, th, accent, arSize: prefs.arSize, font: prefs.arFont, script: prefs.arScript, align: prefs.arAlign, gap: prefs.arGap,
        activeKey: sel ? surah.n + ":" + sel.n : "", onTap: (it) => setSel(ayahs[it.n - 1]),
        headers: false, dividers: true, withIds: true,
      }),
      !reading && ayahs.map((a) => {
        const k = surah.n + ":" + a.n;
        return h(AyahRow, {
          key: a.n, a, surah, prefs, th, accent,
          juzNo: markers.juz.get(k) || 0,
          pageNo: markers.page.get(k) || 0,
          rukuNo: markers.page.get(k) || markers.juz.get(k) ? rukuOf(meta, surah.n, a.n) : 0,
          sajda: markers.sajda.has(k),
          flash: flash.n === a.n ? flash.kind : "",
          bm: marked.has(markKey(surah.n, a.n, "b")),
          fav: marked.has(markKey(surah.n, a.n, "f")),
          wbwRaw: wbw ? wbw[a.n - 1] : null,
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
    )),
    reading && sel && h(AyahSheet, {
      surah, ayah: sel, th, accent, trSize: prefs.trSize, tafsir: prefs.tafsir !== false, extraTafsir: true, arFont: prefs.arFont,
      flash: flash.n === sel.n ? flash.kind : "",
      bm: marked.has(markKey(surah.n, sel.n, "b")), fav: marked.has(markKey(surah.n, sel.n, "f")),
      onCopy, onShare, onMark: toggleMarkAt, onClose: () => setSel(null),
    }),
    sheet && h(SettingsSheet, {
      title: "পাঠ-সেটিংস", prefs, th, accent, onPrefs, switches: prefs.mode !== "read",
      onClose: () => setSheet(false),
    }, h(AyahJump, { total, curAyah: cur, th, onJump: (n) => { setSheet(false); setJump(n); } }))
  );
}
