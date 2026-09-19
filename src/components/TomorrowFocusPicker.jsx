// §Motivational Layer — Phase 2: "আগামীকালের Focus" — auto-suggested(আজকের
// সবচেয়ে দুর্বল field) কিন্তু সদস্য নিজে চাইলে বদলাতে পারবেন। ইচ্ছাকৃতভাবে
// DailyInsightCard.jsx থেকে আলাদা, স্বতন্ত্র component — নিজস্ব isolated
// write(saveTomorrowFocus, memberData.js) ব্যর্থ হলে dailyInsight card-কে
// প্রভাবিত করে না, এবং প্রয়োজনে এই component একাই disable/rollback করা যায়।
// createElement-style(existing codebase convention)।

const { useState } = React;

export function TomorrowFocusPicker({ member, allFields, tomorrowKey, suggestedFieldKey, onSave }) {
  const stored = member && member.tomorrowFocus;
  const isStale = !stored || stored.targetDateKey !== tomorrowKey;
  const activeFieldKey = isStale ? suggestedFieldKey : stored.fieldKey;
  const activeSource = isStale ? "auto" : stored.source;
  const activeField = allFields.find(f => f.key === activeFieldKey);

  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(activeFieldKey || (allFields[0] && allFields[0].key) || "");
  const [saving, setSaving] = useState(false);

  if (!activeField && !editing) return null;

  async function handleSave() {
    if (!choice) return;
    setSaving(true);
    try {
      await onSave({ fieldKey: choice, targetDateKey: tomorrowKey, source: "manual" });
      setEditing(false);
    } catch (err) {
      alert("Focus সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // §Bug fix(১৯ সেপ্টেম্বর ২০২৬, owner-রিপোর্টেড): কার্ড-wrapper আগে app.js-এ
  // আলাদা শর্তে(`suggestedFocusKey || selectedMember?.tomorrowFocus`) বসানো
  // ছিল, যা এই component-এর নিজস্ব `activeField` null-check-এর সাথে sync
  // ছিল না — stale `tomorrowFocus`(পুরনো targetDateKey) থাকলে বাইরের শর্ত
  // true থাকত অথচ এই component null রিটার্ন করত, ফলে খালি সাদা কার্ড(border+
  // shadow-সহ) দেখা যেত। Fix: card-wrapper এখন এই component-এর ভিতরেই, তাই
  // একই null-check card-সহ পুরোটাই covers করে — কোনো blank-card সম্ভব না।
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)] mt-4"
  },
    /*#__PURE__*/React.createElement("h3", { className: "font-bold text-sm text-slate-800 mb-2 text-center" }, "🎯 আগামীকালের Focus"),
    editing
      ? /*#__PURE__*/React.createElement("div", { className: "flex gap-2 items-center" },
          /*#__PURE__*/React.createElement("select", {
            className: "flex-1 border border-slate-300 rounded-lg text-sm p-1.5 bg-white",
            value: choice,
            onChange: (e) => setChoice(e.target.value)
          }, allFields.map(f => /*#__PURE__*/React.createElement("option", { key: f.key, value: f.key }, f.shortLabel || f.label))),
          /*#__PURE__*/React.createElement("button", {
            className: "text-xs font-bold bg-[#0E4B43] text-white rounded-lg px-3 py-1.5 disabled:opacity-50",
            disabled: saving,
            onClick: handleSave
          }, saving ? "..." : "ঠিক আছে")
        )
      : /*#__PURE__*/React.createElement("div", { className: "flex justify-between items-center" },
          /*#__PURE__*/React.createElement("span", { className: "text-sm text-emerald-950 font-bold" },
            activeField.shortLabel || activeField.label,
            activeSource === "auto" ? " (পরামর্শ)" : ""
          ),
          /*#__PURE__*/React.createElement("button", {
            className: "text-xs text-[#0E4B43] underline",
            onClick: () => { setChoice(activeFieldKey); setEditing(true); }
          }, "পরিবর্তন করুন")
        )
  );
}
