// A4 G1 — History modal, extracted verbatim from legacy App(). Structural-only:
// show*/setShow* state -> {show, onClose} props; loadingHistory/historyList/
// restoreHistoryVersion/formatBnDateTime passed through as props (state/logic
// ownership stays in App()). JSX body unchanged.
import { ClockIcon, Loader2, X } from "./icons.jsx";

export function HistoryModal({ show, onClose, loadingHistory, historyList, restoreHistoryVersion, formatBnDateTime }) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100 max-h-[75vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ClockIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " এন্ট্রি ইতিহাস"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "সর্বশেষ ৫টি পূর্ববর্তী সংস্করণ এখানে দেখা যাবে। পুনরুদ্ধার করলে সেই সংস্করণটি ফর্মে বসে যাবে — পরিবর্তন সংরক্ষণ করতে আবার \"সেভ করুন\" বাটনে চাপ দিতে হবে।"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-y-auto custom-scrollbar space-y-2 flex-1"
  }, loadingHistory ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center py-8"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    color: "var(--theme-primary)",
    size: 22
  })) : historyList.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 text-center py-6"
  }, "কোনো পূর্ববর্তী সংস্করণ নেই — এই দিনের এন্ট্রি এখনো এডিট করা হয়নি।") : historyList.map(h => /*#__PURE__*/React.createElement("div", {
    key: h.id,
    className: "flex items-center justify-between gap-2 border border-slate-200 rounded-xl p-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-slate-600"
  }, formatBnDateTime(h.editedAt)), /*#__PURE__*/React.createElement("button", {
    onClick: () => restoreHistoryVersion(h.value),
    className: "text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0"
  }, "পুনরুদ্ধার করুন")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 mt-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shrink-0"
  }, "বন্ধ করুন")));
}
