// লেবেল ম্যানেজ পেজ(ধাপ গ, শুধু Admin): নাম বদল, লুকান/ফিরিয়ে আনুন(archive), ক্যাটেগরিতে নতুন লেবেল।
// "লুকানো" মানে ডিলিট নয় — পুরনো এন্ট্রির ডেটা অক্ষত থাকে। খসড়া লোকাল state-এ; "সেভ করুন" চাপলে তবেই সেভ হয়।
import { DEEN_CATEGORY_GROUPS } from "../legacy/appHelpers.js";
import { sanitizeOverrides, setLabel, setHidden, sameOverrides, MAX_LABEL_LENGTH } from "../legacy/fieldOverrides.js";

const GROUP_TITLES = {
  salah: "সালাত ও সিয়াম",
  quranIlm: "কুরআন ও ইলম",
  dhikrDawah: "যিকির ও দাওয়াহ",
  duniya: "ব্যক্তিগত ও পারিবারিক অভ্যাস",
  other: "অন্যান্য"
};

export function FieldManagerScreen({ deenFields, duniyaFields, customFields, overrides, onSave, onClose }) {
  const initial = React.useRef({ ov: sanitizeOverrides(overrides), cf: customFields });
  const [ov, setOv] = React.useState(initial.current.ov);
  const [cf, setCf] = React.useState(initial.current.cf);
  const [newLabels, setNewLabels] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const dirty = !sameOverrides(ov, initial.current.ov) || JSON.stringify(cf) !== JSON.stringify(initial.current.cf);

  // ক্যাটেগরি → মূল ফিল্ড-তালিকা(লুকানোগুলোসহ, কারণ ফিরিয়ে আনতে দেখাতে হবে)
  const groups = [
    ...DEEN_CATEGORY_GROUPS.map(g => ({ id: g.id, title: GROUP_TITLES[g.id] || g.label, base: deenFields.filter(f => g.keys.includes(f.key)) })),
    { id: "duniya", title: GROUP_TITLES.duniya, base: duniyaFields },
    { id: "other", title: GROUP_TITLES.other, base: [] }
  ].map(g => ({
    ...g,
    fields: [...g.base, ...cf.filter(f => (f.category || "other") === g.id)]
  }));

  function back() {
    if (dirty && !window.confirm("সেভ না করা পরিবর্তন বাদ দিতে চান?")) return;
    onClose();
  }
  async function save() {
    if (busy || !dirty) return;
    if (cf.some(x => !String(x.label || "").trim())) {
      setError(true);
      return;
    }
    setBusy(true);
    setError(false);
    try {
      await onSave(ov, cf);
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  function addField(groupId) {
    const label = (newLabels[groupId] || "").trim().slice(0, MAX_LABEL_LENGTH);
    if (!label) return;
    const field = { key: "custom_" + Date.now(), label, shortLabel: label, type: "bool", isCustom: true };
    if (groupId !== "other") field.category = groupId;
    setCf([...cf, field]);
    setNewLabels({ ...newLabels, [groupId]: "" });
  }

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 flex flex-col bg-[#F4F7F1]" },
    React.createElement(
      "div",
      { style: { background: "var(--theme-primary)" }, className: "px-5 pt-6 pb-4 shadow-md flex items-center gap-3" },
      React.createElement("button", { type: "button", onClick: back, "aria-label": "ফিরে যান", className: "text-white text-xl px-1" }, "←"),
      React.createElement("h1", { className: "text-lg font-bold text-white" }, "লেবেল ম্যানেজ")
    ),
    React.createElement(
      "div",
      { className: "flex-1 overflow-y-auto px-5 py-4 space-y-5" },
      React.createElement("p", { className: "text-xs text-slate-500" }, "পুরো পরিবারের জন্য প্রযোজ্য। নাম বদলালে পুরনো এন্ট্রি ও রিপোর্টেও নতুন নাম দেখাবে। লুকালে ডেটা মোছে না, শুধু ফর্ম ও হিসাব থেকে বাদ যায়; যেকোনো সময় ফিরিয়ে আনা যায়।"),
      groups.map(g =>
        React.createElement(
          "section",
          { key: g.id, className: "rounded-2xl border border-[#E4D3A8] bg-white p-3" },
          React.createElement("p", { className: "mb-2 text-sm font-bold text-emerald-950" }, g.title),
          React.createElement(
            "ul",
            { className: "space-y-2" },
            g.fields.length === 0 && React.createElement("li", { className: "text-xs text-slate-400" }, "কোনো লেবেল নেই"),
            g.fields.map(f => {
              const o = ov[f.key] || {};
              const hidden = !!o.hidden;
              return React.createElement(
                "li",
                { key: f.key, className: "flex items-center gap-2" + (hidden ? " opacity-60" : "") },
                React.createElement("input", {
                  type: "text",
                  value: o.label !== undefined ? o.label : f.label,
                  maxLength: MAX_LABEL_LENGTH,
                  disabled: hidden,
                  onChange: e => {
                    // কাস্টম লেবেল সরাসরি তার নিজের label-এ বদলায়; ডিফল্ট লেবেল override-এ
                    if (f.isCustom) setCf(cf.map(x => (x.key === f.key ? { ...x, label: e.target.value, shortLabel: e.target.value } : x)));
                    else setOv(setLabel(ov, f.key, e.target.value, f.label));
                  },
                  onBlur: e => {
                    if (f.isCustom && !e.target.value.trim()) setCf(cf.map(x => (x.key === f.key ? { ...x, label: f.label, shortLabel: f.label } : x)));
                  },
                  "aria-label": f.label + " নাম",
                  className: "min-w-0 flex-1 h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium outline-none focus:border-emerald-800 disabled:bg-slate-50"
                }),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => setOv(setHidden(ov, f.key, !hidden)),
                    className: "shrink-0 h-10 px-3 rounded-xl text-xs font-bold border " + (hidden ? "bg-emerald-800 text-white border-emerald-800" : "bg-slate-50 text-slate-700 border-slate-200")
                  },
                  hidden ? "ফিরিয়ে আনুন" : "লুকান"
                )
              );
            })
          ),
          React.createElement(
            "div",
            { className: "mt-3 flex items-center gap-2 border-t border-slate-100 pt-3" },
            React.createElement("input", {
              type: "text",
              value: newLabels[g.id] || "",
              maxLength: MAX_LABEL_LENGTH,
              placeholder: "নতুন লেবেলের নাম",
              onChange: e => setNewLabels({ ...newLabels, [g.id]: e.target.value }),
              className: "min-w-0 flex-1 h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-800"
            }),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: () => addField(g.id),
                disabled: !(newLabels[g.id] || "").trim(),
                className: "shrink-0 h-10 px-3 rounded-xl text-xs font-bold bg-emerald-800 text-white disabled:opacity-40"
              },
              "যোগ করুন"
            )
          )
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
