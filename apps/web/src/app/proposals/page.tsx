"use client";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProposalsPageView from "./ProposalsPageView";
import { useProposalsList } from "./useProposalsList";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/lib/i18n";

const INSPIRATIONS_COUNT = 5;

function buildProposalsJsonLd(tProposals: (key: string) => string, locale: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: tProposals("page.jsonLdName"),
        url: baseUrl + "/proposals",
        description: tProposals("page.jsonLdDescription"),
        inLanguage: locale,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: tProposals("page.breadcrumbHome"),
            item: baseUrl + "/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: tProposals("page.breadcrumbProposals"),
            item: baseUrl + "/proposals",
          },
        ],
      },
    ],
  };
}

export default function ProposalsPage() {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const { account, connectWallet } = useWallet();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const listState = useProposalsList(account, connectWallet);
  const tProposals = useTranslations("proposals");
  const { locale } = useLocale();

  const [inspirationIndex, setInspirationIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  const rollInspiration = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setInspirationIndex(Math.floor(Math.random() * INSPIRATIONS_COUNT));
      count += 1;
      if (count > 10) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 100);
  };

  const jsonLd = buildProposalsJsonLd(tProposals, locale);

  return (
    <ProposalsPageView
      {...listState}
      account={account}
      user={user}
      connectWallet={connectWallet}
      isCreateModalOpen={isCreateModalOpen}
      setCreateModalOpen={setCreateModalOpen}
      inspiration={inspirationIndex}
      isRolling={isRolling}
      rollInspiration={rollInspiration}
      jsonLd={jsonLd}
      router={router}
      queryClient={queryClient}
    />
  );
}
