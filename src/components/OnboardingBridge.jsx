// A4-G7-Part B — OnboardingBridge (post-authentication onboarding flow: name
// entry, become-member request, claim-key), extracted verbatim from legacy
// app.js (lines ~6800-7169). Structural-only (Owner Rule 2): no logic/condition
// change. Component params unchanged — only createMemberWithKey(module-level
// helper it referenced) added as an explicit new prop.
import { GoogleIcon } from "./icons.jsx";

const { useState, useRef, useEffect } = React;

export function OnboardingBridge({
  flow,
  step,
  onAdvance,
  isAdmin,
  myUid,
  familyCode,
  members,
  setMembers,
  setSelectedId,
  showGoogleAccountModal,
  setShowGoogleAccountModal,
  showBecomeMemberModal,
  setShowBecomeMemberModal,
  showClaimKeyModal,
  setClaimKeyTarget,
  setShowClaimKeyModal,
  myMemberRequestStatus,
  myMemberRequestKey,
  createMemberWithKey
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const prevGoogleOpen = useRef(false);
  const prevBecomeOpen = useRef(false);
  const prevClaimOpen = useRef(false);

  // google/becomeMember ধাপে existing modal auto-open। myMemberRequestStatus
  // ইতিমধ্যে "pending" হলে(request সফল submit হয়ে গেছে) modal আর re-open
  // করা হয় না — নিচের pending-স্ক্রিন render branch তখন দেখানো হয়(bug-fix,
  // ২২ আগস্ট ২০২৬: আগে এই effect pending অবস্থাতেও বারবার modal খুলে
  // দিত/ফাঁকি দিত কারণ gate সাথে সাথেই clear হয়ে যেত)।
  useEffect(() => {
    if (step === "google" && !showGoogleAccountModal) setShowGoogleAccountModal(true);
    if (step === "becomeMember" && !showBecomeMemberModal && myMemberRequestStatus !== "pending") {
      setShowBecomeMemberModal(true);
    }
  }, [step, myMemberRequestStatus]);

  // Google modal বন্ধ হলে পরবর্তী ধাপ নির্ধারণ — নতুন Family হলে সরাসরি
  // key-reveal; বিদ্যমান Family হলে UID match করলে done, না করলে
  // "সদস্য হোন"।
  useEffect(() => {
    if (prevGoogleOpen.current && !showGoogleAccountModal && step === "google") {
      if (flow === "newFamily") {
        onAdvance("keyReveal");
      } else {
        const matched = !!(myUid && (members || []).some(m => m.ownerUids?.includes(myUid)));
        onAdvance(matched ? null : "becomeMember");
      }
    }
    prevGoogleOpen.current = showGoogleAccountModal;
  }, [showGoogleAccountModal]);

  // "সদস্য হোন" মোডাল বন্ধ হলে — সফল submit(myMemberRequestStatus:
  // "pending" হয়ে গেছে) হলে gate clear না করে "becomeMember" step-এই
  // থেকে নিচের pending-স্ক্রিন render branch দেখানো হয়(admin approve না
  // করা পর্যন্ত); bug-fix(২২ আগস্ট ২০২৬) — আগে এখানে সরাসরি onAdvance(null)
  // কল হতো, ফলে gate সাথে সাথে clear হয়ে "অনুমোদনের অপেক্ষায়" স্ক্রিন
  // কখনো দেখানো হতো না(request তবুও ঠিকই submit হতো)। Cancel/X(status
  // এখনো set হয়নি) হলে পুরনো deprecated "choose" পেজ(page-2 redesign-এর
  // পর অপ্রচলিত) না দেখিয়ে family-context পুরোপুরি undo করে page-1/2
  // (Onboarding())-এ ফেরত পাঠানো হয়(২০ আগস্ট ২০২৬ bug fix) —
  // authentication ছাড়া Dashboard entry-ও রোধ থাকে।
  useEffect(() => {
    if (prevBecomeOpen.current && !showBecomeMemberModal && step === "becomeMember") {
      if (myMemberRequestStatus !== "pending") {
        try {
          sessionStorage.removeItem("dt_onboarding_flow");
          sessionStorage.removeItem("dt_onboarding_step");
          localStorage.removeItem("family_id");
          localStorage.removeItem("family_code");
          localStorage.removeItem("family_code_is_custom");
        } catch {}
        window.location.reload();
      }
    }
    prevBecomeOpen.current = showBecomeMemberModal;
  }, [showBecomeMemberModal, myMemberRequestStatus]);

  // Admin approve করলে(myMemberRequestStatus:"approved" ও নতুন member
  // ownerUids-এ myUid যোগ হয়ে members list live-update হয়) "becomeMember"
  // step থেকে স্বয়ংক্রিয়ভাবে onboarding সম্পূর্ণ ধরে gate clear হবে।
  // bug-fix(২২ আগস্ট ২০২৬), pending-screen যোগের সাথে সংশ্লিষ্ট —
  // আগে gate তাৎক্ষণিক clear হতো বলে এই auto-advance আলাদাভাবে দরকার
  // ছিল না।
  useEffect(() => {
    if (step === "becomeMember" && myUid && (members || []).some(m => m.ownerUids?.includes(myUid))) {
      onAdvance(null);
    }
  }, [step, members, myUid]);

  // Member-Key claim মোডাল বন্ধ হলে, সফল হলে(ownerUid match করলে) done।
  useEffect(() => {
    if (prevClaimOpen.current && !showClaimKeyModal && step === "keyClaim") {
      const matched = !!(myUid && (members || []).some(m => m.ownerUids?.includes(myUid)));
      if (matched) onAdvance(null);
    }
    prevClaimOpen.current = showClaimKeyModal;
  }, [showClaimKeyModal, members]);

  if (!step) return null;

  const shell = children => /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-center flex flex-col gap-4 items-center"
  }, children));

  // "সদস্য হোন" request pending অবস্থায়(admin এখনো approve করেননি) —
  // bug-fix(২২ আগস্ট ২০২৬): request সফল submit হয়েছে ঠিকই কিন্তু আগে এই
  // স্ক্রিন দেখানো হতো না(gate অকালে clear হয়ে যেত)। accessPending
  // স্ক্রিনের(নিচে, App() মূল tree-তে) একই ডিজাইন প্যাটার্ন reuse।
  if (step === "becomeMember" && myMemberRequestStatus === "pending") {
    return shell([
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-lg font-bold tracking-tight",
        style: { color: "#0E4B43", fontFamily: "'Noto Serif Bengali', serif" }
      }, "অনুমোদনের অপেক্ষায়"),
      /*#__PURE__*/React.createElement("p", {
        key: "note",
        className: "text-sm text-slate-500 leading-relaxed"
      }, "আপনার সদস্য হওয়ার অনুরোধ এডমিনের অনুমোদনের অপেক্ষায় রয়েছে।"),
      myMemberRequestKey && /*#__PURE__*/React.createElement("div", {
        key: "key",
        className: "w-full py-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xl tracking-widest font-bold font-mono"
      }, myMemberRequestKey),
      myMemberRequestKey && /*#__PURE__*/React.createElement("button", {
        key: "copy",
        onClick: () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(myMemberRequestKey).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => {});
          }
        },
        className: "text-sm font-bold text-emerald-800 underline underline-offset-2"
      }, copied ? "কপি হয়েছে" : "কপি করুন"),
      /*#__PURE__*/React.createElement("p", {
        key: "note2",
        className: "text-sm text-slate-500 leading-relaxed"
      }, "মেম্বার পাসওয়ার্ড সংরক্ষণ করুন। অনুমোদন হলে ফ্যামিলি ইউজারনেম ও মেম্বার পাসওয়ার্ড দিয়ে পরিবারে প্রবেশ করতে পারবেন। এই পাসওয়ার্ড পরবর্তীতে যেকোনো সময় পরিবর্তন করা যাবে।"),
      // §"বুঝেছি"(২৩ আগস্ট ২০২৬): পাশের effect(prevBecomeOpen, উপরে)-এর মতোই
      // family_id/family_code clear + reload — শুধু family-selection undo
      // করে page-1/2(Onboarding())-এ ফেরত পাঠায়। auth/uid অস্পৃশ্য থাকে,
      // তাই directIdentifyLogin()-এর self-uid pending/denied detection
      // অক্ষুণ্ণ থাকে। Firestore-এ request/status অপরিবর্তিত(শুধু client-side
      // family-context reset)।
      /*#__PURE__*/React.createElement("button", {
        key: "ack",
        type: "button",
        onClick: () => {
          try {
            sessionStorage.removeItem("dt_onboarding_flow");
            sessionStorage.removeItem("dt_onboarding_step");
            localStorage.removeItem("family_id");
            localStorage.removeItem("family_code");
            localStorage.removeItem("family_code_is_custom");
          } catch {}
          window.location.reload();
        },
        className: "w-full h-11 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
      }, "বুঝেছি")
    ]);
  }

  if (step === "addMember") {
    // §Back-button removal(bug-fix, ২৩ আগস্ট ২০২৬): এই step-এ পৌঁছানোর আগেই
    // createNewFamily() family doc create + creator-uid adminUids-এ commit
    // করে ফেলে(অপরিবর্তনযোগ্য, rollback নেই)। আগে এখানে "← ফিরে যান" বাটন
    // ছিল যা শুধু onbStep/onbFlow(UI-state) clear করত("onAdvance(null)") —
    // family creation/admin-claim অক্ষুণ্ণ থাকত। ফলে gate বন্ধ হয়ে normal
    // Dashboard mount হতো, অথচ নিজের members doc(নাম/gender) তৈরিই হয়নি —
    // Rules-side admin অনুযায়ী read/write বৈধভাবেই সফল হতো(authorization
    // bug নয়, onboarding-completeness bug)। Fix: এই step non-skippable —
    // Back সরানো হয়েছে, নাম দেওয়াই একমাত্র পথ।
    return shell([
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-lg font-bold tracking-tight",
        style: { color: "#0E4B43", fontFamily: "'Noto Serif Bengali', serif" }
      }, "আপনার নাম লিখুন"),
      /*#__PURE__*/React.createElement("input", {
        key: "name",
        type: "text",
        value: name,
        onChange: e => setName(e.target.value),
        placeholder: "আপনার নাম",
        disabled: busy,
        className: "w-full h-12 px-4 rounded-2xl border-2 border-slate-200 text-base font-medium text-center outline-none focus:border-[#0E4B43] transition-colors"
      }),
      /*#__PURE__*/React.createElement("div", {
        key: "gender",
        className: "flex gap-2 w-full"
      }, ["male", "female"].map(g => /*#__PURE__*/React.createElement("button", {
        key: g,
        disabled: busy,
        onClick: () => setGender(g),
        className: "flex-1 h-11 rounded-2xl text-xs font-bold border-2 transition-colors " + (gender === g ? "bg-[#0E4B43] border-[#0E4B43]" : "border-slate-200")
      }, /*#__PURE__*/React.createElement("span", { style: { color: "#C89B3C" } }, g === "male" ? "পুরুষ" : "নারী")))),
      error && /*#__PURE__*/React.createElement("p", {
        key: "err",
        className: "text-sm font-medium text-red-600"
      }, error),
      /*#__PURE__*/React.createElement("button", {
        key: "submit",
        disabled: busy || !name.trim(),
        onClick: async () => {
          setBusy(true);
          setError(null);
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          // §Hybrid Admin Role Model — এই "addMember" ধাপ শুধু flow==="newFamily"
          // -এ ঘটে(creator নিজের member তৈরি করছেন), এবং creator ইতিমধ্যে
          // family creation-এ adminUids/firstAdminUid হিসেবে সেট(isAdmin prop
          // reload-পরবর্তী boot থেকে true)। role:"admin" এখানে না সেট করলে
          // এই member(creator নিজে) role/adminUids consistency-বহির্ভূত থেকে
          // যেত — নতুন ডিভাইসে পরে Member Key claim করলে admin auto-sync হতো না।
          const newMember = {
            id, name: name.trim(), gender, ownerUids: [myUid],
            ...(isAdmin ? { role: "admin" } : {}),
            createdAt: Date.now(), updatedAt: Date.now()
          };
          try {
            const key = await createMemberWithKey(newMember);
            setMembers(prev => [...(prev || []), newMember]);
            setSelectedId(id);
            setNewKey(key);
            onAdvance("keyReveal");
          } catch (err) {
            setError("সমস্যা হয়েছে: " + err.message);
          } finally {
            setBusy(false);
          }
        },
        className: "w-full h-12 rounded-2xl text-white text-base font-bold shadow-md shadow-emerald-900/10 disabled:opacity-60 active:scale-[0.98] transition-transform",
        style: { background: "#0E4B43" }
      }, busy ? "..." : "এগিয়ে যান")
    ]);
  }

  if (step === "keyReveal") {
    return shell([
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-lg font-bold tracking-tight",
        style: { color: "#0E4B43", fontFamily: "'Noto Serif Bengali', serif" }
      }, "আপনার Member Password: •••••••••"),
      /*#__PURE__*/React.createElement("div", {
        key: "key",
        className: "w-full py-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xl tracking-widest font-bold font-mono"
      }, newKey || "—"),
      /*#__PURE__*/React.createElement("p", {
        key: "note",
        className: "text-sm text-slate-500 leading-relaxed"
      }, "এই Key-টি মনে রাখুন অথবা নিরাপদে সংরক্ষণ করুন। যেকোনো সময় পরিবর্তন করতে পারবেন। Google Sign-in ছাড়া নতুন কোনো device-এ identity ফিরে পেতে এই Key প্রয়োজন হবে।"),
      /*#__PURE__*/React.createElement("button", {
        key: "copy",
        onClick: () => {
          if (newKey && navigator.clipboard) {
            navigator.clipboard.writeText(newKey).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => {});
          }
        },
        className: "text-sm font-bold text-emerald-800 underline underline-offset-2"
      }, copied ? "কপি হয়েছে" : "কপি করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "next",
        onClick: () => onAdvance("share"),
        className: "w-full h-12 rounded-2xl text-white text-base font-bold shadow-md shadow-emerald-900/10 active:scale-[0.98] transition-transform",
        style: { background: "#0E4B43" }
      }, "এগিয়ে যান")
    ]);
  }

  if (step === "share") {
    return shell([
      /*#__PURE__*/React.createElement("p", {
        key: "text",
        className: "text-base text-slate-600 leading-relaxed"
      }, "আপনি এই অ্যাপ একাই ব্যবহার করতে পারেন। কিংবা পরিবার বা দ্বীনি সার্কেল যুক্ত করে পরিবার গঠণ করতে পারেন।"),
      /*#__PURE__*/React.createElement("button", {
        key: "share",
        onClick: async () => {
          const text = `আপনাকে Daily Task (দৈনিক আমল ও পারিবারিক ট্রাকার)- পরিবারের নতুন সদস্য হওয়ার জন্য আমন্ত্রণ জানানো হয়েছে। বিদ্যমান Family-তে প্রবেশ করে ফ্যামিলি ইউজারনেম লিখে নতুন সদস্য হোন।\nhttps://dailytask-family.pages.dev/\nFamily Username: ${familyCode}`;
          try {
            if (navigator.share) {
              await navigator.share({ title: "Daily Task", text });
            } else if (navigator.clipboard) {
              await navigator.clipboard.writeText(text);
              alert("বার্তা কপি হয়েছে, এখন পাঠিয়ে দিন।");
            }
          } catch (err) {
            // AbortError(ব্যবহারকারী নিজেই বাতিল করেছেন) সহ যেকোনো ত্রুটিতে
            // নীরবে onboarding সম্পন্ন ধরা হচ্ছে — sharing বাধ্যতামূলক নয়।
          }
          onAdvance(null);
        },
        className: "w-full h-12 rounded-2xl text-white text-sm font-bold shadow-md shadow-emerald-900/10 active:scale-[0.98] transition-transform whitespace-nowrap",
        style: { background: "#0E4B43" }
      }, "পরিবার বা দ্বীনি সার্কেলের সঙ্গে শেয়ার করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "google",
        type: "button",
        onClick: () => setShowGoogleAccountModal(true),
        className: "w-full h-12 rounded-2xl border-2 border-slate-200 bg-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      }, /*#__PURE__*/React.createElement(GoogleIcon, {
        size: 18
      }), "Google-এ যুক্ত হোন"),
      /*#__PURE__*/React.createElement("button", {
        key: "skip",
        onClick: () => onAdvance(null),
        className: "text-sm font-semibold text-slate-500 underline underline-offset-2"
      }, "পরে করবো")
    ]);
  }

  if (step === "choose") {
    return shell([
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-lg font-bold tracking-tight",
        style: { color: "#111827", fontFamily: "'Noto Serif Bengali', serif" }
      }, "সাইন ইন করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "google",
        onClick: () => onAdvance("google"),
        className: "w-full h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center active:scale-[0.98] transition-transform",
        style: { borderColor: "#1D7A68", color: "#1D7A68" }
      }, "Google Account দিয়ে Sign-in করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "key",
        onClick: () => onAdvance("keyClaim"),
        className: "w-full h-12 px-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center shadow-md shadow-emerald-900/10 active:scale-[0.98] transition-transform",
        style: { background: "#0E4B43" }
      }, "Member Password দিয়ে Sign-in করুন"),
      /*#__PURE__*/React.createElement("button", {
        key: "become",
        onClick: () => onAdvance("becomeMember"),
        className: "w-full h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center active:scale-[0.98] transition-transform",
        style: { background: "#FBF3E1", borderColor: "#C89B3C", color: "#8A6D2F" }
      }, "পরিবারের নতুন সদস্য হিসেবে যোগ দিন")
    ]);
  }

  if (step === "keyClaim") {
    const list = members || [];
    return shell([
      /*#__PURE__*/React.createElement("div", {
        key: "title",
        className: "text-lg font-bold tracking-tight",
        style: { color: "#0E4B43", fontFamily: "'Noto Serif Bengali', serif" }
      }, "আপনার নাম বেছে নিন"),
      list.length === 0 ? /*#__PURE__*/React.createElement("p", {
        key: "empty",
        className: "text-sm text-slate-500"
      }, "লোড হচ্ছে বা কোনো সদস্য পাওয়া যায়নি।") : /*#__PURE__*/React.createElement("div", {
        key: "list",
        className: "w-full flex flex-col gap-2 max-h-60 overflow-y-auto"
      }, list.map(m => /*#__PURE__*/React.createElement("button", {
        key: m.id,
        onClick: () => { setClaimKeyTarget(m); setShowClaimKeyModal(true); },
        className: "w-full h-11 rounded-2xl border-2 border-slate-200 text-base font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      }, m.name))),
      /*#__PURE__*/React.createElement("button", {
        key: "back",
        type: "button",
        onClick: () => onAdvance("choose"),
        className: "self-start text-sm font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1"
      }, "← ফিরে যান")
    ]);
  }

  return null;
}
