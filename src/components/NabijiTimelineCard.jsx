// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ড(হোম ট্যাবে, তাযকিরার নিচে, owner-approved ৭ নভেম্বর ২০২৬):
// এখনকার সময়ের ভাগ অনুযায়ী ২-৩টি বুলেট + প্রতিটির সহিহ সূত্র; "আরও দেখুন"-এ বাকি বুলেট।
// ওপরে সময়ের চিপ-স্ট্রিপ: যেকোনো চিপে ট্যাপ করলে সেই সময়ভাগ দেখা যায়; "পুরো দিনের তালিকা"-য় প্রতিটি সময়ভাগ ভাঁজ-করা(বর্তমানটি খোলা)।
// বুলেট বিষয়(ইবাদত/পরিবার…) ধরে গ্রুপ; সূত্র লেখার শেষে বন্ধনীতে। ভাঁজ-কার্ডের ভেতরে হলে নিজের ফ্রেম নেই(লেখা চওড়া)।
// শুধু দেখায় — কোনো ডেটা লেখে না। তালিকা সম্পাদনা শুধু App Creator(isCreatorAuth + Firestore Rules-এ enforced)।
// সময়ভাগ সেভ-করা লোকেশনের আসল ওয়াক্ত-সময়ে(ফজর, যোহর…) চলে — লোকেশন/নেটওয়ার্ক/ক্যাশ না থাকলে বা ক্রিয়েটর সময় বদলালে স্থির ঘণ্টা।
// doc না থাকলে/পড়া ব্যর্থ হলে nabijiTimeline.js-এর ডিফল্ট তালিকা — কার্ড আগের মতোই চলে। React global(window.React, globals.js)।
import { isCreatorAuth } from "../legacy/familyIdentity.js";
import { fetchSection } from "../legacy/editableContent.js";
import { NABIJI_SECTION_ID, DEFAULT_SLOTS, normalizeSlots, slotAtMin, applyWaqt, rangeLabel, CATS } from "./nabijiTimeline.js";
import { getSavedLocation, getSavedMadhab } from "../legacy/publicToolsSettings.js";
import { fetchDailyPrayerTimes, peekCachedDailyTimings } from "../legacy/publicToolsPrayerApi.js";
import { NabijiTimelineEditor } from "./NabijiTimelineEditor.jsx";
import { EditIcon } from "./icons.jsx";

const PREVIEW = 3;
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
function Src({ src }) {
  return src ? React.createElement("span", { className: "inline-block text-[11px] text-slate-500 ml-1" }, "(" + src + ")") : null;
}

function Bullets({ items }) {
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
          ? React.createElement("p", { className: "text-sm text-slate-700 leading-relaxed" }, pill, pill && " ", g.items[0].text, React.createElement(Src, { src: g.items[0].src }))
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
                    { key: i, className: "flex gap-2 text-sm text-slate-700 leading-relaxed" },
                    React.createElement("span", { className: "mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0", "aria-hidden": true }),
                    React.createElement("span", null, it.text, React.createElement(Src, { src: it.src }))
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

export function NabijiTimelineCard({ toBn, showTitle = false }) {
  const [slots, setSlots] = React.useState(DEFAULT_SLOTS);
  const [editing, setEditing] = React.useState(false);
  const [more, setMore] = React.useState(false);
  const [all, setAll] = React.useState(false);
  const [openIds, setOpenIds] = React.useState([]);
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
  const shown = more ? slot.items : slot.items.slice(0, PREVIEW);
  const hasMore = slot.items.length > PREVIEW;

  const pick = (id) => { setSel(id === nowId ? null : id); setMore(false); };
  const toggleAll = () => {
    if (!all) setOpenIds([nowId]);
    setAll(!all);
  };
  const toggleOpen = (id) => setOpenIds(openIds.includes(id) ? openIds.filter((x) => x !== id) : openIds.concat(id));

  return React.createElement(
    "div",
    { className: showTitle ? "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]" : "" }, // showTitle=false: বাইরের ভাঁজ-কার্ডেই মোড়ানো — ভেতরে দ্বিতীয় কার্ড-ফ্রেম নেই
    showTitle && React.createElement("h3", { className: "text-sm font-bold text-emerald-950 mb-3" }, "এ সময়ে নবিজি ﷺ যা করতেন"),
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
            className: "shrink-0 min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors " + (active ? "bg-emerald-700 text-white border-emerald-700" : "bg-slate-50 text-slate-600 border-slate-200"),
          },
          React.createElement("span", { "aria-hidden": true }, s.icon),
          s.title,
          now && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full " + (active ? "bg-amber-300" : "bg-emerald-600"), "aria-label": "এখনকার সময়" })
        );
      })
    ),
    // হেডার
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2.5 min-w-0" },
        React.createElement("span", { className: "w-10 h-10 shrink-0 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl", "aria-hidden": true }, slot.icon),
        React.createElement(
          "div",
          { className: "min-w-0" },
          React.createElement(
            "div",
            { className: "flex items-center gap-1.5 flex-wrap" },
            React.createElement("span", { className: "text-base font-bold text-emerald-950" }, slot.title),
            isNowSlot && React.createElement(NowBadge, { exact })
          ),
          React.createElement("span", { className: "inline-block mt-0.5 text-[11px] font-semibold text-[#8A6A1C] bg-[#FBF3DC] rounded-full px-2 py-0.5 whitespace-nowrap" }, rangeLabel(slot, toBn))
        )
      ),
      isCreator && !editing && React.createElement("button", { type: "button", onClick: () => setEditing(true), "aria-label": "সম্পাদনা", className: "w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-emerald-800 hover:bg-black/5" }, React.createElement(EditIcon, { size: 16 }))
    ),
    isCreator && editing && React.createElement(NabijiTimelineEditor, { slots, onSaved: setSlots, onClose: () => setEditing(false) }),
    React.createElement(Bullets, { items: shown }),
    hasMore && React.createElement("button", { type: "button", onClick: () => setMore(!more), "aria-expanded": more, className: "mt-1 min-h-[44px] inline-flex items-center text-xs font-semibold text-emerald-800 underline" }, more ? "কম দেখুন" : "আরও দেখুন (" + toBn(slot.items.length - PREVIEW) + "টি)"),
    React.createElement(
      "div",
      { className: "mt-2 pt-1 border-t border-slate-100" },
      React.createElement("button", { type: "button", onClick: toggleAll, "aria-expanded": all, className: "min-h-[44px] inline-flex items-center text-xs font-semibold text-slate-500" }, all ? "পুরো দিনের তালিকা লুকান ▲" : "পুরো দিনের তালিকা দেখুন ▼"),
      all && React.createElement(
        "div",
        { className: "mt-1 space-y-2" },
        view.map((s) => {
          const open = openIds.includes(s.id);
          const now = exact && s.id === nowId;
          return React.createElement(
            "div",
            { key: s.id, className: "rounded-xl border " + (now ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100") },
            React.createElement(
              "button",
              { type: "button", onClick: () => toggleOpen(s.id), "aria-expanded": open, className: "w-full min-h-[44px] px-3 flex items-center justify-between gap-2 text-left" },
              React.createElement(
                "span",
                { className: "flex items-center gap-2 min-w-0 flex-wrap" },
                React.createElement("span", { "aria-hidden": true }, s.icon),
                React.createElement("span", { className: "text-sm font-bold text-emerald-900" }, s.title),
                now && React.createElement(NowBadge, { exact: true }),
                React.createElement("span", { className: "text-[11px] text-slate-500" }, rangeLabel(s, toBn))
              ),
              React.createElement("span", { className: "text-xs text-slate-400 shrink-0", "aria-hidden": true }, open ? "▲" : "▼")
            ),
            open && React.createElement("div", { className: "px-3 pb-3" }, React.createElement(Bullets, { items: s.items }))
          );
        })
      ),
      React.createElement("p", { className: "mt-2 text-[11px] text-slate-400" }, (waqtOn ? "সময়ভাগ আপনার সেভ-করা লোকেশনের নামাজের ওয়াক্ত অনুযায়ী। " : "") + "সূত্র সহিহ হাদিসগ্রন্থ থেকে; আমলের মাসআলায় প্রশ্ন থাকলে আলেমের পরামর্শ নিন।")
    )
  );
}
