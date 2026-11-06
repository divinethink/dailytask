// সদস্য-তালিকা (release/admin বাটন) — App() থেকে আলাদা করা component; শুধু রেন্ডার, লজিক caller থেকে আসে।
import { InfoIcon, Plus, Trash, User, UsersIcon } from "./icons.jsx";

// §Menu UI polish(১ নভেম্বর ২০২৬, owner-requested): শুধু লেআউট/স্টাইল — সব onClick/শর্ত/
// guard(dirty-confirm, isAdmin, uid-যাচাই) আগের মতোই অপরিবর্তিত।
// সারি এখন এক-লাইন(অবতার+নাম+ব্যাজ/বাটন+ডিলিট) — কার্ডের উচ্চতা ন্যূনতম; নাম দীর্ঘ হলে truncate।
export function MemberListSection({
  members,
  selectedId,
  setSelectedId,
  setIsMenuOpen,
  entryDirtyRef,
  weeklyDirtyRef,
  auth,
  isAdmin,
  adminUidsList,
  handleMakeAdmin,
  handleRemoveAdmin,
  handleRemoveMember,
  setAddingMember
}) {  const h = React.createElement;
  const uidsOf = m => m.googleUid ? [m.googleUid] : [];
  const myUid = auth.currentUser && auth.currentUser.uid;
  return h("div", null,
    h("div", {
      className: "px-4 py-2 flex items-center justify-between gap-2 border-b",
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
        className: "flex items-center gap-1 text-xs font-bold px-3 h-7 rounded-full active:scale-95 transition-transform",
        style: { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
        title: "নতুন সদস্য যোগ করুন"
      }, h(Plus, { size: 12 }), " নতুন সদস্য")),
    h("div", { className: "p-1.5" }, members.map(m => {
      const selected = m.id === selectedId;
      const uids = uidsOf(m);
      const isMine = uids.includes(myUid);
      const hasOwner = !!uids.length;
      const pill = "text-[11px] font-bold px-2 h-6 rounded-full shrink-0 whitespace-nowrap flex items-center disabled:opacity-40";
      return h("div", {
        key: m.id,
        onClick: () => {
          if (m.id !== selectedId && (entryDirtyRef.current || weeklyDirtyRef.current) && !window.confirm("সেভ না করা পরিবর্তন আছে (দৈনিক এন্ট্রি/সাপ্তাহিক রিফ্লেকশন)। সদস্য পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
          setSelectedId(m.id);
          setIsMenuOpen(false);
        },
        className: "rounded-xl pl-2 pr-1 min-h-[44px] flex items-center gap-2 cursor-pointer transition-colors " + (selected ? "" : "hover:bg-slate-50 active:bg-slate-50"),
        style: selected ? { background: "var(--theme-soft, #E8F0EE)" } : undefined
      },
        h("span", {
          className: "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
          style: selected
            ? { background: "var(--theme-primary)", color: "#FFFFFF" }
            : { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" },
          "aria-hidden": "true"
        }, String(m.name || "?").trim().charAt(0).toUpperCase() || h(User, { size: 12 })),
        h("span", {
          className: "flex-1 min-w-0 truncate text-sm " + (selected ? "font-bold" : "font-medium text-slate-700"),
          style: selected ? { color: "var(--theme-ink, #16302B)" } : undefined
        }, m.name),
        isMine ? h("span", {
          className: pill + " border",
          style: { background: "#FFFFFF", color: "var(--theme-primary)", borderColor: "var(--theme-primary)" }
        }, "আপনি") : hasOwner && h("span", {
          onClick: e => { e.stopPropagation(); },
          className: "w-6 h-6 rounded-full bg-slate-100 text-slate-500 shrink-0 flex items-center justify-center cursor-default",
          title: "অন্য ডিভাইসের দায়িত্বে আছে",
          "aria-label": "অন্য ডিভাইসের দায়িত্বে আছে"
        }, h(InfoIcon, { size: 12 })),
        isAdmin && hasOwner && uids.some(u => !adminUidsList.includes(u)) && h("button", {
          type: "button",
          onClick: e => {
            e.stopPropagation();
            handleMakeAdmin(m);
          },
          className: pill + " bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
          title: "এডমিন করুন"
        }, "Make Admin"),
        isAdmin && hasOwner && uids.some(u => adminUidsList.includes(u)) && !isMine && h("button", {
          type: "button",
          onClick: e => {
            e.stopPropagation();
            handleRemoveAdmin(m);
          },
          className: pill + " bg-white text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200",
          title: "এডমিন পদ থেকে বাদ দিন"
        }, "Remove Admin"),
        isAdmin && h("button", {
          type: "button",
          onClick: e => {
            e.stopPropagation();
            handleRemoveMember(m);
          },
          className: "w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 disabled:opacity-40",
          title: "সদস্য বাদ দিন",
          "aria-label": "সদস্য বাদ দিন"
        }, h(Trash, { size: 14 })));
    })));
}
