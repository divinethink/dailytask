// publicToolsSettings.js — Public Tools, Phase A item ১(Foundation): location+
// মাযহাব settings module(3_1_Public_Tools_Roadmap.md Phase A / 3_2 §৩/§৪.১)।
// Pure per-device localStorage — কোনো Firestore/family-data touch করে না।
// data/ layer convention(Dev Rule ২): এই ফাইল শুধু settings read/write করে,
// কোনো UI/JSX নেই।

const LOCATION_KEY = "dt_pt_location";
const MADHAB_KEY = "dt_pt_madhab";

// মাযহাব: Aladhan API-র school param অনুযায়ী — 0 = Shafi/Maliki/Hanbali, 1 = Hanafi।
// App-এর বিদ্যমান content(রাকাত-সংখ্যা টেবিল ইত্যাদি, 3_1 সংগৃহীত কনটেন্ট) Hanafi-ভিত্তিক
// বলে default Hanafi রাখা হলো।
const DEFAULT_MADHAB = 1;

// §Scope-নোট(owner-decision pending): 3_2 §৪.২-এর "manual location-override
// dropdown" এই মুহূর্তে একটা curated বাংলাদেশ বিভাগীয় শহর-তালিকা হিসেবে
// বাস্তবায়িত হয়েছে(কোনো free-text/geocoding না) — কারণ geocoding-এর জন্য
// নতুন external service(যেমন BigDataCloud) লাগত, যেটা 3_2-তে approved
// architecture-এর বাইরে(শুধু Aladhan API approved, Dev Rule ২: unrelated
// external service অনুমতি ছাড়া যোগ করা যাবে না)। প্রয়োজনে ভবিষ্যতে owner-approval
// নিয়ে geocoding যোগ করা যাবে।
const MANUAL_LOCATIONS = [
  { id: "dhaka", name: "ঢাকা", lat: 23.8103, lon: 90.4125 },
  { id: "chittagong", name: "চট্টগ্রাম", lat: 22.3569, lon: 91.7832 },
  { id: "rajshahi", name: "রাজশাহী", lat: 24.3745, lon: 88.6042 },
  { id: "khulna", name: "খুলনা", lat: 22.8456, lon: 89.5403 },
  { id: "barisal", name: "বরিশাল", lat: 22.701, lon: 90.3535 },
  { id: "sylhet", name: "সিলেট", lat: 24.8949, lon: 91.8687 },
  { id: "rangpur", name: "রংপুর", lat: 25.7439, lon: 89.2752 },
  { id: "mymensingh", name: "ময়মনসিংহ", lat: 24.7471, lon: 90.4203 },
];

function getSavedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveLocation(location) {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch {}
}

function getSavedMadhab() {
  try {
    const raw = localStorage.getItem(MADHAB_KEY);
    const n = raw !== null ? Number(raw) : DEFAULT_MADHAB;
    return n === 0 || n === 1 ? n : DEFAULT_MADHAB;
  } catch {
    return DEFAULT_MADHAB;
  }
}

function saveMadhab(madhab) {
  try {
    localStorage.setItem(MADHAB_KEY, String(madhab));
  } catch {}
}

// GPS দিয়ে বর্তমান lat/lon বের করে — কোনো reverse-geocode call না(উপরের নোট
// দ্রষ্টব্য), তাই label সবসময় জেনেরিক "GPS অবস্থান"।
function detectGpsLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("এই ব্রাউজারে GPS সাপোর্ট নেই"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: "GPS অবস্থান",
          source: "gps",
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}

export {
  getSavedLocation,
  saveLocation,
  getSavedMadhab,
  saveMadhab,
  detectGpsLocation,
  DEFAULT_MADHAB,
  MANUAL_LOCATIONS,
};
