// EditableSection.jsx — shared wrapper component(3_6_Editable_Content_Plan.md
// §৫)। format("richtext"|"accordion"|"table") prop নিয়ে সঠিক UI render করে +
// App-Creator-only edit-controls conditionally দেখায়(isCreatorAuth())। প্রতিটা
// content-component(MorningEveningAzkar.jsx ইত্যাদি) নিজের sectionId+format
// দিয়ে এই একটা shared component call করে — প্রতিটা আলাদাভাবে edit-UI বানাতে হয় না।
//
// Fallback-safety(§৭, 🔴 Critical): Firestore doc না থাকলে, read fail করলে,
// অথবা format-অনুযায়ী field malformed/missing হলে — কখনো crash/blank না করে
// সবসময় caller-এর defaultContent দেখায়।
// React global(window.React, globals.js)।

import { isCreatorAuth } from "../../legacy/familyIdentity.js";
import { EditIcon, Trash } from "../icons.jsx";
import {
  fetchSection,
  saveRichtext,
  saveAccordion,
  saveTable,
  makeAccordionItemId,
} from "../../legacy/editableContent.js";

const { useState, useEffect } = React;

const MUTED = "#8A9A8F";
const PRIMARY = "var(--theme-primary, #0E4B43)";
const CARD = "bg-white rounded-2xl shadow-sm border border-slate-200/80";

function IconBtn({ onClick, label, children, disabled }) {
  return /*#__PURE__*/React.createElement(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      "aria-label": label,
      className: "p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40",
    },
    children
  );
}

function SaveCancelRow({ onSave, onCancel, busy }) {
  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex gap-2 justify-end mt-2" },
    /*#__PURE__*/React.createElement(
      "button",
      {
        type: "button",
        onClick: onCancel,
        disabled: busy,
        className: "px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200",
      },
      "বাতিল"
    ),
    /*#__PURE__*/React.createElement(
      "button",
      {
        type: "button",
        onClick: onSave,
        disabled: busy,
        className: "px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60",
        style: { background: PRIMARY },
      },
      busy ? "সেভ হচ্ছে..." : "সেভ করুন"
    )
  );
}

export function EditableSection({ sectionId, format, defaultContent, filterItems }) {
  const isCreator = isCreatorAuth();
  const [doc, setDoc] = useState(null); // fetched raw Firestore data, null = none/not-yet
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSection(sectionId).then((data) => {
      if (alive) setDoc(data);
    });
    return () => {
      alive = false;
    };
  }, [sectionId]);

  async function withBusy(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError("সেভ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  if (format === "richtext") {
    return /*#__PURE__*/React.createElement(RichtextBlock, {
      sectionId,
      defaultContent,
      doc,
      isCreator,
      busy,
      error,
      withBusy,
      onSaved: (body) => setDoc({ ...(doc || {}), richtext: { body } }),
    });
  }
  if (format === "table") {
    return /*#__PURE__*/React.createElement(TableBlock, {
      sectionId,
      defaultContent,
      doc,
      isCreator,
      busy,
      error,
      withBusy,
      onSaved: (columns, rows) => setDoc({ ...(doc || {}), table: { columns, rows } }),
    });
  }
  // accordion(default)
  return /*#__PURE__*/React.createElement(AccordionBlock, {
    sectionId,
    defaultContent,
    filterItems,
    doc,
    isCreator,
    busy,
    error,
    withBusy,
    onSaved: (items) => setDoc({ ...(doc || {}), accordion: { items } }),
  });
}

// ---------- richtext ----------
function RichtextBlock({ defaultContent, doc, isCreator, busy, error, withBusy, sectionId, onSaved }) {
  const body =
    doc && doc.richtext && typeof doc.richtext.body === "string" ? doc.richtext.body : defaultContent || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);

  function startEdit() {
    setDraft(body);
    setEditing(true);
  }

  function save() {
    withBusy(async () => {
      await saveRichtext(sectionId, draft);
      onSaved(draft.trim());
      setEditing(false);
    });
  }

  return /*#__PURE__*/React.createElement(
    "div",
    { className: CARD + " p-4" },
    isCreator &&
      !editing &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex justify-end mb-1" },
        /*#__PURE__*/React.createElement(IconBtn, { onClick: startEdit, label: "সম্পাদনা করুন" },
          /*#__PURE__*/React.createElement(EditIcon, { size: 16, color: MUTED })
        )
      ),
    editing
      ? /*#__PURE__*/React.createElement(
          "div",
          null,
          /*#__PURE__*/React.createElement("textarea", {
            value: draft,
            onChange: (e) => setDraft(e.target.value),
            rows: 10,
            className: "w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none",
          }),
          error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-500 mt-1" }, error),
          /*#__PURE__*/React.createElement(SaveCancelRow, { onSave: save, onCancel: () => setEditing(false), busy })
        )
      : body
          .split("\n\n")
          .filter((p) => p.trim())
          .map((p, i) =>
            /*#__PURE__*/React.createElement(
              "p",
              { key: i, className: "text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-line" },
              p
            )
          )
  );
}

// ---------- accordion ----------
function AccordionBlock({ defaultContent, doc, isCreator, busy, error, withBusy, sectionId, onSaved, filterItems }) {
  const items =
    doc && doc.accordion && Array.isArray(doc.accordion.items) ? doc.accordion.items : defaultContent || [];
  const displayItems = filterItems ? filterItems(items) : items;
  const [expanded, setExpanded] = useState({});
  const [editingId, setEditingId] = useState(null); // null | "new" | itemId
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");

  function toggle(id) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  function startEdit(item) {
    setFormTitle(item.title || "");
    setFormBody(item.body || "");
    setEditingId(item.itemId);
  }

  function startAdd() {
    setFormTitle("");
    setFormBody("");
    setEditingId("new");
  }

  function cancelForm() {
    setEditingId(null);
  }

  function saveForm() {
    withBusy(async () => {
      const title = formTitle.trim();
      const body = formBody.trim();
      let next;
      if (editingId === "new") {
        next = items.concat([{ itemId: makeAccordionItemId(), title, body }]);
      } else {
        next = items.map((it) => (it.itemId === editingId ? { ...it, title, body } : it));
      }
      await saveAccordion(sectionId, next);
      onSaved(next);
      setEditingId(null);
    });
  }

  function deleteItem(item) {
    if (!window.confirm(`"${item.title}" আইটেমটি মুছে ফেলতে চান? এটা ফেরত আনা যাবে না।`)) return;
    withBusy(async () => {
      const next = items.filter((it) => it.itemId !== item.itemId);
      await saveAccordion(sectionId, next);
      onSaved(next);
    });
  }

  const formOpen = editingId !== null;

  return /*#__PURE__*/React.createElement(
    "div",
    { className: "flex flex-col gap-2" },
    displayItems.map((item) =>
      /*#__PURE__*/React.createElement(
        "div",
        { key: item.itemId, className: CARD + " overflow-hidden" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "flex items-center justify-between px-4 py-3" },
          /*#__PURE__*/React.createElement(
            "button",
            {
              type: "button",
              onClick: () => toggle(item.itemId),
              className: "flex-1 text-left text-sm font-semibold text-emerald-950",
            },
            item.title
          ),
          /*#__PURE__*/React.createElement(
            "div",
            { className: "flex items-center gap-1" },
            isCreator &&
              /*#__PURE__*/React.createElement(IconBtn, { onClick: () => startEdit(item), label: "সম্পাদনা করুন" },
                /*#__PURE__*/React.createElement(EditIcon, { size: 15, color: MUTED })
              ),
            isCreator &&
              /*#__PURE__*/React.createElement(IconBtn, { onClick: () => deleteItem(item), label: "মুছে ফেলুন" },
                /*#__PURE__*/React.createElement(Trash, { size: 15, color: MUTED })
              )
          )
        ),
        expanded[item.itemId] &&
          /*#__PURE__*/React.createElement(
            "div",
            { className: "px-4 pb-3 text-sm text-slate-600 whitespace-pre-line border-t border-slate-100 pt-2" },
            item.body
          )
      )
    ),
    formOpen &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: CARD + " p-3 flex flex-col gap-2" },
        /*#__PURE__*/React.createElement("input", {
          value: formTitle,
          onChange: (e) => setFormTitle(e.target.value),
          placeholder: "শিরোনাম",
          className: "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none",
        }),
        /*#__PURE__*/React.createElement("textarea", {
          value: formBody,
          onChange: (e) => setFormBody(e.target.value),
          placeholder: "বিস্তারিত",
          rows: 5,
          className: "w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none",
        }),
        error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-500" }, error),
        /*#__PURE__*/React.createElement(SaveCancelRow, { onSave: saveForm, onCancel: cancelForm, busy })
      ),
    isCreator &&
      !formOpen &&
      /*#__PURE__*/React.createElement(
        "button",
        {
          type: "button",
          onClick: startAdd,
          className: "text-xs font-semibold py-2 rounded-xl border border-dashed border-slate-300 text-slate-500",
        },
        "+ নতুন আইটেম যোগ করুন"
      )
  );
}

// ---------- table ----------
function TableBlock({ defaultContent, doc, isCreator, busy, error, withBusy, sectionId, onSaved }) {
  const source =
    doc && doc.table && Array.isArray(doc.table.columns) && Array.isArray(doc.table.rows)
      ? doc.table
      : defaultContent || { columns: [], rows: [] };
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState(source.rows);

  function startEdit() {
    setRows(source.rows.map((r) => r.slice()));
    setEditing(true);
  }

  function setCell(ri, ci, val) {
    setRows((prev) => {
      const next = prev.map((r) => r.slice());
      next[ri][ci] = val;
      return next;
    });
  }

  function addRow() {
    setRows((prev) => prev.concat([source.columns.map(() => "")]));
  }

  function removeLastRow() {
    setRows((prev) => (prev.length ? prev.slice(0, -1) : prev));
  }

  function save() {
    withBusy(async () => {
      await saveTable(sectionId, source.columns, rows);
      onSaved(source.columns, rows);
      setEditing(false);
    });
  }

  const displayRows = editing ? rows : source.rows;

  return /*#__PURE__*/React.createElement(
    "div",
    { className: CARD + " p-3" },
    isCreator &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex justify-end mb-1" },
        !editing &&
          /*#__PURE__*/React.createElement(IconBtn, { onClick: startEdit, label: "সম্পাদনা করুন" },
            /*#__PURE__*/React.createElement(EditIcon, { size: 16, color: MUTED })
          )
      ),
    /*#__PURE__*/React.createElement(
      "div",
      { className: "overflow-x-auto" },
      /*#__PURE__*/React.createElement(
        "table",
        { className: "w-full text-xs text-left border-collapse" },
        /*#__PURE__*/React.createElement(
          "thead",
          null,
          /*#__PURE__*/React.createElement(
            "tr",
            null,
            source.columns.map((c, i) =>
              /*#__PURE__*/React.createElement(
                "th",
                { key: i, className: "border-b border-slate-200 px-2 py-1.5 font-semibold text-slate-600" },
                c
              )
            )
          )
        ),
        /*#__PURE__*/React.createElement(
          "tbody",
          null,
          displayRows.map((row, ri) =>
            /*#__PURE__*/React.createElement(
              "tr",
              { key: ri },
              row.map((cell, ci) =>
                /*#__PURE__*/React.createElement(
                  "td",
                  { key: ci, className: "border-b border-slate-100 px-2 py-1.5 align-top" },
                  editing
                    ? /*#__PURE__*/React.createElement("input", {
                        value: cell,
                        onChange: (e) => setCell(ri, ci, e.target.value),
                        className: "w-full text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none",
                      })
                    : cell
                )
              )
            )
          )
        )
      )
    ),
    error && /*#__PURE__*/React.createElement("p", { className: "text-xs text-red-500 mt-2" }, error),
    editing &&
      /*#__PURE__*/React.createElement(
        "div",
        { className: "flex items-center justify-between mt-2" },
        /*#__PURE__*/React.createElement(
          "div",
          { className: "flex gap-2" },
          /*#__PURE__*/React.createElement(
            "button",
            { type: "button", onClick: addRow, className: "text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1" },
            "+ নতুন সারি"
          ),
          /*#__PURE__*/React.createElement(
            "button",
            { type: "button", onClick: removeLastRow, className: "text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1" },
            "➖ শেষ সারি মুছুন"
          )
        ),
        /*#__PURE__*/React.createElement(SaveCancelRow, { onSave: save, onCancel: () => setEditing(false), busy })
      )
  );
}
