// A4 G1 — Notification panel, extracted verbatim from legacy App(). Structural-only:
// show*/setShow* state -> {show, onClose} props; notifications state, db/getFamilyId
// globals, and cross-feature setters/handlers passed through as props (state/logic
// ownership stays in App()). JSX + inline Firestore calls unchanged (moved as-is).
import { Trash } from "./icons.jsx";

export function NotificationPanel({
  show,
  onClose,
  notifications,
  setNotifications,
  setShowMemberRequestsModal,
  loadPendingMemberRequests,
  db,
  getFamilyId
}) {
  return show && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40",
    onClick: () => onClose()
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-slate-800 text-xs max-h-72 overflow-y-auto"
  }, notifications.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 text-slate-400 text-center"
  }, "কোনো নতুন নোটিফিকেশন নেই") : /*#__PURE__*/React.createElement(React.Fragment, null, notifications.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    className: "px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => {
      db.collection("families").doc(getFamilyId())
        .collection("notifications").doc(n.id)
        .update({ read: true }).catch(() => {});
      if (n.type === "member_request") {
        onClose();
        setShowMemberRequestsModal(true);
        loadPendingMemberRequests();
      }
    },
    className: "flex-1 cursor-pointer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-slate-700"
  }, n.message), n.createdAt && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 mt-0.5"
  }, new Date(n.createdAt).toLocaleString("bn-BD"))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      db.collection("families").doc(getFamilyId())
        .collection("notifications").doc(n.id)
        .delete().catch(() => {});
      setNotifications(prev => prev.filter(x => x.id !== n.id));
    },
    className: "shrink-0 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors",
    title: "ডিলিট করুন"
  }, /*#__PURE__*/React.createElement(Trash, { size: 12 })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      const all = notifications;
      if (all.length === 0) return;
      const batch = db.batch();
      all.forEach(n => {
        batch.delete(db.collection("families").doc(getFamilyId()).collection("notifications").doc(n.id));
      });
      batch.commit().catch(() => {});
      setNotifications([]);
    },
    className: "w-full mt-1 px-4 py-2 text-center text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
  }, "সব মুছুন"))));
}
