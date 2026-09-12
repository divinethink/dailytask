// §Non-member Landing Shell(১২ সেপ্টেম্বর ২০২৬, owner-approved Plan §১)
// উদ্দেশ্য: `2_4_Identity_Simplification_Plan.md` §২ ও `2_5` Screen 0-এর
// approved design অনুযায়ী unauthenticated অবস্থায় full-page blocking
// sign-in gate-এর বদলে — TopBar-এ ছোট "লগইন" বাটন + sample/demo হোম-content
// + সবসময়-visible Bottom Nav। এই component সম্পূর্ণ presentational, self-
// contained, zero Firestore call — existing tested building-block(BottomNav,
// PublicToolsPlaceholder, GoogleSignInGate, AppLogo) reuse করে, নতুন কিছু
// দরকার হলে তাও এই একটা ফাইলেই isolated।
// Deliberately reusable: আজ শুধু renderGoogleLandingGate()(আলাদা root)-এ
// mount হচ্ছে, কিন্তু ভবিষ্যতে(Plan §২, consolidation) App()-এর ভিতর
// থেকেও ঠিক এই একই component সরাসরি reuse করা যাবে — তখন শুধু mount-
// location বদলাবে, এই ফাইলের কোনো কিছু rewrite করতে হবে না।
import { useState } from "react";
import { BottomNav } from "./BottomNav.jsx";
import { PublicToolsPlaceholder } from "./PublicToolsPlaceholder.jsx";
import { GoogleSignInGate } from "./GoogleSignInGate.jsx";
import { AppLogo } from "./icons.jsx";
import { TAB_FAMILY, TAB_PRAYER_TIMES, TAB_TASBIH, TAB_TOOLS, TAB_SETTINGS } from "../legacy/tabs.js";

function LoginPopover({ onClose, onSuccess }) {
  return /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-40",
      onClick: onClose
    }),
    /*#__PURE__*/React.createElement("div", {
      className: "absolute right-3 top-14 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-100"
    }, /*#__PURE__*/React.createElement(GoogleSignInGate, { onSuccess: onSuccess }))
  );
}

function DemoHomeContent() {
  // §সম্পূর্ণ static/illustrative — কোনো state/Firestore call নেই, শুধু
  // app-টা আসলে কেমন দেখতে তার একটা ঝলক(2_5 Screen 0 "sample/empty-state
  // UI" নির্দেশনা অনুযায়ী)।
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen pb-24 bg-[#F4F7F1] px-4 pt-4 space-y-3"
  },
    /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm text-center"
    },
      /*#__PURE__*/React.createElement("div", {
        className: "text-sm font-bold",
        style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" }
      }, "বাংলা ইসলামিক পারিবারিক আমল ট্র্যাকার"),
      /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-slate-500 mt-1"
      }, "পরিবারের সবার দৈনন্দিন আমল, সাপ্তাহিক রিফ্লেকশন ও অগ্রগতি একসাথে ট্র্যাক করুন। শুরু করতে উপরে \"লগইন\" চাপুন।")
    ),
    /*#__PURE__*/React.createElement("div", {
      className: "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm opacity-70"
    },
      /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2"
      }, "নমুনা — দৈনন্দিন আমল"),
      ["ফরজ কাযা সালাত", "জামায়াতে সালাত", "কুরআন তিলাওয়াত"].map(label =>
        /*#__PURE__*/React.createElement("div", {
          key: label,
          className: "flex items-center justify-between py-1.5 text-xs text-slate-600 border-b border-slate-50 last:border-0"
        },
          /*#__PURE__*/React.createElement("span", null, label),
          /*#__PURE__*/React.createElement("span", {
            className: "font-mono text-slate-300"
          }, "—")
        )
      )
    )
  );
}

export function NonMemberLanding({ onSuccess }) {
  const [activeTab, setActiveTab] = useState(TAB_FAMILY);
  const [showLogin, setShowLogin] = useState(false);

  const topBar = /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100"
  },
    /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    },
      /*#__PURE__*/React.createElement(AppLogo, { size: 28 }),
      /*#__PURE__*/React.createElement("span", {
        className: "font-bold text-sm",
        style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" }
      }, "Daily Task")
    ),
    /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setShowLogin(v => !v),
      className: "px-3 py-1.5 rounded-full text-xs font-bold text-white",
      style: { backgroundColor: "var(--theme-primary, #0E4B43)" }
    }, "লগইন"),
    showLogin && /*#__PURE__*/React.createElement(LoginPopover, {
      onClose: () => setShowLogin(false),
      onSuccess: onSuccess
    })
  );

  let body;
  if (activeTab === TAB_FAMILY) {
    body = /*#__PURE__*/React.createElement(DemoHomeContent, null);
  } else if (activeTab === TAB_SETTINGS) {
    // §সেটিং ট্যাব non-member অবস্থায় সরাসরি sign-in বাটন দেখায়(2_5 Screen
    // E.1 non-member state) — generic "শীঘ্রই আসছে" placeholder-এর বদলে।
    body = /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen pb-24 bg-[#F4F7F1] flex items-center justify-center px-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full max-w-xs bg-white rounded-2xl shadow-sm border border-slate-100"
    }, /*#__PURE__*/React.createElement(GoogleSignInGate, { onSuccess: onSuccess })));
  } else {
    const placeholderTitle =
      activeTab === TAB_PRAYER_TIMES ? "সময়সূচি" :
      activeTab === TAB_TASBIH ? "তাসবীহ" :
      activeTab === TAB_TOOLS ? "সহায়িকা" : "";
    body = /*#__PURE__*/React.createElement(PublicToolsPlaceholder, { title: placeholderTitle });
  }

  return /*#__PURE__*/React.createElement(React.Fragment, null,
    topBar,
    body,
    /*#__PURE__*/React.createElement(BottomNav, { activeTab: activeTab, onChange: setActiveTab })
  );
}
