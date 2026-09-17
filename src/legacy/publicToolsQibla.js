// publicToolsQibla.js — কিবলা bearing calculation(3_2_Public_Tools_Architecture_Plan.md
// §৫)। Pure trig, কোনো UI/SDK না(Dev Rule ২: lib/data layer, SDK/UI-মুক্ত)।
// Live device-compass ব্যবহার হবে না(§৫-এ ইচ্ছাকৃত সিদ্ধান্ত) — শুধু static bearing।

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// lat/lon(ডিগ্রি) থেকে কাবার bearing(০-৩৬০ ডিগ্রি, উত্তর থেকে clockwise) বের করে।
function calculateQiblaBearing(lat, lon) {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA_LAT);
  const deltaLambda = toRad(KAABA_LON - lon);
  const theta = Math.atan2(
    Math.sin(deltaLambda) * Math.cos(phi2),
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
  );
  return ((theta * 180) / Math.PI + 360) % 360;
}

export { calculateQiblaBearing, KAABA_LAT, KAABA_LON };
