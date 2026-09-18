// RotatingCard.jsx — "দৈনিক আমল-চ্যালেঞ্জ"/"মৃত্যুর স্মরণ"(3_1 §"আমল হাব" item
// ৭/৮)-এর জন্য শেয়ার্ড component। দুটোই একই pattern: date-based deterministic
// rotate(`3_2` লাইন ২০৪ — `Math.floor(Date.now()/86400000) % array.length`,
// কোনো persisted state না) থেকে আজকের একটা মাত্র বার্তা দেখায়। Content-pool
// নিজে accordion format-এই Firestore-এ থাকে(editableContent.js reuse) — App
// Creator পুরো pool এডিট করেন EditableSection-এর accordion UI দিয়েই(নিচে
// admin-only toggle-panel), সাধারণ ইউজার শুধু আজকের ঘূর্ণায়মান কার্ডটা দেখেন।
// React global(window.React, globals.js)।

import { isCreatorAuth } from "../../legacy/familyIdentity.js";
import { fetchSection } from "../../legacy/editableContent.js";
import { EditableSection } from "./EditableSection.jsx";

const { useState, useEffect } = React;

export function RotatingCard({ sectionId, defaultContent, cardIcon }) {
  const isCreator = isCreatorAuth();
  const [doc, setDoc] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSection(sectionId).then((data) => {
      if (alive) setDoc(data);
    });
    return () => {
      alive = false;
    };
  }, [sectionId]);

  const items =
    doc && doc.accordion && Array.isArray(doc.accordion.items) && doc.accordion.items.length
      ? doc.accordion.items
      : defaultContent;
  const idx = items.length ? Math.floor(Date.now() / 86400000) % items.length : 0;
  const today = items[idx];

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex flex-col gap-3" },
    /*#__PURE__*/React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col gap-2" },
      /*#__PURE__*/React.createElement("div", { className: "text-2xl" }, cardIcon || "✨"),
      today &&
        /*#__PURE__*/React.createElement(
          "div",
          { className: "text-sm font-semibold text-emerald-950" },
          today.title
        ),
      today &&
        /*#__PURE__*/React.createElement(
          "p",
          { className: "text-sm text-slate-600 leading-relaxed whitespace-pre-line" },
          today.body
        )
    ),
    isCreator &&
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setShowAdmin((s) => !s),
          className: "text-xs font-semibold text-slate-500 underline self-start px-1",
        },
        showAdmin ? "বার্তা-ব্যবস্থাপনা বন্ধ করুন" : "সব বার্তা ব্যবস্থাপনা(এডমিন)"
      ),
    isCreator &&
      showAdmin &&
      /*#__PURE__*/React.createElement(EditableSection, {
        sectionId,
        format: "accordion",
        defaultContent,
      })
  );
}
