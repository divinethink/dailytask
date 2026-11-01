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
import { BookIcon, CalIcon, ChevronRight, ClockIcon, CopyIcon, DownloadIcon, EditIcon, HomeIcon, MenuIcon, MessageSquare, ShareIcon, UploadIcon, GoogleGIcon } from "./icons.jsx";
import { MemberListSection } from "./MemberListSection.jsx";

// §Menu UI polish(১ নভেম্বর ২০২৬, owner-requested "আরো সুন্দর ও গোছানো"): শুধু
// দৃশ্য/লেআউট বদল — প্রতিটা বাটনের onClick/শর্ত(isAdmin/onOpen* গেট) আগের মতোই,
// props অপরিবর্তিত। কার্ড-গ্রুপ(পরিচয়/সদস্য/ডেটা/কাস্টমাইজ/চেহারা), আইকন-চিপ ও
// ≥48px সারি; রং থিম-টোকেন(--theme-*) থেকে।
const h = React.createElement;
const CARD = "bg-white rounded-2xl shadow-sm border overflow-hidden";
const CARD_STYLE = { borderColor: "var(--theme-line, #E2E8F0)" };
function SectionLabel({ children }) {
  return h("div", { className: "px-2 pt-1 text-[11px] font-bold tracking-wider text-slate-500" }, children);
}
function MenuRow({ icon, title, hint, onClick, accent, showDivider = true }) {
  return h(
    "button",
    {
      type: "button",
      onClick,
      className: "w-full text-left px-4 min-h-[52px] py-2 flex items-center gap-3 active:bg-slate-50 hover:bg-slate-50/70 transition-colors " + (showDivider ? "border-t" : ""),
      style: showDivider ? { borderColor: "var(--theme-line, #E2E8F0)" } : undefined
    },
    h(
      "span",
      {
        className: "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
        style: { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
        "aria-hidden": "true"
      },
      icon
    ),
    h(
      "span",
      { className: "flex-1 min-w-0" },
      h("span", { className: "block text-sm font-semibold leading-snug " + (accent ? "" : "text-slate-800"), style: accent ? { color: "var(--theme-primary)" } : undefined }, title),
      hint && h("span", { className: "block text-[11px] text-slate-500 leading-snug mt-0.5" }, hint)
    ),
    h(ChevronRight, { size: 16, color: "#94A3B8" })
  );
}

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
  onOpenHomeLayout,
  onOpenPrayerLayout,
  onOpenFieldManager,
  onOpenTazkirah,
  themeColorPickerEl
}) {  return h(
    "div",
    { className: "min-h-screen pb-24", style: { background: "var(--theme-page, #F4F7F1)" } },
    h(
      "div",
      {
        style: { background: "var(--theme-primary)" },
        className: "px-5 pt-6 pb-5 shadow-md flex items-center gap-2"
      },
      h(MenuIcon, { size: 18, color: "#F4F7F1" }),
      h(
        "h1",
        {
          className: "text-lg font-bold tracking-tight",
          style: { fontFamily: "'Noto Serif Bengali', serif", color: "#F4F7F1" }
        },
        "মেনু"
      )
    ),
    isGuestMode
      ? h(
          "div",
          { className: "flex flex-col items-center justify-center px-6 py-16 gap-3" },
          h(
            "button",
            {
              type: "button",
              onClick: onGuestSignInTap,
              className: "px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2.5",
              style: { background: "#1A73E8" }
            },
            h(
              "span",
              { className: "bg-white rounded-full p-0.5 flex items-center justify-center", "aria-hidden": "true" },
              h(GoogleGIcon, { size: 16 })
            ),
            "Google দিয়ে সাইন-ইন করুন"
          )
        )
      : h(
          "div",
          { className: "px-3 pt-3 space-y-3 text-sm text-slate-800" },
          // ১) ফ্যামিলি ইউজারনেম
          h(
            "div",
            { className: CARD + " px-4 py-3 flex items-center justify-between gap-3", style: CARD_STYLE },
            h(
              "div",
              { className: "min-w-0" },
              h("div", { className: "text-[11px] font-bold tracking-wider text-slate-500" }, "ফ্যামিলি ইউজারনেম"),
              h("div", { className: "font-bold text-base mt-0.5 truncate select-none", style: { color: "var(--theme-ink, #16302B)" } }, getFamilyCode())
            ),
            h(
              "div",
              { className: "flex items-center gap-1.5 shrink-0" },
              copiedCode && h("span", { className: "text-[11px] font-bold mr-1", style: { color: "var(--theme-primary)" } }, "কপি হয়েছে!"),
              h(
                "button",
                {
                  type: "button",
                  onClick: e => { e.stopPropagation(); handleCopyCode(); },
                  className: "w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform",
                  style: { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
                  title: "কপি করুন",
                  "aria-label": "কপি করুন"
                },
                h(CopyIcon, { size: 16 })
              ),
              h(
                "button",
                {
                  type: "button",
                  onClick: () => { setShowFamilyCodeChoiceModal(true); },
                  className: "w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform",
                  style: { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
                  title: "ফ্যামিলি ইউজারনেম পরিবর্তন করুন",
                  "aria-label": "ফ্যামিলি ইউজারনেম পরিবর্তন করুন"
                },
                h(EditIcon, { size: 16 })
              )
            )
          ),
          // ২) সদস্যবৃন্দ(+ আমন্ত্রণ লিংক, শুধু admin)
          h(
            "div",
            { className: CARD, style: CARD_STYLE },
            h(MemberListSection, {
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
            isAdmin && h(MenuRow, {
              icon: h(ShareIcon, { size: 15 }),
              title: "আমন্ত্রণ লিংক শেয়ার করুন",
              accent: true,
              onClick: async () => { try { await handleShareInviteLink(); } catch {} }
            })
          ),
          // ৩) ডেটা ম্যানেজমেন্ট
          h(SectionLabel, null, "ডেটা ম্যানেজমেন্ট"),
          h(
            "div",
            { className: CARD, style: CARD_STYLE },
            h(MenuRow, {
              icon: h(DownloadIcon, { size: 15 }),
              title: "ডেটা ব্যাকআপ রাখুন",
              showDivider: false,
              onClick: () => {
                setDriveBackupStatus(null);
                setShowBackupOptionsModal(true);
              }
            }),
            h(MenuRow, {
              icon: h(UploadIcon, { size: 15 }),
              title: "ইম্পোর্ট ব্যাকআপ ফাইল",
              onClick: () => { setShowImportOptionsModal(true); }
            }),
            h(MenuRow, {
              icon: h(CalIcon, { size: 15 }),
              title: "আর্কাইভ দেখুন",
              hint: "মাস/সাল",
              onClick: () => {
                setArchiveYear(monthCursor.year);
                setArchiveMonth0(monthCursor.month0);
                setShowArchiveModal(true);
              }
            })
          ),
          // ৪) কাস্টমাইজ(প্রতিটা সারি আগের মতোই নিজ নিজ onOpen* prop-এর গেটে)
          (onOpenHomeLayout || onOpenPrayerLayout || onOpenFieldManager || onOpenTazkirah) && h(SectionLabel, null, "কাস্টমাইজ"),
          (onOpenHomeLayout || onOpenPrayerLayout || onOpenFieldManager || onOpenTazkirah) && h(
            "div",
            { className: CARD, style: CARD_STYLE },
            onOpenHomeLayout && h(MenuRow, {
              icon: h(HomeIcon, { size: 15 }),
              title: "হোম কাস্টমাইজ",
              hint: "কার্ড সাজান/ভাঁজ",
              showDivider: false,
              onClick: () => { onOpenHomeLayout(); }
            }),
            onOpenPrayerLayout && h(MenuRow, {
              icon: h(ClockIcon, { size: 15 }),
              title: "সময়সূচি কাস্টমাইজ",
              hint: "কার্ড সাজান",
              showDivider: !!onOpenHomeLayout,
              onClick: () => { onOpenPrayerLayout(); }
            }),
            onOpenFieldManager && h(MenuRow, {
              icon: h(EditIcon, { size: 15 }),
              title: "লেবেল ম্যানেজ",
              hint: "নাম বদল/লুকান/নতুন",
              showDivider: !!(onOpenHomeLayout || onOpenPrayerLayout),
              onClick: () => { onOpenFieldManager(); }
            }),
            onOpenTazkirah && h(MenuRow, {
              icon: h(BookIcon, { size: 15 }),
              title: "তাযকিরাহ ম্যানেজ",
              hint: "নিজের বাণী যোগ/লুকান",
              showDivider: !!(onOpenHomeLayout || onOpenPrayerLayout || onOpenFieldManager),
              onClick: () => { onOpenTazkirah(); }
            })
          ),
          // ৫) ফিডব্যাক
          h(
            "div",
            { className: CARD, style: CARD_STYLE },
            h(MenuRow, {
              icon: h(MessageSquare, { size: 15 }),
              title: "আমাদের জানান",
              hint: "পরামর্শ বা সমস্যা",
              accent: true,
              showDivider: false,
              onClick: () => { setShowFeedbackModal(true); }
            })
          ),
          // ৬) চেহারা: ডিসপ্লে মোড + থিম কালার(app.js-এর themeColorPickerEl)
          themeColorPickerEl
        )
  );
}
