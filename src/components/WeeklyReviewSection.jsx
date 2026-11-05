// নতুন ৫-ধাপের সাপ্তাহিক মুহাসাবা (ব্যক্তিগত)। পুরনো "সাপ্তাহিক রিফ্লেকশন" কার্ডের পাশে "নতুন" ট্যাগসহ।
// ডেটা: families/<id>/reviews (শুধু মালিক, firestore.rules)। বদ্ধ ঘর শুধু এই কম্পোনেন্টের state-এ থাকে,
// কোথাও সেভ/লগ হয় না; সপ্তাহ বদলালে বা পাতা ছাড়লে মুছে যায়।
// React global (window.React) — বাকি কম্পোনেন্টের মতোই।
import { MonthPillNav } from "./MonthPillNav.jsx";
import { REVIEW_TEXT as T } from "../legacy/reviewText.js";
import { chunkCount, chunkOfDay, chunkRange, chunkWeekKey, prevChunk } from "../legacy/reviewSchema.js";
import { weeklyGap, countFieldTotal } from "../legacy/reviewCalc.js";
import { loadReview, saveReview } from "../legacy/reviewData.js";
import { fieldRatioToday } from "../legacy/dailyInsight.js";
import { pad2 } from "../legacy/appHelpers.js";
import { ChevronDown } from "./icons.jsx";

const { useState, useEffect, useMemo } = React;

const chip = on => "px-3 py-1.5 rounded-full text-sm border " + (on ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-slate-700 border-slate-300");
const box = "w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-700 bg-white";
const toggle = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

export function WeeklyReviewSection({ fold, onShiftMonth, migrationState, memberId, member, locked, monthCursor, monthEntries, allFields, fieldApplies, isExcused, isFieldExcusable, toBn, BN_MONTHS }) {
  const { year, month0 } = monthCursor;
  const now = new Date();
  const isCurMonth = now.getFullYear() === year && now.getMonth() === month0;
  const [open, setOpen] = useState(fold === "open" || fold === "fixed");
  const [week, setWeek] = useState(() => (isCurMonth ? chunkOfDay(now.getDate()) : chunkCount(year, month0)));
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({});
  const [prevGoal, setPrevGoal] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [errCode, setErrCode] = useState(""); // সর্বশেষ Firestore error code (যেমন permission-denied)
  const [closed, setClosed] = useState([]); // বদ্ধ ঘর — কখনো সেভ হয় না
  const isProxy = !!(member && "googleUid" in member && member.googleUid === null);
  const weekKey = chunkWeekKey(year, month0, week);
  const range = chunkRange(year, month0, week);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaveState("idle"); };

  // মাস বদলালে সপ্তাহ ঠিক রাখা
  useEffect(() => {
    setWeek(w => Math.min(w, chunkCount(year, month0)));
  }, [year, month0]);

  useEffect(() => {
    setClosed([]); setStep(1); setSaveState("idle");
    if (!open || locked || migrationState !== "v2" || !memberId) { setStatus("idle"); return undefined; }
    let alive = true;
    setStatus("loading"); setErrCode("");
    const p = prevChunk(year, month0, week);
    Promise.all([
      loadReview(migrationState, memberId, weekKey),
      loadReview(migrationState, memberId, chunkWeekKey(p.year, p.month0, p.week)).catch(() => null)
    ]).then(([cur, prev]) => {
      if (!alive) return;
      const g = prev && prev.nextGoal ? prev.nextGoal : "";
      setPrevGoal(g);
      setForm(cur ? { ...cur } : { goalText: g });
      setStatus("ready");
    }).catch(e => {
      // পড়া ব্যর্থ হলেও ফর্ম খোলা থাকবে (লেখা যাবে); সেভের সময় আবার চেষ্টা হবে
      if (!alive) return;
      setErrCode((e && e.code) || "unknown");
      setPrevGoal(""); setForm({}); setStatus("ready");
    });
    return () => { alive = false; };
  }, [open, locked, migrationState, memberId, weekKey]);

  const days = useMemo(() => {
    const out = [];
    for (let d = range.start; d <= range.end; d++) out.push({ day: d, entry: (monthEntries && monthEntries[pad2(d)]) || null });
    return out;
  }, [monthEntries, range.start, range.end]);
  const gaps = useMemo(() => weeklyGap({
    days, fields: allFields,
    ratioOf: (f, e) => fieldRatioToday(f, e),
    applies: f => fieldApplies(f, member),
    excused: (f, e) => isFieldExcusable(f, member) && isExcused(e, f.key)
  }), [days, allFields, member]);
  const loggedDays = days.filter(d => d.entry).length;
  const jam = allFields.find(f => f.key === "jamaat" && fieldApplies(f, member));
  const jamTotal = jam ? countFieldTotal(days, "jamaat", jam.max || 5) : null;
  const applicable = allFields.filter(f => fieldApplies(f, member) && f.key);
  const gapKey = form.gapKey || (gaps[0] && gaps[0].key) || "";
  const gapField = applicable.find(f => f.key === gapKey);
  const gapRow = gaps.find(g => g.key === gapKey);
  const gapLabel = gapField ? (gapField.shortLabel || gapField.label) : "";

  const haqq = form.haqq || [];
  const haqqState = id => (haqq.includes(id + ":good") ? "good" : haqq.includes(id + ":care") ? "care" : "none");
  const cycleHaqq = id => {
    const st = haqqState(id);
    const rest = haqq.filter(x => !x.startsWith(id + ":"));
    set("haqq", st === "none" ? [...rest, id + ":good"] : st === "good" ? [...rest, id + ":care"] : rest);
  };
  const firstCare = T.haqq.people.find(p => haqqState(p.id) === "care");

  const goStep = n => {
    if (n === 5 && !form.nextGoal) {
      const sg = T.next.suggest[(form.gapReasons || [])[0]];
      if (sg) setForm(f => ({ ...f, nextGoal: sg.goal }));
    }
    setStep(n);
  };

  async function onSave() {
    setSaveState("saving");
    try {
      const { memberId: _m, weekKey: _w, updatedAt: _u, v: _v, ...rest } = form;
      const data = { ...rest, gapKey, step: 5, done: true };
      Object.keys(data).forEach(k => { if (data[k] === "" || (Array.isArray(data[k]) && !data[k].length)) delete data[k]; });
      await saveReview(migrationState, memberId, weekKey, data);
      setSaveState("saved");
    } catch (e) {
      setErrCode((e && e.code) || "unknown");
      setSaveState("error");
    }
  }

  const head = React.createElement("div", { onClick: () => fold !== "fixed" && setOpen(o => !o), className: "flex items-center gap-1.5 select-none" + (fold === "fixed" ? "" : " cursor-pointer") },
    <h2 className="flex-1 min-w-0 font-bold text-[15px] text-slate-800">🌙 {T.title}</h2>,
    <MonthPillNav monthCursor={monthCursor} BN_MONTHS={BN_MONTHS} toBn={toBn} onShift={onShiftMonth} />,
    fold === "fixed" ? null : <ChevronDown size={18} className={"shrink-0 text-slate-400 transition-transform" + (open ? " rotate-180" : "")} />
  );

  let body = null;
  if (open) {
    if (locked) body = <p className="text-sm text-slate-500 mt-3">{T.lockedNote}</p>;
    else if (migrationState !== "v2") body = <p className="text-sm text-slate-500 mt-3">{T.errors.needV2}</p>;
    else if (status === "loading" || status === "idle") body = <p className="text-sm text-slate-400 mt-3">…</p>;
    else body = (
      <div className="mt-3">
        {errCode && <p className="text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2 mb-2">{errCode === "permission-denied" ? T.errors.denied : T.errors.loadFailed}</p>}
        <div className="flex gap-1.5 mb-3">
          {Array.from({ length: chunkCount(year, month0) }, (_, i) => i + 1).map(w => (
            <button key={w} type="button" onClick={() => setWeek(w)} className={"flex-1 min-w-0 whitespace-nowrap text-center px-1 py-1.5 rounded-full text-sm font-semibold border " + (w === week ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-slate-700 border-slate-300")}>সপ্তাহ {toBn(w)}</button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
          <span className="shrink-0">{toBn(range.start)}–{toBn(range.end)} {BN_MONTHS[month0]} {toBn(year)} <span title={T.privateTag}>🔒</span></span>
          <span className="min-w-0 truncate font-semibold text-slate-600">ধাপ {toBn(step)}/{toBn(5)} · {T.steps[step - 1]}</span>
        </div>
        <div className="flex gap-1.5 mb-4">{T.steps.map((_, i) => <span key={i} className={"h-1 flex-1 rounded-full " + (i + 1 < step ? "bg-emerald-900" : i + 1 === step ? "bg-amber-500" : "bg-slate-200")} />)}</div>

        {step === 1 && (
          <div>
            {prevGoal ? <>
              <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm font-semibold mb-3">“{prevGoal}”</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {["done", "partial", "none"].map(r => (
                  <button key={r} type="button" onClick={() => set("goalResult", r)} className={"rounded-xl border p-2 text-sm font-semibold " + (form.goalResult === r ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white")}>
                    {r === "done" ? "✅" : r === "partial" ? "🟡" : "❌"}<br />{T.goal[r]}
                  </button>
                ))}
              </div>
              {(form.goalResult === "partial" || form.goalResult === "none") && <>
                <p className="font-bold text-sm mb-2">{T.goal.blockersTitle}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {T.goal.blockers.map(b => <button key={b.id} type="button" onClick={() => set("blockers", toggle(form.blockers || [], b.id))} className={chip((form.blockers || []).includes(b.id))}>{b.t}</button>)}
                </div>
                {form.goalResult === "partial" && <p className="text-xs rounded-lg bg-emerald-50 p-2 text-emerald-900">💚 {T.goal.partialNote}</p>}
              </>}
            </> : <p className="text-sm text-slate-600">{T.goal.noPrev}</p>}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-2"><div className="text-xs text-slate-500">{T.summary.logged}</div><b>{toBn(loggedDays)}/{toBn(days.length)}</b> {T.summary.day}</div>
              {jamTotal && jamTotal.days > 0 && <div className="rounded-xl border border-slate-200 p-2"><div className="text-xs text-slate-500">{T.summary.jamaat}</div><b>{toBn(jamTotal.sum)}/{toBn(jamTotal.possible)}</b> {T.summary.unit}</div>}
            </div>
            <p className="text-xs text-slate-500 mb-2">{T.gap.hint}</p>
            {loggedDays < 2 ? <p className="text-sm text-slate-600 mb-2">{T.gap.noData}</p> : !gaps.length && !form.gapKey && <p className="text-sm text-slate-600 mb-2">{T.gap.noGap}</p>}
            <select value={gapKey} onChange={e => set("gapKey", e.target.value)} className={box + " mb-1"}>
              <option value="">—</option>
              {applicable.map(f => <option key={f.key} value={f.key}>{f.shortLabel || f.label}</option>)}
            </select>
            {gapField && gapRow && <p className="text-xs text-slate-500 mb-3">{gapLabel}: {toBn(gapRow.logged)} দিনের {toBn(gapRow.missed)} দিন সম্পূর্ণ হয়নি</p>}
            <p className="font-bold text-sm mt-3 mb-2">{T.gap.reasonTitle}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {T.gap.reasons.map(r => <button key={r.id} type="button" onClick={() => set("gapReasons", toggle(form.gapReasons || [], r.id))} className={chip((form.gapReasons || []).includes(r.id))}>{r.t}</button>)}
            </div>
            <p className="font-bold text-sm mb-1">{T.gap.momentTitle}</p>
            <textarea rows={2} maxLength={300} value={form.hardMoment || ""} onChange={e => set("hardMoment", e.target.value)} placeholder={T.gap.momentPlaceholder} className={box + " resize-none"} />
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-sm text-slate-600 mb-2">{T.haqq.hint}</p>
            <div className="flex flex-wrap gap-2 mb-1">
              {T.haqq.people.map(p => {
                const st = haqqState(p.id);
                return <button key={p.id} type="button" onClick={() => cycleHaqq(p.id)} className={"px-3 py-1.5 rounded-full text-sm border font-semibold " + (st === "good" ? "bg-emerald-900 text-white border-emerald-900" : st === "care" ? "bg-orange-50 text-orange-800 border-orange-300" : "bg-white text-slate-700 border-slate-300")}>{p.t}{st === "good" ? " ✓" : st === "care" ? " ⚠" : ""}</button>;
              })}
            </div>
            <p className="text-[11px] text-slate-400 mb-3">{T.haqq.tapHint}</p>
            {firstCare && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">📌 {T.haqq.pinPrefix}<b>{firstCare.task}</b></p>}
          </div>
        )}

        {step === 4 && (isProxy ? <p className="text-sm text-slate-600">{T.closedRoomProxy}</p> : (
          <div>
            <div className="flex items-center justify-between mb-2"><b>🔐 {T.closedRoom.title}</b><span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">{T.closedRoom.badge}</span></div>
            <p className="rounded-xl border border-slate-200 p-3 text-sm mb-3">{T.closedRoom.privacy}</p>
            <p className="font-bold text-sm mb-2">{T.closedRoom.prompt}</p>
            {T.closedRoom.items.map(it => (
              <label key={it.id} className="flex items-start gap-2 py-2 border-b border-dashed border-slate-200 text-sm">
                <input type="checkbox" checked={closed.includes(it.id)} onChange={() => setClosed(c => toggle(c, it.id))} className="mt-1" />
                <span>{it.text}{it.src && <span className="block text-[11px] text-slate-400">{it.src}</span>}</span>
              </label>
            ))}
            {closed.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mt-3 text-sm">
                <b>🤲 {T.closedRoom.tawba.title}</b>
                <p className="my-1">{T.closedRoom.tawba.ayah}। {T.closedRoom.tawba.lead}</p>
                <ol className="list-decimal pl-5 space-y-1 mb-2">{T.closedRoom.tawba.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                <p>{T.closedRoom.tawba.extra}</p>
              </div>
            )}
            <p className="text-[11px] text-slate-400 text-center mt-2">{T.closedRoom.footnote}</p>
          </div>
        ))}

        {step === 5 && (
          <div>
            <p className="font-bold text-sm mb-1">{T.next.goalTitle}</p>
            <input maxLength={200} value={form.nextGoal || ""} onChange={e => set("nextGoal", e.target.value)} className={box + " mb-3 bg-amber-50"} />
            <p className="font-bold text-sm mb-1">{T.next.gratitudeTitle}</p>
            <input maxLength={300} value={form.gratitude || ""} onChange={e => set("gratitude", e.target.value)} className={box + " mb-3"} />
            <button type="button" disabled={saveState === "saving"} onClick={onSave} className="w-full py-3 rounded-2xl bg-emerald-900 text-white font-bold disabled:opacity-60">✔ {T.next.save}</button>
            {saveState === "saved" && <p className="text-sm text-emerald-800 text-center mt-2">{T.saved}</p>}
            {saveState === "error" && <p className="text-sm text-red-700 text-center mt-2">{errCode === "permission-denied" ? T.errors.denied : T.errors.saveFailed}</p>}
            <p className="text-[11px] text-slate-500 text-center mt-2">🔒 {T.next.privacy}</p>
            <p className="text-xs text-slate-500 mt-2">🔁 {T.next.loop}</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {step > 1 && <button type="button" onClick={() => goStep(step - 1)} className="px-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-bold">‹ আগের ধাপ</button>}
          {step < 5 && <button type="button" onClick={() => goStep(step + 1)} className="flex-1 py-2.5 rounded-2xl bg-emerald-900 text-white font-bold">পরের ধাপ ›</button>}
        </div>
      </div>
    );
  }

  return React.createElement("div", { className: "mx-5 mt-5 p-4 rounded-2xl bg-white shadow-sm", style: { border: "1px solid #EADFBE" } }, head, body);
}
