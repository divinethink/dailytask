// googleAccountChange.js — "জিমেইল অ্যাকাউন্ট (জিমেইল) বদলান"-এর pure অংশ (Firebase/UI ছাড়া, Node-এ টেস্টযোগ্য)।
// নীতি: UID অপরিবর্তিত রেখে শুধু Google প্রোভাইডার বদলানো হয় (unlink → link), তাই rules/schema/ডেটায় কোনো বদল লাগে না।
// ঝুঁকির জানালা: unlink-এর পর link সম্পূর্ণ না হওয়া পর্যন্ত অ্যাকাউন্ট Google-ছাড়া থাকে — তখন রিকভারি-গেট দেখানো হয়।

const RELINK_FLAG = "dt_google_relink_pending"; // মান = পুরনো জিমেইল (normalized) বা "1"

const MESSAGES = {
  alreadyUsed: "এই জিমেইল অ্যাকাউন্ট ইতিমধ্যে অন্য পরিচয়ে ব্যবহৃত হচ্ছে। অন্য একটি অ্যাকাউন্ট বেছে নিন, অথবা পুরনো জিমেইল ফিরিয়ে আনুন।",
  incomplete: "অ্যাকাউন্ট বেছে নেওয়া সম্পূর্ণ হয়নি। আবার চেষ্টা করুন।",
  popupBlocked: "পপআপ বন্ধ ছিল। ব্রাউজারে পপআপের অনুমতি দিয়ে আবার চেষ্টা করুন।",
  network: "ইন্টারনেট সংযোগে সমস্যা হয়েছে। সংযোগ ঠিক করে আবার চেষ্টা করুন।",
  recentLogin: "নিরাপত্তার জন্য আগে লগআউট করে আবার সাইন-ইন করুন, তারপর চেষ্টা করুন।",
  generic: "যুক্ত করা যায়নি। আবার চেষ্টা করুন।"
};

// Firebase error code ⇒ ব্যবহারকারীর বার্তা (internal কোড/বার্তা কখনো সরাসরি দেখানো হয় না)।
function relinkErrorMessage(code) {
  switch (code) {
    case "auth/credential-already-in-use":
    case "auth/email-already-in-use":
      return MESSAGES.alreadyUsed;
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return MESSAGES.incomplete;
    case "auth/popup-blocked":
      return MESSAGES.popupBlocked;
    case "auth/network-request-failed":
      return MESSAGES.network;
    case "auth/requires-recent-login":
      return MESSAGES.recentLogin;
    default:
      return MESSAGES.generic;
  }
}

// পুরনো জিমেইলের familyMemberEmails-mapping মুছতে হবে কিনা: নতুন জিমেইল আলাদা হলে পুরনোর key ফেরত, নইলে null।
function staleMappingKey(oldEmail, newEmail) {
  const norm = e => (e || "").trim().toLowerCase();
  const o = norm(oldEmail), n = norm(newEmail);
  return o && o.includes("@") && o !== n ? o : null;
}

// ফ্ল্যাগের মান থেকে পুরনো জিমেইল (শুধু "@" থাকলে), নইলে null।
function oldEmailFromFlag(v) {
  return typeof v === "string" && v.includes("@") ? v : null;
}

export { RELINK_FLAG, MESSAGES, relinkErrorMessage, staleMappingKey, oldEmailFromFlag };
