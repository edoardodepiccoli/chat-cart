import { createRoot } from "react-dom/client";

import App from "./App";
import { startCart } from "./cart";
import { pageFromDataset, recordVisit, setShopperContext } from "./context";
import { setLocale } from "./i18n";
import "./tokens.css";
import "./styles.css";

function mount() {
  const el = document.getElementById("chat-cart-root");
  if (!el) return;
  setLocale(el.dataset.locale ?? "en");
  const page = pageFromDataset(el.dataset);
  recordVisit(page);
  setShopperContext({
    country: el.dataset.country ?? "",
    language: el.dataset.locale ?? "",
    page,
  });
  startCart();
  createRoot(el).render(<App hideSelector={el.dataset.hideSelector?.trim()} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
