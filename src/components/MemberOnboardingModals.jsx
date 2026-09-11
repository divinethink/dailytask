// A4 G4 (part C) — BecomeMemberModal("সদস্য হোন" self-request), extracted
// verbatim from legacy App(). Structural-only (Owner Rule 2): JSX body
// unchanged, state ownership stays in App(). Dual-used(Onboarding Gate
// early-return branch + normal tree) — App() still assigns it to a
// `const becomeMemberModalNode = React.createElement(...)` variable exactly
// as before, so both usage-sites and the gate-logic itself are untouched.
// §Old-code cleanup Phase 1(১১ সেপ্টেম্বর ২০২৬, owner-approved): ClaimKeyModal
// ("দায়িত্ব নিন", Member Password claim) এই ফাইল থেকে সরানো হয়েছে — Google-only
// identity model(2_4)-এ দুটো real family-ই ইতিমধ্যে cutover হয়ে যাওয়ায়
// Rules-level এই legacy claim-path আগে থেকেই বন্ধ, এবং app.js-এ এর একমাত্র
// live trigger("দায়িত্ব নিন" ডাশবোর্ড বাটন) MemberListSection.jsx থেকেও একই
// সেশনে সরানো হয়েছে। BecomeMemberModal(Phase 2 scope) অপরিবর্তিত।
import { X } from "./icons.jsx";

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
          } catch (famErr) {
            // fetch ব্যর্থ হলে prop-fallback ব্যবহার হয়, silent-skip নয় বলে rethrow দরকার নেই
          }
          await Promise.all((freshAdminUids || []).map(adminUid =>
            db.collection("families").doc(getFamilyId())
              .collection("notifications").add({
                targetUid: adminUid,
                type: "member_request",
                message: `${name} "সদস্য হোন" অনুরোধ পাঠিয়েছেন। অনুমোদনের জন্য ট্যাপ করুন।`,
                createdAt: Date.now(),
                read: false
              })
          ));
        } catch (outerErr) {
          // notification-write ব্যর্থ হলেও মূল request-submit flow block করা হয় না
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
