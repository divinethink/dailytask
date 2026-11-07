// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ড(হোম ট্যাবে, তাযকিরার নিচে, owner-approved ৭ নভেম্বর ২০২৬):
// এখনকার সময়ের ভাগ অনুযায়ী ২-৩টি বুলেট + প্রতিটির সহিহ সূত্র; "আরও দেখুন"-এ বাকি বুলেট।
// ওপরে সময়ের চিপ-স্ট্রিপ: যেকোনো চিপে ট্যাপ করলে সেই সময়ভাগ দেখা যায়; "পুরো দিনের তালিকা"-য় প্রতিটি সময়ভাগ ভাঁজ-করা(বর্তমানটি খোলা)।
// শুধু দেখায় — কোনো ডেটা লেখে না। তালিকা সম্পাদনা শুধু App Creator(isCreatorAuth + Firestore Rules-এ enforced)।
// doc না থাকলে/পড়া ব্যর্থ হলে nabijiTimeline.js-এর ডিফল্ট তালিকা — কার্ড আগের মতোই চলে। React global(window.React, globals.js)।
import { isCreatorAuth } from "../legacy/familyIdentity.js";
import { fetchSection } from "../legacy/editableContent.js";
import { NABIJI_SECTION_ID, DEFAULT_SLOTS, normalizeSlots, slotAt, rangeLabel, CATS } from "./nabijiTimeline.js";
import { NabijiTimelineEditor } from "./NabijiTimelineEditor.jsx";
import { EditIcon } from "./icons.jsx";

const PREVIEW = 3;
// বুলেটের বাঁ পাশের রঙিন দাগ(ধরন অনুযায়ী)
const BAR = {
  ibadat: "border-emerald-500",
  family: "border-rose-400",
  society: "border-sky-400",
  work: "border-amber-400",
  learn: "border-indigo-400",
};

function Bullets({ items }) {
  return React.createElement(
    "ul",
    { className: "space-y-3" },
    items.map((it, i) =>
      React.createElement(
        "li",
        { key: i, className: "border-l-[3px] pl-3 " + ((it.cat && BAR[it.cat]) || "border-slate-200") },
        it.cat && CATS[it.cat] && React.createElement("span", { className: "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 " + CATS[it.cat].cls }, CATS[it.cat].label),
        React.createElement("p", { className: "text-sm text-slate-700 leading-relaxed" }, it.text),
        it.src && React.createElement("span", { className: "inline-flex items-center gap-1 mt-1 text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5" }, React.createElement("span", { "aria-hidden": true }, "📖"), it.src)
      )
    )
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
  const [hour, setHour] = React.useState(() => new Date().getHours());
  const stripRef = React.useRef(null);
  const isCreator = isCreatorAuth();

  React.useEffect(() => {
    let alive = true;
    fetchSection(NABIJI_SECTION_ID).then((d) => { if (alive) setSlots(normalizeSlots(d)); });
    return () => { alive = false; };
  }, []);
  // ঘণ্টা বদলালে কার্ড নিজে বদলায়(অ্যাপ খোলা রেখে ঘুমালেও)
  React.useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(t);
  }, []);
  // নির্বাচিত চিপ স্ট্রিপের মাঝে আনা(পেজ স্ক্রল না করে)
  React.useEffect(() => {
    const box = stripRef.current;
    const el = box && box.querySelector("[data-sel='1']");
    if (box && el) box.scrollLeft = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
  }, [sel, hour, slots]);

  const hit = slotAt(slots, hour);
  if (!hit) return null;
  const { exact } = hit;
  const nowId = hit.slot.id;
  const slot = (sel && slots.find((s) => s.id === sel)) || hit.slot;
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
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]" },
    showTitle && React.createElement("h3", { className: "text-sm font-bold text-emerald-950 mb-3" }, "এ সময়ে নবিজি ﷺ যা করতেন"),
    // সময়ের চিপ-স্ট্রিপ
    React.createElement(
      "div",
      { ref: stripRef, className: "relative flex gap-2 overflow-x-auto -mx-1 px-1 pb-2 mb-3", style: { scrollbarWidth: "none" } },
      slots.map((s) => {
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
        slots.map((s) => {
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
      React.createElement("p", { className: "mt-2 text-[11px] text-slate-400" }, "সূত্র সহিহ হাদিসগ্রন্থ থেকে; আমলের মাসআলায় প্রশ্ন থাকলে আলেমের পরামর্শ নিন।")
    )
  );
}
