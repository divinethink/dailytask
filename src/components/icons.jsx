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
