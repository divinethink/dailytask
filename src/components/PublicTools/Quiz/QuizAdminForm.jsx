// QuizAdminForm.jsx — শুধু App Creator দেখেন(3_5 §৪, mockup 3_3 §৯.৪)। বিষয়
// dropdown + প্রশ্ন-টেক্সট + ৪টা option(radio দিয়ে সঠিক-উত্তর) + ব্যাখ্যা(ঐচ্ছিক)
// + "প্রশ্ন যোগ করুন", নিচে বিষয়-ফিল্টারযোগ্য বিদ্যমান প্রশ্নের তালিকা(এডিট/ডিলিট
// সহ)। BlogWriterAdmin.jsx+BlogForm.jsx-এর pattern একত্রে(3_2 §৫-এর single-file
// সিদ্ধান্ত অনুযায়ী — কুইজের আলাদা "QuizForm.jsx" ফাইল নেই)।
// React global(window.React, globals.js)।

import {
  QUIZ_CATEGORIES,
  fetchQuestionsByCategory,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importSeedQuestions,
} from "../../../legacy/quizData.js";
import { ChevronLeft, Trash, EditIcon, Loader2 } from "../../icons.jsx";

const { useState, useEffect } = React;

function emptyForm(category) {
  return { category, question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" };
}

export function QuizAdminForm({ onBack }) {
  const [filterCategory, setFilterCategory] = useState(QUIZ_CATEGORIES[0]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(QUIZ_CATEGORIES[0]));
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  async function reload(category) {
    setLoading(true);
    setError("");
    try {
      const list = await fetchQuestionsByCategory(category);
      setQuestions(list);
    } catch (e) {
      setError("প্রশ্ন-তালিকা লোড করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload(filterCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(filterCategory));
  }

  function startEdit(q) {
    setEditingId(q.id);
    setForm({
      category: q.category,
      question: q.question,
      options: q.options && q.options.length === 4 ? q.options.slice() : ["", "", "", ""],
      correctIndex: q.correctIndex,
      explanation: q.explanation || "",
    });
  }

  function updateOption(i, value) {
    setForm((f) => {
      const options = f.options.slice();
      options[i] = value;
      return { ...f, options };
    });
  }

  async function handleSubmit() {
    if (!form.question.trim() || form.options.some((o) => !o.trim())) {
      setError("প্রশ্ন ও চারটা অপশন আবশ্যক।");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateQuestion(editingId, form);
      } else {
        await createQuestion(form);
      }
      resetForm();
      await reload(filterCategory);
    } catch (e) {
      setError("সেভ করা যায়নি, আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  }

  async function handleImportSeed() {
    if (!window.confirm("৫ বিষয় × ৫০ = ২৫০টি ডিফল্ট প্রশ্ন যোগ হবে। আগে থেকে থাকা প্রশ্ন অপরিবর্তিত থাকবে। এগিয়ে যাবেন?")) return;
    setImporting(true);
    setImportMsg("");
    setError("");
    try {
      const r = await importSeedQuestions();
      setImportMsg("যোগ হয়েছে: " + r.added + "টি, আগে থেকেই ছিল: " + r.skipped + "টি।");
      await reload(filterCategory);
    } catch (e) {
      setError("ইম্পোর্ট ব্যর্থ। সাইন-ইন ও Firestore Rules(quizQuestions) নিশ্চিত করে আবার চেষ্টা করুন।");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("এই প্রশ্ন মুছে ফেলবেন?")) return;
    try {
      await deleteQuestion(id);
      if (editingId === id) resetForm();
      await reload(filterCategory);
    } catch (e) {
      setError("মুছে ফেলা যায়নি।");
    }
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(
      "button",
      {
        type: "button",
        onClick: onBack,
        className: "flex items-center gap-1 px-4 pt-4 pb-2 text-sm font-semibold text-emerald-950",
      },
      /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
      "কুইজ"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pb-2 text-base font-bold text-emerald-950", style: { fontFamily: "'Noto Serif Bengali', serif" } },
      "✍️ প্রশ্ন ব্যবস্থাপনা"
    ),
    error && /*#__PURE__*/React.createElement("div", { className: "mx-4 mb-2 text-xs text-red-600" }, error),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 mb-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-2" },
      /*#__PURE__*/React.createElement("div", { className: "text-sm font-bold text-emerald-950" }, "ডিফল্ট প্রশ্ন-ব্যাংক"),
      /*#__PURE__*/React.createElement("p", { className: "text-xs text-slate-500" }, "প্রতি বিষয়ে ৫০টি করে মোট ২৫০টি প্রশ্ন একবারে যোগ করুন। এরপর প্রয়োজনমতো এডিট করতে পারবেন।"),
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: handleImportSeed,
          disabled: importing,
          className: "self-start px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60",
          style: { background: "var(--theme-primary, #0E4B43)" },
        },
        importing ? "যোগ হচ্ছে..." : "ডিফল্ট প্রশ্ন ইম্পোর্ট করুন"
      ),
      importMsg && /*#__PURE__*/React.createElement("p", { className: "text-xs text-emerald-700" }, importMsg)
    ),

    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-3" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-sm font-bold text-emerald-950" },
        editingId ? "প্রশ্ন এডিট করুন" : "নতুন প্রশ্ন"
      ),
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "বিষয়",
        /*#__PURE__*/React.createElement(
          "select",
          {
            value: form.category,
            onChange: (e) => setForm((f) => ({ ...f, category: e.target.value })),
            className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
          },
          QUIZ_CATEGORIES.map((c) => /*#__PURE__*/React.createElement("option", { key: c, value: c }, c))
        )
      ),
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "প্রশ্ন",
        /*#__PURE__*/React.createElement("textarea", {
          value: form.question,
          onChange: (e) => setForm((f) => ({ ...f, question: e.target.value })),
          rows: 2,
          className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
        })
      ),
      form.options.map((opt, i) =>
        /*#__PURE__*/React.createElement(
          "div",
          { key: i, className: "flex items-center gap-2" },
          /*#__PURE__*/React.createElement("input", {
            type: "radio",
            name: "correctOption",
            checked: form.correctIndex === i,
            onChange: () => setForm((f) => ({ ...f, correctIndex: i })),
          }),
          /*#__PURE__*/React.createElement("input", {
            type: "text",
            value: opt,
            placeholder: "অপশন " + (i + 1),
            onChange: (e) => updateOption(i, e.target.value),
            className: "flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm",
          })
        )
      ),
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "ব্যাখ্যা(ঐচ্ছিক)",
        /*#__PURE__*/React.createElement("textarea", {
          value: form.explanation,
          onChange: (e) => setForm((f) => ({ ...f, explanation: e.target.value })),
          rows: 2,
          className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
        })
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex gap-2" },
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            disabled: saving,
            onClick: handleSubmit,
            className: "px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50",
            style: { background: "var(--theme-primary, #0E4B43)" },
          },
          saving ? "সেভ হচ্ছে..." : editingId ? "আপডেট করুন" : "প্রশ্ন যোগ করুন"
        ),
        editingId &&
          /*#__PURE__*/React.createElement(
            "button",
            {
              type: "button",
              onClick: resetForm,
              className: "px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700",
            },
            "বাতিল"
          )
      )
    ),

    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "px-4 py-2.5 flex items-center justify-between border-b border-slate-100" },
        /*#__PURE__*/React.createElement("span", { className: "text-sm font-bold text-emerald-950" }, "বিদ্যমান প্রশ্ন"),
        /*#__PURE__*/React.createElement(
          "select",
          {
            value: filterCategory,
            onChange: (e) => setFilterCategory(e.target.value),
            className: "text-xs border border-slate-300 rounded-lg px-2 py-1",
          },
          QUIZ_CATEGORIES.map((c) => /*#__PURE__*/React.createElement("option", { key: c, value: c }, c))
        )
      ),
      loading
        ? /*#__PURE__*/React.createElement(
            "div",
            { className: "px-4 py-6 flex justify-center" },
            /*#__PURE__*/React.createElement(Loader2, { size: 20, className: "animate-spin" })
          )
        : questions.length === 0
        ? /*#__PURE__*/React.createElement("div", { className: "px-4 py-4 text-sm text-slate-500" }, "এই বিষয়ে কোনো প্রশ্ন নেই")
        : questions.map((q, idx) =>
            /*#__PURE__*/React.createElement(
              "div",
              {
                key: q.id,
                className:
                  "px-4 py-3 flex items-center justify-between gap-2 " +
                  (idx < questions.length - 1 ? "border-b border-slate-100" : ""),
              },
              /*#__PURE__*/React.createElement("span", { className: "text-sm text-slate-700 truncate" }, q.question),
              /*#__PURE__*/React.createElement(
                "div",
                { className: "flex items-center gap-3 shrink-0" },
                /*#__PURE__*/React.createElement(
                  "button",
                  { type: "button", onClick: () => startEdit(q) },
                  /*#__PURE__*/React.createElement(EditIcon, { size: 14, color: "#8A9A8F" })
                ),
                /*#__PURE__*/React.createElement(
                  "button",
                  { type: "button", onClick: () => handleDelete(q.id) },
                  /*#__PURE__*/React.createElement(Trash, { size: 14, color: "#D64545" })
                )
              )
            )
          )
    )
  );
}
