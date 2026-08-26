// A4 G3+G5 — Family Code Lifecycle (Choice/Create/Join/Rename) modals + Access
// Requests modal, extracted verbatim from legacy App(). Structural-only (Owner
// Rule 2): original show*/setShow* state becomes {show, onClose} props (state
// ownership stays in App()); all other state/handlers/constants passed through
// as props exactly as referenced before. JSX body unchanged.
import { Check, EditIcon, EyeIcon, EyeOffIcon, Loader2, X } from "./icons.jsx";

export function FamilyCodeChoiceModal({
  show,
  onClose,
  isAdmin,
  setRenameFamCodeInput,
  setShowRenameFamilyCodeModal
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-3 text-slate-800"
  }, "ফ্যামিলি ইউজারনেম"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, isAdmin && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      onClose();
      setRenameFamCodeInput("");
      setShowRenameFamilyCodeModal(true);
    },
    className: "w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 text-xs font-semibold border border-slate-100"
  }, /*#__PURE__*/React.createElement(EditIcon, {
    size: 13
  }), " বিদ্যমান ফ্যামিলি ইউজারনেম পরিবর্তন করুন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold mt-3"
  }, "বাতিল")));
}

export function CreateNewFamilyModal({
  show,
  onClose,
  newFamCodeInput,
  setNewFamCodeInput,
  newFamCodeBusy,
  handleCreateNewFamily
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "নতুন ফ্যামিলি ইউজারনেম তৈরি করুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "একটি অনন্য কোড দিন — এটি সম্পূর্ণ নতুন, খালি একটি ফ্যামিলি স্পেস তৈরি করবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডেটা অক্ষত থাকবে। ছোট/বড় হাতের ইংরেজি অক্ষর, সংখ্যা ও বিশেষ চিহ্ন ব্যবহার করা যাবে (space, /, \\, ' এবং \" ছাড়া), কমপক্ষে ৯ ক্যারেক্টার।"), /*#__PURE__*/React.createElement("input", {
    name: "family-code",
    autoComplete: "username",
    value: newFamCodeInput,
    onChange: e => setNewFamCodeInput(e.target.value),
    placeholder: "যেমন: Fam-Khan-2026",
    maxLength: 30,
    disabled: newFamCodeBusy,
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-bold text-emerald-900 focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCreateNewFamily,
    disabled: newFamCodeBusy,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
  }, newFamCodeBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : "তৈরি করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    disabled: newFamCodeBusy,
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল"))));
}

export function JoinFamilyModal({
  show,
  onClose,
  joinFamCodeInput,
  setJoinFamCodeInput,
  joinFamCodeBusy,
  handleJoinExistingFamily
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "বিদ্যমান ফ্যামিলি ইউজারনেম দিয়ে যোগ দিন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "যে ফ্যামিলিতে যোগ দিতে চান তার কোড লিখুন — এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে এবং আপনার যোগদানের অনুরোধ সেই ফ্যামিলির Admin-এর অনুমোদনের অপেক্ষায় থাকবে। বর্তমান ফ্যামিলির ডেটা অক্ষত থাকবে।"), /*#__PURE__*/React.createElement("input", {
    name: "family-code",
    autoComplete: "username",
    value: joinFamCodeInput,
    onChange: e => setJoinFamCodeInput(e.target.value),
    placeholder: "যেমন: FAM-XXXXXXXXX",
    maxLength: 30,
    disabled: joinFamCodeBusy,
    className: "w-full h-10 border border-slate-200 rounded-xl px-3 text-xs mb-4 outline-none font-bold text-emerald-900 focus:border-emerald-800"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleJoinExistingFamily,
    disabled: joinFamCodeBusy,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
  }, joinFamCodeBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : "যোগ দিন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    disabled: joinFamCodeBusy,
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল"))));
}

export function RenameFamilyCodeModal({
  show,
  onClose,
  showRenameChangeForm,
  setShowRenameChangeForm,
  renameFamCodeInput,
  setRenameFamCodeInput,
  renameConfirmInput,
  setRenameConfirmInput,
  renameFamCodeBusy,
  renameCodeRevealed,
  setRenameCodeRevealed,
  getFamilyCode,
  handleRenameFamilyCode,
  FAMILY_CODE_MIN_LENGTH
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "নিজের ফ্যামিলি ইউজারনেম পরিবর্তন করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onClose();
      setShowRenameChangeForm(false);
      setRenameFamCodeInput("");
      setRenameConfirmInput("");
    }
  }, /*#__PURE__*/React.createElement(X, { size: 18, className: "text-slate-400" }))),
  /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "পরিবর্তন করলে পরিবারের সব সদস্যের ডিভাইসে অটো নতুন ইউজারনেম বসে যাবে। ডেটা অক্ষত থাকবে।"),
  /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-400 mb-1 block"
  }, "বর্তমান ইউজারনেম"),
  /*#__PURE__*/React.createElement("div", {
    className: "relative mb-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: renameCodeRevealed ? "text" : "password",
    value: getFamilyCode(),
    readOnly: true,
    disabled: true,
    className: "w-full h-10 px-3 pr-9 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50 text-slate-500 disabled:opacity-100",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setRenameCodeRevealed(v => !v),
    "aria-label": renameCodeRevealed ? "ইউজারনেম লুকান" : "ইউজারনেম দেখুন",
    className: "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
  }, renameCodeRevealed ? /*#__PURE__*/React.createElement(EyeOffIcon, { size: 16 }) : /*#__PURE__*/React.createElement(EyeIcon, { size: 16 }))),
  showRenameChangeForm && /*#__PURE__*/React.createElement(React.Fragment, null,
  /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-400 mb-1 block"
  }, "নতুন ইউজারনেম দিন"),
  /*#__PURE__*/React.createElement("div", {
    className: "relative mb-1"
  }, /*#__PURE__*/React.createElement("input", {
    name: "family-code",
    autoComplete: "username",
    type: "text",
    value: renameFamCodeInput,
    onChange: e => setRenameFamCodeInput(e.target.value),
    disabled: renameFamCodeBusy,
    placeholder: "নতুন ইউজারনেম দিন (কমপক্ষে ৬ ক্যারেক্টার)",
    maxLength: 30,
    className: "w-full h-10 px-3 pr-9 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#0E4B43] transition-colors disabled:opacity-50",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), renameFamCodeInput && renameConfirmInput && /*#__PURE__*/React.createElement("div", {
    className: "absolute right-2 top-1/2 -translate-y-1/2"
  }, renameFamCodeInput === renameConfirmInput
    ? /*#__PURE__*/React.createElement(Check, { size: 16, className: "text-emerald-600" })
    : /*#__PURE__*/React.createElement(X, { size: 16, className: "text-red-500" }))),
  /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-slate-400 mb-1.5"
  }, "(কমপক্ষে ৬ ডিজিটের হতে হবে — ইংরেজি অক্ষর, সংখ্যা ও জটিল চিহ্ন ব্যবহার করা যাবে।)"),
  /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-slate-400 mb-1 block"
  }, "ইউজারনেম কনফার্ম করুন"),
  /*#__PURE__*/React.createElement("div", {
    className: "relative mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: renameConfirmInput,
    onChange: e => setRenameConfirmInput(e.target.value),
    disabled: renameFamCodeBusy,
    placeholder: "একই ইউজারনেম আবার দিন",
    className: "w-full h-10 px-3 pr-9 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#0E4B43] transition-colors disabled:opacity-50",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), renameFamCodeInput && renameConfirmInput && /*#__PURE__*/React.createElement("div", {
    className: "absolute right-2 top-1/2 -translate-y-1/2"
  }, renameFamCodeInput === renameConfirmInput
    ? /*#__PURE__*/React.createElement(Check, { size: 16, className: "text-emerald-600" })
    : /*#__PURE__*/React.createElement(X, { size: 16, className: "text-red-500" })))
  ),
  /*#__PURE__*/React.createElement("button", {
    disabled: renameFamCodeBusy,
    onClick: async () => {
      if (!showRenameChangeForm) {
        setShowRenameChangeForm(true);
        return;
      }
      const code = renameFamCodeInput.trim();
      const confirmVal = renameConfirmInput.trim();
      if (!code) {
        alert("নতুন ইউজারনেম লিখুন (কমপক্ষে ৬ ক্যারেক্টার)।");
        return;
      }
      if (code.length < FAMILY_CODE_MIN_LENGTH) {
        alert(`ইউজারনেম কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
        return;
      }
      if (code !== confirmVal) {
        alert("দুই ইউজারনেম মেলেনি। আবার চেষ্টা করুন।");
        return;
      }
      await handleRenameFamilyCode();
    },
    className: "w-full py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white mb-2 disabled:opacity-50 flex items-center justify-center gap-1"
  }, renameFamCodeBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : "ফ্যামিলি ইউজারনেম পরিবর্তন করুন"),
  /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onClose();
      setShowRenameChangeForm(false);
      setRenameFamCodeInput("");
      setRenameConfirmInput("");
    },
    disabled: renameFamCodeBusy,
    className: "w-full py-2 rounded-xl text-xs font-bold bg-[#C89B3C] text-[#16302B]"
  }, "বন্ধ করুন")));
}

export function AccessRequestsModal({
  show,
  onClose,
  loadingAccessRequests,
  pendingAccessRequests,
  decideAccessRequest
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "প্রবেশাধিকার অনুরোধ"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), loadingAccessRequests ? /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center py-6"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 20,
    color: "var(--theme-primary)"
  })) : pendingAccessRequests.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 py-3 text-center"
  }, "কোনো পেন্ডিং অনুরোধ নেই।") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 max-h-72 overflow-y-auto"
  }, pendingAccessRequests.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    className: "flex items-center justify-between gap-2 border border-slate-100 rounded-xl px-3 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600 truncate",
    title: r.id
  }, r.id.slice(0, 10) + "…"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => decideAccessRequest(r.id, "approved"),
    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-700 text-white"
  }, "অনুমোদন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => decideAccessRequest(r.id, "denied"),
    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-600"
  }, "প্রত্যাখ্যান")))))));
}
