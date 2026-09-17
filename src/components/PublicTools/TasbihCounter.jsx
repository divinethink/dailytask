// TasbihCounter.jsx — "আমল" hub(AmolHub.jsx)-এর ভিতরে প্রথম prominent item(পূর্বে
// নিজস্ব bottom-nav ট্যাব ছিল, ১৬ সেপ্টেম্বর ২০২৬-এ hub-এ পুনর্গঠিত, 3_1 §"আমল হাব")।
// Pure counter-state(editable/checklist না) — running count session-only(reload-এ
// ০), শুধু target ঐচ্ছিকভাবে persist(3_2 §৩, data-layer publicToolsTasbih.js)।
// React global(window.React, globals.js)।

import { toBn } from "../../legacy/appHelpers.js";
import { ChevronDown } from "../icons.jsx";
import { TASBIH_TARGET_OPTIONS, getSavedTasbihTarget, saveTasbihTarget } from "../../legacy/publicToolsTasbih.js";

const { useState } = React;

export function TasbihCounter() {
  const [target, setTarget] = useState(() => getSavedTasbihTarget());
  const [count, setCount] = useState(0);
  const [targetPanelOpen, setTargetPanelOpen] = useState(false);

  const justCompletedRound = count > 0 && count % target === 0;

  function handleTap() {
    setCount((c) => c + 1);
  }

  function handleReset() {
    setCount(0);
  }

  function handleSelectTarget(t) {
    setTarget(t);
    saveTasbihTarget(t);
    setTargetPanelOpen(false);
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "mx-4 mb-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col items-center gap-2" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "w-full flex items-center justify-between" },
      /*#__PURE__*/React.createElement("div", { className: "text-sm font-bold text-emerald-950" }, "📿 তাসবীহ"),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "relative" },
        /*#__PURE__*/React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setTargetPanelOpen((v) => !v),
            className: "text-xs px-2.5 py-1 rounded-full bg-[#F4F7F1] border border-slate-200 flex items-center gap-1 text-slate-600",
          },
          "লক্ষ্য: ", toBn(target),
          /*#__PURE__*/React.createElement(ChevronDown, { size: 12 })
        ),
        targetPanelOpen &&
          /*#__PURE__*/React.createElement(
            "div",
            { className: "absolute right-0 mt-1 w-28 bg-white rounded-xl shadow-md border border-slate-200 p-1 z-20" },
            TASBIH_TARGET_OPTIONS.map((t) =>
              /*#__PURE__*/React.createElement(
                "button",
                {
                  key: t,
                  type: "button",
                  onClick: () => handleSelectTarget(t),
                  className:
                    "w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 " +
                    (t === target ? "font-bold text-emerald-950" : "text-slate-600"),
                },
                toBn(t)
              )
            )
          )
      )
    ),
    /*#__PURE__*/React.createElement(
      "div",
      {
        className: "text-5xl font-bold py-2",
        style: { fontFamily: "'IBM Plex Mono', monospace", color: "var(--theme-primary, #0E4B43)" },
      },
      toBn(count)
    ),
    justCompletedRound &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-xs font-semibold", style: { color: "#C89B3C" } },
        "লক্ষ্য পূর্ণ হয়েছে ✓"
      ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "w-full flex items-center gap-2 mt-1" },
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: handleTap,
          className: "flex-1 py-3 rounded-xl text-white font-semibold text-sm",
          style: { background: "var(--theme-primary, #0E4B43)" },
        },
        "ট্যাপ করুন"
      ),
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: handleReset,
          className: "px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm",
        },
        "রিসেট"
      )
    )
  );
}
