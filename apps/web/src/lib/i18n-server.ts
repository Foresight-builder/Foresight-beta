import { cookies } from "next/headers";
import { defaultLocale, locales, type Locale } from "../i18n-config";

async function detectFromCookie(): Promise<Locale | null> {
  try {
    const store = await cookies();
    const raw = store.get("preferred-language")?.value;
    if (!raw) return null;
    if (locales.includes(raw as Locale)) {
      return raw as Locale;
    }
  } catch {}
  return null;
}

export async function getServerLocale(): Promise<Locale> {
  const fromCookie = await detectFromCookie();
  if (fromCookie) return fromCookie;

  return defaultLocale;
}
