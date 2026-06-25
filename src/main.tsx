import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// GitHub Pages SPA routing fix
if (sessionStorage.redirect) {
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  window.history.replaceState(null, '', basePath + redirect);
}

createRoot(document.getElementById("root")!).render(<App />);
