// ErrorBoundary.jsx — কোনো component crash করলে পুরো পর্দা সাদা না হয়ে সহজ বার্তা + ডিবাগ-বিবরণ + রিলোড বোতাম।
// বিবরণ শুধু এই পর্দায় দেখায়/ইউজার নিজে কপি করলে যায়; কোথাও নিজে থেকে পাঠানো বা সেভ হয় না।
import React from "react";

// সাধারণ ত্রুটির সহজ বাংলা ব্যাখ্যা(অনুমান নয়, শুধু ত্রুটির ধরন থেকে)।
function explain(err) {
  const name = (err && err.name) || "Error";
  const msg = String((err && err.message) || "");
  if (name === "ReferenceError" && /before initialization|is not defined/i.test(msg))
    return "কোডে এমন একটা নাম ব্যবহার হয়েছে যেটা তখনো তৈরি হয়নি বা নেই (ঘোষণার আগে ব্যবহার)।";
  if (name === "TypeError" && /undefined|null/i.test(msg))
    return "কোড এমন তথ্য ধরতে চেয়েছে যেটা তখন ফাঁকা (undefined/null) ছিল।";
  if (name === "TypeError" && /is not a function/i.test(msg))
    return "কোড এমন কিছুকে ফাংশন হিসেবে ডেকেছে যেটা ফাংশন নয়।";
  if (/Minified React error/i.test(msg) || /Invalid hook call|Rendered (more|fewer) hooks/i.test(msg))
    return "React-এর রেন্ডারিং নিয়ম ভেঙেছে (যেমন hook-এর ক্রম বা ভুল ধরনের মান দেখানো)।";
  if (/permission-denied|Missing or insufficient permissions/i.test(msg))
    return "Firestore Rules এই কাজের অনুমতি দেয়নি।";
  return "অ্যাপের ভেতরে একটা অপ্রত্যাশিত ত্রুটি হয়েছে।";
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, error: null, info: "", copied: false };
  }
  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info && info.componentStack);
    this.setState({ info: (info && info.componentStack) || "" });
  }
  detailText() {
    const e = this.state.error || {};
    const stack = String(e.stack || "").split("\n").slice(0, 6).join("\n");
    const comp = String(this.state.info || "").trim().split("\n").slice(0, 6).join("\n");
    return [
      "ধরন: " + (e.name || "Error"),
      "বার্তা: " + (e.message || ""),
      "সময়: " + new Date().toISOString(),
      "পেজ: " + (typeof location !== "undefined" ? location.pathname : ""),
      "--- stack ---", stack,
      "--- component ---", comp,
    ].join("\n");
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.detailText());
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const e = this.state.error;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7F1] px-5 py-6 text-center gap-3">
        <div className="text-lg font-bold text-[#1A2621]">কিছু একটা সমস্যা হয়েছে</div>
        <div className="text-sm text-[#5B6B64]">আপনার সেভ-করা ডেটা নিরাপদ আছে।</div>
        <div className="w-full max-w-md text-left rounded-2xl border border-[#E4E7E2] bg-white p-3 text-sm text-[#1A2621]">
          <div className="font-semibold mb-1">সমস্যাটা কী:</div>
          <div className="mb-2">{explain(e)}</div>
          <div className="text-xs text-[#5B6B64] break-words" style={{ fontFamily: "monospace" }}>
            {(e && e.name) || "Error"}: {(e && e.message) || ""}
          </div>
          <details className="mt-2">
            <summary className="text-xs font-semibold cursor-pointer">টেকনিক্যাল বিবরণ</summary>
            <pre className="mt-1 text-[11px] whitespace-pre-wrap break-words text-[#5B6B64]">{this.detailText()}</pre>
          </details>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => this.copy()}
            className="px-4 py-3 rounded-2xl border border-[#0E4B43] text-[#0E4B43] font-semibold min-h-[44px]"
          >
            {this.state.copied ? "কপি হয়েছে ✓" : "বিবরণ কপি করুন"}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-3 rounded-2xl bg-[#0E4B43] text-white font-semibold min-h-[44px]"
          >
            আবার চালু করুন
          </button>
        </div>
      </div>
    );
  }
}
