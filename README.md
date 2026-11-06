# Daily Task

বাংলা ইসলামিক পারিবারিক আমল ট্র্যাকার (PWA)।
Stack: React 18 + Vite + Tailwind, Firebase (Firestore, Google Auth, App Check), Cloudflare Pages।
সীমা: Firebase Spark (Free) + Cloudflare Pages Free — Blaze/backend Owner-অনুমতি ছাড়া নয়।

## লোকালে চালানো
```
npm ci
cp .env.example .env     # নিচের ভেরিয়েবলগুলো পূরণ করুন
npm run dev
```
লোকালে Google সাইন-ইন/App Check চালাতে reCAPTCHA-র allowed domain-এ `localhost` যোগ করতে হয়।

## Env ভেরিয়েবল (`.env.example`)
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
`VITE_FIREBASE_MEASUREMENT_ID`, `VITE_RECAPTCHA_SITE_KEY`।
লাইভে এই মানগুলো Cloudflare Pages-এর Environment variables-এ থাকে। কখনো repo-তে commit করবেন না।

## চেক (push-এর আগে/CI-তে)
| কাজ | কমান্ড |
|---|---|
| lint (`no-undef` error) | `npm run lint` (config: `eslint.lint.json`) |
| unit test (পিওর লজিক) | `npm test` |
| Rules test (Firestore Emulator, Java লাগে) | `npm run test:rules` |
| build | `npm run build` |

CI (`.github/workflows/ci.yml`) প্রতি push/PR-এ lint + build + test + Rules test চালায়।
type-check ইচ্ছাকৃতভাবে নেই (প্রজেক্ট সাধারণ JS/JSX)।

## Deploy
- **অ্যাপ**: `main` branch-এ push হলে Cloudflare Pages নিজে build ও deploy করে।
- **Firestore Rules**: GitHub → Actions → **deploy-rules** → Run workflow → confirm ঘরে `DEPLOY` লিখুন (Secret: `FIREBASE_SERVICE_ACCOUNT`)।
- **ZIP আপলোড**: root-এ `*.zip` push করলে `unzip.yml` খুলে রেপোয় বসায় (বিপজ্জনক পথ/symlink থাকলে বাতিল)।
- **Service Worker**: আইকন/অ্যাসেট বদলালে `public/sw.js`-এর `CACHE` নাম (এখন `daily-task-v5`) বাড়ান।
- Security headers/CSP: `public/_headers` (CSP এখনো Report-Only)।

## ডকুমেন্ট
কী/কেন → Roadmap · কীভাবে → Architecture Plan · স্ক্রিন → Mockup · বাকি কাজ → Checklist · সাধারণ নিয়ম → `1_d_App_Dev_Rules`।
