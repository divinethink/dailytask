// পপআপ বার্তা সম্পাদনা(শুধু App Creator): অনবোর্ড/সদস্য/ওজর/সাপ্তাহিক/মিটিং/মাসিক তথ্য-পপআপের লেখা।
// খসড়া লোকাল state-এ; "সেভ করুন" চাপলে তবেই Firestore-এ লেখা হয়(আসল নিরাপত্তা Rules-এ: write শুধু App Creator)।
// ডিফল্টের সমান বা খালি লেখা সেভ হয় না — তখন অ্যাপ নিজের ডিফল্ট লেখাই দেখায়।
import { POPUP_ITEMS, TITLE_MAX, BODY_MAX, loadPopupMessagesFresh, savePopupMessageOverrides } from "../legacy/popupMessages.js";

const h = React.createElement;

function toDraft(saved) {
  const d = {};
  POPUP_ITEMS.forEach((it) => {
    const ov = (saved && saved[it.id]) || {};
    d[it.id] = { title: ov.title || it.title, body: ov.body || it.body };
  });
  return d;
}

// ডিফল্টের সাথে একই হলে বাদ(override নেই ধরা হয়)
function toOverrides(draft) {
  const out = {};
  POPUP_ITEMS.forEach((it) => {
    const v = draft[it.id] || { title: "", body: "" };
    const title = (v.title || "").trim();
    const body = (v.body || "").trim();
    const o = {};
    if (title && title !== it.title) o.title = title;
    if (body && body !== it.body) o.body = body;
    if (o.title || o.body) out[it.id] = { title: o.title || "", body: o.body || "" };
  });
  return out;
}

export function PopupMessagesScreen({ onClose }) {
  const [draft, setDraft] = React.useState(null);
  const [baseline, setBaseline] = React.useState("");
  const [loadErr, setLoadErr] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    loadPopupMessagesFresh()
      .then((saved) => {
        if (!alive) return;
        const d = toDraft(saved);
        setDraft(d);
        setBaseline(JSON.stringify(toOverrides(d)));
      })
      .catch(() => { if (alive) setLoadErr(true); });
    return () => { alive = false; };
  }, []);

  const dirty = draft ? JSON.stringify(toOverrides(draft)) !== baseline : false;

  function back() {
    if (dirty && !window.confirm("সেভ না করা পরিবর্তন বাদ দিতে চান?")) return;
    onClose();
  }
  async function save() {
    if (busy || !dirty || !draft) return;
    setBusy(true);
    setError(false);
    try {
      await savePopupMessageOverrides(toOverrides(draft));
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  const setField = (id, field, value) => setDraft({ ...draft, [id]: { ...draft[id], [field]: value } });
  const resetItem = (it) => setDraft({ ...draft, [it.id]: { title: it.title, body: it.body } });

  const INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none";

  return h(
    "div",
    { className: "fixed inset-0 z-50 flex flex-col bg-[#F4F7F1]" },
    h(
      "div",
      { style: { background: "var(--theme-primary)" }, className: "px-5 pt-6 pb-4 shadow-md flex items-center gap-3" },
      h("button", { type: "button", onClick: back, "aria-label": "ফিরে যান", className: "text-white text-xl px-1" }, "←"),
      h("h1", { className: "text-lg font-bold text-white" }, "পপআপ বার্তা সম্পাদনা")
    ),
    h(
      "div",
      { className: "flex-1 overflow-y-auto px-5 py-4 space-y-4" },
      h("p", { className: "text-xs text-slate-500 leading-relaxed" }, "এখানের পরিবর্তন সব পরিবারের সবার জন্য প্রযোজ্য। লেখা ডিফল্টের মতো রাখলে বা ফাঁকা রাখলে অ্যাপের নিজের লেখাই দেখাবে।"),
      loadErr && h("p", { className: "text-xs text-red-600" }, "লোড করা যায়নি। ইন্টারনেট দেখে আবার খুলুন।"),
      !draft && !loadErr && h("p", { className: "text-sm text-slate-500 text-center py-6" }, "লোড হচ্ছে..."),
      draft && POPUP_ITEMS.map((it) =>
        h(
          "section",
          { key: it.id, className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2" },
          h("div", { className: "flex items-center justify-between gap-2" },
            h("p", { className: "text-xs font-bold text-slate-700" }, it.label),
            h("button", { type: "button", onClick: () => resetItem(it), className: "h-9 px-2 text-[11px] font-bold text-slate-500" }, "ডিফল্টে ফিরুন")
          ),
          h("input", {
            type: "text",
            value: draft[it.id].title,
            maxLength: TITLE_MAX,
            onChange: (e) => setField(it.id, "title", e.target.value),
            "aria-label": it.label + " শিরোনাম",
            className: INPUT
          }),
          h("textarea", {
            value: draft[it.id].body,
            maxLength: BODY_MAX,
            rows: it.structured ? 4 : 6,
            onChange: (e) => setField(it.id, "body", e.target.value),
            "aria-label": it.label + " লেখা",
            placeholder: it.structured ? "ফাঁকা = আগের বিশেষ নকশাসহ ডিফল্ট পপআপ। লিখলে পুরো পপআপ এই সাধারণ লেখায় বদলে যাবে।" : "",
            className: INPUT + " leading-relaxed"
          })
        )
      )
    ),
    h(
      "div",
      { className: "px-5 py-3 bg-white border-t border-slate-200" },
      error && h("p", { className: "text-xs text-red-600 mb-2" }, "সেভ করা যায়নি। আবার চেষ্টা করুন।"),
      h("button", {
        type: "button",
        onClick: save,
        disabled: busy || !dirty,
        className: "w-full h-12 rounded-xl text-sm font-bold text-white disabled:opacity-40",
        style: { background: "var(--theme-primary)" }
      }, busy ? "সেভ হচ্ছে..." : "সেভ করুন")
    )
  );
}
