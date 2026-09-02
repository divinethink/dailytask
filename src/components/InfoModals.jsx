// A4 G1 — Info modal components (Member/Excuse/Weekly/Meeting), extracted verbatim from
// legacy App(). Structural-only: original show*/setShow* state names become {show, onClose}
// props (state ownership stays in App(), per Roadmap A4 Owner Rule). JSX body unchanged.
import { InfoIcon, X } from "./icons.jsx";

export function MemberInfoModal({ show, onClose }) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " তথ্য / নির্দেশনা"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "যাদের নিজস্ব স্মার্টফোন নেই, শুধু তাদের নাম এখানে ম্যানুয়ালি যোগ করুন। তাদের আমল ও তথ্য এই ডিভাইস থেকেই সংরক্ষণ ও পরিচালনা করা যাবে।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি")));
}

export function ExcuseInfoModal({ show, onClose }) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ওজর কী?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "অসুস্থতা, সফর কিংবা নারীদের বিশেষ সময়ে কোনো আমল পূর্ণ করা সম্ভব না হলে পাশের \"ওজর\" বাটনে ট্যাপ করুন।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800 mb-1.5"
  }, "ওজর সিলেক্ট করলে যা হবে:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-600 leading-relaxed mb-3 space-y-1 list-disc pl-4"
  }, /*#__PURE__*/React.createElement("li", null, "ইনপুট অপশনটি বন্ধ হয়ে যাবে।"), /*#__PURE__*/React.createElement("li", null, "সেদিনের দৈনিক স্কোর, স্ট্রীক (ধারাবাহিকতা), ক্যালেন্ডার, গ্রাফ ও রিপোর্টে আমলটি সেদিনের \"হিসাবের বাইরে\" থাকবে — অর্থাৎ নেগেটিভ বা মিসড হিসেবে গণ্য হবে না।")), /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-amber-900 mb-1"
  }, "বিশেষ দ্রষ্টব্য:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed mb-1.5"
  }, "১. পুরুষদের ক্ষেত্রে: ফরজ সালাতে \"ওজর\" প্রযোজ্য নয়। শরঈ বিধান অনুযায়ী অসুস্থতা বা সফরেও সাধ্যমতো ওয়াক্তেই ফরজ সালাত আদায় করতে হবে। ওয়াক্তে আদায় না হলে পরে তা কাযা আদায় করতে হবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-900/90 leading-relaxed"
  }, "২. নারীদের ক্ষেত্রে: কেবল হায়েজ ও নেফাস অবস্থায় ফরজ সালাতে \"ওজর\" প্রযোজ্য। এ সময়ের সালাত পরে কাযা করতে হয় না। তবে অসুস্থতা বা সফরের কারণে ফরজ সালাতে \"ওজর\" প্রযোজ্য নয়; সাধ্যমতো ওয়াক্তেই সালাত আদায় করতে হবে। ওয়াক্তে আদায় না হলে পরে তা কাযা আদায় করতে হবে।")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি")));
}

export function WeeklyInfoModal({ show, onClose }) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " সাপ্তাহিক রিফ্লেকশন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "প্রতি সপ্তাহ শেষে নিজের আমল ও কাজের পর্যালোচনা করুন। এই সপ্তাহে কোন কাজগুলো ভালো হয়েছে এবং কোথায় আরও উন্নতি করা প্রয়োজন, তা এখানে সংক্ষিপ্ত নোট হিসেবে লিখে রাখুন। নতুন সপ্তাহ বা তথ্য যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হয়ে যাবে।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি")));
}

export function MeetingInfoModal({ show, onClose }) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " মাসিক পারিবারিক সভা"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "মাস শেষে পরিবারের সবাইকে নিয়ে বসুন এবং বিগত মাসের অগ্রগতি মূল্যায়ন করুন। নতুন বিষয় বা সিদ্ধান্ত যোগ করতে \"+ সারি যোগ করুন\" বোতামে ক্লিক করুন; এতে স্বয়ংক্রিয়ভাবে পরবর্তী ক্রমিক নম্বর যুক্ত হবে। সভায় আলোচিত গুরুত্বপূর্ণ বিষয় ও সিদ্ধান্তগুলো লিখুন এবং সভা শেষে চাইলে পিডিএফ ফাইল ডাউনলোড এবং ডেটা ব্যাকআপ করে রাখতে পারেন।"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি")));
}

export function MonthlyOverviewInfoModal({ show, onClose }) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ক্যালেন্ডারের রঙ কী বোঝায়?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "প্রতিদিনের ঘরের রঙ সেদিনের স্কোরের উপর নির্ভর করে নির্ধারিত হয়:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs text-slate-700 leading-relaxed mb-4 space-y-2"
  },
  /*#__PURE__*/React.createElement("li", { className: "flex items-center gap-2" },
    /*#__PURE__*/React.createElement("span", { className: "w-4 h-4 rounded-md flex-shrink-0", style: { background: "var(--theme-primary)" } }),
    "৮৫% বা তার বেশি — চমৎকার"
  ),
  /*#__PURE__*/React.createElement("li", { className: "flex items-center gap-2" },
    /*#__PURE__*/React.createElement("span", { className: "w-4 h-4 rounded-md flex-shrink-0", style: { background: "#4C8C74" } }),
    "৬০% থেকে ৮৪% — ভালো"
  ),
  /*#__PURE__*/React.createElement("li", { className: "flex items-center gap-2" },
    /*#__PURE__*/React.createElement("span", { className: "w-4 h-4 rounded-md flex-shrink-0", style: { background: "#C89B3C" } }),
    "৩৫% থেকে ৫৯% — মাঝারি"
  ),
  /*#__PURE__*/React.createElement("li", { className: "flex items-center gap-2" },
    /*#__PURE__*/React.createElement("span", { className: "w-4 h-4 rounded-md flex-shrink-0", style: { background: "#C1666B" } }),
    "০% এর বেশি কিন্তু ৩৫% এর কম — কম"
  ),
  /*#__PURE__*/React.createElement("li", { className: "flex items-center gap-2" },
    /*#__PURE__*/React.createElement("span", { className: "w-4 h-4 rounded-md flex-shrink-0 border border-slate-300", style: { background: "#E7EEE3" } }),
    "কোনো এন্ট্রি নেই বা স্কোর ০% — খালি"
  )
  ), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বুঝেছি")));
}

