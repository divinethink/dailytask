// useCursorEntries.js — আলাদা মাস-কার্সরের কার্ডের জন্য ওই মাসের এন্ট্রি।
// কার্সর মূল (ওভারভিউ) কার্সরের সমান হলে মূল live monthEntries-ই ব্যবহার হয়(বাড়তি পড়া নেই)।
// আলাদা হলে একবার(one-shot) পড়ে; ব্যর্থ হলে ফাঁকা {} — কখনো crash নয়।
import { useState, useEffect } from "react";
import { loadMonthEntriesOnce } from "./monthEntriesOnce.js";

export function useCursorEntries({ cursor, mainCursor, mainEntries, migrationState, memberId }) {
  const same = cursor.year === mainCursor.year && cursor.month0 === mainCursor.month0;
  const [own, setOwn] = useState({});
  useEffect(() => {
    if (same || !memberId || migrationState === undefined) { setOwn({}); return; }
    let dead = false;
    setOwn({});
    loadMonthEntriesOnce(migrationState, memberId, cursor.year, cursor.month0)
      .then(d => { if (!dead) setOwn(d || {}); })
      .catch(() => { if (!dead) setOwn({}); });
    return () => { dead = true; };
  }, [same, cursor.year, cursor.month0, memberId, migrationState]);
  return same ? mainEntries : own;
}
