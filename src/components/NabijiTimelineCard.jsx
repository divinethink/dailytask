// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ড(হোম ট্যাবে, তাযকিরার নিচে, owner-approved ৭ নভেম্বর ২০২৬):
// এখনকার সময়ের ভাগ অনুযায়ী ২-৩টি বুলেট + প্রতিটির সহিহ সূত্র; "আরও দেখুন"-এ বাকি বুলেট।
// ওপরে সময়ের চিপ-স্ট্রিপ: যেকোনো চিপে ট্যাপ করলে সেই সময়ভাগ দেখা যায়; "পুরো দিনের তালিকা" বাদ (owner-approved), শুধু চিপ-স্ট্রিপ।
// বুলেট বিষয়(ইবাদত/পরিবার…) ধরে গ্রুপ; সূত্র লেখার শেষে বন্ধনীতে। কার্ড নিজেই ভাঁজ(fold = open/closed/fixed) সামলায় — বাইরে আলাদা FoldWrap নেই, তাই একটাই কার্ড।
// শুধু দেখায় — কোনো ডেটা লেখে না। তালিকা সম্পাদনা শুধু App Creator(isCreatorAuth + Firestore Rules-এ enforced)।
// সময়ভাগ সেভ-করা লোকেশনের আসল ওয়াক্ত-সময়ে(ফজর, যোহর…) চলে — লোকেশন/নেটওয়ার্ক/ক্যাশ না থাকলে বা ক্রিয়েটর সময় বদলালে স্থির ঘণ্টা।
// doc না থাকলে/পড়া ব্যর্থ হলে nabijiTimeline.js-এর ডিফল্ট তালিকা — কার্ড আগের মতোই চলে। React global(window.React, globals.js)।
import { isCreatorAuth } from "../legacy/familyIdentity.js";
import { fetchSection } from "../legacy/editableContent.js";
import { NABIJI_SECTION_ID, DEFAULT_SLOTS, normalizeSlots, slotAtMin, applyWaqt, rangeLabel, CATS } from "./nabijiTimeline.js";
import { getSavedLocation, getSavedMadhab } from "../legacy/publicToolsSettings.js";
import { fetchDailyPrayerTimes, peekCachedDailyTimings } from "../legacy/publicToolsPrayerApi.js";
import { NabijiTimelineEditor } from "./NabijiTimelineEditor.jsx";
import { EditIcon, ChevronDown } from "./icons.jsx";

const PREVIEW = 3;
// সময়ভাগ অনুযায়ী রঙের থিম: কার্ডের বর্ডার + চারপাশের রঙিন আভা(glow) + চিপ/আইকন/লেবেল। একটাই কার্ড, ভেতরে আলাদা প্যানেল নেই।
// ভোর=অ্যাম্বার-গোলাপি, দিন=সবুজ/আকাশি, সন্ধ্যা=কমলা-গোলাপি, রাত=নীল। অচেনা/ক্রিয়েটরের নতুন সময়ভাগ = সবুজ।
const T = (card, glow, chipOn, chipOff, o) => Object.assign({ card, glow, chipOn, chipOff, txt: "text-slate-800", src: "text-slate-500", dot: "bg-slate-300", title: "text-slate-900", time: "bg-white/80 text-[#8A6A1C]", icon: "bg-white shadow-sm", link: "text-slate-700", edit: "text-slate-700" }, o || {});
const THEMES = {
  s_lastNight: T("from-indigo-100 via-indigo-50 to-white border-indigo-400", "shadow-[0_3px_12px_-3px_rgba(99,102,241,0.3)]", "from-indigo-800 to-slate-900", "bg-indigo-50 border-indigo-200 text-indigo-900", { src: "text-indigo-800/70", dot: "bg-indigo-400", title: "text-indigo-950", link: "text-indigo-900", time: "bg-indigo-100 text-indigo-900", icon: "bg-indigo-100", edit: "text-indigo-900" }),
  s_fajr: T("from-amber-50 to-white border-amber-300", "shadow-[0_3px_12px_-3px_rgba(251,146,60,0.3)]", "from-amber-500 to-rose-400", "bg-amber-50 border-amber-200 text-amber-900", { src: "text-amber-800/80", dot: "bg-amber-400", title: "text-amber-950", link: "text-amber-900", time: "bg-amber-100 text-amber-900", icon: "bg-amber-100", edit: "text-amber-900" }),
  s_duha: T("from-yellow-50 to-white border-yellow-300", "shadow-[0_3px_12px_-3px_rgba(250,204,21,0.3)]", "from-yellow-500 to-amber-500", "bg-yellow-50 border-yellow-200 text-yellow-900", { src: "text-yellow-800/80", dot: "bg-yellow-400", title: "text-yellow-950", link: "text-yellow-900", time: "bg-yellow-100 text-yellow-900", icon: "bg-yellow-100", edit: "text-yellow-900" }),
  s_work: T("from-emerald-50 to-white border-emerald-300", "shadow-[0_3px_12px_-3px_rgba(16,185,129,0.3)]", "from-emerald-600 to-teal-600", "bg-emerald-50 border-emerald-200 text-emerald-900", { src: "text-emerald-800/80", dot: "bg-emerald-400", title: "text-emerald-950", link: "text-emerald-900", time: "bg-emerald-100 text-emerald-900", icon: "bg-emerald-100", edit: "text-emerald-900" }),
  s_afternoon: T("from-sky-50 to-white border-sky-300", "shadow-[0_3px_12px_-3px_rgba(14,165,233,0.3)]", "from-sky-500 to-cyan-600", "bg-sky-50 border-sky-200 text-sky-900", { src: "text-sky-800/80", dot: "bg-sky-400", title: "text-sky-950", link: "text-sky-900", time: "bg-sky-100 text-sky-900", icon: "bg-sky-100", edit: "text-sky-900" }),
  s_asr: T("from-orange-50 to-white border-orange-300", "shadow-[0_3px_12px_-3px_rgba(249,115,22,0.3)]", "from-orange-500 to-amber-500", "bg-orange-50 border-orange-200 text-orange-900", { src: "text-orange-800/80", dot: "bg-orange-400", title: "text-orange-950", link: "text-orange-900", time: "bg-orange-100 text-orange-900", icon: "bg-orange-100", edit: "text-orange-900" }),
  s_maghrib: T("from-rose-50 to-white border-rose-300", "shadow-[0_3px_12px_-3px_rgba(244,63,94,0.3)]", "from-orange-500 to-rose-500", "bg-rose-50 border-rose-200 text-rose-900", { src: "text-rose-900/70", dot: "bg-rose-400", title: "text-rose-950", link: "text-rose-900", time: "bg-rose-100 text-rose-900", icon: "bg-rose-100", edit: "text-rose-900" }),
  s_isha: T("from-indigo-100 via-indigo-50 to-white border-indigo-400", "shadow-[0_3px_12px_-3px_rgba(79,70,229,0.3)]", "from-indigo-600 to-indigo-800", "bg-indigo-50 border-indigo-200 text-indigo-900", { src: "text-indigo-800/70", dot: "bg-indigo-400", title: "text-indigo-950", link: "text-indigo-900", time: "bg-indigo-100 text-indigo-900", icon: "bg-indigo-100", edit: "text-indigo-900" }),
  s_sleep: T("from-violet-100 via-indigo-50 to-white border-violet-400", "shadow-[0_3px_12px_-3px_rgba(139,92,246,0.3)]", "from-violet-700 to-indigo-900", "bg-violet-50 border-violet-200 text-violet-900", { src: "text-violet-800/70", dot: "bg-violet-400", title: "text-violet-950", link: "text-violet-900", time: "bg-violet-100 text-violet-900", icon: "bg-violet-100", edit: "text-violet-900" }),
};
const THEME_DEFAULT = T("from-emerald-50 to-white border-emerald-300", "shadow-[0_3px_12px_-3px_rgba(16,185,129,0.3)]", "from-emerald-600 to-teal-600", "bg-emerald-50 border-emerald-200 text-emerald-900", { src: "text-emerald-800/80", dot: "bg-emerald-400", title: "text-emerald-950", link: "text-emerald-900", time: "bg-emerald-100 text-emerald-900", icon: "bg-emerald-100", edit: "text-emerald-900" });
const themeOf = (id) => THEMES[id] || THEME_DEFAULT;
const NEUTRAL = { txt: "text-slate-700", src: "text-slate-500", dot: "bg-slate-300" };
// বিষয়(cat) ধরে গ্রুপ: প্রথম দেখা-ক্রমে; বিষয়হীন বুলেট আলাদা গ্রুপে(শিরোনাম ছাড়া)
function groupItems(items) {
  const groups = [];
  items.forEach((it) => {
    const key = it.cat && CATS[it.cat] ? it.cat : "";
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, items: [] }; groups.push(g); }
    g.items.push(it);
  });
  return groups;
}

// সূত্র লেখার শেষে ছোট ধূসর বন্ধনীতে(আলাদা লাইন নয়)
function Src({ src, th }) {
  return src ? React.createElement("span", { className: "inline-block text-[11px] ml-1 " + th.src }, "(" + src + ")") : null;
}

function Bullets({ items, th = NEUTRAL }) {
  return React.createElement(
    "div",
    { className: "space-y-3" },
    groupItems(items).map((g) => {
      const cat = g.key ? CATS[g.key] : null;
      const pill = cat && React.createElement("span", { className: "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md " + cat.cls }, cat.label);
      const single = g.items.length === 1;
      return React.createElement(
        "div",
        { key: g.key || "_" },
        single
          ? React.createElement("p", { className: "text-sm leading-relaxed " + th.txt }, pill, pill && " ", g.items[0].text, React.createElement(Src, { src: g.items[0].src, th }))
          : React.createElement(
              React.Fragment,
              null,
              pill && React.createElement("div", { className: "mb-1" }, pill),
              React.createElement(
                "ul",
                { className: "space-y-1.5" },
                g.items.map((it, i) =>
                  React.createElement(
                    "li",
                    { key: i, className: "flex gap-2 text-sm leading-relaxed " + th.txt },
                    React.createElement("span", { className: "mt-2 w-1.5 h-1.5 rounded-full shrink-0 " + th.dot, "aria-hidden": true }),
                    React.createElement("span", null, it.text, React.createElement(Src, { src: it.src, th }))
                  )
                )
              )
            )
      );
    })
  );
}

function NowBadge({ exact }) {
  return React.createElement(
    "span",
    { className: "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap " + (exact ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800") },
    exact ? "এখন" : "পরের সময়"
  );
}

export function NabijiTimelineCard({ toBn, fold = "fixed" }) {
  const [slots, setSlots] = React.useState(DEFAULT_SLOTS);
  const [editing, setEditing] = React.useState(false);
  const [openCard, setOpenCard] = React.useState(fold === "open");
  const [more, setMore] = React.useState(false);
  const [sel, setSel] = React.useState(null); // null = এখনকার সময়ভাগ অনুসরণ
  const [nowMin, setNowMin] = React.useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  const [timings, setTimings] = React.useState(null);
  const stripRef = React.useRef(null);
  const isCreator = isCreatorAuth();

  React.useEffect(() => {
    let alive = true;
    fetchSection(NABIJI_SECTION_ID).then((d) => { if (alive) setSlots(normalizeSlots(d)); });
    return () => { alive = false; };
  }, []);
  // ঘণ্টা বদলালে কার্ড নিজে বদলায়(অ্যাপ খোলা রেখে ঘুমালেও)
  React.useEffect(() => {
    const t = setInterval(() => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); }, 60000);
    return () => clearInterval(t);
  }, []);
  // আজকের ওয়াক্ত-সময়: আগে ক্যাশ(নেটওয়ার্ক ছাড়া), পরে নতুন; লোকেশন সেভ না থাকলে কিছুই করে না
  const dayStr = new Date().toDateString();
  React.useEffect(() => {
    let alive = true;
    let loc = null;
    let madhab = 1;
    try { loc = getSavedLocation(); madhab = getSavedMadhab(); } catch {}
    if (!loc) return undefined;
    const d = new Date();
    try {
      const cached = peekCachedDailyTimings({ lat: loc.lat, lon: loc.lon, madhab, date: d });
      if (cached && cached.timings) setTimings(cached.timings);
    } catch {}
    fetchDailyPrayerTimes({ lat: loc.lat, lon: loc.lon, madhab, date: d })
      .then((res) => { if (alive && res && res.timings) setTimings(res.timings); })
      .catch(() => {});
    return () => { alive = false; };
  }, [dayStr]);
  // দেখানোর slot-তালিকা(ওয়াক্ত প্রযোজ্য হলে fromM/toM সহ); সম্পাদকের কাছে যায় মূল slots
  const view = React.useMemo(() => applyWaqt(slots, timings), [slots, timings]);
  const waqtOn = view !== slots;
  // নির্বাচিত চিপ স্ট্রিপের মাঝে আনা(পেজ স্ক্রল না করে)
  React.useEffect(() => {
    const box = stripRef.current;
    const el = box && box.querySelector("[data-sel='1']");
    if (box && el) box.scrollLeft = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
  }, [sel, nowMin, view]);

  const hit = slotAtMin(view, nowMin);
  if (!hit) return null;
  const { exact } = hit;
  const nowId = hit.slot.id;
  const slot = (sel && view.find((s) => s.id === sel)) || hit.slot;
  const isNowSlot = slot.id === nowId;
  const th = themeOf(slot.id);
  const shown = more ? slot.items : slot.items.slice(0, PREVIEW);
  const hasMore = slot.items.length > PREVIEW;

  const pick = (id) => { setSel(id === nowId ? null : id); setMore(false); };

  const foldable = fold === "open" || fold === "closed";
  const rootCls = "rounded-2xl p-4 border bg-gradient-to-b " + th.card + " " + th.glow;
  const titleEl = foldable
    ? React.createElement(
        "button",
        { type: "button", onClick: () => setOpenCard(!openCard), "aria-expanded": openCard, className: "w-full flex items-center justify-between gap-2 min-h-[28px]" + (openCard ? " mb-3" : "") },
        React.createElement("h3", { className: "text-sm font-bold text-emerald-950 text-left" }, "এ সময়ে নবিজি ﷺ যা করতেন"),
        React.createElement(ChevronDown, { size: 15, color: "#8A9A8F", className: "transition-transform" + (openCard ? " rotate-180" : "") })
      )
    : React.createElement("h3", { className: "text-sm font-bold text-emerald-950 mb-3" }, "এ সময়ে নবিজি ﷺ যা করতেন");
  if (foldable && !openCard) return React.createElement("div", { className: rootCls }, titleEl);

  return React.createElement(
    "div",
    { className: rootCls },
    titleEl,
    // সময়ের চিপ-স্ট্রিপ
    React.createElement(
      "div",
      { ref: stripRef, className: "relative flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 mb-3", style: { scrollbarWidth: "none" } },
      view.map((s) => {
        const active = s.id === slot.id;
        const now = exact && s.id === nowId;
        return React.createElement(
          "button",
          {
            key: s.id,
            type: "button",
            onClick: () => pick(s.id),
            "aria-pressed": active,
            "data-sel": active ? "1" : undefined,
            className: "shrink-0 min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors " + (active ? "text-white border-transparent shadow-sm bg-gradient-to-r " + themeOf(s.id).chipOn : themeOf(s.id).chipOff),
          },
          React.createElement("span", { "aria-hidden": true }, s.icon),
          s.title,
          now && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full " + (active ? "bg-white" : "bg-emerald-600"), "aria-label": "এখনকার সময়" })
        );
      })
    ),
    isCreator && editing && React.createElement(NabijiTimelineEditor, { slots, onSaved: setSlots, onClose: () => setEditing(false) }),
    // হেডার
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2.5 min-w-0" },
        React.createElement("span", { className: "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xl " + th.icon, "aria-hidden": true }, slot.icon),
        React.createElement(
          "div",
          { className: "min-w-0" },
          React.createElement(
            "div",
            { className: "flex items-center gap-1.5 flex-wrap" },
            React.createElement("span", { className: "text-base font-bold " + th.title }, slot.title),
            isNowSlot && React.createElement(NowBadge, { exact })
          ),
          React.createElement("span", { className: "inline-block mt-0.5 text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap " + th.time }, rangeLabel(slot, toBn))
        )
      ),
      isCreator && !editing && React.createElement("button", { type: "button", onClick: () => setEditing(true), "aria-label": "সম্পাদনা", className: "w-11 h-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-black/5 " + th.edit }, React.createElement(EditIcon, { size: 16 }))
    ),
    React.createElement(Bullets, { items: shown, th }),
    hasMore && React.createElement("button", { type: "button", onClick: () => setMore(!more), "aria-expanded": more, className: "mt-1 min-h-[44px] inline-flex items-center text-xs font-semibold underline " + th.link }, more ? "কম দেখুন" : "আরও দেখুন (" + toBn(slot.items.length - PREVIEW) + "টি)"),
    React.createElement(
      "div",
      { className: "mt-2 pt-1 border-t border-slate-100" },
      React.createElement("p", { className: "mt-2 text-[11px] text-slate-400" }, (waqtOn ? "সময়ভাগ আপনার সেভ-করা লোকেশনের নামাজের ওয়াক্ত অনুযায়ী। " : "") + "সূত্র সহিহ হাদিসগ্রন্থ থেকে; আমলের মাসআলায় প্রশ্ন থাকলে আলেমের পরামর্শ নিন।")
    )
  );
}
