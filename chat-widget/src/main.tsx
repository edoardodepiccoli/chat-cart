import { createRoot } from "react-dom/client";

import App from "./App";
import { startCart } from "./cart";
import { pageFromDataset, setShopperContext } from "./shopperContext";
import { setLocale } from "./i18n";
import { startTheme } from "./theme";
import { parseSelectors } from "./theme/selectors";
import "./tokens.css";
import "./styles.css";

function mount() {
  const el = document.getElementById("chat-cart-root");
  if (!el) return;
  setLocale(el.dataset.locale ?? "en");
  const page = pageFromDataset(el.dataset);
  setShopperContext({
    country: el.dataset.country ?? "",
    language: el.dataset.locale ?? "",
    page,
  });
  startTheme(parseSelectors(el.dataset.cartSelectors));
  startCart();
  createRoot(el).render(<App hideSelector={el.dataset.hideSelector?.trim()} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
