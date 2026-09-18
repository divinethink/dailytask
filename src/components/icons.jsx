// A4 G1 — Icon components, extracted verbatim from legacy app.js (structural-only, no logic change).
// Each icon takes {children,size,color,...} props exactly as before.

export function Icon({
  children,
  size = 18,
  color = "currentColor",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: style
  }, children);
}
export function Plus({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }));
}
export function ChevronLeft({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "15 18 9 12 15 6"
  }));
}
export function ChevronRight({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  }));
}
export function Printer({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 6 2 18 2 18 9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "14",
    width: "12",
    height: "8"
  }));
}
export function Check({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }));
}
export function X({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }));
}
export function User({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  }));
}
export function CalIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }));
}
export function DownloadIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7 10 12 15 17 10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "15",
    x2: "12",
    y2: "3"
  }));
}
export function UploadIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  }));
}
export function Trash({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3 6 5 6 21 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  }));
}
export function LogOutIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  }));
}
export function KeyIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
  }));
}
export function EyeIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }));
}
export function EyeOffIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.12 14.12a3 3 0 1 1-4.24-4.24"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "1",
    y1: "1",
    x2: "23",
    y2: "23"
  }));
}
export function MenuIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "6",
    x2: "21",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "18",
    x2: "21",
    y2: "18"
  }));
}
export function CopyIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
  }));
}
export function ShareIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", { cx: "18", cy: "5", r: "3" }), /*#__PURE__*/React.createElement("circle", { cx: "6", cy: "12", r: "3" }), /*#__PURE__*/React.createElement("circle", { cx: "18", cy: "19", r: "3" }), /*#__PURE__*/React.createElement("line", { x1: "8.59", y1: "13.51", x2: "15.42", y2: "17.49" }), /*#__PURE__*/React.createElement("line", { x1: "15.41", y1: "6.51", x2: "8.59", y2: "10.49" }));
}
export function MessageSquare({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  }));
}
export function UsersIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 21v-2a4 4 0 0 1 3-3.87"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "3.13",
    r: "3"
  }));
}
export function ChevronDown({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }));
}
export function EditIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
  }));
}
export function InfoIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  }));
}
export function GoogleIcon({
  size = 14,
  className
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className: className
  }, /*#__PURE__*/React.createElement("path", {
    fill: "#4285F4",
    d: "M23.49 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.82z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#34A853",
    d: "M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#FBBC05",
    d: "M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#EA4335",
    d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
  }));
}
export function RefreshIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "23 4 23 10 17 10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "1 20 1 14 7 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
  }));
}
export function Loader2({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "2",
    x2: "12",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "4.93",
    x2: "7.76",
    y2: "7.76"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "16.24",
    x2: "19.07",
    y2: "19.07"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "12",
    x2: "6",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "12",
    x2: "22",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "19.07",
    x2: "7.76",
    y2: "16.24"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "7.76",
    x2: "19.07",
    y2: "4.93"
  }));
}
export function ClockIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 7 12 12 15 15"
  }));
}
// §Bottom Nav icon-set upgrade(2_4_Identity_Simplification_Plan.md §৯.০, ১৫ সেপ্টেম্বর
// ২০২৬)। এই ৩টা icon(HomeIcon/TasbihIcon/CompassIcon) ইচ্ছাকৃতভাবে উপরের shared
// Icon() wrapper ব্যবহার করেনি(সেটা fill:"none" hardcoded, ২৬টা বিদ্যমান call-site
// জুড়ে ব্যবহৃত) — বরং standalone, নিজস্ব "filled" prop-সহ, যাতে shared wrapper-এ কোনো
// পরিবর্তন না লাগে(zero regression-risk to existing icons)। active/inactive filled
// আচরণ শুধু এই bottom-nav icon-গুলোর জন্যই প্রযোজ্য।
export function HomeIcon({
  size = 18,
  color = "currentColor",
  className,
  style,
  filled = false
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: { fill: filled ? color : "none", stroke: color, ...style }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5Z"
  }));
}
export function TasbihIcon({
  size = 18,
  color = "currentColor",
  className,
  style,
  filled = false
}) {
  const beadFill = filled ? color : "none";
  const beadPositions = [
    [12, 4.3], [17.6, 6.9], [19.6, 12.5], [17, 18],
    [11.3, 20], [5.9, 18], [4, 12], [6.4, 6.5]
  ];
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: { stroke: color, ...style }
  },
    ...beadPositions.map(([cx, cy], i) => /*#__PURE__*/React.createElement("circle", {
      key: i, cx, cy, r: 1.5, fill: beadFill
    })),
    /*#__PURE__*/React.createElement("line", { x1: 11.3, y1: 20, x2: 11.3, y2: 23 })
  );
}
// §Amol tab icon — পরিবর্তিত(১৮ সেপ্টেম্বর ২০২৬, owner-feedback, 2_4 §৯.০-এর
// পূর্ববর্তী decision-এর উপর)। আগের "দু'হাত-তোলা দোয়ার ভঙ্গি" ডিজাইন ছোট সাইজে(১৮px
// bottom-nav) অস্পষ্ট/torso-র মতো দেখাচ্ছিল(owner-reported, ছবি-verified) — তাই
// owner-এর সুপারিশ অনুযায়ী তাসবীহ/গোল-পুঁতির loop-এ পরিবর্তন করা হলো। ছোট সাইজেও
// clearly পড়া যায় বলে(dot-ring pattern) এবং আগে থেকেই TasbihIcon(নিচে/উপরে)-এ
// প্রমাণিত+ব্যবহৃত ডিজাইন বলে সেই একই bead-loop pattern এখানে reuse করা হলো(নতুন
// অপরীক্ষিত SVG path রিস্ক এড়াতে)। TasbihIcon নিজে অপরিবর্তিত(আলাদা export, কোথাও
// touch হয়নি) — শুধু AmolIcon-এর ভিতরের shape বদলেছে, নাম/export/import signature
// একই থাকায় BottomNav.jsx-এ কোনো change লাগেনি।
export function AmolIcon({
  size = 18,
  color = "currentColor",
  className,
  style,
  filled = false
}) {
  const beadFill = filled ? color : "none";
  const beadPositions = [
    [12, 4.3], [17.6, 6.9], [19.6, 12.5], [17, 18],
    [11.3, 20], [5.9, 18], [4, 12], [6.4, 6.5]
  ];
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: { stroke: color, ...style }
  },
    ...beadPositions.map(([cx, cy], i) => /*#__PURE__*/React.createElement("circle", {
      key: i, cx, cy, r: 1.5, fill: beadFill
    })),
    /*#__PURE__*/React.createElement("line", { x1: 11.3, y1: 20, x2: 11.3, y2: 23 })
  );
}
export function CompassIcon({
  size = 18,
  color = "currentColor",
  className,
  style,
  filled = false
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: { fill: "none", stroke: color, ...style }
  },
    /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 9 }),
    /*#__PURE__*/React.createElement("polygon", {
      points: "16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76",
      fill: filled ? color : "none"
    })
  );
}
// §B৭ Empty-state illustration(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬, owner-approved):
// কাস্টম-টাস্ক empty-state-এ ব্যবহারের জন্য নতুন icon — existing Icon()
// wrapper-এর stroke-based convention অনুসরণ করে(নতুন কোনো asset/library না)।
export function ClipboardListIcon({
  size,
  color,
  className
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "4",
    width: "12",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 4V2.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "10",
    x2: "15",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "14",
    x2: "15",
    y2: "14"
  }));
}
// §B৭ Home category-header icon set(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬,
// owner-approved — emoji("🕌📖🏃") এর বদলে নেভ-বার/টুলস-পেজের সাথে সামঞ্জস্যপূর্ণ
// monochrome outline icon): existing Icon() stroke-convention অনুসরণ করে, নতুন
// কোনো asset/library ছাড়া। MosqueIcon("সালাত ও সিয়াম") ও BookIcon("কুরআন ও ইলম")
// — UsersIcon("ব্যক্তিগত ও পারিবারিক অভ্যাস") ও TasbihIcon("যিকির ও দাওয়াহ")
// আগে থেকেই বিদ্যমান, পুনর্ব্যবহার করা হয়েছে।
export function MosqueIcon({
  size = 18,
  color = "currentColor",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className,
    style: style
  }, /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "21",
    x2: "22",
    y2: "21"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 21v-5a7 7 0 0 1 14 0v5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "4",
    r: "1",
    fill: color,
    stroke: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 21v-3a2 2 0 0 1 4 0v3"
  }));
}
export function BookIcon({
  size = 18,
  color = "currentColor",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className,
    style: style
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "21"
  }));
}
// §B৭ যিকির ও দাওয়াহ-header icon(2_5 Part B §B৭, ১৫ সেপ্টেম্বর ২০২৬, owner-
// approved — বটম-ন্যাভের "তাসবীহ"(TasbihIcon, বেড-সার্কেল ডিজাইন) থেকে আলাদা
// ইউনিক গ্লিফ চাওয়া হয়েছিল): filled-sparkle(এক বড় + দুই ছোট তারা), remembrance/
// noor-থিমের জন্য প্রচলিত একটি standalone icon-set glyph — stroke-based Icon()
// wrapper ব্যবহার না করে নিজস্ব filled-shape svg(অন্য filled-glyph, যেমন
// TasbihIcon-এর bead-circle, একই pattern অনুসরণ করে)।
export function SparkleIcon({
  size = 18,
  color = "currentColor",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: color,
    className: className,
    style: style
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2.5c.5 3.2 1 5.4 2.3 6.7 1.3 1.3 3.5 1.8 6.7 2.3-3.2.5-5.4 1-6.7 2.3-1.3 1.3-1.8 3.5-2.3 6.7-.5-3.2-1-5.4-2.3-6.7C8.4 12.5 6.2 12 3 11.5c3.2-.5 5.4-1 6.7-2.3C11 8 11.5 5.7 12 2.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 15.5c.3 1.4.6 2.2 1.3 2.9.7.7 1.5 1 2.9 1.3-1.4.3-2.2.6-2.9 1.3-.7.7-1 1.5-1.3 2.9-.3-1.4-.6-2.2-1.3-2.9-.7-.7-1.5-1-2.9-1.3 1.4-.3 2.2-.6 2.9-1.3.7-.7 1-1.5 1.3-2.9z"
  }));
}
// §B৭ ব্যক্তিগত ও পারিবারিক অভ্যাস-header icon(2_5 Part B §B৭, ১৫ সেপ্টেম্বর
// ২০২৬, owner-approved — UsersIcon("দুই মানুষ", human-silhouette outline)-এর
// বদলে ৩ সদস্যের(মা-বাবা-সন্তান) পরিবার বোঝায় এমন abstract mark চাওয়া হয়েছিল,
// শর্ত: প্রিমিয়াম দেখাবে এবং ধর্মীয় sensitivity-এর কারণে মানব-অবয়ব/জেন্ডার-
// নির্দিষ্ট আকৃতি স্পষ্ট থাকবে না): তাই এখানে কোনো head-and-shoulders silhouette
// নেই — শুধু ৩টা বিমূর্ত বৃত্ত(দুটো বড়=বাবা-মা, একটা ছোট=সন্তান) আর নিচে একটা
// নরম আলিঙ্গন-আর্ক(নীড়/ছাতার মতো) দিয়ে "family unit" বোঝানো হয়েছে — কোনো মুখ,
// শরীর বা লিঙ্গ-নির্দেশক অংশ নেই, সম্পূর্ণ geometric/logo-mark স্টাইল।
export function FamilyIcon({
  size = 18,
  color = "currentColor",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement(Icon, {
    size: size,
    color: color,
    className: className,
    style: style
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 20.5c0-4.2 4-7 9-7s9 2.8 9 7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7.2",
    cy: "7.3",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16.8",
    cy: "7.3",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "14.2",
    r: "2.1",
    fill: color
  }));
}
export function AppLogo({
  size = 32,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("img", {
    src: "logo.png",
    alt: "Daily Task",
    width: size,
    height: size,
    className: className,
    style: {
      width: size,
      height: size,
      objectFit: "contain",
      flexShrink: 0
    }
  });
}

// §Google Sign-in premium button(১৬ সেপ্টেম্বর ২০২৬, owner-requested): official
// multi-color "G" logo(Google-এর নিজস্ব branding kit-এর standard glyph, Sign-in
// button-এ ব্যবহারের জন্যই intended) — Icon() wrapper(stroke-only,single-color)
// এখানে অনুপযুক্ত বলে standalone fill-based SVG।
export function GoogleGIcon({ size = 20 }) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    "aria-hidden": "true"
  },
    /*#__PURE__*/React.createElement("path", { fill: "#FFC107", d: "M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" }),
    /*#__PURE__*/React.createElement("path", { fill: "#FF3D00", d: "M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" }),
    /*#__PURE__*/React.createElement("path", { fill: "#4CAF50", d: "M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" }),
    /*#__PURE__*/React.createElement("path", { fill: "#1976D2", d: "M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" })
  );
}
