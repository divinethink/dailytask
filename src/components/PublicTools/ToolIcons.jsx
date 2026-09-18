// ToolIcons.jsx — আমল/সহায়িকা grid-tile-এর monochrome stroke-SVG icon-set +
// GripIcon(drag-handle)। icons.jsx-এর Icon() pattern(24×24, stroke, round cap/join,
// strokeWidth 2)-ই অনুসরণ — নতুন convention না। markup static/trusted string।
// React global(window.React, globals.js)।

import { MosqueIcon, AmolIcon } from "../icons.jsx";

const SHAPES = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sunMoon: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  beads: '<circle cx="12" cy="4.5" r="1.6"/><circle cx="18" cy="7" r="1.6"/><circle cx="19.5" cy="13" r="1.6"/><circle cx="16.5" cy="18.5" r="1.6"/><circle cx="7.5" cy="18.5" r="1.6"/><circle cx="4.5" cy="13" r="1.6"/><circle cx="6" cy="7" r="1.6"/><path d="M12 21v2.5"/>',
  alarm: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2 2M5 3L2 6M22 6l-3-3"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16v4M17 18h4"/>',
  hourglass: '<path d="M6 2h12M6 22h12M7 2c0 5 3 6 5 10-2 4-5 5-5 10M17 2c0 5-3 6-5 10 2 4 5 5 5 10"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  suitcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  drops: '<path d="M8 3s3 3.5 3 6a3 3 0 0 1-6 0c0-2.5 3-6 3-6z"/><path d="M17 9s2.5 3 2.5 5a2.5 2.5 0 0 1-5 0c0-2 2.5-5 2.5-5z"/><path d="M10 16s2 2.5 2 4a2 2 0 0 1-4 0c0-1.5 2-4 2-4z"/>',
  palm: '<path d="M6 12V8M10 12V5M14 12V6M18 12V9"/><path d="M6 12v3a6 6 0 0 0 12 0v-3z"/>',
  moonStar: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 3v4M15 5h4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  bookmarkCheck: '<path d="M6 3h12v18l-6-4-6 4z"/><path d="M9.5 10l2 2 3-3.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  calendarStar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 12.5l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1L9 14.7l2.1-.3z"/>',
  calendarMoon: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M13.5 12.5a3 3 0 1 0 2.5 4.3 3 3 0 0 1-2.5-4.3z"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  wheat: '<path d="M12 22V8"/><path d="M12 8c-3 0-4-2-4-4 3 0 4 2 4 4zM12 8c3 0 4-2 4-4-3 0-4 2-4 4zM12 14c-3 0-4-2-4-4 3 0 4 2 4 4zM12 14c3 0 4-2 4-4-3 0-4 2-4 4z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4M9 2h6M12 2v3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/>',
  kaaba: '<rect x="5" y="5" width="14" height="15" rx="1"/><path d="M5 10h14M14 13h3M14 16h3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
};

export function ToolIcon({ name, size = 24, color = "currentColor" }) {
  if (name === "mosque") return React.createElement(MosqueIcon, { size, color });
  if (name === "hands") return React.createElement(AmolIcon, { size, color });
  const inner = SHAPES[name] || SHAPES.list;
  return React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { color },
    dangerouslySetInnerHTML: { __html: inner },
  });
}

export function GripIcon({ size = 16, color = "currentColor" }) {
  return React.createElement(ToolIcon, { name: "grip", size, color });
}
