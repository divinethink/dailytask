// A4 G1 — Profile dropdown, extracted verbatim from legacy App(). Structural-only.
// NOTE: unlike other G1 pieces this is NOT purely presentational — it embeds Member
// Password fetch, self-demote, Google-link trigger, and logout calls exactly as they
// were in App() (Owner Rule 2: move as-is, no logic change). State ownership stays in
// App(); everything below is passed as props.
import { CalIcon, ChevronDown, GoogleIcon, KeyIcon, LogOutIcon, User } from "./icons.jsx";

export function ProfileDropdown({
  show,
  onClose,
  BN_MONTHS,
  adminUidsList,
  auth,
  fetchMemberKey,
  firstAdminUid,
  handleChangeGmail,
  handleFullLogout,
  handleSelfDemote,
  isGoogleLinked,
  members,
  selectedMember,
  setConfirmKeyInput,
  setManualKeyInput,
  setMemberKeyLoading,
  setMemberKeyRevealed,
  setMemberKeyTarget,
  setMemberKeyValue,
  setShowAccountMenu,
  setShowChangeKeyForm,
  setShowGoogleAccountModal,
  setShowMemberKeyModal,
  showAccountMenu,
  streak
}) {
  return show && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => onClose()
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 text-xs"
  }, (() => {
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    const ownMember = (members || []).find(x => myUid && x.ownerUids?.includes(myUid)) || null;
    const amAdmin = !!(myUid && adminUidsList.includes(myUid));
    let sinceText = null;
    if (ownMember && ownMember.createdAt) {
      const d = new Date(ownMember.createdAt);
      sinceText = `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBn(d.getFullYear())}`;
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-2 border-b border-slate-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-emerald-900 text-sm"
    }, ownMember ? ownMember.name : (selectedMember ? selectedMember.name : "প্রোফাইল")), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-slate-500 flex items-center gap-0.5"
    }, "🔥 ", /*#__PURE__*/React.createElement("b", {
      className: "text-slate-700 font-semibold"
    }, "ধারাবাহিকতার ", toBn(streak), " দিন"))), /*#__PURE__*/React.createElement("span", {
      className: `inline-block mt-1 text-[9px] font-bold px-1 py-[1px] rounded border bg-slate-100 ${amAdmin ? "text-[#8a6a1f] border-slate-200" : "text-slate-500 border-slate-200"}`
    }, amAdmin ? (firstAdminUid && ownMember?.ownerUids?.includes(firstAdminUid) ? "এডমিন (প্রথম এডমিন)" : "এডমিন") : "সদস্য"), amAdmin && adminUidsList.length > 1 && /*#__PURE__*/React.createElement("div", {
      className: "mt-1"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleSelfDemote(),
      className: "text-left text-red-500 text-[9px] font-medium hover:underline"
    }, "এডমিন পদ হতে অব্যাহতি নিন"))), /*#__PURE__*/React.createElement("div", {
      className: "px-4 py-2 space-y-1 text-slate-500"
    }, sinceText && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(CalIcon, { size: 12 }), "যোগ দিয়েছেন: ", /*#__PURE__*/React.createElement("span", {
      className: "text-slate-700 font-normal"
    }, sinceText))), ownMember && /*#__PURE__*/React.createElement("div", {
      className: "px-2 pt-1 border-t border-slate-100"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setMemberKeyTarget(ownMember);
        setMemberKeyValue(null);
        setMemberKeyLoading(true);
        setMemberKeyRevealed(false);
        setManualKeyInput("");
        setConfirmKeyInput("");
        setShowChangeKeyForm(false);
        setShowMemberKeyModal(true);
        onClose();
        fetchMemberKey(ownMember.id)
          .then(v => { setMemberKeyValue(v); setMemberKeyLoading(false); })
          .catch(() => { setMemberKeyValue(null); setMemberKeyLoading(false); });
      },
      className: "w-full text-left px-2 py-1.5 rounded-xl hover:bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(KeyIcon, { size: 13 }), "আপনার ", /*#__PURE__*/React.createElement("b", { style: { color: "#C89B3C" } }, "Member Password"), " দেখুন")), /*#__PURE__*/React.createElement("div", {
      className: "px-2 pt-1 border-t border-slate-100"
    }, isGoogleLinked() ? /*#__PURE__*/React.createElement("div", {
      className: "relative"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        setShowAccountMenu(v => !v);
      },
      className: "w-full text-left px-2 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700"
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-2 font-semibold text-emerald-900 text-xs truncate max-w-[160px]"
    }, /*#__PURE__*/React.createElement(User, {
      size: 13
    }), " ", (auth.currentUser && (auth.currentUser.displayName || auth.currentUser.email)) || "Google ব্যবহারকারী"), /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-1.5 shrink-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-2 h-2 rounded-full bg-emerald-500"
    }), /*#__PURE__*/React.createElement(ChevronDown, {
      size: 12,
      className: `transition-transform duration-200 ${showAccountMenu ? "rotate-180" : ""}`
    }))), showAccountMenu && /*#__PURE__*/React.createElement("div", {
      className: "border-t border-slate-100 bg-slate-50/60"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: handleChangeGmail,
      className: "w-full text-left pl-9 pr-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700 text-xs"
    }, /*#__PURE__*/React.createElement(LogOutIcon, {
      size: 13
    }), " জিমেইল পরিবর্তন করুন"))) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setShowGoogleAccountModal(true);
        onClose();
      },
      className: "inline-flex items-center gap-1 text-[9px] font-bold px-1 py-[1px] rounded border bg-slate-100 text-amber-800 border-slate-200 hover:bg-amber-50"
    }, /*#__PURE__*/React.createElement(GoogleIcon, {
      size: 10
    }), " Google-এ যুক্ত হোন")), /*#__PURE__*/React.createElement("div", {
      className: "px-2 pt-1 mt-1 border-t border-slate-100"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleFullLogout(),
      className: "w-full text-left px-2 py-1.5 rounded-xl hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(LogOutIcon, { size: 13 }), "লগআউট")));
  })()));
}
