import en from "./locales/en.json";
import it from "./locales/it.json";

type Key = keyof typeof en;

const messages: Record<string, Record<Key, string>> = { en, it };

let locale = "en";

export function setLocale(isoCode: string) {
  const language = isoCode.split("-")[0];
  if (language in messages) locale = language;
}

export function getLocale() {
  return locale;
}

export function t(key: Key, vars: Record<string, string> = {}) {
  return messages[locale][key].replace(/\{(\w+)\}/g, (_, name) => vars[name]);
}
