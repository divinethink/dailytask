// QuizRunner.jsx — immersive full-screen quiz-play UI(3_5 §৪, mockup
// 3_3 §৯.২)। এক-প্রশ্ন-এক-সময়, progress-bar, তাৎক্ষণিক সঠিক/ভুল feedback+
// ব্যাখ্যা, শেষে onFinish(score) কল করে। fixed inset-0 z-50 overlay(bottom-nav
// visually ঢেকে দেয় — QuizSection.jsx-এর উপরের নোট দ্রষ্টব্য)।
// React global(window.React, globals.js)।

import { Check, X } from "../../icons.jsx";

const { useState } = React;

export function QuizRunner({ questions, onExit, onFinish }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const total = questions.length;
  const q = questions[index];
  const answered = selected !== null;

  function handleSelect(optIdx) {
    if (answered) return;
    setSelected(optIdx);
    if (optIdx === q.correctIndex) setScore((s) => s + 1);
  }

  function handleNext() {
    if (index + 1 >= total) {
      onFinish(score);
      return;
    }
    setSelected(null);
    setIndex((i) => i + 1);
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "fixed inset-0 z-50 bg-[#F4F7F1] flex flex-col px-4 pt-4 pb-6 overflow-y-auto" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "flex items-center justify-between mb-3" },
      /*#__PURE__*/React.createElement(
        "button",
        { type: "button", onClick: onExit, "aria-label": "বন্ধ করুন", className: "text-lg text-slate-500" },
        "✕"
      ),
      /*#__PURE__*/React.createElement(
        "span",
        { className: "text-sm font-semibold text-slate-500" },
        "প্রশ্ন " + (index + 1) + "/" + total
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "h-1.5 rounded-full bg-slate-200 overflow-hidden mb-6" },
      /*#__PURE__*/React.createElement("div", {
        className: "h-full rounded-full",
        style: {
          width: Math.round(((index + (answered ? 1 : 0)) / total) * 100) + "%",
          background: "var(--theme-primary, #0E4B43)",
        },
      })
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "text-base font-bold text-emerald-950 mb-6", style: { fontFamily: "'Noto Serif Bengali', serif" } },
      q.question
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "flex flex-col gap-3" },
      q.options.map((opt, i) => {
        let extraClass = "border-slate-300";
        let icon = null;
        if (answered && i === q.correctIndex) {
          extraClass = "border-emerald-600 bg-emerald-50";
          icon = /*#__PURE__*/React.createElement(Check, { size: 16, color: "#2F9E44" });
        } else if (answered && i === selected) {
          extraClass = "border-red-500 bg-red-50";
          icon = /*#__PURE__*/React.createElement(X, { size: 16, color: "#D64545" });
        }
        return /*#__PURE__*/React.createElement(
          "button",
          {
            key: i,
            type: "button",
            disabled: answered,
            onClick: () => handleSelect(i),
            className:
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-sm text-slate-700 bg-white disabled:opacity-100 " +
              extraClass,
          },
          /*#__PURE__*/React.createElement("span", null, opt),
          icon
        );
      })
    ),
    answered &&
      q.explanation &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mt-4 text-xs text-slate-600 bg-white rounded-xl border border-slate-200/80 p-3" },
        q.explanation
      ),
    answered &&
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: handleNext,
          className: "mt-6 px-4 py-2 rounded-lg text-sm font-semibold text-white self-center",
          style: { background: "var(--theme-primary, #0E4B43)" },
        },
        index + 1 >= total ? "ফলাফল দেখুন" : "পরবর্তী প্রশ্ন"
      )
  );
}
