// ফ্যামিলি কোড কপি, ইনভাইট-লিংক শেয়ার/বাতিল, নতুন ফ্যামিলি তৈরি, ফ্যামিলিতে যোগ ও কোড-রিনেম handler:
// app.js থেকে হুবহু সরানো, লজিক অপরিবর্তিত। App-এর state/setter গুলো `c` অবজেক্টে আসে;
// প্রতি রেন্ডারে নতুন করে কল হয়, তাই আচরণ আগের (App-এর ভেতরের) ফাংশনগুলোর মতোই।
import { authModular as auth } from "./firebaseConfig.js";
import { getFamilyCode, getFamilyId, isFamilyCodeCharsetValid, changeFamilyCodeForExistingFamily, createNewFamily, joinExistingFamily, FAMILY_CODE_MIN_LENGTH, FAMILY_CODE_MAX_LENGTH } from "./familyIdentity.js";
import { rotateInviteLink, revokeInviteLink } from "./googleIdentity.js";

export function createFamilyActions(c) {
  const {
    activeInviteToken, setActiveInviteToken, members, setCopiedCode,
    newFamCodeInput, setNewFamCodeBusy,
    joinFamCodeInput, setJoinFamCodeBusy,
    renameFamCodeInput, setRenameFamCodeBusy
  } = c;
  function handleCopyCode() {
    navigator.clipboard.writeText(getFamilyCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }
  // §Public Invite-Link(নতুন, 2_4 §৫.২, Pending #2 UI): admin বাটনে ক্লিক
  // করলে সক্রিয় token না থাকলে(বা revoked হলে) নতুন rotate করে, নাহলে
  // বিদ্যমান token-ই পুনরায় শেয়ার করে(unnecessary rotate এড়িয়ে link
  // multi-use থাকে, §৫.২ নীতি অনুযায়ী)। Link root-path query-param
  // ব্যবহার করে(§App() early-return, উপরে দ্রষ্টব্য) — কোনো নতুন Cloudflare
  // routing config লাগে না।
  async function handleShareInviteLink() {
    try {
      let tokenObj = activeInviteToken;
      if (!tokenObj || tokenObj.revoked) {
        const token = await rotateInviteLink(getFamilyId());
        tokenObj = { token, createdAt: Date.now(), revoked: false };
        setActiveInviteToken(tokenObj);
      }
      const link = `${window.location.origin}/?joinFid=${encodeURIComponent(getFamilyId())}&joinToken=${encodeURIComponent(tokenObj.token)}&fc=${encodeURIComponent(getFamilyCode())}`;
      // §Bug-fix(১৩ সেপ্টেম্বর ২০২৬, owner-reported #১): বার্তায় পরিবারের
      // ইউজারনেম ও ইনভাইট-পাঠানো ব্যক্তির নাম যোগ — নিজের member-doc
      // (existing myOwnMember pattern, ProfileDropdownGoogle-এর মতোই derive)
      // থেকে নাম বের করা হয়, না পাওয়া গেলে generic fallback।
      const myUid = auth.currentUser ? auth.currentUser.uid : null;
      const myOwnMember = (members || []).find(x => x.googleUid === myUid);
      const inviterName = (myOwnMember && myOwnMember.name) || "একজন সদস্য";
      const text = `আসসালামু আলাইকুম 🌸\nDaily Task (দৈনিক আমল ও পারিবারিক ট্র্যাকার)- App এর ${getFamilyCode()} পরিবারে যোগদানের জন্য ${inviterName} আপনাকে আমন্ত্রণ জানিয়েছেন।\nপরিবারের সদস্য হতে নিচের লিংকে ক্লিক করে প্রয়োজনীয় তথ্য পূরণ করুন এবং পরিবারের সদস্য হোন।\n\n🔗 লিংক: ${link}`;
      if (navigator.share) {
        await navigator.share({ title: "Daily Task", text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("আমন্ত্রণ লিংক কপি হয়েছে, এখন পাঠিয়ে দিন।");
      }
    } catch (err) {
      if (err && err.name !== "AbortError") {
        alert("লিংক তৈরি/শেয়ার করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
      }
    }
  }
  async function handleRevokeInviteLink() {
    if (!activeInviteToken || activeInviteToken.revoked) return;
    try {
      await revokeInviteLink(getFamilyId(), activeInviteToken);
      setActiveInviteToken(prev => prev ? { ...prev, revoked: true } : prev);
    } catch (err) {
      alert("লিংক নিষ্ক্রিয় করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
    }
  }
  // "নতুন ফ্যামিলি কোড তৈরি করুন" — সব সদস্যের জন্য উন্মুক্ত (কারো নিজস্ব
  // পৃথক family স্পেস দরকার হলে)। সম্পূর্ণ নতুন familyId+data — বর্তমান
  // family/data কোনোভাবে touch হয় না, শুধু এই ডিভাইসটি নতুন (blank)
  // family-তে সুইচ হয়ে যায়। createNewFamily() নিজেই এই ডিভাইসের uid-কে
  // নতুন family-এর প্রথম Admin হিসেবে claim করে।
  async function handleCreateNewFamily() {
    const code = newFamCodeInput.trim();
    if (!code) return;
    if (code.length < FAMILY_CODE_MIN_LENGTH) {
      window.alert(`ফ্যামিলি ইউজারনেম কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
      return;
    }
    if (!isFamilyCodeCharsetValid(code)) {
      window.alert("অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।");
      return;
    }
    if (!window.confirm(`"${code}" কোড দিয়ে সম্পূর্ণ নতুন, খালি একটি ফ্যামিলি স্পেস তৈরি হবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডেটা অক্ষত থাকবে, কিন্তু এই ডিভাইস থেকে আর দেখা যাবে না। এগিয়ে যাবেন?`)) return;
    setNewFamCodeBusy(true);
    try {
      const result = await createNewFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          length: `কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`,
          charset: "অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।",
          "code-taken": "এই কোড ইতিমধ্যে ব্যবহৃত হচ্ছে, অন্য একটি কোড ব্যবহার করুন।",
          error: result.error || "একটি সমস্যা হয়েছে।"
        }[result.reason] || "নতুন ফ্যামিলি তৈরি করা যায়নি।";
        window.alert(reasonMsg);
      }
      // success হলে createNewFamily নিজেই reload করে।
    } finally {
      setNewFamCodeBusy(false);
    }
  }
  // "বিদ্যমান ফ্যামিলি কোড দিয়ে যোগ দিন" — সব সদস্যের জন্য উন্মুক্ত (নতুন
  // device-এ আগে থেকে থাকা কোনো Family Code দিয়ে ঢোকার জন্য)। শুধু v2
  // family-তে কাজ করে (legacy read-gate এখনো implement হয়নি বলে ইচ্ছাকৃতভাবে
  // সীমিত)। joinExistingFamily() নিজেই device সুইচ করে reload করে — এরপর
  // বুট-টাইম accessDenied হ্যান্ডলিং pending accessRequest তৈরি/approved
  // চেক করবে।
  async function handleJoinExistingFamily() {
    const code = joinFamCodeInput.trim();
    if (!code) return;
    if (!window.confirm(`"${code}" কোড দিয়ে সেই ফ্যামিলিতে যোগ দেওয়ার অনুরোধ পাঠানো হবে এবং এই ডিভাইসটি সেখানে সুইচ হয়ে যাবে। বর্তমান ফ্যামিলির ডেটা অক্ষত থাকবে, কিন্তু এই ডিভাইস থেকে আর দেখা যাবে না। এগিয়ে যাবেন?`)) return;
    setJoinFamCodeBusy(true);
    try {
      const result = await joinExistingFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          "same-family": "আপনি ইতিমধ্যে এই ফ্যামিলিতে আছেন।",
          "not-found": "এই কোডের কোনো ফ্যামিলি পাওয়া যায়নি। কোডটি আবার যাচাই করুন।",
          "not-v2": "এই ফ্যামিলি এখনো এই ফিচারের জন্য প্রস্তুত নয়। ফ্যামিলির Admin-এর সাথে সরাসরি যোগাযোগ করুন।",
          error: result.error || "একটি সমস্যা হয়েছে।"
        }[result.reason] || "যোগ দেওয়া যায়নি।";
        window.alert(reasonMsg);
      }
      // success হলে joinExistingFamily নিজেই reload করে।
    } finally {
      setJoinFamCodeBusy(false);
    }
  }
  // §৫ Family Code Lifecycle Fix — Admin-only: বর্তমান family-এর কোড
  // পরিবর্তন, dataCollectionName/data অপরিবর্তিত থাকে (changeFamilyCodeForExistingFamily
  // নিজেই Rules-এ admin-enforced, তাই এখানে আলাদা করে isAdmin চেক না
  // করলেও নিরাপদ — তবু UI-তে ভুল ব্যবহার এড়াতে বাটনটি isAdmin-গেটেড)।
  async function handleRenameFamilyCode() {
    const code = renameFamCodeInput.trim();
    if (!code) return;
    if (code.length < FAMILY_CODE_MIN_LENGTH) {
      window.alert(`ফ্যামিলি ইউজারনেম কমপক্ষে ${FAMILY_CODE_MIN_LENGTH} ক্যারেক্টার হতে হবে।`);
      return;
    }
    if (!isFamilyCodeCharsetValid(code)) {
      window.alert("অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।");
      return;
    }
    if (!window.confirm(`কোড "${code}"-তে পরিবর্তন করবেন? আপনার পরিবারের সব ডেটা অক্ষত থাকবে (কোনো কপি/লস হবে না) — শুধু পরিবারের পরিচিতি-কোড বদলাবে। বাকি সদস্যদের ডিভাইসে অটো নতুন কোড বসে যাবে ও নোটিশ দেখাবে।`)) return;
    setRenameFamCodeBusy(true);
    try {
      const result = await changeFamilyCodeForExistingFamily(code);
      if (result && result.aborted) {
        const reasonMsg = {
          length: `কোড ${FAMILY_CODE_MIN_LENGTH}-${FAMILY_CODE_MAX_LENGTH} ক্যারেক্টারের মধ্যে হতে হবে।`,
          charset: "অনুগ্রহ করে শুধু English Alphabet, সংখ্যা, _ বা - ব্যবহার করুন।",
          "no-auth": "সাইন ইন করা নেই।",
          error: result.error || "একটি সমস্যা হয়েছে।"
        }[result.reason] || "কোড পরিবর্তন করা যায়নি।";
        window.alert(reasonMsg);
      }
      // success হলে changeFamilyCodeForExistingFamily নিজেই reload করে।
    } finally {
      setRenameFamCodeBusy(false);
    }
  }
  return { handleCopyCode, handleShareInviteLink, handleRevokeInviteLink, handleCreateNewFamily, handleJoinExistingFamily, handleRenameFamilyCode };
}
