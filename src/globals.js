// A3 — CDN Global → npm Import bridge.
//
// app.js (legacy) references React and ReactDOM as bare globals (exactly
// as CDN <script> tags used to provide them). This file's only job is to
// import those libraries via npm and attach them to `window` so app.js
// keeps running with ZERO logic changes — per Roadmap A3 rule: "শুধু
// library-source বদলাবে, usage অপরিবর্তিত"।
//
// Firebase bridge removed(Phase 4, ২১ সেপ্টেম্বর ২০২৬, modular v9 SDK
// Migration Plan — চূড়ান্ত ধাপ): app.js ও সব legacy/* module এখন কেউই
// bare global `firebase` reference করে না(প্রতিটা ফাইল আলাদাভাবে
// convert+verify হয়েছে, কোনো leftover পাওয়া যায়নি) — তাই
// `firebase/compat/*` import ও `window.firebase = firebase` bridge-এর আর
// প্রয়োজন নেই। Firebase init এখন সম্পূর্ণ modular(`firebaseConfig.js`
// দ্রষ্টব্য), প্রতিটা module সরাসরি সেখান থেকে named-import করে।

import React from "react";
import ReactDOM from "react-dom/client";

window.React = React;
window.ReactDOM = ReactDOM;
