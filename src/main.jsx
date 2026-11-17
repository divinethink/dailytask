import "./tailwind.css";
// A3 — globals.js MUST be imported first: it attaches React/ReactDOM/
// firebase/Chart to `window` before legacy/app.js (which reads them as
// bare globals) executes. Import order below = evaluation order.
import "./globals.js";
import "./legacy/app.js";
import { clearChunkReloadFlag } from "./legacy/lazyRetry.js";
// অ্যাপ ৫ সেকেন্ড টিকে থাকলে ধরে নেওয়া হয় লোড ঠিক আছে; তখন reload-চিহ্ন মুছে যায়।
setTimeout(clearChunkReloadFlag, 5000);
