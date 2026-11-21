// HisnHome.jsx — "আমল, যিকির ও দু'আ" কার্ডের মূল পেজ (হিসনুল মুসলিম): দ্রুত-যান চিপ,
// বিষয়ভিত্তিক ভাঁজযোগ্য গ্রুপ, অধ্যায়/দু'আর শিরোনামে সার্চ (hisnSearch.js, pure), ★ পছন্দ ও সর্বশেষ পড়া (hisnFavs.js, শুধু localStorage), অধ্যায় পেজ। ডেটা hisnLoad.js থেকে lazy; গ্রুপ hisnGroups.js (pure)।
// React global(window.React, globals.js)।

import { PageHeader, VerseCard } from "./ToolGrid.jsx";
import { ToolIcon } from "./ToolIcons.jsx";
import { HisnDuaCard } from "./HisnDuaCard.jsx";
import { readPrefs } from "../../legacy/quranState.js";
import { loadHisn } from "../../legacy/hisnLoad.js";
import { WHEN_FILTERS, filterByWhen, toBn, clampIndex } from "../../legacy/hisnCore.js";
import { QUICK_CHIPS, GROUP_ICONS, groupChapters, withExtras, neighbors, groupOf, chapterBySwipe } from "../../legacy/hisnGroups.js";
import { searchHisn, highlightParts, isSearchable } from "../../legacy/hisnSearch.js";
import { readFavs, writeFavs, readLast, writeLast, toggleFav, resolveFavs, resolveLast } from "../../legacy/hisnFavs.js";
import { readHisnView, writeHisnView, stepArSize, toggleView, readHisnFocus, writeHisnFocus } from "../../legacy/hisnPrefs.js";
import { swipeDelta } from "../../legacy/swipeMonth.js";
import { useBackLayer } from "../../legacy/backNav.js";
import { ChevronLeft } from "../icons.jsx";

const { useState, useEffect, useMemo } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const GOLD = "#C89B3C";
const BN_FONT = "'Noto Serif Bengali', serif";
const OPEN_KEY = "dt_hisn_open_group";
const MAX_DUA_RESULTS = 40;
const touch = { x: 0, y: 0, ok: false }; // সোয়াইপের শুরুর বিন্দু (re-render-এর মাঝে হারায় না)

const readOpen = () => { try { return window.sessionStorage.getItem(OPEN_KEY) || ""; } catch (e) { return ""; } };
const writeOpen = (k) => { try { window.sessionStorage.setItem(OPEN_KEY, k); } catch (e) { /* ignore */ } };

// extras = [{key, icon, label}] (বিষয়-তালিকায় গ্রুপ অনুযায়ী বসে); onSelectItem(key) = হাবের আইটেম খোলা।
export function Plate({ size = 36, children }) {
  return h("span", { className: "rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold", style: { width: size, height: size, background: "var(--theme-soft, #E8F0EE)", color: PRIMARY } }, children);
}
const ROW = "w-full flex items-center gap-3 py-2.5 px-0.5 text-left border-b border-slate-100 last:border-b-0 active:bg-slate-50";

export function HisnHome({ extras, onSelectItem, onBack }) {
  const [state, setState] = useState({ status: "loading", chapters: [], source: "" });
  const [openGroup, setOpenGroup] = useState(readOpen);
  const [chId, setChId] = useState(null);
  const [when, setWhen] = useState("all");
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState(readFavs);
  const [last, setLast] = useState(readLast);
  const [favOpen, setFavOpen] = useState(false);
  const [focus, setFocus] = useState(readHisnFocus); // "একটা একটা করে" মোড
  const [fIdx, setFIdx] = useState(null); // ওই মোডের বর্তমান দু'আর সূচক (null = সার্চ/সর্বশেষ-পড়া থেকে বা ০)
  const [focusDua, setFocusDua] = useState(null); // সার্চ থেকে খোলা দু'আ: স্ক্রল + হালকা দাগ
  const prefs = useMemo(() => readPrefs(), []);
  const [view, setViewState] = useState(() => readHisnView(prefs.arSize));
  const setView = (v) => { setViewState(v); writeHisnView(v); };

  useEffect(() => {
    let alive = true;
    loadHisn().then(
      (r) => { if (alive) setState({ status: "ready", chapters: r.chapters, source: r.source }); },
      () => { if (alive) setState({ status: "error", chapters: [], source: "" }); }
    );
    return () => { alive = false; };
  }, []);

  useBackLayer(favOpen, () => setFavOpen(false));
  useBackLayer(chId !== null, () => { setChId(null); setFocusDua(null); });
  useEffect(() => { try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } }, [chId]);
  useEffect(() => {
    if (chId === null || focusDua === null) return undefined;
    const t = setTimeout(() => {
      try { const el = document.getElementById("hisn-dua-" + focusDua); if (el) el.scrollIntoView({ block: "start" }); } catch (e) { /* ignore */ }
    }, 60);
    return () => clearTimeout(t);
  }, [chId, focusDua]);

  const groups = useMemo(() => groupChapters(state.chapters), [state.chapters]);
  const gs = useMemo(() => withExtras(groups, extras), [groups, extras]);
  const toggle = (k) => { const next = openGroup === k ? "" : k; setOpenGroup(next); writeOpen(next); };
  const onToggleFav = (id) => setFavs((cur) => { const next = toggleFav(cur, id); writeFavs(next); return next; });
  const openChapter = (id, duaId = null) => { const l = { chapterId: id, duaId }; setLast(l); writeLast(l); setWhen("all"); setFocusDua(duaId); setFIdx(null); setChId(id); };
  const stepDua = (chapterId, duaId, i) => { setFIdx(i); const l = { chapterId, duaId }; setLast(l); writeLast(l); };
  const toggleFocus = () => { const v = !focus; setFocus(v); writeHisnFocus(v); setFIdx(null); };
  useEffect(() => { if (fIdx !== null) { try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } } }, [fIdx]);
  const searching = isSearchable(query);
  const found = useMemo(() => (searching ? searchHisn(state.chapters, query) : null), [searching, state.chapters, query]);

  const ch = chId !== null ? state.chapters.find((c) => c.id === chId) : null;
  if (ch) return chapterView({ ch, groups, prefs, view, setView, when, setWhen: (k) => { setWhen(k); setFIdx(0); }, focus, toggleFocus, fIdx, stepDua, openChapter, close: () => { setChId(null); setFocusDua(null); }, source: state.source, focusDua, favs, onToggleFav });

  const favList = resolveFavs(state.chapters, favs);
  const lastRead = resolveLast(state.chapters, last);
  if (favOpen && !searching) return favView({ favList, onBack: () => setFavOpen(false), openChapter });

  const chips = QUICK_CHIPS.filter((c) => state.chapters.some((x) => x.id === c.id));
  const showList = !searching && state.status !== "loading";
  const chev = (open) => h("span", { style: { display: "inline-flex", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" } }, h(ToolIcon, { name: "chevronRight", size: 15, color: GOLD }));
  return h("div", null,
    onBack && h("button", { type: "button", onClick: onBack, className: "flex items-center gap-1 mb-2 text-sm font-semibold text-emerald-950" }, h(ChevronLeft, { size: 16 }), "আমল"),
    h(PageHeader, { title: "আমল, যিকির ও দু'আ", subtitle: "দৈনন্দিন জীবনে আল্লাহর স্মরণ" }),

    h("div", { className: "relative mb-3" },
      h("input", { type: "search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "দু'আ খুঁজুন…", "aria-label": "দু'আ বা অধ্যায় খুঁজুন", enterKeyHint: "search", autoComplete: "off", className: "w-full rounded-2xl border border-slate-200 bg-white shadow-sm pl-11 pr-10 py-3 text-[16px] text-emerald-950 outline-none focus:border-emerald-700", style: { fontFamily: BN_FONT, WebkitAppearance: "none" } }),
      h("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" }, h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "#94A3B8", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true }, h("circle", { cx: 11, cy: 11, r: 7 }), h("path", { d: "M20 20l-4-4" }))),
      query && h("button", { type: "button", onClick: () => setQuery(""), "aria-label": "মুছে ফেলুন", className: "absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 text-xl leading-none text-slate-400 active:text-slate-600" }, "×")
    ),

    !searching && lastRead && h("button", { type: "button", onClick: () => openChapter(lastRead.chapterId, lastRead.duaId), className: "w-full flex items-center gap-3 mb-3 px-3.5 py-3 rounded-2xl border bg-white shadow-sm text-left active:scale-[.99] transition-transform", style: { borderColor: "var(--theme-line, #D3E3DD)" } },
      h("span", { className: "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm", style: { background: PRIMARY } }, "▶"),
      h("span", { className: "flex-1 min-w-0" },
        h("span", { className: "block text-[11.5px] text-slate-500" }, "সর্বশেষ পড়া"),
        h("span", { className: "block text-[14.5px] font-semibold text-emerald-950 truncate", style: { fontFamily: BN_FONT } }, lastRead.title)
      ),
      chev(false)
    ),

    searching && searchView({ found, query, status: state.status, openChapter }),

    !searching && state.status === "ready" && h("div", { className: "mb-2" },
      h("div", { className: "text-xs font-semibold text-slate-500 pb-1.5" }, "দ্রুত যান"),
      h("div", { className: "no-scrollbar flex gap-2 overflow-x-auto pb-1 -mx-4 px-4", style: { scrollbarWidth: "none" }, "data-no-swipe": true },
        h("button", { type: "button", onClick: () => setFavOpen(true), className: "shrink-0 px-3.5 py-2 rounded-full text-[13px] font-semibold border active:scale-95 transition-transform", style: { color: "#9A6B00", borderColor: GOLD, background: "#FBF3DC", fontFamily: BN_FONT } }, "★ পছন্দ" + (favList.length ? " (" + toBn(favList.length) + ")" : "")),
        chips.map((c) => h("button", { key: c.id, type: "button", onClick: () => openChapter(c.id), className: "shrink-0 px-3.5 py-2 rounded-full text-[13px] font-semibold border bg-white active:scale-95 transition-transform", style: { color: PRIMARY, borderColor: "var(--theme-line, #D3E3DD)", fontFamily: BN_FONT } }, c.label))
      )
    ),

    !searching && h("div", { className: "text-xs font-semibold text-slate-500 pt-2 pb-1.5" }, "বিষয় অনুযায়ী"),
    !searching && state.status === "loading" && h("div", { className: "text-sm text-slate-500 py-4" }, "লোড হচ্ছে…"),
    !searching && state.status === "error" && h("div", { className: "text-sm text-red-600 py-2 pb-3" }, "দু'আর ডেটা লোড করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।"),
    showList && gs.map((g) => {
      const open = openGroup === g.key;
      const total = g.chapters.length + g.extras.length + (g.key === "salah" ? 1 : 0);
      return h("div", { key: g.key, className: "bg-white rounded-2xl border shadow-sm mb-2.5 overflow-hidden", style: { borderColor: open ? "var(--theme-line, #D3E3DD)" : "#E4E7E2" } },
        h("button", { type: "button", onClick: () => toggle(g.key), "aria-expanded": open, className: "w-full flex items-center gap-3 px-3.5 py-3 text-left", style: open ? { background: "var(--theme-wash, #F2F7F4)" } : undefined },
          h(Plate, { size: 38 }, h(ToolIcon, { name: GROUP_ICONS[g.key] || "list", size: 19, color: PRIMARY })),
          h("span", { className: "flex-1 min-w-0" },
            h("span", { className: "block text-[15px] leading-snug font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, g.title),
            h("span", { className: "block text-[11.5px] text-slate-500" }, toBn(total) + "টি বিষয়")
          ),
          chev(open)
        ),
        open && h("div", { className: "px-3.5 pb-1.5 border-t border-slate-100" },
          g.key === "salah" && h("button", { type: "button", onClick: () => onSelectItem("prayerAdhkar"), className: ROW },
            h(Plate, { size: 32 }, h(ToolIcon, { name: "dua", size: 16, color: PRIMARY })),
            h("span", { className: "flex-1 text-[14px] font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, "নামাজের দু'আ (সংক্ষেপে)"),
            h(ToolIcon, { name: "chevronRight", size: 14, color: GOLD })
          ),
          g.extras.map((x) => h("button", { key: x.key, type: "button", onClick: () => onSelectItem(x.key), className: ROW },
            h(Plate, { size: 32 }, h(ToolIcon, { name: x.icon, size: 16, color: PRIMARY })),
            h("span", { className: "flex-1 text-[14px] font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, x.label),
            h(ToolIcon, { name: "chevronRight", size: 14, color: GOLD })
          )),
          g.chapters.map((c) => h("button", { key: c.id, type: "button", onClick: () => openChapter(c.id), className: ROW },
            h(Plate, { size: 32 }, toBn(c.id)),
            h("span", { className: "flex-1 text-[14px] text-emerald-950", style: { fontFamily: BN_FONT } }, c.title),
            h("span", { className: "text-xs text-slate-500" }, toBn(c.duas.length) + "টি")
          ))
        )
      );
    }),
    state.status === "ready" && h("div", { className: "text-[11px] leading-relaxed text-slate-500 pt-1 pb-3", style: { fontFamily: BN_FONT } }, "উৎস: " + state.source + "। বাংলা উচ্চারণ ও অর্থ আলেম-যাচাই হয়নি; আরবি ডেটাসেট থেকে অপরিবর্তিত।"),
    h(VerseCard, { text: "“আল্লাহর স্মরণেই হৃদয় প্রশান্ত হয়।”", source: "— সূরা আর-রা'দ ১৩:২৮" })
  );
}

// মিলে যাওয়া অংশ হাইলাইট করা শিরোনাম।
function hl(text, query) {
  return highlightParts(text, query).map((p, i) => (p.hit
    ? h("mark", { key: i, style: { background: "#F6E3A6", color: "inherit", borderRadius: 3, padding: "0 1px" } }, p.text)
    : p.text));
}

// ★ পছন্দের দু'আর তালিকা (নতুন আগে)।
function favView({ favList, onBack, openChapter }) {
  return h("div", null,
    h("button", { type: "button", onClick: onBack, className: "flex items-center gap-1 mb-2 text-sm font-semibold text-emerald-950" }, h(ChevronLeft, { size: 16 }), "আমল, যিকির ও দু'আ"),
    h("div", { className: "pb-3 text-lg font-semibold", style: { color: PRIMARY, fontFamily: BN_FONT } }, "★ পছন্দের দু'আ"),
    favList.length === 0
      ? h("div", { className: "text-sm text-slate-600 py-6 text-center leading-relaxed", style: { fontFamily: BN_FONT } }, "এখনো কোনো পছন্দের দু'আ নেই। দু'আর কার্ডে “☆ পছন্দ” চাপলে এখানে জমা হবে।")
      : h("div", { className: "bg-white rounded-2xl border border-slate-200/80 shadow-sm mb-3 px-3" }, favList.map((d) => h("button", { key: d.duaId, type: "button", onClick: () => openChapter(d.chapterId, d.duaId), className: "w-full flex items-center gap-3 py-2.5 px-1 text-left border-b border-slate-100 last:border-b-0 active:bg-slate-50" },
          h("span", { className: "flex-1 min-w-0" },
            h("span", { className: "block text-[14px] text-emerald-950", style: { fontFamily: BN_FONT } }, d.title),
            h("span", { className: "block text-[11.5px] text-slate-500 truncate", style: { fontFamily: BN_FONT } }, toBn(d.chapterId) + ". " + d.chapterTitle)
          ),
          h(ToolIcon, { name: "chevronRight", size: 14, color: GOLD })
        )))
  );
}

// সার্চের ফল: অধ্যায় আগে, তারপর দু'আ। found = searchHisn-এর ফল।
function searchView({ found, query, status, openChapter }) {
  if (status === "loading") return h("div", { className: "text-sm text-slate-500 py-4" }, "লোড হচ্ছে…");
  if (status === "error") return h("div", { className: "text-sm text-red-600 py-4" }, "ডেটা লোড করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
  const chs = found ? found.chapters : [];
  const duas = found ? found.duas : [];
  if (!chs.length && !duas.length) return h("div", { className: "text-sm text-slate-600 py-6 text-center", style: { fontFamily: BN_FONT } }, "কিছু পাওয়া যায়নি, অন্য শব্দে খুঁজুন");
  const shown = duas.slice(0, MAX_DUA_RESULTS);
  const label = (t) => h("div", { className: "text-xs font-semibold text-slate-500 pb-1.5 pt-1" }, t);
  const card = (children) => h("div", { className: "bg-white rounded-2xl border border-slate-200/80 shadow-sm mb-3 px-3" }, children);
  return h("div", { className: "pb-3" },
    chs.length > 0 && label("অধ্যায় (" + toBn(chs.length) + ")"),
    chs.length > 0 && card(chs.map((c) => h("button", { key: c.id, type: "button", onClick: () => openChapter(c.id), className: "w-full flex items-center gap-3 py-2.5 px-1 text-left border-b border-slate-100 last:border-b-0 active:bg-slate-50" },
      h("span", { className: "w-8 h-8 rounded-full text-white text-[13px] font-semibold flex items-center justify-center shrink-0", style: { background: PRIMARY } }, toBn(c.id)),
      h("span", { className: "flex-1 text-[14px] text-emerald-950", style: { fontFamily: BN_FONT } }, hl(c.title, query))
    ))),
    duas.length > 0 && label("দু'আ (" + toBn(duas.length) + ")"),
    duas.length > 0 && card(shown.map((d) => h("button", { key: d.duaId, type: "button", onClick: () => openChapter(d.chapterId, d.duaId), className: "w-full flex items-center gap-3 py-2.5 px-1 text-left border-b border-slate-100 last:border-b-0 active:bg-slate-50" },
      h("span", { className: "flex-1 min-w-0" },
        h("span", { className: "block text-[14px] text-emerald-950", style: { fontFamily: BN_FONT } }, hl(d.title, query)),
        h("span", { className: "block text-[11.5px] text-slate-500 truncate", style: { fontFamily: BN_FONT } }, toBn(d.chapterId) + ". " + d.chapterTitle)
      ),
      h(ToolIcon, { name: "chevronRight", size: 14, color: GOLD })
    ))),
    duas.length > shown.length && h("div", { className: "text-xs text-slate-500 text-center pb-2", style: { fontFamily: BN_FONT } }, "আরও " + toBn(duas.length - shown.length) + "টি আছে; আরও নির্দিষ্ট শব্দ লিখুন।")
  );
}

function chapterView({ ch, groups, prefs, view, setView, when, setWhen, focus, toggleFocus, fIdx, stepDua, openChapter, close, source, focusDua, favs, onToggleFav }) {
  const grp = groupOf(groups, ch.id);
  const nb = neighbors(groups, ch.id);
  const isMorningEvening = ch.id === 27;
  const duas = isMorningEvening ? filterByWhen(ch.duas, when) : ch.duas;
  const focusOn = focus && duas.length > 1;
  const idx = clampIndex(fIdx !== null ? fIdx : duas.findIndex((x) => x.id === focusDua), duas.length);
  const goDua = (i) => stepDua(ch.id, duas[i].id, i);
  const navBtn = (id, label) => id === null
    ? h("div", { className: "flex-1" })
    : h("button", { type: "button", onClick: () => openChapter(id), className: "flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-slate-200 bg-white text-slate-700 active:bg-slate-50" }, label);
  const onStart = (e) => {
    const tg = e.target;
    touch.ok = !(tg && tg.closest && tg.closest("[data-no-swipe], input, textarea, select, summary"));
    const p = e.touches && e.touches[0];
    if (p) { touch.x = p.clientX; touch.y = p.clientY; }
  };
  const onEnd = (e) => {
    const p = e.changedTouches && e.changedTouches[0];
    if (!touch.ok || !p) return;
    const dl = swipeDelta(p.clientX - touch.x, p.clientY - touch.y);
    if (focusOn) { // এই মোডে সোয়াইপ = দু'আ বদল (অধ্যায় নয়)
      if (dl > 0 && idx < duas.length - 1) goDua(idx + 1);
      else if (dl < 0 && idx > 0) goDua(idx - 1);
      return;
    }
    const to = chapterBySwipe(groups, ch.id, dl);
    if (to !== null) openChapter(to);
  };
  const chip = (key, label) => h("button", { key, type: "button", onClick: () => setView(toggleView(view, key)), "aria-pressed": view[key], className: "px-3 py-1 rounded-full text-[12.5px] font-semibold border " + (view[key] ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white"), style: view[key] ? { background: PRIMARY } : undefined }, label);
  const sizeBtn = (dir, label) => h("button", { type: "button", onClick: () => setView(stepArSize(view, dir)), "aria-label": dir > 0 ? "আরবি বড় করুন" : "আরবি ছোট করুন", className: "w-9 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold active:bg-slate-50", style: { fontSize: dir > 0 ? 16 : 12 } }, label);
  const controls = h("div", { className: "flex items-center gap-1.5 pb-3 flex-wrap", "data-no-swipe": true },
    sizeBtn(-1, "আ"), sizeBtn(1, "আ"),
    h("span", { className: "w-px h-5 bg-slate-200 mx-1" }),
    chip("showAr", "আরবি"), chip("showTr", "উচ্চারণ"), chip("showBn", "অর্থ"),
    duas.length > 1 && h("button", { type: "button", onClick: toggleFocus, "aria-pressed": focus, className: "px-3 py-1 rounded-full text-[12.5px] font-semibold border " + (focus ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white"), style: focus ? { background: PRIMARY } : undefined }, "একটা একটা করে")
  );
  const stepBtn = (label, disabled, onClick) => h("button", { type: "button", disabled, onClick, className: "flex-1 min-h-[48px] rounded-xl text-[14px] font-semibold border border-slate-200 bg-white text-slate-700 active:bg-slate-50 disabled:opacity-35" }, label);
  const lastIdx = duas.length - 1;
  const focusView = focusOn && h("div", null,
    h("div", { className: "pb-3" },
      h("div", { className: "flex items-center justify-between text-[12px] text-slate-500 pb-1" }, h("span", null, "দু'আ " + toBn(idx + 1) + " / " + toBn(duas.length)), h("span", null, "ডানে-বামে সোয়াইপ করুন")),
      h("div", { className: "h-1 rounded-full bg-slate-200 overflow-hidden" }, h("div", { style: { width: Math.round(((idx + 1) / duas.length) * 100) + "%", height: "100%", background: PRIMARY, transition: "width .2s" } }))
    ),
    h("div", { id: "hisn-dua-" + duas[idx].id, className: "scroll-mt-3" }, h(HisnDuaCard, { key: duas[idx].id, d: duas[idx], prefs, view, fav: favs.includes(duas[idx].id), onToggleFav, counter: true })),
    h("div", { className: "flex gap-2 pt-1 pb-3" },
      stepBtn("‹ আগেরটা", idx === 0, () => goDua(idx - 1)),
      idx < lastIdx ? stepBtn("পরেরটা ›", false, () => goDua(idx + 1)) : stepBtn("পরের অধ্যায় ›", nb.next === null, () => openChapter(nb.next))
    )
  );
  return h("div", { onTouchStart: onStart, onTouchEnd: onEnd, style: { minHeight: "70vh" } },
    h("button", { type: "button", onClick: close, className: "flex items-center gap-1 mb-2 text-sm font-semibold text-emerald-950" }, h(ChevronLeft, { size: 16 }), grp ? grp.title : "আমল, যিকির ও দু'আ"),
    h("div", { className: "pb-3 text-lg font-semibold", style: { color: PRIMARY, fontFamily: BN_FONT } }, toBn(ch.id) + ". " + ch.title),
    isMorningEvening && h("div", { className: "flex gap-2 pb-3" }, WHEN_FILTERS.map((f) =>
      h("button", { key: f.key, type: "button", onClick: () => setWhen(f.key), className: "flex-1 py-1.5 rounded-xl text-sm font-semibold border " + (when === f.key ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white"), style: when === f.key ? { background: PRIMARY } : undefined }, f.label)
    )),
    controls,
    focusOn ? focusView : duas.map((d) => h("div", { key: d.id, id: "hisn-dua-" + d.id, className: focusDua === d.id ? "rounded-2xl ring-2 ring-amber-300 scroll-mt-3" : "scroll-mt-3" }, h(HisnDuaCard, { d, prefs, view, fav: favs.includes(d.id), onToggleFav }))),
    !focusOn && h("div", { className: "flex gap-2 pt-1 pb-3" }, navBtn(nb.prev, "‹ আগের অধ্যায়"), navBtn(nb.next, "পরের অধ্যায় ›")),
    !focusOn && h("div", { className: "text-[11px] text-slate-400 text-center pb-1" }, "ডানে-বামে সোয়াইপ করেও অধ্যায় বদলানো যায়"),
    h("div", { className: "text-[11px] text-slate-500 pb-2", style: { fontFamily: BN_FONT } }, "উৎস: " + source + "।")
  );
}
