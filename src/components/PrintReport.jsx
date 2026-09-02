// A4-G6-Part B — Print/PDF Report (self-contained "if (printMode)" branch),
// extracted verbatim from legacy App() (app.js lines ~6439-6738). Structural-only
// (Owner Rule 2): no logic/condition change. App() now calls this component when
// printMode is true (same control-flow, just delegated). All module-level helpers
// passed as explicit props (not assumed global — see G1 toBn lesson).
import { Printer } from "./icons.jsx";

const { useEffect } = React;

// PDF filename suggestion: browser's "Save as PDF" print-dialog uses
// document.title as the default filename. English month names used here
// (independent of BN_MONTHS, which is Bengali-only) purely for filename
// readability — no display text changes.
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function PrintReport({
  allFields,
  meetingState,
  monthCursor,
  monthEntries,
  monthStats,
  printMode,
  selectedMember,
  setPrintMode,
  weekly,
  weeklyRowCount,
  BN_MONTHS,
  dailyScore,
  fieldApplies,
  fieldPercent,
  getWeekRanges,
  isExcused,
  isFieldExcusable,
  pad2,
  toBn
}) {
  useEffect(() => {
    if (!printMode) return;
    const prevTitle = document.title;
    const namePart = (selectedMember?.name || "Report").trim().replace(/\s+/g, "_");
    document.title = `${namePart}_${EN_MONTHS[monthCursor.month0]}_${monthCursor.year}`;
    return () => {
      document.title = prevTitle;
    };
  }, [printMode, selectedMember, monthCursor]);
  const total = monthStats.total;
    const rows = Array.from({
      length: total
    }, (_, i) => i + 1);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#111",
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("style", null, `
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border: 1px solid #000; padding: 3px 2px; font-size: 9px; text-align: center; vertical-align: middle; word-wrap: break-word; }
          th { background: var(--theme-primary) !important; color: #fff !important; font-weight: 600; font-size: 7.5px; padding: 2px; height: 42px; }
          tr { height: 27px; }

          .meeting-table th { background: #f0f4f1 !important; color: #000 !important; font-size: 11px; font-weight: 700; height: 30px; border: 1px solid #333; }
          .meeting-table td { font-size: 10px; padding: 6px; border: 1px solid #333; text-align: left; }
          .meeting-table tr { page-break-inside: avoid; break-inside: avoid; }
        `), /*#__PURE__*/React.createElement("div", {
      className: "w-full mx-auto print-page",
      style: {
        minHeight: "270mm"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2 no-print"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setPrintMode(false),
      className: "px-3 py-1.5 rounded-lg border text-sm font-semibold bg-white",
      style: {
        borderColor: "#D8DED3"
      }
    }, "← ফিরে যান"), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.print(),
      className: "px-4 py-1.5 rounded-lg text-sm font-semibold text-white flex items-center gap-2",
      style: {
        background: "var(--theme-primary)"
      }
    }, /*#__PURE__*/React.createElement(Printer, {
      size: 14
    }), " প্রিন্ট / PDF ডাউনলোড (২টি পেজ)")), /*#__PURE__*/React.createElement("div", {
      style: {
        borderBottom: "2px solid var(--theme-primary)",
        paddingBottom: "4px",
        marginBottom: "6px"
      },
      className: "flex justify-between items-end"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "'Noto Serif Bengali', serif",
        fontSize: 15,
        fontWeight: 700,
        margin: 0,
        color: "var(--theme-primary)"
      }
    }, "মাসিক আমল ও পারফরম্যান্স রিপোর্ট"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 9,
        margin: "2px 0 0 0",
        color: "#444"
      }
    }, "মাস: ", /*#__PURE__*/React.createElement("b", null, BN_MONTHS[monthCursor.month0], " ", toBn(monthCursor.year)), " \xA0|\xA0 সদস্য: ", /*#__PURE__*/React.createElement("b", null, selectedMember?.name))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        textAlign: "right",
        color: "#333"
      }
    }, "পূরণ করা দিন: ", /*#__PURE__*/React.createElement("b", null, toBn(monthStats.filled), "/", toBn(total)), " \xA0|\xA0 গড় স্কোর: ", /*#__PURE__*/React.createElement("b", null, toBn(monthStats.avgPct), "%"))), /*#__PURE__*/React.createElement("table", {
      className: "print-daily-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "26px"
      }
    }, "তাং"), allFields.map(f => /*#__PURE__*/React.createElement("th", {
      key: f.key
    }, f.shortLabel || f.label)), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "34px"
      }
    }, "স্কোর"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(d => {
      const e = monthEntries[pad2(d)];
      const s = dailyScore(e, selectedMember, allFields);
      return /*#__PURE__*/React.createElement("tr", {
        key: d
      }, /*#__PURE__*/React.createElement("td", {
        style: {
          fontWeight: 700,
          background: "#f0f4f1"
        }
      }, toBn(d)), allFields.map(f => {
        if (!fieldApplies(f, selectedMember)) return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: "#ccc"
          }
        }, "—");
        if (isFieldExcusable(f, selectedMember) && isExcused(e, f.key)) return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: "#9A8A5C",
            fontStyle: "italic",
            fontSize: "7px"
          }
        }, "ওজর");
        if (!e) return /*#__PURE__*/React.createElement("td", {
          key: f.key
        });
        const v = e[f.key];
        let disp = f.type === "bool" ? v ? "✓" : "" : v !== undefined && v !== "" ? toBn(v) : "";
        return /*#__PURE__*/React.createElement("td", {
          key: f.key,
          style: {
            color: f.type === "bool" && v ? "var(--theme-primary)" : "#111",
            fontWeight: f.type === "bool" && v ? "bold" : "normal"
          }
        }, disp);
      }), /*#__PURE__*/React.createElement("td", {
        style: {
          fontWeight: 700,
          background: "#f0f4f1"
        }
      }, s === null ? "" : toBn(Math.round(s * 100)) + "%"));
    })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        background: "#E7EEE3",
        fontWeight: 700
      }
    }, /*#__PURE__*/React.createElement("td", null, "%"), allFields.map(f => {
      const pct = fieldPercent(f, monthEntries, total, selectedMember);
      return /*#__PURE__*/React.createElement("td", {
        key: f.key
      }, pct === null ? "—" : toBn(pct) + "%");
    }), /*#__PURE__*/React.createElement("td", null, toBn(monthStats.avgPct), "%")))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        textTransform: "uppercase",
        color: "#888",
        textAlign: "right",
        marginTop: "4px"
      }
    }, "পৃষ্ঠা ১")), /*#__PURE__*/React.createElement("div", {
      className: "page-break w-full mx-auto print-page",
      style: {
        paddingTop: "8mm"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: "15px"
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: "16px",
        fontFamily: "'Noto Serif Bengali', serif",
        fontWeight: "bold",
        margin: "0 0 6px 0",
        color: "var(--theme-primary)",
        textAlign: "center"
      }
    }, "সাপ্তাহিক রিফ্লেকশন (Weekly Reflection)"), /*#__PURE__*/React.createElement("table", {
      className: "meeting-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "10%"
      }
    }, "সপ্তাহ"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "যা ভালো হয়েছে"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "কোথায় ঘাটতি ছিল"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "30%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "আগামী পরিকল্পনা"))), /*#__PURE__*/React.createElement("tbody", null, getWeekRanges(total).slice(0, weeklyRowCount).map(({
      week: w,
      start,
      end
    }) => /*#__PURE__*/React.createElement("tr", {
      key: w
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        fontWeight: "bold"
      }
    }, toBn(w), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        fontWeight: 400,
        color: "#555"
      }
    }, "(", toBn(start), "-", toBn(end), ")")), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.good || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.gap || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, weekly[w]?.plan || "")))))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: "12px",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "'Noto Serif Bengali', serif",
        fontSize: 20,
        fontWeight: 700,
        margin: 0,
        color: "#000"
      }
    }, "মাসিক পারিবারিক সভা ও সিদ্ধান্ত"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        right: "0",
        top: "5px",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#111"
      }
    }, (() => {
      const t = new Date();
      return `${toBn(t.getDate())} ${BN_MONTHS[t.getMonth()]}, ${toBn(t.getFullYear())}`;
    })())), /*#__PURE__*/React.createElement("table", {
      className: "meeting-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: "8%",
        textAlign: "center"
      }
    }, "ক্রমিক"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "25%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "বিষয়"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "47%",
        textAlign: "left",
        paddingLeft: "8px"
      }
    }, "কার্যপরিধি/সিদ্ধান্ত"), /*#__PURE__*/React.createElement("th", {
      style: {
        width: "20%",
        textAlign: "center"
      }
    }, "বাস্তবায়নকারী"))), /*#__PURE__*/React.createElement("tbody", null, (meetingState.rows && meetingState.rows.length > 0 ? meetingState.rows : [{}]).map((row, idx) => /*#__PURE__*/React.createElement("tr", {
      key: idx,
      style: {
        height: "40px"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        fontWeight: "bold"
      }
    }, toBn(idx + 1)), /*#__PURE__*/React.createElement("td", {
      style: {
        fontWeight: "600",
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, row.topic || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        verticalAlign: "top",
        whiteSpace: "pre-wrap"
      }
    }, row.decision || ""), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "center",
        verticalAlign: "middle"
      }
    }, row.person || ""))))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "8px",
        textTransform: "uppercase",
        color: "#888",
        textAlign: "right",
        marginTop: "10px"
      }
    }, "পৃষ্ঠা ২")));
}
