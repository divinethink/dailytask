// useReviewNotices.js — মুহাসাবা-আনলকের নোটিফিকেশন বেলে মেশানোর hook। অবস্থা (পড়া/মোছা) শুধু এই ডিভাইসের localStorage।
import { reviewNotices } from "./reviewNotices.js";

const { useState, useEffect, useCallback, useMemo } = React;

export const isLocalNotice = (n) => !!n && typeof n.id === "string" && n.id.indexOf("local:") === 0;

function readSeen(key) {
  try { const o = JSON.parse(window.localStorage.getItem(key) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
}
function writeSeen(key, o) {
  try { window.localStorage.setItem(key, JSON.stringify(o)); } catch (e) { /* ignore */ }
}

export function useReviewNotices(enabled, uid) {
  const key = "dt_review_notices_" + (uid || "x");
  const [seen, setSeen] = useState(() => readSeen(key));
  const [tick, setTick] = useState(0);
  useEffect(() => { setSeen(readSeen(key)); }, [key]);
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, [enabled]);
  const items = useMemo(() => {
    if (!enabled || !uid) return [];
    return reviewNotices(new Date())
      .filter((n) => seen[n.id] !== 2)
      .map((n) => ({ ...n, read: seen[n.id] === 1 }));
  }, [enabled, uid, seen, tick]);
  const update = useCallback((ids, val) => {
    setSeen((prev) => { const next = { ...prev }; ids.forEach((id) => { next[id] = val; }); writeSeen(key, next); return next; });
  }, [key]);
  const markRead = useCallback((ids) => update(ids, 1), [update]);
  const dismiss = useCallback((ids) => update(ids, 2), [update]);
  return { items, markRead, dismiss };
}
