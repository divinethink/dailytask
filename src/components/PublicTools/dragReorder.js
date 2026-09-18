// dragReorder.js — App-Creator-এর drag-handle দিয়ে list-item position বদলানোর
// shared hook(EditableSection.jsx accordion)। Pointer Events ভিত্তিক — মোবাইল
// touch ও mouse দুটোতেই কাজ করে(HTML5 drag-and-drop touch-এ চলে না)। কোনো
// নতুন library/dependency নেই। শুধু handle-এ pointerdown হলে drag শুরু হয়, তাই
// item-এ সাধারণ tap/scroll প্রভাবিত হয় না।
// React global(window.React, globals.js)।

const { useState, useRef, useEffect } = React;

const GAP = 8; // list-এর gap-2 (px)

export function useDragReorder(ids, onReorder) {
  const [drag, setDrag] = useState(null); // { id, over, dy } | null
  const nodes = useRef({});
  const st = useRef(null);
  const scrollTimer = useRef(null);

  function stopScroll() {
    if (scrollTimer.current) {
      clearInterval(scrollTimer.current);
      scrollTimer.current = null;
    }
  }
  useEffect(() => stopScroll, []);

  function compute(clientY) {
    const s = st.current;
    const scrollDelta = window.scrollY - s.startScroll;
    const dy = clientY - s.startY + scrollDelta;
    const r = s.rects[s.from];
    const center = r.top + r.height / 2 + dy;
    let over = 0;
    s.rects.forEach((rc, j) => {
      if (j !== s.from && rc.top + rc.height / 2 < center) over += 1;
    });
    s.lastY = clientY;
    s.over = over;
    setDrag({ id: s.id, over, dy });
  }

  function onDown(e, id) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const from = ids.indexOf(id);
    if (from < 0 || ids.some((i) => !nodes.current[i])) return;
    e.preventDefault();
    st.current = {
      id,
      from,
      startY: e.clientY,
      startScroll: window.scrollY,
      lastY: e.clientY,
      rects: ids.map((i) => nodes.current[i].getBoundingClientRect()),
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // capture best-effort
    }
    compute(e.clientY);
    // edge-এর কাছে আঙুল থাকলে পেজ auto-scroll
    scrollTimer.current = setInterval(() => {
      const s = st.current;
      if (!s) return;
      if (s.lastY < 90) window.scrollBy(0, -12);
      else if (s.lastY > window.innerHeight - 130) window.scrollBy(0, 12);
      else return;
      compute(s.lastY);
    }, 16);
  }

  function onMove(e) {
    if (st.current) compute(e.clientY);
  }

  function finish(commit) {
    const s = st.current;
    stopScroll();
    st.current = null;
    setDrag(null);
    if (commit && s && s.over !== s.from) {
      const next = ids.slice();
      next.splice(s.from, 1);
      next.splice(s.over, 0, s.id);
      onReorder(next);
    }
  }

  function itemStyle(id) {
    if (!drag) return undefined;
    const from = ids.indexOf(drag.id);
    const idx = ids.indexOf(id);
    if (id === drag.id) {
      return {
        transform: "translateY(" + drag.dy + "px)",
        zIndex: 30,
        position: "relative",
        boxShadow: "0 8px 24px rgba(14,75,67,0.25)",
        transition: "none",
      };
    }
    const h = st.current ? st.current.rects[from].height + GAP : 0;
    let shift = 0;
    if (from < drag.over && idx > from && idx <= drag.over) shift = -h;
    if (from > drag.over && idx >= drag.over && idx < from) shift = h;
    return { transform: "translateY(" + shift + "px)", transition: "transform 0.15s ease" };
  }

  return {
    dragging: !!drag,
    setNode: (id) => (el) => {
      if (el) nodes.current[id] = el;
      else delete nodes.current[id];
    },
    itemStyle,
    handleProps: (id) => ({
      onPointerDown: (e) => onDown(e, id),
      onPointerMove: onMove,
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
      style: { touchAction: "none", cursor: "grab" },
    }),
  };
}
