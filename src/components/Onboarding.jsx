// A4-G7-Part C — Onboarding (pre-authentication entry screen: welcome/newFamily/
// existingFamily flow, shown when no local session exists), extracted verbatim
// from legacy app.js (lines ~7170-7527). Structural-only (Owner Rule 2): no
// logic/condition change. Onboarding() previously took NO params (called as
// React.createElement(Onboarding, null)) since it relied entirely on app.js
// module-scope closures — now it must receive all of those explicitly as props
// (mountApp()'s call-site updated accordingly — see app.js diff, G1 toBn lesson
// applied proactively).
import { EyeIcon, EyeOffIcon, Loader2 } from "./icons.jsx";

const { useState } = React;

export function Onboarding({
  AppLogo,
  FAMILY_CODE_MAX_LENGTH,
  FAMILY_CODE_MIN_LENGTH,
  auth,
  createNewFamily,
  directIdentifyLogin,
  isGoogleLinked,
  joinExistingFamily,
  linkGoogleAccount,
  loadUserFamilyMapping,
  resolveFamilyIdFromCode
}) {
  const [step, setStep] = useState("welcome"); // welcome | newFamily | existingFamily
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // §Family Code shake-hint(২০ আগস্ট ২০২৬) — খালি Family Code দিয়ে
  // "নতুন সদস্য" বাটনে ক্লিক করলে ফিল্ড শেক করে বোঝানো, disabled রাখার
  // বদলে। key বদলালেই wrapper div remount হয়ে animation নতুন করে চলে।
  const [codeShakeKey, setCodeShakeKey] = useState(0);
  // §Item ৫(২১ আগস্ট ২০২৬): "ব্যবহারের নিয়মাবলী" dashboard-dropdown modal
  // থেকে সরিয়ে welcome স্টেপের নিচে স্থানান্তরিত(collapsible card, ডিফল্ট
  // collapsed)। হেডারে ক্লিক করলে expand হয়; "বুঝেছি"-তে আবার collapse হয়।
  const [usageNotesOpen, setUsageNotesOpen] = useState(false);

  const errorText = reason => ({
    empty: "একটি Family Username দিন।",
    length: `Family Username ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`,
    charset: "অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।",
    "code-taken": "এই Family Username ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য একটি কোড দিন।",
    "not-found": "এই Family Username খুঁজে পাওয়া যায়নি। বানান যাচাই করে আবার চেষ্টা করুন।",
    "same-family": "আপনি ইতিমধ্যে এই Family-তে আছেন।",
    "not-v2": "এই Family এখনো এই ফিচারের জন্য প্রস্তুত নয়।",
    error: "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
  }[reason] || "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।");

  async function handleCreateNew() {
    setBusy(true);
    setError(null);
    // Onboarding continuation flag — reload-এর পরে App() বুট হয়ে এই flag
    // দেখে existing নাম/Gender/Google/Key-reveal/Sharing ধাপ auto-continue
    // করবে (OnboardingBridge, নিচে App()-এ)। createNewFamily() ব্যর্থ হলে
    // (aborted, reload হয়নি) নিচে flag মুছে ফেলা হয়, যাতে stray flag
    // পরবর্তী কোনো unrelated বুটে ভুলভাবে trigger না করে।
    try { sessionStorage.setItem("dt_onboarding_flow", "newFamily"); } catch {}
    const res = await createNewFamily(code);
    if (res && res.aborted) {
      try { sessionStorage.removeItem("dt_onboarding_flow"); } catch {}
      setError(errorText(res.reason));
      setBusy(false);
    }
    // success হলে createNewFamily() নিজেই reload করে, এখানে আর কিছু করার নেই
  }

  async function handleJoinExisting() {
    setBusy(true);
    setError(null);
    try { sessionStorage.setItem("dt_onboarding_flow", "existingFamily"); } catch {}
    const res = await joinExistingFamily(code);
    if (res && res.aborted) {
      try { sessionStorage.removeItem("dt_onboarding_flow"); } catch {}
      // ব্যর্থ হলে joinExistingFamily()-এর ভেতরে getFamilyCode() কল হওয়ার
      // পার্শ্বপ্রতিক্রিয়ায় একটি র‍্যান্ডম নিজস্ব family_code স্থায়ীভাবে
      // localStorage-এ বসে যেতে পারে — এই পরিষ্কার Onboarding প্রসঙ্গেই
      // (family_id এখনো সেট হয়নি মানে কোনো commit হয়নি) সেটা নিরাপদে সরানো
      // হচ্ছে, যাতে stray key না থেকে যায়।
      if (!localStorage.getItem("family_id")) {
        localStorage.removeItem("family_code");
        localStorage.removeItem("family_code_is_custom");
      }
      setError(errorText(res.reason));
      setBusy(false);
    }
    // success হলে joinExistingFamily() নিজেই reload করে
  }

  // §Member Key Direct-Identify(১৯ আগস্ট ২০২৬) — Family Code + Member
  // Password একসাথে দিয়ে সরাসরি login। ব্যর্থ হলে(keyIndex miss/ভুল
  // password) কোনো family switch/reload হয় না — generic error দেখিয়ে
  // একই screen-এ থাকা হয়, existing session অক্ষত থাকে।
  async function handleDirectLogin() {
    setBusy(true);
    setError(null);
    const res = await directIdentifyLogin(code, password);
    if (!res || !res.ok) {
      // §Login feedback(২৩ আগস্ট ২০২৬): pending/denied শুধু তখনই আসে যখন
      // directIdentifyLogin() নিজের(self-uid) memberRequest-এ হুবহু password
      // match পেয়েছে — access দেয়নি, শুধু বার্তা নির্দিষ্ট করেছে।
      if (res && res.reason === "pending") {
        setError("এই সদস্যের অনুরোধটি বর্তমানে এডমিনের অনুমোদনের অপেক্ষায় আছে। অনুগ্রহ করে অপেক্ষা করুন।");
      } else if (res && res.reason === "denied") {
        setError("এডমিন আপনার সদস্য হওয়ার অনুরোধটি বাতিল করেছেন। অনুগ্রহ করে আবার সদস্য হওয়ার জন্য অনুরোধ পাঠান।");
      } else {
        setError("Family Username বা Member Password মেলেনি। আবার চেষ্টা করুন।");
      }
      setBusy(false);
    }
    // সফল হলে directIdentifyLogin() নিজেই family state commit+reload করে।
  }

  // §Google One-click Sign-in(touch-point 6) — Family Code ছাড়াই।
  // users/{uid}-এ আগে থেকে সংরক্ষিত familyCode/memberId থাকলে সরাসরি সেই
  // family-তে switch(memberId থাকলে dashboard পর্যন্ত সরাসরি, না থাকলে
  // choose-স্টেপে); না থাকলে(নতুন Google অ্যাকাউন্ট) Family Code দিয়ে
  // যোগ দিতে বলা হয় — existing join/becomeMember flow-ই fallback।
  async function handleGoogleOneClick() {
    setBusy(true);
    setError(null);
    try {
      if (!isGoogleLinked()) {
        try {
          await linkGoogleAccount();
        } catch (linkErr) {
          if (linkErr && linkErr.code === "auth/popup-closed-by-user") {
            setBusy(false);
            return;
          }
          if (linkErr && linkErr.code === "auth/credential-already-in-use" && linkErr.credential) {
            await auth.signInWithCredential(linkErr.credential);
          } else {
            throw linkErr;
          }
        }
      }
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      const mapping = uid ? await loadUserFamilyMapping(uid) : null;
      if (mapping && mapping.familyCode) {
        // বাগ-ফিক্স(২০ আগস্ট ২০২৬): আগে শুধু family_code সেভ হতো,
        // family_id হতো না — App বুট hasExistingSession চেক করে
        // family_id + family_code দুটোই লাগে, ফলে reload-এর পর আবার
        // page-1(welcome)-এ ফেরত যেত। directIdentifyLogin()-এর মতোই
        // resolveFamilyIdFromCode() দিয়ে familyId বের করে family_id-ও
        // commit করা হচ্ছে।
        const resolved = await resolveFamilyIdFromCode(mapping.familyCode);
        if (!resolved.ok) {
          setError("এই Google অ্যাকাউন্টের family তথ্য মেলাতে সমস্যা হয়েছে। Family Username দিয়ে চেষ্টা করুন।");
          setBusy(false);
          return;
        }
        localStorage.setItem("family_id", resolved.familyId);
        localStorage.setItem("family_code", mapping.familyCode);
        localStorage.setItem("family_code_is_custom", "1");
        if (!mapping.memberId) {
          // familyCode আছে কিন্তু memberId নেই(পুরনো/আগের link) — choose
          // স্টেপে(Google/Member-Key/সদস্য হোন) নামানো হচ্ছে, existing
          // OnboardingBridge flow-ই বাকিটা সামলাবে।
          try { sessionStorage.setItem("dt_onboarding_flow", "existingFamily"); } catch {}
        }
        window.location.reload();
        return;
      }
      setError("এই Google অ্যাকাউন্টের সাথে কোনো পরিবার যুক্ত পাওয়া যায়নি। উপরে Family Username দিয়ে যোগ দিন।");
      setBusy(false);
    } catch (err) {
      setError("Google সাইন-ইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setBusy(false);
    }
  }

  const shell = (children) => /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
  }, children);

  // Family Code autofill(replace-not-add): শুধু newFamily/existingFamily
  // স্টেপে <form> wrap করা হয় (welcome স্টেপে না) যাতে browser native
  // save/autofill prompt দেখাতে পারে। Submit শুধুমাত্র !busy && code.trim()
  // থাকলেই ট্রিগার হয় — এটা button-এর disabled শর্তের সাথে সামঞ্জস্যপূর্ণ।
  const formShell = (children, onSubmit) => /*#__PURE__*/React.createElement("form", {
    onSubmit: e => { e.preventDefault(); if (!busy && code.trim()) onSubmit(); },
    className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
  }, children);

  const codeInput = /*#__PURE__*/React.createElement("input", {
    type: "text",
    name: "family-code",
    autoComplete: "username",
    value: code,
    onChange: e => setCode(e.target.value),
    placeholder: "Family Username লিখুন",
    disabled: busy,
    className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 border-slate-200 text-base font-medium text-center outline-none focus:border-[#0E4B43] transition-colors"
  });

  const passwordInput = /*#__PURE__*/React.createElement("div", {
    key: "password-input-wrap",
    className: "relative w-full max-w-xs"
  }, /*#__PURE__*/React.createElement("input", {
    key: "password-input",
    type: showPassword ? "text" : "password",
    name: "member-password",
    autoComplete: "current-password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "Member Password",
    disabled: busy,
    className: "w-full h-12 pl-4 pr-11 rounded-2xl border-2 border-slate-200 text-base font-medium text-center outline-none focus:border-[#0E4B43] transition-colors",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(s => !s),
    tabIndex: -1,
    disabled: busy,
    "aria-label": showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন",
    className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
  }, showPassword ? /*#__PURE__*/React.createElement(EyeOffIcon, { size: 18 }) : /*#__PURE__*/React.createElement(EyeIcon, { size: 18 })));

  const errorBox = error && /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-red-600 max-w-xs"
  }, error);

  const backButton = /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => { setStep("welcome"); setError(null); setCode(""); },
    disabled: busy,
    className: "w-full max-w-xs text-left text-xs font-semibold text-slate-500 underline underline-offset-2"
  }, "← ব্যাক করুন");

  if (step === "welcome") {
    return shell([
      /*#__PURE__*/React.createElement(AppLogo, {
        key: "logo",
        size: 72
      }),
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-2xl font-bold tracking-tight",
        style: { color: "#0E4B43", fontFamily: "'Noto Serif Bengali', serif" }
      }, "আসসালামু আলাইকুম"),
      /*#__PURE__*/React.createElement("p", {
        key: "sub",
        className: "text-sm max-w-xs leading-relaxed text-slate-700"
      }, "Daily Task (Daily Amal & Family Tracker)-এ স্বাগতম।"),
      /*#__PURE__*/React.createElement("button", {
        key: "new",
        onClick: () => setStep("newFamily"),
        className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center active:scale-[0.98] transition-transform",
        style: { borderColor: "#1D7A68", color: "#1D7A68" }
      }, "নতুন Family তৈরি করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "existing",
        onClick: () => setStep("existingFamily"),
        className: "w-full max-w-xs h-12 px-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center shadow-md shadow-emerald-900/10 active:scale-[0.98] transition-transform",
        style: { background: "#0E4B43" }
      }, "বিদ্যমান Family-তে প্রবেশ করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "usage-notes-btn",
        type: "button",
        onClick: () => setUsageNotesOpen(true),
        className: "w-full max-w-xs bg-white rounded-2xl py-3 px-4 text-center shadow-sm border border-slate-100 mt-2 font-bold text-sm text-slate-800"
      }, "অ্যাপ ব্যবহারের নির্দেশনাবলী"),
      usageNotesOpen && /*#__PURE__*/React.createElement("div", {
        key: "usage-notes-modal",
        className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
      }, /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100 max-h-[80vh] overflow-y-auto"
      }, /*#__PURE__*/React.createElement("h3", {
        className: "font-bold text-sm text-slate-800 mb-3 text-center"
      }, "অ্যাপ ব্যবহারের নির্দেশনাবলী"), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-600 space-y-2.5 leading-relaxed font-medium"
      }, /*#__PURE__*/React.createElement("p", null, "১. নিজের ও পরিবারের সদস্যদের দৈনন্দিন আমল রেকর্ড রাখা ও মূল্যায়ন করার জন্য এই অ্যাপটি ব্যবহার করুন। নিয়মিত আমলের অগ্রগতি দেখুন এবং পরিবারকে নিয়ে প্রোডাক্টিভ অভ্যাস গড়ে তুলুন।"), /*#__PURE__*/React.createElement("p", null, "২. আপনি যদি আপনার ও পরিবারের সদস্যদের দৈনিক আমল ট্র্যাক করতে আগ্রহী হন, তাহলে \"নতুন Family তৈরি করুন\" বাটনে ক্লিক করে আপনার Family তৈরি করুন এবং সদস্যদের যুক্ত করুন।"), /*#__PURE__*/React.createElement("p", null, "৩. আপনি যদি কোনো বিদ্যমান Family-এর নতুন সদস্য হতে চান, তাহলে \"বিদ্যমান Family-তে প্রবেশ করুন\" বাটনে ক্লিক করে Family Username লিখুন এবং নতুন সদস্য হিসেবে যুক্ত হওয়ার প্রক্রিয়া সম্পন্ন করুন।"), /*#__PURE__*/React.createElement("p", null, "৪. মাসের শেষে দৈনিক রেকর্ড, সাপ্তাহিক রিফ্লেকশন এবং পারিবারিক সভার কার্যবিবরণী- সবকিছু একসাথে ২ পৃষ্ঠার PDF হিসেবে প্রিন্ট বা সংরক্ষণ করা যাবে।"), /*#__PURE__*/React.createElement("p", null, "৫. আপনার ডেটা নিরাপদ রাখতে মেনু থেকে \"ডেটা ব্যাকআপ রাখুন\" অপশন ব্যবহার করে Google Drive এবং ডিভাইসে ব্যাকআপ রাখতে পারবেন। প্রয়োজনে সেই ব্যাকআপ থেকে Restore করা যাবে।"), /*#__PURE__*/React.createElement("p", null, "৬. ফোন পরিবর্তন, ডেটা মুছে যাওয়া বা অ্যাপ পুনরায় ইনস্টল করার পর Google অ্যাকাউন্ট অথবা মেম্বার পাসওয়ার্ড দিয়ে সাইন ইন করে আপনার রেকর্ড ফিরে পাওয়া যাবে। তাই ডেটা হারানোর ভয় নেই।"), /*#__PURE__*/React.createElement("p", null, "৭. সদস্য হবার পর অ্যাপের বিভিন্ন ফিচার সঠিকভাবে বুঝতে পাশে থাকা ⓘ (ইনফো) আইকনে চাপ দিয়ে নির্দেশনাগুলো দেখে নিন।")), /*#__PURE__*/React.createElement("button", {
        onClick: () => setUsageNotesOpen(false),
        className: "w-full mt-4 h-9 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
      }, "বুঝেছি")))
    ]);
  }

  if (step === "newFamily") {
    return formShell([
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-lg font-bold tracking-tight whitespace-nowrap",
        style: { color: "#0E4B43", fontFamily: "'Noto Serif Bengali', serif" }
      }, "একটি Custom Family Username সেট করুন"),
      /*#__PURE__*/React.createElement("p", {
        key: "sub",
        className: "text-xs whitespace-nowrap",
        style: { color: "#C89B3C" }
      }, "এই কোড দিয়েই পরবর্তীতে পরিবারের সদস্যরা যোগ দিতে পারবেন।"),
      React.cloneElement(codeInput, { key: "input" }),
      /*#__PURE__*/React.createElement("p", {
        key: "hint",
        className: "text-[11px] text-slate-400 leading-relaxed max-w-xs -mt-1"
      }, "(ইউজারনেম কমপক্ষে ৬ ডিজিটের হতে হবে — ইংরেজি অক্ষর, সংখ্যা ও জটিল চিহ্ন ব্যবহার করা যাবে। যেমন: Hasan-Family)"),
      errorBox,
      /*#__PURE__*/React.createElement("button", {
        key: "submit",
        type: "submit",
        disabled: busy || !code.trim(),
        className: "w-full max-w-xs h-12 rounded-2xl text-white text-base font-bold shadow-md shadow-emerald-900/10 disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2",
        style: { background: "#0E4B43" }
      }, busy ? /*#__PURE__*/React.createElement(Loader2, { className: "animate-spin", size: 14 }) : null, "এগিয়ে যান"),
      backButton
    ], handleCreateNew);
  }

  if (step === "existingFamily") {
    return /*#__PURE__*/React.createElement("form", {
      onSubmit: e => {
        e.preventDefault();
        if (!busy && code.trim() && password.trim()) handleDirectLogin();
      },
      className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-3"
    }, [
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-xl font-bold tracking-tight",
        style: { color: "#0E4B43", fontFamily: "'Noto Serif Bengali', serif" }
      }, "বিদ্যমান Family-তে প্রবেশ করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "google",
        type: "button",
        onClick: handleGoogleOneClick,
        disabled: busy,
        className: "w-full max-w-xs h-12 px-4 rounded-2xl border-2 border-slate-200 bg-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
      }, /*#__PURE__*/React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 48 48" }, [
          /*#__PURE__*/React.createElement("path", { key: "1", fill: "#FFC107", d: "M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" }),
          /*#__PURE__*/React.createElement("path", { key: "2", fill: "#FF3D00", d: "M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" }),
          /*#__PURE__*/React.createElement("path", { key: "3", fill: "#4CAF50", d: "M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z" }),
          /*#__PURE__*/React.createElement("path", { key: "4", fill: "#1976D2", d: "M43.6 20.5H42V20H24v8h11.3c-0.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C41.5 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" })
        ]), "Google দিয়ে Sign-in"),
      /*#__PURE__*/React.createElement("p", {
        key: "or1",
        className: "text-xs font-semibold text-slate-400"
      }, "অথবা"),
      /*#__PURE__*/React.createElement("style", {
        key: "shake-style"
      }, "@keyframes dtCodeShake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}"),
      /*#__PURE__*/React.createElement("div", {
        key: `code-wrap-${codeShakeKey}`,
        className: "w-full flex flex-col items-center",
        style: codeShakeKey ? { animation: "dtCodeShake 0.4s" } : undefined
      }, React.cloneElement(codeInput, { key: "input" })),
      (error === "প্রথমে Family Username দিন।") ? errorBox : null,
      passwordInput,
      (error === "প্রথমে Family Username দিন।") ? null : errorBox,
      /*#__PURE__*/React.createElement("button", {
        key: "login",
        type: "submit",
        disabled: busy || !code.trim() || !password.trim(),
        className: "w-full max-w-xs h-12 rounded-2xl text-white text-base font-bold shadow-md shadow-emerald-900/10 disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2",
        style: { background: "#0E4B43" }
      }, busy ? /*#__PURE__*/React.createElement(Loader2, { className: "animate-spin", size: 14 }) : null, "Login"),
      /*#__PURE__*/React.createElement("p", {
        key: "or2",
        className: "text-xs font-semibold text-slate-400"
      }, "অথবা"),
      /*#__PURE__*/React.createElement("button", {
        key: "become",
        type: "button",
        onClick: () => {
          if (!code.trim()) {
            setError("প্রথমে Family Username দিন।");
            setCodeShakeKey(k => k + 1);
            return;
          }
          handleJoinExisting();
        },
        disabled: busy,
        className: "w-full max-w-xs h-12 px-4 rounded-2xl text-sm font-bold flex items-center justify-center active:scale-[0.98] transition-transform disabled:opacity-60 border-2",
        style: { background: "#F5E6C0", borderColor: "#C89B3C", color: "#7A5A1F" }
      }, "পরিবারে নতুন সদস্য হিসেবে যোগ দিন"),
      backButton
    ]);
  }

  return null;
}
