// TasbihCounter.jsx — "আমল" hub(AmolHub.jsx)-এর ভিতরে, গ্রিডের নিচে(১৯ সেপ্টেম্বর
// ২০২৬ owner-request, আধুনিক ring-counter ডিজাইন)। Pure counter-state
// (editable/checklist না) — running count session-only(reload-এ ০), শুধু target
// ঐচ্ছিকভাবে persist(3_2 §৩, data-layer publicToolsTasbih.js)।
// React global(window.React, globals.js)।

import { toBn } from "../../legacy/appHelpers.js";
import { RefreshIcon } from "../icons.jsx";
import { ToolIcon } from "./ToolIcons.jsx";
import { TASBIH_TARGET_OPTIONS, getSavedTasbihTarget, saveTasbihTarget } from "../../legacy/publicToolsTasbih.js";

const { useState } = React;

const PRIMARY = "var(--theme-primary, #0E4B43)";
const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

function buzz(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {
    // vibration best-effort
  }
}

export function TasbihCounter() {
  const [target, setTarget] = useState(() => getSavedTasbihTarget());
  const [count, setCount] = useState(0);

  const inRound = count % target;
  const roundDone = count > 0 && inRound === 0;
  const progress = roundDone ? target : inRound;
  const rounds = Math.floor(count / target);

  function handleTap() {
    const next = count + 1;
    setCount(next);
    buzz(next % target === 0 ? [30, 40, 30] : 8);
  }

  function handleSelectTarget(t) {
    setTarget(t);
    saveTasbihTarget(t);
    setCount(0);
  }

  return React.createElement(
    "section",
    { className: "mb-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3 flex flex-col items-center" },
    React.createElement(
      "div",
      { className: "w-full flex items-center justify-between mb-3" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2 text-sm font-bold", style: { color: PRIMARY } },
        React.createElement(ToolIcon, { name: "beads", size: 16, color: PRIMARY }),
        "তাসবীহ"
      ),
      rounds > 0 &&
        React.createElement(
          "span",
          { className: "text-xs font-semibold px-2.5 py-1 rounded-full", style: { background: "#FBF3E0", color: "#8A6A1E" } },
          "রাউন্ড " + toBn(rounds)
        )
    ),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: handleTap,
        "aria-label": "তাসবীহ গণনা করুন",
        className: "relative w-40 h-40 rounded-full flex items-center justify-center active:scale-[0.97] transition-transform select-none",
        style: { background: "#F4F7F1", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" },
      },
      React.createElement(
        "svg",
        { viewBox: "0 0 200 200", className: "absolute inset-0 w-full h-full -rotate-90" },
        React.createElement("circle", { cx: 100, cy: 100, r: RING_R, fill: "none", stroke: "#E4E7E2", strokeWidth: 10 }),
        React.createElement("circle", {
          cx: 100,
          cy: 100,
          r: RING_R,
          fill: "none",
          stroke: roundDone ? "#C89B3C" : "#0E4B43",
          strokeWidth: 10,
          strokeLinecap: "round",
          strokeDasharray: RING_C,
          strokeDashoffset: RING_C * (1 - progress / target),
          style: { transition: "stroke-dashoffset 0.2s ease, stroke 0.2s ease" },
        })
      ),
      React.createElement(
        "div",
        { className: "relative flex flex-col items-center" },
        React.createElement(
          "span",
          { className: "text-4xl font-bold leading-none", style: { fontFamily: "'IBM Plex Mono', monospace", color: PRIMARY } },
          toBn(progress)
        ),
        React.createElement("span", { className: "text-xs text-slate-500 mt-2" }, "/ " + toBn(target)),
        React.createElement(
          "span",
          { className: "text-[11px] mt-1 font-semibold", style: { color: roundDone ? "#C89B3C" : "#8A9A8F" } },
          roundDone ? "লক্ষ্য পূর্ণ ✓" : "ট্যাপ করুন"
        )
      )
    ),
    React.createElement(
      "div",
      { className: "w-full flex items-center justify-between gap-2 mt-3" },
      React.createElement(
        "div",
        { className: "flex-1 flex bg-[#F4F7F1] rounded-full p-1" },
        TASBIH_TARGET_OPTIONS.map((t) =>
          React.createElement(
            "button",
            {
              key: t,
              type: "button",
              onClick: () => handleSelectTarget(t),
              className: "flex-1 text-xs font-semibold py-1.5 rounded-full transition-colors",
              style: t === target ? { background: "#0E4B43", color: "#fff" } : { color: "#5B6B64" },
            },
            toBn(t)
          )
        )
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setCount(0),
          "aria-label": "রিসেট",
          className: "w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 shrink-0",
        },
        React.createElement(RefreshIcon, { size: 16 })
      )
    )
  );
}
