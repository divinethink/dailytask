// quranUi.jsx — QuranReader ও কুরআন-স্ক্রিনের ভাগ-করা অংশ: কপি, আইকন, স্টেপার,
// অবিচ্ছিন্ন আরবি লেখা (AyahFlow), আয়াত-শিট (AyahSheet) ও কপি/শেয়ার-হুক।
// আয়াতের নম্বর CSS-এর গোল চিহ্নে আঁকা (ফন্টের চিহ্ন নয়), যাতে যেকোনো ফন্টে ঠিক দেখায়।
// React global(window.React, globals.js)।

import { CopyIcon, ShareIcon, Icon } from "../../icons.jsx";
import { useBackLayer } from "../../../legacy/backNav.js";
import { fontStack, fontsForScript, SCRIPTS, scriptById, DEFAULT_SCRIPT, flowLayout, ALIGNS, GAPS } from "../../../legacy/quranFonts.js";
import { switchScript, AR_ZOOM, TR_ZOOM, wbwSupported } from "../../../legacy/quranCore.js";
import { THEMES } from "../../../legacy/readerCore.js";
import { ensureFont } from "../../../legacy/quranFontLoader.js";
import { loadTafsir, loadFmIndex, loadFm } from "../../../legacy/quranData.js";
import { findTafsir, tafsirBlocks, tafsirRangeNote, TAFSIR_NAME } from "../../../legacy/quranTafsir.js";
import { findFmRange, fmForAyah, fmBlocks, fmRangeNote, FM_NAME } from "../../../legacy/quranTafsirFm.js";
import { MarkableTafsir } from "./MarkableTafsir.jsx";
import { tafsirMarkKey, parasFromIk, parasFromFm } from "../../../legacy/tafsirMarks.js";
import { PARA_NAMES, showBismillahHeader, toBnDigits, locateAyah, markKey, MARKS_MAX, rukuOf } from "../../../legacy/quranCore.js";

const { useState, useEffect, useRef, useMemo } = React;
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
export const BookmarkSvg = ({ on, size = 17 }) => h(Icon, { size }, h("path", { d: "M6 3h12v18l-6-4-6 4z", fill: on ? "currentColor" : "none" }));
export const HeartSvg = ({ on, size = 17 }) => h(Icon, { size }, h("path", { d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z", fill: on ? "currentColor" : "none" }));

export const actBtn = (color) => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 12px", borderRadius: 10, fontSize: 13, color, background: "transparent", border: "none", cursor: "pointer" });

// তাফসির-বোতাম: স্পষ্ট বর্ডার-পিল; খোলা থাকলে ভরাট।
export const tafsirBtn = (accent, on) => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 14px", margin: "0 4px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: accent, background: on ? "rgba(128,128,128,0.16)" : "transparent", border: "1.5px solid " + accent, cursor: "pointer" });

export const MoreSvg = () => h(Icon, { size: 20 }, [5, 12, 19].map((cx) => h("circle", { key: cx, cx, cy: 12, r: 1.7, fill: "currentColor" })));
const iconBtn = (color, on) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, borderRadius: 12, color, background: on ? "rgba(128,128,128,0.16)" : "transparent", border: "none", cursor: "pointer" });

// আয়াতের নিচের আইকন-সারি: শেয়ার, বুকমার্ক, ⋯ (খুললে কপি ও পছন্দ)। লেখা নেই; অবস্থা aria-label-এ।
export function AyahActions({ a, surah, th, trSize, accent, flash, bm, fav, onCopy, onShare, onMark, onTafsir, extraTafsir, arFont }) {
  const [more, setMore] = useState(false);
  const [showTafsir, setShowTafsir] = useState(false);
  const n = toBnDigits(a.n);
  return h("div", null, h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, marginTop: 4, marginLeft: -10 } },
    h("button", { type: "button", onClick: () => onShare(a), style: iconBtn(accent), "aria-label": "আয়াত " + n + " শেয়ার করুন" }, h(ShareIcon, { size: 20 })),
    h("button", { type: "button", onClick: () => onMark(a, "b"), style: iconBtn(accent, bm), "aria-pressed": bm, "aria-label": "আয়াত " + n + (bm ? " বুকমার্ক থেকে সরান" : " বুকমার্ক করুন") }, h(BookmarkSvg, { on: bm, size: 20 })),
    surah && h("button", { type: "button", onClick: () => (onTafsir ? onTafsir(a) : setShowTafsir((v) => !v)), style: tafsirBtn(accent, !onTafsir && showTafsir), "aria-label": "আয়াত " + n + " তাফসির দেখুন" }, onTafsir ? "📖 তাফসির" : "📖 তাফসির " + (showTafsir ? "▴" : "▾")),
    h("button", { type: "button", onClick: () => setMore((v) => !v), style: iconBtn(accent, more), "aria-expanded": more, "aria-label": "আরও" }, h(MoreSvg)),
    more && h("button", { type: "button", onClick: () => onCopy(a), style: iconBtn(accent), "aria-label": "আয়াত " + n + " কপি করুন" }, h(CopyIcon, { size: 20 })),
    more && h("button", { type: "button", onClick: () => onMark(a, "f"), style: iconBtn(accent, fav), "aria-pressed": fav, "aria-label": "আয়াত " + n + (fav ? " পছন্দ থেকে সরান" : " পছন্দের তালিকায় রাখুন") }, h(HeartSvg, { on: fav, size: 20 })),
    (flash === "copy" || flash === "fail") && h("span", { style: { fontSize: 12, color: accent, marginLeft: 6 } }, flash === "copy" ? "কপি হয়েছে ✓" : "কপি করা যায়নি")
  ), surah && !onTafsir && showTafsir && h(TafsirPanel, { surah, ayah: a, th, accent, trSize, extra: extraTafsir, arFont }));
}

// ───── সেটিংস-শিটের ভাগ-করা উপাদান: গ্রুপ-কার্ড, সুইচ, সেগমেন্ট, স্টেপার ─────
const HAIR = "1px solid " + LINE;
const TRACK = "rgba(128,128,128,0.2)";

// শিরোনাম + কার্ড। প্রতিটা সন্তান আলাদা সারি; মাঝে হালকা রেখা।
function Section({ title, th, note, children }) {
  const rows = React.Children.toArray(children);
  return h("section", { style: { marginTop: 20 } },
    title && h("h3", { style: { fontSize: 12.5, fontWeight: 700, opacity: 0.6, margin: "0 4px 8px" } }, title),
    h("div", { style: { background: th.bar, borderRadius: 16, padding: "0 16px" } },
      rows.map((r, i) => h("div", { key: i, style: { borderTop: i ? HAIR : "none" } }, r))),
    note && h("p", { style: { fontSize: 11.5, opacity: 0.6, lineHeight: 1.6, margin: "8px 4px 0" } }, note));
}

function ToggleRow({ label, sub, on, disabled, accent, onChange }) {
  return h("button", {
    type: "button", role: "switch", "aria-checked": on, disabled, onClick: () => onChange(!on),
    style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, width: "100%", minHeight: 56, padding: "10px 0", textAlign: "left", color: "inherit", background: "transparent", border: "none", opacity: disabled ? 0.5 : 1 },
  },
    h("span", { style: { minWidth: 0 } },
      h("span", { style: { display: "block", fontSize: 15 } }, label),
      sub && h("span", { style: { display: "block", fontSize: 12, opacity: 0.62, lineHeight: 1.55, marginTop: 2 } }, sub)),
    h("span", { "aria-hidden": "true", style: { position: "relative", flexShrink: 0, width: 50, height: 30, borderRadius: 999, background: on ? accent : "rgba(128,128,128,0.4)", transition: "background .18s" } },
      h("span", { style: { position: "absolute", top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)", transition: "left .18s" } })));
}

export function Stepper({ label, value, lim, th, onChange }) {
  const btn = (txt, delta, dis) => h("button", {
    type: "button", disabled: dis, onClick: () => onChange(value + delta),
    style: { width: 46, height: 44, border: "none", background: "transparent", color: "inherit", fontSize: 22, opacity: dis ? 0.3 : 1 },
    "aria-label": label + (delta > 0 ? " বাড়ান" : " কমান"),
  }, txt);
  return h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 58 } },
    h("span", { style: { fontSize: 15 } }, label),
    h("span", { style: { display: "flex", alignItems: "center", borderRadius: 14, background: th.bg, boxShadow: "0 0 0 1px " + LINE } },
      btn("−", -lim.step, value <= lim.min),
      h("span", { style: { minWidth: 34, textAlign: "center", fontWeight: 700, fontSize: 15 } }, toBnDigits(value)),
      btn("+", lim.step, value >= lim.max)));
}

// দুই-তিন বিকল্পের সেগমেন্ট-বাছাই।
function Segmented({ label, value, list, th, accent, onChange }) {
  return h("div", { role: "radiogroup", "aria-label": label, style: { display: "flex", gap: 2, padding: 3, borderRadius: 13, background: TRACK } },
    list.map(([id, text]) => {
      const on = value === id;
      return h("button", {
        key: id, type: "button", role: "radio", "aria-checked": on, onClick: () => !on && onChange(id),
        style: { flex: 1, minHeight: 42, padding: "4px 6px", borderRadius: 10, fontSize: 13, lineHeight: 1.3, fontWeight: on ? 700 : 500, border: "none", color: on ? accent : "inherit", background: on ? th.bg : "transparent", boxShadow: on ? "0 1px 4px rgba(0,0,0,0.14)" : "none" },
      }, text);
    }));
}

function Field({ label, children }) {
  return h("div", { style: { padding: "12px 0 14px" } },
    label && h("div", { style: { fontSize: 13, opacity: 0.7, marginBottom: 8 } }, label),
    children);
}

// ডান পাশের গোল রেডিও-চিহ্ন।
function RadioDot({ on, accent, text }) {
  if (text) return h("span", { style: { fontSize: 12, color: accent, flexShrink: 0 } }, text);
  return h("span", { "aria-hidden": "true", style: { flexShrink: 0, width: 22, height: 22, boxSizing: "border-box", borderRadius: "50%", border: "2px solid " + (on ? accent : "rgba(128,128,128,0.5)"), display: "flex", alignItems: "center", justifyContent: "center" } },
    on && h("span", { style: { width: 10, height: 10, borderRadius: "50%", background: accent } }));
}

function OptionRow({ on, accent, title, sub, extra, right, onClick }) {
  return h("button", {
    type: "button", role: "radio", "aria-checked": on, onClick,
    style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", minHeight: 58, padding: "10px 0", textAlign: "left", color: "inherit", background: "transparent", border: "none" },
  },
    h("span", { style: { minWidth: 0 } },
      h("span", { style: { display: "block", fontSize: 15, fontWeight: on ? 700 : 500 } }, title, extra && h("span", { style: { fontSize: 11.5, opacity: 0.55, fontWeight: 400, marginLeft: 8 } }, extra)),
      sub && h("span", { style: { display: "block", fontSize: 12, opacity: 0.62, marginTop: 2 } }, sub)),
    h(RadioDot, { on, accent, text: right }));
}

// ───── আরবি ফন্ট-বাছাই (লাইভ প্রিভিউসহ) ─────
// বাছলেই পাঠ-পর্দায় বদলে যায়; ফন্ট নামার সময় আমিরি দেখায়, না নামলে জানায় ও আমিরিতেই চলে।
export function useEnsureFont(fontId) {
  useEffect(() => { ensureFont(fontId); }, [fontId]);
}

// ───── আরবি লেখার ধরন (Simple / উসমানি ...) ─────
// বদলালে পাঠ-পর্দা নতুন লেখা নামায়; ফন্ট বেমানান হলে ওই ধরনের ডিফল্ট ফন্ট বসে। বুকমার্ক/শেষ পাঠ সূরা:আয়াত ধরে, তাই অক্ষত।
export function ScriptPicker({ prefs, accent, th, onPrefs }) {
  return h(Section, { title: "আরবি লেখার ধরন", th },
    SCRIPTS.map((sc) => {
      const on = prefs.arScript === sc.id;
      return h(OptionRow, { key: sc.id, on, accent, title: sc.name, sub: sc.note, onClick: () => { if (!on) onPrefs(switchScript(prefs, sc.id)); } });
    }));
}

// রিডিং/মুসহাফের লাইন-সাজানো: এলাইন ও লাইন-ফাঁক (তালিকা-মোডে প্রযোজ্য নয়)।
export function LayoutPicker({ prefs, th, accent, onPrefs }) {
  return h(Section, { title: "লাইন-সাজানো", th, note: "শুধু রিডিং ও মুসহাফে কাজ করে; তালিকা-মোডে নয়।" },
    h(Field, { label: "এলাইন" }, h(Segmented, { label: "এলাইন", value: prefs.arAlign, list: ALIGNS, th, accent, onChange: (v) => onPrefs({ ...prefs, arAlign: v }) })),
    h(Field, { label: "লাইনের ফাঁক" }, h(Segmented, { label: "লাইনের ফাঁক", value: prefs.arGap, list: GAPS, th, accent, onChange: (v) => onPrefs({ ...prefs, arGap: v }) })));
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
  return h(Section, { title: "আরবি ফন্ট", th },
    h("div", { style: { padding: "14px 0" } },
      h("div", { dir: "rtl", lang: "ar", "aria-label": "ফন্টের প্রিভিউ", style: { fontFamily: fontStack(prefs.arFont), fontSize: Math.min(prefs.arSize, 34), lineHeight: 2.1, textAlign: "center", padding: "6px 8px", borderRadius: 12, background: th.bg, color: th.fg, boxShadow: "0 0 0 1px " + LINE } }, sc.sample),
      st.status === "fail" && h("div", { style: { color: "#D64545", fontSize: 12, marginTop: 8 } }, "ফন্টটা নামানো যায়নি (ইন্টারনেট দেখুন)। আপাতত আমিরি কুরআনে দেখানো হচ্ছে।")),
    list.map((f) => {
      const on = prefs.arFont === f.id;
      return h(OptionRow, { key: f.id, on, accent, title: f.name, extra: f.family, right: on && st.id === f.id && st.status === "loading" ? "নামছে…" : "", onClick: () => pick(f.id) });
    }));
}

// ───── পাঠ-সেটিংস (রিডার ও কুরআন-হোম একই অংশ ব্যবহার করে; পছন্দ একটাই, সব সূরায় প্রযোজ্য) ─────
export function readerTheme(prefs) {
  return { th: THEMES[prefs.theme] || THEMES[0], accent: prefs.theme === 2 ? "#9FD4C4" : PRIMARY };
}

// পাতার রং: তিনটা ছোট নমুনা-পাতা।
function ThemePicker({ prefs, accent, onPrefs }) {
  return h("div", { role: "radiogroup", "aria-label": "পাতার রং", style: { display: "flex", gap: 10, padding: "14px 0" } },
    ["সাদা", "সেপিয়া", "ডার্ক"].map((label, idx) => {
      const t = THEMES[idx];
      const on = prefs.theme === idx;
      return h("button", {
        key: idx, type: "button", role: "radio", "aria-checked": on, onClick: () => onPrefs({ ...prefs, theme: idx }),
        style: { flex: 1, minHeight: 78, borderRadius: 14, background: t.bg, color: t.fg, border: on ? "2.5px solid " + accent : "1px solid " + LINE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 },
      },
        h("span", { style: { fontSize: 22, fontWeight: 700, lineHeight: 1.2 } }, "আ"),
        h("span", { style: { fontSize: 12.5, fontWeight: on ? 700 : 500 } }, label + (on ? " ✓" : "")));
    }));
}

function ModePicker({ prefs, th, accent, onPrefs }) {
  return h("div", { style: { padding: "12px 0" } },
    h(Segmented, { label: "পড়ার ধরন", value: prefs.mode, th, accent, list: [["list", "তালিকা (অনুবাদসহ)"], ["read", "রিডিং (শুধু আরবি)"]], onChange: (v) => onPrefs({ ...prefs, mode: v }) }));
}

// switches: আরবি/অনুবাদ সুইচ দেখাবে কি; showMode: "তালিকা/রিডিং" বাছাই দেখাবে কি।
export function ReaderPrefsBody({ prefs, th, accent, onPrefs, switches, showMode }) {
  const set = (patch) => onPrefs({ ...prefs, ...patch });
  const wbwOk = wbwSupported(prefs.arScript);
  const toggle = (key, other, label) => h(ToggleRow, { label, accent, on: !!prefs[key], disabled: !!prefs[key] && !prefs[other], onChange: (v) => set({ [key]: v }) }); // একমাত্র চালু সুইচটা বন্ধ করা যাবে না
  return h(React.Fragment, null,
    h(Section, { title: "লেখার আকার", th },
      h(Stepper, { label: "আরবি লেখার আকার", value: prefs.arSize, lim: { ...AR_ZOOM, step: 2 }, th, onChange: (v) => set({ arSize: v }) }),
      h(Stepper, { label: "অনুবাদের আকার", value: prefs.trSize, lim: TR_ZOOM, th, onChange: (v) => set({ trSize: v }) })),
    showMode && h(Section, { title: "পড়ার ধরন", th }, h(ModePicker, { prefs, th, accent, onPrefs })),
    switches && h(Section, { title: "যা দেখাবেন", th },
      toggle("showAr", "showTr", "আরবি"),
      toggle("showTr", "showAr", "বাংলা অনুবাদ"),
      h(ToggleRow, { label: "শব্দে শব্দে অর্থ (ইংরেজি)", sub: wbwOk ? "শুধু তালিকা-মোডে দেখায়। কিছু আয়াতে শব্দ মেলে না, সেগুলো সাধারণভাবে দেখায়।" : "উসমানি বা ইন্দো-পাক লেখায় চালু করা যায়।", accent, on: !!prefs.wbw && wbwOk, disabled: !wbwOk, onChange: (v) => set({ wbw: v }) }),
      h(ToggleRow, { label: "তাফসির", sub: "ইবনে কাসীর ও ফাতহুল মাজীদ। প্রতি আয়াতে “তাফসির” বোতাম আসে; প্রথমবার খুললে ওই সূরার তাফসির নামে।", accent, on: prefs.tafsir !== false, onChange: (v) => set({ tafsir: v }) })),
    h(Section, { title: "পাতার রং", th }, h(ThemePicker, { prefs, accent, onPrefs })),
    h(LayoutPicker, { prefs, th, accent, onPrefs }),
    h(ScriptPicker, { prefs, th, accent, onPrefs }),
    h(FontPicker, { prefs, th, accent, script: prefs.arScript, onPrefs })
  );
}

// নিচ থেকে ওঠা শিট: হ্যান্ডেল + স্থির শিরোনাম, ভেতরটা স্ক্রল। children = শেষে বাড়তি অংশ (যেমন রিডারে "আয়াতে যান")।
export function SettingsSheet({ title, prefs, th, accent, onPrefs, onClose, switches, showMode, children }) {
  return h("div", { style: { position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(0,0,0,0.45)" }, onClick: onClose },
    h("div", { role: "dialog", "aria-label": title, onClick: (e) => e.stopPropagation(), style: { background: th.bg, color: th.fg, borderRadius: "24px 24px 0 0", maxHeight: "90%", display: "flex", flexDirection: "column", boxShadow: "0 -10px 32px rgba(0,0,0,0.25)" } },
      h("div", { style: { flexShrink: 0, padding: "8px 18px 10px" } },
        h("div", { "aria-hidden": "true", style: { width: 40, height: 4, borderRadius: 2, background: "rgba(128,128,128,0.45)", margin: "0 auto 10px" } }),
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h("strong", { style: { fontSize: 19 } }, title),
          h("button", { type: "button", onClick: onClose, style: { minHeight: 40, padding: "0 16px", borderRadius: 999, color: accent, fontWeight: 600, fontSize: 14, background: th.bar, border: "none" } }, "বন্ধ করুন"))),
      h("div", { style: { overflowY: "auto", overscrollBehavior: "contain", padding: "0 18px calc(26px + env(safe-area-inset-bottom, 0px))" } },
        h(ReaderPrefsBody, { prefs, th, accent, onPrefs, switches, showMode }),
        children)
    )
  );
}

// কুরআন-হোমের সেটিং-আইকন থেকে খোলে। পছন্দ আগেই বদলে রাখা যায়; পরে যেকোনো সূরা/মুসহাফে একই পছন্দে খোলে।
export function QuranSettingsOverlay({ prefs, onPrefs, onClose }) {
  useBackLayer(true, onClose);
  useEnsureFont(prefs.arFont);
  const { th, accent } = readerTheme(prefs);
  return h("div", { style: { position: "fixed", inset: 0, zIndex: 80, fontFamily: "'Hind Siliguri', sans-serif" } },
    h(SettingsSheet, { title: "কুরআন-সেটিংস", prefs, th, accent, onPrefs, onClose, switches: true, showMode: true },
      h("p", { style: { fontSize: 11.5, opacity: 0.6, marginTop: 18, lineHeight: 1.6, textAlign: "center" } }, "এই পছন্দ সব সূরা ও মুসহাফে একই থাকবে।"))
  );
}

// ───── অলংকরণ: গোল নম্বর-চিহ্ন (আয়াত/সূরা/পৃষ্ঠা) ও সূরার ব্যানার ─────
// size/font px বা em (CSS-এর মান)। ring = রেখা-বর্ডার; bg = ভেতরের রং।
export function Rosette({ n, size, font, color, bg, margin, ring }) {
  const long = String(n).length >= 3;
  return h("span", { dir: "ltr", style: { display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxSizing: "border-box", width: size, height: size, margin, borderRadius: 999, border: ring ? "1.5px solid " + color : "none", background: bg, color, fontFamily: "'Hind Siliguri', sans-serif", fontSize: long ? "calc(" + font + " * 0.82)" : font, fontWeight: 600, lineHeight: 1, verticalAlign: "middle" } }, n);
}

export function SurahBanner({ s, font, th, accent, extra }) {
  return h("div", { style: { border: "4px double " + accent, borderRadius: 14, padding: "6px 12px", background: "linear-gradient(180deg, " + th.bar + ", " + th.bg + ")", color: accent, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } },
    h("div", { style: { minWidth: 0, display: "flex", alignItems: "center", gap: 8 } },
      h(Rosette, { n: toBnDigits(s.n), size: 34, font: "12px", color: accent, bg: th.bg, ring: true }),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontSize: 14, fontWeight: 600 } }, s.bn),
        extra && h("div", { style: { fontSize: 11.5, opacity: 0.85 } }, extra))),
    h("span", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(font), fontSize: 26, lineHeight: 1.7, flexShrink: 0 } }, "سورة " + s.ar));
}

// ───── অবিচ্ছিন্ন আরবি লেখা ─────
// items: [{s, n, ar}] (ক্রমানুসারে, একাধিক সূরা থাকতে পারে)।
// headers: সূরার শিরোনাম + বিসমিল্লাহ বসবে কি (মুসহাফে হ্যাঁ; রিডারে নিজের শিরোনাম আছে, তাই না)।
// dividers: পৃষ্ঠা/পারার শুরুতে ডিভাইডার (রিডিং মোডে)।
// withIds: স্ক্রলে যাওয়া ও অবস্থান-ট্র্যাকিংয়ের জন্য id/data-a (শুধু একসূরার রিডারে)।
export function AyahFlow({ items, meta, markers, th, accent, arSize, font, script, align, gap, activeKey, onTap, headers, dividers, withIds }) {
  const blocks = [];
  let run = [];
  const lay = flowLayout(script, align, gap);
  const flush = (k) => {
    if (!run.length) return;
    blocks.push(h("div", { key: "p" + k, dir: "rtl", lang: "ar", style: { fontFamily: fontStack(font), fontSize: Math.round(arSize * lay.sizeScale), lineHeight: lay.lineHeight, textAlign: lay.textAlign, textAlignLast: lay.textAlignLast, color: th.fg, margin: "4px 0" } }, run));
    run = [];
  };
  items.forEach((it, i) => {
    const key = it.s + ":" + it.n;
    const pageNo = markers.page.get(key) || (i === 0 && dividers ? locateAyah(meta, it.s, it.n).page : 0);
    const juzNo = markers.juz.get(key) || 0;
    if (dividers && (pageNo || juzNo)) {
      flush(key);
      blocks.push(h("div", { key: "d" + key, style: { margin: "14px 0 8px", padding: "4px 10px", textAlign: "center", background: th.bar, color: accent, fontSize: 12, fontWeight: 600, borderRadius: 8 } },
        (pageNo ? "পৃষ্ঠা " + toBnDigits(pageNo) : "") + (pageNo && juzNo ? " · " : "") + (juzNo ? "পারা " + toBnDigits(juzNo) + " · " + PARA_NAMES[juzNo - 1] : "") + (rukuOf(meta, it.s, it.n) ? " · রুকু " + toBnDigits(rukuOf(meta, it.s, it.n)) : "")));
    }
    if (headers && it.n === 1) {
      flush(key);
      const sm = meta.surahs[it.s - 1];
      blocks.push(h("div", { key: "h" + key, style: { textAlign: "center", margin: "14px 0 6px" } },
        h(SurahBanner, { s: sm, font, th, accent }),
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
      h(Rosette, { n: toBnDigits(it.n), size: toBnDigits(it.n).length >= 3 ? "2.1em" : "1.7em", font: "0.5em", color: accent, bg: th.bar, margin: "0 0.35em", ring: true }),
      " "));
  });
  flush("end");
  return h("div", null, blocks);
}

// ───── আয়াতে ট্যাপ করলে নিচের শিট: অনুবাদ, কপি, শেয়ার, বুকমার্ক, পছন্দ ─────
// তাফসির-অংশ: সূরার ফাইল প্রথমবার চাইলে নামে; ব্যর্থ হলে "আবার চেষ্টা"।
function TafsirBody({ surah, ayah, th, accent, trSize }) {
  const [st, setSt] = useState({ s: "load" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setSt({ s: "load" });
    loadTafsir(surah).then((p) => { if (live) setSt({ s: "ok", item: findTafsir(p, ayah.n) }); }).catch(() => { if (live) setSt({ s: "err" }); });
    return () => { live = false; };
  }, [surah.n, ayah.n, tick]);
  const box = { marginTop: 10, padding: "12px 14px 4px", borderRadius: 14, background: "rgba(128,128,128,0.09)", borderLeft: "3px solid " + accent };
  if (st.s === "load") return h("div", { style: { ...box, fontSize: 13, opacity: 0.75 }, role: "status" }, "তাফসির আনা হচ্ছে…");
  if (st.s === "err" || !st.item) {
    return h("div", { style: { ...box, fontSize: 13 }, role: "alert" },
      "তাফসির আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
      h("button", { type: "button", onClick: () => setTick((t) => t + 1), style: actBtn(accent) }, "আবার চেষ্টা"));
  }
  const note = tafsirRangeNote(st.item, toBnDigits);
  return h("div", { style: box },
    h("div", { style: { fontSize: 12, opacity: 0.7, marginBottom: 6 } }, TAFSIR_NAME + (note ? " · " + note : "")),
    h(IkMarkable, { surahN: surah.n, item: st.item, th, accent, trSize }));
}
// ইবনে কাসীর: লেখা + সদস্যের হাইলাইট/আন্ডারলাইন (মার্ক-key = সূরা + তাফসির-ভাগের প্রথম আয়াত)।
function IkMarkable({ surahN, item, th, accent, trSize }) {
  const paras = useMemo(() => parasFromIk(tafsirBlocks(item.html)), [item.html]);
  return h(MarkableTafsir, { storeKey: tafsirMarkKey("ik", surahN, item.from), paras, th, accent, trSize });
}
// ফাতহুল মাজীদ: একই, আরবি অনুচ্ছেদসহ।
function FmMarkable({ surahN, item, th, accent, trSize, arFont }) {
  const paras = useMemo(() => parasFromFm(fmBlocks(item.t)), [item.t]);
  return h(MarkableTafsir, { storeKey: tafsirMarkKey("fm", surahN, item.a[0]), paras, th, accent, trSize, arFont });
}

// দ্বিতীয় তাফসির (ফাতহুল মাজীদ): শুধু সেই আয়াতে, যার ব্যাখ্যা আছে।
function FmBody({ surah, ayah, th, accent, trSize, arFont }) {
  const [st, setSt] = useState({ s: "load" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setSt({ s: "load" });
    loadFm(surah.n).then((g) => { if (live) setSt({ s: "ok", item: fmForAyah(g, ayah.n) }); }).catch(() => { if (live) setSt({ s: "err" }); });
    return () => { live = false; };
  }, [surah.n, ayah.n, tick]);
  const box = { marginTop: 10, padding: "12px 14px 4px", borderRadius: 14, background: "rgba(128,128,128,0.09)", borderLeft: "3px solid " + accent };
  if (st.s === "load") return h("div", { style: { ...box, fontSize: 13, opacity: 0.75 }, role: "status" }, "তাফসির আনা হচ্ছে…");
  if (st.s === "err" || !st.item) {
    return h("div", { style: { ...box, fontSize: 13 }, role: "alert" },
      "তাফসির আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
      h("button", { type: "button", onClick: () => setTick((t) => t + 1), style: actBtn(accent) }, "আবার চেষ্টা"));
  }
  const note = fmRangeNote(st.item.a, toBnDigits);
  return h("div", { style: box },
    h("div", { style: { fontSize: 12, opacity: 0.7, marginBottom: 6 } }, FM_NAME + (note ? " · " + note : "")),
    h(FmMarkable, { surahN: surah.n, item: st.item, th, accent, trSize, arFont }));
}

// তাফসির-অংশের মোড়ক: extra বন্ধ (মুসহাফ) বা এই আয়াতে ফাতহুল মাজীদ না থাকলে আগের মতোই শুধু ইবনে কাসীর।
function TafsirPanel({ surah, ayah, th, accent, trSize, extra, arFont }) {
  const [idx, setIdx] = useState(null);
  const [src, setSrc] = useState("ik");
  useEffect(() => {
    if (!extra) return undefined;
    let live = true;
    loadFmIndex().then((m) => { if (live) setIdx(m); }).catch(() => {});
    return () => { live = false; };
  }, [extra]);
  const hasFm = !!(extra && findFmRange(idx, surah.n, ayah.n));
  useEffect(() => { if (!hasFm) setSrc("ik"); }, [hasFm]);
  const chip = (id, label) => h("button", { key: id, type: "button", onClick: () => setSrc(id), "aria-pressed": src === id, style: { minHeight: 40, padding: "0 16px", borderRadius: 999, fontSize: 13, fontWeight: src === id ? 700 : 500, color: accent, background: src === id ? "rgba(128,128,128,0.16)" : "transparent", border: "1px solid " + LINE } }, label);
  return h("div", null,
    hasFm && h("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }, role: "group", "aria-label": "তাফসিরের উৎস" }, chip("ik", "ইবনে কাসীর"), chip("fm", "ফাতহুল মাজীদ")),
    hasFm && src === "fm" ? h(FmBody, { surah, ayah, th, accent, trSize, arFont }) : h(TafsirBody, { surah, ayah, th, accent, trSize }));
}

export function AyahSheet({ surah, ayah, th, accent, trSize, tafsir = true, extraTafsir, arFont, flash, bm, fav, onCopy, onShare, onMark, onTafsir, onClose }) {
  useBackLayer(true, onClose);
  const [showTafsir, setShowTafsir] = useState(false);
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
        tafsir && h("button", { type: "button", onClick: () => (onTafsir ? onTafsir(ayah) : setShowTafsir((v) => !v)), style: tafsirBtn(accent, !onTafsir && showTafsir), "aria-label": "আয়াত " + n + " তাফসির দেখুন" }, onTafsir ? "📖 তাফসির" : "📖 তাফসির " + (showTafsir ? "▴" : "▾")),
        h("button", { type: "button", onClick: () => onCopy(ayah), style: actBtn(accent), "aria-label": "আয়াত " + n + " কপি করুন" },
          h(CopyIcon, { size: 17 }), flash === "copy" ? "কপি হয়েছে ✓" : flash === "fail" ? "কপি করা যায়নি" : "কপি"),
        h("button", { type: "button", onClick: () => onShare(ayah), style: actBtn(accent), "aria-label": "আয়াত " + n + " শেয়ার করুন" }, h(ShareIcon, { size: 17 }), "শেয়ার"),
        h("button", { type: "button", onClick: () => onMark(ayah, "b"), style: actBtn(accent), "aria-pressed": bm, "aria-label": "আয়াত " + n + (bm ? " বুকমার্ক থেকে সরান" : " বুকমার্ক করুন") }, h(BookmarkSvg, { on: bm }), bm ? "বুকমার্কড" : "বুকমার্ক"),
        h("button", { type: "button", onClick: () => onMark(ayah, "f"), style: actBtn(accent), "aria-pressed": fav, "aria-label": "আয়াত " + n + (fav ? " পছন্দ থেকে সরান" : " পছন্দের তালিকায় রাখুন") }, h(HeartSvg, { on: fav }), "পছন্দ")
      ),
      flash === "full" && h("div", { style: { fontSize: 12, color: "#D64545", marginTop: 2 } }, "সংরক্ষণের সীমা (" + toBnDigits(MARKS_MAX) + "টি) পূর্ণ। আগে কিছু সরান।"),
      tafsir && !onTafsir && showTafsir && h(TafsirPanel, { surah, ayah, th, accent, trSize, extra: extraTafsir, arFont })
    )
  );
}

// ───── তাফসির bottom sheet: নিচ থেকে ওঠে, হ্যান্ডেল টেনে নামিয়ে বন্ধ; ভেতরে আগের/পরের আয়াত ─────
export function TafsirSheet({ surah, ayahs, ayah, th, accent, trSize, arSize, arFont, onAyah, onClose }) {
  useBackLayer(true, onClose);
  const [dy, setDy] = useState(0);
  const y0 = useRef(null);
  const bodyEl = useRef(null);
  const idx = ayah.n - 1;
  const prev = idx > 0 ? ayahs[idx - 1] : null;
  const next = idx < ayahs.length - 1 ? ayahs[idx + 1] : null;
  useEffect(() => { if (bodyEl.current) bodyEl.current.scrollTop = 0; }, [ayah.n]);
  const go = (a) => a && onAyah(a);
  const nb = (label, a) => h("button", { type: "button", disabled: !a, onClick: () => go(a), style: { flex: 1, minHeight: 44, borderRadius: 12, border: "1px solid " + LINE, fontSize: 13, fontWeight: 600, color: accent, background: "transparent", opacity: a ? 1 : 0.35 } }, label);
  const dragStart = (e) => { y0.current = e.touches[0].clientY; };
  const dragMove = (e) => { if (y0.current != null) setDy(Math.max(0, e.touches[0].clientY - y0.current)); };
  const dragEnd = () => { const d = dy; y0.current = null; setDy(0); if (d > 110) onClose(); };
  return h("div", { style: { position: "absolute", inset: 0, zIndex: 8, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(0,0,0,0.45)" }, onClick: onClose },
    h("div", { role: "dialog", "aria-label": "তাফসির", onClick: (e) => e.stopPropagation(), style: { height: "85%", display: "flex", flexDirection: "column", background: th.bg, color: th.fg, borderRadius: "20px 20px 0 0", transform: dy ? "translateY(" + dy + "px)" : "none", transition: dy ? "none" : "transform 0.2s" } },
      h("div", { onTouchStart: dragStart, onTouchMove: dragMove, onTouchEnd: dragEnd, onTouchCancel: dragEnd, style: { touchAction: "none", padding: "8px 18px 0" } },
        h("div", { style: { width: 44, height: 5, borderRadius: 3, background: "rgba(128,128,128,0.45)", margin: "0 auto 8px" } }),
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h("strong", { style: { fontSize: 15 } }, "সূরা " + surah.bn + " " + toBnDigits(surah.n) + ":" + toBnDigits(ayah.n)),
          h("button", { type: "button", onClick: onClose, "aria-label": "তাফসির বন্ধ করুন", style: { minHeight: 44, padding: "0 12px", color: accent, fontWeight: 600 } }, "বন্ধ করুন"))),
      h("div", { ref: bodyEl, style: { flex: 1, overflowY: "auto", padding: "0 18px 12px", overscrollBehavior: "contain" } },
        h("div", { dir: "rtl", lang: "ar", style: { fontFamily: fontStack(arFont), fontSize: Math.min(arSize, 40), lineHeight: 2.1, margin: "4px 0" } }, ayah.ar),
        h("p", { style: { fontSize: trSize, lineHeight: 1.8, opacity: 0.92, margin: "2px 0 6px", paddingLeft: 12, borderLeft: "3px solid rgba(200,155,60,0.7)" } }, ayah.tr),
        h(TafsirPanel, { surah, ayah, th, accent, trSize, extra: true, arFont })),
      h("div", { style: { display: "flex", gap: 10, padding: "8px 18px 14px", borderTop: "1px solid " + LINE } }, nb("← আগের আয়াত", prev), nb("পরের আয়াত →", next))));
}



export { markKey };
