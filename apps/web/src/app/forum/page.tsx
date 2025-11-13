"use client";
import React, { useEffect, useState } from "react";
import { MessageSquare, Tag, Flame } from "lucide-react";
import TopNavBar from "@/components/TopNavBar";
import ChatPanel from "@/components/ChatPanel";
import ForumSection from "@/components/ForumSection";

interface ThreadView {
  id: number;
  event_id: number;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comments?: Array<{
    id: number;
    thread_id: number;
    event_id: number;
    user_id: string;
    content: string;
    created_at: string;
    upvotes: number;
    downvotes: number;
    parent_id?: number | null;
  }>;
}

export default function ForumPage() {
  const [hotProposals, setHotProposals] = useState<ThreadView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/forum?eventId=1");
        const data = await res.json();
        const threads: ThreadView[] = Array.isArray(data?.threads) ? data.threads : [];
        const ranked = [...threads].sort((a, b) => (b.upvotes) - (a.upvotes));
        setHotProposals(ranked.slice(0, 10));
      } catch (e: any) {
        setError(e?.message || "加载失败");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden text-black">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl"></div>
      </div>

      <TopNavBar />

      <div className="relative z-10 px-6 lg:px-10 py-6">
        <div className="panel-base panel-lilac px-4 py-3 rounded-3xl mb-6">
          <div className="flex items-center justify-between">
            <div className="font-semibold">社区频道与提案导航</div>
            <a href="#proposals" className="btn-base btn-sm btn-primary">快速发帖</a>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-6">
          {/* 左侧：频道与分类 */}
          <aside className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm p-4 lg:sticky lg:top-24 h-fit">
            <h2 className="text-lg font-bold mb-3">频道</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'chat', name: '全站聊天', grad: 'panel-azure', icon: <MessageSquare className="w-5 h-5" />, desc: '交流与提问', total: 0, today: 0, href: '#global-chat' },
                { key: 'proposals', name: '事件提案', grad: 'panel-lilac', icon: <Tag className="w-5 h-5" />, desc: '提交与讨论', total: hotProposals.length, today: 0, href: '#proposals' },
                { key: 'hot', name: '热门讨论', grad: 'panel-peach', icon: <Flame className="w-5 h-5" />, desc: '高热度主题', total: hotProposals.length, today: 0, href: '#proposals' },
                { key: 'ann', name: '公告', grad: 'panel-mint', icon: <Tag className="w-5 h-5" />, desc: '站内通知', total: 0, today: 0, href: '#announcements' },
              ].map((c) => (
                <a key={c.key} href={c.href} className={`panel-base ${c.grad} rounded-2xl p-3 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                      {c.icon}
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    <span className="text-xs">总数 {c.total}</span>
                  </div>
                  <div className="text-xs opacity-90 mt-1">{c.desc}</div>
                  <div className="text-xs opacity-90 mt-1">今日新增 {c.today}</div>
                </a>
              ))}
            </div>
            <h2 className="text-lg font-bold mt-6 mb-3">市场分类</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "热门", grad: "bg-gradient-peach" },
                { name: "加密", grad: "bg-gradient-azure" },
                { name: "体育", grad: "bg-gradient-mint" },
                { name: "政治", grad: "bg-gradient-lilac" },
              ].map((c) => (
                <button key={c.name} className={`px-3 py-2 rounded-xl text-sm text-white ${c.grad}`}>{c.name}</button>
              ))}
            </div>
            <div className="mt-6">
              <a href="#proposals" className="w-full inline-flex items-center justify-center px-3 py-2 btn-base btn-md btn-primary">发起事件提案</a>
            </div>
          </aside>

          {/* 中间：发帖框 + 信息流 */}
          <main id="proposals" className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">事件提案</h2>
                <span className="text-xs text-gray-600">仅支持点赞作为热度；官方手动确认结算源并标准化标题</span>
              </div>
              {/* 复用 ForumSection，MVP绑定事件ID 1 */}
              <ForumSection eventId={1} />
            </div>
          </main>

          {/* 右侧：热门提案/公告/筛选/搜索/最近采纳 */}
          <aside className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm p-4 h-fit">
            <div className="mb-4">
              <h2 className="text-lg font-bold">热门提案</h2>
              {loading && <div className="text-sm text-gray-600 mt-2">加载中…</div>}
              {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
              {!loading && !error && (
                <div className="mt-3 space-y-3">
                  {hotProposals.length === 0 && (
                    <div className="text-sm text-gray-600">暂无提案</div>
                  )}
                  {hotProposals.map((p) => (
                    <div key={p.id} className="flex items-start justify-between p-3 rounded-xl border bg-white/70">
                      <div className="mr-3">
                        <div className="text-sm font-medium text-gray-800 line-clamp-2">{p.title}</div>
                        <div className="text-xs text-gray-500 mt-1">由 {String(p.user_id).slice(0, 6)}… 在 {new Date(p.created_at).toLocaleDateString()} 提出</div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">👍 {p.upvotes}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div id="announcements" className="mb-4">
              <h2 className="text-lg font-bold">官方公告</h2>
              <div className="mt-2 text-sm text-gray-700 bg-white/70 border rounded-xl p-3">近期采纳的提案将通过此处公示与结算源确认</div>
            </div>
            <div className="mb-4">
              <h2 className="text-lg font-bold">筛选与搜索</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select className="px-3 py-2 rounded-xl border bg-white/80 text-sm">
                  <option>状态：全部</option>
                  <option>草稿</option>
                  <option>审核中</option>
                  <option>已采纳</option>
                  <option>已拒绝</option>
                  <option>待补充结算源</option>
                </select>
                <select className="px-3 py-2 rounded-xl border bg-white/80 text-sm">
                  <option>分类：全部</option>
                  <option>热门</option>
                  <option>加密</option>
                  <option>体育</option>
                  <option>政治</option>
                </select>
                <input className="col-span-2 px-3 py-2 rounded-xl border bg-white/80 text-sm" placeholder="搜索标题/正文关键字" />
              </div>
            </div>
            <div className="mb-2">
              <h2 className="text-lg font-bold">最近已采纳</h2>
              <div className="mt-2 space-y-2">
                {hotProposals.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border bg-white/70">
                    <span className="text-sm text-gray-800 truncate max-w-[12rem]">{p.title}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">已采纳</span>
                  </div>
                ))}
                {hotProposals.length === 0 && (
                  <div className="text-sm text-gray-600">暂无记录</div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* 全站聊天模块 */}
        <section id="global-chat" className="mt-8">
          <h2 className="text-lg font-semibold mb-3">全站聊天</h2>
          <ChatPanel eventId={1} />
        </section>
      </div>
    </div>
  );
}
