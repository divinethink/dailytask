// A4 G4 (part B+C) — ClaimKeyModal("দায়িত্ব নিন") + BecomeMemberModal("সদস্য
// হোন" self-request), extracted verbatim from legacy App(). Structural-only
// (Owner Rule 2): JSX body unchanged, state ownership stays in App(). These
// two are dual-used(Onboarding Gate early-return branch + normal tree) —
// App() still assigns each to a `const ...Node = React.createElement(...)`
// variable exactly as before, so both usage-sites and the gate-logic itself
// are untouched by this extraction; only the JSX body moved.
import { X } from "./icons.jsx";

export function ClaimKeyModal({
  showClaimKeyModal,
  claimKeyTarget,
  claimKeyInput,
  setClaimKeyInput,
  claimKeyBusy,
  setClaimKeyBusy,
  setShowClaimKeyModal,
  setClaimKeyTarget,
  setMembers,
  auth,
  claimMemberWithKey,
  isGoogleLinked,
  saveUserFamilyCode,
  getFamilyCode
}) {
  return showClaimKeyModal && claimKeyTarget && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-emerald-900 mb-1"
  }, "\"", claimKeyTarget.name, "\"-এর দায়িত্ব নিন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "এই সদস্যের Member Password দিন। সঠিক হলে সঙ্গে সঙ্গে এই ডিভাইসে তার সব ডেটা/পরিচয় ফিরে আসবে।"),
  /*#__PURE__*/React.createElement("form", {
    // §Notification simplification + Password Autofill(১৯ আগস্ট ২০২৬):
    // (১) FIFO/admin-eviction alert বাদ(owner-সিদ্ধান্ত, নিচে দ্রষ্টব্য)।
    // (২) <form onSubmit> ব্যবহার করা হচ্ছে যাতে browser-এর native
    // password manager submit event দেখে save-prompt দেখাতে পারে(custom
    // storage/localStorage নেই — শুধু standard form+autocomplete)।
    onSubmit: async e => {
      e.preventDefault();
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid || claimKeyBusy || !claimKeyInput.trim()) return;
      setClaimKeyBusy(true);
      try {
        const res = await claimMemberWithKey(claimKeyTarget.id, claimKeyInput, uid);
        if (res.ok) {
          setMembers(prev => prev.map(x => {
            if (x.id !== claimKeyTarget.id) return x;
            const owners = Array.isArray(x.ownerUids)
              ? x.ownerUids
              : (x.ownerUid ? [x.ownerUid] : []);
            const nextOwners = owners.includes(uid)
              ? owners
              : (res.revoked ? [...owners.filter(o => o !== res.evictedUid), uid] : [...owners, uid]);
            return { ...x, ownerUids: nextOwners };
          }));
          setShowClaimKeyModal(false);
          setClaimKeyInput("");
          setClaimKeyTarget(null);
          // FIFO replace(admin বা non-admin) হলেও(res.revoked) আলাদা
          // alert দেখানো হয় না(owner-সিদ্ধান্ত, ১৯ আগস্ট ২০২৬) — সফল
          // claim silent থাকে।
          // §Member Key Direct-Identify(touch-point 3) — Google-linked হলে
          // পরবর্তী one-click Google sign-in-এর জন্য memberId mapping save
          // (best-effort, non-blocking)।
          if (isGoogleLinked()) {
            saveUserFamilyCode(uid, getFamilyCode(), claimKeyTarget.id).catch(() => {});
          }
        } else {
          alert("Member Password মেলেনি — আবার চেষ্টা করুন।");
        }
      } finally {
        setClaimKeyBusy(false);
      }
    }
  },
  /*#__PURE__*/React.createElement("input", {
    type: "text",
    name: "username",
    autoComplete: "username",
    value: getFamilyCode(),
    readOnly: true,
    tabIndex: -1,
    "aria-hidden": "true",
    style: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }
  }),
  /*#__PURE__*/React.createElement("input", {
    type: "password",
    name: "current-password",
    autoComplete: "current-password",
    value: claimKeyInput,
    onChange: e => setClaimKeyInput(e.target.value),
    placeholder: "Member Password",
    className: "w-full px-3 py-2 rounded-xl text-xs text-slate-900 border border-slate-200 outline-none font-medium mb-3",
    style: { fontFamily: "'IBM Plex Mono', monospace" }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: claimKeyBusy || !claimKeyInput.trim(),
    className: "flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-white disabled:opacity-50"
  }, claimKeyBusy ? "যাচাই হচ্ছে..." : "যাচাই করুন"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowClaimKeyModal(false);
      setClaimKeyInput("");
    },
    className: "px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600"
  }, "বাতিল")))));
}

export function BecomeMemberModal({
  showBecomeMemberModal,
  becomeMemberName,
  setBecomeMemberName,
  becomeMemberGender,
  setBecomeMemberGender,
  becomeMemberBusy,
  setBecomeMemberBusy,
  setShowBecomeMemberModal,
  auth,
  db,
  getFamilyId,
  generateUniqueReadableMemberKey,
  setMyMemberRequestStatus,
  setMyMemberRequestKey,
  adminUidsList
}) {
  return showBecomeMemberModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "সদস্য হোন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowBecomeMemberModal(false)
  }, /*#__PURE__*/React.createElement(X, { size: 18, className: "text-slate-400" }))),
  /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "আপনার নাম দিন — এডমিন অনুমোদন করলে আপনি এই পরিবারের একজন সদস্য হিসেবে যুক্ত হবেন।"),
  /*#__PURE__*/React.createElement("input", {
    value: becomeMemberName,
    onChange: e => setBecomeMemberName(e.target.value),
    placeholder: "আপনার নাম...",
    className: "w-full px-3 py-2 rounded-xl text-xs text-slate-900 border border-slate-200 outline-none font-medium mb-2"
  }), /*#__PURE__*/React.createElement("select", {
    value: becomeMemberGender,
    onChange: e => setBecomeMemberGender(e.target.value),
    className: "w-full px-3 py-2 rounded-xl text-xs text-slate-900 border border-slate-200 outline-none font-medium mb-3"
  }, /*#__PURE__*/React.createElement("option", { value: "male" }, "পুরুষ"), /*#__PURE__*/React.createElement("option", { value: "female" }, "নারী")),
  /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    disabled: becomeMemberBusy || !becomeMemberName.trim(),
    onClick: async () => {
      const name = becomeMemberName.trim();
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!name || !uid) return;
      setBecomeMemberBusy(true);
      try {
        // §pre-generated Member Password(২২ আগস্ট ২০২৬, readable-format
        // সংশোধন ২৩ আগস্ট ২০২৬): admin approve করার আগে কোনো members/
        // private/key/keyIndex doc তৈরি হয় না — শুধু এই memberRequest doc-এ
        // (self/admin-only readable) plaintext presetKey থাকে, approve হলে
        // ঠিক এই key দিয়েই member তৈরি হয়। readable(নাম+২-৩ digit) প্যাটার্নে
        // entropy কম বলে generateUniqueReadableMemberKey() দিয়েই এখানেই(request
        // submit-মুহূর্তে) keyIndex-এর বিপরীতে duplicate-check করা হয়(bounded
        // retry) — approval-পর্যন্ত অপেক্ষা না করে যতটা সম্ভব আগেই কলিশন এড়ানো।
        const { key: presetKey } = await generateUniqueReadableMemberKey(name);
        await db.collection("families").doc(getFamilyId())
          .collection("memberRequests").doc(uid)
          .set({ name, gender: becomeMemberGender, status: "pending", requestedAt: Date.now(), presetKey });
        setMyMemberRequestStatus("pending");
        setMyMemberRequestKey(presetKey);
        setShowBecomeMemberModal(false);
        setBecomeMemberName("");
        try {
          // adminUidsList prop boot-time listener থেকে আসে — নতুন-onboarding
          // user-এর ক্ষেত্রে listener attach হওয়ার আগেই submit হলে race-condition-এ
          // খালি থাকতে পারে (২৭ আগস্ট ২০২৬ ধরা পড়েছিল)। তাই stale prop-এর বদলে
          // এই মুহূর্তে family root doc fresh fetch করে সেখান থেকে adminUids নেওয়া
          // হচ্ছে; fetch ব্যর্থ হলেই শুধু prop-কে fallback হিসেবে ব্যবহার করা হয়।
          let freshAdminUids = adminUidsList || [];
          try {
            const famSnap = await db.collection("families").doc(getFamilyId()).get();
            const famData = famSnap.exists ? famSnap.data() : null;
            if (famData && Array.isArray(famData.adminUids) && famData.adminUids.length > 0) {
              freshAdminUids = famData.adminUids;
            }
            // [DEBUG, temporary] Diagnosis-purpose log — remove after root-cause confirmed.
            console.log("[DEBUG notif] getFamilyId:", getFamilyId(), "famSnap.exists:", famSnap.exists, "freshAdminUids:", freshAdminUids);
          } catch (famErr) {
            // [DEBUG, temporary]
            console.error("[DEBUG notif] family-fetch failed:", famErr);
          }
          await Promise.all((freshAdminUids || []).map(adminUid =>
            db.collection("families").doc(getFamilyId())
              .collection("notifications").add({
                targetUid: adminUid,
                type: "member_request",
                message: `${name} "সদস্য হোন" অনুরোধ পাঠিয়েছেন। অনুমোদনের জন্য ট্যাপ করুন।`,
                createdAt: Date.now(),
                read: false
              }).catch(writeErr => {
                // [DEBUG, temporary] Diagnosis-purpose log — remove after root-cause confirmed.
                console.error("[DEBUG notif] notification write failed for admin:", adminUid, writeErr);
              })
          ));
        } catch (outerErr) {
          // [DEBUG, temporary]
          console.error("[DEBUG notif] outer block failed:", outerErr);
        }
      } catch (err) {
        alert("অনুরোধ পাঠাতে সমস্যা হয়েছে: " + err.message);
      } finally {
        setBecomeMemberBusy(false);
      }
    },
    className: "flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-white disabled:opacity-50"
  }, becomeMemberBusy ? "পাঠানো হচ্ছে..." : "অনুরোধ পাঠান"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowBecomeMemberModal(false),
    className: "px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600"
  }, "বাতিল"))));
}
