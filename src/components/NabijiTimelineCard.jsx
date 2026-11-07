// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ড(হোম ট্যাবে, তাযকিরার নিচে, owner-approved ৭ নভেম্বর ২০২৬):
// এখনকার সময়ের ভাগ অনুযায়ী ২-৩টি বুলেট + প্রতিটির সহিহ সূত্র; "আরও দেখুন"-এ বাকি বুলেট, "পুরো দিনের তালিকা"-য় সব সময়ভাগ।
// শুধু দেখায় — কোনো ডেটা লেখে না। তালিকা সম্পাদনা শুধু App Creator(isCreatorAuth + Firestore Rules-এ enforced)।
// doc না থাকলে/পড়া ব্যর্থ হলে nabijiTimeline.js-এর ডিফল্ট তালিকা — কার্ড আগের মতোই চলে। React global(window.React, globals.js)।
import { isCreatorAuth } from "../legacy/familyIdentity.js";
import { fetchSection } from "../legacy/editableContent.js";
import { NABIJI_SECTION_ID, DEFAULT_SLOTS, normalizeSlots, slotAt, inSlot, rangeLabel } from "./nabijiTimeline.js";
import { NabijiTimelineEditor } from "./NabijiTimelineEditor.jsx";
import { EditIcon } from "./icons.jsx";

const PREVIEW = 3;

function Bullets({ items }) {
  return React.createElement(
    "ul",
    { className: "space-y-2" },
    items.map((it, i) =>
      React.createElement(
        "li",
        { key: i, className: "flex gap-2 text-sm text-slate-700 leading-relaxed" },
        React.createElement("span", { className: "mt-2 w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0", "aria-hidden": true }),
        React.createElement(
          "span",
          null,
          it.text,
          it.src && React.createElement("span", { className: "block text-[11px] text-slate-400 mt-0.5" }, "সূত্র: " + it.src)
        )
      )
    )
  );
}

export function NabijiTimelineCard({ toBn, showTitle = false }) {
  const [slots, setSlots] = React.useState(DEFAULT_SLOTS);
  const [editing, setEditing] = React.useState(false);
  const [more, setMore] = React.useState(false);
  const [all, setAll] = React.useState(false);
  const [hour, setHour] = React.useState(() => new Date().getHours());
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

  const hit = slotAt(slots, hour);
  if (!hit) return null;
  const { slot, exact } = hit;
  const shown = more ? slot.items : slot.items.slice(0, PREVIEW);
  const hasMore = slot.items.length > PREVIEW;

  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]" },
    showTitle && React.createElement("h3", { className: "text-sm font-bold text-emerald-950 mb-2" }, "এ সময়ে নবিজি ﷺ যা করতেন"),
    React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2 mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2 min-w-0" },
        React.createElement("span", { className: "text-lg", "aria-hidden": true }, slot.icon),
        React.createElement("span", { className: "text-sm font-bold text-emerald-950" }, (exact ? "" : "পরের সময়: ") + slot.title)
      ),
      React.createElement(
        "div",
        { className: "flex items-center gap-1 shrink-0" },
        React.createElement("span", { className: "text-xs font-semibold text-[#A47E24] whitespace-nowrap" }, rangeLabel(slot, toBn)),
        isCreator && !editing && React.createElement("button", { type: "button", onClick: () => setEditing(true), "aria-label": "সম্পাদনা", className: "w-7 h-7 flex items-center justify-center rounded-lg text-emerald-800 hover:bg-black/5" }, React.createElement(EditIcon, { size: 16 }))
      )
    ),
    isCreator && editing && React.createElement(NabijiTimelineEditor, { slots, onSaved: setSlots, onClose: () => setEditing(false) }),
    React.createElement(Bullets, { items: shown }),
    hasMore && React.createElement("button", { type: "button", onClick: () => setMore((v) => !v), className: "mt-2 text-xs font-semibold text-emerald-800 underline" }, more ? "কম দেখুন" : "আরও দেখুন (" + toBn(slot.items.length - PREVIEW) + "টি)"),
    React.createElement(
      "div",
      { className: "mt-3 pt-2 border-t border-slate-100" },
      React.createElement("button", { type: "button", onClick: () => setAll((v) => !v), className: "text-xs font-semibold text-slate-500" }, all ? "পুরো দিনের তালিকা লুকান ▲" : "পুরো দিনের তালিকা দেখুন ▼"),
      all && React.createElement(
        "div",
        { className: "mt-2 space-y-3" },
        slots.map((s) =>
          React.createElement(
            "div",
            { key: s.id, className: "rounded-xl px-3 py-2 " + (inSlot(hour, s) ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50") },
            React.createElement("p", { className: "text-xs font-bold text-emerald-900 mb-1.5" }, s.icon + " " + s.title + " · " + rangeLabel(s, toBn)),
            React.createElement(Bullets, { items: s.items })
          )
        )
      ),
      React.createElement("p", { className: "mt-2 text-[11px] text-slate-400" }, "সূত্র সহিহ হাদিসগ্রন্থ থেকে; আমলের মাসআলায় প্রশ্ন থাকলে আলেমের পরামর্শ নিন।")
    )
  );
}
