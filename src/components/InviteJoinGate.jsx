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
// §Bug-fix(১৩ সেপ্টেম্বর ২০২৬, owner-reported #২): familyCode prop(app.js-
// এর "fc" query-param থেকে, শুধু display-purpose — কোনো authorization
// এখানে involve না, আসল যাচাই familyId+token দিয়েই হয়) থাকলে personalized
// "আপনি {code} পরিবারে যোগ দিচ্ছেন" দেখায়, না থাকলে(পুরনো লিংক) আগের
// generic টেক্সট fallback।
//
// §Bug-fix(১৩ সেপ্টেম্বর ২০২৬, owner-reported #৩): WhatsApp/Facebook-এর
// in-app(embedded WebView) browser-এ Google OAuth popup প্রায়ই ব্যর্থ হয়
// বা loop করে(Google নিজেই disallowed_useragent হিসেবে ব্লক করে) — user
// রিপোর্ট করেছেন ঠিক এই symptom(বারবার ফর্ম-এ ফেরত)। সম্পূর্ণ নিশ্চিতভাবে
// force-redirect করার কোনো cross-platform JS API নেই, তাই দুই স্তরের
// best-effort mitigation: (ক) Android-এ known WebView UA-marker পেলে
// "intent://" scheme দিয়ে system Chrome-এ auto-redirect চেষ্টা(অনেক
// Android in-app-browser এই trick honor করে, ব্যর্থ হলে silently no-op,
// কোনো ক্ষতি নেই)। (খ) সবসময়(iOS-সহ, যেখানে কোনো reliable trick নেই) একটা
// সতর্কতা-ব্যানার দেখানো হয় manual "Open in Browser" নির্দেশনা সহ।
import { useState, useEffect } from "react";
import { triggerGoogleSignInPopup, joinFamilyViaInviteLink } from "../legacy/googleIdentity.js";

function detectInAppBrowser() {
  try {
    const ua = navigator.userAgent || "";
    // Android generic embedded WebView marker(WhatsApp/অনেক অ্যাপ এটাই
    // ব্যবহার করে, নিজের নাম UA-তে স্পষ্ট করে না) + কিছু app-এর নিজস্ব
    // পরিচিত UA-marker(defense-in-depth)।
    const isAndroidWebView = /; ?wv\)/i.test(ua);
    const isKnownInAppUA = /FBAN|FBAV|Instagram|Line\//i.test(ua);
    return {
      inApp: isAndroidWebView || isKnownInAppUA,
      isAndroid: /Android/i.test(ua)
    };
  } catch {
    return { inApp: false, isAndroid: false };
  }
}

export function InviteJoinGate({ familyId, token, familyCode, onSuccess, onBackToMain }) {
  // "form" | "joining" | "invalid" | "already-member" | "already-in-family"
  const [stage, setStage] = useState("form");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [showInAppWarning, setShowInAppWarning] = useState(false);
  const [pendingSuccess, setPendingSuccess] = useState(null);

  useEffect(() => {
    const { inApp, isAndroid } = detectInAppBrowser();
    if (!inApp) return;
    setShowInAppWarning(true);
    if (isAndroid) {
      try {
        const target = window.location.href.replace(/^https?:\/\//, "");
        window.location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
      } catch {}
    }
  }, []);

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
          // §Bug-fix(owner-reported, ১৩ সেপ্টেম্বর ২০২৬, আসল root-cause):
          // আগে এখানে alreadyMember flag check না করেই সরাসরি onSuccess()
          // কল হতো — এই Google account যদি এই একই family-র আগে থেকে সদস্য
          // হন(নিজেকে/অন্য claimed সদস্যকে দিয়ে টেস্ট), silently কোনো বার্তা
          // ছাড়াই dashboard-এ পাঠিয়ে দিত("কিছুই হয়নি"-এর মতো লাগত)।
          if (res.alreadyMember) {
            setPendingSuccess({ familyId: res.familyId, memberId: res.memberId });
            setStage("already-in-family");
            return;
          }
          onSuccess(res.familyId, res.memberId);
          return;
        }
        const reason = res && res.reason;
        if (reason === "invalid-token" || reason === "family-not-found") {
          setStage("invalid");
        } else if (reason === "already-member-elsewhere") {
          // §Bug-fix(owner-reported — "১ email = ১ member"): এই Google
          // account ইতিমধ্যে অন্য family-র সদস্য — নতুন family-তে join
          // করা যাবে না। সাধারণ "আবার চেষ্টা করুন" retry-loop না দেখিয়ে
          // স্পষ্ট, dedicated বার্তা।
          setStage("already-member");
        } else if (reason === "email-already-member") {
          // §Bug-fix(owner-reported #১, ১৩ সেপ্টেম্বর ২০২৬): এই email
          // এই family-রই অন্য(ভিন্ন Google account-এ claimed) সদস্যের সাথে
          // ইতিমধ্যে যুক্ত — আগে এই check-ই ছিল না(silent/generic error)।
          setErrorMsg("এই ইমেইল ইতিমধ্যে পরিবারের একজন সদস্য হিসেবে যুক্ত আছে। অনুগ্রহ করে ভিন্ন Google একাউন্ট দিয়ে চেষ্টা করুন।");
          setStage("form");
        } else {
          setErrorMsg("যোগ দিতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।");
          setStage("form");
        }
      })
      .catch(err => {
        console.error("[Invite-Link Join] ব্যর্থ:", err && err.message);
        setErrorMsg("সাইন-ইন ব্যর্থ হয়েছে, আবার চেষ্টা করুন। এটি WhatsApp/Facebook-এর ভেতরের ব্রাউজারে হয়ে থাকলে নিচের নির্দেশনা অনুসরণ করুন।");
        setStage("form");
      });
  }

  const inAppWarningEl = showInAppWarning && /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-xs mb-3 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 text-[11px] text-amber-800 leading-relaxed"
  }, "⚠️ লিংকটি অ্যাপের ভেতরের ব্রাউজারে খোলা হয়েছে — এখানে Google সাইন-ইন কাজ নাও করতে পারে। উপরের ডান কোণের মেনু (⋮ / •••) থেকে \"Open in Browser\" বেছে নিয়ে আবার চেষ্টা করুন।");

  if (stage === "already-in-family") {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
    },
      /*#__PURE__*/React.createElement("p", {
        className: "text-base font-medium text-slate-700 max-w-xs leading-relaxed"
      }, "আপনি ইতিমধ্যে এই পরিবারের একজন সদস্য — নতুন করে যোগ দেওয়ার দরকার নেই।"),
      /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: () => pendingSuccess && onSuccess(pendingSuccess.familyId, pendingSuccess.memberId),
        className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center disabled:opacity-60",
        style: { background: "#0E4B43", borderColor: "#0E4B43", color: "#fff" }
      }, "ড্যাশবোর্ডে যান")
    );
  }

  if (stage === "already-member") {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
    },
      /*#__PURE__*/React.createElement("p", {
        className: "text-base font-medium text-slate-700 max-w-xs leading-relaxed"
      }, "আপনার এই Google account ইতিমধ্যে অন্য একটি পরিবারের সদস্য — একই ইমেইল দিয়ে দুটি পরিবারে যোগ দেওয়া যায় না।"),
      /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: onBackToMain,
        className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center disabled:opacity-60",
        style: { background: "#FBF3E1", borderColor: "#C89B3C", color: "#8A6D2F" }
      }, "প্রথম পেজে ফিরে যান")
    );
  }

  if (stage === "invalid") {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
    },
      inAppWarningEl,
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
    inAppWarningEl,
    /*#__PURE__*/React.createElement("div", {
      className: "w-full max-w-xs space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
    },
      /*#__PURE__*/React.createElement("p", {
        className: "text-sm font-semibold text-slate-700 text-center"
      }, familyCode ? `👥 আপনি ${familyCode} পরিবারে যোগ দিচ্ছেন` : "👥 আপনি একটি পরিবারে যোগ দিচ্ছেন"),
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
