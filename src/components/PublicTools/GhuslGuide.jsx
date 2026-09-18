// GhuslGuide.jsx — "সহায়িকা"→"সালাত ও পবিত্রতা", item ২০খ(3_1)। accordion।
// React global(window.React, globals.js)।

import { EditableSection } from "./EditableSection.jsx";

const GHUSL_DEFAULT = [
  { itemId: "gh_when_janabah", title: "কখন ফরজ হয়: সহবাস/বীর্যপাত", body: "স্বামী-স্ত্রী সহবাস(বীর্যপাত হোক বা না হোক) অথবা যেকোনো কারণে বীর্যপাত(স্বপ্নদোষসহ) হলে গোসল ফরজ হয়।" },
  { itemId: "gh_when_menses", title: "কখন ফরজ হয়: হায়েজ/নেফাস শেষ হলে", body: "মাসিক(হায়েজ) বা প্রসবোত্তর রক্তস্রাব(নেফাস) শেষ হলে গোসল ফরজ হয়।" },
  { itemId: "gh_niyyah", title: "নিয়ত করা(সুন্নত)", body: "পবিত্রতা অর্জনের নিয়ত করে গোসল শুরু করা।" },
  { itemId: "gh_hands", title: "উভয় হাত কব্জি পর্যন্ত ধোয়া", body: "গোসল শুরুর আগে উভয় হাত ধুয়ে নেওয়া।" },
  { itemId: "gh_private_parts", title: "লজ্জাস্থান ও শরীরে লেগে থাকা নাপাকি ধোয়া", body: "প্রথমে শরীরে লেগে থাকা নাপাকি/শুক্র ভালোভাবে ধুয়ে ফেলা।" },
  { itemId: "gh_wudu", title: "ওজু করা(পা ধোয়া ছাড়া, সুন্নত)", body: "স্বাভাবিক নামাজের ওজুর মতো ওজু করা(পা ধোয়া গোসলের শেষে করা মুস্তাহাব, যদি দাঁড়িয়ে গোসল করা হয়)।" },
  { itemId: "gh_head", title: "মাথায় ৩ বার পানি ঢেলে চুলের গোড়া ভেজানো(ফরজ)", body: "মাথায় পানি ঢেলে চুলের গোড়া পর্যন্ত ভালোভাবে ভেজানো, চুল স্পর্শ পর্যন্ত পানি পৌঁছানো নিশ্চিত করা।" },
  { itemId: "gh_right_left", title: "প্রথমে ডান পাশ, তারপর বাম পাশ(ফরজ)", body: "সম্পূর্ণ শরীরে পানি পৌঁছানো ফরজ — প্রথমে ডান কাঁধ/শরীর, তারপর বাম কাঁধ/শরীরে পানি ঢালা।" },
  { itemId: "gh_feet", title: "পা ধোয়া(যদি আগে না ধোয়া হয়ে থাকে)", body: "গোসলের শেষে পা ধুয়ে নেওয়া(দাঁড়িয়ে গোসল করলে)।" },
];

export function GhuslGuide() {
  return /*#__PURE__*/React.createElement(EditableSection, {
    sectionId: "ghusl_guide",
    format: "accordion",
    defaultContent: GHUSL_DEFAULT,
  });
}
