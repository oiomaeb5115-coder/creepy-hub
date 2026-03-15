import type ja from "@/locales/ja.json";

export type Dictionary = typeof ja;

const dictionaries: Record<string, () => Promise<Dictionary>> = {
  ja: () => import("@/locales/ja.json").then((m) => m.default),
  en: () => import("@/locales/en.json").then((m) => m.default),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  const loader = dictionaries[locale] ?? dictionaries["ja"];
  return loader();
}
