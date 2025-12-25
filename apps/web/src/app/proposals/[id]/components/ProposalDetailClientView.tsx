"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ThreadView } from "../useProposalDetail";
import { ProposalShell } from "./ProposalShell";
import { ProposalHeaderNav } from "./ProposalHeaderNav";
import { ProposalIntroCard } from "./ProposalIntroCard";
import { ErrorState, InvalidProposalFallback, LoadingState } from "./States";
import { ProposalMainArticle } from "./ProposalMainArticle";
import { ProposalDiscussionSection } from "./ProposalDiscussionSection";

export type ProposalDetailClientViewProps = {
  isValidId: boolean;
  thread: ThreadView | null;
  loading: boolean;
  error: string | null;
  stats: any;
  userVoteTypes: any;
  displayName: any;
  account: string | null | undefined;
  connectWallet: () => void;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onSubmitReply: () => void;
  onBack: () => void;
  onCopyLink: () => void;
  vote: any;
  postComment: any;
  jsonLdMain: any | null;
  jsonLdBreadcrumb: any | null;
};

export function ProposalDetailClientView({
  isValidId,
  thread,
  loading,
  error,
  stats,
  userVoteTypes,
  displayName,
  account,
  connectWallet,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  onBack,
  onCopyLink,
  vote,
  postComment,
  jsonLdMain,
  jsonLdBreadcrumb,
}: ProposalDetailClientViewProps) {
  if (!isValidId) return <InvalidProposalFallback onBack={onBack} />;

  return (
    <ProposalShell>
      {thread && jsonLdMain && jsonLdBreadcrumb && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMain) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
          />
        </>
      )}

      <ProposalHeaderNav onBack={onBack} onCopyLink={onCopyLink} />
      <ProposalIntroCard />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : thread ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-8 items-start"
        >
          <div className="space-y-6">
            <ProposalDiscussionSection
              thread={thread}
              stats={stats}
              userVoteTypes={userVoteTypes}
              displayName={displayName}
              vote={vote}
              postComment={postComment}
              account={account}
              connectWallet={connectWallet}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
            />
          </div>
          <aside className="space-y-6">
            <ProposalMainArticle
              thread={thread}
              stats={stats}
              userVoteTypes={userVoteTypes}
              displayName={displayName}
              vote={vote}
            />
          </aside>
        </motion.div>
      ) : null}
    </ProposalShell>
  );
}
