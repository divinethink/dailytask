import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A1 — Hello World scaffold only. sw.js/manifest/icons intentionally NOT
// wired yet (that happens in A5, per Roadmap 2_1_Roadmap.md).
// বড় লাইব্রেরি আলাদা chunk-এ (ক্যাশ-বান্ধব, আচরণ অপরিবর্তিত)।
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firestore")) return "firestore";
          if (id.includes("firebase")) return "firebase";
          if (id.includes("chart.js")) return "chartjs";
          if (id.includes("react")) return "react";
        },
      },
    },
  },
});
