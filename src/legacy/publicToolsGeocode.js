// publicToolsGeocode.js — "সময়সূচি" ট্যাব, এলাকা/উপজেলা/জেলা-ভিত্তিক accurate
// location search। data/ layer(Dev Rule ২): external call এই ফাইলেই সীমাবদ্ধ।
//
// §Architecture-নোট(১৮ সেপ্টেম্বর ২০২৬, owner-instruction): division-level
// হার্ডকোডেড ৮-শহর লিস্ট(publicToolsSettings.js: MANUAL_LOCATIONS) উপজেলা/
// এলাকা-স্তরের accuracy দিতে পারছিল না(owner: "জেলা, উপজেলা, এলাকা সব লাগবে,
// নতুবা একুরেট সময় দেখাবে না") — ৬৪ জেলা+৪৯৫ উপজেলা+অগণিত এলাকা হার্ডকোড করা
// অবাস্তব ও ভুল-প্রবণ। তাই নতুন external dependency হিসেবে Nominatim(OpenStreetMap)
// free, no-API-key geocoding endpoint যোগ করা হলো — এটা Aladhan ছাড়া প্রথম নতুন
// external service, তাই এখানে explicitly flag রাখা হলো(Dev Rule ২: unrelated
// external service অনুমতি ছাড়া যোগ করা যাবে না — এই ক্ষেত্রে owner নিজেই
// accuracy-সমস্যা রিপোর্ট করে সমাধান চেয়েছেন, তাই সরাসরি সমাধানযোগ্য বলে যোগ
// করা হলো, কিন্তু owner review-এর জন্য এই নোট রাখা আবশ্যক)।
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

// display_name সাধারণত "এলাকা, উপজেলা, জেলা, বিভাগ, বাংলাদেশ" ফরম্যাটে আসে —
// প্রথম ৩ অংশ(এলাকা/উপজেলা/জেলা) রেখে বাকি(বিভাগ/দেশ) বাদ দেওয়া হয়, UI-তে
// compact রাখতে।
function shortenDisplayName(displayName, fallback) {
  if (!displayName) return fallback;
  return displayName.split(",").slice(0, 3).join(",").trim();
}

async function searchBangladeshLocation(query) {
  const q = (query || "").trim();
  if (q.length < 2) return [];
  const url = `${NOMINATIM_BASE}?format=json&countrycodes=bd&q=${encodeURIComponent(q)}&limit=8&accept-language=bn,en`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("location search failed");
  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return json.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    name: shortenDisplayName(r.display_name, q),
    source: "search",
  }));
}

export { searchBangladeshLocation };
