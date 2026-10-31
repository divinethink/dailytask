// সময়সূচি কাস্টমাইজ পেজ(owner-approved): কার্ড ওপরে/নিচে সরানো + "ডিফল্টে ফিরুন"।
// খসড়া লোকাল state-এ; "সেভ করুন" চাপলে তবেই member-ডকে লেখা হয়। Reset শুধু খসড়ায়।
import { defaultPrayerOrder, sanitizePrayerOrder, prayerCardTitle, movePrayerId } from "../legacy/homeLayout.js";

export function PrayerLayoutScreen({ member, onSave, onClose }) {
  const initial = React.useRef(sanitizePrayerOrder(member && member.prayerLayout));
  const [draft, setDraft] = React.useState(initial.current);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial.current);

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
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 flex flex-col bg-[#F4F7F1]" },
    React.createElement(
      "div",
      { style: { background: "var(--theme-primary)" }, className: "px-5 pt-6 pb-4 shadow-md flex items-center gap-3" },
      React.createElement("button", { type: "button", onClick: back, "aria-label": "ফিরে যান", className: "text-white text-xl px-1" }, "←"),
      React.createElement("h1", { className: "text-lg font-bold text-white" }, "সময়সূচি কাস্টমাইজ")
    ),
    React.createElement(
      "div",
      { className: "flex-1 overflow-y-auto px-5 py-4 space-y-4" },
      React.createElement("p", { className: "text-xs text-slate-500" }, "কার্ড ওপরে/নিচে সরান। তারিখ, লোকেশন ও কাউন্টডাউন সবসময় ওপরে থাকবে। এই সেটিং শুধু আপনার নিজের সময়সূচি পেজে প্রযোজ্য।"),
      React.createElement(
        "ul",
        { className: "space-y-2" },
        draft.map((id, i) =>
          React.createElement(
            "li",
            { key: id, className: "flex items-center gap-1 rounded-2xl border border-[#E4D3A8] bg-white py-2 pl-1.5 pr-3" },
            React.createElement(
              "div",
              { className: "flex shrink-0 flex-col" },
              React.createElement("button", {
                type: "button",
                "aria-label": prayerCardTitle(id) + " ওপরে সরান",
                disabled: i === 0,
                onClick: () => setDraft(movePrayerId(draft, id, -1)),
                className: "flex h-9 w-9 items-center justify-center text-emerald-800 disabled:text-slate-300"
              }, "▲"),
              React.createElement("button", {
                type: "button",
                "aria-label": prayerCardTitle(id) + " নিচে সরান",
                disabled: i === draft.length - 1,
                onClick: () => setDraft(movePrayerId(draft, id, 1)),
                className: "flex h-9 w-9 items-center justify-center text-emerald-800 disabled:text-slate-300"
              }, "▼")
            ),
            React.createElement("p", { className: "min-w-0 flex-1 truncate pl-1 text-sm font-bold text-slate-800" }, prayerCardTitle(id))
          )
        )
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setDraft(defaultPrayerOrder()),
          className: "w-full min-h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-900"
        },
        "ডিফল্টে ফিরিয়ে নিন"
      )
    ),
    React.createElement(
      "div",
      { className: "px-5 py-3 bg-white border-t border-slate-200" },
      error && React.createElement("p", { role: "alert", className: "mb-2 text-center text-sm text-red-700" }, "সেভ হয়নি। আবার চেষ্টা করুন।"),
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
