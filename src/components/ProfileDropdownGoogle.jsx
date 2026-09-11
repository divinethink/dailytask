// ২.৪ §৯.৪ / ২.৫ Screen E — নতুন Google-only Profile Dropdown।
// সম্পূর্ণ নতুন, additive ফাইল — পুরনো ProfileDropdown.jsx(Member Password/
// Google-link legacy UI) অপরিবর্তিত রাখা হয়েছে, app.js এখনো এটা import/use
// করে না। বাস্তবায়ন-ধাপ ৬(old-path removal+cutover)-এ app.js-এর wiring
// বদলে পুরনোটা এটা দিয়ে replace হবে।
//
// পুরনো ProfileDropdown.jsx-এর মতোই এই ফাইল উদ্দেশ্যপ্রণোদিতভাবে JSX-syntax
// না লিখে React.createElement() ব্যবহার করেছে(existing codebase convention,
// A4 G1 pattern সামঞ্জস্য)।
//
// Business-logic(Firestore write) এই component-এ embed করা হয়নি — সব
// action(googleIdentity.js: editOwnProfile/leaveFamily, ও existing
// handleSelfDemote/handleFullLogout) caller(App()) থেকে callback-prop
// হিসেবে আসে, শুধু presentational + local UI-state(profile-edit ফর্ম
// টগল)।
import { CalIcon, LogOutIcon } from "./icons.jsx";
import { useState } from "react";

export function ProfileDropdownGoogle({
  show,
  onClose,
  BN_MONTHS,
  toBn,
  ownMember,          // { name, gender, createdAt, ... } — নিজের member doc
  isAdmin,
  isFirstAdmin,
  streak,
  onDemoteSelf,       // () => Promise — এডমিন হতে অব্যাহতি
  onEditProfile,      // (name, gender) => Promise<{success}>
  onLeaveFamily,       // () => Promise<{success, aborted, reason}>
  onLogout            // () => void
}) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(ownMember ? ownMember.name : "");
  const [genderInput, setGenderInput] = useState(ownMember ? ownMember.gender : "");
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  if (!show) return null;

  let sinceText = null;
  if (ownMember && ownMember.createdAt) {
    const d = new Date(ownMember.createdAt);
    sinceText = `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBn(d.getFullYear())}`;
  }

  function closeAndReset() {
    setEditing(false);
    setConfirmLeave(false);
    setLeaveError(null);
    onClose();
  }

  async function handleSaveProfile() {
    if (!nameInput || !nameInput.trim()) return;
    setSaving(true);
    const res = await onEditProfile(nameInput, genderInput);
    setSaving(false);
    if (res && res.success) {
      setEditing(false);
    }
  }

  async function handleConfirmLeave() {
    setLeaveError(null);
    const res = await onLeaveFamily();
    if (res && res.success) {
      closeAndReset();
    } else if (res && res.reason === "first-admin-must-transfer") {
      setLeaveError("প্রথম এডমিন হিসেবে ত্যাগ করার আগে অন্য কাউকে এডমিন বানাতে হবে।");
    } else {
      setLeaveError("ব্যর্থ হয়েছে, আবার চেষ্টা করুন।");
    }
  }

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-40",
      onClick: closeAndReset
    }),
    /*#__PURE__*/React.createElement("div", {
      // §fix(পজিশনিং, ১১ সেপ্টেম্বর ২০২৬): "Hasan" বাটনের wrapping div
      // ছোট(শুধু বাটনের সমান প্রস্থ) ও স্ক্রিনের বাম দিকে অবস্থিত(existing
      // পুরনো ProfileDropdown.jsx-এর মতোই) — তাই "right-0" ব্যবহার করলে
      // dropdown উল্টো বাম দিকে(off-screen) চলে যায়। পুরনো কম্পোনেন্টের
      // "left-0"-ই সঠিক pattern, এখানে reuse করা হলো।
      className: "absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 text-xs"
    },
      // --- হেডার: নাম+streak+role badge ---
      /*#__PURE__*/React.createElement("div", {
        className: "px-4 py-2 border-b border-slate-100"
      },
        /*#__PURE__*/React.createElement("div", {
          className: "flex items-center gap-1.5 flex-wrap"
        },
          /*#__PURE__*/React.createElement("span", {
            className: "font-bold text-emerald-900 text-sm"
          }, ownMember ? ownMember.name : "প্রোফাইল"),
          /*#__PURE__*/React.createElement("span", {
            className: "text-[11px] text-slate-500 flex items-center gap-0.5"
          }, "🔥 ", /*#__PURE__*/React.createElement("b", {
            className: "text-slate-700 font-semibold"
          }, "ধারাবাহিকতার ", toBn(streak), " দিন"))
        ),
        /*#__PURE__*/React.createElement("span", {
          className: `inline-block mt-1 text-[9px] font-bold px-1 py-[1px] rounded border bg-slate-100 ${isAdmin ? "text-[#8a6a1f] border-slate-200" : "text-slate-500 border-slate-200"}`
        }, isAdmin ? (isFirstAdmin ? "এডমিন (প্রথম এডমিন)" : "এডমিন") : "সদস্য"),
        isAdmin && /*#__PURE__*/React.createElement("div", {
          className: "mt-1"
        }, /*#__PURE__*/React.createElement("button", {
          type: "button",
          onClick: () => onDemoteSelf(),
          className: "text-left text-red-500 text-[9px] font-medium hover:underline"
        }, "⚠️ এডমিন হতে অব্যাহতি নিন"))
      ),
      // --- যোগ দিয়েছেন তারিখ ---
      sinceText && /*#__PURE__*/React.createElement("div", {
        className: "px-4 py-2 space-y-1 text-slate-500 border-b border-slate-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1.5"
      }, /*#__PURE__*/React.createElement(CalIcon, { size: 12 }), "যোগ দিয়েছেন: ", /*#__PURE__*/React.createElement("span", {
        className: "text-slate-700 font-normal"
      }, sinceText))),
      // --- প্রোফাইল এডিট ---
      /*#__PURE__*/React.createElement("div", {
        className: "px-2 pt-1"
      },
        !editing
          ? /*#__PURE__*/React.createElement("button", {
              type: "button",
              onClick: () => setEditing(true),
              className: "w-full text-left px-2 py-1.5 rounded-xl hover:bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5"
            }, "✏️ প্রোফাইল এডিট")
          : /*#__PURE__*/React.createElement("div", {
              className: "px-2 py-1.5 space-y-1.5"
            },
              /*#__PURE__*/React.createElement("input", {
                type: "text",
                value: nameInput,
                onChange: e => setNameInput(e.target.value),
                className: "w-full border border-slate-200 rounded-lg px-2 py-1 text-xs",
                placeholder: "নাম"
              }),
              /*#__PURE__*/React.createElement("select", {
                value: genderInput || "",
                onChange: e => setGenderInput(e.target.value),
                className: "w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
              },
                /*#__PURE__*/React.createElement("option", { value: "" }, "জেন্ডার বেছে নিন"),
                /*#__PURE__*/React.createElement("option", { value: "male" }, "পুরুষ"),
                /*#__PURE__*/React.createElement("option", { value: "female" }, "নারী")
              ),
              /*#__PURE__*/React.createElement("div", {
                className: "flex gap-1.5"
              },
                /*#__PURE__*/React.createElement("button", {
                  type: "button",
                  disabled: saving,
                  onClick: handleSaveProfile,
                  className: "flex-1 bg-emerald-700 text-white rounded-lg py-1 text-xs font-semibold disabled:opacity-50"
                }, saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"),
                /*#__PURE__*/React.createElement("button", {
                  type: "button",
                  onClick: () => setEditing(false),
                  className: "flex-1 bg-slate-100 text-slate-600 rounded-lg py-1 text-xs"
                }, "বাতিল")
              )
            )
      ),
      // --- এই পরিবার ত্যাগ করুন ---
      /*#__PURE__*/React.createElement("div", {
        className: "px-2 pt-1"
      },
        !confirmLeave
          ? /*#__PURE__*/React.createElement("button", {
              type: "button",
              onClick: () => setConfirmLeave(true),
              className: "w-full text-left px-2 py-1.5 rounded-xl hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5"
            }, "🚪 এই পরিবার ত্যাগ করুন")
          : /*#__PURE__*/React.createElement("div", {
              className: "px-2 py-1.5 space-y-1.5"
            },
              /*#__PURE__*/React.createElement("div", {
                className: "text-red-600 text-[11px]"
              }, "নিশ্চিত? এই সিদ্ধান্ত পূর্বাবস্থায় ফেরানো যাবে না।"),
              leaveError && /*#__PURE__*/React.createElement("div", {
                className: "text-red-500 text-[10px]"
              }, leaveError),
              /*#__PURE__*/React.createElement("div", {
                className: "flex gap-1.5"
              },
                /*#__PURE__*/React.createElement("button", {
                  type: "button",
                  onClick: handleConfirmLeave,
                  className: "flex-1 bg-red-600 text-white rounded-lg py-1 text-xs font-semibold"
                }, "হ্যাঁ, ত্যাগ করুন"),
                /*#__PURE__*/React.createElement("button", {
                  type: "button",
                  onClick: () => { setConfirmLeave(false); setLeaveError(null); },
                  className: "flex-1 bg-slate-100 text-slate-600 rounded-lg py-1 text-xs"
                }, "বাতিল")
              )
            )
      ),
      // --- লগআউট ---
      /*#__PURE__*/React.createElement("div", {
        className: "px-2 pt-1 mt-1 border-t border-slate-100"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: () => onLogout(),
        className: "w-full text-left px-2 py-1.5 rounded-xl hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5"
      }, /*#__PURE__*/React.createElement(LogOutIcon, { size: 13 }), "লগআউট"))
    )
  );
}
