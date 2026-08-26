// A4 G4 (part D) — Member Requests admin-approval panel, extracted verbatim
// from legacy App(). Structural-only (Owner Rule 2): original show*/setShow*
// state becomes {show, onClose} props (state ownership stays in App()); all
// other state/handlers passed through as props exactly as referenced before.
// JSX body unchanged.
import { Loader2, X } from "./icons.jsx";

export function MemberRequestsModal({
  show,
  onClose,
  loadingMemberRequests,
  pendingMemberRequests,
  decideMemberRequest
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "সদস্য অনুরোধ"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, { size: 18, className: "text-slate-400" }))),
  loadingMemberRequests ? /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center py-6"
  }, /*#__PURE__*/React.createElement(Loader2, { className: "animate-spin", size: 20, color: "var(--theme-primary)" })) : pendingMemberRequests.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 py-3 text-center"
  }, "কোনো পেন্ডিং অনুরোধ নেই।") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 max-h-72 overflow-y-auto"
  }, pendingMemberRequests.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    className: "flex items-center justify-between gap-2 border border-slate-100 rounded-xl px-3 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-700 font-semibold truncate"
  }, r.name), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => decideMemberRequest(r, "approved"),
    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-700 text-white"
  }, "অনুমোদন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => decideMemberRequest(r, "denied"),
    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-600"
  }, "প্রত্যাখ্যান")))))));
}
