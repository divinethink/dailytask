// হোম কাস্টমাইজ পেজ(ধাপ ক): প্রতিটা কার্ডের ওপরে/নিচে, স্থির/খোলা/বন্ধ, দেখান/লুকান।
// খসড়া লোকাল state-এ থাকে; "সেভ করুন" চাপলে তবেই member-ডকে লেখা হয়। Reset-ও শুধু খসড়ায়।
import { ZONES, ZONE_LABEL, FOLDS, FOLD_LABEL, cardTitle, defaultLayout, moveCard, updateCard, sameLayout, sanitizeLayout } from "../legacy/homeLayout.js";

function Switch({ checked, label, onChange }) {
  return React.createElement(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": checked,
      "aria-label": label,
      onClick: () => onChange(!checked),
      className: "flex h-11 w-12 shrink-0 items-center justify-center"
    },
    React.createElement(
      "span",
      { "aria-hidden": true, className: "relative inline-block h-6 w-10 rounded-full transition-colors " + (checked ? "bg-emerald-800" : "bg-slate-300") },
      React.createElement("span", {
        className: "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " + (checked ? "left-[18px]" : "left-0.5")
      })
    )
  );
}

export function HomeLayoutScreen({ member, onSave, onClose }) {
  const initial = React.useRef(sanitizeLayout(member && member.homeLayout));
  const [draft, setDraft] = React.useState(initial.current);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const dirty = !sameLayout(draft, initial.current);

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
  const setZone = (zone, next) => setDraft({ ...draft, [zone]: next });

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 flex flex-col bg-[#F4F7F1]" },
    React.createElement(
      "div",
      { style: { background: "var(--theme-primary)" }, className: "px-5 pt-6 pb-4 shadow-md flex items-center gap-3" },
      React.createElement("button", { type: "button", onClick: back, "aria-label": "ফিরে যান", className: "text-white text-xl px-1" }, "←"),
      React.createElement("h1", { className: "text-lg font-bold text-white" }, "হোম কাস্টমাইজ")
    ),
    React.createElement(
      "div",
      { className: "flex-1 overflow-y-auto px-5 py-4 space-y-5" },
      React.createElement("p", { className: "text-xs text-slate-500" }, "স্থির = সবসময় খোলা। খোলা/বন্ধ = ভাঁজ করা যাবে, শুরুতে খোলা/বন্ধ থাকবে। এই সেটিং শুধু " + ((member && member.name) || "এই সদস্যের") + " হোমে প্রযোজ্য।"),
      ZONES.map(zone =>
        React.createElement(
          "section",
          { key: zone },
          React.createElement("p", { className: "mb-2 text-xs font-bold text-slate-600" }, ZONE_LABEL[zone]),
          React.createElement(
            "ul",
            { className: "space-y-2" },
            draft[zone].map((c, i) =>
              React.createElement(
                "li",
                { key: c.id, className: "flex items-center gap-1 rounded-2xl border border-[#E4D3A8] bg-white py-2 pl-1.5 pr-1 " + (c.visible ? "" : "opacity-60") },
                React.createElement(
                  "div",
                  { className: "flex shrink-0 flex-col" },
                  React.createElement("button", {
                    type: "button",
                    "aria-label": cardTitle(zone, c.id) + " ওপরে সরান",
                    disabled: i === 0,
                    onClick: () => setZone(zone, moveCard(draft[zone], c.id, -1)),
                    className: "flex h-9 w-9 items-center justify-center text-emerald-800 disabled:text-slate-300"
                  }, "▲"),
                  React.createElement("button", {
                    type: "button",
                    "aria-label": cardTitle(zone, c.id) + " নিচে সরান",
                    disabled: i === draft[zone].length - 1,
                    onClick: () => setZone(zone, moveCard(draft[zone], c.id, 1)),
                    className: "flex h-9 w-9 items-center justify-center text-emerald-800 disabled:text-slate-300"
                  }, "▼")
                ),
                React.createElement(
                  "div",
                  { className: "min-w-0 flex-1 pl-1" },
                  React.createElement("p", { className: "truncate text-sm font-bold text-slate-800" }, cardTitle(zone, c.id)),
                  React.createElement(
                    "select",
                    {
                      "aria-label": cardTitle(zone, c.id) + " ভাঁজের ধরন",
                      value: c.fold,
                      disabled: !c.visible,
                      onChange: e => setZone(zone, updateCard(draft[zone], c.id, { fold: e.target.value })),
                      className: "mt-1 min-h-9 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-emerald-900 disabled:opacity-60"
                    },
                    FOLDS.map(f => React.createElement("option", { key: f, value: f }, FOLD_LABEL[f]))
                  )
                ),
                React.createElement(Switch, {
                  checked: c.visible,
                  label: cardTitle(zone, c.id) + " দেখান",
                  onChange: v => setZone(zone, updateCard(draft[zone], c.id, { visible: v }))
                })
              )
            )
          )
        )
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setDraft(defaultLayout()),
          className: "w-full min-h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-900"
        },
        "সব ডিফল্টে ফিরিয়ে নিন"
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
