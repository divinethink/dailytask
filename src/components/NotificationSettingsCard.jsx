// §Notification Settings card (১৫ নভেম্বর ২০২৬, owner-requested) — মেনুতে সদস্যের নিজের
// রিমাইন্ডার চালু/বন্ধ। এখন শুধু সেটিং সংরক্ষণ (প্রতি-ডিভাইস, notifPrefs.js); আসল নোটিফিকেশন
// অ্যান্ড্রয়েড অ্যাপ ধাপে যুক্ত হবে। Firestore/rules/বিদ্যমান ফিচার অপরিবর্তিত।
import { Icon, ClockIcon, UsersIcon } from "./icons.jsx";
import { PRAYER_IDS, SPECIAL_IDS, countEnabled, loadNotifPrefs, saveNotifPrefs } from "../legacy/notifPrefs.js";

const h = React.createElement;
const CARD = "bg-white rounded-2xl shadow-sm border overflow-hidden";
const LINE = { borderColor: "var(--theme-line, #E2E8F0)" };
const CHIP_BG = { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)" };
const BN = "০১২৩৪৫৬৭৮৯";
const bn = s => String(s).replace(/[0-9]/g, d => BN[d]);

const PRAYER_L = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
const LEAD_L = { start: "ওয়াক্ত শুরুতে", min10: "১০ মিনিট আগে", jamaat: "জামায়াতের সময়" };
const SPECIAL_L = { jumuah: "জুমা", ashura: "আশুরা", arafah: "আরাফাহ", qadr: "শবে কদর", barat: "শবে বরাত", eid: "ঈদ", bidh: "আইয়ামে বীজ" };
const MEETING_L = { "1": "১ম", "15": "১৫ই", "25": "২৫শে", last: "শেষ দিন" };
const timeL = t => {
  const [hh, mm] = t.split(":").map(Number);
  const hr = hh % 12 === 0 ? 12 : hh % 12;
  return (hh >= 20 ? "রাত " : hh >= 17 ? "সন্ধ্যা " : "") + bn(hr) + ":" + bn(String(mm).padStart(2, "0"));
};

const BellIcon = ({ size = 17 }) => h(Icon, { size }, h("path", { d: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" }), h("path", { d: "M13.7 21a2 2 0 0 1-3.4 0" }));
const MoonIcon = ({ size = 17 }) => h(Icon, { size }, h("path", { d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" }));
const NoteIcon = ({ size = 17 }) => h(Icon, { size }, h("path", { d: "M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z" }), h("path", { d: "M8 9h8M8 13h6" }));
const CheckListIcon = ({ size = 17 }) => h(Icon, { size }, h("path", { d: "M9 11l3 3 8-8" }), h("path", { d: "M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" }));

function Switch({ on, onChange, label }) {
  return h("button", {
    type: "button", role: "switch", "aria-checked": on, "aria-label": label,
    onClick: e => { e.stopPropagation(); onChange(!on); },
    className: "relative shrink-0 w-11 h-[26px] rounded-full transition-colors",
    style: { background: on ? "var(--theme-primary)" : "#CBD5E1" }
  }, h("span", {
    className: "absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all",
    style: { left: on ? 21 : 3 }
  }));
}
function Chip({ on, onClick, children }) {
  return h("button", {
    type: "button", onClick, "aria-pressed": on,
    className: "px-3 min-h-[36px] rounded-lg text-xs font-semibold border active:scale-95 transition-transform",
    style: on ? { background: "var(--theme-soft, #E8F0EE)", color: "var(--theme-primary)", borderColor: "var(--theme-primary)" } : { color: "#64748B", borderColor: "#CBD5E1" }
  }, children);
}
const Lb = ({ children }) => h("div", { className: "text-[11px] text-slate-400 mt-2 mb-1" }, children);
const toggleIn = (arr, id) => (arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

function Row({ icon, title, hint, on, onToggle, open, onOpen, disabled, children }) {
  return h("div", { className: "border-t" + (disabled ? " opacity-50" : ""), style: LINE },
    h("div", { className: "flex items-center gap-3 px-4 min-h-[56px] py-1.5 cursor-pointer", onClick: onOpen },
      h("span", { className: "w-8 h-8 rounded-xl flex items-center justify-center shrink-0", style: CHIP_BG, "aria-hidden": "true" }, icon),
      h("span", { className: "flex-1 min-w-0" },
        h("span", { className: "block text-sm font-semibold leading-snug text-slate-800" }, title),
        h("span", { className: "block text-[11px] text-slate-500 leading-snug mt-0.5" }, hint)),
      h(Switch, { on, onChange: onToggle, label: title })),
    open && h("div", { className: "pl-[60px] pr-4 pb-3" }, children));
}

export function NotificationSettingsCard({ uid }) {
  const [p, setP] = React.useState(() => loadNotifPrefs(uid));
  const [open, setOpen] = React.useState(null);
  const [saveErr, setSaveErr] = React.useState(false);
  function upd(next) {
    setP(next);
    setSaveErr(!saveNotifPrefs(uid, next));
  }
  const set = (k, patch) => upd({ ...p, [k]: { ...p[k], ...patch } });
  const tog = k => setOpen(open === k ? null : k);
  const n = countEnabled(p);
  const dis = !p.master;
  return h("div", { className: CARD, style: LINE },
    h("div", { className: "flex items-center gap-3 px-4 py-3" },
      h("span", { className: "w-9 h-9 rounded-xl flex items-center justify-center shrink-0", style: CHIP_BG, "aria-hidden": "true" }, h(BellIcon, { size: 18 })),
      h("span", { className: "flex-1 min-w-0" },
        h("span", { className: "block text-sm font-bold text-slate-800" }, "নোটিফিকেশন"),
        h("span", { className: "block text-[11px] text-slate-500 mt-0.5" }, !p.master ? "সব বন্ধ" : n === 0 ? "প্রয়োজনমতো চালু করুন" : bn(n) + "টি চালু")),
      h(Switch, { on: p.master, onChange: v => upd({ ...p, master: v }), label: "সব নোটিফিকেশন চালু/বন্ধ" })),
    h("div", { className: "px-4 py-2 text-[11px] leading-snug flex gap-2 items-start", style: { background: "#FEF6E7", color: "#8A5A00" } },
      h("span", null, "অ্যান্ড্রয়েড অ্যাপ চালু হলে এই রিমাইন্ডারগুলো ফোনে আসবে। আপনার সেটিংস এখনই সংরক্ষিত থাকবে।")),
    h(Row, {
      icon: h(ClockIcon, { size: 17 }), title: "সালাতের সময়সূচি", disabled: dis, on: p.prayer.on, onToggle: v => set("prayer", { on: v }),
      hint: p.prayer.which.length ? p.prayer.which.map(x => PRAYER_L[x]).join(", ") + " · " + LEAD_L[p.prayer.lead] : "কোনো ওয়াক্ত বাছা নেই",
      open: open === "prayer", onOpen: () => tog("prayer")
    },
      h(Lb, null, "কোন ওয়াক্ত"),
      h("div", { className: "flex flex-wrap gap-1.5" }, PRAYER_IDS.map(id => h(Chip, { key: id, on: p.prayer.which.includes(id), onClick: () => set("prayer", { which: PRAYER_IDS.filter(x => (x === id ? !p.prayer.which.includes(x) : p.prayer.which.includes(x))) }) }, PRAYER_L[id]))),
      h(Lb, null, "কখন জানাবে"),
      h("div", { className: "flex flex-wrap gap-1.5" }, Object.keys(LEAD_L).map(id => h(Chip, { key: id, on: p.prayer.lead === id, onClick: () => set("prayer", { lead: id }) }, LEAD_L[id])))),
    h(Row, {
      icon: h(NoteIcon, { size: 17 }), title: "সাপ্তাহিক মুহাসাবা", disabled: dis, on: p.weekly.on, onToggle: v => set("weekly", { on: v }),
      hint: "প্রতি সপ্তাহ শেষে " + timeL(p.weekly.time), open: open === "weekly", onOpen: () => tog("weekly")
    },
      h(Lb, null, "সময়"),
      h("div", { className: "flex flex-wrap gap-1.5" }, ["18:00", "20:00", "21:00"].map(t => h(Chip, { key: t, on: p.weekly.time === t, onClick: () => set("weekly", { time: t }) }, timeL(t))))),
    h(Row, {
      icon: h(UsersIcon, { size: 17 }), title: "মাসিক পারিবারিক সভা", disabled: dis, on: p.meeting.on, onToggle: v => set("meeting", { on: v }),
      hint: (p.meeting.day === "last" ? "মাসের শেষ দিনের" : "মাসের " + MEETING_L[p.meeting.day] + " তারিখের") + " আগের সন্ধ্যায়", open: open === "meeting", onOpen: () => tog("meeting")
    },
      h(Lb, null, "মাসের কত তারিখ"),
      h("div", { className: "flex flex-wrap gap-1.5" }, Object.keys(MEETING_L).map(d => h(Chip, { key: d, on: p.meeting.day === d, onClick: () => set("meeting", { day: d }) }, MEETING_L[d])))),
    h(Row, {
      icon: h(MoonIcon, { size: 17 }), title: "বিশেষ দিন", disabled: dis, on: p.special.on, onToggle: v => set("special", { on: v }),
      hint: p.special.items.length ? bn(p.special.items.length) + "টি দিন · আগের দিন সন্ধ্যায়" : "কোনো দিন বাছা নেই", open: open === "special", onOpen: () => tog("special")
    },
      h("div", { className: "flex flex-wrap gap-1.5" }, SPECIAL_IDS.map(id => h(Chip, { key: id, on: p.special.items.includes(id), onClick: () => set("special", { items: SPECIAL_IDS.filter(x => (x === id ? !p.special.items.includes(x) : p.special.items.includes(x))) }) }, SPECIAL_L[id]))),
      h("div", { className: "text-[11px] text-slate-400 mt-2" }, "হিজরি তারিখ আনুমানিক, চাঁদ দেখা সাপেক্ষে।")),
    h(Row, {
      icon: h(CheckListIcon, { size: 17 }), title: "আজকের টাস্ক পূরণ করেছেন?", disabled: dis, on: p.daily.on, onToggle: v => set("daily", { on: v }),
      hint: "প্রতিদিন " + timeL(p.daily.time) + " · পূরণ হলে আসবে না", open: open === "daily", onOpen: () => tog("daily")
    },
      h(Lb, null, "সময়"),
      h("div", { className: "flex flex-wrap gap-1.5" }, ["20:00", "21:00", "22:00"].map(t => h(Chip, { key: t, on: p.daily.time === t, onClick: () => set("daily", { time: t }) }, timeL(t))))),
    saveErr && h("div", { className: "px-4 py-2 text-[11px] text-red-500 border-t", style: LINE }, "সেটিংস সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।")
  );
}
