// A3 — globals.js MUST be imported first: it attaches React/ReactDOM/
// firebase/Chart to `window` before legacy/app.js (which reads them as
// bare globals) executes. Import order below = evaluation order.
import "./globals.js";
import "./legacy/app.js";
