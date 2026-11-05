// "জিমেইল অ্যাকাউন্ট বদলান"-এর দ্বিতীয় ধাপের পূর্ণ-পর্দা রিকভারি-গেট।
// দেখা যায় শুধু যখন: ব্যবহারকারী সাইন-ইন করা, Google প্রোভাইডার ছাড়ানো হয়েছে, আর ফ্ল্যাগ আছে।
// App()-এর বাইরে (mountApp) বসে, তাই App-এর কোনো early-return একে ঢাকতে পারে না। লগআউটের বোতাম ইচ্ছাকৃতভাবে নেই —
// Google-ছাড়া অবস্থায় লগআউট করলে এই পরিচয়ে আর ঢোকা যায় না।
import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { authModular as auth } from "../legacy/firebaseConfig.js";
import { getRelinkFlag, hasGoogleProvider, linkGoogleAccountNow, loadUserMapping } from "../legacy/googleIdentity.js";
import { GoogleGIcon } from "./icons.jsx";
import { oldEmailFromFlag } from "../legacy/googleAccountChange.js";

const TEXT = {
  title: "নতুন জিমেইল অ্যাকাউন্ট যুক্ত করুন",
  lead: "আপনার এন্ট্রি, ভূমিকা ও সব তথ্য অক্ষুণ্ণ আছে। এখন নতুন জিমেইল অ্যাকাউন্টটি বেছে নিলেই জিমেইল বদল সম্পূর্ণ হবে।",
  warn: "এটি শেষ না হওয়া পর্যন্ত লগআউট করবেন না এবং ব্রাউজারের ডেটা মুছবেন না। নইলে এই পরিচয়ে আর প্রবেশ করা যাবে না।",
  oldMail: "আগের জিমেইল:",
  pickNew: "নতুন জিমেইল অ্যাকাউন্ট বেছে নিন",
  restore: "আগের জিমেইল ফিরিয়ে আনুন",
  busy: "অপেক্ষা করুন…"
};

export function GoogleRelinkGate() {
  const [pending, setPending] = useState(false);
  const [oldEmail, setOldEmail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const ids = useRef({ familyId: null, memberId: null });

  useEffect(() => {
    function refresh() {
      const flag = getRelinkFlag();
      const u = auth.currentUser;
      const on = !!(flag && u && !hasGoogleProvider(u));
      setPending(on);
      setOldEmail(on ? oldEmailFromFlag(flag) : null);
    }
    refresh();
    const unsub = onAuthStateChanged(auth, refresh);
    window.addEventListener("dt-relink-changed", refresh);
    return () => { unsub(); window.removeEventListener("dt-relink-changed", refresh); };
  }, []);

  // পরিবার/সদস্য আইডি আগেই এনে রাখা — popup-ট্যাপের আগে কোনো await রাখা যাবে না (ব্রাউজার popup আটকায়)।
  useEffect(() => {
    if (!pending || !auth.currentUser) return;
    loadUserMapping(auth.currentUser.uid).then(m => {
      if (m) ids.current = { familyId: m.familyId || null, memberId: m.memberId || null };
    }).catch(() => {});
  }, [pending]);

  if (!pending) return null;

  function onPick() {
    if (busy) return;
    setBusy(true); setErr(null);
    linkGoogleAccountNow(ids.current.familyId, ids.current.memberId).then(res => {
      if (res && res.ok) { window.location.reload(); return; }
      setBusy(false);
      setErr((res && res.message) || null);
    });
  }

  const btn = "w-full max-w-xs h-12 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center disabled:opacity-60 active:scale-[0.98] transition-transform";
  return (
    <div className="fixed inset-0 z-[100] min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4">
      <h2 className="text-lg font-bold text-slate-800 max-w-xs">{TEXT.title}</h2>
      <p className="text-sm text-slate-700 max-w-xs leading-relaxed">{TEXT.lead}</p>
      {oldEmail && <p className="text-xs text-slate-500 max-w-xs break-all">{TEXT.oldMail} {oldEmail}</p>}
      <p className="text-xs font-medium max-w-xs leading-relaxed rounded-xl p-3" style={{ background: "#FBF3E1", color: "#8A6D2F" }}>{TEXT.warn}</p>
      {err && <p className="text-sm font-medium text-red-600 max-w-xs">{err}</p>}
      <button type="button" disabled={busy} onClick={onPick} className={btn} style={{ borderColor: "#1D7A68", color: "#1D7A68", background: "#fff" }}><GoogleGIcon size={20} /><span className="ml-2">{busy ? TEXT.busy : TEXT.pickNew}</span></button>
      <button type="button" disabled={busy} onClick={onPick} className={btn} style={{ borderColor: "transparent", color: "#1D7A68", background: "transparent" }}>{TEXT.restore}</button>
    </div>
  );
}
