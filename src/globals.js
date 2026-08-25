// A3 — CDN Global → npm Import bridge.
//
// app.js (legacy) references React, ReactDOM, firebase, and Chart as bare
// globals (exactly as CDN <script> tags used to provide them). This file's
// only job is to import those libraries via npm and attach them to
// `window` so app.js keeps running with ZERO logic changes — per Roadmap
// A3 rule: "শুধু library-source বদলাবে, usage অপরিবর্তিত".
//
// Import ORDER matters here (side-effect compat modules extend the same
// `firebase` default export), but this file's own execution must finish
// BEFORE legacy/app.js runs — that ordering is guaranteed by main.jsx,
// which imports this file first, then legacy/app.js.

import React from "react";
import ReactDOM from "react-dom/client";
import Chart from "chart.js/auto";

import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import "firebase/compat/app-check";
import "firebase/compat/analytics";

window.React = React;
window.ReactDOM = ReactDOM;
window.Chart = Chart;
window.firebase = firebase;
