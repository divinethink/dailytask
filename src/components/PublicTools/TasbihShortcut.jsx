// TasbihShortcut.jsx — সহায়িকার সবার ওপরের ছোট তাসবীহ-শর্টকাট(ধাপ ২)। বৃত্তে ট্যাপ = গোনা; ডানের বোতামে লক্ষ্য(৩৩/৯৯/১০০০) বদলায়।
// গণনা শুধু এই পাতায় থাকে(session-only, আগের তাসবীহ-কাউন্টারের মতোই); লক্ষ্য একই সেভ-করা সেটিং(publicToolsTasbih.js) ব্যবহার করে।
// React global(window.React, globals.js)।

import { toBn } from "../../legacy/appHelpers.js";
import { TASBIH_TARGET_OPTIONS, getSavedTasbihTarget, saveTasbihTarget } from "../../legacy/publicToolsTasbih.js";

const { useState } = React;
const PRIMARY = "var(--theme-primary, #0E4B43)";
const R = 44;
const C = 2 * Math.PI * R;

export function TasbihShortcut() {
  const [target, setTarget] = useState(() => getSavedTasbihTarget());
  const [count, setCount] = useState(0);
  const inRound = count % target;
  const roundDone = count > 0 && inRound === 0;
  const progress = roundDone ? target : inRound;

  function tap() {
    const next = count + 1;
    setCount(next);
    try { if (navigator.vibrate) navigator.vibrate(next % target === 0 ? [30, 40, 30] : 8); } catch (e) { /* best-effort */ }
  }
  function nextTarget() {
    const i = TASBIH_TARGET_OPTIONS.indexOf(target);
    const t = TASBIH_TARGET_OPTIONS[(i + 1) % TASBIH_TARGET_OPTIONS.length];
    setTarget(t);
    saveTasbihTarget(t);
    setCount(0);
  }
  const others = TASBIH_TARGET_OPTIONS.filter(t => t !== target);

  return React.createElement(
    "section",
    { className: "mb-3 flex items-center gap-3 rounded-[20px] border bg-white p-3", style: { borderColor: "#E4D3A8", boxShadow: "0 3px 12px -3px rgba(160,120,40,0.25)" } },
    React.createElement(
      "button",
      {
        type: "button",
        onClick: tap,
        "aria-label": "তাসবীহ গণনা করুন",
        className: "relative h-[72px] w-[72px] shrink-0 select-none rounded-full active:scale-95 transition-transform",
        style: { background: "#F4F7F1", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }
      },
      React.createElement(
        "svg",
        { viewBox: "0 0 100 100", className: "absolute inset-0 h-full w-full -rotate-90" },
        React.createElement("circle", { cx: 50, cy: 50, r: R, fill: "none", stroke: "#E4E7E2", strokeWidth: 8 }),
        React.createElement("circle", {
          cx: 50, cy: 50, r: R, fill: "none", stroke: roundDone ? "#C89B3C" : "#0E4B43", strokeWidth: 8, strokeLinecap: "round",
          strokeDasharray: C, strokeDashoffset: C * (1 - progress / target), style: { transition: "stroke-dashoffset 0.2s ease" }
        })
      ),
      React.createElement("span", { className: "relative text-2xl font-bold", style: { color: PRIMARY } }, toBn(progress))
    ),
    React.createElement(
      "div",
      { className: "min-w-0 flex-1" },
      React.createElement("div", { className: "text-base font-bold", style: { color: PRIMARY } }, "তাসবীহ"),
      React.createElement("div", { className: "text-xs text-slate-500" }, "/" + toBn(target) + " · বৃত্তে ট্যাপ করলেই গোনা শুরু")
    ),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: nextTarget,
        "aria-label": "লক্ষ্য বদলান",
        className: "shrink-0 min-h-11 rounded-full border px-3 text-xs font-bold",
        style: { borderColor: "#BFE3DA", background: "#F0FBF8", color: PRIMARY }
      },
      others.map(toBn).join(" · ") + " ›"
    )
  );
}
