// §Menu full-page tab(নতুন, ১৫ সেপ্টেম্বর ২০২৬, 2_4_Identity_Simplification_Plan.md
// §৯.৫ ও 2_5_Identity_Simplification_Final_Mockup.md Screen E.1-এর owner-approved
// design বাস্তবায়ন)। আগে DashboardHeader.jsx-এর হ্যামবার্গার "মেনু" বাটনে অ্যাংকরড
// dropdown-sheet ছিল — bottom-nav TAB_SETTINGS("মেনু") ট্যাপ করলে এখন এই component
// পুরো-পৃষ্ঠা(full-page) হিসেবে render হয়। Content/hierarchy অপরিবর্তিত(structural-only
// move, DashboardHeader.jsx-এর পুরনো JSX থেকে verbatim সরানো হয়েছে — কোনো নতুন
// logic/condition যোগ হয়নি) — শুধু container dropdown-sheet→full-page,
// positioning(absolute/fixed backdrop)→normal in-flow layout।
// Non-member(unauthenticated/guest, §৯.৫): শুধু একটাই "🔵 Google দিয়ে সাইন-ইন করুন"
// বাটন — বাকি সব content(family username/সদস্য/ডেটা ম্যানেজমেন্ট ইত্যাদি) hidden।
import { CalIcon, CopyIcon, DownloadIcon, EditIcon, MenuIcon, MessageSquare, ShareIcon, UploadIcon, GoogleGIcon } from "./icons.jsx";
import { MemberListSection } from "./MemberListSection.jsx";

export function MenuPage({
  isGuestMode,
  onGuestSignInTap,
  members,
  selectedId,
  setSelectedId,
  onNavigateHome,
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
  setAddingMember,
  copiedCode,
  handleCopyCode,
  getFamilyCode,
  setShowFamilyCodeChoiceModal,
  handleShareInviteLink,
  setDriveBackupStatus,
  setShowBackupOptionsModal,
  setShowImportOptionsModal,
  setShowArchiveModal,
  setArchiveYear,
  setArchiveMonth0,
  monthCursor,
  setShowFeedbackModal,
  themeColorPickerEl
}) {
  return React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
    React.createElement(
      "div",
      {
        style: { background: "var(--theme-primary)" },
        className: "px-5 pt-6 pb-5 shadow-md flex items-center gap-2"
      },
      React.createElement(MenuIcon, { size: 18, color: "#F4F7F1" }),
      React.createElement(
        "h1",
        {
          className: "text-lg font-bold tracking-tight",
          style: { fontFamily: "'Noto Serif Bengali', serif", color: "#F4F7F1" }
        },
        "মেনু"
      )
    ),
    isGuestMode
      ? React.createElement(
          "div",
          { className: "flex flex-col items-center justify-center px-6 py-16 gap-3" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: onGuestSignInTap,
              className: "px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2.5",
              style: { background: "#1A73E8" }
            },
            React.createElement(
              "span",
              { className: "bg-white rounded-full p-0.5 flex items-center justify-center", "aria-hidden": "true" },
              React.createElement(GoogleGIcon, { size: 16 })
            ),
            "Google দিয়ে সাইন-ইন করুন"
          )
        )
      : React.createElement(
          "div",
          { className: "bg-white mx-3 mt-3 rounded-2xl shadow-sm border border-slate-100 py-2 text-slate-800 text-xs" },
          React.createElement(
            "div",
            { className: "px-4 py-2 border-b border-slate-100 bg-slate-50/70" },
            React.createElement(
              "div",
              { className: "flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider" },
              "ফ্যামিলি ইউজারনেম"
            ),
            React.createElement(
              "div",
              { className: "font-bold text-emerald-900 text-sm flex items-center justify-between mt-1" },
              React.createElement("span", { className: "tracking-wide select-none" }, getFamilyCode()),
              React.createElement(
                "span",
                { className: "flex items-center gap-2 shrink-0 ml-2" },
                copiedCode && React.createElement(
                  "span",
                  { className: "text-[9px] text-emerald-600 font-bold shrink-0" },
                  "কপি হয়েছে!"
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: e => { e.stopPropagation(); handleCopyCode(); },
                    className: "text-slate-500 hover:text-emerald-800 shrink-0",
                    title: "কপি করুন"
                  },
                  React.createElement(CopyIcon, { size: 13 })
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => { setShowFamilyCodeChoiceModal(true); },
                    className: "text-slate-500 hover:text-emerald-800 shrink-0",
                    title: "ফ্যামিলি ইউজারনেম পরিবর্তন করুন"
                  },
                  React.createElement(EditIcon, { size: 13 })
                )
              )
            )
          ),
          React.createElement(MemberListSection, {
            members: members,
            selectedId: selectedId,
            setSelectedId: setSelectedId,
            // মেনু এখন full-page ট্যাব, dropdown না — সদস্য বেছে নিলে আগে
            // "মেনু বন্ধ করা" হতো, এখন সমতুল্য আচরণ হলো হোম-ট্যাবে ফিরে যাওয়া
            // যাতে বেছে-নেওয়া সদস্যের দৈনন্দিন এন্ট্রি সাথে সাথে দেখা যায়।
            setIsMenuOpen: onNavigateHome,
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
          }),
          isAdmin && React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "button",
              {
                type: "button",
                onClick: async () => { try { await handleShareInviteLink(); } catch {} },
                className: "w-full text-left px-4 py-1.5 text-emerald-800 font-semibold text-[11px] hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
              },
              React.createElement(ShareIcon, { size: 12 }),
              "আমন্ত্রণ লিংক শেয়ার করুন"
            )
          ),
          React.createElement("div", { className: "border-t border-slate-100 my-1" }),
          React.createElement(
            "div",
            { className: "py-1" },
            React.createElement(
              "div",
              { className: "px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider" },
              "ডেটা ম্যানেজমেন্ট"
            ),
            React.createElement(
              "button",
              {
                onClick: () => {
                  setDriveBackupStatus(null);
                  setShowBackupOptionsModal(true);
                },
                className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              },
              React.createElement(DownloadIcon, { size: 14 }),
              " ডেটা ব্যাকআপ রাখুন"
            ),
            React.createElement(
              "button",
              {
                onClick: () => { setShowImportOptionsModal(true); },
                className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              },
              React.createElement(UploadIcon, { size: 14 }),
              " ইম্পোর্ট ব্যাকআপ ফাইল"
            ),
            React.createElement(
              "button",
              {
                onClick: () => {
                  setArchiveYear(monthCursor.year);
                  setArchiveMonth0(monthCursor.month0);
                  setShowArchiveModal(true);
                },
                className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              },
              React.createElement(CalIcon, { size: 14 }),
              " আর্কাইভ দেখুন (মাস/সাল)"
            )
          ),
          React.createElement("div", { className: "border-t border-slate-100 my-1" }),
          React.createElement(
            "div",
            { className: "py-1" },
            React.createElement(
              "button",
              {
                onClick: () => { setShowFeedbackModal(true); },
                className: "w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium text-emerald-800"
              },
              React.createElement(MessageSquare, { size: 14 }),
              " আমাদের জানান (পরামর্শ বা সমস্যা)"
            )
          ),
          themeColorPickerEl
        )
  );
}
