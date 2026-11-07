// "এ সময়ে নবিজি ﷺ যা করতেন" কার্ডের সম্পাদনা-প্যানেল — শুধু App Creator-এর জন্য(কার্ড নিজেই isCreatorAuth() দেখে দেখায়; লেখার অনুমতি Firestore Rules-এ enforced)।
// সময়ভাগ যোগ/সম্পাদনা/মোছা, প্রতিটিতে বুলেট(লেখা + সূত্র) যোগ/বদল/মোছা, আর "মূল তালিকায় ফেরান"।
// প্রতিটা বদল সাথে সাথে সেভ(পুরো তালিকা একসাথে লেখা, তাই retry/double-tap-এ duplicate হয় না)। ব্যর্থ হলে আগের অবস্থা অক্ষত।
// সূত্রহীন বুলেট সেভ হয় না(validateSlot)। React global(window.React, globals.js)।
import { saveNabijiTimeline } from "../legacy/editableContent.js";
import { NABIJI_SECTION_ID, MAX_SLOTS, MAX_ITEMS, LIMITS, DEFAULT_SLOTS, validateSlot, normalizeSlot, makeSlotId, hourLabel, rangeLabel } from "./nabijiTimeline.js";

const { useState } = React;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const INPUT = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-800";
const btn = "px-3 py-2 rounded-xl text-sm font-semibold";
const EMPTY = { id: "", icon: "🕌", title: "", from: 12, to: 13, items: [{ text: "", src: "" }] };

const bn = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

function Field({ label, children }) {
  return React.createElement("label", { className: "block mb-2" }, React.createElement("span", { className: "block text-xs font-semibold text-slate-600 mb-1" }, label), children);
}

export function NabijiTimelineEditor({ slots, onSaved, onClose }) {
  const [form, setForm] = useState(null); // null = তালিকা, নইলে সময়ভাগের ফর্ম
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function persist(next) {
    setBusy(true);
    setError("");
    try {
      await saveNabijiTimeline(NABIJI_SECTION_ID, next);
      onSaved(next.length ? next : DEFAULT_SLOTS);
      return true;
    } catch (e) {
      setError("সেভ করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveForm() {
    const msg = validateSlot(form);
    if (msg) return setError(msg);
    const clean = normalizeSlot({ ...form, id: form.id || makeSlotId() });
    if (!clean) return setError("তথ্য ঠিক নেই। আবার দেখুন।");
    const exists = slots.some((s) => s.id === clean.id);
    if (!exists && slots.length >= MAX_SLOTS) return setError("সর্বোচ্চ " + MAX_SLOTS + "টি সময়ভাগ রাখা যায়।");
    const next = exists ? slots.map((s) => (s.id === clean.id ? clean : s)) : [...slots, clean];
    next.sort((a, b) => a.from - b.from);
    if (await persist(next)) setForm(null);
  }

  async function remove(s) {
    if (slots.length <= 1) return setError("অন্তত একটি সময়ভাগ রাখতে হবে। সব মুছতে চাইলে \"মূল তালিকায় ফেরান\" চাপুন।");
    if (!window.confirm("\"" + s.title + "\" সময়ভাগটি মুছবেন?")) return;
    await persist(slots.filter((x) => x.id !== s.id));
  }

  async function resetAll() {
    if (!window.confirm("আপনার সব বদল মুছে অ্যাপের মূল তালিকায় ফিরবেন?")) return;
    await persist([]);
  }

  const setF = (k) => (e) => setForm({ ...form, [k]: ["from", "to"].includes(k) ? Number(e.target.value) : e.target.value });
  const setFrom = (e) => {
    const from = Number(e.target.value);
    setForm({ ...form, from, to: form.to > from && form.to - from <= 24 ? form.to : from + 1 });
  };
  const setItem = (i, k) => (e) => setForm({ ...form, items: form.items.map((it, j) => (j === i ? { ...it, [k]: e.target.value } : it)) });
  const delItem = (i) => setForm({ ...form, items: form.items.filter((_, j) => j !== i) });
  const addItem = () => form.items.length < MAX_ITEMS && setForm({ ...form, items: [...form.items, { text: "", src: "" }] });

  let body;
  if (form) {
    const toOpts = [];
    for (let v = form.from + 1; v <= form.from + 24; v++) toOpts.push(v);
    body = React.createElement(
      "div",
      null,
      React.createElement("p", { className: "text-sm font-bold text-emerald-950 mb-2" }, form.id ? "সময়ভাগ সম্পাদনা" : "নতুন সময়ভাগ"),
      React.createElement(Field, { label: "আইকন (ইমোজি)" }, React.createElement("input", { className: INPUT, value: form.icon, maxLength: LIMITS.icon, onChange: setF("icon") })),
      React.createElement(Field, { label: "নাম (যেমন: ফজর)" }, React.createElement("input", { className: INPUT, value: form.title, maxLength: LIMITS.title, onChange: setF("title") })),
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-2" },
        React.createElement(
          Field,
          { label: "শুরু" },
          React.createElement("select", { className: INPUT, value: form.from, onChange: setFrom }, Array.from({ length: 24 }, (_, h) => React.createElement("option", { key: h, value: h }, hourLabel(h, bn))))
        ),
        React.createElement(
          Field,
          { label: "শেষ (এর আগ পর্যন্ত)" },
          React.createElement("select", { className: INPUT, value: form.to, onChange: setF("to") }, toOpts.map((v) => React.createElement("option", { key: v, value: v }, hourLabel(v, bn) + (v >= 24 ? " (পরদিন)" : ""))))
        )
      ),
      React.createElement("p", { className: "text-xs font-bold text-emerald-900 mt-1 mb-1.5" }, "বুলেট (২-৩টি রাখা ভালো; প্রতিটির সূত্র বাধ্যতামূলক)"),
      form.items.map((it, i) =>
        React.createElement(
          "div",
          { key: i, className: "rounded-xl border border-slate-200 bg-white p-2 mb-2" },
          React.createElement("textarea", { className: INPUT, rows: 3, placeholder: "নবিজি ﷺ যা করতেন", value: it.text, maxLength: LIMITS.text, onChange: setItem(i, "text") }),
          React.createElement("input", { className: INPUT + " mt-1", placeholder: "সূত্র, যেমন: সহিহ বুখারি ১১৪৫", value: it.src, maxLength: LIMITS.src, onChange: setItem(i, "src") }),
          React.createElement("div", { className: "flex justify-end mt-1" }, React.createElement("button", { type: "button", className: "text-xs font-semibold text-red-600 px-2 py-1", onClick: () => delItem(i) }, "এই বুলেট মুছুন"))
        )
      ),
      form.items.length < MAX_ITEMS && React.createElement("button", { type: "button", className: btn + " w-full border border-slate-300 text-slate-700 mb-2", onClick: addItem }, "+ বুলেট যোগ করুন"),
      React.createElement(
        "div",
        { className: "flex gap-2 justify-end mt-2" },
        React.createElement("button", { type: "button", className: btn + " border border-slate-200 text-slate-600", disabled: busy, onClick: () => { setForm(null); setError(""); } }, "বাতিল"),
        React.createElement("button", { type: "button", className: btn + " text-white disabled:opacity-60", style: { background: PRIMARY }, disabled: busy, onClick: saveForm }, busy ? "সেভ হচ্ছে..." : "সেভ করুন")
      )
    );
  } else {
    body = React.createElement(
      "div",
      null,
      React.createElement(
        "ul",
        { className: "space-y-2 mb-3" },
        slots.map((s) =>
          React.createElement(
            "li",
            { key: s.id, className: "rounded-xl border border-slate-200 bg-white px-3 py-2" },
            React.createElement("p", { className: "text-sm font-semibold text-slate-800" }, s.icon + " " + s.title),
            React.createElement("p", { className: "text-xs text-slate-500" }, rangeLabel(s, bn) + " · " + bn(s.items.length) + "টি বুলেট"),
            React.createElement(
              "div",
              { className: "flex gap-2 justify-end mt-1.5" },
              React.createElement("button", { type: "button", className: btn + " border border-slate-200 text-slate-700", disabled: busy, onClick: () => { setError(""); setForm({ ...EMPTY, ...s, items: s.items.map((it) => ({ ...it })) }); } }, "সম্পাদনা"),
              React.createElement("button", { type: "button", className: btn + " border border-red-200 text-red-600", disabled: busy, onClick: () => remove(s) }, "মুছুন")
            )
          )
        )
      ),
      React.createElement("button", { type: "button", className: btn + " w-full text-white", style: { background: PRIMARY }, disabled: busy, onClick: () => { setError(""); setForm({ ...EMPTY, items: [{ text: "", src: "" }] }); } }, "+ নতুন সময়ভাগ যোগ করুন"),
      React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200 flex justify-end" }, React.createElement("button", { type: "button", className: btn + " border border-amber-300 text-amber-700 disabled:opacity-60", disabled: busy, onClick: resetAll }, "মূল তালিকায় ফেরান"))
    );
  }

  return React.createElement(
    "div",
    { className: "mb-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-3" },
    React.createElement(
      "div",
      { className: "flex items-center justify-between mb-2" },
      React.createElement("p", { className: "text-xs font-bold text-emerald-900" }, "✏️ সম্পাদনা (শুধু ক্রিয়েটর-অ্যাডমিন)"),
      React.createElement("button", { type: "button", className: "text-xs font-semibold text-slate-500 px-2 py-1", onClick: onClose }, "বন্ধ করুন")
    ),
    error && React.createElement("p", { role: "alert", className: "text-sm text-red-600 mb-2" }, error),
    body
  );
}
