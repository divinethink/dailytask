// DuaFlashcards.jsx — "আমল" হাব, item ৩০(দু'আ ফ্ল্যাশকার্ড, 3_1 §"আমল হাব" item
// ৫-এর অংশ, `3_6` §৪.২ নোট: "flip-card UI অপরিবর্তিত, শুধু content-source
// Firestore/default")। এক-কার্ড-এক-সময় navigation + tap-to-flip — এই ভিজুয়াল
// EditableSection-এর list-UI থেকে আলাদা বলে সরাসরি editableContent.js CRUD
// ব্যবহার করে নিজস্ব admin-form বানানো হয়েছে(একই accordion data-model, format:
// "accordion", sectionId "dua_flashcards")।
// React global(window.React, globals.js)।

import { isCreatorAuth } from "../../legacy/familyIdentity.js";
import { EditIcon, Trash, ChevronLeft, ChevronRight } from "../icons.jsx";
import { fetchSection, saveAccordion, makeAccordionItemId } from "../../legacy/editableContent.js";

const { useState, useEffect } = React;

const SECTION_ID = "dua_flashcards";
const MUTED = "#8A9A8F";
const PRIMARY = "var(--theme-primary, #0E4B43)";

const FLASHCARDS_DEFAULT = [
  { itemId: "df_travel", title: "সফরের দোয়া", body: "সুবহানাল্লাযি সাখখারা লানা হাযা ওয়ামা কুন্না লাহু মুক্বরিনিন, ওয়া ইন্না ইলা রাব্বিনা লামুনক্বালিবুন।" },
  { itemId: "df_entering_home", title: "ঘরে প্রবেশের দোয়া", body: "আল্লাহুম্মা ইন্নি আসআলুকা খাইরাল মাওলাজি ওয়া খাইরাল মাখরাজ... — ঘরে ঢোকার সময় বিসমিল্লাহ বলে পড়া।" },
  { itemId: "df_eating", title: "খাওয়ার আগের দোয়া", body: "বিসমিল্লাহ। ভুলে গেলে পরে মনে পড়লে: বিসমিল্লাহি ফি আওয়ালিহি ওয়া আখিরিহি।" },
  { itemId: "df_after_eating", title: "খাওয়ার পরের দোয়া", body: "আলহামদুলিল্লাহিল্লাযি আত'আমানি হাযা, ওয়া রাযাক্বানিহি মিন গাইরি হাওলিম মিন্নি ওয়ালা কুওয়াহ।" },
  { itemId: "df_distress", title: "দুশ্চিন্তা/কষ্টের সময়ের দোয়া", body: "আল্লাহুম্মা ইন্নি আবদুকা ইবনু আবদিকা ইবনু আমাতিক... — হাদিসে বর্ণিত দুশ্চিন্তা দূর করার দোয়া।" },
  { itemId: "df_new_moon", title: "নতুন চাঁদ দেখার দোয়া", body: "আল্লাহু আকবার, আল্লাহুম্মা আহিল্লাহু আলাইনা বিল আমনি ওয়াল ঈমান... — নতুন মাসের চাঁদ দেখে পড়া।" },
];

function FlashcardForm({ initial, onCancel, onSave, busy, error }) {
  const [title, setTitle] = useState(initial.title || "");
  const [body, setBody] = useState(initial.body || "");
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3 flex flex-col gap-2" },
    /*#__PURE__*/React.createElement("input", {
      value: title,
      onChange: (e) => setTitle(e.target.value),
      placeholder: "সামনের পিঠ(শিরোনাম)",
      className: "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none",
    }),
    /*#__PURE__*/React.createElement("textarea", {
      value: body,
      onChange: (e) => setBody(e.target.value),
      placeholder: "পিছনের পিঠ(দোয়ার টেক্সট)",
      rows: 5,
      className: "w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none",
    }),
    error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-500" }, error),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "flex gap-2 justify-end" },
      /*#__PURE__*/React.createElement(
        "button",
        { type: "button", onClick: onCancel, disabled: busy, className: "px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200" },
        "বাতিল"
      ),
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => onSave(title.trim(), body.trim()),
          disabled: busy,
          className: "px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60",
          style: { background: PRIMARY },
        },
        busy ? "সেভ হচ্ছে..." : "সেভ করুন"
      )
    )
  );
}

export function DuaFlashcards() {
  const isCreator = isCreatorAuth();
  const [doc, setDoc] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState(null); // null | "edit" | "new"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchSection(SECTION_ID).then((data) => {
      if (alive) setDoc(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const items =
    doc && doc.accordion && Array.isArray(doc.accordion.items) && doc.accordion.items.length
      ? doc.accordion.items
      : FLASHCARDS_DEFAULT;
  const safeIndex = items.length ? ((index % items.length) + items.length) % items.length : 0;
  const current = items[safeIndex];

  function go(delta) {
    setFlipped(false);
    setIndex((i) => i + delta);
  }

  async function persist(next) {
    setBusy(true);
    setError("");
    try {
      await saveAccordion(SECTION_ID, next);
      setDoc({ ...(doc || {}), accordion: { items: next } });
      setMode(null);
    } catch (e) {
      setError("সেভ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  function saveEdit(title, body) {
    const next = items.map((it) => (it.itemId === current.itemId ? { ...it, title, body } : it));
    persist(next);
  }

  function saveNew(title, body) {
    const next = items.concat([{ itemId: makeAccordionItemId(), title, body }]);
    persist(next).then(() => setIndex(items.length));
  }

  function deleteCurrent() {
    if (!current) return;
    if (!window.confirm(`"${current.title}" কার্ডটি মুছে ফেলতে চান?`)) return;
    const next = items.filter((it) => it.itemId !== current.itemId);
    persist(next);
    setIndex(0);
    setFlipped(false);
  }

  if (mode === "edit" && current) {
    return /*#__PURE__*/React.createElement(FlashcardForm, {
      initial: current,
      onCancel: () => setMode(null),
      onSave: saveEdit,
      busy,
      error,
    });
  }
  if (mode === "new") {
    return /*#__PURE__*/React.createElement(FlashcardForm, {
      initial: { title: "", body: "" },
      onCancel: () => setMode(null),
      onSave: saveNew,
      busy,
      error,
    });
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex flex-col gap-3" },
    /*#__PURE__*/React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setFlipped((f) => !f),
        className:
          "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 min-h-[140px] flex items-center justify-center text-center",
      },
      /*#__PURE__*/React.createElement(
        "p",
        {
          className: flipped ? "text-sm text-slate-700 leading-relaxed whitespace-pre-line" : "text-base font-semibold text-emerald-950",
          style: !flipped ? { fontFamily: "'Noto Serif Bengali', serif" } : undefined,
        },
        current ? (flipped ? current.body : current.title) : "কোনো কার্ড নেই"
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "flex items-center justify-between" },
      /*#__PURE__*/React.createElement(
        "button",
        { type: "button", onClick: () => go(-1), className: "p-2 rounded-full bg-white border border-slate-200" },
        /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 })
      ),
      /*#__PURE__*/React.createElement(
        "span",
        { className: "text-xs text-slate-400" },
        items.length ? safeIndex + 1 + " / " + items.length : "0 / 0"
      ),
      /*#__PURE__*/React.createElement(
        "button",
        { type: "button", onClick: () => go(1), className: "p-2 rounded-full bg-white border border-slate-200" },
        /*#__PURE__*/React.createElement(ChevronRight, { size: 16 })
      )
    ),
    isCreator &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex items-center justify-center gap-3" },
        current &&
          /*#__PURE__*/React.createElement(
            "button",
            { type: "button", onClick: () => setMode("edit"), className: "flex items-center gap-1 text-xs font-semibold text-slate-500" },
            /*#__PURE__*/React.createElement(EditIcon, { size: 14, color: MUTED }),
            "এডিট"
          ),
        current &&
          /*#__PURE__*/React.createElement(
            "button",
            { type: "button", onClick: deleteCurrent, className: "flex items-center gap-1 text-xs font-semibold text-slate-500" },
            /*#__PURE__*/React.createElement(Trash, { size: 14, color: MUTED }),
            "মুছুন"
          ),
        /*#__PURE__*/React.createElement(
          "button",
          { type: "button", onClick: () => setMode("new"), className: "text-xs font-semibold text-slate-500 underline" },
          "+ নতুন কার্ড"
        )
      )
  );
}
