// React.lazy-র নিরাপদ মোড়ক। নতুন deploy-এর পর পুরনো পেজ মুছে-যাওয়া chunk
// (যেমন BackupRestore-xxxx.js) চাইলে, বা নেটওয়ার্ক ক্ষণিক ব্যর্থ হলে
// "Failed to fetch dynamically imported module" হয়। এখানে একবার আবার চেষ্টা
// করা হয়; তারপরও না হলে পেজ একবারই reload হয় (নতুন index পেতে)।
// reload-লুপ ঠেকাতে sessionStorage-এ চিহ্ন রাখা হয়; ডেটায় কোনো হাত পড়ে না।
const FLAG = "dt_chunk_reload";

export function lazyRetry(factory) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (e1) {
      try {
        await new Promise((r) => setTimeout(r, 800));
        return await factory();
      } catch (e2) {
        let already = false;
        try {
          already = sessionStorage.getItem(FLAG) === "1";
          if (!already) sessionStorage.setItem(FLAG, "1");
        } catch {
          already = true; // storage না থাকলে লুপের ঝুঁকি নেই — reload নয়
        }
        if (!already) {
          window.location.reload();
          return new Promise(() => {}); // reload চলাকালীন error-screen দেখানো হবে না
        }
        throw e2;
      }
    }
  });
}

// সফলভাবে চালু হলে চিহ্ন মুছে দিন, যাতে পরের deploy-এও একবার reload চলে।
export function clearChunkReloadFlag() {
  try { sessionStorage.removeItem(FLAG); } catch { /* উপেক্ষা */ }
}
