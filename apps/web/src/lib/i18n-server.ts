import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "../i18n-config";

function detectFromCookie(): Locale | null {
  try {
    const store = cookies();
    const raw = store.get("preferred-language")?.value;
    if (!raw) return null;
    if (locales.includes(raw as Locale)) {
      return raw as Locale;
    }
  } catch {}
  return null;
}

function detectFromAcceptLanguage(): Locale | null {
  try {
    const acceptLanguage = headers().get("accept-language");
    if (!acceptLanguage) return null;

    const parts = acceptLanguage.split(",").map((item) => {
      const [lang, qValue] = item.trim().split(";q=");
      const q = qValue ? parseFloat(qValue) || 0 : 1;
      return { lang: lang.toLowerCase(), q };
    });

    parts.sort((a, b) => b.q - a.q);

    for (const part of parts) {
      if (part.lang.startsWith("zh")) return "zh-CN";
      if (part.lang.startsWith("en")) return "en";
      if (part.lang.startsWith("es")) return "es";
    }
  } catch {}
  return null;
}

export function getServerLocale(): Locale {
  const fromCookie = detectFromCookie();
  if (fromCookie) return fromCookie;

  const fromHeader = detectFromAcceptLanguage();
  if (fromHeader) return fromHeader;

  return defaultLocale;
}
