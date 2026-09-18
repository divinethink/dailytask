// BlogWriterAdmin.jsx — শুধু App Creator দেখেন(3_4 §৪/৩_৩ §৮.৪)। বিদ্যমান
// writer-email লিস্ট + remove + নতুন email যোগ করার ছোট ফর্ম।
// React global(window.React, globals.js)।

import { getWriters, addWriter, removeWriter, importSeedPosts } from "../../../legacy/blogData.js";
import { Trash, ChevronLeft, Loader2 } from "../../icons.jsx";

const { useState, useEffect } = React;

export function BlogWriterAdmin({ onBack }) {
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const list = await getWriters();
      setWriters(list);
    } catch (e) {
      setError("লেখক-তালিকা লোড করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportSeed() {
    if (!window.confirm("১৮ ক্যাটাগরির প্রতিটিতে ১টি করে ডিফল্ট পোস্ট যোগ হবে। আগে থেকে থাকা পোস্ট অপরিবর্তিত থাকবে। এগিয়ে যাবেন?")) return;
    setImporting(true);
    setImportMsg("");
    setError("");
    try {
      const r = await importSeedPosts();
      setImportMsg("যোগ হয়েছে: " + r.added + "টি, আগে থেকেই ছিল: " + r.skipped + "টি।");
    } catch (e) {
      setError(
        e && e.message === "NOT_WRITER"
          ? "আগে নিচের তালিকায় নিজের ইমেইল লেখক হিসেবে যোগ করুন, তারপর ইম্পোর্ট করুন।"
          : "ইম্পোর্ট ব্যর্থ। সাইন-ইন ও Firestore Rules(blogPosts) নিশ্চিত করে আবার চেষ্টা করুন।"
      );
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleAdd() {
    const email = newEmail.trim();
    if (!email) return;
    setBusy(true);
    setError("");
    try {
      await addWriter(email);
      setNewEmail("");
      await reload();
    } catch (e) {
      setError((e && e.message) || "যোগ করা যায়নি — email সঠিক কিনা যাচাই করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(email) {
    setBusy(true);
    try {
      await removeWriter(email);
      await reload();
    } catch (e) {
      setError("সরানো যায়নি।");
    } finally {
      setBusy(false);
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
      "ব্লগ"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pb-2 text-base font-bold text-emerald-950", style: { fontFamily: "'Noto Serif Bengali', serif" } },
      "✍️ লেখক ব্যবস্থাপনা"
    ),
    error &&
      /*#__PURE__*/React.createElement("div", { className: "mx-4 mb-2 text-xs text-red-600" }, error),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 mb-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-2" },
      /*#__PURE__*/React.createElement("div", { className: "text-sm font-bold text-emerald-950" }, "ডিফল্ট ব্লগ পোস্ট"),
      /*#__PURE__*/React.createElement("p", { className: "text-xs text-slate-500" }, "প্রতি ক্যাটাগরিতে কুরআন ও হাদীসের বাণীভিত্তিক ১টি করে মোট ১৮টি পোস্ট যোগ করুন। পরে এডিট করা যাবে।"),
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: handleImportSeed,
          disabled: importing,
          className: "self-start px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60",
          style: { background: "var(--theme-primary, #0E4B43)" },
        },
        importing ? "যোগ হচ্ছে..." : "ডিফল্ট পোস্ট ইম্পোর্ট করুন"
      ),
      importMsg && /*#__PURE__*/React.createElement("p", { className: "text-xs text-emerald-700" }, importMsg)
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "px-4 py-2.5 text-sm font-bold text-emerald-950 border-b border-slate-100" },
        "বিদ্যমান লেখক"
      ),
      loading
        ? /*#__PURE__*/React.createElement(
            "div",
            { className: "px-4 py-6 flex justify-center" },
            /*#__PURE__*/React.createElement(Loader2, { size: 20, className: "animate-spin" })
          )
        : writers.length === 0
        ? /*#__PURE__*/React.createElement("div", { className: "px-4 py-4 text-sm text-slate-500" }, "কোনো লেখক নেই")
        : writers.map((w, idx) =>
            /*#__PURE__*/React.createElement(
              "div",
              {
                key: w.email,
                className:
                  "px-4 py-3 flex items-center justify-between " +
                  (idx < writers.length - 1 ? "border-b border-slate-100" : ""),
              },
              /*#__PURE__*/React.createElement("span", { className: "text-sm text-slate-700 break-all" }, w.email),
              /*#__PURE__*/React.createElement(
                "button",
                { type: "button", disabled: busy, onClick: () => handleRemove(w.email) },
                /*#__PURE__*/React.createElement(Trash, { size: 16, color: "#D64545" })
              )
            )
          )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-sm font-bold text-emerald-950 mb-2" },
        "নতুন লেখক যোগ করুন"
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex gap-2" },
        /*#__PURE__*/React.createElement("input", {
          type: "email",
          value: newEmail,
          onChange: (e) => setNewEmail(e.target.value),
          placeholder: "email@example.com",
          className: "flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm",
        }),
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            disabled: busy || !newEmail.trim(),
            onClick: handleAdd,
            className: "px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50",
            style: { background: "var(--theme-primary, #0E4B43)" },
          },
          "যোগ করুন"
        )
      )
    )
  );
}
