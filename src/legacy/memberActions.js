// সদস্য যোগ (proxy) ও সদস্য বাদ দেওয়ার handler: app.js থেকে হুবহু সরানো, লজিক অপরিবর্তিত।
// Rules/authorization এখানে বদলায়নি — আসল সুরক্ষা firestore.rules-এ। App-এর state/setter গুলো `c`-তে আসে।
import { getFamilyId } from "./familyIdentity.js";
import { addProxyMemberByAdmin, deleteFamilyMemberEmail, normalizeEmail } from "./googleIdentity.js";
import { logAuthDiagnostics } from "./firebaseConfig.js";
import { deleteMemberDoc } from "./memberData.js";

export function createMemberActions(c) {
  const {
    isAdmin, newName, newGender, newMemberEmail, members, selectedId, migrationState,
    setMembers, setSelectedId, setNewName, setNewGender, setNewMemberEmail, setAddingMember
  } = c;
  async function handleAddMember() {
    if (!isAdmin) {
      alert("নতুন সদস্য শুধু এডমিন যোগ করতে পারবেন। নিজে সদস্য হতে \"সদস্য হোন\" ব্যবহার করুন।");
      return;
    }
    const name = newName.trim();
    if (!name) return;
    // §Add-Member fix(১১ সেপ্টেম্বর ২০২৬, real gap fix): আগে এখানে
    // createMemberWithKey()(Member Password-ভিত্তিক) কল হতো, যা google-only
    // family-তে Rules-level(`private/key` create, `!isGoogleOnly` guard)
    // blocked — বাটন ভাঙা ছিল(দুটো real family-ই ইতিমধ্যে google-only)। এখন
    // 2_4 §৫.১ Admin-added Proxy Member pattern(email-ভিত্তিক, googleUid:
    // null) ব্যবহার করা হচ্ছে — সদস্য পরে নিজে Google Sign-in করলে auto-claim
    // হবে(googleIdentity.js: signInExistingMemberByGoogle(), অপরিবর্তিত)।
    const email = (newMemberEmail || "").trim();
    if (!email || !email.includes("@")) {
      alert("সদস্যের সঠিক ইমেইল ঠিকানা দিন — পরে Google দিয়ে সাইন-ইন করার জন্য প্রয়োজন।");
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      await addProxyMemberByAdmin(getFamilyId(), id, name, newGender, email);
      const newMember = {
        id,
        name,
        gender: newGender,
        email: email.trim().toLowerCase(),
        googleUid: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setMembers(prev => [...(prev || []), newMember]);
      setSelectedId(id);
      setNewName("");
      setNewGender("male");
      setNewMemberEmail("");
      setAddingMember(false);
    } catch (err) {
      logAuthDiagnostics("Add Member", err);
      alert("সদস্য যোগ করতে সমস্যা হয়েছে: " + err.message + (err && err.code ? ` [কোড: ${err.code}]` : ""));
    }
  }
  async function handleRemoveMember(m) {
    // §Bug-fix(১৩ সেপ্টেম্বর ২০২৬, owner-reported #৪): আগে এখানে
    // memberOwnerUids(m)-ভিত্তিক একটা guard ছিল("অন্য ডিভাইসের দায়িত্বে
    // আছে") — এটা পুরনো ownerUids self-serve মডেলের অবশিষ্টাংশ। বর্তমান
    // firestore.rules-এ member delete শুধু isAdminOfFamily()-নির্ভর
    // (ownership-নিরপেক্ষ, "বাগ-ফিক্স ২৭.৪" দ্রষ্টব্য) — তাই admin যেকোনো
    // claimed member(নিজে owner না হলেও) delete করতে পারার কথা, কিন্তু এই
    // stale client-guard সেটা ভুলভাবে ব্লক করছিল(test member remove করতে
    // না পারার আসল কারণ)। Trash বাটন এখন isAdmin-গেটেড(MemberListSection.jsx)
    // বলে এই ফাংশন কল হওয়া মানেই caller admin — আলাদা client-check
    // redundant, তাই সরিয়ে ফেলা হলো। Server-side Rules অপরিবর্তিত(একমাত্র
    // real authorization boundary)।
    const ok = window.confirm(`আপনি কি নিশ্চিত "${m.name}" কে সদস্য তালিকা থেকে বাদ দিতে চান? এই সদস্যের নাম আর দেখা যাবে না, তবে পূর্বের সেভ করা ডেটা মুছে যাবে না।`);
    if (!ok) return;
    const next = (members || []).filter(x => x.id !== m.id);
    setMembers(next);
    try {
      await deleteMemberDoc(migrationState, m.id);
      // §Bug-fix(owner-reported #২ — "family ত্যাগ/remove-এর পর একই email
      // পুনরায় ব্যবহারযোগ্য হওয়া উচিত"): আগে admin-remove এখানে
      // familyMemberEmails mapping কখনো clean করত না। Unclaimed proxy
      // member(googleUid null)-এর email এখনো doc-এ/local state-এ জানা
      // থাকে বলে(claimed member-এর মতো claim-মুহূর্তে delete হয়নি) এই
      // case নিরাপদে(non-fatal, Rules: isAdminOfFamily() delete-permission
      // ইতিমধ্যে সমর্থিত) clean করা সম্ভব — করা হলো। Claimed member(email
      // field claim-এই delete হয়ে গেছে) admin জানেনই না বলে সেই case-এ
      // এখনো self-heal(googleIdentity.js: fetchMemberData() ব্যবহারকারী
      // check-গুলো)-এর উপর নির্ভর করে — data-loss/security ঝুঁকি নেই, শুধু
      // stale mapping doc রয়ে যেতে পারে(future join/add attempt-এ স্ব-
      // সংশোধিত)।
      if (!m.googleUid && m.email) {
        try {
          await deleteFamilyMemberEmail(normalizeEmail(m.email));
        } catch (err) {
          console.error("[Remove Member] email-mapping cleanup ব্যর্থ(non-fatal):", err.message);
        }
      }
    } catch (err) {
      alert("সদস্য সিংক করতে সমস্যা হয়েছে: " + err.message);
    }
    if (selectedId === m.id) {
      setSelectedId(next.length ? next[0].id : null);
    }
  }
  return { handleAddMember, handleRemoveMember };
}
