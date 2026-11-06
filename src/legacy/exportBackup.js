// ডেটা এক্সপোর্ট (লোকাল ব্যাকআপ ফাইল): app.js থেকে হুবহু সরানো, লজিক অপরিবর্তিত।
// ধাপ: File System Access → Web Share → সরাসরি ডাউনলোড।
import { readAllFamilyDataForBackup, clearStoredFsaDirHandle, getOrRequestFsaBaseDir, writeFsaBackupFile, DRIVE_BACKUP_SCHEMA_VERSION } from "./backup.js";
import { getFamilyCode } from "./familyIdentity.js";
import { pad2 } from "./appHelpers.js";

export async function exportBackupToDevice(migrationState) {
  try {
    // File System Access (থাকলে) সবচেয়ে আগে চেষ্টা করা হয় —
    // showDirectoryPicker() অবশ্যই user gesture-এর মধ্যেই কল করতে হয়,
    // তাই এটি Firestore fetch-এর আগেই (handleExportData শুরু হওয়ার পর
    // প্রথম await হিসেবে) করা হচ্ছে।
    const fsaBaseDir = await getOrRequestFsaBaseDir();
    // Switch prep fix: আগে এখানে সরাসরি db.collection(getCollectionName())
    // (legacy) থেকে পড়া হতো — v2 family-তে এটি ভুল (stale) ডাটা export
    // করত। এখন readAllFamilyDataForBackup() ব্যবহার করা হচ্ছে, যা
    // migrationState অনুযায়ী সঠিক (live) জায়গা থেকে পড়ে এবং legacy-style
    // key ফরম্যাটেই রিটার্ন করে — legacy family-তে আউটপুট অপরিবর্তিত।
    const exportObj = await readAllFamilyDataForBackup(migrationState);
    // একই backup schema যা Google Drive ব্যাকআপেও ব্যবহৃত হয় (single
    // schema — আলাদা local-only format নেই)। family/preferences এখানে
    // অন্তর্ভুক্ত নয় কারণ mergeBackupData() শুধু .data ব্যবহার করে।
    const exportPayload = {
      schemaVersion: DRIVE_BACKUP_SCHEMA_VERSION,
      appVersion: "1.0.0",
      backupTime: Date.now(),
      data: exportObj
    };
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    // ফাইলের নামে টাইমস্ট্যাম্প যোগ করা হয়েছে যাতে একাধিকবার এক্সপোর্ট
    // করলে আগেরগুলো চেনা/বাছাই করা সহজ হয়।
    const now = new Date();
    const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}`;
    const fileName = `daily_task_backup_${getFamilyCode()}_${stamp}.json`;
    // ধাপ ১: File System Access API — Android Chrome M132+ (stable,
    // জানুয়ারি ২০২৫ থেকে) এবং ডেস্কটপ Chrome/Edge-এ সাপোর্ট করে। প্রথমবার
    // ব্যবহারকারীর বেছে নেওয়া বেস-ফোল্ডারের ভেতরে "DailyTask Backup"
    // সাবফোল্ডার স্বয়ংক্রিয়ভাবে তৈরি/পুনঃব্যবহার করে সরাসরি ফাইল লেখা
    // হয় — কোনো prompt ছাড়াই (পারমিশন বহাল থাকা পর্যন্ত)।
    if (fsaBaseDir) {
      try {
        await writeFsaBackupFile(fsaBaseDir, fileName, jsonStr);
        return;
      } catch (fsaErr) {
        // NotFoundError/InvalidStateError/NotAllowedError মানে হ্যান্ডেলটি
        // নিশ্চিতভাবে অবৈধ (ফোল্ডার মুছে ফেলা হয়েছে/সরানো হয়েছে, বা
        // permission নিঃশব্দে বাতিল হয়ে গেছে) — এক্ষেত্রে cached হ্যান্ডেল
        // বাতিল করে ব্যবহারকারীকে একবার সংক্ষিপ্ত বার্তা দেখানো হচ্ছে, যাতে
        // তিনি বুঝতে পারেন পরের বার কেন নতুন ফোল্ডার বেছে নিতে বলা হবে।
        // এই মুহূর্তে আবার showDirectoryPicker() দেখানো নিরাপদ নয়
        // (user-gesture window ইতিমধ্যে ব্যবহৃত হয়ে যেতে পারে, ফলে
        // SecurityError হতে পারে) — তাই *পরের* ব্যাকআপ চেষ্টায় (নতুন,
        // তাজা ক্লিক থেকে) getOrRequestFsaBaseDir() স্বয়ংক্রিয়ভাবে আবার
        // ফোল্ডার বেছে নিতে বলবে।
        const invalidHandleErrors = ["NotFoundError", "InvalidStateError", "NotAllowedError"];
        if (fsaErr && invalidHandleErrors.includes(fsaErr.name)) {
          try {
            await clearStoredFsaDirHandle();
          } catch {}
          alert("নির্বাচিত ব্যাকআপ ফোল্ডারটি আর ব্যবহারযোগ্য নয়। পরবর্তী ব্যাকআপের সময় নতুন ফোল্ডার নির্বাচন করুন।");
        }
        // অন্য যেকোনো (সাময়িক) ত্রুটিতে হ্যান্ডেল অক্ষত রাখা হচ্ছে —
        // পরের বার আবার এই একই ফোল্ডার ব্যবহারের চেষ্টা হবে, অকারণে নতুন
        // করে prompt করা হবে না। এখন নিচের Web Share/Download fallback-এ
        // যাওয়া হচ্ছে।
      }
    }
    // ধাপ ২ (fallback): Web Share API — File System Access সাপোর্ট না
    // থাকলে, ব্যবহারকারী পিকার বাতিল করলে, বা permission না পেলে এখানে
    // আসা হয়। মোবাইলে নেটিভ "Share" শিট দেখায়, যেখান থেকে ব্যবহারকারী
    // চাইলে Files অ্যাপে বা সরাসরি Google Drive-এও পাঠাতে পারবেন।
    try {
      const file = new File([jsonStr], fileName, {
        type: "application/json"
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Daily Task ব্যাকআপ",
          text: `Daily Task ডেটা ব্যাকআপ — ${fileName}`
        });
        return;
      }
    } catch (shareErr) {
      if (shareErr && shareErr.name === "AbortError") return; // ব্যবহারকারী শেয়ার বাতিল করেছেন
      // অন্য যেকোনো ব্যর্থতায় নিচের সরাসরি-ডাউনলোড ফলব্যাকে যাওয়া হচ্ছে
    }
    // ধাপ ৩ (চূড়ান্ত fallback): সরাসরি ব্রাউজার ডাউনলোড — আগের মতোই,
    // কোনো ব্রেকিং চেঞ্জ নেই।
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    alert("ডেটা এক্সপোর্ট করতে সমস্যা হয়েছে: " + err.message);
  }
}
