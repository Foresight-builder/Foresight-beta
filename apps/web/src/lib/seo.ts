import type { Metadata } from "next";
import { locales, type Locale } from "../i18n-config";

const hrefLangByLocale: Record<Locale, string> = {
  "zh-CN": "zh-CN",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  ko: "ko-KR",
};

export function buildLanguageAlternates(path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const hrefLang = hrefLangByLocale[locale];
    if (hrefLang) {
      languages[hrefLang] = path;
    }
  }
  return {
    canonical: path,
    languages,
  };
}

export function safeJsonLdStringify(data: unknown): string {
  const raw = JSON.stringify(data);
  const json = typeof raw === "string" ? raw : "null";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
