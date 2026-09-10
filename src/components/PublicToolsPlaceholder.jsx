// §Bottom Navigation — generic reusable stub(2_4_Identity_Simplification_Plan.md §৯.২)।
// prayerTimes/tasbih/tools/settings tab-এর ভিতরে actual content(3_1/3_2/3_3, অথবা
// Settings bottom-sheet) বাস্তবায়িত না হওয়া পর্যন্ত এই একই component ব্যবহার হবে — শুধু
// import বদলে actual component বসালেই routing-switch touch করা লাগবে না।
export function PublicToolsPlaceholder({ title }) {
  return React.createElement(
    "div",
    { className: "min-h-screen pb-24 bg-[#F4F7F1] flex flex-col items-center justify-center px-6 text-center gap-2" },
    React.createElement(
      "div",
      { className: "text-lg font-semibold", style: { color: "var(--theme-primary, #0E4B43)", fontFamily: "'Noto Serif Bengali', serif" } },
      title
    ),
    React.createElement("p", { className: "text-sm text-gray-500" }, "শীঘ্রই আসছে")
  );
}
