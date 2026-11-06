// Google Drive ব্যাকআপ/রিস্টোর UI handler: app.js থেকে হুবহু সরানো, লজিক অপরিবর্তিত।
// App-এর state/setter গুলো `c` অবজেক্টে আসে; প্রতি রেন্ডারে নতুন করে কল হয়,
// তাই আচরণ আগের (App-এর ভেতরের) ফাংশনগুলোর মতোই।
import { isGoogleLinked } from "./familyIdentity.js";
import { isGoogleDriveConfigured, getDriveAccessToken, findDriveBackupFile, backupToGoogleDrive, restoreFromGoogleDrive } from "./backup.js";

export function createDriveBackupActions(c) {
  const {
    migrationState, handleExportData, driveRestoreCandidate,
    setShowBackupOptionsModal, setShowGoogleAccountModal, setShowImportOptionsModal,
    setDriveBackupBusy, setDriveBackupStatus,
    setDriveRestoreChecking, setDriveRestoreCandidate, setShowDriveRestoreModal, setDriveRestoreBusy
  } = c;
  async function handleDriveBackupClick() {
    if (!isGoogleLinked()) {
      setShowBackupOptionsModal(false);
      setShowGoogleAccountModal(true);
      return;
    }
    setDriveBackupBusy(true);
    setDriveBackupStatus(null);
    try {
      const result = await backupToGoogleDrive(migrationState);
      if (result.skipped) {
        setDriveBackupStatus({ type: "error", text: "ব্যাকআপ বাতিল করা হয়েছে।" });
      } else {
        setDriveBackupStatus({ type: "ok", text: "Google Drive-এ ব্যাকআপ সংরক্ষিত হয়েছে।" });
      }
    } catch (err) {
      setDriveBackupStatus({ type: "error", text: "Google Drive ব্যাকআপ ব্যর্থ হয়েছে: " + err.message });
    } finally {
      setDriveBackupBusy(false);
    }
  }
  async function handleBothBackupClick() {
    await handleExportData();
    await handleDriveBackupClick();
  }
  // Drive-এ ব্যাকআপ খুঁজে পেলে Restore Popup দেখায়, না পেলে/ব্যর্থ হলে
  // explicit=true (ব্যবহারকারীর সরাসরি ক্লিকে) হলে alert দেখায়, নাহলে
  // (explicit=false — সাইন-ইনের পর automatic চেক) নীরবে থাকে যাতে সাইন-ইন
  // প্রবাহ আটকে না যায়। রিটার্ন ভ্যালু: ব্যাকআপ পাওয়া গেছে কিনা (boolean)।
  async function findAndOfferDriveRestore(explicit) {
    if (!isGoogleDriveConfigured()) {
      if (explicit) alert("Google Drive ব্যাকআপ এখনো সেটআপ করা হয়নি।");
      return false;
    }
    setDriveRestoreChecking(true);
    try {
      // H-1 fix(Audit, ১৫ আগস্ট ২০২৬): explicit=false(auto-check, যেমন
      // Google link-এর পরপরই বা বুট-টাইমে) হলে token আগেই silent-only
      // (allowConsentPopup:false) fetch করে নেওয়া হচ্ছে — silent ব্যর্থ
      // হলে এখানেই থেমে যাবে(নিচের catch), findDriveBackupFile()-এর
      // ভেতরের driveFetch()/getDriveAccessToken() default(true)-এ পৌঁছাবে
      // না, তাই কোনো consent popup খুলবে না। token একবার cache হয়ে গেলে
      // (driveAccessToken module-level) পরের driveFetch() কলগুলো সেই cache
      // থেকেই পাবে, নতুন করে prompt করবে না। explicit=true(ব্যবহারকারীর
      // সরাসরি ক্লিক)-এ এই pre-fetch skip — আগের মতোই consent popup পাবে।
      if (!explicit) {
        await getDriveAccessToken(false);
      }
      const file = await findDriveBackupFile();
      if (file) {
        setDriveRestoreCandidate(file);
        setShowDriveRestoreModal(true);
        return true;
      }
      if (explicit) alert("এই Google অ্যাকাউন্টে কোনো Drive ব্যাকআপ পাওয়া যায়নি।");
      return false;
    } catch (err) {
      if (explicit) alert("Drive ব্যাকআপ খুঁজতে সমস্যা হয়েছে: " + err.message);
      return false;
    } finally {
      setDriveRestoreChecking(false);
    }
  }
  // Google সাইন-ইন (link) সফল হওয়ার পর কল হয় — এই অ্যাকাউন্টে আগে থেকে
  // কোনো Drive ব্যাকআপ থাকলে সেটা নীরবে detect করে Restore-এর Popup
  // দেখানো হয় (GoogleAccountModal-এর onLinked prop হিসেবে ব্যবহৃত)।
  function checkDriveBackupAfterLink() {
    return findAndOfferDriveRestore(false);
  }
  // "ইম্পোর্ট ব্যাকআপ ফাইল" বটম-শিট থেকে "Google Drive থেকে রিস্টোর করুন"
  // ক্লিক করলে কল হয় — এটি ব্যবহারকারীর সরাসরি অ্যাকশন, তাই ব্যাকআপ না
  // পাওয়া গেলে/ব্যর্থ হলে স্পষ্ট বার্তা দেখানো হয়।
  async function handleManualDriveRestoreClick() {
    setShowImportOptionsModal(false);
    if (!isGoogleLinked()) {
      setShowGoogleAccountModal(true);
      return;
    }
    await findAndOfferDriveRestore(true);
  }
  async function handleConfirmDriveRestore() {
    if (!driveRestoreCandidate) return;
    setDriveRestoreBusy(true);
    try {
      await restoreFromGoogleDrive(driveRestoreCandidate.id, migrationState);
      window.alert("Google Drive থেকে ডেটা সফলভাবে রিস্টোর (মার্জ) করা হয়েছে।");
      window.location.reload();
    } catch (err) {
      alert("রিস্টোর করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setDriveRestoreBusy(false);
      setShowDriveRestoreModal(false);
    }
  }
  return { handleDriveBackupClick, handleBothBackupClick, findAndOfferDriveRestore, checkDriveBackupAfterLink, handleManualDriveRestoreClick, handleConfirmDriveRestore };
}
