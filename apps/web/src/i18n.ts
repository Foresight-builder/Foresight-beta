import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// 支持的语言列表
export const locales = ["zh-CN", "en"] as const;
export type Locale = (typeof locales)[number];

// 默认语言
export const defaultLocale: Locale = "zh-CN";

export default getRequestConfig(async ({ locale }) => {
  // 验证传入的 locale 参数
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
