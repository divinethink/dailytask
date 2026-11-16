// quranUi.jsx — QuranReader ও QuranMushaf-এর ভাগ-করা অংশ: কপি, আইকন, স্টেপার,
// অবিচ্ছিন্ন আরবি লেখা (AyahFlow), আয়াত-শিট (AyahSheet) ও কপি/শেয়ার-হুক।
// আয়াতের নম্বর CSS-এর গোল চিহ্নে আঁকা (ফন্টের চিহ্ন নয়), যাতে যেকোনো ফন্টে ঠিক দেখায়।
// React global(window.React, globals.js)।

import { CopyIcon, ShareIcon, Icon } from "../../icons.jsx";
import { useBackLayer } from "../../../legacy/backNav.js";
import { fontStack, fontsForScript, SCRIPTS, scriptById, DEFAULT_SCRIPT, flowLayout } from "../../../legacy/quranFonts.js";
import { switchScript } from "../../../legacy/quranCore.js";
import { ensureFont } from "../../../legacy/quranFontLoader.js";
import { PARA_NAMES, showBismillahHeader, toBnDigits, ayahShareText, locateAyah, markKey, MARKS_MAX } from "../../../legacy/quranCore.js";

const { useState, useEffect, useRef, useCallback } = React;
const h = React.createElement;

export const PRIMARY = "var(--theme-primary, #0E4B43)";
export const TRANSLATOR = "মুহিউদ্দীন খান";
export const LINE = "rgba(128,128,128,0.28)";

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e2) { return false; }
  }
}

// বুকমার্ক ও পছন্দের আইকন: সংরক্ষিত থাকলে ভরাট।
export const BookmarkSvg = ({ on }) => h(Icon, { size: 17 }, h("path", { d: "M6 3h12v18l-6-4-6 4z", fill: on ? "currentColor" : "none" }));
export const HeartSvg = ({ on }) => h(Icon, { size: 17 }, h("path", { d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z", fill: on ? "currentColor" : "none" }));

export const actBtn = (color) => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 12px", borderRadius: 10, fontSize: 13, color, background: "transparent", border: "none", cursor: "pointer" });

export function Stepper({ label, value, lim, th, onChange }) {
  const btn = (txt, delta, dis) => h("button", {
    type: "button", disabled: dis, onClick: () => onChange(value + delta),
    style: { width: 44, height: 44, borderRadius: 12, border: "1px solid " + LINE, background: "transparent", color: th.fg, fontSize: 20, opacity: dis ? 0.35 : 1 },
    "aria-label": label + (delta > 0 ? " বাড়ান" : " কমান"),
  }, txt);
  return h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" } },
    h("span", { style: { fontSize: 14 } }, label),
    h("span", { style: { display: "flex", alignItems: "center", gap: 10 } },
      btn("−", -lim.step, value <= lim.min),
      h("span", { style: { minWidth: 28, textAlign: "center", fontWeight: 600 } }, toBnDigits(value)),
      btn("+", lim.step, value >= lim.max))
  );
}

// ───── আরবি ফন্ট-বাছাই (লাইভ প্রিভিউসহ) ─────
// বাছলেই পাঠ-পর্দায় বদলে যায়; ফন্ট নামার সময় আমিরি দেখায়, না নামলে জানায় ও আমিরিতেই চলে।
export function useEnsureFont(fontId) {
  useEffect(() => { ensureFont(fontId); }, [fontId]);
}

// ───── আরবি লেখার ধরন (Simple / উসমানি) ─────
// বদলালে পাঠ-পর্দা নতুন লেখা নামায়; ফন্ট বেমানান হলে ওই ধরনের ডিফল্ট ফন্ট বসে। বুকমার্ক/শেষ পাঠ সূরা:আয়াত ধরে, তাই অক্ষত।
export function ScriptPicker({ prefs, th, accent, onPrefs }) {
  return h("div", null,
    h("div", { style: { fontSize: 14, marginBottom: 8 } }, "আরবি লেখার ধরন"),
    h("div", { role: "radiogroup", "aria-label": "আরবি লেখার ধরন", style: { display: "flex", flexDirection: "column", gap: 6 } },
      SCRIPTS.map((sc) => {
        const on = prefs.arScript === sc.id;
        return h("button", {
          key: sc.id, type: "button", role: "radio", "aria-checked": on, onClick: () => { if (!on) onPrefs(switchScript(prefs, sc.id)); },
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44, padding: "6px 12px", borderRadius: 12, textAlign: "left", color: th.fg, background: "transparent", border: on ? "2px solid " + accent : "1px solid " + LINE },
        },
          h("span", null, h("span", { style: { display: "block", fontSize: 14, fontWeight: 600 } }, sc.name), h("span", { style: { display: "block", fontSize: 11, opacity: 0.6 } }, sc.note)),
          h("span", { style: { fontSize: 12, color: accent } }, on ? "বাছা ✓" : ""));
      })));
}

export function FontPicker({ prefs, th, accent, script, onPrefs }) {
  const [st, setSt] = useState({ id: "", status: "" }); // status: loading | fail
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const pick = (id) => {
    if (id === prefs.arFont) return;
    onPrefs({ ...prefs, arFont: id });
    setSt({ id, status: "loading" });
    ensureFont(id).then((ok) => { if (alive.current) setSt({ id, status: ok ? "" : "fail" }); });
  };
  const sc = scriptById(script) || scriptById(DEFAULT_SCRIPT);
  const list = fontsForScript(sc.id);
  return h("div", null,
    h("div", { style: { fontSize: 14, marginBottom: 8 } }, "আরবি ফন্ট"),
    h("div", { dir: "rtl", lang: "ar", "aria-label": "ফন্টের প্রিভিউ", style: { fontFamily: fontStack(prefs.arFont), fontSize: Math.min(prefs.arSize, 34), lineHeight: 2.1, textAlign: "center", padding: "6px 8px", borderRadius: 12, background: th.bar, color: th.fg } }, sc.sample),
    h("div", { role: "radiogroup", "aria-label": "আরবি ফন্ট", style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 } },
      list.map((f) => {
        const on = prefs.arFont === f.id;
        return h("button", {
          key: f.id, type: "button", role: "radio", "aria-checked": on, onClick: () => pick(f.id),
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44, padding: "0 12px", borderRadius: 12, textAlign: "left", color: th.fg, background: "transparent", border: on ? "2px solid " + accent : "1px solid " + LINE },
        },
          h("span", null, h("span", { style: { fontSize: 14, fontWeight: 600 } }, f.name), h("span", { style: { fontSize: 11, opacity: 0.6, marginLeft: 8 } }, f.family)),
          h("span", { style: { fontSize: 12, color: accent } }, on ? (st.id === f.id && st.status === "loading" ? "নামছে…" : "বাছা ✓") : ""));
      })),
    st.status === "fail" && h("div", { style: { color: "#D64545", fontSize: 12, marginTop: 6 } }, "ফন্টটা নামানো যায়নি (ইন্টারনেট দেখুন)। আপাতত আমিরি কুরআনে দেখানো হচ্ছে।")
  );
}

// ───── অবিচ্ছিন্ন আরবি লেখা ─────
// items: [{s, n, ar}] (ক্রমানুসারে, একাধিক সূরা থাকতে পারে)।
// headers: সূরার শিরোনাম + বিসমিল্লাহ বসবে কি (মুসহাফে হ্যাঁ; রিডারে নিজের শিরোনাম আছে, তাই না)।
// dividers: পৃষ্ঠা/পারার শুরুতে ডিভাইডার (রিডিং মোডে)।
// withIds: স্ক্রলে যাওয়া ও অবস্থান-ট্র্যাকিংয়ের জন্য id/data-a (শুধু একসূরার রিডারে)।
export function AyahFlow({ items, meta, markers, th, accent, arSize, font, script, activeKey, onTap, headers, dividers, withIds }) {
  const blocks = [];
  let run = [];
  const lay = flowLayout(script);
  const flush = (k) => {
    if (!run.length) return;
    blocks.push(h("div", { key: "p" + k, dir: "rtl", lang: "ar", style: { fontFamily: fontStack(font), fontSize: Math.round(arSize * lay.sizeScale), lineHeight: lay.lineHeight, textAlign: lay.textAlign, color: th.fg, margin: "4px 0" } }, run));
    run = [];
  };
  items.forEach((it, i) => {
    const key = it.s + ":" + it.n;
    const pageNo = markers.page.get(key) || (i === 0 && dividers ? locateAyah(meta, it.s, it.n).page : 0);
    const juzNo = markers.juz.get(key) || 0;
    if (dividers && (pageNo || juzNo)) {
      flush(key);
      blocks.push(h("div", { key: "d" + key, style: { margin: "14px 0 8px", padding: "4px 10px", textAlign: "center", background: th.bar, color: accent, fontSize: 12, fontWeight: 600, borderRadius: 8 } },
        (pageNo ? "পৃষ্ঠা " + toBnDigits(pageNo) : "") + (pageNo && juzNo ? " · " : "") + (juzNo ? "পারা " + toBnDigits(juzNo) + " · " + PARA_NAMES[juzNo - 1] : "")));
    }
    if (headers && it.n === 1) {
      flush(key);
      const sm = meta.surahs[it.s - 1];
      blocks.push(h("div", { key: "h" + key, style: { textAlign: "center", margin: "14px 0 6px" } },
        h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", border: "1.5px solid " + accent, borderRadius: 12, padding: "6px 14px", background: th.bar, color: accent } },
          h("span", { style: { fontSize: 12, fontWeight: 600 } }, toBnDigits(sm.n) + ". " + sm.bn),
          h("span", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(font), fontSize: 24, lineHeight: 1.8 } }, "سورة " + sm.ar)),
        showBismillahHeader(it.s) && meta.bismillah && h("div", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(font), fontSize: arSize, lineHeight: 2.2, color: th.fg, padding: "6px 0 0" } }, (scriptById(script) || scriptById(DEFAULT_SCRIPT)).bismillah)));
    }
    const active = activeKey === key;
    run.push(h("span", {
      key, ...(withIds ? { id: "q-a-" + it.n, "data-a": it.n } : {}),
      onClick: () => onTap(it),
      style: { background: active ? th.bar : "transparent", borderRadius: 8, cursor: "pointer", boxShadow: active ? "0 0 0 3px " + th.bar : "none" },
    },
      it.ar,
      markers.sajda.has(key) ? " ۩" : "",
      " ",
      h("span", { dir: "ltr", style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "1.5em", height: "1.5em", padding: "0 0.3em", borderRadius: 999, border: "1.5px solid " + accent, color: accent, fontFamily: "'Hind Siliguri', sans-serif", fontSize: "0.5em", fontWeight: 600, lineHeight: 1, verticalAlign: "middle", margin: "0 0.35em" } }, toBnDigits(it.n)),
      " "));
  });
  flush("end");
  return h("div", null, blocks);
}

// ───── আয়াতে ট্যাপ করলে নিচের শিট: অনুবাদ, কপি, শেয়ার, বুকমার্ক, পছন্দ ─────
export function AyahSheet({ surah, ayah, th, accent, trSize, flash, bm, fav, onCopy, onShare, onMark, onClose }) {
  useBackLayer(true, onClose);
  const n = toBnDigits(ayah.n);
  return h("div", { style: { position: "absolute", inset: 0, zIndex: 6, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(0,0,0,0.4)" }, onClick: onClose },
    h("div", { onClick: (e) => e.stopPropagation(), style: { background: th.bg, color: th.fg, borderRadius: "18px 18px 0 0", padding: "14px 18px 20px", maxHeight: "80%", overflowY: "auto" } },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
        h("strong", { style: { fontSize: 15 } }, "সূরা " + surah.bn + " " + toBnDigits(surah.n) + ":" + n),
        h("button", { type: "button", onClick: onClose, style: { minHeight: 40, padding: "0 12px", color: accent, fontWeight: 600 } }, "বন্ধ করুন")
      ),
      h("p", { style: { fontSize: trSize, lineHeight: 1.8, opacity: 0.92, margin: "4px 0 8px" } }, ayah.tr),
      h("div", { style: { fontSize: 11, opacity: 0.6, marginBottom: 6 } }, "অনুবাদ: " + TRANSLATOR),
      h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, borderTop: "1px solid " + LINE, paddingTop: 6 } },
        h("button", { type: "button", onClick: () => onCopy(ayah), style: actBtn(accent), "aria-label": "আয়াত " + n + " কপি করুন" },
          h(CopyIcon, { size: 17 }), flash === "copy" ? "কপি হয়েছে ✓" : flash === "fail" ? "কপি করা যায়নি" : "কপি"),
        h("button", { type: "button", onClick: () => onShare(ayah), style: actBtn(accent), "aria-label": "আয়াত " + n + " শেয়ার করুন" }, h(ShareIcon, { size: 17 }), "শেয়ার"),
        h("button", { type: "button", onClick: () => onMark(ayah, "b"), style: actBtn(accent), "aria-pressed": bm, "aria-label": "আয়াত " + n + (bm ? " বুকমার্ক থেকে সরান" : " বুকমার্ক করুন") }, h(BookmarkSvg, { on: bm }), bm ? "বুকমার্কড" : "বুকমার্ক"),
        h("button", { type: "button", onClick: () => onMark(ayah, "f"), style: actBtn(accent), "aria-pressed": fav, "aria-label": "আয়াত " + n + (fav ? " পছন্দ থেকে সরান" : " পছন্দের তালিকায় রাখুন") }, h(HeartSvg, { on: fav }), "পছন্দ")
      ),
      flash === "full" && h("div", { style: { fontSize: 12, color: "#D64545", marginTop: 2 } }, "সংরক্ষণের সীমা (" + toBnDigits(MARKS_MAX) + "টি) পূর্ণ। আগে কিছু সরান।")
    )
  );
}

// মুসহাফের জন্য কপি/শেয়ার/মার্ক-হুক। আয়াত = {s, n, ar, tr}; surahs = meta.surahs।
export function useAyahActions(surahs, onMark) {
  const [flash, setFlash] = useState({ key: "", kind: "" });
  const timer = useRef(null);
  const onMarkRef = useRef(onMark);
  onMarkRef.current = onMark;
  useEffect(() => () => clearTimeout(timer.current), []);
  const flashFor = useCallback((key, kind) => {
    setFlash({ key, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash({ key: "", kind: "" }), 1500);
  }, []);
  const textOf = (a) => ayahShareText(surahs[a.s - 1], a, { showAr: true, showTr: true }, TRANSLATOR);
  const onCopy = useCallback(async (a) => {
    flashFor(a.s + ":" + a.n, (await copyText(textOf(a))) ? "copy" : "fail");
  }, [surahs, flashFor]);
  const onShare = useCallback(async (a) => {
    const text = textOf(a);
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    flashFor(a.s + ":" + a.n, (await copyText(text)) ? "copy" : "fail");
  }, [surahs, flashFor]);
  const toggle = useCallback((a, kind) => {
    const r = onMarkRef.current(a.s, a.n, kind);
    if (r && r.full) flashFor(a.s + ":" + a.n, "full");
  }, [flashFor]);
  return { flash, onCopy, onShare, toggle };
}

export { markKey };
