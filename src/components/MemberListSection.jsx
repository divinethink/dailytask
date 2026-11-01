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

// §Menu UI polish(১ নভেম্বর ২০২৬, owner-requested): শুধু লেআউট/স্টাইল — সব onClick/শর্ত/
// guard(dirty-confirm, isAdmin, isLockedForSwitch, uid-যাচাই) আগের মতোই অপরিবর্তিত।
// সারি এখন দুই-স্তর(নাম+অবতার উপরে, অ্যাকশন নিচে wrap-সহ) — মোবাইলে বাটন ঠাসাঠাসি/স্ক্রল নেই।
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
}) {  const h = React.createElement;
  const uidsOf = m => m.googleUid ? [m.googleUid] : (m.ownerUids || []);
  const myUid = auth.currentUser && auth.currentUser.uid;
  return h("div", null,
    h("div", {
      className: "px-4 py-3 flex items-center justify-between gap-2 border-b",
      style: { borderColor: "var(--theme-line, #E2E8F0)" }
    },
      h("span", { className: "flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500" },
        h(UsersIcon, { size: 13 }), " সদস্যবৃন্দ"),
      // §Add-Member-button fix(১২ সেপ্টেম্বর ২০২৬): persistent "নতুন সদস্য" বাটন(admin-only)।
      isAdmin && h("button", {
        type: "button",
        onClick: e => {
          e.stopPropagation();
          setIsMenuOpen(false);
          setAddingMember(true);
        },
        className: "flex items-center gap-1 text-xs font-bold px-3 h-8 rounded-full active:scale-95 transition-transform",
        style: { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
        title: "নতুন সদস্য যোগ করুন"
      }, h(Plus, { size: 12 }), " নতুন সদস্য")),
    h("div", { className: "p-2 space-y-1" }, members.map(m => {
      const selected = m.id === selectedId;
      const uids = uidsOf(m);
      const isMine = uids.includes(myUid);
      const hasOwner = !!uids.length;
      return h("div", {
        key: m.id,
        onClick: () => {
          if (m.id !== selectedId && (entryDirtyRef.current || weeklyDirtyRef.current) && !window.confirm("সেভ না করা পরিবর্তন আছে (দৈনিক এন্ট্রি/সাপ্তাহিক রিফ্লেকশন)। সদস্য পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
          setSelectedId(m.id);
          setIsMenuOpen(false);
        },
        className: "rounded-xl px-3 py-2.5 cursor-pointer transition-colors " + (selected ? "" : "hover:bg-slate-50 active:bg-slate-50"),
        style: selected ? { background: "var(--theme-soft, #E8F0EE)" } : undefined
      },
        h("div", { className: "flex items-center gap-2.5" },
          h("span", {
            className: "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
            style: selected
              ? { background: "var(--theme-primary)", color: "#FFFFFF" }
              : { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
            "aria-hidden": "true"
          }, String(m.name || "?").trim().charAt(0).toUpperCase() || h(User, { size: 14 })),
          h("span", {
            className: "flex-1 min-w-0 truncate text-sm " + (selected ? "font-bold" : "font-medium text-slate-700"),
            style: selected ? { color: "var(--theme-ink, #16302B)" } : undefined
          }, m.name),
          selected && h("span", { className: "w-2 h-2 rounded-full shrink-0", style: { background: "var(--theme-primary)" }, "aria-label": "নির্বাচিত" }),
          isAdmin && h("button", {
            type: "button",
            onClick: e => {
              e.stopPropagation();
              handleRemoveMember(m);
            },
            disabled: isLockedForSwitch,
            className: "w-9 h-9 -mr-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 disabled:opacity-40",
            title: "সদস্য বাদ দিন",
            "aria-label": "সদস্য বাদ দিন"
          }, h(Trash, { size: 15 }))),
        (hasOwner || isMine) && h("div", { className: "flex items-center flex-wrap gap-1.5 mt-2 pl-[46px]" },
          isMine ? h("button", {
            type: "button",
            onClick: e => {
              e.stopPropagation();
              handleReleaseMember(m);
            },
            disabled: isLockedForSwitch,
            className: "text-xs font-bold px-2.5 h-7 rounded-full border shrink-0",
            style: { background: "#FFFFFF", color: "var(--theme-primary)", borderColor: "var(--theme-primary)" },
            title: "আপনার দায়িত্বে আছে — ছেড়ে দিতে ট্যাপ করুন"
          }, "আপনি") : h("span", {
            onClick: e => { e.stopPropagation(); },
            className: "text-xs font-bold px-2 h-7 rounded-full bg-slate-100 text-slate-500 shrink-0 flex items-center gap-1 cursor-default",
            title: "অন্য ডিভাইসের দায়িত্বে আছে"
          }, h(InfoIcon, { size: 11 }), " অন্য ডিভাইস"),
          isAdmin && hasOwner && uids.some(u => !adminUidsList.includes(u)) && h("button", {
            type: "button",
            onClick: e => {
              e.stopPropagation();
              handleMakeAdmin(m);
            },
            disabled: isLockedForSwitch,
            className: "text-xs font-bold px-2.5 h-7 rounded-full bg-white text-slate-600 border border-slate-200 shrink-0 whitespace-nowrap hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-40",
            title: "এডমিন করুন"
          }, "Make Admin"),
          isAdmin && hasOwner && uids.some(u => adminUidsList.includes(u)) && !isMine && h("button", {
            type: "button",
            onClick: e => {
              e.stopPropagation();
              handleRemoveAdmin(m);
            },
            disabled: isLockedForSwitch,
            className: "text-xs font-bold px-2.5 h-7 rounded-full bg-white text-slate-500 border border-slate-200 shrink-0 whitespace-nowrap hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40",
            title: "এডমিন পদ থেকে বাদ দিন"
          }, "Remove Admin")));
    })));
}
