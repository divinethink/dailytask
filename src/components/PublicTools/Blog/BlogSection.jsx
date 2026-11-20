// BlogSection.jsx — "ডিভাইন ব্লগ"(Public Tools সহায়িকা→ক্যাটাগরি ৬, Phase E,
// 3_4/3_3 §৮)। Read সবার জন্য open(guest সহ)। Category-sidebar+post-list,
// writer-দের নিজের পোস্ট এডিট/ডিলিট, App-Creator moderation-override+
// writer-ব্যবস্থাপনা প্যানেল। React global(window.React, globals.js)।

import { auth } from "../../../legacy/firebaseConfig.js";
import { isCreatorAuth } from "../../../legacy/familyIdentity.js";
import {
  BLOG_CATEGORIES,
  splitByMoreMarker,
  fetchPosts,
  deletePost,
  canEditPost,
  isCurrentUserWriter,
} from "../../../legacy/blogData.js";
import { MenuIcon, X, EditIcon, Trash, ChevronLeft, Loader2 } from "../../icons.jsx";
import { BlogForm } from "./BlogForm.jsx";
import { SectionReader } from "../SectionReader.jsx";
import { postText, readerKey } from "../../../legacy/readerCore.js";
import { BlogWriterAdmin } from "./BlogWriterAdmin.jsx";
import { ToolIcon } from "../ToolIcons.jsx";
import { toBnDigits } from "../../../legacy/quranCore.js";
import { useBackLayer } from "../../../legacy/backNav.js";

const { useState, useEffect } = React;

const ALL_CATEGORY = "সব";

// ক্যাটাগরি → বিদ্যমান ToolIcon নাম (নতুন SVG নেই; না মিললে "list")
const CAT_ICON = {
  "আকীদা": "kaaba", "কুরআন": "quran", "হাদিস": "file", "ইবাদত, আমল ও শরয়ি নির্দেশনা": "mosque",
  "হালাল-হারাম": "wheat", "আখলাক ও তাযকিয়াহ": "heart", "সীরাত (নবীজি ﷺ-এর জীবনী)": "moonStar",
  "ইসলামী ইতিহাস": "hourglass", "পরকাল": "moon", "পরিবার, সমাজ ও সন্তান প্রতিপালন": "leaf",
  "ইসলামী অর্থনীতি": "calculator", "সমসাময়িক প্রসঙ্গ": "calendar", "প্রচলিত ভুল": "help",
  "তুলনামূলক ধর্মতত্ত্ব ও নাস্তিকতা": "repeat", "ইসলামী দর্শন ও চিন্তাধারা": "sparkles",
  "ইসলামী সাহিত্য": "bookmarkCheck", "বিশেষ দিবস/উপলক্ষ": "calendarStar", "অন্যান্য": "list",
};
const PRIMARY = "var(--theme-primary, #0E4B43)";
const ink = "var(--theme-ink, #0A3A34)";

// onBack — PublicToolsShell.jsx থেকে পাস করা(§সহায়িকায় ফেরত, mockup 3_3 §৮.১
// "← সহায়িকা")। আগে এই list-view header-এ কোনো শেল-লেভেল back-control ছিল না
// (শুধু ভিতরের detail/form/admin view "← ব্লগ" দিয়ে list-এ ফিরত) — এই fix
// সেই gap পূরণ করে, mockup-এর সাথে সামঞ্জস্যপূর্ণ করতে।
export function BlogSection({ onBack }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isWriter, setIsWriter] = useState(false);
  const isCreator = isCreatorAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [q, setQ] = useState(""); // সার্চ: শিরোনাম বা ট্যাগ
  const [selectedCategory, setSelectedCategory] = useState(null); // null = ক্যাটাগরি-গ্রিড; নইলে লেখার তালিকা
  const [selectedPost, setSelectedPost] = useState(null); // full post object
  const [view, setView] = useState("list"); // list | detail | form | writerAdmin
  const [editingPost, setEditingPost] = useState(null);

  async function reload() {
    setLoading(true);
    setLoadError("");
    try {
      const [list, writerStatus] = await Promise.all([
        fetchPosts(),
        auth.currentUser ? isCurrentUserWriter() : Promise.resolve(false),
      ]);
      setPosts(list);
      setIsWriter(writerStatus);
    } catch (e) {
      setLoadError("লেখা লোড করা যায়নি, আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const filteredPosts =
    selectedCategory === ALL_CATEGORY || selectedCategory === null ? posts : posts.filter((p) => p.category === selectedCategory);
  const needle = q.trim().toLowerCase();
  const searchResults = needle
    ? posts.filter((p) => (p.title || "").toLowerCase().includes(needle) || (Array.isArray(p.tags) ? p.tags : []).some((t) => String(t).toLowerCase().includes(needle)))
    : [];
  const countOf = (c) => (c === ALL_CATEGORY ? posts.length : posts.filter((p) => p.category === c).length);
  const inListView = view === "list" && selectedCategory !== null;
  // ফোনের ব্যাক: তালিকা থেকে গ্রিডে ফেরা
  useBackLayer(inListView, () => setSelectedCategory(null));

  function openDetail(post) {
    setSelectedPost(post);
    setView("detail");
  }

  function backToList() {
    setSelectedPost(null);
    setEditingPost(null);
    setView("list");
  }

  async function handleDelete(post) {
    if (!window.confirm("এই লেখা মুছে ফেলবেন? এটা পূর্বাবস্থায় ফেরানো যাবে না।")) return;
    if (!window.confirm("নিশ্চিত? এই পদক্ষেপ স্থায়ী।")) return;
    try {
      await deletePost(post.id);
      backToList();
      reload();
    } catch (e) {
      window.alert("মুছে ফেলা যায়নি।");
    }
  }

  if (view === "writerAdmin") {
    return /*#__PURE__*/React.createElement(BlogWriterAdmin, { onBack: backToList });
  }

  if (view === "form") {
    return /*#__PURE__*/React.createElement(BlogForm, {
      post: editingPost,
      onCancel: backToList,
      onDone: () => {
        backToList();
        reload();
      },
    });
  }

  // পোস্ট খুললে সরাসরি রিডিং মোড (আলাদা বোতাম নেই)। এডিট/মুছুন ⋮ মেনুতে (শুধু অনুমোদিত লেখক/Creator)।
  if (view === "detail" && selectedPost) {
    const canEdit = canEditPost(selectedPost);
    return /*#__PURE__*/React.createElement(SectionReader, {
      title: selectedPost.title,
      text: postText(selectedPost),
      storeKey: readerKey("blog_" + selectedPost.id),
      badge: "#" + selectedPost.category,
      sourceNote: selectedPost.sourceNote,
      onClose: backToList,
      canManage: canEdit,
      onEdit: () => {
        setEditingPost(selectedPost);
        setView("form");
      },
      onTrash: () => handleDelete(selectedPost),
    });
  }

  // --- list view ---
  const h = React.createElement;
  const openCat = (c) => { setSelectedCategory(c); setSidebarOpen(false); };
  const catLabel = (c) => (c === ALL_CATEGORY ? "সকল লেখা" : c) + " (" + toBnDigits(countOf(c)) + ")";

  const header = h("div", { className: "flex items-center justify-between gap-2 px-3 py-3", style: { background: PRIMARY, color: "#fff" } },
    h("div", { className: "flex items-center gap-2 min-w-0" },
      h("button", { type: "button", onClick: () => (inListView ? setSelectedCategory(null) : onBack()), "aria-label": inListView ? "ক্যাটাগরি" : "সহায়িকা", className: "flex items-center justify-center flex-shrink-0", style: { width: 40, height: 40 } },
        h(ChevronLeft, { size: 22, color: "#fff" })),
      h("button", { type: "button", onClick: () => setSidebarOpen(true), "aria-label": "ক্যাটাগরির তালিকা", className: "flex items-center justify-center flex-shrink-0", style: { width: 40, height: 40 } },
        h(MenuIcon, { size: 22, color: "#fff" })),
      h("div", { className: "min-w-0" },
        h("div", { className: "text-base font-bold truncate", style: { fontFamily: "'Noto Serif Bengali', serif" } }, "ডিভাইন ব্লগ"),
        h("div", { className: "text-[11px] truncate", style: { opacity: 0.8 } }, "ইসলামি লেখার সমাহার"))),
    h("div", { className: "flex items-center gap-2 flex-shrink-0" },
      isCreator && h("button", { type: "button", onClick: () => setView("writerAdmin"), "aria-label": "লেখক ব্যবস্থাপনা", style: { minWidth: 40, minHeight: 40 } }, "✍️"),
      isWriter && h("button", {
        type: "button",
        onClick: () => { setEditingPost(null); setView("form"); },
        className: "text-sm font-semibold px-3 rounded-xl bg-white",
        style: { color: PRIMARY, minHeight: 40 },
      }, "+ নতুন লেখা")));

  const drawer = sidebarOpen && h("div", { className: "fixed inset-0 z-40 flex" },
    h("div", { className: "w-72 bg-white h-full overflow-y-auto shadow-xl" },
      h("div", { className: "flex items-center justify-between px-4 py-3 border-b border-slate-100" },
        h("span", { className: "text-sm font-bold text-emerald-950" }, "ক্যাটাগরি"),
        h("button", { type: "button", onClick: () => setSidebarOpen(false), "aria-label": "বন্ধ করুন" }, h(X, { size: 18 }))),
      [ALL_CATEGORY, ...BLOG_CATEGORIES].map((c) =>
        h("button", {
          key: c, type: "button", onClick: () => openCat(c),
          className: "w-full text-left px-4 py-3 text-sm border-b border-slate-50 " + (selectedCategory === c ? "font-bold text-emerald-950" : "text-slate-600"),
        }, catLabel(c)))),
    h("div", { className: "flex-1 bg-black/40", onClick: () => setSidebarOpen(false) }));

  const plate = (name) => h("div", { className: "flex items-center justify-center shrink-0", style: { width: 44, height: 44, borderRadius: 14, background: "var(--theme-soft, #E8F0EE)", color: PRIMARY } },
    h(ToolIcon, { name, size: 22, color: PRIMARY }));

  const grid = h("div", { className: "px-3 pt-3" },
    h("button", {
      type: "button", onClick: () => openCat(ALL_CATEGORY),
      className: "w-full flex items-center gap-3 rounded-2xl bg-white p-3 mb-3 text-left shadow-sm",
      style: { border: "1.5px solid var(--theme-accent, #C89B3C)", minHeight: 64 },
    }, plate("file"), h("span", { className: "text-base font-bold", style: { color: ink } }, catLabel(ALL_CATEGORY))),
    h("div", { className: "grid grid-cols-3 gap-2" },
      BLOG_CATEGORIES.map((c) =>
        h("button", {
          key: c, type: "button", onClick: () => openCat(c),
          className: "flex flex-col items-center text-center gap-2 rounded-2xl bg-white border border-slate-200/80 shadow-sm px-1 py-3",
          style: { minHeight: 112 },
        }, plate(CAT_ICON[c] || "list"),
        h("span", { className: "text-[13px] font-semibold leading-snug", style: { color: ink } }, c),
        h("span", { className: "text-[12px]", style: { color: "#5B6B64" } }, "(" + toBnDigits(countOf(c)) + ")")))));

  const listTitle = selectedCategory !== null && h("div", { className: "px-4 pt-3 pb-1 text-sm font-bold", style: { color: ink } }, catLabel(selectedCategory));

  const buildList = (list, emptyMsg) => loading
    ? h("div", { className: "flex justify-center py-16" }, h(Loader2, { size: 24, className: "animate-spin" }))
    : loadError
    ? h("div", { className: "px-4 py-8 text-sm text-red-600 text-center" }, loadError)
    : list.length === 0
    ? h("div", { className: "px-4 py-16 text-sm text-slate-500 text-center" }, emptyMsg)
    : h("div", { className: "px-4 flex flex-col gap-3" },
      list.map((post) => {
        const { preview, hasMore } = splitByMoreMarker(post.body);
        const canEdit = canEditPost(post);
        return h("div", { key: post.id, className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 cursor-pointer", onClick: () => openDetail(post) },
          h("div", { className: "flex items-center justify-between mb-1" },
            h("span", { className: "text-xs font-semibold", style: { color: "var(--theme-accent, #C89B3C)" } }, "#" + post.category),
            canEdit && h("div", { className: "flex items-center gap-3", onClick: (e) => e.stopPropagation() },
              h("button", { type: "button", onClick: () => { setEditingPost(post); setView("form"); } }, h(EditIcon, { size: 14, color: "#8A9A8F" })),
              h("button", { type: "button", onClick: () => handleDelete(post) }, h(Trash, { size: 14, color: "#D64545" })))),
          h("div", { className: "text-sm font-bold text-emerald-950 mb-1", style: { fontFamily: "'Noto Serif Bengali', serif" } }, post.title),
          h("div", { className: "text-xs text-slate-600 line-clamp-2" }, preview),
          h("div", { className: "mt-1 text-xs font-semibold", style: { color: PRIMARY } }, hasMore || preview ? "আরো পড়ুন" : ""));
      }));

  const postList = buildList(filteredPosts, "এই ক্যাটাগরিতে এখনো কোনো লেখা নেই।");
  const searchBar = !loading && !loadError && h("div", { className: "px-3 pt-3" },
    h("div", { className: "flex items-center gap-2 rounded-2xl bg-white border px-3", style: { borderColor: "var(--theme-line, #D7DFD9)", minHeight: 48 } },
      h("svg", { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#8A9A8F", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, h("circle", { cx: 11, cy: 11, r: 7 }), h("path", { d: "M20 20l-3.5-3.5" })),
      h("input", { type: "search", value: q, onChange: (e) => setQ(e.target.value), placeholder: "লেখা খুঁজুন (শিরোনাম বা ট্যাগ)", "aria-label": "লেখা খুঁজুন", className: "flex-1 min-w-0 bg-transparent outline-none text-sm py-2" }),
      q && h("button", { type: "button", onClick: () => setQ(""), "aria-label": "মুছুন", style: { minWidth: 32, minHeight: 32 } }, h(X, { size: 16 }))));

  return h("div", { className: "min-h-screen pb-24 bg-[#F4F7F1] relative" },
    header,
    drawer,
    searchBar,
    needle
      ? h("div", null, h("div", { className: "px-4 pt-3 pb-1 text-sm font-bold", style: { color: ink } }, "খোঁজার ফল (" + toBnDigits(searchResults.length) + ")"), h("div", { className: "pt-2" }, buildList(searchResults, "কোনো লেখা পাওয়া যায়নি।")))
      : inListView ? h("div", null, listTitle, h("div", { className: "pt-2" }, postList)) : (loadError || loading ? postList : grid));
}
