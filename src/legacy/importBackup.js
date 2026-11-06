// লোকাল ব্যাকআপ ফাইল ইম্পোর্ট: app.js-এর handleImportData থেকে হুবহু সরানো, লজিক অপরিবর্তিত।
// (migrationState এখন প্যারামিটার হিসেবে আসে; বাকি সব আগের মতো।)
import { mergeBackupData, DRIVE_BACKUP_SCHEMA_VERSION } from "./backup.js";

export async function importBackupFromFile(e, migrationState) {
  const fileReader = new FileReader();
  if (e.target.files && e.target.files[0]) {
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target.result);

        // একই backup schema যা Drive ব্যাকআপে ব্যবহৃত হয় (schemaVersion +
        // data wrapper) — local ও Drive-এর জন্য পৃথক ফরম্যাট নেই।
        if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
          throw new Error("ব্যাকআপ ফাইলের ফরম্যাট চেনা যাচ্ছে না।");
        }
        if (parsed.schemaVersion && parsed.schemaVersion > DRIVE_BACKUP_SCHEMA_VERSION) {
          throw new Error("এই ব্যাকআপ ফাইলটি অ্যাপের নতুন ভার্সনে তৈরি হয়েছে — অনুগ্রহ করে আগে অ্যাপ আপডেট করুন।");
        }

        // [C-1 FIX] আগে এখানে একটি পৃথক ইনলাইন import logic ছিল যা
        // existing member: ডকুমেন্ট কোনো check ছাড়াই ওভাররাইট করে ফেলত
        // (Drive Restore-এর mergeBackupData() থেকে ভিন্ন আচরণ)। এখন
        // local-file Import ও Drive Restore উভয়ই একই mergeBackupData()
        // ব্যবহার করছে যাতে member ডকুমেন্টের জন্য একই নিরাপদ নিয়ম প্রযোজ্য
        // হয়: compareUpdatedAt: false দেওয়ায় আগের (local-file Import-এর)
        // আচরণই বহাল থাকছে — বিদ্যমান সদস্য কখনো ছোঁয়া হবে না, শুধু নতুন
        // সদস্য যোগ হবে; entry:/weekly:/অন্যান্য ডকুমেন্ট আগের মতোই সবসময়
        // লেখা হবে (merge: true সহ)। ownerUid normalize logic এবং অন্য
        // ডিভাইসের claim করা সদস্যের ডাটা স্কিপ করার নিয়ম অপরিবর্তিত আছে
        // (mergeBackupData()-এর ভেতরেই)।
        const result = await mergeBackupData(migrationState, parsed.data, { compareUpdatedAt: false });
        if (result.skippedKeys.length) {
          alert(`ডেটা ইম্পোর্ট হয়েছে। তবে ${result.skippedKeys.length}টি এন্ট্রি স্কিপ করা হয়েছে, কারণ সেগুলো অন্য ডিভাইসের দায়িত্বে থাকা সদস্যের — সেগুলো সেই সদস্যের নিজের ডিভাইস থেকে ইম্পোর্ট করতে হবে।`);
        } else {
          alert("ডেটা সফলভাবে ইম্পোর্ট করা হয়েছে!");
        }
        window.location.reload();
      } catch (err) {
        alert("ইম্পোর্ট করতে সমস্যা হয়েছে (ভুল ব্যাকআপ ফাইল হতে পারে): " + err.message);
      }
    };
  }
}
