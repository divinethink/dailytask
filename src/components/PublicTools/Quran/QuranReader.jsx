// QuranReader.jsx — একটা সূরার পূর্ণ-স্ক্রিন পাঠ: বিসমিল্লাহ-শিরোনাম, আরবি + বাংলা অনুবাদ।
// ৩০ আয়াত করে রেন্ডার (লম্বা সূরায় ধীর হয় না); পাঠের অবস্থান থেমে থেমে onPosition-এ জানায়।
// React global(window.React, globals.js)।

import { ChevronLeft } from "../../icons.jsx";
import { useBackLayer } from "../../../legacy/backNav.js";
import { loadSurah } from "../../../legacy/quranData.js";
import { PAGE_SIZE, showBismillahHeader, surahTypeLabel, toBnDigits } from "../../../legacy/quranCore.js";

const { useState, useEffect, useRef } = React;
const h = React.createElement;

const PRIMARY = "var(--theme-primary, #0E4B43)";
const AR_FONT = "'Amiri Quran', 'Noto Naskh Arabic', serif";

export function QuranReader({ surah, meta, startAyah, bismillah, onClose, onPosition, onNavigate }) {
  const start = startAyah > 1 ? startAyah : 1;
  const [state, setState] = useState({ status: "loading", ayahs: null });
  const [shown, setShown] = useState(Math.max(PAGE_SIZE, start + 10));
  const [tries, setTries] = useState(0);
  const bodyRef = useRef(null);
  const sentinelRef = useRef(null);
  const posRef = useRef(0);
  const posCb = useRef(onPosition);
  posCb.current = onPosition;

  useBackLayer(true, onClose);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading", ayahs: null });
    loadSurah(surah)
      .then((ayahs) => { if (alive) setState({ status: "ready", ayahs }); })
      .catch(() => { if (alive) setState({ status: "error", ayahs: null }); });
    return () => { alive = false; };
  }, [surah.n, tries]);

  const ready = state.status === "ready";
  const total = surah.ayahs;

  // খোলার পর নির্দিষ্ট আয়াতে যাওয়া + প্রথম অবস্থান সংরক্ষণ।
  useEffect(() => {
    if (!ready) return;
    posRef.current = start;
    posCb.current(surah.n, start);
    if (start > 1) {
      const el = document.getElementById("q-a-" + start);
      if (el) el.scrollIntoView({ block: "start" });
    }
  }, [ready]);

  // স্ক্রল-শেষে আরও আয়াত দেখানো।
  useEffect(() => {
    if (!ready || shown >= total) return undefined;
    const root = bodyRef.current;
    const el = sentinelRef.current;
    if (!root || !el || typeof IntersectionObserver === "undefined") { setShown(total); return undefined; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setShown((s) => Math.min(total, s + PAGE_SIZE));
    }, { root, rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ready, shown, total]);

  // পাঠের অবস্থান: স্ক্রিনের ওপরের অংশে যে আয়াত, তা ০.৭ সেকেন্ড থেমে থাকলে সংরক্ষণ।
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === "undefined") return undefined;
    const root = bodyRef.current;
    if (!root) return undefined;
    let timer = null;
    const io = new IntersectionObserver((es) => {
      let a = 0;
      es.forEach((e) => { if (e.isIntersecting) a = Math.max(a, Number(e.target.dataset.a) || 0); });
      if (!a || a === posRef.current) return;
      posRef.current = a;
      clearTimeout(timer);
      timer = setTimeout(() => posCb.current(surah.n, a), 700);
    }, { root, rootMargin: "0px 0px -75% 0px" });
    root.querySelectorAll("[data-a]").forEach((el) => io.observe(el));
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [ready, shown]);

  // বন্ধ করার সময় শেষ অবস্থান নিশ্চিত সংরক্ষণ।
  useEffect(() => () => { if (posRef.current) posCb.current(surah.n, posRef.current); }, []);

  const ayahs = ready ? state.ayahs.slice(0, shown) : [];
  const prev = surah.n > 1 ? meta.surahs[surah.n - 2] : null;
  const next = surah.n < 114 ? meta.surahs[surah.n] : null;

  const navBtn = (label, target) =>
    h("button", {
      type: "button",
      onClick: () => onNavigate(target.n),
      className: "flex-1 py-3 rounded-xl border text-sm font-semibold",
      style: { borderColor: "#D7DFD9", color: PRIMARY, background: "#fff" },
    }, label);

  return h("div", { style: { position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", background: "#FFFFFF", fontFamily: "'Hind Siliguri', sans-serif" } },
    h("div", { style: { background: PRIMARY, color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 } },
      h("button", { type: "button", onClick: onClose, "aria-label": "ফিরে যান", style: { padding: 8, color: "#fff" } }, h(ChevronLeft, { size: 22 })),
      h("div", { style: { minWidth: 0 } },
        h("div", { style: { fontWeight: 600, fontSize: 17, lineHeight: 1.3 } }, toBnDigits(surah.n) + ". " + surah.bn),
        h("div", { style: { fontSize: 12, opacity: 0.85 } }, surah.mean + " · " + surahTypeLabel(surah.type) + " · " + toBnDigits(surah.ayahs) + " আয়াত")
      )
    ),
    h("div", { ref: bodyRef, style: { flex: 1, overflowY: "auto", padding: "0 16px 40px" } },
      state.status === "loading" && h("p", { className: "text-center text-sm text-gray-500 py-16" }, "লোড হচ্ছে…"),
      state.status === "error" && h("div", { className: "text-center py-16" },
        h("p", { className: "text-sm text-gray-700 mb-3" }, "সূরাটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"),
        h("button", { type: "button", onClick: () => setTries((t) => t + 1), className: "px-4 py-2 rounded-xl text-sm font-semibold text-white", style: { background: PRIMARY } }, "আবার চেষ্টা করুন")
      ),
      ready && showBismillahHeader(surah.n) && bismillah && h("div", { dir: "rtl", lang: "ar", style: { fontFamily: AR_FONT, fontSize: 28, lineHeight: 2.2, textAlign: "center", padding: "20px 0 8px", color: "#1F2D2A" } }, bismillah),
      ayahs.map((a) =>
        h("div", { key: a.n, id: "q-a-" + a.n, "data-a": a.n, style: { padding: "14px 0", borderBottom: "1px solid #EEF2EF" } },
          h("div", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 14, background: "#E8F0EE", color: PRIMARY, fontSize: 13, fontWeight: 600, marginBottom: 8 } }, toBnDigits(a.n)),
          h("div", { dir: "rtl", lang: "ar", style: { fontFamily: AR_FONT, fontSize: 28, lineHeight: 2.2, color: "#1F2D2A" } }, a.ar),
          h("p", { style: { fontSize: 16, lineHeight: 1.8, color: "#2B3A35", marginTop: 6 } }, a.tr)
        )
      ),
      ready && shown < total && h("div", { ref: sentinelRef, style: { height: 40 }, "aria-hidden": "true" }),
      ready && shown >= total && h("div", null,
        h("div", { style: { display: "flex", gap: 10, marginTop: 24 } },
          prev ? navBtn("← " + prev.bn, prev) : null,
          next ? navBtn(next.bn + " →", next) : null
        ),
        h("p", { style: { fontSize: 11, color: "#7B8A84", textAlign: "center", marginTop: 20, lineHeight: 1.6 } },
          "আরবি পাঠ: ",
          h("a", { href: "https://tanzil.net", target: "_blank", rel: "noopener noreferrer", style: { textDecoration: "underline" } }, "Tanzil.net"),
          " · বাংলা অনুবাদ: মুহিউদ্দীন খান"
        )
      )
    )
  );
}
