// quranFontLoader.js — বাছা আরবি ফন্ট নামানো (browser)। শুধু বাছার পরে নামে; ব্যর্থ হলে false (UI আমিরিতে চলতে থাকে)।
// file-ওয়ালা ফন্ট (আমিরি) @font-face দিয়ে নিজেই লোড হয়, তাই এখানে কিছু করতে হয় না।
import { fontById, FONT_SAMPLE } from "./quranFonts.js";

const TIMEOUT_MS = 15000;
const loading = new Map();

export function ensureFont(id) {
  const f = fontById(id);
  if (!f || !f.google || typeof document === "undefined") return Promise.resolve(true);
  if (loading.has(id)) return loading.get(id);
  const p = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), TIMEOUT_MS);
    const done = (ok) => { clearTimeout(timer); resolve(ok); };
    try {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "dt-qf-" + id;
      link.href = "https://fonts.googleapis.com/css2?family=" + f.google + "&display=swap";
      link.onload = () => {
        const ready = document.fonts && document.fonts.load ? document.fonts.load('28px "' + f.family + '"', FONT_SAMPLE) : Promise.resolve();
        ready.then((faces) => done(!faces || faces.length > 0), () => done(false));
      };
      link.onerror = () => done(false);
      document.head.appendChild(link);
    } catch (e) { resolve(false); }
  });
  loading.set(id, p);
  p.then((ok) => {
    if (ok) return;
    loading.delete(id); // পরের বার আবার চেষ্টা
    const l = document.getElementById("dt-qf-" + id);
    if (l) l.remove();
  });
  return p;
}
