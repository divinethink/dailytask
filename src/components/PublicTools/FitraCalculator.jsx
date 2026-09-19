// FitraCalculator.jsx — "সহায়িকা"→"ইসলামি টুলস ও ট্র্যাকিং", item ১২(3_1 Phase B)।
// Pure calculator(কোনো storage/state persist না)। Calculation logic
// publicToolsFitra.js(data/lib layer)-এ, এই ফাইলে শুধু UI।
// React global(window.React, globals.js)।

import { toBn } from "../../legacy/appHelpers.js";
import { calculateFitra, FITRA_GRAIN_WEIGHT_KG, FITRA_GRAIN_LABELS } from "../../legacy/publicToolsFitra.js";

const { useState } = React;

function numOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatTaka(n) {
  return toBn(Math.round(n).toLocaleString("en-US"));
}

const GRAIN_OPTIONS = Object.keys(FITRA_GRAIN_LABELS);

export function FitraCalculator() {
  const [grain, setGrain] = useState("wheat");
  const [pricePerKg, setPricePerKg] = useState("");
  const [headCount, setHeadCount] = useState("1");
  const [result, setResult] = useState(null);

  function handleCalculate() {
    const r = calculateFitra({ grain, pricePerKg: numOrZero(pricePerKg), headCount: numOrZero(headCount) });
    setResult(r);
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "px-4 pb-6 flex flex-col gap-4" },
    /*#__PURE__*/React.createElement(
      "p",
      { className: "text-xs text-slate-500" },
      "শস্যের আজকের কেজি-দর নিজে লিখুন — কোনো live দর স্বয়ংক্রিয়ভাবে আনা হয় না।"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-3" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex flex-col gap-1" },
        /*#__PURE__*/React.createElement("label", { className: "text-xs text-slate-600" }, "শস্য বেছে নিন"),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "flex gap-2" },
          GRAIN_OPTIONS.map((g) =>
            /*#__PURE__*/React.createElement(
              "button",
              {
                key: g,
                type: "button",
                onClick: () => setGrain(g),
                className:
                  "flex-1 py-2 rounded-xl text-sm font-semibold border " +
                  (grain === g ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white"),
                style: grain === g ? { background: "var(--theme-primary, #0E4B43)" } : undefined,
              },
              FITRA_GRAIN_LABELS[g]
            )
          )
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-[11px] text-slate-400" },
          "নির্ধারিত পরিমাণ: " + toBn(FITRA_GRAIN_WEIGHT_KG[grain]) + " কেজি/জন"
        )
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex flex-col gap-1" },
        /*#__PURE__*/React.createElement("label", { className: "text-xs text-slate-600" }, "কেজি-দর(৳)"),
        /*#__PURE__*/React.createElement("input", {
          type: "number",
          min: "0",
          inputMode: "decimal",
          value: pricePerKg,
          placeholder: "০",
          onChange: (e) => setPricePerKg(e.target.value),
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-700",
        })
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex flex-col gap-1" },
        /*#__PURE__*/React.createElement("label", { className: "text-xs text-slate-600" }, "পরিবারের সদস্য-সংখ্যা"),
        /*#__PURE__*/React.createElement("input", {
          type: "number",
          min: "0",
          step: "1",
          inputMode: "numeric",
          value: headCount,
          onChange: (e) => setHeadCount(e.target.value),
          className: "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-700",
        })
      ),
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: handleCalculate,
          className: "mt-1 w-full py-3 rounded-xl text-white font-semibold text-sm",
          style: { background: "var(--theme-primary, #0E4B43)" },
        },
        "হিসাব করুন"
      )
    ),
    result && /*#__PURE__*/React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-2" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex items-center justify-between text-sm" },
        /*#__PURE__*/React.createElement("span", { className: "text-slate-600" }, "জনপ্রতি ফিতরা"),
        /*#__PURE__*/React.createElement("span", { className: "font-semibold text-emerald-950" }, "৳" + formatTaka(result.perHead))
      ),
      /*#__PURE__*/React.createElement("div", { className: "h-px bg-slate-100 my-1" }),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-xs text-slate-600" },
        toBn(result.headCount) + " জনের মোট ফিতরা"
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-2xl font-bold", style: { fontFamily: "'Hind Siliguri', sans-serif", color: "var(--theme-primary, #0E4B43)" } },
        "৳" + formatTaka(result.total)
      )
    ),
    /*#__PURE__*/React.createElement(
      "p",
      { className: "text-[11px] text-slate-400" },
      "এই হিসাব Hanafi মাযহাব-ভিত্তিক আনুমানিক ওজন ব্যবহার করে — নির্দিষ্ট মাসআলার জন্য স্থানীয় আলেমের পরামর্শ নিন।"
    )
  );
}
