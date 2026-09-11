// ২.৪ §২(owner-simplified, ১১ সেপ্টেম্বর ২০২৬ সিদ্ধান্ত অনুযায়ী মূল
// প্ল্যানের ২-বাটন Screen A/B/C একত্রিত করা হয়েছে একটাই ফ্লো-তে):
//
//   ১) একটাই "Google দিয়ে সাইন-ইন করুন" বাটন — ক্লিকেই popup ট্রিগার(§১০.৩,
//      সরাসরি synchronous onClick, .then()-এর ভিতরে না)।
//   ২) Popup সফল হলে email-match চেক(googleIdentity.signInExistingMemberByGoogle) —
//      মিলে গেলে সরাসরি প্রোফাইল/পরিবারে(onSuccess কল, parent redirect করবে)।
//   ৩) না মিললে(নতুন ইউজার) — নাম+জেন্ডার+Family Code ফর্ম দেখাবে(আগে থেকেই
//      Google Sign-in সম্পন্ন, দ্বিতীয়বার popup লাগবে না)। এই ফর্ম submit
//      না করা পর্যন্ত কোনো family/account তৈরি হয় না।
//
// সম্পূর্ণ নতুন, additive ফাইল — app.js এখনো এটা import/use করে না
// (wiring পরের ধাপে)। createElement-style(existing codebase convention)।
import { useState } from "react";
import {
  triggerGoogleSignInPopup,
  signInExistingMemberByGoogle,
  currentGoogleEmail
} from "../legacy/googleIdentity.js";
import { createNewFamilyGoogleOnly } from "../legacy/familyIdentity.js";

export function GoogleSignInGate({ onSuccess }) {
  // "idle" | "checking" | "new-user-form" | "creating" | "error"
  const [stage, setStage] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const [familyCode, setFamilyCode] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");

  function handleSignInClick() {
    // §১০.৩ — popup সরাসরি synchronous statement হিসেবে(কোনো await/.then()
    // এর ভিতরে না)।
    setErrorMsg(null);
    setStage("checking");
    triggerGoogleSignInPopup()
      .then(() => signInExistingMemberByGoogle())
      .then(res => {
        if (res && res.matched) {
          onSuccess(res.familyId, res.memberId);
        } else {
          // মিল নেই — নতুন ইউজার, নাম/জেন্ডার/Family Code ফর্ম দেখাও।
          setStage("new-user-form");
        }
      })
      .catch(err => {
        console.error("[Google Sign-in] popup ব্যর্থ:", err && err.message);
        setErrorMsg("সাইন-ইন ব্যর্থ হয়েছে, আবার চেষ্টা করুন।");
        setStage("idle");
      });
  }

  function handleCreateAccount() {
    if (!familyCode.trim() || !name.trim()) {
      setErrorMsg("Family Code ও নাম আবশ্যক।");
      return;
    }
    setErrorMsg(null);
    setStage("creating");
    // এই মুহূর্তে auth.currentUser আগে থেকেই সেই Google user(উপরের ধাপে
    // popup সফল হয়েছে) — দ্বিতীয় popup লাগে না।
    createNewFamilyGoogleOnly(familyCode.trim(), name.trim(), gender || null)
      .then(res => {
        if (res && res.aborted) {
          const msgMap = {
            "code-taken": "এই Family Code ইতিমধ্যে ব্যবহৃত, অন্য একটা দিন।",
            "length": "Family Code ৬-৩০ ক্যারেক্টারের মধ্যে হতে হবে।",
            "charset": "Family Code-এ শুধু ইংরেজি অক্ষর/সংখ্যা/আন্ডারস্কোর/হাইফেন ব্যবহার করুন।",
            "name-required": "নাম আবশ্যক।"
          };
          setErrorMsg(msgMap[res.reason] || "তৈরি করতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।");
          setStage("new-user-form");
        }
        // success হলে createNewFamilyGoogleOnly() নিজেই window.location.reload()
        // করে — এখানে আলাদা কিছু করার দরকার নেই।
      });
  }

  if (stage === "new-user-form") {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 p-3"
    },
      /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-500"
      }, currentGoogleEmail()
          ? `${currentGoogleEmail()} — এই মেইল দিয়ে আগে কোনো পরিবার পাওয়া যায়নি। নতুন পরিবার তৈরি করতে নিচের তথ্য দিন।`
          : "নতুন পরিবার তৈরি করতে নিচের তথ্য দিন।"),
      /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: familyCode,
        onChange: e => setFamilyCode(e.target.value),
        placeholder: "পরিবারের নাম (Family Code)",
        className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
      }),
      /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: name,
        onChange: e => setName(e.target.value),
        placeholder: "আপনার নাম",
        className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
      }),
      /*#__PURE__*/React.createElement("select", {
        value: gender,
        onChange: e => setGender(e.target.value),
        className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
      },
        /*#__PURE__*/React.createElement("option", { value: "" }, "জেন্ডার বেছে নিন"),
        /*#__PURE__*/React.createElement("option", { value: "male" }, "পুরুষ"),
        /*#__PURE__*/React.createElement("option", { value: "female" }, "নারী")
      ),
      errorMsg && /*#__PURE__*/React.createElement("div", {
        className: "text-red-600 text-xs"
      }, errorMsg),
      /*#__PURE__*/React.createElement("button", {
        type: "button",
        disabled: stage === "creating" || !familyCode.trim() || !name.trim(),
        onClick: handleCreateAccount,
        className: "w-full bg-emerald-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
      }, stage === "creating" ? "তৈরি হচ্ছে..." : "একাউন্ট তৈরি করুন")
    );
  }

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 p-3"
  },
    errorMsg && /*#__PURE__*/React.createElement("div", {
      className: "text-red-600 text-xs"
    }, errorMsg),
    /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: stage === "checking",
      onClick: handleSignInClick,
      className: "w-full bg-white border border-slate-300 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
    }, stage === "checking" ? "চেক করা হচ্ছে..." : "🔵 Google দিয়ে সাইন-ইন করুন")
  );
}
