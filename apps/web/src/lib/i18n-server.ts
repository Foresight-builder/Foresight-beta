import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "../i18n-config";

function detectFromCookie(): Locale | null {
  try {
    const store = cookies() as any;
    const raw = store.get("preferred-language")?.value as string | undefined;
    if (!raw) return null;
    if (locales.includes(raw as Locale)) {
      return raw as Locale;
    }
  } catch {}
  return null;
}

type LanguagePart = {
  lang: string;
  q: number;
};

function detectFromAcceptLanguage(): Locale | null {
  try {
    const rawHeaders = headers() as any;
    const acceptLanguage = rawHeaders.get("accept-language") as string | null;
    if (!acceptLanguage) return null;

    const parts: LanguagePart[] = acceptLanguage.split(",").map((item: string) => {
      const [lang, qValue] = item.trim().split(";q=");
      const q = qValue ? parseFloat(qValue) || 0 : 1;
      return { lang: lang.toLowerCase(), q };
    });

    parts.sort((a: LanguagePart, b: LanguagePart) => b.q - a.q);

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
