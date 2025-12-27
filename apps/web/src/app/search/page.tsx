import { Metadata } from "next";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Foresight 全站搜索 - 预测市场与提案快速发现",
  description:
    "通过 Foresight 全站搜索快速发现热门预测市场、社区提案与讨论内容，用关键词联通事件、治理和策略研究。",
  alternates: {
    canonical: "/search",
    languages: {
      "zh-CN": "/search",
      "en-US": "/search",
      "es-ES": "/search",
    },
  },
};

type SearchParams = {
  q?: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const query = resolved?.q?.trim() || "";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SearchResultsPage",
        name: t("market.searchPage.jsonLdName"),
        url: baseUrl + "/search",
        description: t("market.searchPage.jsonLdDescription"),
        inLanguage: "zh-CN",
      },
    ],
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#f8faff] relative overflow-x-hidden font-sans p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-black text-slate-900 mb-3">
          {t("market.searchPage.heading")}
        </h1>
        <p className="text-sm text-slate-600 mb-6">{t("market.searchPage.body")}</p>
        {query && (
          <p className="text-xs text-slate-500">
            {t("market.searchPage.queryHint").replace("{query}", query)}
          </p>
        )}
      </div>
    </div>
  );
}
