import { createContext } from "react";

// The open panel's element. Sheets portal into it, so they cover the whole
// panel rather than the scrolling log a card sits in.
export const PanelHost = createContext<HTMLElement | null>(null);
