import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles.css";

function mount() {
  const el = document.getElementById("chat-cart-root");
  if (!el) return;
  createRoot(el).render(<App shopDomain={el.dataset.shopDomain ?? ""} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
