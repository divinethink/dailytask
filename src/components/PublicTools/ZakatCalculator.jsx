// ZakatCalculator.jsx — "সহায়িকা"→"ইসলামি টুলস ও ট্র্যাকিং", item ১১(3_1 Phase B)।
// Pure calculator(কোনো storage/state persist না, প্রতিবার re-open-এ ফাঁকা ফর্ম)।
// Calculation logic publicToolsZakat.js(data/lib layer)-এ, এই ফাইলে শুধু UI।
// React global(window.React, globals.js)।

import { toBn } from "../../legacy/appHelpers.js";
import { calculateZakat, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS } from "../../legacy/publicToolsZakat.js";

const { useState } = React;

function numOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatTaka(n) {
  return toBn(Math.round(n).toLocaleString("en-US"));
}

function FieldRow({ label, value, onChange, placeholder }) {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex flex-col gap-1" },
    /*#__PURE__*/React.createElement("label", { className: "text-xs text-slate-600" }, label),
    /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      inputMode: "decimal",
      value: value,
      placeholder: placeholder || "০",
      onChange: (e) => onChange(e.target.value),
      className: "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-700",
    })
  );
}

export function ZakatCalculator() {
  const [cash, setCash] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [goldPrice, setGoldPrice] = useState("");
  const [silverGrams, setSilverGrams] = useState("");
  const [silverPrice, setSilverPrice] = useState("");
  const [investments, setInvestments] = useState("");
  const [debts, setDebts] = useState("");
  const [result, setResult] = useState(null);

  function handleCalculate() {
    const r = calculateZakat({
      cash: numOrZero(cash),
      goldGrams: numOrZero(goldGrams),
      goldPricePerGram: numOrZero(goldPrice),
      silverGrams: numOrZero(silverGrams),
      silverPricePerGram: numOrZero(silverPrice),
      investments: numOrZero(investments),
      debts: numOrZero(debts),
    });
    setResult(r);
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "px-4 pb-6 flex flex-col gap-4" },
    /*#__PURE__*/React.createElement(
      "p",
      { className: "text-xs text-slate-500" },
      "নিসাব-হিসাবের জন্য সোনা/রুপার আজকের বাজার-দর(টাকা/গ্রাম) নিজে লিখুন — কোনো live দর এই মুহূর্তে স্বয়ংক্রিয়ভাবে আনা হয় না।"
    ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-3" },
      /*#__PURE__*/React.createElement(FieldRow, { label: "নগদ টাকা+ব্যাংক ব্যালেন্স(৳)", value: cash, onChange: setCash }),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-2" },
        /*#__PURE__*/React.createElement(FieldRow, { label: "সোনা(গ্রাম)", value: goldGrams, onChange: setGoldGrams }),
        /*#__PURE__*/React.createElement(FieldRow, { label: "সোনার দর(৳/গ্রাম)", value: goldPrice, onChange: setGoldPrice })
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-2" },
        /*#__PURE__*/React.createElement(FieldRow, { label: "রুপা(গ্রাম)", value: silverGrams, onChange: setSilverGrams }),
        /*#__PURE__*/React.createElement(FieldRow, { label: "রুপার দর(৳/গ্রাম)", value: silverPrice, onChange: setSilverPrice })
      ),
      /*#__PURE__*/React.createElement(FieldRow, { label: "বিনিয়োগ/অন্যান্য সম্পদ(৳)", value: investments, onChange: setInvestments }),
      /*#__PURE__*/React.createElement(FieldRow, { label: "ঋণ/দেনা(৳)", value: debts, onChange: setDebts }),
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
        /*#__PURE__*/React.createElement("span", { className: "text-slate-600" }, "মোট সম্পদ(ঋণ বাদে)"),
        /*#__PURE__*/React.createElement("span", { className: "font-semibold text-emerald-950" }, "৳" + formatTaka(result.netAssets))
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex items-center justify-between text-sm" },
        /*#__PURE__*/React.createElement("span", { className: "text-slate-600" }, "নিসাব সীমা"),
        /*#__PURE__*/React.createElement(
          "span",
          { className: "font-semibold text-slate-700" },
          result.nisab > 0 ? "৳" + formatTaka(result.nisab) : "দর দেওয়া হয়নি"
        )
      ),
      /*#__PURE__*/React.createElement("div", { className: "h-px bg-slate-100 my-1" }),
      result.nisab === 0
        ? /*#__PURE__*/React.createElement("p", { className: "text-xs text-amber-700" }, "নিসাব বের করতে সোনা বা রুপার দর দিন।")
        : /*#__PURE__*/React.createElement(
            "div",
            { className: "flex flex-col gap-1" },
            /*#__PURE__*/React.createElement(
              "div",
              { className: "text-xs font-semibold", style: { color: result.eligible ? "#2F9E44" : "#5B6B64" } },
              result.eligible ? "নিসাব অতিক্রম করেছে — যাকাত প্রযোজ্য" : "নিসাবের নিচে — যাকাত প্রযোজ্য না"
            ),
            /*#__PURE__*/React.createElement(
              "div",
              { className: "text-2xl font-bold", style: { fontFamily: "'Hind Siliguri', sans-serif", color: "var(--theme-primary, #0E4B43)" } },
              "৳" + formatTaka(result.zakatDue)
            ),
            /*#__PURE__*/React.createElement("div", { className: "text-xs text-slate-400" }, "(মোট সম্পদের ২.৫%)")
          )
    ),
    /*#__PURE__*/React.createElement(
      "p",
      { className: "text-[11px] text-slate-400" },
      "নিসাব: সোনা " + toBn(GOLD_NISAB_GRAMS) + " গ্রাম অথবা রুপা " + toBn(SILVER_NISAB_GRAMS) + " গ্রাম(যেটার মূল্য কম, সেটাই ব্যবহৃত)। এটা সাধারণ হিসাব — নির্দিষ্ট মাসআলার জন্য স্থানীয় আলেমের পরামর্শ নিন।"
    )
  );
}
