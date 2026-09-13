// §Public Invite-Link Join(নতুন, 2_4 §৫.২/Screen D, ১৩ সেপ্টেম্বর ২০২৬):
//
//   অ্যাডমিনের শেয়ার করা আমন্ত্রণ লিংক(root-path query-param, app.js-এর
//   early-return route দ্রষ্টব্য) থেকে আসা নতুন/বিদ্যমান সদস্যের জন্য
//   এই dedicated full-screen gate।
//
//   ফ্লো(§১০.৩ single-popup pattern অনুসরণ করে, GoogleSignInGate.jsx-এর
//   সাথে সামঞ্জস্যপূর্ণ):
//   ১) নাম+জেন্ডার ফর্ম শুরুতেই দেখা যায়(auto-fill নেই — popup-এর আগে
//      Google প্রোফাইল তথ্য অনুপস্থিত, তাই ইচ্ছাকৃতভাবে ফাঁকা/editable)।
//   ২) "Google দিয়ে সাইন-ইন করুন" বাটনে ক্লিক — সরাসরি synchronous popup
//      trigger, তারপর joinFamilyViaInviteLink()(googleIdentity.js) কল।
//      সেই ফাংশনই internally পূর্ব-নিবন্ধিত-email bind বনাম নতুন-member
//      create — দুটো path-ই সামলায়(এই কম্পোনেন্ট কোনো পার্থক্য করে না)।
//   ৩) সফল হলে parent(app.js)-এর onSuccess(familyId, memberId) কল হয়(same
//      handleGuestSignInSuccess reuse যা guest sign-in flow-এও ব্যবহৃত)।
//   ৪) token invalid/revoked/family-not-found হলে "লিংক নিষ্ক্রিয়" বার্তা।
//
// সম্পূর্ণ নতুন, additive ফাইল — backend(joinFamilyViaInviteLink ইত্যাদি)
// আগে থেকেই লেখা, শুধু UI যোগ হলো। createElement-style(existing codebase
// convention, JSX syntax না)।
import { useState } from "react";
import { triggerGoogleSignInPopup, joinFamilyViaInviteLink } from "../legacy/googleIdentity.js";

export function InviteJoinGate({ familyId, token, onSuccess, onBackToMain }) {
  // "form" | "joining" | "invalid"
  const [stage, setStage] = useState("form");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);

  function handleJoinClick() {
    if (!name.trim()) {
      setErrorMsg("আপনার নাম আবশ্যক।");
      return;
    }
    setErrorMsg(null);
    setStage("joining");
    // §১০.৩ — popup সরাসরি synchronous statement হিসেবে(কোনো await/.then()
    // এর ভিতরে না)।
    triggerGoogleSignInPopup()
      .then(() => joinFamilyViaInviteLink(familyId, token, name.trim(), gender || null))
      .then(res => {
        if (res && res.success) {
          onSuccess(res.familyId, res.memberId);
          return;
        }
        const reason = res && res.reason;
        if (reason === "invalid-token" || reason === "family-not-found") {
          setStage("invalid");
        } else {
          setErrorMsg("যোগ দিতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।");
          setStage("form");
        }
      })
      .catch(err => {
        console.error("[Invite-Link Join] ব্যর্থ:", err && err.message);
        setErrorMsg("সাইন-ইন ব্যর্থ হয়েছে, আবার চেষ্টা করুন।");
        setStage("form");
      });
  }

  if (stage === "invalid") {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
    },
      /*#__PURE__*/React.createElement("p", {
        className: "text-base font-medium text-slate-700 max-w-xs leading-relaxed"
      }, "এই আমন্ত্রণ লিংকটি নিষ্ক্রিয় বা অবৈধ।"),
      /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: onBackToMain,
        className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center disabled:opacity-60",
        style: { background: "#FBF3E1", borderColor: "#C89B3C", color: "#8A6D2F" }
      }, "প্রথম পেজে ফিরে যান")
    );
  }

  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6"
  },
    /*#__PURE__*/React.createElement("div", {
      className: "w-full max-w-xs space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
    },
      /*#__PURE__*/React.createElement("p", {
        className: "text-sm font-semibold text-slate-700 text-center"
      }, "👥 আপনি একটি পরিবারে যোগ দিচ্ছেন"),
      /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: name,
        onChange: e => setName(e.target.value),
        placeholder: "আপনার নাম",
        disabled: stage === "joining",
        className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-60"
      }),
      /*#__PURE__*/React.createElement("select", {
        value: gender,
        onChange: e => setGender(e.target.value),
        disabled: stage === "joining",
        className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-60"
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
        disabled: stage === "joining" || !name.trim(),
        onClick: handleJoinClick,
        className: "w-full bg-emerald-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
      }, stage === "joining" ? "যোগ দেওয়া হচ্ছে..." : "🔵 Google দিয়ে সাইন-ইন করুন")
    )
  );
}
