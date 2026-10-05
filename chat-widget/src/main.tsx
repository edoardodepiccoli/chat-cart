import { createRoot } from "react-dom/client";

import App from "./App";
import { setLocale } from "./i18n";
import "./tokens.css";
import "./styles.css";

function mount() {
  const el = document.getElementById("chat-cart-root");
  if (!el) return;
  setLocale(el.dataset.locale ?? "en");
  createRoot(el).render(<App />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
