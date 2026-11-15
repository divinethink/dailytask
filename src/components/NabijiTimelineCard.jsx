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
import { EditIcon, ChevronDown, Icon } from "./icons.jsx";

const PREVIEW = 3;
// হালকা একরঙা থিম (owner-approved ১৫ নভেম্বর ২০২৬): সব সময়ভাগে একই — অ্যাপের থিম-কালারের emerald স্কেল অনুসারে বদলায়।
// কার্ডে পাতলা টিন্ট-ভরাট + বর্ডারের চারপাশে হালকা আভা (ring); আইকন নেভ-বারের মতো আউটলাইন SVG, থিম-অ্যাকসেন্ট রঙে।
// ডিফল্ট সময়ভাগের আইকন SVG; ক্রিয়েটরের নতুন/অচেনা সময়ভাগ = তার emoji (হালকা)।
const CALM = {
  card: "bg-white border-[#E4D3A8]", glow: "shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]",
  chipOn: "from-emerald-700 to-emerald-800", chipOff: "bg-white border-emerald-200 text-emerald-900",
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
    { className: "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap " + (exact ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600") },
    exact ? "এখন" : "পরের সময়"
  );
}

export function NabijiTimelineCard({ toBn, fold = "fixed" }) {
  const [slots, setSlots] = React.useState(DEFAULT_SLOTS);
  const [editing, setEditing] = React.useState(false);
  const [openCard, setOpenCard] = React.useState(fold === "open");
  const [more, setMore] = React.useState(false);
  const [sel, setSel] = React.useState(null); // null = এখনকার সময়ভাগ অনুসরণ
  const [reveal, setReveal] = React.useState(false); // সোয়াইপ/ফোকাসে পাশের চিপ দেখায়; ২.৫ সেকেন্ড পর আবার লুকায়
  const revealT = React.useRef(null);
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

  React.useEffect(() => () => clearTimeout(revealT.current), []);
  const peek = () => { setReveal(true); clearTimeout(revealT.current); revealT.current = setTimeout(() => setReveal(false), 2500); };

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
  const rootCls = "rounded-2xl p-4 border " + th.card + " " + th.glow;
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
    // সময়ের চিপ-স্ট্রিপ: শুধু নির্বাচিত চিপ দেখা যায়, পাশেরগুলো অদৃশ্য — সোয়াইপ/ফোকাস করলে দেখা যায়(২.৫ সেকেন্ড পর আবার লুকায়)
    React.createElement(
      "div",
      { className: "relative mb-3" },
      React.createElement(
        "div",
        { ref: stripRef, onTouchStart: peek, onPointerDown: peek, onWheel: peek, onFocus: peek, className: "relative flex gap-2 overflow-x-auto -mx-4 pb-2", style: { scrollbarWidth: "none" } },
        React.createElement("span", { className: "shrink-0 w-[38%]", "aria-hidden": true }),
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
              className: "shrink-0 min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all duration-200 " + (active ? "text-white border-transparent shadow-sm bg-gradient-to-r " + themeOf(s.id).chipOn : themeOf(s.id).chipOff + (reveal ? "" : " opacity-0")),
            },
            React.createElement(SlotIcon, { id: s.id, emoji: s.icon, size: 16, className: active ? "text-white" : "text-emerald-700" }),
            s.title,
            now && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full " + (active ? "bg-white" : "bg-emerald-600"), "aria-label": "এখনকার সময়" })
          );
        }),
        React.createElement("span", { className: "shrink-0 w-[38%]", "aria-hidden": true })
      ),
      // সোয়াইপের ইঙ্গিত: পাশের চিপ লুকানো থাকলে দুই কিনারায় হালকা তীর
      React.createElement("span", { "aria-hidden": true, className: "pointer-events-none absolute left-1 top-1/2 -translate-y-[60%] text-lg text-emerald-300 transition-opacity " + (reveal ? "opacity-0" : "opacity-100") }, "‹"),
      React.createElement("span", { "aria-hidden": true, className: "pointer-events-none absolute right-1 top-1/2 -translate-y-[60%] text-lg text-emerald-300 transition-opacity " + (reveal ? "opacity-0" : "opacity-100") }, "›")
    ),
    isCreator && editing && React.createElement(NabijiTimelineEditor, { slots, onSaved: setSlots, onClose: () => setEditing(false) }),
    // হেডার
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2.5 min-w-0" },
        React.createElement("span", { className: "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xl " + th.icon, "aria-hidden": true }, React.createElement(SlotIcon, { id: slot.id, emoji: slot.icon, size: 22 })),
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
