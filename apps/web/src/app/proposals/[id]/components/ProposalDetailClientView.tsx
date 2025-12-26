"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ThreadView } from "../useProposalDetail";
import { ProposalHeaderNav } from "./ProposalHeaderNav";
import { ErrorState, InvalidProposalFallback, LoadingState } from "./States";
import { ProposalDiscussionSection } from "./ProposalDiscussionSection";
import { ProposalChatShell } from "./chat/ProposalChatShell";
import { ChatSidebar } from "./chat/ChatSidebar";

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
    <ProposalChatShell>
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

      <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-0 px-4 sm:px-6 lg:px-10 py-4">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <ProposalHeaderNav onBack={onBack} onCopyLink={onCopyLink} />
            {thread && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                  #{thread.id}
                </span>
                <span className="px-2 py-1 rounded-full bg-white/70 border border-slate-200">
                  {stats.commentsCount} 条讨论
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingState />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <ErrorState error={error} />
            </div>
          ) : thread ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-200/40 flex flex-col lg:flex-row h-full overflow-hidden">
                <div className="flex-1 flex flex-col">
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
                <ChatSidebar thread={thread} displayName={displayName} stats={stats} />
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </ProposalChatShell>
  );
}
