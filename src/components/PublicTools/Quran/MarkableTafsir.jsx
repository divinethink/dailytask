// MarkableTafsir.jsx — তাফসিরের লেখায় সদস্যের নিজস্ব হাইলাইট/আন্ডারলাইন (ব্লগ-রিডারের মতোই)।
// মার্ক: users/{uid}/readerMarks/{key} (Google UID; নতুন ফোনেও ফেরে; Rules আগে থেকেই আছে)।
// লগইন না থাকলে শুধু পড়া যায়। লেখা অপরিবর্তিত; লেখা বদলে মার্ক না মিললে মার্ক লুকানো (মোছা নয়)। React global।

import { MAX_MARKS, COLORS, buildSegments, validMarks, makeMark } from "../../../legacy/readerCore.js";
import { getMarks, saveMarks, getReaderUid } from "../../../legacy/readerMarks.js";
import { layoutParas } from "../../../legacy/tafsirMarks.js";
import { fontStack } from "../../../legacy/quranFonts.js";
import { readSelection } from "../SectionReader.jsx";

const { useState, useEffect, useRef, useMemo } = React;
const h = React.createElement;

// props: storeKey, paras ([{ar?, segs:[{t,b}]}]), th (পাতার রং), accent, trSize, arFont
export function MarkableTafsir({ storeKey, paras, th, accent, trSize, arFont }) {
  const uid = useMemo(() => getReaderUid(), []);
  const [marks, setMarks] = useState([]);
  const [loaded, setLoaded] = useState(!uid);
  const [err, setErr] = useState(null);
  const [pending, setPending] = useState(null);
  const [activeIds, setActiveIds] = useState(null);
  const rootRef = useRef(null);

  const layout = useMemo(() => layoutParas(paras), [paras]);
  const text = layout.text;

  useEffect(() => {
    setMarks([]); setPending(null); setActiveIds(null); setErr(null);
    if (!uid) { setLoaded(true); return undefined; }
    setLoaded(false);
    let alive = true;
    getMarks(uid, storeKey)
      .then((list) => { if (alive) { setMarks(list); setLoaded(true); } })
      .catch(() => { if (alive) { setErr("হাইলাইট লোড করা যায়নি।"); setLoaded(true); } });
    return () => { alive = false; };
  }, [uid, storeKey]);

  // সিলেকশন ট্র্যাক (শুধু লগইন থাকলে)
  useEffect(() => {
    if (!uid) return undefined;
    const fn = () => {
      const r = readSelection(rootRef.current);
      if (r) { setPending(r); setActiveIds(null); } else setPending(null);
    };
    document.addEventListener("selectionchange", fn);
    return () => document.removeEventListener("selectionchange", fn);
  }, [uid]);

  const shown = useMemo(() => validMarks(marks, text), [marks, text]);
  const segs = useMemo(() => buildSegments(text, shown, layout.cuts), [text, shown, layout]);

  async function commit(next) {
    const prev = marks;
    setMarks(next); setErr(null);
    try { await saveMarks(uid, storeKey, next); }
    catch (e) { setMarks(prev); setErr("সেভ হয়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"); }
  }
  function addMark(kind, color) {
    if (!pending) return;
    if (marks.length >= MAX_MARKS) { setErr("সর্বোচ্চ " + MAX_MARKS + "টি মার্ক রাখা যায়।"); return; }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const m = makeMark(text, pending, kind, color, id);
    if (!m) { setErr("এত লম্বা অংশ মার্ক করা যায় না — ছোট অংশ বেছে নিন।"); return; }
    const sel = window.getSelection(); if (sel) sel.removeAllRanges();
    setPending(null);
    commit(marks.concat([m]));
  }
  function removeActive() {
    if (!activeIds) return;
    const ids = activeIds;
    setActiveIds(null);
    commit(marks.filter((m) => ids.indexOf(m.id) === -1));
  }
  function onClick(e) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const seg = e.target.closest ? e.target.closest("[data-m]") : null;
    setActiveIds(seg ? seg.dataset.m.split(",") : null);
  }

  const keep = (e) => e.preventDefault(); // বাটনে চাপলে সিলেকশন হারাবে না
  const btn = (extra) => ({ minHeight: 40, minWidth: 40, borderRadius: 10, border: "1px solid rgba(128,128,128,0.5)", background: "transparent", color: th.fg, fontSize: 14, cursor: "pointer", ...extra });

  const paraEls = layout.items.map((it, i) => {
    const kids = segs.filter((g) => g.s >= it.s && g.e <= it.e).map((g) => {
      const src = it.segs.find((x) => g.s >= x.s && g.e <= x.e);
      const hl = g.covering.filter((m) => m.k === "hl").pop();
      const ul = g.covering.some((m) => m.k === "ul");
      const style = {};
      if (src && src.b) style.fontWeight = 700;
      if (hl) { style.background = hl.c || COLORS[0]; style.color = "#1F2D2A"; }
      if (ul) { style.textDecoration = "underline"; style.textDecorationThickness = "2px"; style.textUnderlineOffset = "3px"; }
      const props = { key: g.s, "data-s": g.s, "data-e": g.e, style };
      if (g.covering.length) props["data-m"] = g.covering.map((m) => m.id).join(",");
      return h("span", props, text.slice(g.s, g.e));
    });
    return it.ar
      ? h("div", { key: i, dir: "rtl", lang: "ar", style: { fontFamily: fontStack(arFont), fontSize: Math.min(44, Math.max(18, Math.round(22 * trSize / 16))), lineHeight: 2.1, margin: "6px 0", color: th.fg } }, kids)
      : h("p", { key: i, style: { fontSize: trSize, lineHeight: 1.95, margin: "0 0 10px" } }, kids);
  });

  let tool = null;
  if (pending) {
    tool = h("div", { style: { display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" } },
      COLORS.map((c) => h("button", { key: c, type: "button", onPointerDown: keep, onClick: () => addMark("hl", c), "aria-label": "হাইলাইট", style: btn({ background: c, border: "1px solid #888" }) })),
      h("button", { type: "button", onPointerDown: keep, onClick: () => addMark("ul"), style: btn({ textDecoration: "underline", fontWeight: 600, padding: "0 10px" }) }, "U আন্ডারলাইন"));
  } else if (activeIds) {
    tool = h("div", { style: { display: "flex", gap: 8, justifyContent: "center" } },
      h("button", { type: "button", onClick: removeActive, style: btn({ color: "#C0392B", border: "1px solid #C0392B", padding: "0 12px" }) }, "এই মার্ক মুছুন"),
      h("button", { type: "button", onClick: () => setActiveIds(null), style: btn({ padding: "0 12px" }) }, "থাক"));
  }

  const hint = !uid ? "হাইলাইট রাখতে Google দিয়ে সাইন-ইন করুন"
    : loaded ? "লেখা সিলেক্ট করে হাইলাইট/আন্ডারলাইন করা যায়" : "মার্ক লোড হচ্ছে...";

  return h("div", { ref: rootRef, onClick },
    paraEls,
    marks.length > shown.length && h("div", { style: { fontSize: 12, opacity: 0.7, marginBottom: 8 } }, "লেখা বদলে যাওয়ায় পুরনো কিছু মার্ক এখন দেখানো হচ্ছে না।"),
    (tool || err) && h("div", { style: { position: "sticky", bottom: 0, padding: "8px 0", background: th.bg, borderTop: "1px solid rgba(128,128,128,0.3)" } },
      err && h("div", { role: "alert", style: { color: "#C0392B", fontSize: 13, marginBottom: 4, textAlign: "center" } }, err),
      tool),
    h("div", { style: { fontSize: 12, opacity: 0.6, textAlign: "center", margin: "0 0 8px" } }, hint));
}
