// JamaatCard.jsx — "সময়সূচি" ট্যাবের "মসজিদের জামায়াত" কার্ড(owner-request ৩ নভেম্বর ২০২৬)।
// শুধু এই ডিভাইসের localStorage(legacy/jamaatTimes.js); Firestore/Rules কিছু নেই। ওয়াক্ত-হিসাব(schedule) বাইরে থেকে আসে।
// জামায়াতের সময় অটো(সূর্যোদয়/সূর্যাস্ত/ওয়াক্ত-শুরু ± মিনিট) বা হাতে-বসানো(fixed); মিলে না গেলে Owner ঠিক করতে পারেন।
// React global(window.React, globals.js)।
import { toBn } from "../../legacy/appHelpers.js";
import {
  JAMAAT_KEYS,
  JAMAAT_LABEL,
  BASES,
  SUGGESTED,
  loadJamaat,
  saveJamaat,
  clearJamaat,
  resolveJamaat,
  nextJamaatKey,
  isStale,
} from "../../legacy/jamaatTimes.js";

const { useState, useMemo } = React;
const h = React.createElement;

function fmt(d) {
  if (!d) return "--:--";
  const hr = d.getHours() % 12 || 12;
  return `${toBn(hr)}:${toBn(String(d.getMinutes()).padStart(2, "0"))}`;
}
function toHHMM(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function gapText(min) {
  const sign = min < 0 ? "−" : "+";
  const a = Math.abs(min);
  const hh = Math.floor(a / 60);
  const mm = a % 60;
  return `${sign}${hh ? toBn(hh) + " ঘ " : ""}${toBn(mm)} মি`;
}
function leftText(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  const hh = Math.floor(m / 60);
  return `${hh ? toBn(hh) + " ঘ " : ""}${toBn(m % 60)} মি বাকি`;
}

const FIELD = "border border-slate-300 rounded-lg px-2 text-sm bg-white min-h-[44px]";
const BTN = "rounded-xl px-4 min-h-[44px] text-sm font-bold";

export function JamaatCard({ schedule, now }) {
  const [cfg, setCfg] = useState(() => loadJamaat());
  const [draft, setDraft] = useState(null); // null = দেখার মোড

  const rows = useMemo(() => (cfg && schedule ? resolveJamaat(cfg, schedule, now) : []), [cfg, schedule, now]);
  const nextKey = rows.length ? nextJamaatKey(rows, now) : null;
  const draftRows = useMemo(() => (draft && schedule ? resolveJamaat(draft, schedule, now) : []), [draft, schedule, now]);

  function openEditor() {
    setDraft(cfg || { mosque: "", rules: JSON.parse(JSON.stringify(SUGGESTED.rules)), jumuah: SUGGESTED.jumuah, roundTo: SUGGESTED.roundTo });
  }
  function setRule(k, patch) {
    setDraft((d) => ({ ...d, rules: { ...d.rules, [k]: { ...d.rules[k], ...patch } } }));
  }
  function switchMode(k, mode) {
    const cur = draftRows.find((r) => r.key === k);
    // অটো → নির্দিষ্ট: এখনকার হিসাব-করা সময়ই শুরুর মান, যাতে শুধু মিনিট ঠিক করলেই হয়
    setRule(k, mode === "fixed" && cur ? { mode, fixed: toHHMM(cur.time) } : { mode });
  }
  function onSave() {
    const saved = saveJamaat(draft);
    if (saved) setCfg(saved);
    setDraft(null);
  }
  function onClear() {
    clearJamaat();
    setCfg(null);
    setDraft(null);
  }

  const shell = (children) =>
    h("div", { className: "mx-4 mb-3 bg-white rounded-2xl border border-[#C89B3C]/50 shadow-[0_0_10px_rgba(200,155,60,0.35)] overflow-hidden" }, children);

  if (!schedule) return null;

  // ---- এডিট মোড ----
  if (draft) {
    return shell(
      h(
        "div",
        { className: "px-4 py-3" },
        h("div", { className: "text-sm font-bold text-emerald-950 mb-2" }, "🕌 জামায়াতের সময় ঠিক করুন"),
        h("input", {
          type: "text",
          value: draft.mosque,
          maxLength: 60,
          placeholder: "মসজিদের নাম (ঐচ্ছিক)",
          "aria-label": "মসজিদের নাম",
          onChange: (e) => setDraft({ ...draft, mosque: e.target.value }),
          className: FIELD + " w-full mb-3",
        }),
        JAMAAT_KEYS.map((k) => {
          const r = draft.rules[k];
          const pv = draftRows.find((x) => x.key === k);
          return h(
            "div",
            { key: k, className: "py-2 border-t border-slate-100" },
            h(
              "div",
              { className: "flex items-center justify-between gap-2" },
              h("span", { className: "text-sm font-semibold text-slate-800" }, JAMAAT_LABEL[k]),
              h(
                "div",
                { className: "flex rounded-xl overflow-hidden border border-slate-300", role: "group", "aria-label": JAMAAT_LABEL[k] + " পদ্ধতি" },
                ["auto", "fixed"].map((m) =>
                  h(
                    "button",
                    {
                      key: m,
                      type: "button",
                      onClick: () => switchMode(k, m),
                      "aria-pressed": r.mode === m,
                      className: "px-3 min-h-[44px] text-xs font-bold " + (r.mode === m ? "bg-emerald-900 text-white" : "bg-white text-slate-600"),
                    },
                    m === "auto" ? "অটো" : "নির্দিষ্ট"
                  )
                )
              )
            ),
            r.mode === "fixed"
              ? h("input", {
                  type: "time",
                  value: r.fixed,
                  "aria-label": JAMAAT_LABEL[k] + " জামায়াতের সময়",
                  onChange: (e) => e.target.value && setRule(k, { fixed: e.target.value }),
                  className: FIELD + " mt-2",
                })
              : h(
                  "div",
                  { className: "flex items-center gap-2 mt-2 flex-wrap" },
                  h(
                    "select",
                    {
                      value: r.base,
                      "aria-label": JAMAAT_LABEL[k] + " ভিত্তি",
                      onChange: (e) => setRule(k, { base: e.target.value }),
                      className: FIELD,
                    },
                    Object.keys(BASES).map((b) => h("option", { key: b, value: b }, BASES[b]))
                  ),
                  h("input", {
                    type: "number",
                    inputMode: "numeric",
                    min: -240,
                    max: 240,
                    value: r.offset,
                    "aria-label": JAMAAT_LABEL[k] + " মিনিট ফারাক",
                    onChange: (e) => setRule(k, { offset: e.target.value === "" ? 0 : Number(e.target.value) }),
                    className: FIELD + " w-20 text-center",
                  }),
                  h("span", { className: "text-xs text-slate-500" }, "মিনিট (− = আগে)")
                ),
            pv &&
              h(
                "div",
                { className: "text-xs mt-1 " + (pv.warn ? "text-red-700" : "text-slate-500") },
                `→ ${fmt(pv.time)} · ওয়াক্ত শুরুর ${gapText(pv.gapMin)}` + (pv.warn ? " · ⚠ " + pv.warn : "")
              )
          );
        }),
        h(
          "div",
          { className: "py-2 border-t border-slate-100 flex items-center justify-between gap-2" },
          h("span", { className: "text-sm font-semibold text-slate-800" }, "জুমা (শুক্রবার, যোহরের বদলে)"),
          h("input", {
            type: "time",
            value: draft.jumuah,
            "aria-label": "জুমার জামায়াতের সময়",
            onChange: (e) => e.target.value && setDraft({ ...draft, jumuah: e.target.value }),
            className: FIELD,
          })
        ),
        h(
          "label",
          { className: "flex items-center gap-2 py-2 min-h-[44px] text-sm text-slate-700" },
          h("input", { type: "checkbox", checked: draft.roundTo === 5, onChange: (e) => setDraft({ ...draft, roundTo: e.target.checked ? 5 : 0 }), className: "w-5 h-5" }),
          "অটো সময় ৫ মিনিটে মিলিয়ে নিন"
        ),
        h(
          "div",
          { className: "flex gap-2 mt-2 flex-wrap" },
          h("button", { type: "button", onClick: onSave, className: BTN + " bg-emerald-900 text-white" }, "সংরক্ষণ"),
          h("button", { type: "button", onClick: () => setDraft(null), className: BTN + " bg-slate-100 text-slate-700" }, "বাতিল"),
          cfg && h("button", { type: "button", onClick: onClear, className: BTN + " bg-red-50 text-red-700" }, "মুছুন")
        )
      )
    );
  }

  // ---- না-সেট মোড ----
  if (!cfg) {
    return shell(
      h(
        "div",
        { className: "px-4 py-3 flex items-center justify-between gap-3" },
        h(
          "div",
          { className: "min-w-0" },
          h("div", { className: "text-sm font-bold text-emerald-950" }, "🕌 মসজিদের জামায়াত"),
          h("div", { className: "text-xs text-slate-500 mt-0.5" }, "আপনার মসজিদের জামায়াতের সময় এখানে রাখুন")
        ),
        h("button", { type: "button", onClick: openEditor, className: BTN + " bg-emerald-900 text-white shrink-0" }, "সেট করুন")
      )
    );
  }

  // ---- দেখার মোড ----
  const stale = isStale(cfg, now.getTime());
  return shell(
    h(
      "div",
      { className: "px-4 pt-3 pb-3" },
      h(
        "div",
        { className: "flex items-center justify-between gap-2 mb-1" },
        h(
          "div",
          { className: "min-w-0" },
          h("div", { className: "text-sm font-bold text-emerald-950" }, "🕌 জামায়াতের সময়"),
          cfg.mosque && h("div", { className: "text-xs text-slate-500 truncate" }, cfg.mosque)
        ),
        h("button", { type: "button", onClick: openEditor, "aria-label": "জামায়াতের সময় এডিট", className: "shrink-0 w-11 h-11 rounded-xl bg-slate-100 text-base" }, "✏️")
      ),
      rows.map((r) => {
        const isNext = r.key === nextKey;
        return h(
          "div",
          {
            key: r.key,
            className: "relative flex items-center gap-2 text-sm py-1.5 px-2 rounded-xl " + (isNext ? "bg-[#F3EEDD] font-bold" : r.time < now ? "opacity-60" : ""),
            "aria-current": isNext ? "true" : undefined,
          },
          isNext && h("span", { className: "absolute left-0 top-2 bottom-2 w-1 rounded-full", style: { background: "#C89B3C" }, "aria-hidden": true }),
          h(
            "span",
            { className: "flex-1 text-slate-800 flex items-center gap-1.5 flex-wrap" },
            r.label,
            isNext && h("span", { className: "text-[11px] font-bold text-white rounded-full px-1.5 py-[1px]", style: { background: "#C89B3C" } }, "পরবর্তী"),
            isNext && h("span", { className: "text-[11px] font-normal text-slate-500" }, leftText(r.time - now))
          ),
          r.warn && h("span", { className: "text-[11px] text-red-700", title: r.warn }, "⚠ " + r.warn),
          h("span", { className: "text-[11px] text-slate-400 whitespace-nowrap" }, gapText(r.gapMin)),
          h("span", { className: "text-base font-semibold whitespace-nowrap text-emerald-900 w-14 text-right", style: { fontFamily: "'Hind Siliguri', sans-serif" } }, fmt(r.time))
        );
      }),
      h(
        "div",
        { className: "text-[11px] text-slate-400 mt-1 px-2" },
        "ডানের +মি = ওয়াক্ত শুরুর কত পরে জামায়াত" + (stale ? " · ⚠ অনেক দিন আগে সেট করা, মসজিদের সময় মিলিয়ে নিন" : "")
      )
    )
  );
}
