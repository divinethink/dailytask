// A4-G6-Part A — Dashboard Header/Nav (logo, greeting, hamburger dropdown menu
// with MemberListSection, notification+profile wiring, member selector, inline
// add-member form), extracted verbatim from legacy App() (app.js lines ~6765-7014).
// Structural-only (Owner Rule 2): no logic/condition change, only moved to its own
// file. State ownership stays in App() (Owner Rule 2) — all state/handlers passed
// as explicit props, including module-level helpers (db, auth, toBn, etc.) that
// are NOT true globals (lesson from G1 toBn prop-miss bug — nothing assumed global
// except React and icons.jsx imports).
import { CalIcon, ChevronDown, CopyIcon, DownloadIcon, EditIcon, MenuIcon, MessageSquare, ShareIcon, UploadIcon, User, X } from "./icons.jsx";
import { MemberListSection } from "./MemberListSection.jsx";
import { NotificationPanel } from "./NotificationPanel.jsx";
import { ProfileDropdownGoogle } from "./ProfileDropdownGoogle.jsx";

export function DashboardHeader({
  activeInviteToken,
  addingMember,
  adminUidsList,
  copiedCode,
  entryDirtyRef,
  firstAdminUid,
  isGuestMode,
  onGuestSignInTap,
  handleAddMember,
  handleChangeGmail,
  handleCopyCode,
  handleFullLogout,
  handleEditOwnProfile,
  handleLeaveFamily,
  handleMakeAdmin,
  handleReleaseMember,
  handleRemoveAdmin,
  handleRemoveMember,
  handleRevokeInviteLink,
  handleSelfDemote,
  handleShareInviteLink,
  isAdmin,
  isLockedForSwitch,
  isMenuOpen,
  members,
  monthCursor,
  newGender,
  newMemberEmail,
  newName,
  notifications,
  selectedId,
  selectedMember,
  setAddingMember,
  setArchiveMonth0,
  setArchiveYear,
  setDriveBackupStatus,
  setIsMenuOpen,
  setNewGender,
  setNewMemberEmail,
  setNewName,
  setNotifications,
  setSelectedId,
  setShowAccountMenu,
  setShowArchiveModal,
  setShowBackupOptionsModal,
  setShowFamilyCodeChoiceModal,
  setShowFeedbackModal,
  setShowGoogleAccountModal,
  setShowImportOptionsModal,
  setShowNotifPanel,
  setShowProfileDropdown,
  showAccountMenu,
  showNotifPanel,
  showProfileDropdown,
  streak,
  themeColorPickerEl,
  weeklyDirtyRef,
  AppLogo,
  BN_MONTHS,
  auth,
  db,
  getFamilyCode,
  getFamilyId,
  isGoogleLinked,
  toBn
}) {
  return React.createElement("div", {
    style: {
      background: "var(--theme-primary)"
    },
    className: "px-5 pt-6 pb-9 shadow-md relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement(AppLogo, {
    size: 34
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold tracking-tight",
    style: {
      fontFamily: "'Noto Serif Bengali', serif",
      color: "#F4F7F1"
    }
  }, "Daily Task"), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-emerald-200/80 -mt-1 font-medium"
  }, "আমল ও পারিবারিক ট্র্যাকার"))), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (isGuestMode) { onGuestSignInTap(); return; }
      const next = !isMenuOpen;
      setIsMenuOpen(next);
    },
    className: "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/15 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all shadow-sm active:scale-95"
  }, /*#__PURE__*/React.createElement(MenuIcon, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "মেনু"), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 14,
    className: `transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`
  })), isMenuOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => setIsMenuOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 text-xs transition-all"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-2 border-b border-slate-100 bg-slate-50/70"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, "ফ্যামিলি ইউজারনেম"), /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-emerald-900 text-sm flex items-center justify-between mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tracking-wide select-none"
  }, getFamilyCode()), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2 shrink-0 ml-2"
  }, copiedCode && /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] text-emerald-600 font-bold shrink-0"
  }, "কপি হয়েছে!"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      handleCopyCode();
    },
    className: "text-slate-500 hover:text-emerald-800 shrink-0",
    title: "কপি করুন"
  }, /*#__PURE__*/React.createElement(CopyIcon, {
    size: 13
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowFamilyCodeChoiceModal(true);
      setIsMenuOpen(false);
    },
    className: "text-slate-500 hover:text-emerald-800 shrink-0",
    title: "ফ্যামিলি ইউজারনেম পরিবর্তন করুন"
  }, /*#__PURE__*/React.createElement(EditIcon, {
    size: 13
  }))))), /*#__PURE__*/React.createElement(MemberListSection, {
    members: members,
    selectedId: selectedId,
    setSelectedId: setSelectedId,
    setIsMenuOpen: setIsMenuOpen,
    entryDirtyRef: entryDirtyRef,
    weeklyDirtyRef: weeklyDirtyRef,
    auth: auth,
    handleReleaseMember: handleReleaseMember,
    isLockedForSwitch: isLockedForSwitch,
    isAdmin: isAdmin,
    adminUidsList: adminUidsList,
    handleMakeAdmin: handleMakeAdmin,
    handleRemoveAdmin: handleRemoveAdmin,
    handleRemoveMember: handleRemoveMember,
    setAddingMember: setAddingMember
  }), isAdmin && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: async () => {
      try {
        await handleShareInviteLink();
      } catch {}
    },
    className: "w-full text-left px-4 py-1.5 text-emerald-800 font-semibold text-[11px] hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
  }, /*#__PURE__*/React.createElement(ShareIcon, { size: 12 }), "আমন্ত্রণ লিংক শেয়ার করুন"), activeInviteToken && !activeInviteToken.revoked && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: async () => {
      try {
        await handleRevokeInviteLink();
      } catch {}
    },
    className: "w-full text-left px-4 py-1.5 text-red-600 font-semibold text-[11px] hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
  }, "লিংক নিষ্ক্রিয় করুন")), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
  }, "ডেটা ম্যানেজমেন্ট"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDriveBackupStatus(null);
      setShowBackupOptionsModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 14
  }), " ডেটা ব্যাকআপ রাখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowImportOptionsModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), " ইম্পোর্ট ব্যাকআপ ফাইল"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setArchiveYear(monthCursor.year);
      setArchiveMonth0(monthCursor.month0);
      setShowArchiveModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
  }, /*#__PURE__*/React.createElement(CalIcon, {
    size: 14
  }), " আর্কাইভ দেখুন (মাস/সাল)")), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 my-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowFeedbackModal(true);
      setIsMenuOpen(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium text-emerald-800"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 14
  }), " আমাদের জানান (পরামর্শ বা সমস্যা)")), themeColorPickerEl)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      if (isGuestMode) { onGuestSignInTap(); return; }
      setShowProfileDropdown(v => !v);
    },
    className: "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform",
    style: {
      background: "#C89B3C",
      color: "#16302B"
    }
  }, /*#__PURE__*/React.createElement(User, {
    size: 13
  }), " ", isGuestMode ? "প্রোফাইল/নন-মেম্বার" : (selectedMember ? selectedMember.name : "সদস্য বেছে নিন"), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 12,
    className: `transition-transform duration-200 ${showProfileDropdown ? "rotate-180" : ""}`
  })), /*#__PURE__*/React.createElement(ProfileDropdownGoogle, {
  show: showProfileDropdown,
  onClose: () => setShowProfileDropdown(false),
  BN_MONTHS,
  toBn,
  // §Google-only Profile Dropdown(১১ সেপ্টেম্বর ২০২৬): "নিজের" member —
  // googleUid এই ডিভাইসের auth uid-এর সাথে মেলে। App()-এর boot-effect-এর
  // myOwnMember লজিকের(app.js) হুবহু একই derive-pattern, presentational
  // component-এই সীমাবদ্ধ(নতুন state না, শুধু render-time computation)।
  ownMember: (members || []).find(x => x.googleUid === (auth.currentUser ? auth.currentUser.uid : null)) || null,
  isAdmin,
  isFirstAdmin: !!(firstAdminUid && auth.currentUser && auth.currentUser.uid === firstAdminUid),
  streak,
  onDemoteSelf: handleSelfDemote,
  onEditProfile: handleEditOwnProfile,
  onLeaveFamily: handleLeaveFamily,
  onLogout: handleFullLogout
})), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      if (isGuestMode) { onGuestSignInTap(); return; }
      setShowNotifPanel(v => {
        const next = !v;
        if (next) {
          // §Notification System(২৩ আগস্ট ২০২৬ সংশোধন) — seen করলে item
          // panel থেকে সরে না(শুধু delete/Clear-all করলেই সরবে); এখানে শুধু
          // read:true mark করা হয়(badge কমানোর জন্য), list অপরিবর্তিত থাকে।
          const toMark = notifications.filter(n => !n.read);
          if (toMark.length > 0) {
            const batch = db.batch();
            toMark.forEach(n => {
              batch.update(
                db.collection("families").doc(getFamilyId()).collection("notifications").doc(n.id),
                { read: true }
              );
            });
            batch.commit().catch(() => {});
            // Instant badge update — onSnapshot নিজে থেকেও শীঘ্রই sync করবে,
            // এটা শুধু তাৎক্ষণিক UI feedback-এর জন্য(item মোছে না, শুধু read flag)।
            const markedIds = new Set(toMark.map(n => n.id));
            setNotifications(prev => prev.map(n => markedIds.has(n.id) ? { ...n, read: true } : n));
          }
        }
        return next;
      });
    },
    className: "relative p-1.5 rounded-xl bg-white/10 border border-white/10 text-white active:scale-95 transition-transform",
    title: "নোটিফিকেশন"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm leading-none"
  }, "🔔"), notifications.filter(n => !n.read).length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center"
  }, toBn(notifications.filter(n => !n.read).length))), /*#__PURE__*/React.createElement(NotificationPanel, { show: showNotifPanel, onClose: () => setShowNotifPanel(false), notifications, setNotifications, db, getFamilyId }))), addingMember && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md"
  }, members.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-emerald-100 font-semibold px-1 mb-1.5"
  }, "শুরু করতে আপনার নাম, ইমেইল ও জেন্ডার দিয়ে নিজেকে একজন সদস্য হিসেবে যোগ করুন 👇"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    value: newName,
    onChange: e => setNewName(e.target.value),
    placeholder: "সদস্যের নাম...",
    className: "flex-1 px-3 py-1.5 rounded-xl text-xs text-slate-900 outline-none font-medium"
  }), /*#__PURE__*/React.createElement("select", {
    value: newGender,
    onChange: e => setNewGender(e.target.value),
    className: "px-2 py-1.5 rounded-xl text-xs text-slate-900 bg-white outline-none font-medium"
  }, /*#__PURE__*/React.createElement("option", {
    value: "male"
  }, "পুরুষ"), /*#__PURE__*/React.createElement("option", {
    value: "female"
  }, "নারী"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: newMemberEmail,
    onChange: e => setNewMemberEmail(e.target.value),
    placeholder: "সদস্যের ইমেইল(Google সাইন-ইনের জন্য)...",
    className: "flex-1 px-3 py-1.5 rounded-xl text-xs text-slate-900 outline-none font-medium"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleAddMember,
    disabled: isLockedForSwitch,
    className: "px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C89B3C] text-[#16302B]"
  }, "যোগ"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddingMember(false),
    className: "p-1.5 text-white/80"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  })))));
}
