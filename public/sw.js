// v3: /assets/* (Vite hashed build files) এখন cache-first; activate-এ পুরনো
// "daily-task-v2" cache স্বয়ংক্রিয়ভাবে মুছে যায় (নিচের activate handler)।
const CACHE = "daily-task-v3";
// /assets/ entry-র সর্বোচ্চ সংখ্যা — প্রতি deploy-এ নতুন hash জমে cache
// অনির্দিষ্টকাল বাড়া ঠেকাতে; সীমা ছাড়ালে সবচেয়ে পুরনো entry আগে বাদ যায়।
const MAX_ASSET_ENTRIES = 100;
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

// Analytics/tracking requests must always hit the network directly — never
// served from cache and never written into it. Caching these would return
// stale beacons (or none at all when offline, which is fine for analytics
// but wrong if we accidentally cached a real response) and would also
// bloat the cache with third-party traffic the app doesn't own.
const ANALYTICS_HOSTS = [
  "google-analytics.com",
  "analytics.google.com",
  "googletagmanager.com",
];
function isAnalyticsRequest(url) {
  try {
    const host = new URL(url).hostname;
    return ANALYTICS_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

// Vite-এর hashed build asset (/assets/index-AbC123.js ইত্যাদি): ফাইলের
// নামেই content-hash থাকে, তাই একই URL-এর content কখনো বদলায় না —
// revalidate ছাড়াই cache থেকে দেওয়া নিরাপদ।
function isHashedAsset(url) {
  try {
    return new URL(url).pathname.startsWith("/assets/");
  } catch {
    return false;
  }
}

async function trimAssetCache(cache) {
  const keys = await cache.keys(); // insertion order — সবচেয়ে পুরনো আগে
  const assetKeys = keys.filter((r) => isHashedAsset(r.url));
  const extra = assetKeys.length - MAX_ASSET_ENTRIES;
  for (let i = 0; i < extra; i++) await cache.delete(assetKeys[i]);
}

async function assetCacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    // Guard: server কখনো missing asset-এর জায়গায় index.html (SPA fallback,
    // status 200) ফেরত দিলে সেটা JS/CSS URL-এর নিচে cache করা যাবে না —
    // নইলে ওই URL স্থায়ীভাবে ভুল content দেবে।
    const ct = res.headers.get("content-type") || "";
    if (res.status === 200 && !ct.includes("text/html")) {
      try {
        await cache.put(request, res.clone());
        await trimAssetCache(cache);
      } catch {
        // cache-write ব্যর্থ হলেও response ঠিকই ফেরত যাবে
      }
    }
    return res;
  } catch {
    // Offline + cache miss: undefined না, explicit Response(C-3/C-4 fix-এর
    // একই নীতি — respondWith() যেন সবসময় valid Response পায়)।
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (isAnalyticsRequest(e.request.url)) {
    // Bypass the cache entirely — go straight to the network, and don't
    // fall back to a cached response on failure (there won't be one, and
    // there shouldn't be).
    e.respondWith(fetch(e.request));
    return;
  }
  // [নতুন] Cross-origin request(Firestore Listen/Write channel, Auth,
  // reCAPTCHA ইত্যাদি) কখনো SW দিয়ে proxy/cache করা হবে না — এগুলোর
  // মধ্যে কিছু streaming/long-polling connection, SW-এর respondWith()-এর
  // মধ্য দিয়ে গেলে browser সেটা ভেঙে দেয়("ServiceWorker intercepted the
  // request and encountered an unexpected error")। শুধু app-এর নিজের
  // (same-origin) static asset-ই SW cache করবে, বাকি সব browser-এর
  // default(direct network) আচরণে ছেড়ে দেওয়া হচ্ছে।
  if (!e.request.url.startsWith(self.location.origin)) return;

  // [নতুন] hashed build asset → cache-first (নিচের stale-while-revalidate
  // শুধু index.html/manifest/icon-এর জন্য থাকে — auto-update logic অপরিবর্তিত)।
  if (isHashedAsset(e.request.url)) {
    e.respondWith(assetCacheFirst(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // C-3 fix: previously this returned `cached`, which is
          // `undefined` on a cache miss. Passing `undefined` (or any
          // non-Response value) to respondWith() makes the browser treat
          // the request as a hard network error — visible to users as
          // Chrome's net::ERR_FAILED (e.g. the PWA's start_url navigation
          // hitting a transient network hiccup right at app launch, before
          // any cache entry exists for it).
          // Fix: if there's no cached match, fall back to the precached
          // app shell (./index.html) for navigation requests only — same
          // key used in the install event's ASSETS list — so the app
          // still opens instead of showing ERR_FAILED. For any other
          // asset (script/css/image) that's neither cached nor fetchable,
          // return an explicit empty Response instead of undefined, so
          // respondWith() always receives a valid Response.
          if (cached) return cached;
          if (e.request.mode === "navigate") {
            // C-4 fix: right after a site-data/cache clear, the very first
            // navigation can race ahead of the install event's precaching
            // (see ASSETS above) — at that moment caches.match("./index.html")
            // ALSO resolves to undefined (nothing cached yet). Returning
            // that undefined straight to respondWith() is the exact same
            // ERR_FAILED problem this fix block exists to prevent, just one
            // level deeper. Guard it the same way: fall back to an explicit
            // Response so respondWith() never receives undefined, no matter
            // how empty the cache is at this moment.
            return caches.match("./index.html").then((r) => r || new Response("", { status: 503, statusText: "Offline" }));
          }
          return new Response("", { status: 503, statusText: "Offline" });
        });
      return cached || fetchPromise;
    })
  );
});
