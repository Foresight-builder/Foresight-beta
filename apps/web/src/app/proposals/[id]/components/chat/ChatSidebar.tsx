"use client";

import Link from "next/link";
import { ExternalLink, Tag, TrendingUp } from "lucide-react";
import type { ThreadView } from "../../useProposalDetail";
import { useTranslations, formatTranslation, useLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

interface ChatSidebarProps {
  thread: ThreadView;
  displayName: (addr: string) => string;
  stats: { upvotes: number; downvotes: number; commentsCount: number };
}

export function ChatSidebar({ thread, displayName, stats }: ChatSidebarProps) {
  const tProposals = useTranslations("proposals");
  const { locale } = useLocale();

  return (
    <div className="w-80 border-l border-slate-200 p-6 overflow-y-auto hidden lg:flex flex-col gap-6 max-h-[520px] self-start">
      <div className="space-y-6 flex-1">
        <div>
          <h2 className="text-xl font-black text-slate-900 leading-tight mb-3">{thread.title}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100/50 p-2 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-white">
              {displayName(thread.user_id).slice(0, 2).toUpperCase()}
            </div>
            <span className="font-medium truncate">{displayName(thread.user_id)}</span>
          </div>
        </div>

        {thread.created_prediction_id && (
          <Link
            href={`/prediction/${thread.created_prediction_id}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all"
          >
            <span>{tProposals("detail.marketButton")}</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-3 h-3" />
            {tProposals("detailSidebar.detailsTitle")}
          </h3>

          <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{tProposals("detailSidebar.statusLabel")}</span>
              {(() => {
                const raw = String(thread.review_status || "").trim();
                let label = tProposals("card.statusPending");
                let cls =
                  "px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold flex items-center gap-1 border border-amber-200";
                if (raw === "approved") {
                  label = tProposals("card.statusApproved");
                  cls =
                    "px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center gap-1 border border-emerald-200";
                } else if (raw === "rejected") {
                  label = tProposals("card.statusRejected");
                  cls =
                    "px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1 border border-rose-200";
                } else if (raw === "needs_changes") {
                  label = tProposals("review.actionNeedsChanges");
                  cls =
                    "px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold flex items-center gap-1 border border-amber-200";
                }
                return (
                  <span className={cls}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {label}
                  </span>
                );
              })()}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{tProposals("detailSidebar.categoryLabel")}</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100">
                {thread.category || tProposals("detailSidebar.categoryFallback")}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{tProposals("detailSidebar.createdLabel")}</span>
              <span className="text-slate-700 font-medium">
                {formatDate(thread.created_at, locale)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            {tProposals("detailSidebar.statsTitle")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
              <div className="text-lg font-black text-slate-900">{stats.commentsCount}</div>
              <div className="text-[10px] text-slate-500 font-medium uppercase">
                {tProposals("detailSidebar.commentsLabel")}
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
              <div className="text-lg font-black text-slate-900">
                {stats.upvotes + stats.downvotes}
              </div>
              <div className="text-[10px] text-slate-500 font-medium uppercase">
                {tProposals("detailSidebar.votesLabel")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 text-center pb-2">
        {formatTranslation(tProposals("detailSidebar.proposalId"), {
          id: thread.id,
        })}
      </div>
    </div>
  );
}
