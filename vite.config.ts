import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/lettora-verse-app/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimización de chunks para mejorar velocidad de carga
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - librerías principales
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tooltip"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-animations": ["framer-motion"],
          "vendor-query": ["@tanstack/react-query"],
          
          // Feature chunks - páginas por funcionalidad
          "pages-auth": ["./src/pages/Auth.tsx", "./src/pages/Onboarding.tsx"],
          "pages-reader": ["./src/pages/ChapterReader.tsx", "./src/pages/BookDetail.tsx"],
          "pages-write": ["./src/pages/Write.tsx", "./src/pages/AdvancedWrite.tsx", "./src/pages/WriteSelector.tsx"],
          "pages-social": ["./src/pages/UserProfile.tsx", "./src/pages/Profile.tsx"],
          "pages-chat": ["./src/pages/Chats.tsx", "./src/pages/ChatConversation.tsx"],
          "pages-admin": ["./src/pages/Admin.tsx", "./src/pages/Admins.tsx"],
          "pages-community": ["./src/pages/Community.tsx", "./src/pages/EventRoom.tsx", "./src/pages/GangWars.tsx"],
        },
      },
    },
    // Compresión y minificación
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Reportar tamaño de chunks
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    // Optimizar assets
    assetsInlineLimit: 4096,
    // Aumentar timeout para builds grandes
    timeout: 60000,
  },
}));
