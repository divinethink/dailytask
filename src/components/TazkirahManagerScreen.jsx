// তাযকিরাহ ম্যানেজ পেজ(ধাপ খ, শুধু Admin): নিজের বাণী যোগ/এডিট/ডিলিট; বিল্ট-ইন বাণী শুধু লুকান/ফিরিয়ে আনুন।
// খসড়া লোকাল state-এ; "সেভ করুন" চাপলে তবেই সেভ হয়। পুরো পরিবারের জন্য প্রযোজ্য।
import {
  TYPES, TYPE_LABEL, MAX_TEXT, MAX_REF, MAX_ITEMS,
  sanitizeTazkirah, newItemId, sameData, isHidden, setBuiltinHidden, builtinId
} from "../legacy/tazkirah.js";

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-800";

export function TazkirahManagerScreen({ builtins, data, onSave, onClose }) {
  const initial = React.useRef(sanitizeTazkirah(data));
  const [draft, setDraft] = React.useState(initial.current);
  const [form, setForm] = React.useState({ type: "quote", text: "", ref: "" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const dirty = !sameData(draft, initial.current);

  function back() {
    if (dirty && !window.confirm("সেভ না করা পরিবর্তন বাদ দিতে চান?")) return;
    onClose();
  }
  async function save() {
    if (busy || !dirty) return;
    setBusy(true);
    setError(false);
    try {
      await onSave(sanitizeTazkirah(draft));
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  function addItem() {
    const text = form.text.trim();
    if (!text || draft.items.length >= MAX_ITEMS) return;
    setDraft({ ...draft, items: [...draft.items, { id: newItemId(), type: form.type, text, ref: form.ref.trim() }] });
    setForm({ type: form.type, text: "", ref: "" });
  }
  function editItem(id, patch) {
    setDraft({ ...draft, items: draft.items.map(x => (x.id === id ? { ...x, ...patch } : x)) });
  }
  function removeItem(id) {
    if (!window.confirm("এই বাণীটি মুছে ফেলবেন?")) return;
    setDraft({ ...draft, items: draft.items.filter(x => x.id !== id) });
  }

  const typeSelect = (value, onChange, label) =>
    React.createElement(
      "select",
      { value, onChange: e => onChange(e.target.value), "aria-label": label, className: "h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium" },
      TYPES.map(t => React.createElement("option", { key: t, value: t }, TYPE_LABEL[t]))
    );

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 flex flex-col bg-[#F4F7F1]" },
    React.createElement(
      "div",
      { style: { background: "var(--theme-primary)" }, className: "px-5 pt-6 pb-4 shadow-md flex items-center gap-3" },
      React.createElement("button", { type: "button", onClick: back, "aria-label": "ফিরে যান", className: "text-white text-xl px-1" }, "←"),
      React.createElement("h1", { className: "text-lg font-bold text-white" }, "তাযকিরাহ ম্যানেজ")
    ),
    React.createElement(
      "div",
      { className: "flex-1 overflow-y-auto px-5 py-4 space-y-5" },
      React.createElement("p", { className: "text-xs text-slate-500" }, "পুরো পরিবারের জন্য প্রযোজ্য। আপনার যোগ করা বাণী বিল্ট-ইন বাণীর সাথে মিশে ঘুরে ঘুরে আসবে। বিল্ট-ইন বাণী মোছা যায় না, শুধু লুকানো যায়।"),
      // নতুন বাণী
      React.createElement(
        "section",
        { className: "rounded-2xl border border-[#E4D3A8] bg-white p-3 space-y-2" },
        React.createElement("p", { className: "text-sm font-bold text-emerald-950" }, "নতুন বাণী যোগ করুন"),
        React.createElement(
          "div",
          { className: "flex gap-2" },
          typeSelect(form.type, v => setForm({ ...form, type: v }), "ধরন"),
          React.createElement("input", {
            type: "text", value: form.ref, maxLength: MAX_REF, placeholder: "সূত্র (যেমন: সূরা বাকারাহ: ১৫৩)",
            onChange: e => setForm({ ...form, ref: e.target.value }), "aria-label": "সূত্র", className: "min-w-0 flex-1 h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-800"
          })
        ),
        React.createElement("textarea", {
          value: form.text, maxLength: MAX_TEXT, rows: 3, placeholder: "বাণী লিখুন",
          onChange: e => setForm({ ...form, text: e.target.value }), "aria-label": "বাণী", className: inputCls
        }),
        React.createElement(
          "button",
          {
            type: "button", onClick: addItem, disabled: !form.text.trim() || draft.items.length >= MAX_ITEMS,
            className: "h-10 px-4 rounded-xl text-xs font-bold bg-emerald-800 text-white disabled:opacity-40"
          },
          "যোগ করুন"
        )
      ),
      // নিজের বাণী
      React.createElement(
        "section",
        { className: "rounded-2xl border border-[#E4D3A8] bg-white p-3" },
        React.createElement("p", { className: "mb-2 text-sm font-bold text-emerald-950" }, "আমাদের বাণী (" + draft.items.length + ")"),
        draft.items.length === 0 && React.createElement("p", { className: "text-xs text-slate-400" }, "এখনো কোনো বাণী যোগ হয়নি"),
        React.createElement(
          "ul",
          { className: "space-y-3" },
          draft.items.map(it =>
            React.createElement(
              "li",
              { key: it.id, className: "space-y-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0" },
              React.createElement(
                "div",
                { className: "flex gap-2" },
                typeSelect(it.type, v => editItem(it.id, { type: v }), "ধরন"),
                React.createElement("input", {
                  type: "text", value: it.ref, maxLength: MAX_REF, placeholder: "সূত্র",
                  onChange: e => editItem(it.id, { ref: e.target.value }), "aria-label": "সূত্র", className: "min-w-0 flex-1 h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-800"
                }),
                React.createElement(
                  "button",
                  { type: "button", onClick: () => removeItem(it.id), className: "shrink-0 h-10 px-3 rounded-xl text-xs font-bold border bg-slate-50 text-red-700 border-slate-200" },
                  "মুছুন"
                )
              ),
              React.createElement("textarea", {
                value: it.text, maxLength: MAX_TEXT, rows: 3,
                onChange: e => editItem(it.id, { text: e.target.value }), "aria-label": "বাণী", className: inputCls
              }),
              !it.text.trim() && React.createElement("p", { className: "text-[11px] text-red-700" }, "খালি বাণী সেভের সময় বাদ যাবে")
            )
          )
        )
      ),
      // বিল্ট-ইন
      React.createElement(
        "section",
        { className: "rounded-2xl border border-[#E4D3A8] bg-white p-3" },
        React.createElement("p", { className: "mb-2 text-sm font-bold text-emerald-950" }, "বিল্ট-ইন বাণী (" + builtins.length + ")"),
        React.createElement(
          "ul",
          { className: "space-y-2" },
          builtins.map(b => {
            const hidden = isHidden(draft, b);
            return React.createElement(
              "li",
              { key: builtinId(b), className: "flex items-start gap-2" + (hidden ? " opacity-60" : "") },
              React.createElement(
                "div",
                { className: "min-w-0 flex-1" },
                React.createElement("p", { className: "text-[10px] font-bold text-amber-700" }, TYPE_LABEL[b.type] + " · " + b.ref),
                React.createElement("p", { className: "text-xs text-slate-700 line-clamp-2" }, b.text)
              ),
              React.createElement(
                "button",
                {
                  type: "button", onClick: () => setDraft(setBuiltinHidden(draft, b, !hidden)),
                  className: "shrink-0 h-10 px-3 rounded-xl text-xs font-bold border " + (hidden ? "bg-emerald-800 text-white border-emerald-800" : "bg-slate-50 text-slate-700 border-slate-200")
                },
                hidden ? "ফিরিয়ে আনুন" : "লুকান"
              )
            );
          })
        )
      )
    ),
    React.createElement(
      "div",
      { className: "px-5 py-3 bg-white border-t border-slate-200" },
      error && React.createElement("p", { role: "alert", className: "mb-2 text-center text-sm text-red-700" }, "সেভ হয়নি। আবার চেষ্টা করুন।"),
      React.createElement(
        "button",
        {
          type: "button", onClick: save, disabled: busy || !dirty,
          className: "w-full h-12 rounded-2xl font-bold text-white shadow-md disabled:opacity-50",
          style: { background: "var(--theme-primary)" }
        },
        busy ? "সেভ হচ্ছে…" : "সেভ করুন"
      )
    )
  );
}
