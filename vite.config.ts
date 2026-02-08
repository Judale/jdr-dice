import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base:"/jdr-dice.git/",
  resolve: {
    dedupe: ["react", "react-dom", "three", "@react-three/fiber"],
  },
  optimizeDeps: {
    include: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/rapier"],
  },
});
