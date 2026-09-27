import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { useUIStore, type Theme } from "./store/uiStore";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "auto" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(resolved);
}

applyTheme((localStorage.getItem("meow-theme") as Theme | null) ?? "auto");

// WKWebView (Tauri) shows the native menu before React bubble handlers run.
// Capture-phase preventDefault disables it; React/custom menus still receive the event.
function isTauriApp(): boolean {
  if (typeof window === "undefined") return false;
  if ("__TAURI_INTERNALS__" in window || "__TAURI__" in window) return true;
  return typeof location !== "undefined" && location.protocol === "tauri:";
}

if (isTauriApp()) {
  document.addEventListener(
    "contextmenu",
    (e) => {
      const t = e.target as Element;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
    },
    true,
  );
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (useUIStore.getState().theme === "auto") applyTheme("auto");
});

useUIStore.subscribe((state) => applyTheme(state.theme));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
