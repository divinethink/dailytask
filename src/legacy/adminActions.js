// Admin ভূমিকা handler (Make Admin / Remove Admin / Self-Demote): app.js থেকে হুবহু সরানো, লজিক অপরিবর্তিত।
// Rules/authorization এখানে বদলায়নি — আসল সুরক্ষা firestore.rules-এ। App-এর state/setter গুলো `c`-তে আসে।
import { doc, addDoc, writeBatch, arrayUnion, arrayRemove, collection } from "firebase/firestore";
import { dbModular, authModular as auth } from "./firebaseConfig.js";
import { getFamilyId } from "./familyIdentity.js";

export function createAdminActions(c) {
  const {
    members, firstAdminUid, adminUidsList, memberOwnerUids,
    setAdminUidsList, setIsAdmin, setShowProfileDropdown
  } = c;

  // §Old-code cleanup Phase 1(১১ সেপ্টেম্বর ২০২৬, owner-approved): handleClaimMember
  // (legacy-v1-only free-claim, বাস্তবে উভয় real family v2-তে থাকায় already-dead)
  // ও handleAdminForceRelease(Member Password/ownerUids claim-system-নির্ভর,
  // দুটো real family-ই ইতিমধ্যে identityModel:"google-only" — Rules-level এই
  // legacy claim/force-release path আগে থেকেই বন্ধ) সরানো হয়েছে। "রিসেট
  // করুন"/"দায়িত্ব নিন" বাটন MemberListSection.jsx থেকেও একই সেশনে সরানো
  // হয়েছে। handleReleaseMember(self-only device-release, Member Key-নির্ভর
  // না) অপরিবর্তিত।
  // Admin Visibility UI — একজন claimed সদস্যকে Admin করা। Rules-এ scoped
  // update clause (adminUids-এ ঠিক ১টা নতুন uid যোগ, বাকি সব অপরিবর্তিত)
  // দিয়ে server-side enforced — এই ফাংশন শুধু সেই call করে, permission
  // নিজে দেয় না।
  async function handleMakeAdmin(m) {
    const mUids = memberOwnerUids(m);
    if (!mUids.length) {
      alert("এই সদস্যের দায়িত্ব এখনো কেউ নেয়নি — আগে দায়িত্ব নেওয়া প্রয়োজন, তারপর এডমিন করা যাবে।");
      return;
    }
    const ok = window.confirm(`"${m.name}"-কে এডমিন করতে চান? এডমিন সদস্য ব্যবস্থাপনা ও প্রবেশাধিকার অনুমোদন করতে পারবেন।`);
    if (!ok) return;
    try {
      // §Hybrid Admin Role Model — role(authoritative) ও adminUids(derived
      // index) একই atomic batch-এ sync।
      const famRef = doc(dbModular, "families", getFamilyId());
      const memberRef = doc(famRef, "members", m.id);
      const batch = writeBatch(dbModular);
      batch.update(famRef, {
        adminUids: arrayUnion(...mUids),
        updatedAt: Date.now()
      });
      batch.update(memberRef, {
        role: "admin",
        updatedAt: Date.now()
      });
      await batch.commit();
      setAdminUidsList(prev => Array.from(new Set([...prev, ...mUids])));
      // §Notification System — নতুন admin-কে জানানো, best-effort(ব্যর্থ
      // হলেও মূল Make-Admin action আগেই সফল হয়ে গেছে, তাই silently ignore)।
      try {
        await Promise.all(mUids.map(uid => addDoc(collection(famRef, "notifications"), {
            targetUid: uid,
            type: "admin_assigned",
            message: "আপনাকে এই পরিবারের এডমিন করা হয়েছে।",
            createdAt: Date.now(),
            read: false
          })));
      } catch {}
    } catch (err) {
      alert("এডমিন করতে সমস্যা হয়েছে: " + err.message);
    }
  }
  // অন্য একজন Admin-কে পদ থেকে বাদ দেওয়া (নিজেকে নয় — self-demote আলাদা,
  // profile dropdown থেকে, যাতে ভুলবশত lockout না হয়)। ক্লায়েন্ট-সাইডেও
  // last-admin চেক করা হচ্ছে, তবে আসল সুরক্ষা Rules-এ(size>=1)।
  async function handleRemoveAdmin(m) {
    const mUids = memberOwnerUids(m);
    if (!mUids.length) return;
    // §Hybrid Admin Role Model bugfix(১৬ আগস্ট ২০২৬) — "সর্বশেষ admin" এখন
    // distinct ব্যক্তি(role==="admin" member সংখ্যা) দিয়ে গণনা, adminUids
    // UID-count দিয়ে না(একই ব্যক্তির multi-device একাধিক UID থাকলে আগে এই
    // guard ভুলভাবে bypass হতো)।
    const adminPersonCount = (members || []).filter(x => x.role === "admin").length;
    if (adminPersonCount <= 1) {
      alert("সর্বশেষ এডমিনকে বাদ দেওয়া যাবে না — পরিবারে অন্তত একজন এডমিন থাকা আবশ্যক।");
      return;
    }
    // §First Admin Protection — client-side pre-check(UX-এর জন্য, আসল
    // সুরক্ষা Rules-এ)। প্রথম Admin-কে শুধু তিনি নিজেই পদ থেকে সরাতে
    // পারবেন(profile dropdown-এর self-demote দিয়ে), অন্য কোনো admin না।
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (firstAdminUid && mUids.includes(firstAdminUid) && myUid !== firstAdminUid) {
      alert("প্রথম এডমিনকে অন্য কোনো এডমিন পদ থেকে সরাতে পারবেন না — শুধু তিনি নিজেই নিজের পদ ছাড়তে পারেন।");
      return;
    }
    const ok = window.confirm(`"${m.name}"-কে এডমিন পদ থেকে বাদ দিতে চান?`);
    if (!ok) return;
    try {
      // §Hybrid Admin Role Model — role ও adminUids একই atomic batch-এ sync।
      const famRef = doc(dbModular, "families", getFamilyId());
      const memberRef = doc(famRef, "members", m.id);
      const batch = writeBatch(dbModular);
      batch.update(famRef, {
        adminUids: arrayRemove(...mUids),
        updatedAt: Date.now()
      });
      batch.update(memberRef, {
        role: "member",
        updatedAt: Date.now()
      });
      await batch.commit();
      setAdminUidsList(prev => prev.filter(u => !mUids.includes(u)));
    } catch (err) {
      alert("এডমিন বাদ দিতে সমস্যা হয়েছে: " + err.message);
    }
  }
  // নিজের এডমিন পদ ছাড়া (self-demote) — profile dropdown থেকে, ইচ্ছাকৃতভাবে
  // member-list বাটন থেকে আলাদা রাখা হয়েছে যাতে ভুল ক্লিকে নিজে lock-out
  // না হয়ে যান।
  async function handleSelfDemote() {
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (!myUid) return;
    // §Hybrid Admin Role Model bugfix(১৬ আগস্ট ২০২৬) — "একমাত্র admin" এখন
    // distinct ব্যক্তি(role==="admin") দিয়ে গণনা, UID-count দিয়ে না।
    const adminPersonCount = (members || []).filter(x => x.role === "admin").length;
    if (adminPersonCount <= 1) {
      alert("আপনিই একমাত্র এডমিন — এই মুহূর্তে নিজের এডমিন পদ ছাড়তে পারবেন না। আগে অন্য কাউকে এডমিন করুন।");
      return;
    }
    const ok = window.confirm("আপনি কি নিশ্চিত নিজের এডমিন পদ ছাড়তে চান?");
    if (!ok) return;
    try {
      // §Hybrid Admin Role Model — role ও adminUids একই atomic batch-এ sync।
      // নিজের ownerUids-এ myUid থাকা member খুঁজে বের করা হচ্ছে(role
      // authoritative source, না মিললে role sync বাদ যায় — adminUids
      // sync তবুও হবে, যাতে lockout না হয়)।
      const myMember = (members || []).find(x => memberOwnerUids(x).includes(myUid));
      // বাগফিক্স — শুধু current-session myUid না, এই ব্যক্তির নিজের সব
      // UID(multi-device claim থেকে) যেগুলো adminUids-এ আছে, একসাথে সরানো
      // হচ্ছে(নাহলে role="member" হওয়ার পরও অন্য নিজস্ব UID adminUids-এ
      // থেকে যেত — inconsistency)। ব্যতিক্রম: firstAdminUid-marked UID তখনই
      // bundle-এ যাবে যখন caller ঠিক সেই UID দিয়ে authenticated — নাহলে
      // rules-এর First Admin Protection পুরো write block করে দিত; তাই সেই
      // UID বাদ রেখে বাকিগুলো সরানো হয়(protection invariant অক্ষুণ্ণ)।
      const myOwnAdminUids = myMember
        ? memberOwnerUids(myMember).filter(u =>
            adminUidsList.includes(u) && (u !== firstAdminUid || myUid === firstAdminUid)
          )
        : [myUid];
      const famRef = doc(dbModular, "families", getFamilyId());
      const batch = writeBatch(dbModular);
      batch.update(famRef, {
        adminUids: arrayRemove(...myOwnAdminUids),
        updatedAt: Date.now()
      });
      if (myMember) {
        batch.update(doc(famRef, "members", myMember.id), {
          role: "member",
          updatedAt: Date.now()
        });
      }
      await batch.commit();
      setAdminUidsList(prev => prev.filter(u => !myOwnAdminUids.includes(u)));
      setIsAdmin(false);
      setShowProfileDropdown(false);
    } catch (err) {
      alert("এডমিন পদ ছাড়তে সমস্যা হয়েছে: " + err.message);
    }
  }
  return { handleMakeAdmin, handleRemoveAdmin, handleSelfDemote };
}
