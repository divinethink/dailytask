// PrayerImportance.jsx — "সহায়িকা"→"সালাত ও পবিত্রতা", item ৭(3_1)। richtext(মূল
// আলোচনা)+table(রাকাত-তালিকা) — দুটো format একই sectionId-এ coexist করে(3_6 §২)।
// PublicToolsShell.jsx নিজেই back+title header দেখায়, এই ফাইলে prop লাগে না।
// React global(window.React, globals.js)।

import { EditableSection } from "./EditableSection.jsx";

const IMPORTANCE_DEFAULT = [
  "নামাজ ইসলামের দ্বিতীয় স্তম্ভ এবং ঈমানের পরই সবচেয়ে গুরুত্বপূর্ণ ফরজ ইবাদত। কুরআনে বহু জায়গায় নামাজ কায়েম করার নির্দেশ এসেছে(সূরা বাকারা ৪৩, সূরা আনকাবুত ৪৫)।",
  "কিয়ামতের দিন বান্দার আমলের মধ্যে সর্বপ্রথম নামাজের হিসাব নেওয়া হবে — তা ঠিক থাকলে বাকি আমলও ঠিক থাকবে(তিরমিযি)।",
  "প্রাপ্তবয়স্ক, সুস্থ-বুদ্ধিসম্পন্ন প্রতিটা মুসলিম নর-নারীর উপর দৈনিক ৫ ওয়াক্ত নামাজ ফরজ — অসুস্থতা/সফরেও নামাজ মাফ হয় না, শুধু পদ্ধতি সহজ হয়(কসর, বসে/শুয়ে আদায়)।",
  "নামাজ ছেড়ে দেওয়াকে হাদিসে অত্যন্ত গুরুত্বসহকারে সতর্ক করা হয়েছে — ইচ্ছাকৃতভাবে নামাজ ত্যাগ করা কুফরের কাছাকাছি গুনাহ হিসেবে বর্ণিত হয়েছে(তিরমিযি)।",
  "নামাজ শুধু আনুষ্ঠানিকতা নয় — এটা অশ্লীলতা ও অন্যায় কাজ থেকে বিরত রাখে(সূরা আনকাবুত ৪৫) এবং আল্লাহর সাথে বান্দার সরাসরি সংযোগের মাধ্যম।",
].join("\n\n");

const IMPORTANCE_TABLE_DEFAULT = {
  columns: ["ওয়াক্ত", "সুন্নত(কাবলিয়াহ)", "ফরজ", "সুন্নত/নফল(বাদিয়াহ)"],
  rows: [
    ["ফজর", "২ রাকাত সুন্নত মুআক্কাদা", "২ রাকাত", "—"],
    ["যোহর", "৪ রাকাত সুন্নত মুআক্কাদা", "৪ রাকাত", "২ রাকাত সুন্নত"],
    ["আসর", "৪ রাকাত সুন্নত(গাইরে মুআক্কাদা)", "৪ রাকাত", "—"],
    ["মাগরিব", "—", "৩ রাকাত", "২ রাকাত সুন্নত"],
    ["ইশা", "৪ রাকাত সুন্নত(গাইরে মুআক্কাদা)", "৪ রাকাত", "২ রাকাত সুন্নত + ৩ রাকাত বিতর(ওয়াজিব)"],
  ],
};

export function PrayerImportance() {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex flex-col gap-3" },
    /*#__PURE__*/React.createElement(EditableSection, {
      sectionId: "prayer_importance",
      format: "richtext",
      defaultContent: IMPORTANCE_DEFAULT,
    }),
    /*#__PURE__*/React.createElement(EditableSection, {
      sectionId: "prayer_importance",
      format: "table",
      defaultContent: IMPORTANCE_TABLE_DEFAULT,
    })
  );
}
