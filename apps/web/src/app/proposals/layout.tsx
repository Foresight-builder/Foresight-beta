import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import zhCN from "../../../messages/zh-CN.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ko from "../../../messages/ko.json";
import { defaultLocale, locales, type Locale } from "../../i18n-config";

type ProposalsMessages = (typeof zhCN)["proposals"];

const proposalsMessages: Record<Locale, ProposalsMessages> = {
  "zh-CN": zhCN.proposals,
  en: en.proposals as unknown as ProposalsMessages,
  es: es.proposals as unknown as ProposalsMessages,
  ko: ko.proposals as unknown as ProposalsMessages,
};

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const raw = store.get("preferred-language")?.value;
  const locale: Locale = raw && locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;

  const proposals = proposalsMessages[locale] || proposalsMessages[defaultLocale];
  const meta = (proposals as any).meta || {};

  const title =
    typeof meta.title === "string"
      ? meta.title
      : "Foresight Proposals Square - Create new prediction markets and governance votes";
  const description =
    typeof meta.description === "string"
      ? meta.description
      : "On the Foresight Proposals Square you can submit new prediction market ideas and governance topics for crypto, macro, AI and more, then let the community discuss and vote before they turn into live on-chain markets.";

  return {
    title,
    description,
    alternates: {
      canonical: "/proposals",
      languages: {
        "zh-CN": "/proposals",
        "en-US": "/proposals",
        "es-ES": "/proposals",
        "ko-KR": "/proposals",
      },
    },
    openGraph: {
      title: typeof meta.ogTitle === "string" ? meta.ogTitle : title,
      description: typeof meta.ogDescription === "string" ? meta.ogDescription : description,
      url: "/proposals",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: typeof meta.twitterTitle === "string" ? meta.twitterTitle : title,
      description:
        typeof meta.twitterDescription === "string" ? meta.twitterDescription : description,
    },
  };
}

export default function ProposalsLayout({ children }: { children: ReactNode }) {
  return children;
}
