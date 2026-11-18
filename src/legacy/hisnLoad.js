// hisnLoad.js — হিসনুল মুসলিমের সব ব্যাচ lazy-load (আলাদা chunk, প্রথম paint ভারী করে না)। একবার লোড হলে cache।
// নতুন ব্যাচ যুক্ত হলে এখানে ও hisnCore.buildChapters-এ একসাথে যোগ হবে। ব্যর্থ হলে cache মুছে আবার চেষ্টা করা যায়।
import { buildChapters } from "./hisnCore.js";

let cached = null;

export function loadHisn() {
  if (!cached) {
    cached = Promise.all([
      import("./hisnBatch1.js"), import("./hisnData.js"), import("./hisnBatch2.js"), import("./hisnBatch3.js"),
      import("./hisnBatch4.js"), import("./hisnBatch5.js"), import("./hisnBatch6.js"), import("./hisnBatch7.js"), import("./hisnBatch8.js"),
    ]).then(([b1, m, b2, b3, b4, b5, b6, b7, b8]) => ({
      chapters: buildChapters(b1.HISN_BATCH1, m.HISN_MORNING_EVENING, b2.HISN_BATCH2, b3.HISN_BATCH3, b4.HISN_BATCH4, b5.HISN_BATCH5, b6.HISN_BATCH6, b7.HISN_BATCH7, b8.HISN_BATCH8),
      source: m.HISN_SOURCE,
    }), (e) => { cached = null; throw e; });
  }
  return cached;
}
