"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, ThumbsUp, ThumbsDown, Clock, User, Hash } from "lucide-react";
import ForumSection from "@/components/ForumSection";
import GradientPage from "@/components/ui/GradientPage";
import { Skeleton } from "@/components/ui/Skeleton";
import { normalizePositiveId, isValidPositiveId } from "@/lib/ids";

interface ProposalDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ThreadView {
  id: number;
  event_id: number;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comments?: {
    id: number;
  }[];
}

export default function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const idNum = normalizePositiveId(resolvedParams.id);
  const isValidId = isValidPositiveId(idNum);

  const [thread, setThread] = useState<ThreadView | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidId || !idNum) return;

    let cancelled = false;
    const fetchThread = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetch("/api/forum?eventId=0");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "加载提案失败");
        }
        const list = Array.isArray(data?.threads) ? data.threads : [];
        const found = list.find((t: any) => normalizePositiveId(String(t.id)) === idNum) || null;
        if (!cancelled) {
          setThread(found);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message || "加载提案失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchThread();

    return () => {
      cancelled = true;
    };
  }, [idNum, isValidId]);

  const stats = useMemo(() => {
    if (!thread) {
      return {
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        totalVotes: 0,
      };
    }
    const upvotes = Number(thread.upvotes || 0);
    const downvotes = Number(thread.downvotes || 0);
    const totalVotes = upvotes + downvotes;
    const commentsCount = Array.isArray(thread.comments) ? thread.comments.length : 0;
    return {
      commentsCount,
      upvotes,
      downvotes,
      totalVotes,
    };
  }, [thread]);

  if (!isValidId) {
    return (
      <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          <button
            onClick={() => router.push("/proposals")}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 mb-4 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回提案列表
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-black text-slate-900 mb-2">无效的提案</div>
            <div className="text-sm text-slate-500">无法识别该提案编号，请从列表重新进入。</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GradientPage className="relative overflow-hidden font-sans text-slate-900">
      <div className="absolute inset-0 pointer-events-none opacity-[0.16] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-soft-light" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/proposals")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 shadow-sm hover:bg-white hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
            返回提案列表
          </button>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white">
              <MessageCircle className="w-3 h-3" />
              提案讨论
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>#{idNum}</span>
            </span>
          </div>
        </div>

        <section className="grid lg:grid-cols-[minmax(0,2.4fr)_minmax(260px,1fr)] gap-6 items-start">
          <div className="space-y-4">
            <div className="rounded-3xl bg-white/90 border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.08)] px-5 sm:px-7 py-5 sm:py-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton variant="text" width="70%" height={26} />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <Skeleton variant="rectangular" width={120} height={20} />
                    <Skeleton variant="rectangular" width={100} height={20} />
                    <Skeleton variant="rectangular" width={80} height={20} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        正在进行的社区提案
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 break-words">
                        {thread?.title || "提案讨论"}
                      </h1>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">
                        {thread?.user_id
                          ? `${String(thread.user_id).slice(0, 6)}...${String(thread.user_id).slice(-4)}`
                          : "匿名用户"}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {thread?.created_at
                          ? new Date(thread.created_at).toLocaleString()
                          : "时间未知"}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                      <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>{stats.commentsCount} 条回复</span>
                    </div>
                  </div>

                  {thread?.content ? (
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                      {thread.content}
                    </p>
                  ) : null}
                </div>
              )}

              {loadError && (
                <div className="mt-4 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2">
                  {loadError}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <ForumSection eventId={0} threadId={idNum || 0} hideCreate />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-white/90 border border-white/70 shadow-[0_14px_35px_rgba(15,23,42,0.06)] p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    讨论概览
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  实时更新
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">总投票</span>
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-lg font-black text-slate-900">{stats.totalVotes}</div>
                  <div className="text-[11px] text-slate-400">赞成 + 反对</div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">回复数</span>
                    <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-lg font-black text-slate-900">{stats.commentsCount}</div>
                  <div className="text-[11px] text-slate-400">社区观点</div>
                </div>

                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-700">赞成</span>
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-lg font-black text-emerald-700">{stats.upvotes}</div>
                  <div className="text-[11px] text-emerald-500/80">看好该提案</div>
                </div>

                <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-700">反对</span>
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-lg font-black text-rose-700">{stats.downvotes}</div>
                  <div className="text-[11px] text-rose-500/80">持保留意见</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 text-slate-50 p-4 sm:p-5 shadow-[0_20px_40px_rgba(15,23,42,0.35)] relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-14 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />

              <div className="relative z-10 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  参与讨论的小提示
                </h3>
                <ul className="space-y-1.5 text-[11px] text-slate-200">
                  <li>分享你对提案的看法，可以引用数据或案例。</li>
                  <li>尊重不同意见，理性讨论有助于达成共识。</li>
                  <li>如果你特别认同某条回复，可以为它点赞。</li>
                </ul>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </GradientPage>
  );
}
