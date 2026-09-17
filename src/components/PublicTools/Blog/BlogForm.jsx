// BlogForm.jsx — writer add/edit ফর্ম(3_4 §৪)। category dropdown + title +
// body(+[MORE]-marker guidance) + tags + sourceNote। নিজের পোস্ট এডিট বা নতুন
// পোস্ট তৈরি — দুটোতেই reuse হয়(post prop থাকলে edit-mode)।
// React global(window.React, globals.js)।

import { BLOG_CATEGORIES, createPost, updatePost } from "../../../legacy/blogData.js";
import { ChevronLeft } from "../../icons.jsx";

const { useState } = React;

export function BlogForm({ post, onDone, onCancel }) {
  const isEdit = !!post;
  const [category, setCategory] = useState(post ? post.category : BLOG_CATEGORIES[0]);
  const [title, setTitle] = useState(post ? post.title : "");
  const [body, setBody] = useState(post ? post.body : "");
  const [tagsText, setTagsText] = useState(post && post.tags ? post.tags.join(", ") : "");
  const [sourceNote, setSourceNote] = useState(post && post.sourceNote ? post.sourceNote : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      setError("শিরোনাম ও লেখা আবশ্যক।");
      return;
    }
    setSaving(true);
    setError("");
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      if (isEdit) {
        await updatePost(post.id, { category, title, body, tags, sourceNote });
      } else {
        await createPost({ category, title, body, tags, sourceNote });
      }
      onDone();
    } catch (e) {
      setError("সেভ করা যায়নি, আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(
      "button",
      {
        type: "button",
        onClick: onCancel,
        className: "flex items-center gap-1 px-4 pt-4 pb-2 text-sm font-semibold text-emerald-950",
      },
      /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
      "ব্লগ"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "px-4 pb-2 text-base font-bold text-emerald-950", style: { fontFamily: "'Noto Serif Bengali', serif" } },
      isEdit ? "লেখা এডিট করুন" : "নতুন লেখা"
    ),
    error && /*#__PURE__*/React.createElement("div", { className: "mx-4 mb-2 text-xs text-red-600" }, error),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-3" },
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "ক্যাটাগরি",
        /*#__PURE__*/React.createElement(
          "select",
          {
            value: category,
            onChange: (e) => setCategory(e.target.value),
            className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
          },
          BLOG_CATEGORIES.map((c) => /*#__PURE__*/React.createElement("option", { key: c, value: c }, c))
        )
      ),
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "শিরোনাম",
        /*#__PURE__*/React.createElement("input", {
          type: "text",
          value: title,
          onChange: (e) => setTitle(e.target.value),
          className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
        })
      ),
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "লেখা(প্রিভিউ শেষ করতে [MORE] লিখুন যেখানে চান)",
        /*#__PURE__*/React.createElement("textarea", {
          value: body,
          onChange: (e) => setBody(e.target.value),
          rows: 10,
          className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
        })
      ),
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "ট্যাগ(কমা দিয়ে আলাদা, ঐচ্ছিক)",
        /*#__PURE__*/React.createElement("input", {
          type: "text",
          value: tagsText,
          onChange: (e) => setTagsText(e.target.value),
          className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
        })
      ),
      /*#__PURE__*/React.createElement(
        "label",
        { className: "text-xs font-semibold text-slate-600" },
        "সূত্র/রেফারেন্স(ঐচ্ছিক)",
        /*#__PURE__*/React.createElement("input", {
          type: "text",
          value: sourceNote,
          onChange: (e) => setSourceNote(e.target.value),
          className: "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm",
        })
      ),
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          disabled: saving,
          onClick: handleSubmit,
          className: "mt-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50",
          style: { background: "var(--theme-primary, #0E4B43)" },
        },
        saving ? "সেভ হচ্ছে..." : isEdit ? "আপডেট করুন" : "প্রকাশ করুন"
      )
    )
  );
}
