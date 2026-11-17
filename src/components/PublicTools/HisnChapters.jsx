// HisnChapters.jsx — "দোয়া" পেজের "হিসনুল মুসলিম" ট্যাব: অধ্যায়-তালিকা → অধ্যায়ের কার্ড।
// ডেটা lazy-load (dynamic import)। ব্যাচ ধরে ধরে বাড়ছে — এখন অধ্যায় ১-৩৩।
// React global(window.React, globals.js)।

import { readPrefs } from "../../legacy/quranState.js";
import { buildChapters, toBn } from "../../legacy/hisnCore.js";
import { HisnCard } from "./HisnCard.jsx";

const { useState, useEffect, useMemo } = React;
const h = React.createElement;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const BN_FONT = "'Noto Serif Bengali', serif";

export function HisnChapters() {
  const [state, setState] = useState({ status: "loading", chapters: [], source: "" });
  const [chId, setChId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const prefs = useMemo(() => readPrefs(), []);

  useEffect(() => {
    let alive = true;
    Promise.all([import("../../legacy/hisnBatch1.js"), import("../../legacy/hisnData.js"), import("../../legacy/hisnBatch2.js")]).then(
      ([b1, m, b2]) => { if (alive) setState({ status: "ready", chapters: buildChapters(b1.HISN_BATCH1, m.HISN_MORNING_EVENING, b2.HISN_BATCH2), source: m.HISN_SOURCE }); },
      () => { if (alive) setState({ status: "error", chapters: [], source: "" }); }
    );
    return () => { alive = false; };
  }, []);

  if (state.status === "loading") return h("div", { className: "text-sm text-slate-500 py-4" }, "লোড হচ্ছে…");
  if (state.status === "error") return h("div", { className: "text-sm text-red-600 py-4" }, "ডেটা লোড করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।");

  const ch = state.chapters.find((c) => c.id === chId);
  const note = h("div", { className: "text-[11px] text-slate-500 pb-2", style: { fontFamily: BN_FONT } }, "উৎস: " + state.source + "। বাংলা উচ্চারণ ও অর্থ আলেম-যাচাই হয়নি; আরবি ডেটাসেট থেকে অপরিবর্তিত।");

  if (!ch) {
    return h("div", null,
      h("div", { className: "pb-2 text-sm text-slate-600", style: { fontFamily: BN_FONT } }, "অধ্যায় বাছুন (ধাপে ধাপে আরও যুক্ত হবে)"),
      state.chapters.map((c) =>
        h("button", { key: c.id, type: "button", onClick: () => { setChId(c.id); setOpenId(null); }, className: "w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm px-4 py-3 mb-2 text-left" },
          h("span", { className: "w-8 h-8 rounded-full text-white text-sm font-semibold flex items-center justify-center shrink-0", style: { background: PRIMARY } }, toBn(c.id)),
          h("span", { className: "flex-1 text-[15px] font-semibold text-emerald-950", style: { fontFamily: BN_FONT } }, c.title),
          h("span", { className: "text-xs text-slate-500" }, toBn(c.duas.length) + "টি")
        )
      ),
      note
    );
  }
  return h("div", null,
    h("button", { type: "button", onClick: () => setChId(null), className: "text-sm font-semibold pb-2", style: { color: PRIMARY } }, "← সব অধ্যায়"),
    h("div", { className: "pb-3 text-base font-semibold", style: { color: PRIMARY, fontFamily: BN_FONT } }, toBn(ch.id) + ". " + ch.title),
    ch.duas.map((d) => h(HisnCard, { key: d.id, d, prefs, open: openId === d.id, onToggle: () => setOpenId(openId === d.id ? null : d.id) })),
    note
  );
}
