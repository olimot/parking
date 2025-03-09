import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "",
  root: "src",
  plugins: [react()],
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
  },
});
