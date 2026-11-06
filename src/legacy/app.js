import { dbModular, authModular, authModular as auth, logAnalyticsEvent } from "./firebaseConfig.js";
import { GoogleAuthProvider, signOut, linkWithPopup, unlink, onAuthStateChanged } from "firebase/auth";
import { query, where, documentId, onSnapshot, doc, getDoc, setDoc, increment, collection, orderBy, limit } from "firebase/firestore";
import { useFonts, THEME_PRESETS, useThemeColor, DISPLAY_MODES, useDisplayMode, DEFAULT_DEEN_FIELDS, DEFAULT_DUNIYA_FIELDS, DEEN_CATEGORY_GROUPS, fieldApplies, isExcused, isFieldExcusable, toBn, BN_MONTHS, BN_WEEKDAYS, DAILY_INSPIRATIONS, pad2, dateKey, formatBnDateTime, isFutureDate, daysInMonth, isLastDayOfMonth, getHijriDate, dailyScore, scoreColor, fieldPercent, calculateStreak, getWeekRanges } from "./appHelpers.js";
import { isCreatorAuth, getFamilyCode, getFamilyId, ensureFamilyCodeMapping, familyDocRef, ensureFamilyMeta, ensureDataCollectionName, ensureLegacyCollectionMap, claimFirstAdminIfEligible, saveUserFamilyCode, syncFamilyCodeWithAccount, getCollectionName, appStorage, resolvePathContext, FAMILY_CODE_MIN_LENGTH, isGoogleLinked } from "./familyIdentity.js";
// §ProfileDropdownGoogle wiring(১১ সেপ্টেম্বর ২০২৬): নতুন Google-only
// Profile Dropdown("প্রোফাইল এডিট"/"পরিবার ত্যাগ করুন")-এর জন্য প্রয়োজনীয়
// দুটো action — এই আগে থেকেই লেখা(additive, অব্যবহৃত) ফাংশন এই প্রথম কোনো
// UI থেকে wire হচ্ছে।
import {
  editOwnProfile, leaveFamily, loadActiveInviteToken, removeLegacyInviteToken,
  startGoogleAccountChange
} from "./googleIdentity.js";
import { meetingKey, loadWeekly, migrateMembersIfNeeded, loadCustomFields, loadFieldOverrides, loadTazkirahCustom, loadEntry, saveEntry, pushEntryHistory, fetchEntryHistory, updateBestScoreIfNeeded, saveTomorrowFocus, saveCustomTasks } from "./memberData.js";
import { importBackupFromFile } from "./importBackup.js";
import { exportBackupToDevice } from "./exportBackup.js";
import { createDriveBackupActions } from "./driveBackupActions.js";
import { createFamilyActions } from "./familyActions.js";
import { createFeedbackAction } from "./feedbackAction.js";
import { createMeetingActions } from "./meetingActions.js";
import { createMemberActions } from "./memberActions.js";
import { createAdminActions } from "./adminActions.js";

// Feedback submission — powered by Web3Forms (no server/coding needed).
// 1. Go to https://web3forms.com and enter your email to get a free
//    "Access Key" (arrives instantly by email, no account required).
// 2. Paste that key below, replacing the placeholder text.
// Auto-update(fresh-load-only, one-time): controllerchange শুধু page-load-এর
// প্রথম ৮ সেকেন্ডের "arm window"-এ শোনা হয়(fresh-open-এ আগে থেকে pending
// update থাকলে সেটাই ধরার জন্য)। Window পার হলে listener remove — mid-session
// background SW update কখনো এই পথে reload trigger করবে না। `reloaded` flag
// দিয়ে one-time guard(reload-loop প্রতিরোধ)। প্রকৃত reload dt-sw-updated
// event dispatch করে App()-এর ভেতরের dirty-state-aware handler করে(নিচে)।
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      let reloaded = false;
      const ARM_MS = 8000;
      const onControllerChange = () => {
        if (reloaded) return;
        reloaded = true;
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        window.dispatchEvent(new CustomEvent("dt-sw-updated"));
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }, ARM_MS);
    }).catch(() => {});
  });
}

// --- PWA Install Tracking ---
// beforeinstallprompt fires when the browser is willing to show its own
// "Add to Home Screen" prompt — we don't build a custom install button here,
// just record that the prompt became available (analytics only).
window.addEventListener("beforeinstallprompt", () => {
  logAnalyticsEvent("pwa_install_prompt_shown");
});
// appinstalled fires once the user actually completes installation
// (regardless of whether it was via the browser's own prompt or an OS-level
// "Add to Home Screen" flow) — this is the actual install-count signal.
window.addEventListener("appinstalled", () => {
  logAnalyticsEvent("pwa_installed");
  setDoc(doc(dbModular, "app_stats", "pwa_installs"), {
    count: increment(1),
    lastInstalledAt: Date.now()
  }, {
    merge: true
  }).catch(() => {});
});
const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} = React;
import { Loader2, AppLogo } from "../components/icons.jsx";
import {
  MemberInfoModal,
  ExcuseInfoModal,
  WeeklyInfoModal,
  MeetingInfoModal,
  MonthlyOverviewInfoModal,
  CoachMarkModal
} from "../components/InfoModals.jsx";
import { HistoryModal } from "../components/HistoryModal.jsx";
import { CreateNewFamilyModal, FamilyCodeChoiceModal, JoinFamilyModal, RenameFamilyCodeModal } from "../components/FamilyManagement.jsx";
// §Lazy-load(নতুন, ২১ সেপ্টেম্বর ২০২৬, বিদ্যমান PrintReport/Public-Tools lazy
// pattern reuse): এই ৪টা মোডাল সবসময় mount থাকে(শুধু `show` prop visibility
// নিয়ন্ত্রণ করে), তাই static import থাকলে প্রতিটা boot-এ parse হতো যদিও
// বেশিরভাগ session-এ কখনো খোলা হয় না। এখন React.lazy()+ব্যবহারের জায়গায়
// React.Suspense(fallback: null, কারণ show=false-এ এমনিতেও কিছু render হয়
// না) দিয়ে আলাদা chunk-এ সরানো হলো — কোনো logic/condition/prop অপরিবর্তিত।
const ArchiveModal = React.lazy(() => import("../components/BackupRestore.jsx").then(m => ({ default: m.ArchiveModal })));
const BackupOptionsModal = React.lazy(() => import("../components/BackupRestore.jsx").then(m => ({ default: m.BackupOptionsModal })));
const DriveRestoreModal = React.lazy(() => import("../components/BackupRestore.jsx").then(m => ({ default: m.DriveRestoreModal })));
const ImportOptionsModal = React.lazy(() => import("../components/BackupRestore.jsx").then(m => ({ default: m.ImportOptionsModal })));
import { DashboardHeader } from "../components/DashboardHeader.jsx";
// §Part B §B৫(Lazy-load, 2_5 Part B §B৫, ১৫ সেপ্টেম্বর ২০২৬): `PrintReport`
// শুধু `printMode` true হলেই render হয়(নিচে), কিন্তু আগে static import ছিল
// বলে প্রতিটা normal home-tab load-এ অপ্রয়োজনে bundle হতো। এখন React.lazy()
// দিয়ে আলাদা chunk(existing `3_2` §২.১-এর lazy-load pattern reuse, নতুন
// convention না) — named-export বলে `.then(m => ({default: m.PrintReport}))`
// wrapper লাগে। ব্যবহারের জায়গায়(নিচে, printMode-branch) React.Suspense-এ
// wrap করা হয়েছে।
const PrintReport = React.lazy(() => import("../components/PrintReport.jsx").then(m => ({ default: m.PrintReport })));
import { WeeklyReviewSection } from "../components/WeeklyReviewSection.jsx";
import { GoogleRelinkGate } from "../components/GoogleRelinkGate.jsx";
import { MonthlyReportSection } from "../components/MonthlyReportSection.jsx";
import { TrendReviewSection } from "../components/TrendReviewSection.jsx";
import { SwipeMonth } from "../components/SwipeMonth.jsx";
import { shiftMonthCursor } from "./swipeMonth.js";
import { useCursorEntries } from "./useCursorEntries.js";
import { fetchDesign, saveDesignPart } from "./appDesign.js";
import { monthStatsOf, weekSummaryOf, yesterdayEntryOf, yesterdayMissingOf } from "./homeStats.js";
const STATS_H = { dateKey, pad2, dailyScore, daysInMonth };
const NO_DIRTY = { current: false };
import { MonthlyOverviewSection, MeetingMinutesSection, DeleteAccountWarningModal, FeedbackModal, MilestoneToast, WeeklySummaryToast, StreakCard, TopBottomActivityRanking } from "../components/DashboardSections.jsx";
import { DailyEntrySection } from "../components/DailyEntrySection.jsx";
// §Motivational Layer — Phase 1(নতুন, owner-approved plan): "আজকের বিশেষ দিক"
// rotating card। selectDailyInsight() pure-compute(কোনো নতুন Firestore read/
// schema লাগেনি, existing monthEntries/streak reuse) — বিস্তারিত dailyInsight.js।
import { selectDailyInsight, suggestTomorrowFocus } from "./dailyInsight.js";
import { DailyInsightCard } from "../components/DailyInsightCard.jsx";
// §Motivational Layer — Phase 2(নতুন, owner-approved): "আগামীকালের Focus"
// — DailyInsightCard থেকে ইচ্ছাকৃতভাবে আলাদা component(isolated rollback)।
import { TomorrowFocusPicker } from "../components/TomorrowFocusPicker.jsx";
import { TomorrowPreviewCard } from "../components/TomorrowPreviewCard.jsx";
import { GoogleAccountModal } from "../components/GoogleAccountModal.jsx";
// §Guest-mode Sign-in popover(2_4 §২)ও Invite-Link Join(§৫.২)-এ reuse হয়।
import { GoogleSignInGate } from "../components/GoogleSignInGate.jsx";
import { InviteJoinGate } from "../components/InviteJoinGate.jsx";
// §Bottom Navigation(2_4 §৯) — routing shell, additive, existing gate-logic অপরিবর্তিত।
import { BottomNav } from "../components/BottomNav.jsx";
import { PublicToolsPlaceholder } from "../components/PublicToolsPlaceholder.jsx";
// §Menu full-page tab(2_4 §৯.৫/2_5 Screen E.1, ১৫ সেপ্টেম্বর ২০২৬): আগে
// DashboardHeader.jsx-এর হ্যামবার্গার dropdown ছিল, এখন bottom-nav "মেনু"
// ট্যাব(TAB_SETTINGS)-এর ভিতরে full-page হিসেবে render হয়।
// §Lazy-load(নতুন, ২১ সেপ্টেম্বর ২০২৬, একই pattern): TAB_SETTINGS-এ ট্যাপ না
// করলে এই chunk লোড হবে না।
import { renderHomeBelow } from "../components/HomeFold.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { sanitizeOverrides, applyOverrides } from "./fieldOverrides.js";
import { sanitizeTazkirah, pickInspiration } from "./tazkirah.js";
const TazkirahManagerScreen = React.lazy(() => import("../components/TazkirahManagerScreen.jsx").then(m => ({ default: m.TazkirahManagerScreen })));
const FieldManagerScreen = React.lazy(() => import("../components/FieldManagerScreen.jsx").then(m => ({ default: m.FieldManagerScreen })));
import { taskFields } from "./customTasks.js";
const TabLayoutScreen = React.lazy(() => import("../components/TabLayoutScreen.jsx").then(m => ({ default: m.TabLayoutScreen })));
const HomeLayoutScreen = React.lazy(() => import("../components/HomeLayoutScreen.jsx").then(m => ({ default: m.HomeLayoutScreen })));
const PopupMessagesScreen = React.lazy(() => import("../components/PopupMessagesScreen.jsx").then(m => ({ default: m.PopupMessagesScreen })));
const MenuPage = React.lazy(() => import("../components/MenuPage.jsx").then(m => ({ default: m.MenuPage })));
import { TAB_FAMILY, TAB_PRAYER_TIMES, TAB_AMOL, TAB_TOOLS, TAB_SETTINGS, ACTIVE_TAB_STORAGE_KEY } from "./tabs.js";
import { useBackLayer } from "./backNav.js";
// §Public Tools Phase A, item ২(3_1/3_2 §৪, ১৮ সেপ্টেম্বর ২০২৬): "সময়সূচি" ট্যাব —
// PublicToolsPlaceholder প্রতিস্থাপন করে actual component বসানো হলো(3_2 §১-এর নীতি
// অনুযায়ী শুধু import বদল, routing-switch touch হয়নি)। lazy-load(3_2 §২.১ standing
// rule, PrintReport-এর একই pattern reuse) — prayerTimes ট্যাপ না করলে chunk লোড হবে না।
const PrayerTimes = React.lazy(() => import("../components/PublicTools/PrayerTimes.jsx").then(m => ({ default: m.PrayerTimes })));
// §Public Tools Phase A, item ৩/৫ক(3_1 §"আমল হাব", ১৮ সেপ্টেম্বর ২০২৬): "আমল" ট্যাব —
// PublicToolsPlaceholder প্রতিস্থাপন করে actual hub component(তাসবীহ inline + বাকি
// ৭ item "শীঘ্রই আসছে" sub-screen, content pending) বসানো হলো, একই lazy pattern।
const AmolHub = React.lazy(() => import("../components/PublicTools/AmolHub.jsx").then(m => ({ default: m.AmolHub })));
// §Public Tools Phase A, item ৫(3_1/3_2 §২.২, ১৮ সেপ্টেম্বর ২০২৬): "সহায়িকা" ট্যাব —
// PublicToolsPlaceholder প্রতিস্থাপন করে ৬-ক্যাটাগরি shell বসানো হলো, একই lazy pattern।
const PublicToolsShell = React.lazy(() => import("../components/PublicTools/PublicToolsShell.jsx").then(m => ({ default: m.PublicToolsShell })));
// boot-loading gate(নিচে, `members === null || migrationState === undefined`)
// আগে শুধু center-spinner দেখাত(blank-screen)। এই pure-presentational, props/
// state-বিহীন helper সেই একই gate-এ card-shape gray-skeleton দেখায়(header-bar
// + date-nav-bar + তাযকিরাহ-কার্ড + accordion-এর ৪টা category-card outline,
// প্রথমটা খোলা-সদৃশ লম্বা, বাকি ৩টা বন্ধ-সদৃশ ছোট) — existing design-token
// (rounded-2xl/shadow-sm/border-color, 2_5 Part B §B২.১) ও Tailwind
// `animate-pulse` reuse করে, কোনো নতুন library/state/Firestore-call নেই।
function DashboardSkeleton() {
  const pulseBox = (extraClass) => /*#__PURE__*/React.createElement("div", {
    className: "animate-pulse bg-[#E4E7E2] rounded-2xl " + extraClass
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen pb-20 bg-[#F4F7F1] px-4 pt-4 space-y-4"
  },
    pulseBox("h-14"),
    pulseBox("h-12"),
    pulseBox("h-16"),
    pulseBox("h-40"),
    pulseBox("h-10"),
    pulseBox("h-10"),
    pulseBox("h-10")
  );
}

function App() {
  useFonts();
  // §Guest-mode Dashboard(১২ সেপ্টেম্বর ২০২৬, owner-approved) — App() এখন
  // authenticated member এবং non-member উভয়ের জন্যই একই component/UI —
  // কোনো আলাদা "landing page" নেই। auth.currentUser না থাকলে, অথবা থাকলেও
  // localStorage-এ family_id/family_code(hasExistingSession-এর পুরনো একই
  // শর্ত) না থাকলে — guest ধরা হয়। এই একটা flag-ই বাকি সব guard নিয়ন্ত্রণ
  // করে। auth.currentUser/localStorage কোনোটাই এই component mount-এর
  // ভিতরে বদলায় না(সফল sign-in হলে সবসময় reload হয়, নিচের
  // handleGuestSignInSuccess() দ্রষ্টব্য) — তাই plain const হিসেবে প্রতি
  // render-এ recompute করা নিরাপদ, আলাদা state লাগে না।
  const isGuestMode = !auth.currentUser || !(localStorage.getItem("family_id") && localStorage.getItem("family_code"));
  // §Bottom Navigation(2_4 §৯.২) — App()-এর নতুন top-level routing state।
  // sessionStorage-persisted(browser-session বন্ধ হলে ডিফল্ট "family"-এ ফিরবে)।
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || TAB_FAMILY; } catch { return TAB_FAMILY; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab); } catch {}
  }, [activeTab]);
  // ব্যাক বাটন: হোম ছাড়া যেকোনো ট্যাব থেকে ব্যাক = হোমে ফেরা(হোমে ব্যাক = আগের মতো এক্সিট)।
  useBackLayer(activeTab !== TAB_FAMILY, () => setActiveTab(TAB_FAMILY));
  // নেভ-লোডিং: অন্য ট্যাবের ফাইল অবসর সময়ে আগেভাগে নামানো(Data Saver চালু থাকলে নয়)।
  // একই import() path হওয়ায় React.lazy একই chunk পায়; ব্যর্থ হলে চুপচাপ বাদ।
  useEffect(() => {
    try { if (navigator.connection && navigator.connection.saveData) return undefined; } catch {}
    const run = () => {
      [
        () => import("../components/PublicTools/PrayerTimes.jsx"),
        () => import("../components/PublicTools/AmolHub.jsx"),
        () => import("../components/PublicTools/PublicToolsShell.jsx"),
        () => import("../components/MenuPage.jsx")
      ].forEach(load => { try { load().catch(() => {}); } catch {} });
    };
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(run, { timeout: 5000 });
      return () => window.cancelIdleCallback && window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, 3000);
    return () => clearTimeout(t);
  }, []);
  const [themeColor, setThemeColor] = useThemeColor();
  const [displayMode, setDisplayMode] = useDisplayMode();
  // §B৭ Onboarding coach-mark(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬, owner-approved):
  // authenticated(non-guest) সদস্যের প্রথম Dashboard-load-এ একবারই ৪-ধাপ
  // walkthrough — existing one-time-flag pattern(localStorage, uid-keyed,
  // V1 ফাইল ১.২ §৩-এর dt_google_welcome_shown_<uid>-এর মতোই)। Guest-mode-এ
  // কখনো trigger হয় না(demo-shell-এ walkthrough অপ্রাসঙ্গিক)।
  const [showCoachMark, setShowCoachMark] = useState(false);
  useEffect(() => {
    if (isGuestMode || !auth.currentUser) return;
    const flagKey = "dt_coachmark_shown_" + auth.currentUser.uid;
    try {
      if (!localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, "1");
        setShowCoachMark(true);
      }
    } catch {}
  }, [isGuestMode]);
  // §Guest-mode fix: guest অবস্থায় boot-loader effect(নিচে) কখনো চলে না,
  // তাই members কখনো populate হবে না — null থাকলে যেকোনো .map()/.find()
  // যেখানে `|| []` fallback নেই সেখানে crash করতে পারে। শুধু guest-এই
  // ডিফল্ট []-এ পরিবর্তন(authenticated member-দের loading-state UX(null =
  // "এখনো লোড হচ্ছে") সম্পূর্ণ অপরিবর্তিত)।
  const [members, setMembers] = useState(isGuestMode ? [] : null);
  const [showGuestSignIn, setShowGuestSignIn] = useState(false);
  // Switch prep (Step 1): families/<familyId>.migrationState-এর লাইভ
  // অবস্থা। undefined = "এখনো জানা যায়নি" (fail-closed) — "legacy" ধরে
  // নেওয়া হয় না যতক্ষণ না সার্ভার থেকে প্রকৃত মান (বা নিশ্চিত absence)
  // পাওয়া যায়। এই মুহূর্তে কোনো caller এই state ব্যবহার করছে না
  // (unwired), শুধু loading-gate-কে প্রভাবিত করে।
  // §Guest-mode fix(১২ সেপ্টেম্বর ২০২৬, বাগ-ফিক্স): boot-loader effect
  // guest-এ skip হয় বলে migrationState কখনো set হতো না(চিরস্থায়ী
  // `undefined` থেকে যেত) — নিচের loading-gate(`migrationState ===
  // undefined`) তাই কখনো pass করতো না, ফলে logout-এর পর অনন্ত spinner
  // (owner-রিপোর্টেড বাগ)। guest-এ শুধু placeholder মান("v2", কোনো real
  // family-কে প্রভাবিত করে না, শুধু guest-এর নিজের local render-এ ব্যবহৃত)।
  const [migrationState, setMigrationState] = useState(isGuestMode ? "v2" : undefined);
  // Access Approval Gate — Step 4: বর্তমান ব্যবহারকারী এই family-র admin
  // কিনা (existing migFamSnap boot-fetch থেকেই সেট হয়, কোনো extra read
  // যোগ করা হয়নি)। null = এখনো জানা যায়নি।
  const [isAdmin, setIsAdmin] = useState(null);
  // Admin Visibility UI — বর্তমান family-র adminUids array (একই boot
  // fetch থেকে সেট, কোনো extra read না)। badge/Make-Admin/Remove-Admin
  // বাটন দেখানোর জন্য প্রয়োজন।
  const [adminUidsList, setAdminUidsList] = useState([]);
  // §First Admin Protection — বর্তমান family-র firstAdminUid(একই boot
  // fetch থেকে সেট, extra read নেই)। null/undefined মানে পুরনো family
  // যেখানে backfill হয়নি — সেক্ষেত্রে protection স্বয়ংক্রিয়ভাবে বাইপাস হয়।
  const [firstAdminUid, setFirstAdminUid] = useState(null);
  // §Notification System(২৩ আগস্ট ২০২৬ সংশোধন) — read+unread উভয় notification
  // live-updated(boot-এ onSnapshot দিয়ে) ও panel খোলা আছে কিনা। আগে শুধু
  // unread(read==false) filter করা হতো, ফলে "seen" করলেই item panel থেকে
  // হারিয়ে যেত(bug)। এখন পুরো list রাখা হয়, শুধু delete/Clear-all দিয়েই
  // item সরে; badge/unread-count আলাদাভাবে notifications.filter(!read) থেকে
  // derive করা হয়।
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  // §Recovery Key — first-admin claim-এর ঠিক পরে key দেখানোর modal, ও
  // [সরানো, Member Key সেশন] showRecoveryKeyModal/generatedRecoveryKey/
  // showRecoveryClaim/recoveryKeyInput/recoveryClaimBusy — Admin Recovery
  // Key UI toggle-গুলো বাদ দেওয়া হয়েছে(নিচে §Member Key state দেখুন)।
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  // §Old-code cleanup Phase 4(১৫ সেপ্টেম্বর ২০২৬, owner-approved, "সব ক্লিন"):
  // পুরনো Onboarding Gate সিস্টেমের বাকি অংশ সম্পূর্ণ সরানো হলো — showClaimKeyModal/
  // claimKeyTarget/showBecomeMemberModal/myMemberRequestStatus/myMemberRequestKey/
  // myMemberRequestChecked/onbFlow/onbStep/onbAdvance() ও এই সব state ব্যবহারকারী
  // OnboardingBridge.jsx(delete করা হয়েছে)। এগুলো নিশ্চিতভাবে dead ছিল: এই
  // state-গুলো যেই component(পুরনো Onboarding.jsx) সেট করত সেটা আগেই delete
  // হয়ে গিয়েছিল(Phase 3), ফলে sessionStorage flag কখনো লেখা হতো না ও
  // needsOwnMemberProfile(zero-member admin edge-case)-এর জন্য ব্যবহৃত
  // OnboardingBridge-এর "addMember" step আসলে পুরনো ownerUids+Member Password
  // (createMemberWithKey()) সিস্টেম ব্যবহার করত — google-only architecture-এর
  // সাথে সাংঘর্ষিক, এবং createNewFamilyGoogleOnly() family-creation-এর একই
  // ধাপে admin-এর নিজের googleUid-member তৈরি করে ফেলে বলে এই edge-case আর
  // structurally ঘটতেই পারে না। Google Sign-in login flow(GoogleSignInGate)
  // ও memberRequests/{uid}.presetKey approval-flow — এই দুটো সম্পূর্ণ ভিন্ন,
  // অক্ষুণ্ণ সিস্টেম, এখানে touch হয়নি।
  // §Old-code cleanup Phase 2(১১ সেপ্টেম্বর ২০২৬, owner-approved):
  // showMemberRequestsModal/pendingMemberRequests/loadingMemberRequests state
  // সরানো হয়েছে — এই admin-review প্যানেল(ও MemberListSection-এর ভিতরের
  // inline Approve/Reject) Rules-level এখন google-only উভয় real family-তেই
  // ব্যবহারযোগ্য না(Approve → createMemberWithKey() → private/key create,
  // isGoogleOnly() guard দিয়ে blocked)।
  // pending = নিজের accessRequest এখনো admin-approval-এর অপেক্ষায়;
  // null = জানা যায়নি বা প্রযোজ্য না (admin/approved/legacy path)।
  const [accessPending, setAccessPending] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("male");
  // §Add-Member fix(১১ সেপ্টেম্বর ২০২৬) — google-only model-এ নতুন সদস্যের
  // email আবশ্যক(2_4 §৫.১ proxy-member pattern, নিচে handleAddMember())।
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [fieldOverrides, setFieldOverrides] = useState({});
  // গ্লোবাল অ্যাপ ডিজাইন(ক্রিয়েটরের সাজানো, সবার জন্য এক) — null = ডিফল্ট/ফলব্যাক
  const [design, setDesign] = useState(null);
  const [showFieldManager, setShowFieldManager] = useState(false);
  const [showTazkirah, setShowTazkirah] = useState(false);
  const [showPopupMsgs, setShowPopupMsgs] = useState(false);
  const [tazkirahData, setTazkirahData] = useState(() => sanitizeTazkirah(null));
  const [viewDate, setViewDate] = useState(new Date());
  const [entry, setEntry] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month0: d.getMonth()
    };
  });
  // §আলাদা মাস-কার্সর(owner-approved): সাপ্তাহিক+মাসিক মুহাসাবা একসাথে(reviewCursor), ট্রেন্ড ও সভা প্রত্যেকে নিজের।
  // ওভারভিউ ও দৈনিক এন্ট্রি/প্রিন্ট মূল monthCursor-এ। শুরুতে সবাই চলতি মাসে।
  const [reviewCursor, setReviewCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const [trendCursor, setTrendCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const [meetingCursor, setMeetingCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month0: d.getMonth() }; });
  const [monthEntries, setMonthEntries] = useState({});
  const [monthRefreshKey, setMonthRefreshKey] = useState(0);
  const [printMode, setPrintMode] = useState(false);
  const [weekly, setWeekly] = useState({});
  const [weeklyRowCount, setWeeklyRowCount] = useState(1);
  const [meetingState, setMeetingState] = useState({
    rows: [{
      id: "1",
      topic: "",
      decision: "",
      person: ""
    }]
  });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingSavedTick, setMeetingSavedTick] = useState(false);
  // H-1 fix: tracks whether meetingState has local, unsaved edits. While
  // true, the live onSnapshot listener below skips applying incoming data,
  // so another device's save can't silently overwrite in-progress typing.
  const meetingDirtyRef = useRef(false);
  // H-3 fix: track unsaved edits in the day entry and weekly reflection so
  // navigating away (date/month/member change) can warn before silently
  // discarding them — mirrors the existing meetingDirtyRef pattern.
  const entryDirtyRef = useRef(false);
  const weeklyDirtyRef = useRef(false);
  // সোয়াইপে মাস বদল (মাসিক ওভারভিউ/মাসিক মুহাসাবা/সাপ্তাহিক মুহাসাবা/পারিবারিক সভা) — ◀ ▶ বাটনের হুবহু একই dirty-confirm।
  // সোয়াইপ-পরবর্তী ছোট টোস্টে দেখানোর মাসের নাম(দৃশ্যমান ফিডব্যাক — ভাঁজ-বন্ধ কার্ডেও মাস বদল বোঝা যায়)
  const swipeMonthLabel = (c) => BN_MONTHS[c.month0] + " " + toBn(c.year);
  const swipeShiftMonth = (delta) => {
    if (weeklyDirtyRef.current && !window.confirm("সাপ্তাহিক রিফ্লেকশনে সেভ না করা পরিবর্তন আছে। মাস পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
    setMonthCursor((c) => shiftMonthCursor(c, delta));
  };
  const reviewShiftMonth = (delta) => setReviewCursor((c) => shiftMonthCursor(c, delta));
  const trendShiftMonth = (delta) => setTrendCursor((c) => shiftMonthCursor(c, delta));
  const meetingShiftMonth = (delta) => {
    if (meetingDirtyRef.current && !window.confirm("মাসিক সভায় সেভ না করা পরিবর্তন আছে। মাস পরিবর্তন করলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
    setMeetingCursor((c) => shiftMonthCursor(c, delta));
  };
  // Auto-update reload(fresh-load-only, dt-sw-updated event — dispatch হয়
  // top-level SW-registration কোড থেকে, দেখুন ফাইলের শুরুর দিকে)। Unsaved
  // entry/weekly/meeting থাকলে reload skip করা হয়(data-loss এড়াতে); পরের
  // স্বাভাবিক নেভিগেশন/reload-এ আপডেট এমনিতেই প্রযোজ্য হয়ে যাবে।
  useEffect(() => {
    const handler = () => {
      const hasUnsaved = entryDirtyRef.current || weeklyDirtyRef.current || meetingDirtyRef.current;
      if (hasUnsaved) return;
      window.location.reload();
    };
    window.addEventListener("dt-sw-updated", handler);
    return () => window.removeEventListener("dt-sw-updated", handler);
  }, []);
  // §খসড়া ও ভুলে-বেরিয়ে-যাওয়া সতর্কতা(owner-approved): সেভ-না-করা এন্ট্রি ফোনে(localStorage) খসড়া হিসেবে রাখা হয়;
  // সেভ হলে মুছে যায়। অ্যাপ বন্ধ করতে গেলে(ব্রাউজার সমর্থন করলে) সতর্ক করে। শুধু স্থানীয়, Firestore-এ কিছু লেখে না।
  function draftStorageKey(memberId, dk) {
    return "dt_draft_" + getFamilyCode() + "_" + memberId + "_" + dk;
  }
  useEffect(() => {
    if (!entryDirtyRef.current || !selectedId) return;
    try {
      localStorage.setItem(draftStorageKey(selectedId, dateKey(viewDate)), JSON.stringify({ ts: Date.now(), entry }));
    } catch (e) {}
  }, [entry]);
  useEffect(() => {
    const onBeforeUnload = e => {
      if (!entryDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHomeLayout, setShowHomeLayout] = useState(false);
  const [showPrayerLayout, setShowPrayerLayout] = useState(false);
  const [showAmolLayout, setShowAmolLayout] = useState(false);
  const [showToolsLayout, setShowToolsLayout] = useState(false);
  // পুরনো "কাস্টম ফ্যামিলি কোড সেট করুন" মোডাল (showFamilyCodeModal,
  // legacy dual-purpose setFamilyCode() ভিত্তিক) সরিয়ে এখন একটি একক
  // EditIcon → দুই-অপশনের choice পপআপে merge করা হয়েছে (নিচে দেখুন)।
  const [showFamilyCodeChoiceModal, setShowFamilyCodeChoiceModal] = useState(false);
  const [showCreateNewFamilyModal, setShowCreateNewFamilyModal] = useState(false);
  const [newFamCodeInput, setNewFamCodeInput] = useState("");
  const [newFamCodeBusy, setNewFamCodeBusy] = useState(false);
  const [showJoinFamilyModal, setShowJoinFamilyModal] = useState(false);
  const [joinFamCodeInput, setJoinFamCodeInput] = useState("");
  const [joinFamCodeBusy, setJoinFamCodeBusy] = useState(false);
  // §Old-code cleanup Phase 2(১১ সেপ্টেম্বর ২০২৬, owner-approved): Access
  // Approval Gate-এর admin-review panel state সরানো হয়েছে — grep-verify
  // করে নিশ্চিত হয়েছে এই cluster-এর কোনো live trigger কোনো component-এ কখনো
  // ছিল না(১_৩ ফাইলে আগে থেকেই "unreachable UI" হিসেবে flagged ছিল)।
  const [showGoogleAccountModal, setShowGoogleAccountModal] = useState(false);
  // §Old-code cleanup Phase 4(১৫ সেপ্টেম্বর ২০২৬): showApprovedGoogleWelcome
  // (myMemberRequestStatus-নির্ভর "approved-member Google welcome" popup) ও
  // সংশ্লিষ্ট effect/dismiss-function সরানো হয়েছে — memberRequests-approval
  // flow নিজেই google-only architecture-এ dead(নিচে দ্রষ্টব্য)।
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showBackupOptionsModal, setShowBackupOptionsModal] = useState(false);
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [driveBackupBusy, setDriveBackupBusy] = useState(false);
  const [driveBackupStatus, setDriveBackupStatus] = useState(null); // {type: "ok"|"error", text}
  const [showDriveRestoreModal, setShowDriveRestoreModal] = useState(false);
  const [driveRestoreCandidate, setDriveRestoreCandidate] = useState(null); // Drive file metadata
  const [driveRestoreBusy, setDriveRestoreBusy] = useState(false);
  const [driveRestoreChecking, setDriveRestoreChecking] = useState(false);
  const [showDeleteAccountWarning, setShowDeleteAccountWarning] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveYear, setArchiveYear] = useState(() => new Date().getFullYear());
  const [archiveMonth0, setArchiveMonth0] = useState(() => new Date().getMonth());
  const [showMemberInfoModal, setShowMemberInfoModal] = useState(false);
  const [showExcuseInfoModal, setShowExcuseInfoModal] = useState(false);
  const [showWeeklyInfoModal, setShowWeeklyInfoModal] = useState(false);
  const [showMeetingInfoModal, setShowMeetingInfoModal] = useState(false);
  const [showMonthlyInfoModal, setShowMonthlyInfoModal] = useState(false);
  // §৫ Family Code Lifecycle Fix — Admin-only "কোড রিনেম" মোডাল (একই
  // familyId+data, শুধু কোড বদলায়) — বিদ্যমান "কাস্টম কোড" মোডাল থেকে
  // ইচ্ছাকৃতভাবে আলাদা রাখা হয়েছে যাতে ভুলবশত ডাটা-বিচ্ছিন্নতা না ঘটে।
  const [showRenameFamilyCodeModal, setShowRenameFamilyCodeModal] = useState(false);
  const [renameFamCodeInput, setRenameFamCodeInput] = useState("");
  const [renameFamCodeBusy, setRenameFamCodeBusy] = useState(false);
  const [showRenameChangeForm, setShowRenameChangeForm] = useState(false);
  const [renameConfirmInput, setRenameConfirmInput] = useState("");
  const [renameCodeRevealed, setRenameCodeRevealed] = useState(false);
  // Family Code auto-propagate + notify: Admin কোড পরিবর্তন করলে বাকি
  // সদস্যদের ডিভাইসে পরের বুটেই (families/{id} listener থেকে) নতুন কোড
  // অটো বসে যায় ও রিলোডের পর একবার এই নোটিশ ব্যানার দেখানো হয় —
  // localStorage flag দিয়ে "একবারই দেখানো" নিশ্চিত করা হয়েছে।
  const [codeChangeNotice, setCodeChangeNotice] = useState(() => {
    try {
      const v = localStorage.getItem("family_code_change_notice");
      if (v) {
        localStorage.removeItem("family_code_change_notice");
        return v;
      }
    } catch {}
    return null;
  });
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // null | "sent" | "error"
  const [copiedCode, setCopiedCode] = useState(false);
  // §Public Invite-Link(নতুন, 2_4 §৫.২): family root doc-এর activeInviteToken
  // field local state-এ mirror করা(existing family-doc fetch/listener থেকে,
  // নিচে দেখুন — কোনো নতুন read লাগেনি)। null = কখনো generate হয়নি।
  const [activeInviteToken, setActiveInviteToken] = useState(null);
  // §Security-fix: invite token শুধু admin পড়তে পারে(families/{id}/inviteLinks/active)।
  useEffect(() => {
    if (isAdmin !== true || isGuestMode) return;
    let cancelled = false;
    loadActiveInviteToken(getFamilyId()).then(t => { if (!cancelled) setActiveInviteToken(t); });
    return () => { cancelled = true; };
  }, [isAdmin]);
  const originalEntryRef = useRef(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const touchStartXRef = useRef(null);
  const importFileInputRef = useRef(null);
  function handleDateTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX;
  }
  function handleDateTouchEnd(e) {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < 40) return; // ignore small taps/scrolls
    if (entryDirtyRef.current && !window.confirm("এই দিনের এন্ট্রিতে সেভ না করা পরিবর্তন আছে। এগিয়ে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
    setViewDate(d => {
      const n = new Date(d);
      n.setDate(n.getDate() + (deltaX < 0 ? 1 : -1));
      return n;
    });
  }
  useEffect(() => {
    // §Guest-mode fix(১২ সেপ্টেম্বর ২০২৬): guest অবস্থায় family/member/
    // notification কোনো Firestore read/listener-ই শুরু হবে না(2_5 Screen
    // 0-এর "zero Firestore call" নীতি অনুযায়ী) — permission-denied fallback
    // ভরসা না করে সরাসরি skip করা হচ্ছে।
    if (isGuestMode) return;
    let migrationUnsub = null;
    let notifUnsub = null;
    (async () => {
      // Google sign-in বা family code — যেটাই আগে পাওয়া যায়, সেই অনুযায়ী
      // একই family/profile/records auto-load হওয়া নিশ্চিত করতে, member
      // লোড করার আগেই (Google-linked থাকলে) account-এর সংরক্ষিত family
      // code দিয়ে local code sync করে নেওয়া হচ্ছে।
      await syncFamilyCodeWithAccount();
      // Switch prep (Step 1): migrationState listener attach করার আগে
      // ensureFamilyCodeMapping() await করা হচ্ছে (Performance Audit fix,
      // ২২ আগস্ট ২০২৬: আগে এখানে একটি non-blocking fire-and-forget কলও
      // ছিল — সেটি awaited না হওয়ায় কোনো real ordering guarantee দিত না,
      // শুধু প্রতি boot-এ একটি অতিরিক্ত duplicate familyCodes read যোগ
      // করছিল, তাই সরানো হয়েছে) — কারণ local family_id boot-এর প্রথম
      // মুহূর্তে server-এর সাথে out-of-sync/stale থাকতে পারে (self-heal
      // সম্পন্ন না হওয়া পর্যন্ত)। getFamilyId() এখানে কল করার আগে সেই
      // self-heal সম্পন্ন হয়েছে কিনা নিশ্চিত করতে এই awaited কলটি প্রয়োজন।
      await ensureFamilyCodeMapping();
      // §Performance Fix(২২ আগস্ট ২০২৬, Finding #2 ধাপ ১) — families/{id}
      // এখন এখানে একবারই fetch হয়(self-heal-পরবর্তী, সঠিক familyId দিয়ে);
      // আগের redundant non-awaited "Phase A prep" fire-and-forget কলটি
      // (self-heal-এর *আগে* ফায়ার হতো, ভুল/stale familyId-এর ঝুঁকি ছিল)
      // সম্পূর্ণ সরানো হয়েছে — নিচের awaited ensureFamilyMeta() একই কাজ
      // idempotent-ভাবে করে, তাই কোনো functional পরিবর্তন নেই। এই একটিমাত্র
      // read-এর state ensureFamilyMeta→ensureDataCollectionName→
      // claimFirstAdminIfEligible — তিনটিতেই thread হয় (প্রতিটি write-এর
      // পর in-memory state আপডেট হয়ে পরের ধাপে যায়), ফলে এই চেইনে আগে
      // ৫টা আলাদা `.get()` লাগত, এখন ১টা।
      const initialFamSnap = await getDoc(familyDocRef());
      let famState = { exists: initialFamSnap.exists(), data: initialFamSnap.exists() ? initialFamSnap.data() : null };
      // §৫ fix: familyId self-heal সম্পন্ন হওয়ার পরই family doc নিশ্চিত
      // (idempotent — আগে থেকে থাকলে no-op) ও dataCollectionName cache
      // পূরণ করা হচ্ছে — এর পরের যেকোনো read/write (migrateMembersIfNeeded
      // থেকে শুরু করে) getCollectionName()-এর সঠিক, familyCode-independent
      // মান পাবে।
      famState = await ensureFamilyMeta(famState);
      famState = await ensureDataCollectionName(famState);
      // Legacy read-rule gate fix: ব্র্যান্ড-নতুন/একা (auto-generated,
      // adminUids:[]) family-তে আগে শুধু "custom code সেট" বা "Google
      // link" trigger-এ admin claim হতো — legacy read-gate deploy হওয়ার
      // পর এই দুই trigger না ঘটা পর্যন্ত এমন family নিজেই নিজের data পড়তে
      // পারছিল না (isApprovedMember()-এ admin/approved কেউ ছিল না)।
      // এখানে boot-এই (idempotent, awaited) claim করে এই gap বন্ধ করা
      // হলো — বিদ্যমান শেয়ার্ড family-তে (adminUids ইতিমধ্যে অ-খালি)
      // কোনো প্রভাব নেই (ফাংশন internally no-op করে), Rules-এর
      // "প্রথম-আসা" নিয়ম অপরিবর্তিত।
      await claimFirstAdminIfEligible(famState);
      // [সরানো, Member Key সেশন] Recovery Key modal trigger বাদ।
      // Legacy read-rule gate prep — non-blocking, best-effort; dataCollectionName
      // cache পূরণ হওয়ার পরই কল করা হচ্ছে (getCollectionName()-এর সঠিক মান
      // দরকার), কিন্তু boot এর জন্য অপেক্ষা করে না।
      ensureLegacyCollectionMap();
      const migrationFamilyId = getFamilyId();
      migrationUnsub = onSnapshot(doc(dbModular, "families", migrationFamilyId),
        (snap) => {
          // cache-থেকে-আসা "নেই" snapshot উপেক্ষা (server snapshot-এ ঠিক হবে) —
          // নইলে নতুন ডিভাইসে ক্ষণিকের জন্য ভুল "সাপোর্টেড নয়" স্ক্রিন ঝলকাতে পারে।
          if (!snap.exists() && snap.metadata && snap.metadata.fromCache) return;
          const state = snap.exists() ? (snap.data().migrationState || "legacy") : "legacy";
          setMigrationState(state);
          // §Public Invite-Link — একই live listener থেকে mirror(নতুন read
          // না), যাতে অন্য ডিভাইস থেকে rotate/revoke হলে সাথে সাথে sync হয়।
          // §Security-fix: token আর root doc-এ নেই; পুরনো field থেকে গেলে
          // শুধু admin-এর ডিভাইস থেকে একবার মুছে ফেলা হয়।
          try {
            const _d = snap.exists() ? snap.data() : null;
            const _me = auth.currentUser ? auth.currentUser.uid : null;
            if (_d && _d.activeInviteToken && _me && Array.isArray(_d.adminUids) && _d.adminUids.includes(_me)) {
              removeLegacyInviteToken(migrationFamilyId);
            }
          } catch (e) { /* best-effort */ }
          // Family Code auto-propagate + notify: সার্ভারের families/{id}.familyCode
          // এই ডিভাইসের local কোড থেকে ভিন্ন হলে (Admin অন্য কোথাও কোড
          // পরিবর্তন করেছেন) — অটো নতুন কোড বসিয়ে, Google-linked হলে
          // account-এও সংরক্ষণ করে, একবার রিলোড করা হয়; রিলোডের পর
          // "family_code_change_notice" flag দেখে ব্যানার দেখানো হবে।
          // familyId অপরিবর্তিত থাকায় এটি সম্পূর্ণ নিরাপদ — শুধু লেবেল sync।
          try {
            const serverCode = snap.exists() ? snap.data().familyCode : null;
            const localCode = getFamilyCode();
            if (serverCode && serverCode.trim() && serverCode !== localCode) {
              localStorage.setItem("family_code", serverCode);
              localStorage.setItem("family_code_is_custom", "1");
              localStorage.setItem("family_code_change_notice", serverCode);
              const uid = auth.currentUser ? auth.currentUser.uid : null;
              const doReload = () => window.location.reload();
              if (uid && isGoogleLinked()) {
                saveUserFamilyCode(uid, serverCode).then(doReload).catch(doReload);
              } else {
                doReload();
              }
            }
          } catch {}
        },
        (err) => {
          // Fail-closed: listener error হলে migrationState ইচ্ছাকৃতভাবে
          // অপরিবর্তিত (undefined-ই) রাখা হচ্ছে — কোনো "legacy" fallback
          // বা কোনো SDK auto-retry আচরণের ওপর নির্ভরতা নেই। App
          // loading-gate-এ থেকে যাবে যতক্ষণ না একটি সফল snapshot আসে।
          // Diagnostic(১৫ আগস্ট ২০২৬, Item ৩১): root cause pin করার জন্য
          // সাময়িক console.error — permission-denied হলে ঠিক কোন
          // familyId/uid-এ deny হচ্ছে তা দেখা যাবে।
          console.error(
            "[migrationState listener error]",
            err && err.code,
            err && err.message,
            "familyId:", migrationFamilyId,
            "uid:", auth.currentUser ? auth.currentUser.uid : null
          );
        }
      );
      // loadMembersV2() fix: migrateMembersIfNeeded()-কে সঠিক migrationState
      // পাস করার জন্য এখানে একটি পৃথক one-time get() করা হচ্ছে — উপরের
      // onSnapshot() fire-and-forget (attach করা হয়েছে, awaited না), তাই তার
      // প্রথম snapshot এই মুহূর্তে এসে পৌঁছেছে এই নিশ্চয়তা নেই (React state
      // setMigrationState()-এর ওপর race-condition নির্ভরতা তৈরি করলে
      // মাঝেমধ্যে stale/undefined migrationState দিয়ে সদস্য-তালিকা লোড হতে
      // পারত)। এই get() ব্যর্থ হলেও (network ইত্যাদি) "legacy" ধরে নেওয়া
      // নিরাপদ — resolvePathContext()-এর ডিফল্ট branch legacy-ই, তাই এটি
      // আগের (এই fix-এর আগের) hardcoded আচরণের সাথে সামঞ্জস্যপূর্ণ fallback।
      let bootMigrationState = "v2";
      try {
        const migFamSnap = await getDoc(doc(dbModular, "families", migrationFamilyId));
        bootMigrationState = migFamSnap.exists() ? (migFamSnap.data().migrationState || "legacy") : "legacy";
        // Access Approval Gate — Step 4: একই fetch থেকে isAdmin বের করা,
        // কোনো অতিরিক্ত read ছাড়াই।
        const famAdminUids = migFamSnap.exists() ? migFamSnap.data().adminUids : null;
        const myUid = auth.currentUser ? auth.currentUser.uid : null;
        setIsAdmin(Array.isArray(famAdminUids) && myUid ? famAdminUids.includes(myUid) : false);
        setAdminUidsList(Array.isArray(famAdminUids) ? famAdminUids : []);
        // §First Admin Protection — একই fetch থেকে, extra read ছাড়াই।
        setFirstAdminUid(migFamSnap.exists() ? (migFamSnap.data().firstAdminUid || null) : null);
        // §Public Invite-Link — একই boot fetch থেকে initial value(extra
        // read নেই)।
        // (token এখন admin-only subdoc থেকে আলাদা effect-এ লোড হয়)
        // §Notification System(২৩ আগস্ট ২০২৬ সংশোধন) — নিজের সব
        // notification(read+unread)-এ live listener, যাতে "seen"(read:true)
        // করার পরও item panel থেকে হারিয়ে না যায়(শুধু explicit delete/Clear-all
        // দিয়েই সরবে)। badge unread-count আলাদাভাবে filter করে বের করা হয়।
        // Spark-এ negligible cost(৩-member স্কেলে খুবই কম doc)।
        if (myUid) {
          notifUnsub = onSnapshot(
            query(
              collection(dbModular, "families", migrationFamilyId, "notifications"),
              where("targetUid", "==", myUid),
              orderBy("createdAt", "desc"),
              limit(30)
            ),
            (nsnap) => {
              setNotifications(nsnap.docs.map(d => ({ id: d.id, ...d.data() })));
            },
            () => {}
          );
        }
      } catch {}
      let m;
      try {
        m = await migrateMembersIfNeeded(bootMigrationState);
      } catch (err) {
        if (err && err.accessDenied) {
          // accessRequests flow সরানো হয়েছে (Phase-5): অনুমোদিত না হলে সরাসরি "অপেক্ষা" স্ক্রিন।
          setAccessPending(true);
          setMembers([]);
          return;
        }
        m = [];
      }
      setMembers(m);
      // Fires once per app load (not per re-render) so the Analytics
      // dashboard can show how many distinct family spaces are actively
      // syncing data, without generating noise on every state change.
      logAnalyticsEvent("family_active", {
        family_code: getFamilyCode(),
        member_count: m.length
      });
      // গ্লোবাল ডিজাইন থাকলে সেটাই সবার জন্য; না থাকলে পরিবারের আগের সেভ-করা মান(ফলব্যাক, কিছু হারায় না)।
      const dz = await fetchDesign();
      setDesign(dz);
      const cf = dz && Array.isArray(dz.customFields) ? dz.customFields : await loadCustomFields();
      setCustomFields(cf);
      setFieldOverrides(sanitizeOverrides(dz && dz.fieldOverrides ? dz.fieldOverrides : await loadFieldOverrides()));
      setTazkirahData(sanitizeTazkirah(dz && dz.tazkirah ? dz.tazkirah : await loadTazkirahCustom()));
      let last = null;
      try {
        // §Google Sign-in landing gate(১১ সেপ্টেম্বর ২০২৬) — সদ্য
        // matched/তৈরি হওয়া নিজের memberId one-time preference হিসেবে
        // localStorage-এ থাকে(renderGoogleLandingGate() দেখুন), এটাই
        // প্রথম-বুট-এ সবচেয়ে নির্ভরযোগ্য "নিজের member" সংকেত।
        const preferredGoogleMember = localStorage.getItem("dt_google_preferred_member");
        if (preferredGoogleMember) {
          localStorage.removeItem("dt_google_preferred_member");
          last = preferredGoogleMember;
        }
      } catch {}
      if (!last) {
        try {
          const r = await appStorage.get(`last-selected-member:${getFamilyCode()}`, false);
          last = r ? JSON.parse(r.value) : null;
        } catch {}
      }
      const myUidForSelect = auth.currentUser ? auth.currentUser.uid : null;
      const myOwnMember = myUidForSelect ? m.find(x => x.googleUid === myUidForSelect) : null;
      if (last && m.find(x => x.id === last)) {
        setSelectedId(last);
      } else if (myOwnMember) {
        setSelectedId(myOwnMember.id);
      } else if (m.length) {
        setSelectedId(m[0].id);
      }
      // "credential-already-in-use" রিকভারি-রিলোডের পর (Incognito-তে আগে
      // থেকে Google-লিংকড অ্যাকাউন্টে সাইন ইন করলে এই path-ই চলে) এই flag
      // সেট থাকে — সেই মুহূর্তে onLinked() কল করার সুযোগ ছিল না, তাই এখন
      // বুট হওয়ার সময় সেটা পূরণ করা হচ্ছে।
      let pendingDriveCheck = false;
      try {
        if (localStorage.getItem("dt_check_drive_after_reload") === "1") {
          pendingDriveCheck = true;
          localStorage.removeItem("dt_check_drive_after_reload");
        }
      } catch {}
      if (isGoogleLinked() && (!m.length || pendingDriveCheck)) {
        // নতুন/খালি ডিভাইস অথবা এইমাত্র রিকভারি-রিলোড হয়েছে, আর Google
        // সাইন ইন করা আছে — Drive-এ ব্যাকআপ আছে কিনা নীরবে চেক করা হচ্ছে।
        const found = await findAndOfferDriveRestore(false);
        if (!found && !m.length) {
          setAddingMember(true);
        }
      } else if (!m.length) {
        // No members yet, no Google link — first-time setup, prompt for name & gender right away
        setAddingMember(true);
      }
    })();
    return () => {
      if (migrationUnsub) migrationUnsub();
      if (notifUnsub) notifUnsub();
    };
  }, []);
  const [recoveryMessage, setRecoveryMessage] = useState(false);
  const [weeklyReminderBanner, setWeeklyReminderBanner] = useState(false);
  const [monthlyReminderBanner, setMonthlyReminderBanner] = useState(false);
  useEffect(() => {
    const lastActive = localStorage.getItem("last_active_date");
    const todayKey = dateKey(new Date());
    if (!lastActive) {
      // First-ever visit — just start tracking, don't show the message.
      localStorage.setItem("last_active_date", todayKey);
      return;
    }
    const gapDays = Math.round((new Date(todayKey) - new Date(lastActive)) / 86400000);
    const dismissedFor = localStorage.getItem("recovery_dismissed_on");
    if (gapDays >= 3 && dismissedFor !== todayKey) {
      setRecoveryMessage(true);
    }
  }, []);
  useEffect(() => {
    function checkReminders() {
      const now = new Date();
      const todayKey = dateKey(now);
      const hour = now.getHours();
      const weeklyDismissed = localStorage.getItem("weekly_reminder_dismissed_on");
      if (now.getDay() === 4 && hour >= 19 && weeklyDismissed !== todayKey) {
        setWeeklyReminderBanner(true);
      }
      const monthlyDismissed = localStorage.getItem("monthly_reminder_dismissed_on");
      if (isLastDayOfMonth(now) && hour >= 17 && monthlyDismissed !== todayKey) {
        setMonthlyReminderBanner(true);
      }
    }
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, []);
  function dismissWeeklyReminder() {
    localStorage.setItem("weekly_reminder_dismissed_on", dateKey(new Date()));
    setWeeklyReminderBanner(false);
  }
  function dismissMonthlyReminder() {
    localStorage.setItem("monthly_reminder_dismissed_on", dateKey(new Date()));
    setMonthlyReminderBanner(false);
  }
  // §লেবেল ম্যানেজ(ধাপ গ): রিনেম/লুকানো override প্রয়োগ। override না থাকলে তালিকা আগের মতোই।
  const deenFieldsView = useMemo(() => applyOverrides(DEFAULT_DEEN_FIELDS, fieldOverrides), [fieldOverrides]);
  const duniyaFieldsView = useMemo(() => applyOverrides(DEFAULT_DUNIYA_FIELDS, fieldOverrides), [fieldOverrides]);
  // পরিবার-স্তরের পুরনো "অন্যান্য" কাস্টম টাস্ক(ক্যাটেগরি-বিহীন)এখন আর ফর্ম/হিসাবে ধরা হয় না(owner-সিদ্ধান্ত);
  // ডেটা Firestore-এ অক্ষত থাকে। ক্যাটেগরিসহ লেবেল(ধাপ গ)আগের মতোই চলে।
  const customFieldsView = useMemo(() => applyOverrides(customFields.filter(f => f.category && f.category !== "other"), fieldOverrides), [customFields, fieldOverrides]);
  // নির্বাচিত সদস্যের নিজের কাস্টম টাস্ক — শুধু তার হিসাবেই ঢোকে(সব হিসাব selectedMember + allFields দিয়ে চলে)।
  const memberTaskFields = useMemo(() => {
    const m = (members || []).find(x => x.id === selectedId);
    return taskFields(m && m.customTasks);
  }, [members, selectedId]);
  const allFields = useMemo(() => {
    return [...deenFieldsView, ...duniyaFieldsView, ...customFieldsView, ...memberTaskFields];
  }, [deenFieldsView, duniyaFieldsView, customFieldsView, memberTaskFields]);
  async function handleSaveFieldManager(nextOverrides, nextCustomFields) {
    if (JSON.stringify(nextCustomFields) !== JSON.stringify(customFields)) {
      await saveDesignPart("customFields", nextCustomFields);
      setDesign(d => ({ ...(d || {}), customFields: nextCustomFields }));
      setCustomFields(nextCustomFields);
    }
    await saveDesignPart("fieldOverrides", nextOverrides);
    setDesign(d => ({ ...(d || {}), fieldOverrides: nextOverrides }));
    setFieldOverrides(nextOverrides);
  }
  async function handleSaveCustomTasks(next) {
    await saveCustomTasks(migrationState, selectedId, next);
    setMembers(prev => (prev || []).map(x => x.id === selectedId ? { ...x, customTasks: next } : x));
  }
  async function handleSaveTazkirah(next) {
    await saveDesignPart("tazkirah", next);
    setDesign(d => ({ ...(d || {}), tazkirah: next }));
    setTazkirahData(next);
  }
  const selectedMember = useMemo(() => (members || []).find(m => m.id === selectedId) || null, [members, selectedId]);
  // True when this member has been claimed ("দায়িত্ব নিন") by a different
  // Firebase Auth uid than the one this device is currently signed in as.
  // Unclaimed members (ownerUid null) are editable by anyone — that's the
  // "manual member, no phone of their own" case. Read access is never
  // restricted, only writing.
  // §Google-only identity(১১ সেপ্টেম্বর ২০২৬) — member.googleUid(নতুন
  // model) ও member.ownerUids(পুরনো Anonymous-Auth model) দুটোই সাপোর্ট
  // করার জন্য dual-check helper। googleUid থাকলে সেটাই একমাত্র owner-uid,
  // নাহলে পুরনো ownerUids array — কোনো ডেটা/schema পরিবর্তন হয়নি, শুধু
  // client-side compatibility shim(২_৪_১ §৬-এর dual-check নীতি অনুযায়ী)।
  const memberOwnerUids = m => (m && m.googleUid) ? [m.googleUid] : [];
  // (memberOwnerUids-এর নিচে রাখা জরুরি — const, আগে ডাকলে ReferenceError)
  // সবাই যে লেআউট দেখে: গ্লোবাল ডিজাইন; না থাকলে শুধু ক্রিয়েটরের নিজের আগের সেভ-করা মান(ফলব্যাক), অন্যদের ডিফল্ট।
  const designSrc = (() => {
    const legacy = (isCreatorAuth() && selectedMember && auth.currentUser && memberOwnerUids(selectedMember).includes(auth.currentUser.uid)) ? selectedMember : null;
    const d = design || {};
    return {
      homeLayout: d.homeLayout || (legacy ? legacy.homeLayout : undefined),
      prayerLayout: d.prayerLayout || (legacy ? legacy.prayerLayout : undefined),
      tabLayout: d.tabLayout || (legacy ? legacy.tabLayout : undefined)
    };
  })();
  const isLockedForThisDevice = !!(selectedMember && memberOwnerUids(selectedMember).length && (!auth.currentUser || !memberOwnerUids(selectedMember).includes(auth.currentUser.uid)));
  // §Old-code cleanup Phase 4(১৫ সেপ্টেম্বর ২০২৬, owner-approved): memberRequest
  // status-fetch effect ও "Approved-member Google welcome" popup effect+
  // dismiss-function সম্পূর্ণ সরানো হলো — google-only architecture-এ
  // memberRequests-approval flow dead(§ উপরের ব্যাখ্যা দ্রষ্টব্য)।
  useEffect(() => {
    // Guard: on first render selectedId is still null (real value loads async).
    // Skip that null write so it never overwrites the previously saved
    // device-owner profile — otherwise every refresh would silently reset
    // to the first member in the family list.
    if (!selectedId) return;
    appStorage.set(`last-selected-member:${getFamilyCode()}`, JSON.stringify(selectedId), false).catch(() => {});
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId || migrationState === undefined) return;
    loadEntry(migrationState, selectedId, dateKey(viewDate)).then(data => {
      setEntry(data || {});
      originalEntryRef.current = data || null;
      entryDirtyRef.current = false;
      // §খসড়া(owner-approved): আগের সেশনে সেভ-না-করা পরিবর্তন থাকলে ফিরিয়ে আনার প্রস্তাব। সেভড ডেটা কখনো নিজে থেকে বদলায় না।
      try {
        const dk = draftStorageKey(selectedId, dateKey(viewDate));
        const raw = localStorage.getItem(dk);
        if (!raw) return;
        const d = JSON.parse(raw);
        const fresh = d && d.entry && typeof d.ts === "number" && Date.now() - d.ts < 3 * 86400000;
        const differs = fresh && JSON.stringify(d.entry) !== JSON.stringify(data || {});
        if (differs && window.confirm("এই দিনের সেভ-না-করা খসড়া পাওয়া গেছে। ফিরিয়ে আনবেন?")) {
          setEntry(d.entry);
          entryDirtyRef.current = true;
        } else {
          localStorage.removeItem(dk);
        }
      } catch (e) {}
    });
  }, [selectedId, viewDate, migrationState]);

  // Live-synced month entries: a single collection-scoped range query on
  // documentId() (entry:<memberId>:<YYYY-MM>-*) replaces what used to be
  // one onSnapshot listener PER DAY of the month (up to 31 simultaneous
  // listeners for a single member/month, re-opened on every member/month
  // switch). The original per-day approach existed because of a concern
  // that Firestore rules might silently block list/range queries on this
  // collection — that concern was investigated against the live production
  // rules (Audit Round #01, item [#1]) and closed as a false alarm: the
  // current rules (`allow read: if request.auth != null && ...`, no
  // resource.data reference) permit both get() and list()/query() the same
  // way. Collapsing 31 listeners into 1 meaningfully cuts daily Firestore
  // read-quota usage on the Spark (free) plan as more family members join
  // and use the app simultaneously — each open calendar view now costs one
  // listener instead of up to 31, and reads only the days that actually
  // have a saved entry (no doc = no read), instead of always issuing 31
  // reads whether or not a day was ever filled in.
  useEffect(() => {
    if (!selectedId || migrationState === undefined) {
      setMonthEntries({});
      return;
    }
    const year = monthCursor.year;
    const month0 = monthCursor.month0;
    // Step 2 (Switch prep): resolver দিয়ে collection ও prefix নির্ধারণ।
    // migrationState "legacy" হলে (বর্তমানে সবসময়ই তাই) prefix ও colRef
    // আগের হার্ডকোডেড মানের সাথে বিট-ফর-বিট অভিন্ন থাকে।
    const ctx = resolvePathContext(migrationState, getFamilyCode(), getFamilyId());
    const prefix = `${selectedId}_${year}-${pad2(month0 + 1)}-`;
    const q = query(
      ctx.entriesRef,
      where(documentId(), ">=", prefix),
      where(documentId(), "<", prefix + "\uf8ff")
    );
    const unsub = onSnapshot(q, snap => {
      const liveData = {};
      snap.docs.forEach(docSnap => {
        const dayStr = docSnap.id.slice(prefix.length);
        try {
          liveData[dayStr] = JSON.parse(docSnap.data().value);
        } catch {
          // Skip a malformed single entry rather than break the whole
          // month's view over one bad document.
        }
      });
      setMonthEntries(liveData);
    }, () => {});
    return () => unsub();
  }, [selectedId, monthCursor, monthRefreshKey, migrationState]);
  const reviewEntries = useCursorEntries({ cursor: reviewCursor, mainCursor: monthCursor, mainEntries: monthEntries, migrationState, memberId: selectedId });
  const trendEntries = useCursorEntries({ cursor: trendCursor, mainCursor: monthCursor, mainEntries: monthEntries, migrationState, memberId: selectedId });
  const refreshWeekly = useCallback(() => {
    if (!selectedId || migrationState === undefined) return;
    loadWeekly(migrationState, selectedId, monthCursor.year, monthCursor.month0).then(data => {
      setWeekly(data);
      weeklyDirtyRef.current = false;
      const maxPossible = getWeekRanges(daysInMonth(monthCursor.year, monthCursor.month0)).length;
      let highestFilled = 1;
      for (let w = 1; w <= maxPossible; w++) {
        const rec = data[w];
        if (rec && (rec.good || rec.gap || rec.plan)) highestFilled = w;
      }
      setWeeklyRowCount(Math.min(Math.max(highestFilled, 1), maxPossible));
    });
  }, [selectedId, monthCursor, migrationState]);
  useEffect(() => {
    refreshWeekly();
  }, [refreshWeekly]);
  useEffect(() => {
    // §Guest-mode fix(১২ সেপ্টেম্বর ২০২৬): এই effect selectedId-নির্বিশেষে
    // মাউন্ট হওয়ার সাথে সাথেই meeting-doc listener চালু করে — guest
    // অবস্থায় এটাই একমাত্র "অরক্ষিত" Firestore call ছিল(বাকিগুলো আগে থেকেই
    // selectedId/myUid না থাকলে self-guard করে)। এখন এখানেও skip।
    if (isGuestMode) return;
    // New document (different month) — nothing local worth protecting yet.
    meetingDirtyRef.current = false;
    const docKey = meetingKey(meetingCursor.year, meetingCursor.month0);
    const docRef = doc(dbModular, getCollectionName(), docKey);
    const unsubscribe = onSnapshot(docRef, docSnap => {
      // H-1 fix: while the user has unsaved local edits, ignore incoming
      // snapshots (e.g. another device's save) so typing isn't overwritten.
      if (meetingDirtyRef.current) return;
      if (docSnap.exists()) {
        try {
          const data = JSON.parse(docSnap.data().value);
          setMeetingState(data);
        } catch (e) {}
      } else {
        setMeetingState({
          rows: [{
            id: "1",
            topic: "",
            decision: "",
            person: ""
          }]
        });
      }
    }, () => {
      // error-callback: permission-denied/নেটওয়ার্ক ত্রুটিতে "Uncaught Error in
      // snapshot listener" এড়ানো; বিদ্যমান meetingState অক্ষত থাকে।
    });
    return () => unsubscribe();
  }, [meetingCursor]);
  const handleExportData = () => exportBackupToDevice(migrationState);
  // --- Google Drive Backup/Restore UI handlers (driveBackupActions.js-এ) ---
  const { handleDriveBackupClick, handleBothBackupClick, findAndOfferDriveRestore, checkDriveBackupAfterLink, handleManualDriveRestoreClick, handleConfirmDriveRestore } = createDriveBackupActions({
    migrationState, handleExportData, driveRestoreCandidate,
    setShowBackupOptionsModal, setShowGoogleAccountModal, setShowImportOptionsModal,
    setDriveBackupBusy, setDriveBackupStatus,
    setDriveRestoreChecking, setDriveRestoreCandidate, setShowDriveRestoreModal, setDriveRestoreBusy
  });
  const handleImportData = e => importBackupFromFile(e, migrationState);
  // --- ফ্যামিলি কোড/ইনভাইট/নতুন-যোগ/রিনেম handler (familyActions.js-এ) ---
  const { handleCopyCode, handleShareInviteLink, handleRevokeInviteLink, handleCreateNewFamily, handleJoinExistingFamily, handleRenameFamilyCode } = createFamilyActions({
    activeInviteToken, setActiveInviteToken, members, setCopiedCode,
    newFamCodeInput, setNewFamCodeBusy,
    joinFamCodeInput, setJoinFamCodeBusy,
    renameFamCodeInput, setRenameFamCodeBusy
  });
  function handleGoToArchive() {
    // আর্কাইভে যাওয়া একসাথে মাস ও তারিখ উভয়ই পরিবর্তন করে — তাই তিনটি
    // dirty flag-ই একসাথে চেক করে একটিমাত্র (duplicate নয়) confirm দেখানো
    // হচ্ছে।
    const hasUnsaved = entryDirtyRef.current || weeklyDirtyRef.current || meetingDirtyRef.current;
    if (hasUnsaved && !window.confirm("সেভ না করা পরিবর্তন আছে। আর্কাইভে গেলে তা হারিয়ে যাবে। আপনি কি নিশ্চিত?")) return;
    setMonthCursor({
      year: archiveYear,
      month0: archiveMonth0
    });
    setViewDate(new Date(archiveYear, archiveMonth0, 1));
    setShowArchiveModal(false);
  }
  // --- ফিডব্যাক handler (feedbackAction.js-এ) ---
  const { handleSendFeedback } = createFeedbackAction({
    feedbackMsg, feedbackSending, setFeedbackSending, setFeedbackStatus, setFeedbackMsg, setShowFeedbackModal
  });
  // --- মাসিক সভার handler (meetingActions.js-এ) ---
  const { addMeetingRow, handleSendToMeeting, removeMeetingRow, updateMeetingRow, handleSaveMeeting } = createMeetingActions({
    isGuestMode, setShowGuestSignIn, meetingDirtyRef, setMeetingState, meetingState,
    meetingCursor, reviewCursor, setSavingMeeting, setMeetingSavedTick
  });
  // §Member Key সেশন — এই বাটন এখন শুধু Admin-এর(স্মার্টফোন-বিহীন
  // সদস্যকে সরাসরি যোগ করার জন্য — যেমন বাবা/মা)। সাধারণ সদস্য এখন
  // "সদস্য হোন" দিয়ে অনুরোধ করেন(handleRequestToBecomeMember)। ownerUid
  // ইচ্ছাকৃতভাবে null(unclaimed) — admin নিজে যাকে যোগ করছেন, ভবিষ্যতে
  // Member Key দিয়ে সেই ব্যক্তি নিজেই claim করতে পারবেন।
  // --- সদস্য যোগ/বাদ handler (memberActions.js-এ) ---
  const { handleAddMember, handleRemoveMember } = createMemberActions({
    isAdmin, newName, newGender, newMemberEmail, members, selectedId, migrationState,
    setMembers, setSelectedId, setNewName, setNewGender, setNewMemberEmail, setAddingMember
  });
  // --- এডমিন ভূমিকা handler (adminActions.js-এ; Make/Remove Admin, Self-Demote) ---
  const { handleMakeAdmin, handleRemoveAdmin, handleSelfDemote } = createAdminActions({
    members, firstAdminUid, adminUidsList, memberOwnerUids,
    setAdminUidsList, setIsAdmin, setShowProfileDropdown
  });
  // §ProfileDropdownGoogle(নতুন, ১১ সেপ্টেম্বর ২০২৬) — "প্রোফাইল এডিট"।
  // নিজের(googleUid-matched) member খুঁজে familyId+memberId দিয়ে
  // editOwnProfile() কল করা — Firestore write logic googleIdentity.js-এ,
  // এখানে শুধু "কোনটা নিজের member" resolve করা হচ্ছে(App() state-owner,
  // Owner Rule ২)।
  async function handleEditOwnProfile(name, gender) {
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    const myOwn = myUid ? (members || []).find(x => x.googleUid === myUid) : null;
    if (!myOwn) return { aborted: true, reason: "no-own-member" };
    return editOwnProfile(getFamilyId(), myOwn.id, name, gender);
  }
  // §ProfileDropdownGoogle — "এই পরিবার ত্যাগ করুন"। সফল হলে এই ডিভাইসের
  // local family session(family_id/family_code) পরিষ্কার করে reload করা
  // হয়(handleFullLogout()-এর tail-এর একই cleanup-pattern reuse) — Google
  // sign-out করা হয় না(শুধু family membership ত্যাগ, account/session না)।
  async function handleLeaveFamily() {
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    const myOwn = myUid ? (members || []).find(x => x.googleUid === myUid) : null;
    if (!myOwn) return { aborted: true, reason: "no-own-member" };
    const res = await leaveFamily(getFamilyId(), myOwn.id);
    if (res && res.success) {
      try {
        localStorage.removeItem("family_id");
        localStorage.removeItem("family_code");
        localStorage.removeItem("family_code_is_custom");
      } catch {}
      window.location.reload();
    }
    return res;
  }
  // §Google অ্যাকাউন্ট (মেইল) বদলান — UID অপরিবর্তিত; ধাপ ১: পুরনো Google ছাড়ানো। ধাপ ২ (নতুন অ্যাকাউন্ট যুক্ত)
  // পূর্ণ-পর্দা GoogleRelinkGate-এ (mountApp-এ বসানো) — আলাদা ট্যাপে, যাতে popup আটকে না যায়।
  async function handleChangeGoogleAccount() {
    return startGoogleAccountChange();
  }
  // Single Logout — Family code session + Google session, দুটোই একসাথে
  // পরিষ্কার। কোনো Firestore/member ownership data পরিবর্তন হয় না — শুধু
  // এই ডিভাইসের local session/identity রিসেট হয়। multi-family ব্যবহারকারী
  // fresh state-এ শুরু করতে পারবেন; আবার প্রবেশ করতে Family Code লাগবে।
  async function handleFullLogout() {
    const ok = window.confirm("লগ আউট করবেন নিশ্চিত?");
    if (!ok) return;
    try {
      // Anonymous sign-in বন্ধ — নতুন পরিচয় তৈরি হয় না; reload-এর পর guest mode।
      await signOut(authModular);
    } catch (err) {
      alert("লগআউট করতে সমস্যা হয়েছে: " + err.message);
      return;
    }
    localStorage.removeItem("family_id");
    localStorage.removeItem("family_code");
    localStorage.removeItem("family_code_is_custom");
    window.location.reload();
  }
  async function handleDeleteGoogleAccount() {
    try {
      // এখানে অতিরিক্ত নতুন পরিচয় তৈরি করা হয় না
      // হয়েছে — unlinkGoogleAccount() একাই যথেষ্ট এবং একই ডিভাইস uid
      // বজায় রাখে, তাই সদস্যদের এডিট-অধিকার অক্ষুণ্ণ থাকে।
      await unlinkGoogleAccount();
      setShowDeleteAccountWarning(false);
      window.alert("গুগল অ্যাকাউন্ট সফলভাবে রিমুভ করা হয়েছে এবং সাইন আউট সম্পন্ন হয়েছে। আপনার অ্যাপের সম্পূর্ণ ডেটা নিরাপদে আপনার ফ্যামিলি কাস্টম কোডের সাথে সংরক্ষিত আছে।");
      window.location.reload();
    } catch (err) {
      window.alert("একাউন্ট ডিলিট করতে সমস্যা হয়েছে: " + (err && err.message));
    }
  }
  function updateField(key, value) {
    if (isGuestMode) { setShowGuestSignIn(true); return; }
    if (isFutureDate(viewDate) || isLockedForThisDevice) return;
    entryDirtyRef.current = true;
    setEntry(prev => ({
      ...prev,
      [key]: value
    }));
  }
  function updateExcuse(key, value) {
    if (isGuestMode) { setShowGuestSignIn(true); return; }
    if (isFutureDate(viewDate) || isLockedForThisDevice) return;
    entryDirtyRef.current = true;
    setEntry(prev => ({
      ...prev,
      excused: {
        ...(prev.excused || {}),
        [key]: value
      }
    }));
  }
  // §Guest-mode sign-in success(১২ সেপ্টেম্বর ২০২৬) — আগে এই ঠিক একই logic
  // renderGoogleLandingGate()(আলাদা root)-এর handleGoogleGateSuccess()-এ
  // ছিল, এখন App()-এর ভিতরের guest-mode popover থেকে সরাসরি reuse। familyId
  // থেকে আসল familyCode fetch করে(না পারলে familyId-ই fallback, login-loop
  // এড়াতে) localStorage সেট করে reload — reload-এর পরে normal bootOnce()
  // path-ই চলে, isGuestMode আর true থাকবে না।
  async function handleGuestSignInSuccess(familyId, memberId) {
    let famCode = familyId;
    try {
      const famSnap = await getDoc(doc(dbModular, "families", familyId));
      if (famSnap.exists() && famSnap.data().familyCode) {
        famCode = famSnap.data().familyCode;
      }
    } catch {}
    try {
      localStorage.setItem("family_id", familyId);
      localStorage.setItem("dt_google_preferred_member", memberId);
      localStorage.setItem("family_code", famCode);
    } catch {}
    // §Bug-fix(১৩ সেপ্টেম্বর ২০২৬, owner-reported #৪ — Invite-Link loop):
    // আগে এখানে plain reload() হতো, কিন্তু URL-এ তখনও Invite-Link-এর
    // ?joinFid=/joinToken= query-param থেকে যেত — reload-এর পর app.js-এর
    // সবার-আগের early-return route শুধু URL-param দেখেই(join ইতিমধ্যে সফল
    // হয়েছে কিনা না দেখে) আবার fresh InviteJoinGate("form" stage) render
    // করে ফেলত, অসীম-লুপ-এর মতো দেখাত(join আসলে প্রথমবারই সফল হয়ে গিয়েছিল)।
    // origin-এ hard-redirect করলে param strip হয়ে যায় — normal guest
    // sign-in flow(যেখানে URL এমনিতেই origin) আচরণ অপরিবর্তিত, existing
    // onBackToMain()-এর একই pattern reuse।
    window.location.href = window.location.origin;
  }
  async function handleSave() {
    if (!selectedId || isFutureDate(viewDate)) return;
    if (isLockedForThisDevice) {
      alert("এই সদস্যের দায়িত্ব অন্য ডিভাইসে আছে — এখান থেকে এডিট করা যাবে না।");
      return;
    }
    setSaving(true);
    try {
      const key = dateKey(viewDate);
      if (originalEntryRef.current) {
        await pushEntryHistory(migrationState, selectedId, key, originalEntryRef.current);
      }
      const toSave = {
        ...entry,
        lastEditedAt: Date.now()
      };
      await saveEntry(migrationState, selectedId, key, toSave, selectedMember?.ownerUid ?? null);
      originalEntryRef.current = toSave;
      setEntry(toSave);
      entryDirtyRef.current = false;
      try { localStorage.removeItem(draftStorageKey(selectedId, key)); } catch (e) {}
      localStorage.setItem("last_active_date", dateKey(new Date()));
      // §Motivational Layer — Phase 1.5: শুধু "আজ"-এর save-এই ট্রিগার হয়(পুরনো
      // দিনের backfill-edit বাদ, dailyInsight.js-এর মতোই "আজ"-কেন্দ্রিক scope)।
      // Best-effort, non-blocking(await না) — মূল save-flow/UI-tick-কে ধীর করবে
      // না, ব্যর্থ হলেও silently ignore হয়(memberData.js-এ try/catch আছে)।
      if (key === dateKey(new Date())) {
        const pct = dailyScore(toSave, selectedMember, allFields);
        if (pct !== null) {
          updateBestScoreIfNeeded(migrationState, selectedId, Math.round(pct * 100));
        }
      }
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1600);
    } catch (err) {
      alert("ডেটা সেভ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSaving(false);
    }
  }
  async function openHistoryModal() {
    if (!selectedId) return;
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const list = await fetchEntryHistory(migrationState, selectedId, dateKey(viewDate));
      setHistoryList(list);
    } finally {
      setLoadingHistory(false);
    }
  }
  function restoreHistoryVersion(versionValue) {
    try {
      const restored = JSON.parse(versionValue);
      setEntry(restored);
      setShowHistoryModal(false);
    } catch {
      alert("এই সংস্করণটি পুনরুদ্ধার করতে সমস্যা হয়েছে।");
    }
  }
  const streak = useMemo(() => calculateStreak(monthEntries, selectedMember, allFields, monthCursor.year, monthCursor.month0), [monthEntries, selectedMember, allFields, monthCursor]);
  // §Motivational Layer — Phase 1: প্রতিদিন একটাই smart-selected insight।
  // নতুন কোনো Firestore read না — সবই এই render-এ আগে থেকে-loaded data থেকে।
  const dailyInsight = useMemo(() => selectDailyInsight({
    monthEntries,
    member: selectedMember,
    allFields,
    cursorYear: monthCursor.year,
    cursorMonth0: monthCursor.month0,
    streak
  }), [monthEntries, selectedMember, allFields, monthCursor, streak]);
  // §Motivational Layer — Phase 2: আগামীকালের auto-suggested Focus(শুধু আজ
  // real-month-এ browse করলে অর্থবহ — dailyInsight-এর একই month-scope guard)।
  const tomorrowKey = useMemo(() => dateKey(new Date(Date.now() + 86400000)), []);
  // "আজকের মুহাসাবা" কার্ডের "গতকাল ভরা হয়নি" ব্যানার: শুধু আজকের দিন দেখার সময়, চলতি মাসে, মাসের ২ তারিখ থেকে,
  // গতকালের এন্ট্রি-ডক না থাকলে, আর এই মাসে অন্তত একটা এন্ট্রি থাকলে(নতুন সদস্যকে বিরক্ত না করতে)। নতুন Firestore read নেই।
  // "গতকালের মতো বসান" শর্টকাটের উৎস: একই শর্তে(চলতি মাস, ২ তারিখ থেকে) গতকালের সেভ-করা এন্ট্রি, নইলে null।
  const yesterdayEntry = useMemo(() => yesterdayEntryOf({ viewDate, cursor: monthCursor, entries: monthEntries, now: new Date() }, STATS_H), [viewDate, monthCursor, monthEntries]);
  const yesterdayMissing = useMemo(() => yesterdayMissingOf({ viewDate, cursor: monthCursor, entries: monthEntries, now: new Date() }, STATS_H), [viewDate, monthCursor, monthEntries]);
  const suggestedFocusKey = useMemo(() => {
    const now = new Date();
    if (now.getFullYear() !== monthCursor.year || now.getMonth() !== monthCursor.month0) return null;
    return suggestTomorrowFocus(monthEntries, selectedMember, allFields, now.getDate());
  }, [monthEntries, selectedMember, allFields, monthCursor]);
  // সকাল/দুপুরে বাছা ফোকাস না থাকলে গতকালের সবচেয়ে দুর্বল আমল "আজকের Focus (পরামর্শ)" হিসেবে (মাসের ১ তারিখে নয়)।
  const suggestedTodayFocusKey = useMemo(() => {
    const now = new Date();
    if (now.getFullYear() !== monthCursor.year || now.getMonth() !== monthCursor.month0 || now.getDate() < 2) return null;
    return suggestTomorrowFocus(monthEntries, selectedMember, allFields, now.getDate() - 1);
  }, [monthEntries, selectedMember, allFields, monthCursor]);
  const [milestoneToast, setMilestoneToast] = useState(null);
  useEffect(() => {
    if (!selectedId || !streak) return;
    const MILESTONES = [7, 30, 100, 365];
    const hit = MILESTONES.find(m => streak === m);
    if (!hit) return;
    const seenKey = `milestone_seen_${selectedId}_${hit}`;
    if (localStorage.getItem(seenKey)) return;
    localStorage.setItem(seenKey, "1");
    setMilestoneToast(hit);
  }, [streak, selectedId]);
  const monthStats = useMemo(() => monthStatsOf({ entries: monthEntries, year: monthCursor.year, month0: monthCursor.month0, member: selectedMember, fields: allFields }, STATS_H), [monthEntries, monthCursor, selectedMember, allFields]);
  // §B৭ Weekly Summary Notification(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬,
  // owner-approved, in-app non-push variant — architecture-review note
  // অনুযায়ী প্রকৃত push out-of-scope, Blaze লাগবে): app-open-এ, ইতিমধ্যে-
  // loaded monthEntries থেকে গত("আগের")-সপ্তাহের গড়-স্কোর গণনা(নতুন কোনো
  // Firestore read না)। Week-definition existing getWeekRanges()(app-এর
  // নিজস্ব ৭-দিন-চাংক, Weekly Reflection feature-এর সাথে সামঞ্জস্যপূর্ণ)।
  // সরলীকরণ(ঝুঁকি কমাতে, owner-approved plan অনুযায়ী): শুধু বর্তমান-মাস
  // দেখা অবস্থায় ও current-week মাসের প্রথম সপ্তাহ না হলেই trigger হয় —
  // মাস-boundary ক্রস করা সপ্তাহের জন্য আলাদা মাস fetch করা হয় না(স্কিপ,
  // কোনো error/crash না, শুধু সেই একটা edge-case-এ summary skip হয়)।
  const [weeklySummaryToast, setWeeklySummaryToast] = useState(null);
  useEffect(() => {
    if (isGuestMode || !auth.currentUser || !selectedId || !selectedMember) return;
    const today = new Date();
    if (monthCursor.year !== today.getFullYear() || monthCursor.month0 !== today.getMonth()) return;
    const total = daysInMonth(monthCursor.year, monthCursor.month0);
    const ranges = getWeekRanges(total);
    const todayDay = today.getDate();
    const curIdx = ranges.findIndex(r => todayDay >= r.start && todayDay <= r.end);
    if (curIdx <= 0) return;
    const lastWeek = ranges[curIdx - 1];
    const weekKey = `${monthCursor.year}-${monthCursor.month0}-w${lastWeek.week}`;
    const flagKey = `dt_weekly_summary_shown_${auth.currentUser.uid}_${selectedId}`;
    let already;
    try {
      already = localStorage.getItem(flagKey);
    } catch {
      already = weekKey;
    }
    if (already === weekKey) return;
    const summary = weekSummaryOf(lastWeek, monthEntries, selectedMember, allFields, STATS_H);
    try {
      localStorage.setItem(flagKey, weekKey);
    } catch {}
    if (!summary) return;
    setWeeklySummaryToast(summary);
  }, [monthEntries, monthCursor, selectedId, selectedMember, allFields, isGuestMode]);
  if (members === null || migrationState === undefined) return /*#__PURE__*/React.createElement(DashboardSkeleton, null);
  if (migrationState !== "v2") return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center p-6 text-center text-slate-700"
  }, "এই পরিবারের ডেটা-সংস্করণ এই অ্যাপে সাপোর্টেড নয়। অনুগ্রহ করে অ্যাডমিনকে জানান।");
  // §Onboarding Gate fix(১৮ আগস্ট ২০২৬): GoogleAccountModal ও ClaimKey
  // মোডাল আগে শুধু Dashboard-এর মূল JSX-এর ভিতরে বাঁধা ছিল, তাই early-
  // return branch-এ(নিচে) কখনো render হতো না — ফলে Google Sign-in ধাপে
  // সাদা পেজ এবং keyClaim ধাপে নাম ক্লিক করলে কিছু হতো না। এখন একবার
  // variable-এ বের করে দুই জায়গাতেই(early-return branch + নিচের আগের
  // অবস্থান) reuse করা হচ্ছে — কোনো নতুন logic/state/collection নেই।
  const googleAccountModalNode = showGoogleAccountModal && /*#__PURE__*/React.createElement(GoogleAccountModal, {
    onClose: () => setShowGoogleAccountModal(false),
    onLinked: checkDriveBackupAfterLink,
    memberName: selectedMember?.name,
    auth: authModular,
    claimFirstAdminIfEligible: claimFirstAdminIfEligible,
    googleProvider: googleProvider,
    linkGoogleAccount: linkGoogleAccount,
    syncFamilyCodeWithAccount: syncFamilyCodeWithAccount
  });
  // §Old-code cleanup Phase 4(১৫ সেপ্টেম্বর ২০২৬, owner-approved): এই
  // অংশে আগে "Approved-member Google welcome"(approvedGoogleWelcomeNode)
  // ও পুরনো Onboarding Gate সিস্টেম(Member Key claim/becomeMember modal
  // node)-সংক্রান্ত dead-code comment ছিল — সম্পূর্ণ সরানো হলো(§উপরের
  // ব্যাখ্যা দ্রষ্টব্য, state-লেভেলে আগেই removed)।
  // §Public Invite-Link Join(2_4 §৫.২/Screen D):
  // root path-এ ?joinFid=&joinToken= থাকলে(শেয়ার করা আমন্ত্রণ লিংক থেকে
  // আসা) পুরো normal render(guest/member সব) bypass করে
  // শুধু InviteJoinGate(Screen D) দেখানো হয়। Cloudflare Pages-এ আলাদা
  // "/join" path route করতে নতুন _redirects config লাগত(বর্তমানে নেই) —
  // তাই root query-param ব্যবহার করা হলো(owner-approved deviation, spec-এর
  // ".../join?fid=...&token=..." থেকে সামান্য ভিন্ন URL-shape, ফাংশনালিটি
  // অভিন্ন, কোনো নতুন server-config লাগে না)। সম্পূর্ণ additive early-
  // return — params না থাকলে এই ব্লক কখনো fire করে না, existing routing/
  // state কিছুই touch হয়নি।
  let inviteJoinParams = null;
  try {
    const qp = new URLSearchParams(window.location.search);
    const joinFid = qp.get("joinFid");
    const joinToken = qp.get("joinToken");
    const joinFc = qp.get("fc");
    if (joinFid && joinToken) inviteJoinParams = { joinFid, joinToken, joinFc };
  } catch {}
  if (inviteJoinParams) {
    return /*#__PURE__*/React.createElement(InviteJoinGate, {
      familyId: inviteJoinParams.joinFid,
      token: inviteJoinParams.joinToken,
      familyCode: inviteJoinParams.joinFc,
      onSuccess: handleGuestSignInSuccess,
      onBackToMain: () => {
        window.location.href = window.location.origin;
      }
    });
  }
  // §Bug-fix(১৫ সেপ্টেম্বর ২০২৬, "মেনু" ট্যাব সাদা-পেজ ক্র্যাশ): themeColorPickerEl
  // আগে নিচে(family-tab render-flow-এর ভিতরে, monthCursor-নির্ভর হিসাব-চালার পরে)
  // "const" দিয়ে define হতো — কিন্তু TAB_SETTINGS("মেনু") early-return branch(ঠিক
  // নিচে) সেই ঘোষণার *আগেই* একই ভ্যারিয়েবল ব্যবহার করত(MenuPage prop হিসেবে),
  // যা প্রতিটা render-এ JS-এর "const" temporal-dead-zone নিয়ম অনুযায়ী
  // ReferenceError ছুঁড়ত(themeColorPickerEl-এর নিজস্ব dependency — themeColor/
  // setThemeColor/THEME_PRESETS — সব এর অনেক আগেই সংজ্ঞায়িত, তাই early-move
  // নিরাপদ, কোনো নতুন dependency তৈরি হয়নি)। কোনো Error Boundary না থাকায়
  // React পুরো tree unmount করে সাদা পেজ দেখাতো; commit না হওয়ায়
  // sessionStorage(dt_active_tab)-ও আগের("family") মানেই থেকে যেত — তাই
  // reload করলে হোম-পেজ ফিরে আসতো(ভুল-fix না, শুধু pre-crash state)। Fix:
  // এই const-টা এখানে(early-return-এর আগে) move করা হলো, নিচের ব্যবহার-স্থানে
  // (family-tab render-flow) অপরিবর্তিত রয়ে গেছে(same variable, শুধু
  // declaration-position বদলেছে)।
  // §Order swap(১৬ সেপ্টেম্বর ২০২৬, owner-approved): ডিসপ্লে মোড এখন থিম
  // কালার-এর উপরে — শুধু render-order বদলেছে, দুই ব্লকের ভিতরের
  // logic/structure/props অপরিবর্তিত(byte-identical, শুধু অবস্থান বদল)।
  // §Menu UI polish(১ নভেম্বর ২০২৬): ডিসপ্লে মোড + থিম এখন একটাই "অ্যাপের চেহারা" কার্ড
  // (segmented-control + ৩-কলাম থিম গ্রিড)। logic(setDisplayMode/setThemeColor/তুলনা) অপরিবর্তিত।
  const themeColorPickerEl = /*#__PURE__*/React.createElement(React.Fragment, null,
    React.createElement("div", { className: "px-2 pt-1 text-[11px] font-bold tracking-wider text-slate-500" }, "অ্যাপের চেহারা"),
    React.createElement("div", {
      className: "bg-white rounded-2xl shadow-sm border p-4 space-y-4",
      style: { borderColor: "var(--theme-line, #E2E8F0)" }
    },
      React.createElement("div", null,
        React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-2" }, "ডিসপ্লে মোড (চোখের সুরক্ষা)"),
        React.createElement("div", { className: "grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100", role: "group" },
          DISPLAY_MODES.map(m => React.createElement("button", {
            key: m.id,
            type: "button",
            onClick: () => setDisplayMode(m.id),
            "aria-pressed": displayMode === m.id,
            className: "min-h-[40px] px-1 rounded-lg text-xs font-bold leading-tight transition-colors active:scale-95",
            style: displayMode === m.id
              ? { background: "var(--theme-primary)", color: "#FFFFFF" }
              : { background: "transparent", color: "#5B6B64" }
          }, m.name)))),
      React.createElement("div", null,
        React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-2" }, "থিম কালার"),
        React.createElement("div", { className: "grid grid-cols-3 gap-2" },
          THEME_PRESETS.map(t => {
            const on = themeColor === t.color;
            return React.createElement("button", {
              key: t.id,
              type: "button",
              onClick: () => setThemeColor(t.color),
              title: t.name,
              "aria-pressed": on,
              className: "rounded-xl overflow-hidden text-left border-2 transition-transform active:scale-95",
              style: { background: t.page, borderColor: on ? t.color : "#E4E7E2", boxShadow: on ? "0 0 0 2px " + t.color + "33" : "none" }
            },
              React.createElement("div", { className: "h-6", style: { background: t.color } }),
              React.createElement("div", { className: "flex gap-1 px-2 pt-1.5" }, [t.color, t.accent, t.page].map((c, i) => React.createElement("span", {
                key: i,
                className: "h-1.5 flex-1 rounded-full",
                style: { background: c, border: "1px solid rgba(0,0,0,0.08)" }
              }))),
              React.createElement("div", { className: "px-2 py-1.5 text-[11px] font-bold leading-tight", style: { color: t.color } }, (on ? "✓ " : "") + t.name));
          })))));
  // §Bottom Navigation(2_4 §৯.২) — Public Tools/Settings ট্যাব কখনো Onboarding Gate-এর
  // অধীনে না(auth-status নির্বিশেষে সবসময় accessible), তাই নিচের সব gate-check-এর আগে এই
  // early-return। "family" ট্যাবে(ডিফল্ট) এই ব্লক কখনো fire করে না — নিচের existing
  // gate-logic byte-identical অপরিবর্তিত।
  if (activeTab !== TAB_FAMILY) {
    // §Menu full-page tab(2_4 §৯.৫/2_5 Screen E.1, ১৫ সেপ্টেম্বর ২০২৬):
    // TAB_SETTINGS("মেনু") এখন আর generic PublicToolsPlaceholder না — আগে
    // DashboardHeader.jsx-এর হ্যামবার্গার dropdown-এ যা ছিল(family
    // username/সদস্য-তালিকা/আমন্ত্রণ-লিংক/ডেটা ম্যানেজমেন্ট/ফিডব্যাক/থিম),
    // সেই একই content এখন এখানে full-page হিসেবে render হয়(structural-only
    // move, কোনো logic/condition বদলায়নি — MenuPage.jsx দ্রষ্টব্য)। এই
    // ট্যাব থেকে ট্রিগার হওয়া modal-cluster(Archive/FamilyCodeChoice+
    // Rename/Backup+Import+DriveRestore/Feedback) পূর্বে শুধু family-tab
    // tree-এর ভিতরেই mount হতো(নিচে অপরিবর্তিত রাখা হয়েছে) — তাই এখানে
    // আলাদাভাবে(byte-identical props) mount করা আবশ্যক, নাহলে Menu-ট্যাব
    // থেকে ট্রিগার করা বাটনগুলো কোনো modal-ই দেখাবে না।
    if (activeTab === TAB_SETTINGS) {
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        React.createElement(React.Suspense, { fallback: null },
        React.createElement(MenuPage, {
          isGuestMode: isGuestMode,
          onGuestSignInTap: () => setShowGuestSignIn(true),
          members: members || [],
          selectedId: selectedId,
          setSelectedId: setSelectedId,
          onNavigateHome: () => setActiveTab(TAB_FAMILY),
          entryDirtyRef: entryDirtyRef,
          weeklyDirtyRef: weeklyDirtyRef,
          auth: authModular,
          isAdmin: isAdmin,
          adminUidsList: adminUidsList,
          handleMakeAdmin: handleMakeAdmin,
          handleRemoveAdmin: handleRemoveAdmin,
          handleRemoveMember: handleRemoveMember,
          setAddingMember: setAddingMember,
          copiedCode: copiedCode,
          handleCopyCode: handleCopyCode,
          getFamilyCode: getFamilyCode,
          setShowFamilyCodeChoiceModal: setShowFamilyCodeChoiceModal,
          handleShareInviteLink: handleShareInviteLink,
          setDriveBackupStatus: setDriveBackupStatus,
          setShowBackupOptionsModal: setShowBackupOptionsModal,
          setShowImportOptionsModal: setShowImportOptionsModal,
          setShowArchiveModal: setShowArchiveModal,
          setArchiveYear: setArchiveYear,
          setArchiveMonth0: setArchiveMonth0,
          monthCursor: monthCursor,
          setShowFeedbackModal: setShowFeedbackModal,
          onOpenHomeLayout: isCreatorAuth() ? () => setShowHomeLayout(true) : undefined,
          onOpenPrayerLayout: isCreatorAuth() ? () => setShowPrayerLayout(true) : undefined,
          onOpenAmolLayout: isCreatorAuth() ? () => setShowAmolLayout(true) : undefined,
          onOpenToolsLayout: isCreatorAuth() ? () => setShowToolsLayout(true) : undefined,
          onOpenFieldManager: isCreatorAuth() ? () => setShowFieldManager(true) : undefined,
          onOpenTazkirah: isCreatorAuth() ? () => setShowTazkirah(true) : undefined,
          // পপআপ বার্তা সম্পাদনা: শুধু App Creator(UI-gate; আসল নিরাপত্তা Rules-এর isAppCreator())
          onOpenPopupMessages: isCreatorAuth() ? () => setShowPopupMsgs(true) : undefined,
          themeColorPickerEl: themeColorPickerEl
        })),
        showPopupMsgs && isCreatorAuth() && React.createElement(React.Suspense, { fallback: null }, React.createElement(PopupMessagesScreen, {
          onClose: () => setShowPopupMsgs(false)
        })),
        showTazkirah && isCreatorAuth() && React.createElement(React.Suspense, { fallback: null }, React.createElement(TazkirahManagerScreen, {
          builtins: DAILY_INSPIRATIONS,
          data: tazkirahData,
          onSave: handleSaveTazkirah,
          onClose: () => setShowTazkirah(false)
        })),
        showFieldManager && isCreatorAuth() && React.createElement(React.Suspense, { fallback: null }, React.createElement(FieldManagerScreen, {
          deenFields: DEFAULT_DEEN_FIELDS,
          duniyaFields: DEFAULT_DUNIYA_FIELDS,
          customFields: customFields,
          overrides: fieldOverrides,
          onSave: handleSaveFieldManager,
          onClose: () => setShowFieldManager(false)
        })),
        // নেভ-ট্যাব কাস্টমাইজ(২ নভেম্বর ২০২৬, owner-approved): সময়সূচি/আমল/সহায়িকা — একই স্ক্রিন, ভিন্ন tab।
        ...[["prayer", showPrayerLayout, setShowPrayerLayout], ["amol", showAmolLayout, setShowAmolLayout], ["tools", showToolsLayout, setShowToolsLayout]].map(([tab, shown, setShown]) =>
          shown && isCreatorAuth() && React.createElement(React.Suspense, { key: "tablayout-" + tab, fallback: null }, React.createElement(TabLayoutScreen, {
            tab: tab,
            member: designSrc,
            onSave: async ({ order, hidden }) => {
              const nextTab = { ...(designSrc.tabLayout || {}), [tab + "Order"]: order.map(String), [tab + "Hidden"]: hidden.map(String) };
              await saveDesignPart("tabLayout", nextTab);
              setDesign(d => ({ ...(d || {}), tabLayout: nextTab }));
            },
            onClose: () => setShown(false)
          }))
        ),
        showHomeLayout && isCreatorAuth() && React.createElement(React.Suspense, { fallback: null }, React.createElement(HomeLayoutScreen, {
          member: designSrc,
          onSave: async layout => {
            const next = {
              entry: layout.entry.map(c => ({ id: c.id, visible: c.visible, fold: c.fold })),
              below: layout.below.map(c => ({ id: c.id, visible: c.visible, fold: c.fold }))
            };
            await saveDesignPart("homeLayout", next);
            setDesign(d => ({ ...(d || {}), homeLayout: next }));
          },
          onClose: () => setShowHomeLayout(false)
        })),
        React.createElement(React.Suspense, { fallback: null }, React.createElement(ArchiveModal, {show: showArchiveModal, onClose: () => setShowArchiveModal(false), archiveMonth0, setArchiveMonth0, archiveYear, setArchiveYear, BN_MONTHS, toBn, handleGoToArchive})),
        React.createElement(FamilyCodeChoiceModal, {
          show: showFamilyCodeChoiceModal,
          onClose: () => setShowFamilyCodeChoiceModal(false),
          isAdmin,
          setRenameFamCodeInput,
          setShowRenameFamilyCodeModal
        }),
        React.createElement(RenameFamilyCodeModal, {
          show: showRenameFamilyCodeModal,
          onClose: () => setShowRenameFamilyCodeModal(false),
          showRenameChangeForm,
          setShowRenameChangeForm,
          renameFamCodeInput,
          setRenameFamCodeInput,
          renameConfirmInput,
          setRenameConfirmInput,
          renameFamCodeBusy,
          renameCodeRevealed,
          setRenameCodeRevealed,
          getFamilyCode,
          handleRenameFamilyCode,
          FAMILY_CODE_MIN_LENGTH
        }),
        React.createElement(React.Suspense, { fallback: null }, React.createElement(BackupOptionsModal, {show: showBackupOptionsModal, onClose: () => setShowBackupOptionsModal(false), driveBackupStatus, driveBackupBusy, handleDriveBackupClick, isGoogleLinked, handleExportData, handleBothBackupClick})),
        /*#__PURE__*/React.createElement("input", {
          ref: importFileInputRef,
          type: "file",
          accept: ".json,application/json,text/plain,text/json,application/octet-stream",
          onChange: e => {
            handleImportData(e);
            setShowImportOptionsModal(false);
          },
          className: "hidden"
        }),
        React.createElement(React.Suspense, { fallback: null }, React.createElement(ImportOptionsModal, {show: showImportOptionsModal, onClose: () => setShowImportOptionsModal(false), handleManualDriveRestoreClick, driveRestoreChecking, importFileInputRef})),
        React.createElement(React.Suspense, { fallback: null }, React.createElement(DriveRestoreModal, {show: showDriveRestoreModal, candidate: driveRestoreCandidate, onClose: () => setShowDriveRestoreModal(false), driveRestoreBusy, handleConfirmDriveRestore})),
        React.createElement(FeedbackModal, {
          feedbackMsg: feedbackMsg,
          feedbackSending: feedbackSending,
          feedbackStatus: feedbackStatus,
          handleSendFeedback: handleSendFeedback,
          setFeedbackMsg: setFeedbackMsg,
          setFeedbackStatus: setFeedbackStatus,
          setShowFeedbackModal: setShowFeedbackModal,
          showFeedbackModal: showFeedbackModal
        }),
        // §Guest-mode sign-in popover — family-tab tree-এর একই block(নিচে,
        // byte-identical) থেকে reuse, Menu-ট্যাবেও(guest অবস্থায়)
        // "🔵 Google দিয়ে সাইন-ইন করুন" ট্যাপে প্রযোজ্য হতে হবে।
        showGuestSignIn && /*#__PURE__*/React.createElement(React.Fragment, null,
          /*#__PURE__*/React.createElement("div", {
            className: "fixed inset-0 bg-black/40 z-[60]",
            onClick: () => setShowGuestSignIn(false)
          }),
          /*#__PURE__*/React.createElement("div", {
            className: "fixed inset-x-4 top-24 z-[70] max-w-xs mx-auto bg-white rounded-2xl shadow-xl border border-slate-100"
          }, /*#__PURE__*/React.createElement(GoogleSignInGate, { onSuccess: handleGuestSignInSuccess }))
        ),
        React.createElement(BottomNav, { activeTab: activeTab, onChange: setActiveTab })
      );
    }
    // §Public Tools Phase A, item ২: TAB_PRAYER_TIMES এখন actual PrayerTimes.jsx
    // render করে(lazy+Suspense, উপরের import-নোট দ্রষ্টব্য) — PublicToolsPlaceholder
    // fallback শুধু Suspense-loading window-এ দেখায়(chunk লোড হওয়া পর্যন্ত), তারপর
    // actual UI বসে। TAB_AMOL এখন AmolHub, TAB_TOOLS এখন PublicToolsShell(দুটোই নিচে)।
    if (activeTab === TAB_PRAYER_TIMES) {
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        React.createElement(React.Suspense, { fallback: React.createElement(PublicToolsPlaceholder, { title: "সময়সূচি" }) },
          React.createElement(PrayerTimes, { onOpenHome: () => setActiveTab(TAB_FAMILY), layout: designSrc.prayerLayout || null, tabLayout: designSrc.tabLayout || null })
        ),
        React.createElement(BottomNav, { activeTab: activeTab, onChange: setActiveTab })
      );
    }
    if (activeTab === TAB_AMOL) {
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        React.createElement(React.Suspense, { fallback: React.createElement(PublicToolsPlaceholder, { title: "আমল" }) },
          React.createElement(AmolHub, { tabLayout: designSrc.tabLayout || null })
        ),
        React.createElement(BottomNav, { activeTab: activeTab, onChange: setActiveTab })
      );
    }
    if (activeTab === TAB_TOOLS) {
      return /*#__PURE__*/React.createElement(React.Fragment, null,
        React.createElement(React.Suspense, { fallback: React.createElement(PublicToolsPlaceholder, { title: "সহায়িকা" }) },
          React.createElement(PublicToolsShell, { tabLayout: designSrc.tabLayout || null })
        ),
        React.createElement(BottomNav, { activeTab: activeTab, onChange: setActiveTab })
      );
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null,
      React.createElement(PublicToolsPlaceholder, { title: "" }),
      React.createElement(BottomNav, { activeTab: activeTab, onChange: setActiveTab })
    );
  }
  // §Old-code cleanup Phase 4(১৫ সেপ্টেম্বর ২০২৬, owner-approved): পুরনো
  // Onboarding Gate early-return(OnboardingBridge render) সম্পূর্ণ সরানো
  // হলো — condition-এর তিনটা অংশই(onbStep/myMemberRequestStatus==="pending"/
  // needsOwnMemberProfile) নিশ্চিতভাবে কখনো true হতে পারত না(§উপরের ব্যাখ্যা)।
  // Access Approval Gate — Step 4: pending accessRequest থাকলে সদস্য/এন্ট্রি
  // UI না দেখিয়ে শুধু এই স্ক্রিন দেখানো হচ্ছে। "রিফ্রেশ করুন" বাটনে সরাসরি
  // page reload — admin approve করলে পরের বার boot flow পাশ করে যাবে।
  if (accessPending) return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-6 text-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-semibold",
    style: { color: "var(--theme-primary)", fontFamily: "'Noto Serif Bengali', serif" }
  }, "অনুমোদনের অপেক্ষায়"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 max-w-xs"
  }, "এই পরিবারের ডেটা দেখতে এডমিনের অনুমোদন প্রয়োজন। অনুমোদন হলে এই পেজ রিফ্রেশ করুন।"), /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 rounded-2xl border shadow-sm bg-white",
    style: { color: "var(--theme-primary)" },
    onClick: () => window.location.reload()
  }, "রিফ্রেশ করুন"));
  if (printMode) return /*#__PURE__*/React.createElement(React.Suspense, {
    fallback: /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex items-center justify-center bg-[#F4F7F1]"
    }, /*#__PURE__*/React.createElement(Loader2, {
      className: "animate-spin",
      color: "var(--theme-primary)",
      size: 32
    }))
  }, React.createElement(PrintReport, {
    allFields: allFields,
    meetingState: meetingState,
    monthCursor: monthCursor,
    monthEntries: monthEntries,
    monthStats: monthStats,
    migrationState: migrationState,
    locked: isLockedForThisDevice,
    printMode: printMode,
    selectedMember: selectedMember,
    setPrintMode: setPrintMode,
    weekly: weekly,
    weeklyRowCount: weeklyRowCount,
    BN_MONTHS: BN_MONTHS,
    dailyScore: dailyScore,
    fieldApplies: fieldApplies,
    fieldPercent: fieldPercent,
    getWeekRanges: getWeekRanges,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    pad2: pad2,
    toBn: toBn
  }));
  const total = monthStats.total;
  const firstOfMonth = new Date(monthCursor.year, monthCursor.month0, 1);
  const leadBlanks = firstOfMonth.getDay();
  // (themeColorPickerEl এখন উপরে, early-return-এর আগে define করা হয়েছে — bug-fix
  // নোট দ্রষ্টব্য। এখানে শুধু ব্যবহার হচ্ছে, নতুন declaration নেই।)
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen pb-20 bg-[#F4F7F1]"
  }, /*#__PURE__*/React.createElement(DashboardHeader, {
    activeInviteToken: activeInviteToken,
    addingMember: addingMember,
    adminUidsList: adminUidsList,
    copiedCode: copiedCode,
    entryDirtyRef: entryDirtyRef,
    firstAdminUid: firstAdminUid,
    isGuestMode: isGuestMode,
    onGuestSignInTap: () => setShowGuestSignIn(true),
    handleAddMember: handleAddMember,
    handleChangeGoogleAccount: handleChangeGoogleAccount,
    handleCopyCode: handleCopyCode,
    handleFullLogout: handleFullLogout,
    handleEditOwnProfile: handleEditOwnProfile,
    handleLeaveFamily: handleLeaveFamily,
    handleMakeAdmin: handleMakeAdmin,
    handleRemoveAdmin: handleRemoveAdmin,
    handleRemoveMember: handleRemoveMember,
    handleRevokeInviteLink: handleRevokeInviteLink,
    handleSelfDemote: handleSelfDemote,
    handleShareInviteLink: handleShareInviteLink,
    isAdmin: isAdmin,
    isMenuOpen: isMenuOpen,
    members: members,
    monthCursor: monthCursor,
    newGender: newGender,
    newMemberEmail: newMemberEmail,
    newName: newName,
    notifications: notifications,
    selectedId: selectedId,
    selectedMember: selectedMember,
    setAddingMember: setAddingMember,
    setArchiveMonth0: setArchiveMonth0,
    setArchiveYear: setArchiveYear,
    setDriveBackupStatus: setDriveBackupStatus,
    setIsMenuOpen: setIsMenuOpen,
    setNewGender: setNewGender,
    setNewMemberEmail: setNewMemberEmail,
    setNewName: setNewName,
    setNotifications: setNotifications,
    setSelectedId: setSelectedId,
    setShowAccountMenu: setShowAccountMenu,
    setShowArchiveModal: setShowArchiveModal,
    setShowBackupOptionsModal: setShowBackupOptionsModal,
    setShowFamilyCodeChoiceModal: setShowFamilyCodeChoiceModal,
    setShowFeedbackModal: setShowFeedbackModal,
    setShowGoogleAccountModal: setShowGoogleAccountModal,
    setShowImportOptionsModal: setShowImportOptionsModal,
    setShowNotifPanel: setShowNotifPanel,
    setShowProfileDropdown: setShowProfileDropdown,
    showAccountMenu: showAccountMenu,
    showNotifPanel: showNotifPanel,
    showProfileDropdown: showProfileDropdown,
    streak: streak,
    themeColorPickerEl: themeColorPickerEl,
    weeklyDirtyRef: weeklyDirtyRef,
    AppLogo: AppLogo,
    BN_MONTHS: BN_MONTHS,
    auth: authModular,
    db: dbModular,
    getFamilyCode: getFamilyCode,
    getFamilyId: getFamilyId,
    isGoogleLinked: isGoogleLinked,
    toBn: toBn
  }), /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl mx-auto"
  }, React.createElement(DailyEntrySection, {
    designSrc: designSrc,
    codeChangeNotice: codeChangeNotice,
    customFields: customFieldsView,
    onSaveTasks: handleSaveCustomTasks,
    dismissMonthlyReminder: dismissMonthlyReminder,
    dismissWeeklyReminder: dismissWeeklyReminder,
    entry: entry,
    entryDirtyRef: entryDirtyRef,
    handleDateTouchEnd: handleDateTouchEnd,
    handleDateTouchStart: handleDateTouchStart,
    handleSave: handleSave,
    isLockedForThisDevice: isLockedForThisDevice,
    monthlyReminderBanner: monthlyReminderBanner,
    openHistoryModal: openHistoryModal,
    recoveryMessage: recoveryMessage,
    savedTick: savedTick,
    saving: saving,
    selectedMember: selectedMember,
    setCodeChangeNotice: setCodeChangeNotice,
    setRecoveryMessage: setRecoveryMessage,
    setShowExcuseInfoModal: setShowExcuseInfoModal,
    setViewDate: setViewDate,
    updateExcuse: updateExcuse,
    updateField: updateField,
    viewDate: viewDate,
    weeklyReminderBanner: weeklyReminderBanner,
    BN_MONTHS: BN_MONTHS,
    DEFAULT_DEEN_FIELDS: deenFieldsView,
    DEFAULT_DUNIYA_FIELDS: duniyaFieldsView,
    // §Part B Phase ২(category-accordion, ১৫ সেপ্টেম্বর ২০২৬): নতুন prop-দুটো —
    // DEEN_CATEGORY_GROUPS(field→category mapping) ও dailyScore(single-entry
    // multi-field aggregate ratio, appHelpers.js-এ আগে থেকেই বিদ্যমান, এতদিন শুধু
    // calculateStreak()-এ ব্যবহৃত হতো) — ক্যাটাগরি-হেডারের %-badge গণনায়। কোনো নতুন
    // calculation-logic লেখা হয়নি, existing dailyScore()-ই reuse(owner-approved,
    // ওজর/N/A ফিল্ড dailyScore()-এর ভিতরেই বাদ পড়ে/গড়ে বাদ যায় — fieldPercent()-এর
    // মাসিক-লজিকের সাথে সামঞ্জস্যপূর্ণ একই নীতি)।
    DEEN_CATEGORY_GROUPS: DEEN_CATEGORY_GROUPS,
    dailyScore: dailyScore,
    scoreColor: scoreColor,
    dateKey: dateKey,
    formatBnDateTime: formatBnDateTime,
    getDailyInspiration: d => pickInspiration(d, DAILY_INSPIRATIONS, tazkirahData),
    getHijriDate: getHijriDate,
    isFutureDate: isFutureDate,
    toBn: toBn,
    fieldApplies: fieldApplies,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    streak: streak,
    yesterdayMissing: yesterdayMissing,
    yesterdayEntry: yesterdayEntry
  }), ...renderHomeBelow(designSrc, {
    streak: () => /*#__PURE__*/React.createElement(StreakCard, {
    streak: streak,
    toBn: toBn,
    // §Stable "আজকের অগ্রগতি"(১৯ সেপ্টেম্বর ২০২৬, owner-রিপোর্টেড bug): আগে
    // রাত ১২টার পর(আজকের এন্ট্রি এখনো সেভ না হলে) todayPercent null হয়ে
    // পুরো কার্ডই অদৃশ্য হয়ে যেত। Fix: আজকের এন্ট্রি না থাকলে গতকালের এন্ট্রি
    // fallback হিসেবে দেখানো হয়("গতকালের অগ্রগতি", তুলনা তার আগের দিনের
    // সাথে) — নতুন কোনো Firestore read/listener লাগেনি, existing
    // monthEntries-ই যথেষ্ট। মাসের ১ তারিখে "গতকাল" আগের মাসে পড়ে(load করা
    // নেই) — সেই edge-case-এ আগের existing limitation অনুযায়ীই silently
    // card hidden থাকে(নতুন cross-month fetch যোগ করা হয়নি, over-engineering
    // এড়াতে)।
    ...(() => {
      const now_ = new Date();
      const isCurrentMonth = now_.getFullYear() === monthCursor.year && now_.getMonth() === monthCursor.month0;
      if (!isCurrentMonth) return { mode: "today", primaryPercent: null, comparisonPercent: null };
      const scoreOf_ = (d) => {
        if (d < 1) return null;
        const s = dailyScore(monthEntries[pad2(d)], selectedMember, allFields);
        return s === null || s === undefined ? null : Math.round(s * 100);
      };
      const todayNum_ = now_.getDate();
      const todayPct_ = scoreOf_(todayNum_);
      if (todayPct_ !== null) {
        return { mode: "today", primaryPercent: todayPct_, comparisonPercent: scoreOf_(todayNum_ - 1) };
      }
      const yesterdayPct_ = scoreOf_(todayNum_ - 1);
      if (yesterdayPct_ !== null) {
        return { mode: "yesterday", primaryPercent: yesterdayPct_, comparisonPercent: scoreOf_(todayNum_ - 2) };
      }
      return { mode: "today", primaryPercent: null, comparisonPercent: null };
    })()
  }),
    insight: () => /*#__PURE__*/React.createElement(DailyInsightCard, {
    insight: dailyInsight,
    toBn: toBn
  }),
    tomorrow: () => /*#__PURE__*/React.createElement(TomorrowPreviewCard, {
    toBn: toBn,
    todaySaved: (() => { const n = new Date(); return n.getFullYear() === monthCursor.year && n.getMonth() === monthCursor.month0 ? !!(monthEntries && monthEntries[pad2(n.getDate())]) : true; })()
  }),
    focus: () => /*#__PURE__*/React.createElement(TomorrowFocusPicker, {
    member: selectedMember,
    allFields: allFields,
    tomorrowKey: tomorrowKey,
    suggestedFieldKey: suggestedFocusKey,
    suggestedTodayKey: suggestedTodayFocusKey,
    todaySaved: (() => { const n = new Date(); return n.getFullYear() === monthCursor.year && n.getMonth() === monthCursor.month0 ? !!(monthEntries && monthEntries[pad2(n.getDate())]) : true; })(),
    onSave: (focus) => saveTomorrowFocus(migrationState, selectedId, focus)
  }),
    monthly: () => /*#__PURE__*/React.createElement(SwipeMonth, { onShift: swipeShiftMonth, monthCursor: monthCursor, label: swipeMonthLabel }, /*#__PURE__*/React.createElement(MonthlyOverviewSection, {
    allFields: allFields,
    entryDirtyRef: entryDirtyRef,
    leadBlanks: leadBlanks,
    meetingDirtyRef: NO_DIRTY,
    monthCursor: monthCursor,
    monthEntries: monthEntries,
    monthStats: monthStats,
    selectedMember: selectedMember,
    setMonthCursor: setMonthCursor,
    setMonthRefreshKey: setMonthRefreshKey,
    setPrintMode: setPrintMode,
    setShowMonthlyInfoModal: setShowMonthlyInfoModal,
    setViewDate: setViewDate,
    total: total,
    weeklyDirtyRef: weeklyDirtyRef,
    BN_MONTHS: BN_MONTHS,
    BN_WEEKDAYS: BN_WEEKDAYS,
    dailyScore: dailyScore,
    fieldPercent: fieldPercent,
    pad2: pad2,
    scoreColor: scoreColor,
    toBn: toBn,
    streak: streak,
    // §Layout reposition(১৭ সেপ্টেম্বর ২০২৬, owner-অনুরোধ): TopBottomActivityRanking
    // আগে আলাদা sibling card হিসেবে Monthly Overview-এর উপরে ছিল — এখন এখানে
    // prop হিসেবে দেওয়া হচ্ছে, MonthlyOverviewSection নিজে এটাকে stats-row-এর
    // নিচে ও heatmap grid-এর উপরে বসায়(DashboardSections.jsx দ্রষ্টব্য)।
    // TopBottomActivityRanking component-এর নিজস্ব calculation+presentation
    // সম্পূর্ণ অপরিবর্তিত(props হুবহু আগেরই) — শুধু render-tree-এর অবস্থান বদলেছে।
    rankingSlot: /*#__PURE__*/React.createElement(TopBottomActivityRanking, {
      monthEntries: monthEntries,
      totalDays: total,
      member: selectedMember,
      allFields: allFields,
      fieldPercent: fieldPercent,
      pad2: pad2,
      toBn: toBn,
      monthCursor: monthCursor
    })
  })),
    monthlyReport: fold => /*#__PURE__*/React.createElement(SwipeMonth, { onShift: reviewShiftMonth, monthCursor: reviewCursor, label: swipeMonthLabel }, /*#__PURE__*/React.createElement(MonthlyReportSection, {
    fold: fold,
    onShiftMonth: reviewShiftMonth,
    migrationState: migrationState,
    memberId: selectedId,
    member: selectedMember,
    locked: isLockedForThisDevice,
    monthCursor: reviewCursor,
    monthEntries: reviewEntries,
    allFields: allFields,
    fieldApplies: fieldApplies,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    dailyScore: dailyScore,
    toBn: toBn,
    BN_MONTHS: BN_MONTHS,
    BN_WEEKDAYS: BN_WEEKDAYS,
    onSendToMeeting: handleSendToMeeting
  })),
    trend: fold => /*#__PURE__*/React.createElement(SwipeMonth, { onShift: trendShiftMonth, monthCursor: trendCursor, label: swipeMonthLabel }, /*#__PURE__*/React.createElement(TrendReviewSection, {
    fold: fold,
    onShiftMonth: trendShiftMonth,
    migrationState: migrationState,
    memberId: selectedId,
    member: selectedMember,
    locked: isLockedForThisDevice,
    monthCursor: trendCursor,
    monthEntries: trendEntries,
    allFields: allFields,
    fieldApplies: fieldApplies,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    dailyScore: dailyScore,
    toBn: toBn,
    BN_MONTHS: BN_MONTHS
  })),
    weekly: fold => /*#__PURE__*/React.createElement(SwipeMonth, { onShift: reviewShiftMonth, monthCursor: reviewCursor, label: swipeMonthLabel }, /*#__PURE__*/React.createElement(WeeklyReviewSection, {
    fold: fold,
    onShiftMonth: reviewShiftMonth,
    migrationState: migrationState,
    memberId: selectedId,
    member: selectedMember,
    locked: isLockedForThisDevice,
    monthCursor: reviewCursor,
    monthEntries: reviewEntries,
    allFields: allFields,
    fieldApplies: fieldApplies,
    isExcused: isExcused,
    isFieldExcusable: isFieldExcusable,
    dailyScore: dailyScore,
    toBn: toBn,
    BN_MONTHS: BN_MONTHS
  })),
    meeting: fold => /*#__PURE__*/React.createElement(SwipeMonth, { onShift: meetingShiftMonth, monthCursor: meetingCursor, label: swipeMonthLabel }, /*#__PURE__*/React.createElement(MeetingMinutesSection, {
    fold: fold,
    addMeetingRow: addMeetingRow,
    handleSaveMeeting: handleSaveMeeting,
    meetingSavedTick: meetingSavedTick,
    meetingState: meetingState,
    monthCursor: meetingCursor,
    removeMeetingRow: removeMeetingRow,
    savingMeeting: savingMeeting,
    setShowMeetingInfoModal: setShowMeetingInfoModal,
    updateMeetingRow: updateMeetingRow,
    BN_MONTHS: BN_MONTHS,
    toBn: toBn,
    setMonthCursor: setMeetingCursor,
    setMonthRefreshKey: setMonthRefreshKey,
    weeklyDirtyRef: NO_DIRTY,
    meetingDirtyRef: meetingDirtyRef
  }))
  })), React.createElement(React.Suspense, { fallback: null }, React.createElement(ArchiveModal, {show: showArchiveModal, onClose: () => setShowArchiveModal(false), archiveMonth0, setArchiveMonth0, archiveYear, setArchiveYear, BN_MONTHS, toBn, handleGoToArchive})), React.createElement(FamilyCodeChoiceModal, {
    show: showFamilyCodeChoiceModal,
    onClose: () => setShowFamilyCodeChoiceModal(false),
    isAdmin,
    setRenameFamCodeInput,
    setShowRenameFamilyCodeModal
  }), React.createElement(CreateNewFamilyModal, {
    show: showCreateNewFamilyModal,
    onClose: () => setShowCreateNewFamilyModal(false),
    newFamCodeInput,
    setNewFamCodeInput,
    newFamCodeBusy,
    handleCreateNewFamily
  }), React.createElement(JoinFamilyModal, {
    show: showJoinFamilyModal,
    onClose: () => setShowJoinFamilyModal(false),
    joinFamCodeInput,
    setJoinFamCodeInput,
    joinFamCodeBusy,
    handleJoinExistingFamily
  }), React.createElement(RenameFamilyCodeModal, {
    show: showRenameFamilyCodeModal,
    onClose: () => setShowRenameFamilyCodeModal(false),
    showRenameChangeForm,
    setShowRenameChangeForm,
    renameFamCodeInput,
    setRenameFamCodeInput,
    renameConfirmInput,
    setRenameConfirmInput,
    renameFamCodeBusy,
    renameCodeRevealed,
    setRenameCodeRevealed,
    getFamilyCode,
    handleRenameFamilyCode,
    FAMILY_CODE_MIN_LENGTH
  }), googleAccountModalNode,

  // §Old-code cleanup Phase 1(১১ সেপ্টেম্বর ২০২৬, owner-approved): MemberKeyModal
  // render(key view/copy/change) ও claimKeyModalNode(claim modal) সরানো হয়েছে —
  // MemberKeyModal.jsx already-dead ছিল(কোনো live trigger ছিল না) ও
  // ClaimKeyModal export এই সেশনে সরানো হয়েছে(MemberOnboardingModals.jsx)।
  // §Old-code cleanup Phase 2(১১ সেপ্টেম্বর ২০২৬, owner-approved):
  // AccessRequestsModal(কোনো live trigger ছিল না) ও becomeMemberModalNode+
  // MemberRequestsModal("সদস্য হোন" submit+admin-approve — approve-branch
  // google-only family-তে Rules-blocked) সরানো হয়েছে।

  React.createElement(React.Suspense, { fallback: null }, React.createElement(BackupOptionsModal, {show: showBackupOptionsModal, onClose: () => setShowBackupOptionsModal(false), driveBackupStatus, driveBackupBusy, handleDriveBackupClick, isGoogleLinked, handleExportData, handleBothBackupClick})), /*#__PURE__*/React.createElement("input", {
    ref: importFileInputRef,
    type: "file",
    accept: ".json,application/json,text/plain,text/json,application/octet-stream",
    onChange: e => {
      handleImportData(e);
      setShowImportOptionsModal(false);
    },
    className: "hidden"
  }), React.createElement(React.Suspense, { fallback: null }, React.createElement(ImportOptionsModal, {show: showImportOptionsModal, onClose: () => setShowImportOptionsModal(false), handleManualDriveRestoreClick, driveRestoreChecking, importFileInputRef})), React.createElement(React.Suspense, { fallback: null }, React.createElement(DriveRestoreModal, {show: showDriveRestoreModal, candidate: driveRestoreCandidate, onClose: () => setShowDriveRestoreModal(false), driveRestoreBusy, handleConfirmDriveRestore})), React.createElement(DeleteAccountWarningModal, {
    handleDeleteGoogleAccount: handleDeleteGoogleAccount,
    setShowDeleteAccountWarning: setShowDeleteAccountWarning,
    showDeleteAccountWarning: showDeleteAccountWarning
  }), /*#__PURE__*/React.createElement(MemberInfoModal, { show: showMemberInfoModal, onClose: () => setShowMemberInfoModal(false) }), /*#__PURE__*/React.createElement(ExcuseInfoModal, { show: showExcuseInfoModal, onClose: () => setShowExcuseInfoModal(false) }), /*#__PURE__*/React.createElement(WeeklyInfoModal, { show: showWeeklyInfoModal, onClose: () => setShowWeeklyInfoModal(false) }), /*#__PURE__*/React.createElement(MeetingInfoModal, { show: showMeetingInfoModal, onClose: () => setShowMeetingInfoModal(false) }), /*#__PURE__*/React.createElement(MonthlyOverviewInfoModal, { show: showMonthlyInfoModal, onClose: () => setShowMonthlyInfoModal(false) }), /*#__PURE__*/React.createElement(CoachMarkModal, { show: showCoachMark, onClose: () => setShowCoachMark(false) }), React.createElement(FeedbackModal, {
    feedbackMsg: feedbackMsg,
    feedbackSending: feedbackSending,
    feedbackStatus: feedbackStatus,
    handleSendFeedback: handleSendFeedback,
    setFeedbackMsg: setFeedbackMsg,
    setFeedbackStatus: setFeedbackStatus,
    setShowFeedbackModal: setShowFeedbackModal,
    showFeedbackModal: showFeedbackModal
  }), /*#__PURE__*/React.createElement(HistoryModal, { show: showHistoryModal, onClose: () => setShowHistoryModal(false), loadingHistory, historyList, restoreHistoryVersion, formatBnDateTime }), React.createElement(MilestoneToast, {
    milestoneToast: milestoneToast,
    setMilestoneToast: setMilestoneToast,
    toBn: toBn
  }),
  /*#__PURE__*/React.createElement(WeeklySummaryToast, {
    weeklySummaryToast: weeklySummaryToast,
    setWeeklySummaryToast: setWeeklySummaryToast,
    toBn: toBn
  }),
  // §Guest-mode sign-in popover(১২ সেপ্টেম্বর ২০২৬) — profile-pill/মেনু/যেকোনো
  // write-action(updateField/updateExcuse/updateWeekly/meeting-actions)
  // guest অবস্থায় ট্যাপ করলে এটা খোলে(existing GoogleSignInGate reuse)।
  showGuestSignIn && /*#__PURE__*/React.createElement(React.Fragment, null,
    /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black/40 z-[60]",
      onClick: () => setShowGuestSignIn(false)
    }),
    /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-x-4 top-24 z-[70] max-w-xs mx-auto bg-white rounded-2xl shadow-xl border border-slate-100"
    }, /*#__PURE__*/React.createElement(GoogleSignInGate, { onSuccess: handleGuestSignInSuccess }))
  ),
  React.createElement(BottomNav, { activeTab: activeTab, onChange: setActiveTab }));
}

// --- Google Account Linking (fully optional) ---
// Default flow stays zero-login: every device auto-signs-in anonymously, no
// screen, no friction (see bottom of file). A person MAY optionally link
// their anonymous session to a real Google account from the menu. Linking
// (not switching) keeps the exact same Firebase Auth uid, so any members
// already claimed on this device stay claimed — nothing about existing data
// changes. The benefit of linking: that uid becomes tied to the Google
// account instead of this one device/browser cache, so signing in with the
// same Google account on a different device (or after clearing this
// device's cache) recovers the same identity — no re-claiming needed.
//
// Redirect-based flows survive a full page reload, so any pending
// action/result is remembered across that reload via localStorage.
const googleProvider = new GoogleAuthProvider();
function linkGoogleAccount() {
  return linkWithPopup(authModular.currentUser, googleProvider);
}
function unlinkGoogleAccount() {
  return unlink(authModular.currentUser, "google.com");
}


function mountApp() {
  // §Guest-mode consolidation(১২ সেপ্টেম্বর ২০২৬, owner-approved) — আগে এখানে
  // localStorage(family_id+family_code)-এর উপস্থিতি অনুযায়ী দুইটা সম্পূর্ণ
  // ভিন্ন component(App vs আলাদা landing-gate root) render হতো। এখন App()
  // নিজেই ভিতরে isGuestMode(auth.currentUser + localStorage উভয় চেক করে)
  // দিয়ে guest/member উভয় অবস্থা সামলায় — একই component, একই root,
  // কোনো আলাদা "landing page" নেই(2_4 §২-এর মূল Core Decision অনুযায়ী:
  // "App খুললেই Main Page — কোনো Onboarding Gate/auth-check নেই")। তাই
  // এখানে branching সরিয়ে সবসময় সরাসরি App() render করা হচ্ছে।
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container);
  // GoogleRelinkGate App()-এর বাইরে: মেইল-বদলের মাঝপথের রিকভারি-পর্দা App-এর কোনো early-return-এ ঢাকা পড়ে না।
  root.render(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(App, null)), /*#__PURE__*/React.createElement(GoogleRelinkGate, null)));
}

let appMounted = false;
function bootOnce() {
  if (appMounted) return;
  appMounted = true;
  mountApp();
}
const unsubscribeAuth = onAuthStateChanged(authModular, user => {
  unsubscribeAuth();
  bootOnce();
});