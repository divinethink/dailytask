// "আগামীকাল" কার্ডের সম্পাদনা-প্যানেল — শুধু App Creator-এর জন্য(কার্ড নিজেই isCreatorAuth() দেখে দেখায়; লেখার অনুমতি Firestore Rules-এ enforced)।
// নতুন বাক্য যোগ/সম্পাদনা/মোছা + "ঘুমের আগে"-র লেখা বদল। লজিক(কোন দিনে কী আসে) বদলায় না — শুধু বাড়তি বাক্য যোগ হয়।
// প্রতিটা বদল সাথে সাথে সেভ(পুরো তালিকা একসাথে লেখা, তাই retry/double-tap-এ duplicate হয় না)। ব্যর্থ হলে আগের অবস্থা অক্ষত।
// React global(window.React, globals.js)।
import { saveHomeCardExtras } from "../legacy/editableContent.js";
import { EXTRAS_SECTION_ID, MAX_ITEMS, LIMITS, validateItem, normalizeItem, makeItemId } from "./tomorrowExtras.js";
import { WEEKDAYS_BN } from "./tomorrowCalendarData.js";

const { useState } = React;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const INPUT = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-800";

const EMPTY = { id: "", w: -1, icon: "🌿", title: "", text: "", src: "" };

function weekdayLabel(w) {
  return w === -1 ? "প্রতিদিন" : WEEKDAYS_BN[w];
}

function Field({ label, children }) {
  return React.createElement("label", { className: "block mb-2" }, React.createElement("span", { className: "block text-xs font-semibold text-slate-600 mb-1" }, label), children);
}

export function TomorrowExtrasEditor({ extras, defaultSleep, tomorrowWeekday, onSaved, onClose }) {
  const [form, setForm] = useState(null); // null = তালিকা, নইলে যোগ/সম্পাদনার ফর্ম
  const [sleep, setSleep] = useState(extras.sleepText || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function persist(next) {
    setBusy(true);
    setError("");
    try {
      await saveHomeCardExtras(EXTRAS_SECTION_ID, next);
      onSaved(next);
      return true;
    } catch (e) {
      setError("সেভ করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveForm() {
    const msg = validateItem(form);
    if (msg) return setError(msg);
    const clean = normalizeItem({ ...form, id: form.id || makeItemId() });
    if (!form.id && extras.items.length >= MAX_ITEMS) return setError("সর্বোচ্চ " + MAX_ITEMS + "টি বাক্য রাখা যায়।");
    const items = form.id ? extras.items.map((it) => (it.id === form.id ? clean : it)) : [...extras.items, clean];
    if (await persist({ items, sleepText: extras.sleepText })) setForm(null);
  }

  async function remove(it) {
    if (!window.confirm("এই বাক্যটি মুছবেন?")) return;
    await persist({ items: extras.items.filter((x) => x.id !== it.id), sleepText: extras.sleepText });
  }

  const set = (k) => (e) => setForm({ ...form, [k]: k === "w" ? Number(e.target.value) : e.target.value });

  const btn = "px-3 py-2 rounded-xl text-sm font-semibold";
  let body;
  if (form) {
    body = React.createElement(
      "div",
      null,
      React.createElement("p", { className: "text-sm font-bold text-emerald-950 mb-2" }, form.id ? "বাক্য সম্পাদনা" : "নতুন বাক্য"),
      React.createElement(
        Field,
        { label: "কোন বারের কার্ডে আসবে? (কালকের বার)" },
        React.createElement(
          "select",
          { className: INPUT, value: form.w, onChange: set("w") },
          React.createElement("option", { value: -1 }, "প্রতিদিন"),
          WEEKDAYS_BN.map((n, i) => React.createElement("option", { key: i, value: i }, n))
        )
      ),
      React.createElement(Field, { label: "আইকন (ইমোজি)" }, React.createElement("input", { className: INPUT, value: form.icon, maxLength: LIMITS.icon, onChange: set("icon") })),
      React.createElement(Field, { label: "শিরোনাম (ঐচ্ছিক)" }, React.createElement("input", { className: INPUT, value: form.title, maxLength: LIMITS.title, onChange: set("title") })),
      React.createElement(Field, { label: "বাক্য / মাসয়ালা" }, React.createElement("textarea", { className: INPUT, rows: 5, value: form.text, maxLength: LIMITS.text, onChange: set("text") })),
      React.createElement(Field, { label: "সূত্র (ঐচ্ছিক, যেমন: সহীহ বুখারী ১২৩)" }, React.createElement("input", { className: INPUT, value: form.src, maxLength: LIMITS.src, onChange: set("src") })),
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
      extras.items.length === 0 && React.createElement("p", { className: "text-sm text-slate-500 mb-2" }, "এখনো কোনো বাড়তি বাক্য নেই।"),
      React.createElement(
        "ul",
        { className: "space-y-2 mb-3" },
        extras.items.map((it) =>
          React.createElement(
            "li",
            { key: it.id, className: "rounded-xl border border-slate-200 bg-white px-3 py-2" },
            React.createElement(
              "p",
              { className: "text-xs font-semibold " + (it.w === tomorrowWeekday ? "text-emerald-700" : "text-slate-500") },
              weekdayLabel(it.w) + (it.w === tomorrowWeekday ? " (কালকের জন্য দেখাচ্ছে)" : "")
            ),
            React.createElement("p", { className: "text-sm text-slate-800 mt-0.5" }, it.icon + " " + (it.title ? it.title + " — " : "") + it.text),
            React.createElement(
              "div",
              { className: "flex gap-2 justify-end mt-1.5" },
              React.createElement("button", { type: "button", className: btn + " border border-slate-200 text-slate-700", disabled: busy, onClick: () => { setError(""); setForm({ ...EMPTY, ...it }); } }, "সম্পাদনা"),
              React.createElement("button", { type: "button", className: btn + " border border-red-200 text-red-600", disabled: busy, onClick: () => remove(it) }, "মুছুন")
            )
          )
        )
      ),
      React.createElement("button", { type: "button", className: btn + " w-full text-white", style: { background: PRIMARY }, onClick: () => { setError(""); setForm({ ...EMPTY, w: tomorrowWeekday }); } }, "+ নতুন বাক্য যোগ করুন"),
      React.createElement(
        "div",
        { className: "mt-4 pt-3 border-t border-slate-200" },
        React.createElement(Field, { label: "\"ঘুমের আগে\"-র লেখা (খালি রাখলে আগের লেখাই থাকবে)" }, React.createElement("textarea", { className: INPUT, rows: 3, value: sleep, placeholder: defaultSleep, maxLength: LIMITS.sleep, onChange: (e) => setSleep(e.target.value) })),
        React.createElement(
          "div",
          { className: "flex justify-end" },
          React.createElement("button", { type: "button", className: btn + " border border-slate-300 text-slate-700 disabled:opacity-60", disabled: busy || sleep.trim() === (extras.sleepText || ""), onClick: () => persist({ items: extras.items, sleepText: sleep }) }, busy ? "সেভ হচ্ছে..." : "এই লেখা সেভ করুন")
        )
      )
    );
  }

  return React.createElement(
    "div",
    { className: "mt-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-3" },
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
