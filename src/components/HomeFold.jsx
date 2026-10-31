// হোম কার্ড ভাঁজ(ধাপ ক): যে কার্ডের নিজস্ব accordion নেই(তাযকিরাহ/স্ট্রিক/অন্তর্দৃষ্টি/ফোকাস/মাসিক ওভারভিউ),
// তাকে fold = open/closed হলে শিরোনামসহ ভাঁজযোগ্য কার্ডে মোড়ায়। fold = fixed হলে কিছুই মোড়ায় না(আগের আচরণ হুবহু)।
import { ChevronDown } from "./icons.jsx";

export function FoldWrap({ fold, title, children }) {
  const [open, setOpen] = React.useState(fold === "open");
  if (fold !== "open" && fold !== "closed") return children;
  return React.createElement(
    "div",
    { className: "bg-white rounded-2xl p-4 border border-[#E4D3A8] shadow-[0_3px_12px_-3px_rgba(160,120,40,0.25)]" },
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setOpen(o => !o),
        className: "w-full flex items-center justify-between gap-2" + (open ? " mb-3" : "")
      },
      React.createElement("h3", { className: "text-sm font-bold text-emerald-950 text-left" }, title),
      React.createElement(ChevronDown, {
        size: 15,
        color: "#8A9A8F",
        className: "transition-transform" + (open ? " rotate-180" : "")
      })
    ),
    open && children
  );
}

import { sanitizeLayout, cardTitle } from "../legacy/homeLayout.js";

// দৈনিক-এন্ট্রি অংশ: তাযকিরাহ + ক্যাটেগরি-কার্ড + অন্যান্য, সেভ-করা ক্রম/দৃশ্যমানতা/fold অনুযায়ী।
// nodes[id](fold) → element। কীতে fold যুক্ত, তাই fold বদলালে কার্ড নতুন করে mount হয়(নতুন ডিফল্ট প্রযোজ্য)।
export function homeEntryCards(member, nodes) {
  const out = [];
  sanitizeLayout(member && member.homeLayout).entry.forEach(c => {
    if (!c.visible || !nodes[c.id]) return;
    const key = c.id + ":" + c.fold;
    out.push(
      React.createElement(
        React.Fragment,
        { key },
        c.id === "tazkirah" || c.id === "muhasaba"
          ? React.createElement(FoldWrap, { fold: c.fold, title: cardTitle("entry", c.id) }, nodes[c.id]())
          : nodes[c.id](c.fold)
      )
    );
  });
  return out;
}

// সেভ-বাটনের নিচের সেকশন। weekly/meeting-এর নিজস্ব accordion আছে(fold prop নেয়); বাকিগুলো FoldWrap-এ।
const PX_WRAPPED = { streak: true, insight: true, focus: true, tomorrow: true };
export function renderHomeBelow(member, nodes) {
  const out = [];
  sanitizeLayout(member && member.homeLayout).below.forEach(c => {
    if (!c.visible || !nodes[c.id]) return;
    const key = c.id + ":" + c.fold;
    const title = cardTitle("below", c.id);
    let el;
    if (c.id === "weekly" || c.id === "meeting") {
      el = nodes[c.id](c.fold);
    } else if (c.fold === "fixed") {
      el = PX_WRAPPED[c.id] ? React.createElement("div", { className: "px-5" }, nodes[c.id]()) : nodes[c.id]();
    } else {
      el = React.createElement("div", { className: "px-5 mt-5" }, React.createElement(FoldWrap, { fold: c.fold, title }, nodes[c.id]()));
    }
    out.push(React.createElement(React.Fragment, { key }, el));
  });
  return out;
}
