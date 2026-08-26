// A4 G4 (part A) — Member Key(Password) view/create/change modal, extracted
// verbatim from legacy App(). Structural-only (Owner Rule 2): original
// show*/setShow* state becomes {show, onClose} props (state ownership stays
// in App()); all other state/handlers passed through as props exactly as
// referenced before. JSX body unchanged.
import { Check, EyeIcon, EyeOffIcon, Loader2, X } from "./icons.jsx";

export function MemberKeyModal({
  show,
  memberKeyTarget,
  onClose,
  memberKeyLoading,
  memberKeyValue,
  setMemberKeyValue,
  memberKeyRevealed,
  setMemberKeyRevealed,
  showChangeKeyForm,
  setShowChangeKeyForm,
  manualKeyInput,
  setManualKeyInput,
  confirmKeyInput,
  setConfirmKeyInput,
  memberKeyBusy,
  setMemberKeyBusy,
  isMemberKeyCharsetValid,
  changeMemberKey
}) {
  return show && memberKeyTarget && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, memberKeyTarget.name, "-এর Member Password"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, { size: 18, className: "text-slate-400" }))),
  /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "গুগল ছাড়া লগইন করতে গেলে মেম্বার পাসওয়ার্ড লাগবে। এটি গোপন এবং নিরাপদে সংরক্ষণ করুন।"),
  memberKeyLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center py-4"
  }, /*#__PURE__*/React.createElement(Loader2, { className: "animate-spin", size: 18, color: "var(--theme-primary)" })) : memberKeyValue == null ? /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3"
  }, "এই সদস্যের জন্য এখনো কোনো Key তৈরি হয়নি। নিচের বাটনে ট্যাপ করে একটি তৈরি করুন।") : /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-400 mb-1 block"
  }, "বর্তমান Password"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: memberKeyRevealed ? "text" : "password",
    value: memberKeyValue || "",
    readOnly: true,
    disabled: true,
    className: "w-full h-10 px-3 pr-9 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50 text-slate-500 disabled:opacity-100",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setMemberKeyRevealed(v => !v),
    "aria-label": memberKeyRevealed ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন",
    className: "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
  }, memberKeyRevealed ? /*#__PURE__*/React.createElement(EyeOffIcon, { size: 16 }) : /*#__PURE__*/React.createElement(EyeIcon, { size: 16 })))),
  (showChangeKeyForm || memberKeyValue == null) && /*#__PURE__*/React.createElement(React.Fragment, null,
  /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-400 mb-1 block"
  }, "নতুন Password দিন"),
  /*#__PURE__*/React.createElement("div", {
    className: "relative mb-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: manualKeyInput,
    onChange: e => setManualKeyInput(e.target.value),
    disabled: memberKeyBusy || memberKeyLoading,
    placeholder: "নতুন Password দিন (কমপক্ষে ৬ ক্যারেক্টার)",
    className: "w-full h-10 px-3 pr-9 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#0E4B43] transition-colors disabled:opacity-50",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), manualKeyInput && confirmKeyInput && /*#__PURE__*/React.createElement("div", {
    className: "absolute right-2 top-1/2 -translate-y-1/2"
  }, manualKeyInput === confirmKeyInput
    ? /*#__PURE__*/React.createElement(Check, { size: 16, className: "text-emerald-600" })
    : /*#__PURE__*/React.createElement(X, { size: 16, className: "text-red-500" }))),
  /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-slate-400 mb-1.5"
  }, "(কমপক্ষে ৬ ক্যারেক্টার — ইংরেজি অক্ষর, সংখ্যা ও ! @ # $ % & * + _ - চিহ্ন ব্যবহার করে জটিল Password তৈরি করুন।)"),
  /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-400 mb-1 block"
  }, "Password কনফার্ম করুন"),
  /*#__PURE__*/React.createElement("div", {
    className: "relative mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: confirmKeyInput,
    onChange: e => setConfirmKeyInput(e.target.value),
    disabled: memberKeyBusy || memberKeyLoading,
    placeholder: "একই Password আবার দিন",
    className: "w-full h-10 px-3 pr-9 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#0E4B43] transition-colors disabled:opacity-50",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), manualKeyInput && confirmKeyInput && /*#__PURE__*/React.createElement("div", {
    className: "absolute right-2 top-1/2 -translate-y-1/2"
  }, manualKeyInput === confirmKeyInput
    ? /*#__PURE__*/React.createElement(Check, { size: 16, className: "text-emerald-600" })
    : /*#__PURE__*/React.createElement(X, { size: 16, className: "text-red-500" })))
  ),
  /*#__PURE__*/React.createElement("button", {
    disabled: memberKeyBusy || memberKeyLoading,
    onClick: async () => {
      if (!(showChangeKeyForm || memberKeyValue == null)) {
        setShowChangeKeyForm(true);
        return;
      }
      const manual = manualKeyInput.trim();
      const confirmVal = confirmKeyInput.trim();
      if (!manual) {
        alert("নতুন Password লিখুন (কমপক্ষে ৬ ক্যারেক্টার)।");
        return;
      }
      if (manual.length < 6) {
        alert("Password কমপক্ষে ৬ ক্যারেক্টারের হতে হবে।");
        return;
      }
      if (!isMemberKeyCharsetValid(manual)) {
        alert("অনুগ্রহ করে শুধু English Alphabet ব্যবহার করুন।");
        return;
      }
      if (manual !== confirmVal) {
        alert("দুই Password মেলেনি। আবার চেষ্টা করুন।");
        return;
      }
      setMemberKeyBusy(true);
      try {
        const key = await changeMemberKey(memberKeyTarget.id, manual);
        setMemberKeyValue(key);
        setMemberKeyRevealed(true);
        setManualKeyInput("");
        setConfirmKeyInput("");
        setShowChangeKeyForm(false);
        alert("সফলভাবে পাসওয়ার্ড পরিবর্তন হয়েছে।");
      } catch (err) {
        alert("Password তৈরি/পরিবর্তন করতে সমস্যা হয়েছে: " + err.message);
      } finally {
        setMemberKeyBusy(false);
      }
    },
    className: "w-full py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white mb-2 disabled:opacity-50"
  }, memberKeyBusy ? "তৈরি হচ্ছে..." : (memberKeyValue == null ? "Password তৈরি করুন" : "Member Password পরিবর্তন করুন")),
  /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-full py-2 rounded-xl text-xs font-bold bg-[#C89B3C] text-[#16302B]"
  }, "বন্ধ করুন")));
}
