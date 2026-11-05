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
import { isCreatorAuth } from "../legacy/familyIdentity.js";
import { fetchSection, saveRichtext } from "../legacy/editableContent.js";

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
// ছোট টাইল(আইকন-চিপ উপরে, নাম নিচে) — গ্রিডে বসে, লিস্টের চেয়ে অনেক কম উচ্চতা নেয়।
// label = পূর্ণ নাম(screen-reader/tooltip), title = টাইলে দৃশ্যমান ছোট নাম।
function MenuTile({ icon, title, label, onClick }) {
  return h(
    "button",
    {
      type: "button",
      onClick,
      title: label || title,
      "aria-label": label || title,
      className: "bg-white rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-1 px-1 py-2 min-h-[68px] active:scale-95 transition-transform",
      style: CARD_STYLE
    },
    h(
      "span",
      {
        className: "w-8 h-8 rounded-xl flex items-center justify-center",
        style: { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
        "aria-hidden": "true"
      },
      icon
    ),
    h("span", { className: "text-[11px] font-semibold leading-tight text-slate-700 text-center" }, title)
  );
}

// "আমাদের জানান" সারি — শিরোনাম+হিন্ট App Creator সম্পাদনা করতে পারেন(ডানে-উপরে ✏️)।
// সংরক্ষণ: publicToolsContent/menuFeedbackButton(richtext: ১ম লাইন=শিরোনাম, ২য়=হিন্ট;
// বিদ্যমান saveRichtext/Rules reuse, নতুন schema/rule নেই)। doc না থাকলে/ফাঁকা হলে ডিফল্ট।
const FEEDBACK_ID = "menuFeedbackButton";
const FEEDBACK_DEFAULT = { title: "আমাদের জানান", hint: "পরামর্শ বা সমস্যা" };
function parseFeedbackDoc(doc) {
  const body = doc && doc.richtext && typeof doc.richtext.body === "string" ? doc.richtext.body : "";
  const lines = body.split("\n");
  const title = (lines[0] || "").trim();
  if (!title) return FEEDBACK_DEFAULT;
  return { title, hint: lines.slice(1).join(" ").trim() };
}
function FeedbackRow({ onOpen }) {
  const isCreator = isCreatorAuth();
  const [text, setText] = React.useState(FEEDBACK_DEFAULT);
  const [editing, setEditing] = React.useState(false);
  const [draftT, setDraftT] = React.useState("");
  const [draftH, setDraftH] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  React.useEffect(() => {
    let alive = true;
    fetchSection(FEEDBACK_ID).then(d => { if (alive) setText(parseFeedbackDoc(d)); });
    return () => { alive = false; };
  }, []);
  async function save() {
    const title = draftT.trim();
    const hint = draftH.trim();
    if (!title) { setErr("শিরোনাম ফাঁকা রাখা যাবে না।"); return; }
    setBusy(true);
    setErr("");
    try {
      await saveRichtext(FEEDBACK_ID, title + "\n" + hint);
      setText({ title, hint });
      setEditing(false);
    } catch {
      setErr("সেভ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }
  const input = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none";
  if (editing) {
    return h(
      "div",
      { className: CARD + " p-3 space-y-2", style: CARD_STYLE },
      h("input", { value: draftT, maxLength: 40, onChange: e => setDraftT(e.target.value), placeholder: "শিরোনাম", className: input }),
      h("input", { value: draftH, maxLength: 60, onChange: e => setDraftH(e.target.value), placeholder: "ছোট বিবরণ(ঐচ্ছিক)", className: input }),
      err && h("p", { className: "text-xs text-red-500" }, err),
      h(
        "div",
        { className: "flex gap-2 justify-end" },
        h("button", { type: "button", disabled: busy, onClick: () => setEditing(false), className: "px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200" }, "বাতিল"),
        h("button", { type: "button", disabled: busy, onClick: save, className: "px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60", style: { background: "var(--theme-primary)" } }, busy ? "সেভ হচ্ছে..." : "সেভ করুন")
      )
    );
  }
  return h(
    "div",
    { className: "relative " + CARD, style: CARD_STYLE },
    h(MenuRow, {
      icon: h(MessageSquare, { size: 15 }),
      title: text.title,
      hint: text.hint || undefined,
      accent: true,
      showDivider: false,
      hideChevron: isCreator,
      onClick: onOpen
    }),
    isCreator && h(
      "button",
      {
        type: "button",
        onClick: () => { setDraftT(text.title); setDraftH(text.hint); setErr(""); setEditing(true); },
        className: "absolute top-1 right-1 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95",
        title: "লেখা সম্পাদনা করুন",
        "aria-label": "লেখা সম্পাদনা করুন"
      },
      h(EditIcon, { size: 14 })
    )
  );
}

function MenuRow({ icon, title, hint, onClick, accent, showDivider = true, hideChevron = false }) {
  return h(
    "button",
    {
      type: "button",
      onClick,
      className: "w-full text-left px-4 min-h-[44px] py-1.5 flex items-center gap-3 active:bg-slate-50 hover:bg-slate-50/70 transition-colors " + (showDivider ? "border-t" : ""),
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
    !hideChevron && h(ChevronRight, { size: 16, color: "#94A3B8" })
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
  onOpenAmolLayout,
  onOpenToolsLayout,
  onOpenFieldManager,
  onOpenTazkirah,
  onOpenPopupMessages,
  themeColorPickerEl
}) {  return h(
    "div",
    { className: "min-h-screen pb-24", style: { background: "var(--theme-page, #F4F7F1)" } },
    h(
      "div",
      {
        style: { background: "var(--theme-primary)" },
        className: "px-5 pt-4 pb-3 shadow-md flex items-center gap-2"
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
          { className: "px-3 pt-2.5 space-y-2 text-sm text-slate-800" },
          // ১) ফ্যামিলি ইউজারনেম
          h(
            "div",
            { className: CARD + " px-4 py-2 flex items-center justify-between gap-3", style: CARD_STYLE },
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
                  className: "w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform",
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
                  className: "w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform",
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
          // ৩) ডেটা ম্যানেজমেন্ট(৩-কলাম টাইল-গ্রিড)
          h(SectionLabel, null, "ডেটা ম্যানেজমেন্ট"),
          h(
            "div",
            { className: "grid grid-cols-3 gap-2" },
            h(MenuTile, {
              icon: h(DownloadIcon, { size: 17 }),
              title: "ডেটা ব্যাকআপ",
              label: "ডেটা ব্যাকআপ রাখুন",
              onClick: () => {
                setDriveBackupStatus(null);
                setShowBackupOptionsModal(true);
              }
            }),
            h(MenuTile, {
              icon: h(UploadIcon, { size: 17 }),
              title: "ইম্পোর্ট ব্যাকআপ",
              label: "ইম্পোর্ট ব্যাকআপ ফাইল",
              onClick: () => { setShowImportOptionsModal(true); }
            }),
            h(MenuTile, {
              icon: h(CalIcon, { size: 17 }),
              title: "আর্কাইভ",
              label: "আর্কাইভ দেখুন (মাস/সাল)",
              onClick: () => {
                setArchiveYear(monthCursor.year);
                setArchiveMonth0(monthCursor.month0);
                setShowArchiveModal(true);
              }
            })
          ),
          // ৪) কাস্টমাইজ(৪-কলাম টাইল-গ্রিড; প্রতিটা টাইল আগের মতোই নিজ নিজ onOpen* prop-এর গেটে)
          (onOpenHomeLayout || onOpenPrayerLayout || onOpenAmolLayout || onOpenToolsLayout || onOpenFieldManager || onOpenTazkirah || onOpenPopupMessages) && h(SectionLabel, null, "কাস্টমাইজ"),
          (onOpenHomeLayout || onOpenPrayerLayout || onOpenAmolLayout || onOpenToolsLayout || onOpenFieldManager || onOpenTazkirah || onOpenPopupMessages) && h(
            "div",
            { className: "grid grid-cols-4 gap-2" },
            onOpenHomeLayout && h(MenuTile, { icon: h(HomeIcon, { size: 17 }), title: "হোম", label: "হোম কাস্টমাইজ", onClick: () => { onOpenHomeLayout(); } }),
            onOpenPrayerLayout && h(MenuTile, { icon: h(ClockIcon, { size: 17 }), title: "সময়সূচি", label: "সময়সূচি কাস্টমাইজ", onClick: () => { onOpenPrayerLayout(); } }),
            onOpenAmolLayout && h(MenuTile, { icon: h(BookIcon, { size: 17 }), title: "আমল", label: "আমল কাস্টমাইজ", onClick: () => { onOpenAmolLayout(); } }),
            onOpenToolsLayout && h(MenuTile, { icon: h(EditIcon, { size: 17 }), title: "সহায়িকা", label: "সহায়িকা কাস্টমাইজ", onClick: () => { onOpenToolsLayout(); } }),
            onOpenFieldManager && h(MenuTile, { icon: h(EditIcon, { size: 17 }), title: "লেবেল", label: "লেবেল ম্যানেজ (নাম বদল/লুকান/নতুন)", onClick: () => { onOpenFieldManager(); } }),
            onOpenTazkirah && h(MenuTile, { icon: h(BookIcon, { size: 17 }), title: "তাযকিরাহ", label: "তাযকিরাহ ম্যানেজ (নিজের বাণী)", onClick: () => { onOpenTazkirah(); } }),
            onOpenPopupMessages && h(MenuTile, { icon: h(EditIcon, { size: 17 }), title: "পপআপ বার্তা", label: "পপআপ বার্তা সম্পাদনা (শুধু অ্যাপ ক্রিয়েটর)", onClick: () => { onOpenPopupMessages(); } })
          ),
          // ৫) ফিডব্যাক(লেখা ক্রিয়েটর-সম্পাদনযোগ্য)
          h(FeedbackRow, { onOpen: () => { setShowFeedbackModal(true); } }),
          // ৬) চেহারা: ডিসপ্লে মোড + থিম কালার(app.js-এর themeColorPickerEl)
          themeColorPickerEl
        )
  );
}
