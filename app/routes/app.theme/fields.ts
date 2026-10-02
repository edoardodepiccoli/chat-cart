import type { ThemeColor } from "../../../shared/theme";

export const COLOR_GROUPS: {
  heading: string;
  fields: { name: ThemeColor; label: string; details: string }[];
}[] = [
  {
    heading: "Primary",
    fields: [
      {
        name: "primary",
        label: "Primary color",
        details: "Main buttons, the launcher and focus rings",
      },
      {
        name: "onPrimary",
        label: "Text on primary",
        details: "Text and icons on main buttons and the launcher",
      },
      {
        name: "primaryHover",
        label: "Primary hover",
        details: "Main buttons under the pointer",
      },
      {
        name: "onPrimaryHover",
        label: "Text on primary hover",
        details: "Text on hovered main buttons",
      },
    ],
  },
  {
    heading: "Secondary",
    fields: [
      {
        name: "secondary",
        label: "Secondary color",
        details: "Product and FAQ links, suggested replies",
      },
      {
        name: "onSecondary",
        label: "Text on secondary",
        details: "Text on secondary buttons and suggested replies",
      },
      {
        name: "secondaryHover",
        label: "Secondary hover",
        details: "Secondary buttons and suggested replies under the pointer",
      },
      {
        name: "onSecondaryHover",
        label: "Text on secondary hover",
        details: "Text on hovered secondary buttons and suggested replies",
      },
    ],
  },
  {
    heading: "Surfaces",
    fields: [
      {
        name: "background",
        label: "Background",
        details: "Chat panel, cards and the message field",
      },
      {
        name: "surface",
        label: "Surface",
        details: "Assistant messages, typing indicator and image placeholders",
      },
      {
        name: "userBubble",
        label: "Customer messages",
        details: "Messages the shopper sends",
      },
      {
        name: "onUserBubble",
        label: "Text on customer messages",
        details: "Text in messages the shopper sends",
      },
    ],
  },
  {
    heading: "Text and lines",
    fields: [
      { name: "text", label: "Text", details: "Main text" },
      {
        name: "textMuted",
        label: "Muted text",
        details: "Prices, labels and hints",
      },
      {
        name: "border",
        label: "Borders",
        details: "Lines around the panel, cards, fields and buttons",
      },
    ],
  },
];

export const CONTRAST_PAIRS: {
  text: ThemeColor;
  background: ThemeColor;
  label: string;
}[] = [
  { text: "text", background: "background", label: "Text on background" },
  { text: "text", background: "surface", label: "Text on surface" },
  {
    text: "textMuted",
    background: "background",
    label: "Muted text on background",
  },
  { text: "textMuted", background: "surface", label: "Muted text on surface" },
  { text: "onPrimary", background: "primary", label: "Text on primary" },
  {
    text: "onPrimaryHover",
    background: "primaryHover",
    label: "Text on primary hover",
  },
  { text: "onSecondary", background: "secondary", label: "Text on secondary" },
  {
    text: "onSecondaryHover",
    background: "secondaryHover",
    label: "Text on secondary hover",
  },
  {
    text: "onUserBubble",
    background: "userBubble",
    label: "Text on customer messages",
  },
];

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
