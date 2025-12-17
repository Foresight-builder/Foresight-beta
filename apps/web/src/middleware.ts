import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed", // 默认语言不显示前缀
});

export const config = {
  // 匹配所有路径，除了 API、静态文件等
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
