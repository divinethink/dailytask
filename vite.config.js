import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A1 — Hello World scaffold only. sw.js/manifest/icons intentionally NOT
// wired yet (that happens in A5, per Roadmap 2_1_Roadmap.md).
export default defineConfig({
  plugins: [react()],
});
