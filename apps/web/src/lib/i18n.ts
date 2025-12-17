/**
 * 简化的国际化方案
 * 不使用 next-intl 的路由功能，避免影响现有路由
 */

import { useState, useEffect } from "react";
import zhCN from "../../messages/zh-CN.json";
import en from "../../messages/en.json";

export type Locale = "zh-CN" | "en";

const messages = {
  "zh-CN": zhCN,
  en: en,
};

/**
 * 获取当前语言
 */
export function getCurrentLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";

  const saved = localStorage.getItem("preferred-language");
  return (saved as Locale) || "zh-CN";
}

/**
 * 获取翻译文本
 */
export function getTranslation(locale: Locale = getCurrentLocale()) {
  return messages[locale] || messages["zh-CN"];
}

/**
 * 翻译函数
 */
export function t(key: string, locale?: Locale): string {
  const translations = getTranslation(locale);
  const keys = key.split(".");

  let value: any = translations;
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  return value || key;
}

/**
 * React Hook 用于翻译（响应语言变化）
 */
export function useTranslations(namespace?: string) {
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => {
    // 初始化语言
    setLocale(getCurrentLocale());

    // 监听 storage 变化（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "preferred-language" && e.newValue) {
        setLocale(e.newValue as Locale);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (key: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return t(fullKey, locale);
  };
}
