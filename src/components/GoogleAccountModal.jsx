// A4-G7-Part A — GoogleAccountModal (Google account linking modal, welcome-mode
// reuse), extracted verbatim from legacy app.js (lines ~6618-6799). Structural-only
// (Owner Rule 2): no logic/condition change. Component boundary/params (onClose,
// onLinked, onFirstAdminClaimed, memberName, welcomeMode, onLater) unchanged —
// only module-level helpers it referenced (auth, claimFirstAdminIfEligible,
// googleProvider, linkGoogleAccount, syncFamilyCodeWithAccount) added as explicit
// new props (were closures before — G1 toBn lesson applied proactively).
import { InfoIcon, Loader2, X } from "./icons.jsx";

// React hooks are true globals here (app.js destructures them from the global
// React the same way — see DashboardSections.jsx for the same established note).
const { useState } = React;

export function GoogleAccountModal({
  onClose,
  onLinked,
  onFirstAdminClaimed,
  memberName,
  welcomeMode,
  onLater,
  auth,
  claimFirstAdminIfEligible,
  googleProvider,
  linkGoogleAccount,
  syncFamilyCodeWithAccount
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  // chain-popup bug fix: আগে fallback popup automatic (promise .catch()
  // এর ভেতর থেকে) খোলা হতো — সেটা click-gesture থেকে বিচ্ছিন্ন থাকায়
  // ব্রাউজার প্রায়ই দ্বিতীয় popup ব্লক করত (auth/popup-blocked) বা PC-তে
  // দুইটা popup window একসাথে খুলে যেত। এখন প্রথম চেষ্টা ব্যর্থ হলে শুধু
  // pendingRecovery set করে ব্যবহারকারীকে আবার বাটনে ক্লিক করতে বলা হয়;
  // দ্বিতীয় ক্লিক নিজেই একটি fresh user-gesture, তাই তখনকার single
  // signInWithPopup()/signInWithCredential() নিরাপদে চলে।
  const [pendingRecovery, setPendingRecovery] = useState(null); // null | {type:'credential', credential} | {type:'email'}
  async function handleLink() {
    setBusy(true);
    setNotice(null);
    if (pendingRecovery) {
      try {
        if (pendingRecovery.type === "credential") {
          await auth.signInWithCredential(pendingRecovery.credential);
        } else {
          await auth.signInWithPopup(googleProvider);
        }
        try {
          localStorage.setItem("dt_check_drive_after_reload", "1");
        } catch {}
        onClose();
        window.location.reload();
        return;
      } catch (recoverErr) {
        setBusy(false);
        // pendingRecovery ইচ্ছাকৃতভাবে reset করা হচ্ছে না — cancel/fail হলেও
        // পরের ক্লিক সরাসরি একই recovery action (single popup) retry করবে,
        // প্রথম linkGoogleAccount()-এ ফিরে গিয়ে বাড়তি round-trip এড়াতে।
        if (!(recoverErr && recoverErr.code === "auth/popup-closed-by-user")) {
          setNotice({
            type: "error",
            text: "সাইন ইন করতে সমস্যা হয়েছে: " + (recoverErr && (recoverErr.message || recoverErr.code))
          });
        }
      }
      return;
    }
    try {
      await linkGoogleAccount();
      // এই Google অ্যাকাউন্টে আগে থেকে সংরক্ষিত familyCode থাকলে (অন্য
      // ডিভাইস থেকে link করা), সেটাই এখন এই ডিভাইসে load করা হচ্ছে —
      // থাকলে reload করে পুরো family/profile/records নতুন code দিয়ে
      // fresh state-এ আনা হয় (না থাকলে বর্তমান code-ই account-এ save
      // হয়ে যায়, নিচের syncFamilyCodeWithAccount()-এর ভেতরেই)।
      const sync = await syncFamilyCodeWithAccount();
      if (sync.switched) {
        window.location.reload();
        return;
      }
      // Phase A: প্রথম Admin claim — শুধু non-switched case-এ (অর্থাৎ এই
      // ডিভাইস তার নিজের বর্তমান family-তেই Google link করছে)। switched
      // case-এ (অন্য ডিভাইস থেকে আগে link করা account, ভিন্ন family)
      // ইচ্ছাকৃতভাবে claim করা হচ্ছে না — সেই family-এর Admin status
      // ইতিমধ্যে নির্ধারিত থাকার কথা, ভুলভাবে নতুন claim এড়াতে।
      const justClaimed = await claimFirstAdminIfEligible();
      if (justClaimed && onFirstAdminClaimed) onFirstAdminClaimed();
      onClose();
      // সাইন-ইন সফল — এই Google অ্যাকাউন্টে আগে থেকে কোনো Drive ব্যাকআপ
      // থাকলে detect করে Restore-এর Popup দেখানোর সুযোগ App-কে দেওয়া হচ্ছে।
      if (onLinked) onLinked();
    } catch (err) {
      if (err && err.code === "auth/popup-closed-by-user") {
        // ব্যবহারকারী নিজেই পপআপ বন্ধ করেছেন — কোনো বার্তা দরকার নেই
      } else if (err && err.code === "auth/credential-already-in-use") {
        // এই Google অ্যাকাউন্ট আগে থেকেই অন্য একটি (সম্ভবত আগের সাইন-আউট
        // হওয়া) সেশনের সাথে লিংক করা আছে — নতুন anonymous সেশনে আবার লিংক
        // করা যাবে না। এক্ষেত্রে লিংক না করে সরাসরি সেই পুরনো Google-লিংকড
        // অ্যাকাউন্টেই সাইন ইন করাই সঠিক "রিকভারি" পদ্ধতি — err.credential-এ
        // Firebase নিজেই সেই ক্রেডেনশিয়াল দিয়ে দেয়। এখানেই আগে ব্যর্থ প্রথম
        // popup-এর ধারাবাহিকতায় স্বয়ংক্রিয় দ্বিতীয় popup/sign-in চেষ্টা হতো —
        // এখন শুধু pendingRecovery set করে ব্যবহারকারীকে আবার ক্লিক করতে
        // বলা হচ্ছে (দ্বিতীয় ক্লিক-ই fresh user-gesture হিসেবে কাজ করবে)।
        setPendingRecovery({
          type: "credential",
          credential: err.credential
        });
        setNotice({
          type: "error",
          text: `এই Google অ্যাকাউন্ট Daily Task App-এ "${memberName || "একজন সদস্য"}" নামে সাইন ইন রয়েছে। আপনি একই ব্যক্তি হলে নিচের বাটনে ক্লিক করুন।`
        });
      } else if (err && err.code === "auth/email-already-in-use") {
        // এই Google অ্যাকাউন্ট আগে থেকেই অন্য একটি সেশনের সাথে লিংক করা
        // আছে, কিন্তু এক্ষেত্রে Firebase err.credential দেয় না (তাই উপরের
        // credential-already-in-use path কাজ করে না)। রিকভারি হিসেবে
        // সরাসরি signInWithPopup দিয়ে (link না করে) সেই পুরনো Google-লিংকড
        // অ্যাকাউন্টে fresh sign-in করাতে হবে — কিন্তু এখানেই আগে স্বয়ংক্রিয়
        // দ্বিতীয় popup খোলা হতো বলে ব্রাউজার প্রায়ই ব্লক করত। এখন শুধু
        // pendingRecovery set করে বাটনে আবার ক্লিক করতে বলা হচ্ছে।
        setPendingRecovery({
          type: "email"
        });
        setNotice({
          type: "error",
          text: `এই Google অ্যাকাউন্ট Daily Task App-এ "${memberName || "একজন সদস্য"}" নামে সাইন ইন রয়েছে। আপনি একই ব্যক্তি হলে নিচের বাটনে ক্লিক করুন।`
        });
      } else {
        setNotice({
          type: "error",
          text: "সমস্যা হয়েছে: " + (err && (err.message || err.code))
        });
      }
    } finally {
      setBusy(false);
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(InfoIcon, {
    size: 16,
    color: "#C89B3C"
  }), " Google অ্যাকাউন্ট (রিকমন্ডেড)"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), notice && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-3 " + (notice.type === "ok" ? "text-emerald-700" : "text-red-600")
  }, notice.text), welcomeMode ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "আলহামদুলিল্লাহ! আপনি এখন এই পরিবারের একজন সদস্য। আপনার তথ্য Google Drive-এ নিরাপদে ব্যাকআপ রাখতে এবং গুগল দিয়ে লগিন করতে নিচের বাটনে ক্লিক করুন।") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-800 mb-2"
  }, "Google দিয়ে সাইন ইন করার সুবিধা:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-3"
  }, "Google দিয়ে সাইন ইন বাধ্যতামূলক নয়। তবে সাইন ইন করলে নিম্নোক্ত সুবিধা পাওয়া যাবে —"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-2"
  }, "☁️ Google Drive-এ নিরাপদে ব্যাকআপ রাখা এবং প্রয়োজনে Restore করা যাবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-2"
  }, "📱 ফোন পরিবর্তন, ডেটা মুছে যাওয়া বা অ্যাপ পুনরায় ইনস্টল করার পর একই Google অ্যাকাউন্টে সাইন ইন করে সহজেই সব ডেটা, সদস্যপদ, দায়িত্ব (Claim) ও এডিট-অধিকার ফিরে পাওয়া যাবে।"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "💻 একই Google অ্যাকাউন্ট দিয়ে একাধিক ডিভাইস থেকে নিরাপদে অ্যাপ ব্যবহার করা যাবে।")), /*#__PURE__*/React.createElement("button", {
    onClick: handleLink,
    disabled: busy,
    className: "w-full h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
  }, busy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : null, welcomeMode ? " Google-এর সঙ্গে যুক্ত হোন" : " Google দিয়ে সাইন ইন করুন"), welcomeMode && /*#__PURE__*/React.createElement("button", {
    onClick: onLater || onClose,
    disabled: busy,
    className: "w-full h-9 mt-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold disabled:opacity-60"
  }, "পরে করবো")));
}
