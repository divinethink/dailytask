// QuizSection.jsx — "ইসলামি কুইজ"(Public Tools সহায়িকা→ক্যাটাগরি ৫, Phase F,
// 3_5/3_3 §৯)। বিষয়-নির্বাচন screen + immersive quiz-runner + result-summary
// + App-Creator-only প্রশ্ন-ব্যবস্থাপনা প্যানেল entry। Read সবার জন্য open(guest
// সহ)। React global(window.React, globals.js)।
//
// §Bottom-nav hide(3_5 UI Layout — "bottom-nav সাময়িক hidden"): app.js/
// BottomNav.jsx এখানে touch করা হয়নি(৩৪০০+ লাইনের ফাইল, Zero-Risk নীতি) —
// QuizRunner ও Result-screen fixed full-screen overlay(z-50, inset-0)
// হিসেবে render হয়, যা visually বটম-নেভ ঢেকে দেয় — BlogSection.jsx-এর
// sidebar-drawer(z-40 fixed overlay)-এর একই established pattern reuse,
// শুধু higher z-index+পুরো screen কভার করে। কার্যকরী ফলাফল অভিন্ন, app.js-এ
// কোনো নতুন state/prop-threading লাগেনি।

import { isCreatorAuth } from "../../../legacy/familyIdentity.js";
import {
  QUIZ_CATEGORIES,
  ALL_TOPICS,
  fetchAllQuestions,
  fetchQuestionsByCategory,
  pickSessionQuestions,
  getBestScore,
  setBestScoreIfHigher,
} from "../../../legacy/quizData.js";
import { ChevronLeft, ChevronRight, Loader2 } from "../../icons.jsx";
import { QuizRunner } from "./QuizRunner.jsx";
import { QuizAdminForm } from "./QuizAdminForm.jsx";

const { useState } = React;

export function QuizSection({ onBack }) {
  const isCreator = isCreatorAuth();
  const [view, setView] = useState("topics"); // topics | runner | result | admin
  const [loadingTopic, setLoadingTopic] = useState(null);
  const [error, setError] = useState("");
  const [activeTopic, setActiveTopic] = useState(null);
  const [pool, setPool] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [resultScore, setResultScore] = useState(0);

  async function handleSelectTopic(topic) {
    setError("");
    setLoadingTopic(topic);
    try {
      const list =
        topic === ALL_TOPICS ? await fetchAllQuestions() : await fetchQuestionsByCategory(topic);
      if (list.length === 0) {
        setError("এই বিষয়ে এখনো প্রশ্ন যোগ হয়নি।");
        return;
      }
      setActiveTopic(topic);
      setPool(list);
      setSessionQuestions(pickSessionQuestions(list));
      setView("runner");
    } catch (e) {
      setError("প্রশ্ন লোড করা যায়নি, আবার চেষ্টা করুন।");
    } finally {
      setLoadingTopic(null);
    }
  }

  function handlePlayAgain() {
    setSessionQuestions(pickSessionQuestions(pool));
    setView("runner");
  }

  function handleFinish(score) {
    setResultScore(score);
    setBestScoreIfHigher(activeTopic, score);
    setView("result");
  }

  function backToTopics() {
    setView("topics");
  }

  if (view === "admin") {
    return /*#__PURE__*/React.createElement(QuizAdminForm, { onBack: backToTopics });
  }

  if (view === "runner") {
    return /*#__PURE__*/React.createElement(QuizRunner, {
      questions: sessionQuestions,
      onExit: backToTopics,
      onFinish: handleFinish,
    });
  }

  if (view === "result") {
    const total = sessionQuestions.length;
    const best = getBestScore(activeTopic);
    return /*#__PURE__*/React.createElement(
      "div",
      {
        className:
          "fixed inset-0 z-50 bg-[#F4F7F1] flex flex-col items-center justify-center gap-4 px-6 text-center",
      },
      /*#__PURE__*/React.createElement("div", { className: "text-3xl" }, "🎉 কুইজ শেষ!"),
      /*#__PURE__*/React.createElement(
        "div",
        {
          className: "text-xl font-bold text-emerald-950",
          style: { fontFamily: "'IBM Plex Mono', monospace" },
        },
        "স্কোর: " + resultScore + "/" + total
      ),
      typeof best === "number" &&
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-sm text-slate-500" },
          "personal best: " + best + "/" + total
        ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex gap-3 mt-2" },
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: handlePlayAgain,
            className: "px-4 py-2 rounded-lg text-sm font-semibold text-white",
            style: { background: "var(--theme-primary, #0E4B43)" },
          },
          "আবার খেলুন"
        ),
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: backToTopics,
            className: "px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700",
          },
          "সহায়িকায় ফিরুন"
        )
      )
    );
  }

  // --- topics view ---
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "flex items-center justify-between px-4 pt-4 pb-2" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: onBack,
          className: "flex items-center gap-1 text-sm font-semibold text-emerald-950",
        },
        /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
        "সহায়িকা"
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-sm font-bold text-emerald-950", style: { fontFamily: "'Noto Serif Bengali', serif" } },
        "🧠 ইসলামি কুইজ"
      ),
      isCreator
        ? /*#__PURE__*/React.createElement(
            "button",
            { type: "button", onClick: () => setView("admin"), "aria-label": "প্রশ্ন ব্যবস্থাপনা" },
            "✍️"
          )
        : /*#__PURE__*/React.createElement("span", { className: "w-4" })
    ),
    error && /*#__PURE__*/React.createElement("div", { className: "mx-4 mb-2 text-xs text-red-600" }, error),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "mx-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden" },
      [ALL_TOPICS, ...QUIZ_CATEGORIES].map((topic, idx, arr) =>
        /*#__PURE__*/React.createElement(
          "button",
          {
            key: topic,
            type: "button",
            disabled: !!loadingTopic,
            onClick: () => handleSelectTopic(topic),
            className:
              "w-full px-4 py-3 flex items-center justify-between text-left disabled:opacity-50 " +
              (idx < arr.length - 1 ? "border-b border-slate-100" : ""),
          },
          /*#__PURE__*/React.createElement(
            "span",
            {
              className: "text-sm " + (idx === 0 ? "font-semibold" : "text-slate-700"),
              style: idx === 0 ? { color: "var(--theme-accent, #C89B3C)" } : undefined,
            },
            topic
          ),
          loadingTopic === topic
            ? /*#__PURE__*/React.createElement(Loader2, { size: 16, className: "animate-spin" })
            : /*#__PURE__*/React.createElement(ChevronRight, { size: 16, color: "#8A9A8F" })
        )
      )
    )
  );
}
