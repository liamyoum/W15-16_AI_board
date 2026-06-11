import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite는 React 개발 서버와 빌드를 담당하는 프론트엔드 도구다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
