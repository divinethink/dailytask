// A4-G4-Part E — Member list + claim/release/admin actions + pending-request approve/reject,
// extracted verbatim from legacy App() hamburger dropdown (app.js lines ~6840-6945).
// Structural-only (Owner Rule 2): no logic/condition change, only moved to its own file.
// Returns a React.Fragment (label block + list block are siblings inside one wrapper div,
// so this component returns that single wrapper div as before).
import { InfoIcon, Trash, User, UsersIcon } from "./icons.jsx";

export function MemberListSection({
  members,
  selectedId,
  setSelectedId,
  setIsMenuOpen,
  entryDirtyRef,
  weeklyDirtyRef,
  auth,
  handleReleaseMember,
  migrationState,
  setClaimKeyTarget,
  setClaimKeyInput,
  setShowClaimKeyModal,
  handleClaimMember,
  isLockedForSwitch,
  isAdmin,
  adminUidsList,
  handleAdminForceRelease,
  handleMakeAdmin,
  handleRemoveAdmin,
  handleRemoveMember,
  pendingMemberRequests,
  decideMemberRequest
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(UsersIcon, {
    size: 12
  }), " সদস্যবৃন্দ"), /*#__PURE__*/React.createElement("div", {
    className: "max-h-36 overflow-y-auto custom-scrollbar px-2"
  }, members.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    onClick: () => {
      if (m.id !== selectedId && (entryDirtyRef.current || weeklyDirtyRef.current) && !window.confirm("সেভ না করা পরিবর্তন আছে (দৈনিক এন্ট্রি/সাপ্তাহিক রিফ্লেকশন)। সদস্য পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
      setSelectedId(m.id);
      setIsMenuOpen(false);
    },
    className: `flex items-center justify-between flex-nowrap gap-x-1 px-2 py-1.5 rounded-lg cursor-pointer group ${m.id === selectedId ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-slate-50 text-slate-700"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement(User, {
    size: 13
  }), " ", m.name), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center flex-nowrap justify-end gap-0.5 overflow-x-auto"
  }, m.id === selectedId && /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-600"
  }), m.ownerUids?.includes(auth.currentUser && auth.currentUser.uid) ? /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleReleaseMember(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0",
    title: "আপনার দায়িত্বে আছে — ছেড়ে দিতে ট্যাপ করুন"
  }, "আপনি") : /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, !!(m.ownerUids && m.ownerUids.length) && /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
    },
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 shrink-0 flex items-center gap-0.5 cursor-default",
    title: "অন্য ডিভাইসের দায়িত্বে আছে — Member Password দিয়ে ফিরে পাওয়া যাবে"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 10
  })), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      if (migrationState === "v2") {
        setClaimKeyTarget(m);
        setClaimKeyInput("");
        setShowClaimKeyModal(true);
      } else {
        handleClaimMember(m);
      }
    },
    disabled: isLockedForSwitch || (migrationState !== "v2" && !!(m.ownerUids && m.ownerUids.length)),
    className: "text-[8px] font-bold px-1 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 shrink-0 disabled:opacity-40 whitespace-nowrap",
    title: "এই সদস্যের দায়িত্ব নিন(Member Password লাগবে)"
  }, "দায়িত্ব নিন"), isAdmin && !!(m.ownerUids && m.ownerUids.length) && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleAdminForceRelease(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[8px] font-bold px-1 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100 shrink-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200 whitespace-nowrap",
    title: "এডমিন হিসেবে জোরপূর্বক মুক্ত করুন (অন্য ডিভাইস অনুপস্থিত/lost হলে ব্যবহার করুন)"
  }, "রিসেট করুন")), isAdmin && !!(m.ownerUids && m.ownerUids.length) && m.ownerUids.some(u => !adminUidsList.includes(u)) && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleMakeAdmin(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[8px] font-bold px-1 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100 shrink-0 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 whitespace-nowrap",
    title: "এডমিন করুন"
  }, "Make Admin"), isAdmin && !!(m.ownerUids && m.ownerUids.length) && m.ownerUids.some(u => adminUidsList.includes(u)) && !m.ownerUids.includes(auth.currentUser && auth.currentUser.uid) && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleRemoveAdmin(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[8px] font-bold px-1 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100 shrink-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200 whitespace-nowrap",
    title: "এডমিন পদ থেকে বাদ দিন"
  }, "Remove Admin"), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleRemoveMember(m);
    },
    disabled: isLockedForSwitch,
    className: "p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity",
    title: "সদস্য বাদ দিন"
  }, /*#__PURE__*/React.createElement(Trash, {
    size: 12
  })))))), isAdmin && pendingMemberRequests.length > 0 && pendingMemberRequests.map(req => /*#__PURE__*/React.createElement("div", {
    key: "pendingReq-" + req.id,
    className: "flex items-center justify-between flex-nowrap gap-x-1 px-2 py-1.5 rounded-lg text-slate-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 shrink-0"
  }, /*#__PURE__*/React.createElement(User, { size: 13 }), " ", req.name), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center flex-nowrap gap-1 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 shrink-0"
  }, "Pending"), /*#__PURE__*/React.createElement("button", {
    onClick: e => { e.stopPropagation(); decideMemberRequest(req, "approved"); },
    className: "text-[8px] font-bold px-1 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0",
    title: "অনুমোদন করুন"
  }, "Approve"), /*#__PURE__*/React.createElement("button", {
    onClick: e => { e.stopPropagation(); decideMemberRequest(req, "denied"); },
    className: "text-[8px] font-bold px-1 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100 shrink-0",
    title: "প্রত্যাখ্যান করুন"
  }, "Reject")))));
}
