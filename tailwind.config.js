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
    extend: {},
  },
  plugins: [],
};
