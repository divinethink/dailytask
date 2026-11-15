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
import { EditIcon, ChevronDown, Icon, InfoIcon } from "./icons.jsx";

const PREVIEW = 3;
// হালকা একরঙা থিম (owner-approved ১৫ নভেম্বর ২০২৬): সব সময়ভাগে একই — অ্যাপের থিম-কালারের emerald স্কেল অনুসারে বদলায়।
// কার্ডে পাতলা টিন্ট-ভরাট + বর্ডারের চারপাশে হালকা আভা (ring); আইকন নেভ-বারের মতো আউটলাইন SVG, থিম-অ্যাকসেন্ট রঙে।
// ডিফল্ট সময়ভাগের আইকন SVG; ক্রিয়েটরের নতুন/অচেনা সময়ভাগ = তার emoji (হালকা)।
const CALM = {
  card: "bg-gradient-to-b from-emerald-50 to-white border-0 border-t-[3px] border-t-[#C89B3C]", glow: "shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]",
  chipOn: "from-emerald-50 to-emerald-100 !border-emerald-300 !text-emerald-900", chipOff: "bg-white border-emerald-200 text-emerald-900",
  txt: "text-slate-800", src: "text-slate-500", dot: "bg-emerald-400", title: "text-slate-900",
  time: "bg-white text-emerald-800", icon: "bg-emerald-100 text-emerald-800", link: "text-emerald-800", edit: "text-emerald-800"
};
const ICON_SOFT = " grayscale opacity-70";
const themeOf = () => CALM;
const P = (d, k) => React.createElement("path", { d, key: k });
const SVG_ICONS = {
  s_lastNight: () => [P("M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z", 1)],
  s_fajr: () => ["M12 2v8", "m4.93 10.93 1.41 1.41", "M2 18h2", "M20 18h2", "m19.07 10.93-1.41 1.41", "M22 22H2", "m8 6 4-4 4 4", "M16 18a4 4 0 0 0-8 0"].map(P),
  s_duha: () => [React.createElement("circle", { cx: 12, cy: 12, r: 4, key: "c" }), ...["M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"].map(P)],
  s_work: () => [React.createElement("rect", { x: 2, y: 7, width: 20, height: 14, rx: 2, key: "r" }), P("M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", 2)],
  s_afternoon: () => [P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", 1), React.createElement("circle", { cx: 9, cy: 7, r: 4, key: "c" }), P("M22 21v-2a4 4 0 0 0-3-3.87", 3), P("M16 3.13a4 4 0 0 1 0 7.75", 4)],
  s_asr: () => [React.createElement("circle", { cx: 12, cy: 12, r: 3, key: "c" }), ...["M12 3v2", "M12 19v2", "M3 12h2", "M19 12h2", "m5.6 5.6 1.4 1.4", "m17 17 1.4 1.4", "m5.6 18.4 1.4-1.4", "m17 7 1.4-1.4"].map(P)],
  s_maghrib: () => ["M12 10V2", "m4.93 10.93 1.41 1.41", "M2 18h2", "M20 18h2", "m19.07 10.93-1.41 1.41", "M22 22H2", "m16 6-4 4-4-4", "M16 18a4 4 0 0 0-8 0"].map(P),
  s_isha: () => ["M18 5h4", "M20 3v4", "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"].map(P),
  s_sleep: () => ["M2 4v16", "M2 8h18a2 2 0 0 1 2 2v10", "M2 17h20", "M6 8v9"].map(P)
};
function SlotIcon({ id, emoji, size, className }) {
  const draw = SVG_ICONS[id];
  if (!draw) return React.createElement("span", { "aria-hidden": true, className: ICON_SOFT.trim() }, emoji);
  return React.createElement(Icon, { size, className }, draw());
}
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
  return src ? React.createElement("span", { className: "block text-[11px] mt-0.5 " + th.src }, src) : null;
}

function Bullets({ items, th = NEUTRAL }) {
  return React.createElement(
    "div",
    { className: "space-y-3.5" },
    groupItems(items).map((g) => {
      const cat = g.key ? CATS[g.key] : null;
      const pill = cat && React.createElement("div", { className: "mb-1.5" }, React.createElement("span", { className: "inline-block text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#F7EEDB] text-[#8A6A1F]" }, cat.label));
      return React.createElement(
        "div",
        { key: g.key || "_" },
        pill,
        React.createElement(
          "div",
          { className: "space-y-2" },
          g.items.map((it, i) =>
            React.createElement(
              "div",
              { key: i, className: "pl-3 py-0.5 border-l-2 border-[#E4D3A8] text-sm leading-relaxed " + th.txt },
              it.text,
              React.createElement(Src, { src: it.src, th })
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
    { className: "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap " + (exact ? "bg-[#F7EEDB] text-[#8A6A1F] border border-[#E4D3A8]" : "bg-slate-100 text-slate-500") },
    exact ? "এখন" : "পরের সময়"
  );
}

export function NabijiTimelineCard({ toBn, fold = "fixed" }) {
  const [slots, setSlots] = React.useState(DEFAULT_SLOTS);
  const [editing, setEditing] = React.useState(false);
  const [openCard, setOpenCard] = React.useState(fold === "open");
  const [more, setMore] = React.useState(false);
  const [sel, setSel] = React.useState(null); // null = এখনকার সময়ভাগ অনুসরণ
  const [note, setNote] = React.useState(false); // ⓘ: সূত্র/সতর্কতার নোট
  const [nowMin, setNowMin] = React.useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  const [timings, setTimings] = React.useState(null);
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
  // সময়ভাগ বদল: আগের/পরের(শেষে ঘুরে প্রথমে)। চিপ-স্ট্রিপ সরানো হয়েছে(১৫ নভেম্বর ২০২৬, owner-approved)
  const idx = view.findIndex((x) => x.id === slot.id);
  const step = (d) => { const n = view.length; if (n > 1 && idx >= 0) pick(view[(idx + d + n) % n].id); };
  const navBtn = "w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-xl text-slate-500 active:bg-black/5";

  const foldable = fold === "open" || fold === "closed";
  const rootCls = "rounded-2xl overflow-hidden p-4 " + th.card + " " + th.glow;
  const isOpen = !foldable || openCard;
  const bandCls = "relative overflow-hidden -mx-4 -mt-4 px-4 py-3 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white " + (isOpen ? "mb-4" : "-mb-4");
  // মসজিদে নববীর হালকা সিলুয়েট(গম্বুজ+মিনার) — শুধু সাজসজ্জা, লেখা/বাটনের নিচে, ক্লিক-অযোগ্য
  const mosqueEl = React.createElement(
    "svg",
    { viewBox: "0 0 120 48", "aria-hidden": true, focusable: "false", className: "pointer-events-none absolute bottom-0 right-10 h-[88%] w-auto", fill: "#E4D3A8", fillOpacity: "0.17" },
    React.createElement("rect", { x: 0, y: 44, width: 120, height: 4 }),
    React.createElement("rect", { x: 30, y: 31, width: 60, height: 13 }),
    React.createElement("path", { d: "M44 31A16 16 0 0 1 76 31Z" }),
    React.createElement("rect", { x: 59.2, y: 9, width: 1.6, height: 6 }),
    React.createElement("circle", { cx: 60, cy: 7, r: 2.4 }),
    [14, 106].map((x) => React.createElement("g", { key: x },
      React.createElement("rect", { x: x - 2, y: 14, width: 4, height: 30 }),
      React.createElement("path", { d: "M" + (x - 2) + " 14L" + x + " 5L" + (x + 2) + " 14Z" }),
      React.createElement("rect", { x: x - 3, y: 22, width: 6, height: 2 }))),
    [24, 96].map((x) => React.createElement("g", { key: x },
      React.createElement("rect", { x: x - 1.5, y: 24, width: 3, height: 20 }),
      React.createElement("path", { d: "M" + (x - 1.5) + " 24L" + x + " 18L" + (x + 1.5) + " 24Z" })))
  );
  const titleEl = React.createElement(
    "div",
    { className: bandCls },
    mosqueEl,
    foldable
      ? React.createElement(
          "button",
          { type: "button", onClick: () => setOpenCard(!openCard), "aria-expanded": openCard, className: "relative w-full flex items-center justify-between gap-2 min-h-[28px]" },
          React.createElement("h3", { className: "text-sm font-bold text-white text-left" }, "এ সময়ে নবিজি ﷺ যা করতেন"),
          React.createElement(ChevronDown, { size: 15, color: "#E4D3A8", className: "transition-transform" + (openCard ? " rotate-180" : "") })
        )
      : React.createElement("h3", { className: "relative text-sm font-bold text-white" }, "এ সময়ে নবিজি ﷺ যা করতেন")
  );
  if (foldable && !openCard) return React.createElement("div", { className: rootCls }, titleEl);

  return React.createElement(
    "div",
    { className: rootCls },
    titleEl,
    isCreator && editing && React.createElement(NabijiTimelineEditor, { slots, onSaved: setSlots, onClose: () => setEditing(false) }),
    // হেডার
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2.5 min-w-0" },
        React.createElement("span", { className: "w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xl " + th.icon, "aria-hidden": true }, React.createElement(SlotIcon, { id: slot.id, emoji: slot.icon, size: 20 })),
        React.createElement(
          "div",
          { className: "min-w-0" },
          React.createElement(
            "div",
            { className: "flex items-center gap-1.5 flex-wrap" },
            React.createElement("span", { className: "text-[15px] font-bold " + th.title }, slot.title),
            isNowSlot && React.createElement(NowBadge, { exact })
          ),
          React.createElement(
            "div",
            { className: "flex items-center" },
            React.createElement("span", { className: "text-[11px] font-medium text-slate-500 whitespace-nowrap" }, rangeLabel(slot, toBn)),
            React.createElement("button", { type: "button", onClick: () => setNote(!note), "aria-expanded": note, "aria-label": "সূত্র ও সতর্কতা", className: "w-11 h-11 -my-4 -ml-1 flex items-center justify-center text-slate-400" }, React.createElement(InfoIcon, { size: 14 }))
          )
        )
      ),
      React.createElement(
        "div",
        { className: "flex items-center shrink-0" },
        React.createElement("button", { type: "button", onClick: () => step(-1), "aria-label": "আগের সময়", className: navBtn }, "‹"),
        React.createElement("button", { type: "button", onClick: () => step(1), "aria-label": "পরের সময়", className: navBtn }, "›"),
      isCreator && !editing && React.createElement("button", { type: "button", onClick: () => setEditing(true), "aria-label": "সম্পাদনা", className: "w-11 h-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-black/5 " + th.edit }, React.createElement(EditIcon, { size: 16 }))
      )
    ),
    note && React.createElement("p", { className: "mb-3 text-[11px] leading-snug text-slate-500" }, "সূত্র সহিহ হাদিসগ্রন্থ থেকে; আমলের মাসআলায় প্রশ্ন থাকলে আলেমের পরামর্শ নিন।"),
    React.createElement(Bullets, { items: shown, th }),
    hasMore && React.createElement("button", { type: "button", onClick: () => setMore(!more), "aria-expanded": more, className: "mt-3 min-h-[44px] inline-flex items-center px-4 rounded-full border border-emerald-200 bg-white/70 text-xs font-semibold " + th.link }, more ? "কম দেখুন" : "আরও দেখুন (" + toBn(slot.items.length - PREVIEW) + "টি)")
  );
}
