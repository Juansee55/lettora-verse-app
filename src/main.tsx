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

// Comportamiento tipo app nativa: bloquear copia/selección de texto
const isEditable = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node || !node.closest) return false;
  return !!node.closest('input, textarea, [contenteditable="true"], .allow-select');
};

["copy", "cut", "contextmenu", "selectstart", "dragstart"].forEach((evt) => {
  document.addEventListener(
    evt,
    (e) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    },
    { capture: true }
  );
});

document.addEventListener("keydown", (e) => {
  if (isEditable(e.target)) return;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s", "u", "p"].includes(key)) {
    e.preventDefault();
  }
});
