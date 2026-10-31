// §লোড-স্পিড ট্রিটমেন্ট(Tailwind CDN→build-time, ১৫ সেপ্টেম্বর ২০২৬): আগে
// index.html-এ cdn.tailwindcss.com দিয়ে browser-এ runtime JIT-compile হতো
// (Tailwind নিজেই এটাকে production-এর জন্য অনুপযুক্ত বলে, দুর্বল-প্রসেসর ফোনে
// সবচেয়ে বেশি সময় এখানেই যেত)। এখন build-time PostCSS-plugin দিয়ে static
// CSS bundle তৈরি হবে(Vite-এর default postcss-pipeline reuse, নতুন কোনো
// convention না)। content-glob app.js(React.createElement className-string)
// ও সব .jsx component-ফাইল কভার করে।
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // §থিম ধাপ ২: emerald-স্কেল থিম-টোকেনে(index.html :root-এ ডিফল্ট=Tailwind-এর আসল emerald)
        emerald: {
          50: "rgb(var(--e-50) / <alpha-value>)",
          100: "rgb(var(--e-100) / <alpha-value>)",
          200: "rgb(var(--e-200) / <alpha-value>)",
          300: "rgb(var(--e-300) / <alpha-value>)",
          400: "rgb(var(--e-400) / <alpha-value>)",
          500: "rgb(var(--e-500) / <alpha-value>)",
          600: "rgb(var(--e-600) / <alpha-value>)",
          700: "rgb(var(--e-700) / <alpha-value>)",
          800: "rgb(var(--e-800) / <alpha-value>)",
          900: "rgb(var(--e-900) / <alpha-value>)",
          950: "rgb(var(--e-950) / <alpha-value>)"
        },
      },
    },
  },
  plugins: [],
};
