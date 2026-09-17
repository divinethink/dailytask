// BlogSection.jsx — "ডিভাইন ব্লগ"(Public Tools সহায়িকা→ক্যাটাগরি ৬, Phase E,
// 3_4/3_3 §৮)। Read সবার জন্য open(guest সহ)। Category-sidebar+post-list,
// writer-দের নিজের পোস্ট এডিট/ডিলিট, App-Creator moderation-override+
// writer-ব্যবস্থাপনা প্যানেল। React global(window.React, globals.js)।

import { auth } from "../../../legacy/firebaseConfig.js";
import { formatBnDateTime } from "../../../legacy/appHelpers.js";
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
import { BlogWriterAdmin } from "./BlogWriterAdmin.jsx";

const { useState, useEffect } = React;

const ALL_CATEGORY = "সব";

export function BlogSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isWriter, setIsWriter] = useState(false);
  const isCreator = isCreatorAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [selectedPost, setSelectedPost] = useState(null); // full post object
  const [expandedPost, setExpandedPost] = useState({}); // { [postId]: true } — "আরো পড়ুন" দেখানো হয়েছে
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
    selectedCategory === ALL_CATEGORY ? posts : posts.filter((p) => p.category === selectedCategory);

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

  if (view === "detail" && selectedPost) {
    const canEdit = canEditPost(selectedPost);
    const { preview, rest, hasMore } = splitByMoreMarker(selectedPost.body);
    const expanded = !!expandedPost[selectedPost.id];
    return /*#__PURE__*/React.createElement(
      "div",
      { className: "min-h-screen pb-24 bg-[#F4F7F1]" },
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex items-center justify-between px-4 pt-4 pb-2" },
        /*#__PURE__*/React.createElement(
          "button",
          { type: "button", onClick: backToList, className: "flex items-center gap-1 text-sm font-semibold text-emerald-950" },
          /*#__PURE__*/React.createElement(ChevronLeft, { size: 16 }),
          "ব্লগ"
        ),
        canEdit &&
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex items-center gap-3" },
            /*#__PURE__*/React.createElement(
              "button",
              {
                type: "button",
                onClick: () => {
                  setEditingPost(selectedPost);
                  setView("form");
                },
              },
              /*#__PURE__*/React.createElement(EditIcon, { size: 16, color: "#8A9A8F" })
            ),
            /*#__PURE__*/React.createElement(
              "button",
              { type: "button", onClick: () => handleDelete(selectedPost) },
              /*#__PURE__*/React.createElement(Trash, { size: 16, color: "#D64545" })
            )
          )
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "mx-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-xs font-semibold mb-1", style: { color: "var(--theme-accent, #C89B3C)" } },
          "#" + selectedPost.category
        ),
        /*#__PURE__*/React.createElement(
          "h2",
          { className: "text-lg font-bold text-emerald-950 mb-2", style: { fontFamily: "'Noto Serif Bengali', serif" } },
          selectedPost.title
        ),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-sm text-slate-700 whitespace-pre-wrap leading-relaxed" },
          hasMore && !expanded ? preview : hasMore ? preview + "\n\n" + rest : preview
        ),
        hasMore &&
          !expanded &&
          /*#__PURE__*/React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setExpandedPost((s) => ({ ...s, [selectedPost.id]: true })),
              className: "mt-2 text-sm font-semibold",
              style: { color: "var(--theme-primary, #0E4B43)" },
            },
            "আরো পড়ুন"
          ),
        selectedPost.sourceNote &&
          /*#__PURE__*/React.createElement(
            "div",
            { className: "mt-4 text-xs text-slate-500" },
            "সূত্র: " + selectedPost.sourceNote
          )
      )
    );
  }

  // --- list view ---
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1] relative" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "flex items-center justify-between px-4 pt-4 pb-2" },
      /*#__PURE__*/React.createElement(
        "button",
        { type: "button", onClick: () => setSidebarOpen(true), "aria-label": "ক্যাটাগরি" },
        /*#__PURE__*/React.createElement(MenuIcon, { size: 20, color: "#0E4B43" })
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "text-base font-bold text-emerald-950", style: { fontFamily: "'Noto Serif Bengali', serif" } },
        "📚 ডিভাইন ব্লগ"
      ),
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex items-center gap-3" },
        isCreator &&
          /*#__PURE__*/React.createElement(
            "button",
            { type: "button", onClick: () => setView("writerAdmin"), "aria-label": "লেখক ব্যবস্থাপনা" },
            "✍️"
          ),
        isWriter &&
          /*#__PURE__*/React.createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                setEditingPost(null);
                setView("form");
              },
              className: "text-xs font-semibold px-2 py-1 rounded-lg text-white",
              style: { background: "var(--theme-primary, #0E4B43)" },
            },
            "+ নতুন লেখা"
          )
      )
    ),

    sidebarOpen &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "fixed inset-0 z-40 flex" },
        /*#__PURE__*/React.createElement("div", {
          className: "flex-1 bg-black/40",
          onClick: () => setSidebarOpen(false),
        }),
        /*#__PURE__*/React.createElement(
          "div",
          { className: "w-64 bg-white h-full overflow-y-auto shadow-xl" },
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex items-center justify-between px-4 py-3 border-b border-slate-100" },
            /*#__PURE__*/React.createElement("span", { className: "text-sm font-bold text-emerald-950" }, "ক্যাটাগরি"),
            /*#__PURE__*/React.createElement(
              "button",
              { type: "button", onClick: () => setSidebarOpen(false) },
              /*#__PURE__*/React.createElement(X, { size: 18 })
            )
          ),
          [ALL_CATEGORY, ...BLOG_CATEGORIES].map((c) =>
            /*#__PURE__*/React.createElement(
              "button",
              {
                key: c,
                type: "button",
                onClick: () => {
                  setSelectedCategory(c);
                  setSidebarOpen(false);
                },
                className:
                  "w-full text-left px-4 py-2.5 text-sm border-b border-slate-50 " +
                  (selectedCategory === c ? "font-bold text-emerald-950" : "text-slate-600"),
              },
              c
            )
          )
        )
      ),

    loading
      ? /*#__PURE__*/React.createElement(
          "div",
          { className: "flex justify-center py-16" },
          /*#__PURE__*/React.createElement(Loader2, { size: 24, className: "animate-spin" })
        )
      : loadError
      ? /*#__PURE__*/React.createElement("div", { className: "px-4 py-8 text-sm text-red-600 text-center" }, loadError)
      : filteredPosts.length === 0
      ? /*#__PURE__*/React.createElement(
          "div",
          { className: "px-4 py-16 text-sm text-slate-500 text-center" },
          "এই ক্যাটাগরিতে এখনো কোনো লেখা নেই।"
        )
      : /*#__PURE__*/React.createElement(
          "div",
          { className: "px-4 flex flex-col gap-3" },
          filteredPosts.map((post) => {
            const { preview, hasMore } = splitByMoreMarker(post.body);
            const canEdit = canEditPost(post);
            return /*#__PURE__*/React.createElement(
              "div",
              {
                key: post.id,
                className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 cursor-pointer",
                onClick: () => openDetail(post),
              },
              /*#__PURE__*/React.createElement(
                "div",
                { className: "flex items-center justify-between mb-1" },
                /*#__PURE__*/React.createElement(
                  "span",
                  { className: "text-xs font-semibold", style: { color: "var(--theme-accent, #C89B3C)" } },
                  "#" + post.category
                ),
                canEdit &&
                  /*#__PURE__*/React.createElement(
                    "div",
                    { className: "flex items-center gap-3", onClick: (e) => e.stopPropagation() },
                    /*#__PURE__*/React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          setEditingPost(post);
                          setView("form");
                        },
                      },
                      /*#__PURE__*/React.createElement(EditIcon, { size: 14, color: "#8A9A8F" })
                    ),
                    /*#__PURE__*/React.createElement(
                      "button",
                      { type: "button", onClick: () => handleDelete(post) },
                      /*#__PURE__*/React.createElement(Trash, { size: 14, color: "#D64545" })
                    )
                  )
              ),
              /*#__PURE__*/React.createElement(
                "div",
                { className: "text-sm font-bold text-emerald-950 mb-1", style: { fontFamily: "'Noto Serif Bengali', serif" } },
                post.title
              ),
              /*#__PURE__*/React.createElement(
                "div",
                { className: "text-xs text-slate-600 line-clamp-2" },
                preview
              ),
              /*#__PURE__*/React.createElement(
                "div",
                { className: "mt-1 text-xs font-semibold", style: { color: "var(--theme-primary, #0E4B43)" } },
                hasMore || preview ? "আরো পড়ুন" : ""
              )
            );
          })
        )
  );
}
