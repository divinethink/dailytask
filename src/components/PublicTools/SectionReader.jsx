// SectionReader.jsx — ইপাব-স্টাইল রিডিং মোড (ফুল-স্ক্রিন): A−/A+, দুই-আঙুল পিঞ্চ-জুম, থিম (৩),
// কপি, এবং সদস্যের নিজস্ব হাইলাইট/আন্ডারলাইন (Google UID-তে Firestore, নতুন ফোনেও ফেরে)।
// লেখা অপরিবর্তিত থাকে; লগইন না থাকলে শুধু পড়া যায় (মার্ক-টুল বন্ধ)। React global।

import { useBackLayer } from "../../legacy/backNav.js";
import {
  MAX_MARKS, FONT_MIN, FONT_MAX, FONT_DEFAULT, COLORS, THEMES,
  clampFont, analyzeText, buildSegments, validMarks, makeMark,
} from "../../legacy/readerCore.js";
import { getMarks, saveMarks, getReaderUid } from "../../legacy/readerMarks.js";

const { useState, useEffect, useRef, useMemo } = React;
const h = React.createElement;

function lsGet(k, d) { try { const v = window.localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { window.localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } }

function segOf(node) {
  const el = node && node.nodeType === 3 ? node.parentElement : node;
  return el && el.closest ? el.closest("[data-s]") : null;
}
function pointOffset(root, node, off) {
  const seg = segOf(node);
  if (seg && root.contains(seg)) {
    if (node.nodeType === 3) return Number(seg.dataset.s) + off;
    return off === 0 ? Number(seg.dataset.s) : Number(seg.dataset.e);
  }
  if (node.nodeType === 1) {
    const kids = node.querySelectorAll("[data-s]");
    if (!kids.length) return null;
    const child = node.childNodes[off];
    if (child) {
      const t = child.nodeType === 1 ? (child.matches("[data-s]") ? child : child.querySelector("[data-s]")) : null;
      if (t) return Number(t.dataset.s);
    }
    return Number(kids[kids.length - 1].dataset.e);
  }
  return null;
}
export function readSelection(root) {
  const sel = window.getSelection();
  if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
  let s = pointOffset(root, r.startContainer, r.startOffset);
  let e = pointOffset(root, r.endContainer, r.endOffset);
  if (s === null || e === null) return null;
  if (s > e) { const t = s; s = e; e = t; }
  return e > s ? { s, e } : null;
}

// props: title, text (পড়ার টেক্সট), storeKey (মার্কের key), badge?, sourceNote?,
//        onClose, canManage?, onEdit?, onTrash?
export function SectionReader({ title, text, storeKey, badge, sourceNote, onClose, canManage, onEdit, onTrash }) {
  const uid = useMemo(() => getReaderUid(), []);
  const [marks, setMarks] = useState([]);
  const [loaded, setLoaded] = useState(!uid);
  const [err, setErr] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(null);
  const [activeIds, setActiveIds] = useState(null);
  const [progress, setProgress] = useState(0);
  const [font, setFont] = useState(() => clampFont(lsGet("rdFont", FONT_DEFAULT)));
  const [themeIdx, setThemeIdx] = useState(() => Number(lsGet("rdTheme", 0)) % THEMES.length || 0);
  const contentRef = useRef(null);
  const fontRef = useRef(font);
  fontRef.current = font;
  const theme = THEMES[themeIdx];

  useBackLayer(true, onClose);

  useEffect(() => {
    if (!uid) return undefined;
    let alive = true;
    getMarks(uid, storeKey)
      .then((list) => { if (alive) { setMarks(list); setLoaded(true); } })
      .catch(() => { if (alive) { setErr("হাইলাইট লোড করা যায়নি।"); setLoaded(true); } });
    return () => { alive = false; };
  }, [uid, storeKey]);

  const shown = useMemo(() => validMarks(marks, text), [marks, text]);
  const heads = useMemo(() => analyzeText(text), [text]);
  const segs = useMemo(() => {
    const extra = [];
    heads.forEach((x) => { extra.push(x.s, x.e); });
    return buildSegments(text, shown, extra);
  }, [text, shown, heads]);

  // দুই-আঙুল পিঞ্চ → ফন্ট-সাইজ
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return undefined;
    let d0 = 0, f0 = FONT_DEFAULT;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ts = (e) => { if (e.touches.length === 2) { d0 = dist(e.touches); f0 = fontRef.current; } };
    const tm = (e) => {
      if (e.touches.length === 2 && d0 > 0) {
        e.preventDefault();
        setFont(clampFont(Math.round((f0 * dist(e.touches) / d0) * 2) / 2));
      }
    };
    const te = (e) => { if (e.touches.length < 2 && d0) { d0 = 0; lsSet("rdFont", fontRef.current); } };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te, { passive: true });
    el.addEventListener("touchcancel", te, { passive: true });
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
      el.removeEventListener("touchcancel", te);
    };
  }, []);

  // সিলেকশন ট্র্যাক (শুধু লগইন থাকলে মার্ক-টুল)
  useEffect(() => {
    if (!uid) return undefined;
    const fn = () => {
      const r = readSelection(contentRef.current);
      if (r) { setPending(r); setActiveIds(null); } else setPending(null);
    };
    document.addEventListener("selectionchange", fn);
    return () => document.removeEventListener("selectionchange", fn);
  }, [uid]);

  function changeFont(d) { const f = clampFont(font + d); setFont(f); lsSet("rdFont", f); }
  function cycleTheme() { const i = (themeIdx + 1) % THEMES.length; setThemeIdx(i); lsSet("rdTheme", i); }

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
  function onContentClick(e) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const seg = e.target.closest ? e.target.closest("[data-m]") : null;
    setActiveIds(seg ? seg.dataset.m.split(",") : null);
  }
  async function copyAll() {
    const out = title + "\n\n" + text.replace(/^▌\s*/gm, "");
    let ok = false;
    try { await navigator.clipboard.writeText(out); ok = true; } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = out; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (e2) { ok = false; }
    }
    setCopied(ok);
    setTimeout(() => { setCopied(false); setMenuOpen(false); }, 900);
  }

  const keep = (e) => e.preventDefault(); // বাটনে চাপলে সিলেকশন হারাবে না
  const barBtn = (extra) => ({ minHeight: "40px", minWidth: "40px", borderRadius: "10px", border: "1px solid rgba(128,128,128,0.5)", background: "transparent", color: theme.fg, fontSize: "15px", cursor: "pointer", ...extra });
  const menuBtn = (extra) => ({ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", background: "transparent", border: "none", color: theme.fg, fontSize: "14px", cursor: "pointer", ...extra });
  const accent = themeIdx === 2 ? "#7FD1B9" : "#0E7A66";

  const header = h("div", { style: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 10px", background: theme.bar, color: theme.fg, position: "relative" } },
    h("button", { type: "button", onClick: onClose, "aria-label": "পিছনে", style: barBtn({ fontWeight: 700 }) }, "←"),
    h("div", { style: { flex: 1, fontWeight: 600, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, title),
    h("button", { type: "button", onClick: () => changeFont(-2), "aria-label": "ছোট", disabled: font <= FONT_MIN, style: barBtn({ fontSize: "13px" }) }, "A−"),
    h("button", { type: "button", onClick: () => changeFont(2), "aria-label": "বড়", disabled: font >= FONT_MAX, style: barBtn({ fontSize: "17px" }) }, "A+"),
    h("button", { type: "button", onClick: cycleTheme, "aria-label": "থিম", style: barBtn() }, "◐"),
    h("button", { type: "button", onClick: () => setMenuOpen((o) => !o), "aria-label": "আরো অপশন", style: barBtn({ fontWeight: 700, fontSize: "20px" }) }, "⋮"),
    menuOpen && h("div", { style: { position: "absolute", top: "100%", right: "10px", zIndex: 5, minWidth: "170px", background: theme.bg, color: theme.fg, border: "1px solid rgba(128,128,128,0.5)", borderRadius: "12px", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", overflow: "hidden" } },
      canManage && onEdit && h("button", { type: "button", onClick: () => { setMenuOpen(false); onEdit(); }, style: menuBtn() }, "✏️ এডিট"),
      h("button", { type: "button", onClick: copyAll, style: menuBtn({ borderTop: canManage && onEdit ? "1px solid rgba(128,128,128,0.3)" : "none" }) }, "📋 " + (copied ? "কপি হয়েছে" : "কপি")),
      canManage && onTrash && h("button", { type: "button", onClick: () => { setMenuOpen(false); onTrash(); }, style: menuBtn({ borderTop: "1px solid rgba(128,128,128,0.3)", color: "#C0392B" }) }, "🗑 মুছুন")
    )
  );

  const segEls = segs.map((g) => {
    const hl = g.covering.filter((m) => m.k === "hl").pop();
    const ul = g.covering.some((m) => m.k === "ul");
    const headHit = heads.find((x) => g.s >= x.s && g.e <= x.e);
    const style = {};
    if (headHit) {
      style.fontWeight = 700; style.color = accent; style.fontSize = "1.08em";
      if (g.s === headHit.s && g.e === headHit.e) { style.display = "block"; style.marginBottom = "4px"; }
    }
    if (hl) style.background = hl.c || COLORS[0];
    if (hl && themeIdx === 2) style.color = "#1F2D2A";
    if (ul) { style.textDecoration = "underline"; style.textDecorationThickness = "2px"; style.textUnderlineOffset = "3px"; }
    const props = { key: g.s, "data-s": g.s, "data-e": g.e, style };
    if (g.covering.length) props["data-m"] = g.covering.map((m) => m.id).join(",");
    return h("span", props, text.slice(g.s, g.e));
  });

  const titleBlock = h("div", { style: { whiteSpace: "normal", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid rgba(128,128,128,0.3)" } },
    badge && h("div", { style: { marginBottom: "10px" } }, h("span", { style: { fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", color: accent, border: "1px solid " + accent } }, badge)),
    h("div", { style: { fontSize: "1.35em", fontWeight: 700, lineHeight: 1.4 } }, title)
  );

  const body = h("div", {
    ref: contentRef, onClick: onContentClick,
    onScroll: (e) => { const el = e.currentTarget; const max = el.scrollHeight - el.clientHeight; setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0); },
    style: { flex: 1, overflowY: "auto", padding: "18px 20px 40px", touchAction: "pan-y", WebkitUserSelect: "text", userSelect: "text", fontFamily: "'Hind Siliguri', sans-serif", fontSize: font + "px", lineHeight: 1.95, whiteSpace: "pre-wrap", wordBreak: "break-word", color: theme.fg, background: theme.bg },
  },
    h("div", { style: { maxWidth: "680px", margin: "0 auto" } },
      titleBlock,
      text.trim() ? segEls : h("div", { style: { opacity: 0.7 } }, "পড়ার মতো লেখা নেই।"),
      sourceNote && h("div", { style: { whiteSpace: "normal", marginTop: "20px", fontSize: "0.8em", opacity: 0.7 } }, "সূত্র: " + sourceNote),
      marks.length > shown.length && h("div", { style: { marginTop: "12px", fontSize: "12px", opacity: 0.7 } }, "লেখা বদলে যাওয়ায় পুরনো কিছু মার্ক এখন দেখানো হচ্ছে না।")
    )
  );

  const progressBar = h("div", { style: { height: "3px", background: "rgba(128,128,128,0.2)" } },
    h("div", { style: { height: "3px", width: (progress * 100) + "%", background: accent, transition: "width 0.1s linear" } }));

  let tool;
  if (pending) {
    tool = h("div", { style: { display: "flex", gap: "8px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" } },
      COLORS.map((c) => h("button", { key: c, type: "button", onPointerDown: keep, onClick: () => addMark("hl", c), "aria-label": "হাইলাইট", style: barBtn({ background: c, border: "1px solid #888" }) })),
      h("button", { type: "button", onPointerDown: keep, onClick: () => addMark("ul"), style: barBtn({ textDecoration: "underline", fontWeight: 600, padding: "0 10px" }) }, "U আন্ডারলাইন"));
  } else if (activeIds) {
    tool = h("div", { style: { display: "flex", gap: "8px", justifyContent: "center" } },
      h("button", { type: "button", onClick: removeActive, style: barBtn({ color: "#C0392B", border: "1px solid #C0392B", padding: "0 12px" }) }, "এই মার্ক মুছুন"),
      h("button", { type: "button", onClick: () => setActiveIds(null), style: barBtn({ padding: "0 12px" }) }, "থাক"));
  } else {
    const hint = !uid ? "হাইলাইট রাখতে Google দিয়ে সাইন-ইন করুন · দুই আঙুলে জুম"
      : loaded ? "লেখা সিলেক্ট করে হাইলাইট/আন্ডারলাইন করুন · দুই আঙুলে জুম" : "মার্ক লোড হচ্ছে...";
    tool = h("div", { style: { textAlign: "center", fontSize: "13px", opacity: 0.75 } }, hint);
  }

  return h("div", { style: { position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Hind Siliguri', sans-serif" } },
    header, progressBar, body,
    h("div", { style: { padding: "8px 10px", background: theme.bar, color: theme.fg, borderTop: "1px solid rgba(128,128,128,0.3)" } },
      err && h("div", { style: { color: "#C0392B", fontSize: "13px", marginBottom: "4px", textAlign: "center" } }, err),
      tool)
  );
}
