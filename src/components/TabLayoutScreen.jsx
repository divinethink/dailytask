// নেভ-ট্যাব কাস্টমাইজ পেজ(সময়সূচি/আমল/সহায়িকা, owner-approved): কার্ড ওপরে/নিচে সরানো + দেখান/লুকান + "ডিফল্টে ফিরুন"।
// খসড়া লোকাল state-এ; "সেভ করুন" চাপলে তবেই member-ডকে লেখা হয়। অন্তত একটা কার্ড সবসময় দেখানো থাকবে।
import { TAB_DEFS, resolveTab, defaultOrder, moveId, tabCardTitle } from "../legacy/tabLayout.js";

export function TabLayoutScreen({ tab, member, onSave, onClose }) {
  const meta = TAB_DEFS[tab];
  const initial = React.useRef(resolveTab(tab, member && member.tabLayout, member && member.prayerLayout));
  const [draft, setDraft] = React.useState(initial.current);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial.current);
  const visibleCount = draft.order.filter(id => !draft.hidden.includes(id)).length;

  function back() {
    if (dirty && !window.confirm("সেভ না করা পরিবর্তন বাদ দিতে চান?")) return;
    onClose();
  }
  async function save() {
    if (busy || !dirty) return;
    setBusy(true);
    setError(false);
    try {
      await onSave(draft);
      onClose();
    } catch (e) {
      console.error("tabLayout save failed", e);
      setError(e && e.code ? String(e.code) : true);
    } finally {
      setBusy(false);
    }
  }
  function toggle(id) {
    const isHidden = draft.hidden.includes(id);
    if (!isHidden && visibleCount <= 1) return;
    setDraft({ ...draft, hidden: isHidden ? draft.hidden.filter(x => x !== id) : [...draft.hidden, id] });
  }

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 flex flex-col bg-[#F4F7F1]" },
    React.createElement(
      "div",
      { style: { background: "var(--theme-primary)" }, className: "px-5 pt-6 pb-4 shadow-md flex items-center gap-3" },
      React.createElement("button", { type: "button", onClick: back, "aria-label": "ফিরে যান", className: "text-white text-xl px-1" }, "←"),
      React.createElement("h1", { className: "text-lg font-bold text-white" }, meta.title + " কাস্টমাইজ")
    ),
    React.createElement(
      "div",
      { className: "flex-1 overflow-y-auto px-5 py-4 space-y-4" },
      React.createElement("p", { className: "text-xs text-slate-500" }, "কার্ড ওপরে/নিচে সরান, অথবা চোখ-বোতামে লুকান/দেখান। অন্তত একটা কার্ড দেখানো থাকতেই হবে।"),
      React.createElement(
        "ul",
        { className: "space-y-2" },
        draft.order.map((id, i) => {
          const hid = draft.hidden.includes(id);
          const title = tabCardTitle(tab, id);
          return React.createElement(
            "li",
            { key: id, className: "flex items-center gap-1 rounded-2xl border border-[#E4D3A8] bg-white py-2 pl-1.5 pr-2" + (hid ? " opacity-60" : "") },
            React.createElement(
              "div",
              { className: "flex shrink-0 flex-col" },
              React.createElement("button", {
                type: "button",
                "aria-label": title + " ওপরে সরান",
                disabled: i === 0,
                onClick: () => setDraft({ ...draft, order: moveId(draft.order, id, -1) }),
                className: "flex h-9 w-9 items-center justify-center text-emerald-800 disabled:text-slate-300"
              }, "▲"),
              React.createElement("button", {
                type: "button",
                "aria-label": title + " নিচে সরান",
                disabled: i === draft.order.length - 1,
                onClick: () => setDraft({ ...draft, order: moveId(draft.order, id, 1) }),
                className: "flex h-9 w-9 items-center justify-center text-emerald-800 disabled:text-slate-300"
              }, "▼")
            ),
            React.createElement("p", { className: "min-w-0 flex-1 truncate pl-1 text-sm font-bold text-slate-800" }, title),
            React.createElement("button", {
              type: "button",
              "aria-label": title + (hid ? " দেখান" : " লুকান"),
              "aria-pressed": !hid,
              disabled: !hid && visibleCount <= 1,
              onClick: () => toggle(id),
              className: "shrink-0 min-h-11 rounded-xl px-3 text-xs font-bold disabled:opacity-40 " + (hid ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-900 border border-emerald-100")
            }, hid ? "লুকানো" : "দেখানো")
          );
        })
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setDraft({ order: defaultOrder(tab), hidden: [] }),
          className: "w-full min-h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-900"
        },
        "ডিফল্টে ফিরিয়ে নিন"
      )
    ),
    React.createElement(
      "div",
      { className: "px-5 py-3 bg-white border-t border-slate-200" },
      error && React.createElement("p", { role: "alert", className: "mb-2 text-center text-sm text-red-700" }, "সেভ হয়নি। আবার চেষ্টা করুন।" + (typeof error === "string" ? " (" + error + ")" : "") + (error === "permission-denied" ? " — Firestore Rules deploy করা আছে কিনা দেখুন।" : "")),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: save,
          disabled: busy || !dirty,
          className: "w-full h-12 rounded-2xl font-bold text-white shadow-md disabled:opacity-50",
          style: { background: "var(--theme-primary)" }
        },
        busy ? "সেভ হচ্ছে…" : "সেভ করুন"
      )
    )
  );
}
