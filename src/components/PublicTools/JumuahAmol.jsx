// JumuahAmol.jsx — "সহায়িকা"→"বিশেষ দিন ও উপলক্ষ", item ২৬(3_1)। কনটেন্ট
// ✏️(accordion) — কিন্তু নিজস্ব date-keyed checklist-state আলাদা, local-ই থাকে
// (3_1: "শুধু item-labels/content editable, tick-state local-ই থাকে")। তাই এখানে
// custom checklist-display(checkbox, localStorage) + admin-only নিচে
// EditableSection accordion(content ব্যবস্থাপনার জন্য, RotatingCard.jsx-এর একই
// admin-toggle pattern reuse)।
// React global(window.React, globals.js)।

import { isCreatorAuth } from "../../legacy/familyIdentity.js";
import { fetchSection } from "../../legacy/editableContent.js";
import { EditableSection } from "./EditableSection.jsx";

const { useState, useEffect } = React;

const SECTION_ID = "jumuah_amol";

const JUMUAH_DEFAULT = [
  { itemId: "ju_ghusl", title: "গোসল করা", body: "জুমার দিন গোসল করা প্রাপ্তবয়স্কদের জন্য সুন্নত মুআক্কাদা(বুখারি-মুসলিম)।" },
  { itemId: "ju_clean_clothes", title: "পরিষ্কার/উত্তম পোশাক পরা", body: "সম্ভব হলে সাদা বা পরিষ্কার-উত্তম পোশাক পরে মসজিদে যাওয়া।" },
  { itemId: "ju_perfume", title: "সুগন্ধি ব্যবহার করা(পুরুষদের জন্য)", body: "উপলব্ধ থাকলে সুগন্ধি ব্যবহার করা সুন্নত।" },
  { itemId: "ju_early", title: "আগে-ভাগে মসজিদে যাওয়া", body: "যত আগে যাওয়া যায় তত বেশি ফজিলত(বুখারি-মুসলিম)।" },
  { itemId: "ju_kahf", title: "সূরা কাহফ তেলাওয়াত করা", body: "জুমার দিনে সূরা কাহফ পড়ার বিশেষ ফজিলত হাদিসে এসেছে।" },
  { itemId: "ju_durud", title: "বেশি বেশি দুরুদ পড়া", body: "জুমার দিনে/রাতে বেশি দুরুদ পড়ার নির্দেশ হাদিসে এসেছে(আবু দাউদ)।" },
  { itemId: "ju_dua_last_hour", title: "আসর থেকে মাগরিবের মধ্যে দোয়া করা", body: "জুমার দিনের একটা নির্দিষ্ট মুহূর্তে দোয়া কবুল হয় — সাধারণত আসরের পর থেকে মাগরিবের আগ পর্যন্ত সময়টা অগ্রাধিকার দেওয়া হয়।" },
  { itemId: "ju_khutbah", title: "মনোযোগ দিয়ে খুতবা শোনা", body: "খুতবা চলাকালীন চুপ থেকে মনোযোগ দিয়ে শোনা, কথা না বলা।" },
  { itemId: "ju_sadaqa", title: "সদকা করা", body: "জুমার দিনে সদকা করার ফজিলতের কথা অনেক আলেম উল্লেখ করেছেন।" },
];

function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function loadChecks() {
  try {
    const raw = localStorage.getItem("dt_jumuah_check_" + todayKey());
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveChecks(checks) {
  try {
    localStorage.setItem("dt_jumuah_check_" + todayKey(), JSON.stringify(checks));
  } catch (e) {
    // localStorage ব্লকড হলেও UI ভাঙবে না, শুধু persist হবে না।
  }
}

export function JumuahAmol() {
  const isCreator = isCreatorAuth();
  const [doc, setDoc] = useState(null);
  const [checks, setChecks] = useState(loadChecks);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSection(SECTION_ID).then((data) => {
      if (alive) setDoc(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const items =
    doc && doc.accordion && Array.isArray(doc.accordion.items) ? doc.accordion.items : JUMUAH_DEFAULT;

  function toggleCheck(itemId) {
    setChecks((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      saveChecks(next);
      return next;
    });
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex flex-col gap-2" },
    items.map((item) =>
      /*#__PURE__*/React.createElement(
        "label",
        {
          key: item.itemId,
          className: "bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3 flex items-start gap-3",
        },
        /*#__PURE__*/React.createElement("input", {
          type: "checkbox",
          checked: !!checks[item.itemId],
          onChange: () => toggleCheck(item.itemId),
          className: "mt-1 w-4 h-4",
        }),
        /*#__PURE__*/React.createElement(
          "div",
          null,
          /*#__PURE__*/React.createElement(
            "div",
            {
              className:
                "text-sm font-semibold " + (checks[item.itemId] ? "text-slate-400 line-through" : "text-emerald-950"),
            },
            item.title
          ),
          /*#__PURE__*/React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, item.body)
        )
      )
    ),
    isCreator &&
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setShowAdmin((s) => !s),
          className: "text-xs font-semibold text-slate-500 underline self-start px-1 mt-1",
        },
        showAdmin ? "আমল-ব্যবস্থাপনা বন্ধ করুন" : "আমলের তালিকা ব্যবস্থাপনা(এডমিন)"
      ),
    isCreator &&
      showAdmin &&
      /*#__PURE__*/React.createElement(EditableSection, {
        sectionId: SECTION_ID,
        format: "accordion",
        defaultContent: JUMUAH_DEFAULT,
      })
  );
}
