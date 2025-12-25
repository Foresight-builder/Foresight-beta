"use client";

import { useState, useEffect, useCallback } from "react";
import { defaultLocale, type Locale } from "../i18n-config";
import { getCurrentLocale, isSupportedLocale, t } from "./i18n";

export function setLocale(nextLocale: Locale) {
  if (typeof window === "undefined") return;
  if (!isSupportedLocale(nextLocale)) return;

  localStorage.setItem("preferred-language", nextLocale);

  if (typeof document !== "undefined") {
    try {
      document.cookie = `preferred-language=${encodeURIComponent(
        nextLocale
      )}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }

  window.dispatchEvent(
    new CustomEvent("languagechange", {
      detail: { locale: nextLocale },
    })
  );
}

export function useTranslations(namespace?: string) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocaleState(getCurrentLocale());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "preferred-language" && e.newValue) {
        if (isSupportedLocale(e.newValue)) {
          setLocaleState(e.newValue);
        }
      }
    };

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ locale?: string }>;
      const nextLocale = customEvent.detail?.locale;
      if (isSupportedLocale(nextLocale)) {
        setLocaleState(nextLocale);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("languagechange", handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("languagechange", handleLanguageChange as EventListener);
    };
  }, []);

  const translate = useCallback(
    (key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return t(fullKey, locale);
    },
    [locale, namespace]
  );

  return translate;
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocaleState(getCurrentLocale());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "preferred-language" && e.newValue && isSupportedLocale(e.newValue)) {
        setLocaleState(e.newValue);
      }
    };

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ locale?: string }>;
      const nextLocale = customEvent.detail?.locale;
      if (isSupportedLocale(nextLocale)) {
        setLocaleState(nextLocale);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("languagechange", handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("languagechange", handleLanguageChange as EventListener);
    };
  }, []);

  const changeLocale = useCallback((next: Locale) => {
    setLocale(next);
  }, []);

  return { locale, setLocale: changeLocale };
}

export type { Locale } from "../i18n-config";
