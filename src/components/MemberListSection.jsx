// A4-G4-Part E — Member list + release/admin actions, extracted verbatim from
// legacy App() hamburger dropdown (app.js lines ~6840-6945).
// Structural-only (Owner Rule 2): no logic/condition change, only moved to its own file.
// Returns a React.Fragment (label block + list block are siblings inside one wrapper div,
// so this component returns that single wrapper div as before).
// §Old-code cleanup Phase 1(১১ সেপ্টেম্বর ২০২৬, owner-approved): "দায়িত্ব নিন"(Member
// Password claim) ও "রিসেট করুন"(Admin Force-Release) বাটন সরানো হয়েছে — উভয়টাই
// Google-only identity model(2_4)-এ obsolete(দুটো real family-ই ইতিমধ্যে
// identityModel:"google-only", Rules-level এই legacy ownerUids-claim path আগে থেকেই
// বন্ধ)। নিজের device-এর দায়িত্ব ছেড়ে দেওয়া("আপনি" badge → handleReleaseMember,
// self-only, Member Key-নির্ভর না) ও Make/Remove Admin(googleUid-model-এও active
// থাকে, 2_4 §৮ "অপরিবর্তিত" নীতি অনুযায়ী) অপরিবর্তিত।
// §Old-code cleanup Phase 2(১১ সেপ্টেম্বর ২০২৬, owner-approved): pending
// memberRequests-এর inline Approve/Reject ব্লক সরানো হয়েছে — Approve-branch
// createMemberWithKey() দিয়ে private/key তৈরি করত, যা google-only family-তে
// Rules-level এখন blocked(উভয় real family-ই ইতিমধ্যে google-only)।
import { InfoIcon, Plus, Trash, User, UsersIcon } from "./icons.jsx";

export function MemberListSection({
  members,
  selectedId,
  setSelectedId,
  setIsMenuOpen,
  entryDirtyRef,
  weeklyDirtyRef,
  auth,
  handleReleaseMember,
  isLockedForSwitch,
  isAdmin,
  adminUidsList,
  handleMakeAdmin,
  handleRemoveAdmin,
  handleRemoveMember,
  setAddingMember
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(UsersIcon, {
    size: 12
  }), " সদস্যবৃন্দ"),
  // §Add-Member-button fix(১২ সেপ্টেম্বর ২০২৬, owner-reported): আগে
  // addingMember ফর্ম শুধু family-তে সদস্য একদম শূন্য থাকলে(প্রথম-সদস্য
  // setup) auto-open হতো — এরপর কোনো persistent "+" বাটন কোথাও ছিল না,
  // ফলে admin ২য়/৩য় সদস্য যোগ করতে পারতেন না। এটা এই সেশনের কোনো
  // পরিবর্তনের কারণে হয়নি(pre-existing gap), এখন fix করা হলো।
  isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setIsMenuOpen(false);
      setAddingMember(true);
    },
    className: "flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 normal-case",
    title: "নতুন সদস্য যোগ করুন"
  }, /*#__PURE__*/React.createElement(Plus, { size: 11 }), " নতুন সদস্য")), /*#__PURE__*/React.createElement("div", {
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
  }), (m.googleUid ? [m.googleUid] : (m.ownerUids || [])).includes(auth.currentUser && auth.currentUser.uid) ? /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleReleaseMember(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0",
    title: "আপনার দায়িত্বে আছে — ছেড়ে দিতে ট্যাপ করুন"
  }, "আপনি") : /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, !!(m.googleUid ? [m.googleUid] : (m.ownerUids || [])).length && /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
    },
    className: "text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 shrink-0 flex items-center gap-0.5 cursor-default",
    title: "অন্য ডিভাইসের দায়িত্বে আছে"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 10
  }))), isAdmin && !!(m.googleUid ? [m.googleUid] : (m.ownerUids || [])).length && (m.googleUid ? [m.googleUid] : (m.ownerUids || [])).some(u => !adminUidsList.includes(u)) && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      handleMakeAdmin(m);
    },
    disabled: isLockedForSwitch,
    className: "text-[8px] font-bold px-1 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100 shrink-0 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 whitespace-nowrap",
    title: "এডমিন করুন"
  }, "Make Admin"), isAdmin && !!(m.googleUid ? [m.googleUid] : (m.ownerUids || [])).length && (m.googleUid ? [m.googleUid] : (m.ownerUids || [])).some(u => adminUidsList.includes(u)) && !(m.googleUid ? [m.googleUid] : (m.ownerUids || [])).includes(auth.currentUser && auth.currentUser.uid) && /*#__PURE__*/React.createElement("button", {
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
  })))))));
}
