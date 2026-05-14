import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// GitHub Pages SPA routing fix
if (sessionStorage.redirect) {
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  // Restore the original path with the base path
  const basePath = '/lettora-verse-app';
  const fullPath = basePath + redirect;
  window.history.replaceState(null, '', fullPath);
}

createRoot(document.getElementById("root")!).render(<App />);
