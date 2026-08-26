// A4 G2 — Backup/Restore modal components, extracted verbatim from legacy App().
// Structural-only (Owner Rule 2): original show*/setShow* state becomes {show, onClose}
// props (DriveRestoreModal also takes 'candidate' for driveRestoreCandidate data). State
// ownership stays in App(); JSX body unchanged except for these renames.
import { DownloadIcon, Loader2, UploadIcon, X } from "./icons.jsx";

export function ArchiveModal({
  show,
  onClose,
  archiveMonth0,
  setArchiveMonth0,
  archiveYear,
  setArchiveYear,
  BN_MONTHS,
  toBn,
  handleGoToArchive
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm mb-1 text-slate-800"
  }, "আর্কাইভ দেখুন"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "যে মাস ও সালের ডেটা দেখতে চান তা বেছে নিন — সাথে সাথে সেই মাসের দৈনিক এন্ট্রি, মাসিক ওভারভিউ ও সভার তথ্য দেখা যাবে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("select", {
    value: archiveMonth0,
    onChange: e => setArchiveMonth0(parseInt(e.target.value, 10)),
    className: "flex-1 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white"
  }, BN_MONTHS.map((m, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, m))), /*#__PURE__*/React.createElement("select", {
    value: archiveYear,
    onChange: e => setArchiveYear(parseInt(e.target.value, 10)),
    className: "w-28 h-10 border border-slate-200 rounded-xl px-2 text-xs outline-none font-bold text-emerald-900 focus:border-emerald-800 bg-white"
  }, Array.from({
    length: 8
  }, (_, i) => new Date().getFullYear() - 6 + i).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, toBn(y))))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGoToArchive,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold"
  }, "দেখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
  }, "বাতিল"))));
}

export function BackupOptionsModal({
  show,
  onClose,
  driveBackupStatus,
  driveBackupBusy,
  handleDriveBackupClick,
  isGoogleLinked,
  handleExportData,
  handleBothBackupClick
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ডেটা ব্যাকআপ রাখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "কোথায় ব্যাকআপ রাখতে চান তা বেছে নিন।"), driveBackupStatus && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-3 " + (driveBackupStatus.type === "ok" ? "text-emerald-700" : "text-red-600")
  }, driveBackupStatus.text), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleDriveBackupClick,
    disabled: driveBackupBusy,
    className: "w-full h-11 rounded-xl text-left px-3 bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
  }, driveBackupBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), isGoogleLinked() ? "Google Drive-এ ব্যাকআপ রাখুন" : "Google Drive-এ ব্যাকআপ রাখুন (আগে সাইন ইন করতে হবে)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      handleExportData();
      onClose();
    },
    className: "w-full h-11 rounded-xl text-left px-3 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 14
  }), "আপনার ডিভাইসে ব্যাকআপ রাখুন"), /*#__PURE__*/React.createElement("button", {
    onClick: handleBothBackupClick,
    disabled: driveBackupBusy,
    className: "w-full h-11 rounded-xl text-left px-3 border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-2 disabled:opacity-60"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), "Google Drive ও আপনার ডিভাইস — উভয় জায়গায় ব্যাকআপ রাখুন")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 mt-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বন্ধ করুন")));
}

export function ImportOptionsModal({
  show,
  onClose,
  handleManualDriveRestoreClick,
  driveRestoreChecking,
  importFileInputRef
}) {
  return show && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 16,
    color: "var(--theme-primary)"
  }), " ইম্পোর্ট ব্যাকআপ ফাইল"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose()
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    className: "text-slate-400"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-3"
  }, "কোথা থেকে ইম্পোর্ট করতে চান তা বেছে নিন।"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleManualDriveRestoreClick,
    disabled: driveRestoreChecking,
    className: "w-full h-11 rounded-xl text-left px-3 bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
  }, driveRestoreChecking ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : /*#__PURE__*/React.createElement(DownloadIcon, {
    size: 14
  }), "Google Drive থেকে Restore করুন"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onClose();
      importFileInputRef.current && importFileInputRef.current.click();
    },
    className: "w-full h-11 rounded-xl text-left px-3 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50"
  }, /*#__PURE__*/React.createElement(UploadIcon, {
    size: 14
  }), "ডিভাইস থেকে ইম্পোর্ট করুন (.json)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    className: "w-full h-9 mt-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
  }, "বন্ধ করুন")));
}

export function DriveRestoreModal({
  show,
  candidate,
  onClose,
  driveRestoreBusy,
  handleConfirmDriveRestore
}) {
  return show && candidate && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "☁️"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-slate-800"
  }, "Google Drive-এ ব্যাকআপ পাওয়া গেছে")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-2"
  }, "ফ্যামিলি ইউজারনেম: ", /*#__PURE__*/React.createElement("b", null, (candidate.appProperties && candidate.appProperties.familyCode) || "অজানা"), candidate.modifiedTime ? " · সর্বশেষ পরিবর্তন: " + new Date(candidate.modifiedTime).toLocaleString("bn-BD") : ""), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 leading-relaxed mb-4"
  }, "এই ব্যাকআপ থেকে ডেটা রিস্টোর (মার্জ) করবেন? বর্তমান ডিভাইসের ডেটার সাথে merge হবে — কোনো ডেটা হারাবে না; দুই জায়গায় একই এন্ট্রি থাকলে যেটি বেশি সাম্প্রতিক (updatedAt) সেটি রাখা হবে।"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onClose(),
    disabled: driveRestoreBusy,
    className: "flex-1 h-9 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold disabled:opacity-50"
  }, "এখন না"), /*#__PURE__*/React.createElement("button", {
    onClick: handleConfirmDriveRestore,
    disabled: driveRestoreBusy,
    className: "flex-1 h-9 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
  }, driveRestoreBusy ? /*#__PURE__*/React.createElement(Loader2, {
    className: "animate-spin",
    size: 14
  }) : null, "রিস্টোর করুন"))));
}
