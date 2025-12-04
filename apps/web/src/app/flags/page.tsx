"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import { getClient } from "@/lib/supabase";
import WalletModal from "@/components/WalletModal";
import {
  Loader2,
  Flag,
  Calendar,
  CheckCircle2,
  Users,
  Plus,
  Sparkles,
  Trophy,
  Target,
  Clock,
  ArrowRight,
  Smile,
  Heart,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FlagItem = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: "active" | "pending_review" | "success" | "failed";
  verification_type: "self" | "witness";
  proof_image_url?: string;
  proof_comment?: string;
  created_at: string;
  user_id: string;
};

export default function FlagsPage() {
  const { account } = useWallet();
  const { user } = useAuth();
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [verifType, setVerifType] = useState<"self" | "witness">("self");
  const [witnessId, setWitnessId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterMine, setFilterMine] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending_review" | "success" | "failed"
  >("all");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinFlag, setCheckinFlag] = useState<FlagItem | null>(null);
  const [checkinNote, setCheckinNote] = useState("");
  const [checkinImage, setCheckinImage] = useState("");
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFlag, setHistoryFlag] = useState<FlagItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<
    Array<{
      id: string;
      note: string;
      image_url?: string;
      created_at: string;
      review_status?: string;
      reviewer_id?: string;
      review_reason?: string;
    }>
  >([]);
  const [reviewSubmittingId, setReviewSubmittingId] = useState<string | null>(
    null
  );
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [officialCreate, setOfficialCreate] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<{
    flag_id: number;
    owner_id: string;
    title: string;
    ts: string;
  } | null>(null);
  const [activeQuote, setActiveQuote] = useState(0);
  const quotes = [
    {
      text: "种一棵树最好的时间是十年前，其次是现在。",
      author: "Dambisa Moyo",
    },
    { text: "不积跬步，无以至千里。", author: "荀子" },
    { text: "自律给我自由。", author: "Jocko Willink" },
    { text: "每一个不曾起舞的日子，都是对生命的辜负。", author: "尼采" },
  ];

  const supabase = getClient();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const officialTemplates: Array<{
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bg: string;
  }> = [
    {
      id: "weather_rain_tomorrow",
      title: "明天会下雨吗？",
      description: "看天公作美，和小雨来不来打个赌～",
      icon: Sparkles,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      id: "weather_snow_tomorrow",
      title: "明天会下雪吗？",
      description: "想看雪花跳舞，交给天气小精灵判定～",
      icon: Sparkles,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      id: "temp_max_over",
      title: "明天会热吗？",
      description: "最高温挑战阈值，太阳别太粘人～",
      icon: Zap,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    {
      id: "early_morning",
      title: "早起挑战",
      description: "日出前把被子打败！和瞌睡虫说拜拜～",
      icon: Clock,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      id: "feels_like_comfort",
      title: "舒适天气",
      description: "舒适区间打卡，心情软绵绵～",
      icon: Smile,
      color: "text-pink-500",
      bg: "bg-pink-50",
    },
    {
      id: "target_weight",
      title: "体重管理",
      description: "每天进步一点点，遇见更好的自己～",
      icon: Target,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
  ];

  const loadFlags = async () => {
    try {
      setLoading(true);
      const me = account || user?.id || "";
      if (!me) {
        setFlags([]);
        return;
      }
      const res = await fetch(
        `/api/flags?viewer_id=${encodeURIComponent(me)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setFlags([]);
        return;
      }
      const payload = await res.json().catch(() => ({ flags: [] }));
      const list = Array.isArray(payload?.flags) ? payload.flags : [];
      setFlags(list as FlagItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const me = account || user?.id || "";
      if (!me || !supabase) {
        setInvitesCount(0);
        setInviteNotice(null);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("discussions")
        .select("content,created_at")
        .eq("user_id", me)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        setInvitesCount(0);
        setInviteNotice(null);
        return;
      }
      const items = (data || [])
        .map((r: any) => {
          try {
            const obj = JSON.parse(String(r.content || "{}"));
            if (obj && obj.type === "witness_invite") {
              return {
                flag_id: Number(obj.flag_id || 0),
                owner_id: String(obj.owner_id || ""),
                title: String(obj.title || ""),
                ts: String(obj.ts || r.created_at || ""),
              };
            }
          } catch {}
          return null;
        })
        .filter(Boolean) as any[];
      setInvitesCount(items.length);
      setInviteNotice(items[0] || null);
    } catch {
      setInvitesCount(0);
      setInviteNotice(null);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    loadFlags();
    loadInvites();

    const ch = supabase
      .channel("flags-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flags" },
        () => {
          loadFlags();
        }
      )
      .subscribe();

    const ch2 = supabase
      .channel("discussions-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussions" },
        () => {
          loadInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(ch2);
    };
  }, []);

  const handleCreateClick = () => {
    if (!account && !user) {
      setWalletModalOpen(true);
      return;
    }
    setOfficialCreate(false);
    setCreateOpen(true);
  };

  const createFlag = async () => {
    if (!newTitle.trim() || !newDeadline) return;
    if (!user && !account) return;

    try {
      setSubmitting(true);
      const payload: any = {
        user_id: account || user?.id || "anonymous",
        title: newTitle,
        description: newDesc,
        deadline: newDeadline,
        verification_type: officialCreate ? "self" : verifType,
        status: "active",
      };
      if (!officialCreate && verifType === "witness" && witnessId.trim())
        payload.witness_id = witnessId.trim();

      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "创建失败");
      }

      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewDeadline("");
      setOfficialCreate(false);
    } catch (e) {
      alert("创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckin = (flag: FlagItem) => {
    const me = account || user?.id || "";
    if (
      !me ||
      String(flag.user_id || "").toLowerCase() !== String(me).toLowerCase()
    ) {
      alert("仅创建者可打卡");
      return;
    }
    setCheckinFlag(flag);
    setCheckinNote("");
    setCheckinImage("");
    setCheckinOpen(true);
  };

  const submitCheckin = async () => {
    if (!checkinFlag) return;
    const me = account || user?.id || "";
    if (!me) return;
    try {
      setCheckinSubmitting(true);
      const payload = {
        flag_id: checkinFlag.id,
        user_id: me,
        note: checkinNote,
        image_url: checkinImage,
      };
      const res = await fetch("/api/flags/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ret = await res.json().catch(() => ({} as any));
      if (!res.ok)
        throw new Error(
          String((ret as any)?.detail || (ret as any)?.message || "打卡失败")
        );
      setCheckinOpen(false);
      setCheckinFlag(null);
      setCheckinNote("");
      setCheckinImage("");
      await loadFlags();
    } catch (e) {
      alert(String((e as any)?.message || "打卡失败，请重试"));
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const openHistory = async (flag: FlagItem) => {
    setHistoryFlag(flag);
    setHistoryItems([]);
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const me = account || user?.id || "";
      const res = await fetch(
        `/api/flags/${flag.id}/checkins?limit=50&viewer_id=${encodeURIComponent(
          me
        )}`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json().catch(() => ({} as any));
      const items = Array.isArray(data?.items) ? data.items : [];
      setHistoryItems(items);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  };

  const reviewCheckin = async (
    checkinId: string,
    action: "approve" | "reject"
  ) => {
    const me = account || user?.id || "";
    if (!me) return alert("请先连接钱包或登录");
    try {
      setReviewSubmittingId(checkinId);
      const res = await fetch(`/api/checkins/${checkinId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewer_id: me }),
      });
      const ret = await res.json().catch(() => ({} as any));
      if (!res.ok)
        throw new Error(String(ret?.detail || ret?.message || "操作失败"));
      if (historyFlag) await openHistory(historyFlag);
    } catch (e) {
      alert(String((e as any)?.message || "操作失败"));
    } finally {
      setReviewSubmittingId(null);
    }
  };

  const settleFlag = async (flag: FlagItem) => {
    const me = account || user?.id || "";
    if (!me) return alert("请先连接钱包或登录");
    try {
      setSettlingId(flag.id as any);
      const res = await fetch(`/api/flags/${flag.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settler_id: me }),
      });
      const ret = await res.json().catch(() => ({} as any));
      if (!res.ok)
        throw new Error(String(ret?.detail || ret?.message || "结算失败"));
      await loadFlags();
      alert(
        `结算完成：${String(ret?.status || "")}，通过天数 ${
          ret?.metrics?.approvedDays || 0
        }/${ret?.metrics?.totalDays || 0}`
      );
    } catch (e) {
      alert(String((e as any)?.message || "结算失败"));
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-100 pb-24">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-b from-violet-300/40 to-fuchsia-300/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-gradient-to-t from-rose-300/40 to-orange-200/40 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-cyan-200/30 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-violet-200 shadow-sm text-violet-700 text-xs font-bold mb-4 backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
              <span>让每一个小目标都闪闪发光</span>
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 flex items-center gap-4 tracking-tight mb-4">
              我的 Flag
              <motion.span
                animate={{ rotate: [0, 15, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                className="text-fuchsia-500 inline-block origin-bottom-left"
              >
                🚩
              </motion.span>
            </h1>
            <p className="text-gray-600 text-lg md:text-xl max-w-xl leading-relaxed font-medium">
              生活需要仪式感。无论是早起打卡，还是坚持运动，
              <br className="hidden md:block" />
              在这里立下目标，见证更好的自己。
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateClick}
            className="group relative px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl shadow-violet-500/30 overflow-hidden w-full md:w-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_100%] animate-gradient" />
            <span className="relative flex items-center justify-center gap-3 text-lg">
              <Plus className="w-6 h-6" />
              立个新 Flag
            </span>
          </motion.button>
        </div>

        {/* Daily Quote Banner */}
        <div className="mb-10">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 p-1 shadow-xl shadow-fuchsia-500/20">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
            <div className="relative bg-white/10 backdrop-blur-md rounded-[1.8rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/20">
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2 text-white/90 text-sm font-bold mb-2 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  Daily Inspiration
                </div>
                <div className="h-20 relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeQuote}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute inset-0"
                    >
                      <p className="text-2xl md:text-3xl font-black leading-tight mb-2">
                        "{quotes[activeQuote].text}"
                      </p>
                      <p className="text-white/60 font-medium">
                        — {quotes[activeQuote].author}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30">
                  <Trophy className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {inviteNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-yellow-800 font-medium">
                  收到监督邀请
                </div>
                <div className="font-bold text-gray-900 mt-0.5">
                  {inviteNotice.title}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-yellow-600 font-medium bg-yellow-100 px-2 py-1 rounded-full">
                共 {invitesCount} 条
              </span>
              <button
                onClick={() => setInviteNotice(null)}
                className="px-4 py-2 rounded-xl bg-white text-yellow-800 text-sm font-bold hover:bg-yellow-50 transition-colors shadow-sm"
              >
                知道了
              </button>
            </div>
          </motion.div>
        )}

        {/* Official Templates */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold text-gray-900">官方趣味挑战</h2>
            <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">
              一键开启
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {officialTemplates.map((tpl, i) => (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
                onClick={() => {
                  setNewTitle(tpl.title);
                  setNewDesc(tpl.description);
                  setVerifType("self");
                  setOfficialCreate(true);
                  setCreateOpen(true);
                }}
              >
                <div
                  className={`absolute top-0 right-0 w-24 h-24 ${tpl.bg} rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110`}
                />
                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-2xl ${tpl.bg} ${tpl.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}
                  >
                    <tpl.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {tpl.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">
                    {tpl.description}
                  </p>
                  <div className="flex items-center text-xs font-bold text-purple-600 gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    立即挑战 <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-xl rounded-2xl p-2 mb-8 shadow-lg shadow-purple-500/5 border border-white/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-xl w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all", label: "全部" },
              { id: "active", label: "进行中" },
              { id: "pending_review", label: "审核中" },
              { id: "success", label: "成功" },
              { id: "failed", label: "失败" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFilterMine((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              filterMine
                ? "bg-purple-100 text-purple-700"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            {filterMine ? "只看我的" : "只看我的"}
          </button>
        </div>

        {/* Flags Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
          </div>
        ) : flags.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Flag className="w-12 h-12 text-purple-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">
                还没有 Flag
              </h3>
              <p className="text-gray-500 mb-8 max-w-xs mx-auto text-lg">
                生活需要一点仪式感，定个小目标，给自己一个惊喜吧 ✨
              </p>
              <button
                onClick={handleCreateClick}
                className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all hover:scale-105 shadow-xl shadow-purple-500/20"
              >
                开始第一个挑战
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {flags
                .filter((f) =>
                  statusFilter === "all" ? true : f.status === statusFilter
                )
                .filter((f) => {
                  if (!filterMine) return true;
                  const me = account || user?.id || "";
                  return (
                    me &&
                    String(f.user_id || "").toLowerCase() ===
                      String(me).toLowerCase()
                  );
                })
                .sort(
                  (a, b) =>
                    new Date(a.deadline).getTime() -
                    new Date(b.deadline).getTime()
                )
                .map((flag) => (
                  <FlagCard
                    key={flag.id}
                    flag={flag}
                    isMine={
                      Boolean(account || user?.id) &&
                      String(flag.user_id || "").toLowerCase() ===
                        String(account || user?.id || "").toLowerCase()
                    }
                    onCheckin={() => openCheckin(flag)}
                    onViewHistory={() => openHistory(flag)}
                    onSettle={() => settleFlag(flag)}
                  />
                ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {createOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
              onClick={() => setCreateOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2rem] shadow-2xl z-50 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900">
                  立个 Flag 🚩
                </h2>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ArrowRight className="w-5 h-5 text-gray-400 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    我想...
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例如：明天早起跑步"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-lg placeholder:text-gray-400 text-gray-900"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    备注 (可选)
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="具体怎么做？给自己一点鼓励！"
                    rows={3}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-purple-500 outline-none transition-all text-gray-900 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    截止时间
                  </label>
                  <input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-purple-500 outline-none transition-all text-gray-900 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    监督方式{officialCreate ? "（官方模板仅系统判定）" : ""}
                  </label>
                  {officialCreate ? (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      系统自动判定结果
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setVerifType("self")}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                          verifType === "self"
                            ? "bg-purple-50 border-purple-500 text-purple-700"
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        <span className="font-bold">自己打卡</span>
                        <span className="text-xs opacity-70">拍照记录</span>
                      </button>
                      <button
                        onClick={() => setVerifType("witness")}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                          verifType === "witness"
                            ? "bg-purple-50 border-purple-500 text-purple-700"
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        <span className="font-bold">好友监督</span>
                        <span className="text-xs opacity-70">邀请见证</span>
                      </button>
                    </div>
                  )}
                </div>

                {verifType === "witness" && !officialCreate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-bold text-gray-700 ml-1">
                      监督人 ID
                    </label>
                    <input
                      value={witnessId}
                      onChange={(e) => setWitnessId(e.target.value)}
                      placeholder="0x... 或 用户ID"
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-purple-500 outline-none transition-all font-mono text-sm text-gray-900"
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={createFlag}
                  disabled={submitting || !newTitle || !newDeadline}
                  className="flex-1 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-purple-500/20"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      确认发布 <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      {/* Checkin Modal */}
      <AnimatePresence>
        {checkinOpen && checkinFlag && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
              onClick={() => setCheckinOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2rem] shadow-2xl z-50 p-8"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-6">
                打卡记录 📸
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    心得体会
                  </label>
                  <textarea
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                    placeholder="今天做了什么？感觉如何？"
                    rows={3}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-purple-500 outline-none transition-all text-gray-900 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">
                    图片链接（可选）
                  </label>
                  <input
                    value={checkinImage}
                    onChange={(e) => setCheckinImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-purple-500 outline-none transition-all text-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setCheckinOpen(false)}
                  className="flex-1 py-4 rounded-2xl border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={submitCheckin}
                  disabled={checkinSubmitting}
                  className="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {checkinSubmitting ? "提交中…" : "提交打卡"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {historyOpen && historyFlag && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
              onClick={() => setHistoryOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2rem] shadow-2xl z-50 p-8"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-6">
                时光机 🕰️
              </h3>
              <div className="space-y-4 max-h-[60vh] overflow-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    暂无打卡记录，加油鸭！
                  </div>
                ) : (
                  historyItems.map((it) => (
                    <div
                      key={it.id}
                      className="p-4 rounded-2xl bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">
                          {new Date(it.created_at).toLocaleString()}
                        </div>
                        {historyFlag?.verification_type === "witness" && (
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-lg ${
                              String(it.review_status || "pending") ===
                              "approved"
                                ? "bg-green-100 text-green-700"
                                : String(it.review_status || "pending") ===
                                  "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {String(it.review_status || "pending") ===
                            "approved"
                              ? "已通过"
                              : String(it.review_status || "pending") ===
                                "rejected"
                              ? "已拒绝"
                              : "待审核"}
                          </span>
                        )}
                      </div>
                      {it.note && (
                        <div className="text-sm text-gray-800 font-medium leading-relaxed">
                          {it.note}
                        </div>
                      )}
                      {it.image_url && (
                        <img
                          src={it.image_url}
                          alt="打卡图片"
                          className="mt-3 rounded-xl w-full h-32 object-cover shadow-sm"
                        />
                      )}

                      {historyFlag?.verification_type === "witness" &&
                        String(it.review_status || "pending") === "pending" &&
                        String(historyFlag?.user_id || "").toLowerCase() ===
                          String(account || user?.id || "").toLowerCase() && (
                          <div className="mt-3 flex gap-2">
                            <button
                              disabled={reviewSubmittingId === it.id}
                              onClick={() => reviewCheckin(it.id, "approve")}
                              className="flex-1 py-2 text-xs font-bold rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            >
                              通过
                            </button>
                            <button
                              disabled={reviewSubmittingId === it.id}
                              onClick={() => reviewCheckin(it.id, "reject")}
                              className="flex-1 py-2 text-xs font-bold rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              驳回
                            </button>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-8">
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="w-full py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlagCard({
  flag,
  isMine,
  onCheckin,
  onViewHistory,
  onSettle,
}: {
  flag: FlagItem;
  isMine?: boolean;
  onCheckin?: () => void;
  onViewHistory?: () => void;
  onSettle?: () => void;
}) {
  const statusConfig = {
    active: {
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      label: "进行中",
    },
    pending_review: {
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-100",
      label: "审核中",
    },
    success: {
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
      label: "挑战成功",
    },
    failed: {
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
      label: "挑战失败",
    },
  };

  const s = statusConfig[flag.status];
  const remainText = (() => {
    const ms = new Date(flag.deadline).getTime() - Date.now();
    if (ms <= 0) return "已到期";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return `剩 ${d} 天`;
    return `剩 ${h} 小时`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      layout
      whileHover={{ y: -5 }}
      className="bg-white rounded-[2.5rem] p-7 shadow-lg shadow-purple-500/5 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 border border-white/50 group flex flex-col h-full relative overflow-hidden"
    >
      {/* 装饰背景 */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-8 -mt-8 opacity-10 transition-transform duration-500 group-hover:scale-150 ${s.bg
          .replace("bg-", "bg-gradient-to-br from-")
          .replace("50", "400 to-white")}`}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-5">
          <span
            className={`text-xs font-bold px-4 py-2 rounded-full ${s.bg} ${s.color} border ${s.border} shadow-sm flex items-center gap-1.5`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${s.bg
                .replace("bg-", "bg-")
                .replace("50", "500")} animate-pulse`}
            />
            {s.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 bg-gray-100/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {remainText}
            </span>
          </div>
        </div>

        <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">
          {flag.title}
        </h3>

        {flag.description && (
          <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed font-medium">
            {flag.description}
          </p>
        )}

        <div className="mt-auto space-y-5">
          {/* Last Checkin Preview */}
          {flag.proof_comment || flag.proof_image_url ? (
            <div className="p-4 rounded-3xl bg-gray-50/80 border border-gray-100/80 flex gap-4 items-center backdrop-blur-sm group-hover:bg-white/80 transition-colors duration-300">
              {flag.proof_image_url ? (
                <img
                  src={flag.proof_image_url}
                  alt="proof"
                  className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm text-purple-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wide">
                  最近打卡
                </div>
                <div className="text-sm text-gray-900 truncate font-bold">
                  {flag.proof_comment || "图片打卡"}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-gray-50/50 border border-dashed border-gray-200 flex gap-3 items-center justify-center text-gray-400 text-sm font-medium group-hover:border-purple-200 group-hover:text-purple-400 transition-colors">
              <Sparkles className="w-4 h-4" />
              暂无打卡记录
            </div>
          )}

          <div className="pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="flex gap-3">
              {flag.status === "active" && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onCheckin}
                  className="w-10 h-10 rounded-full bg-gray-900 text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/30 flex items-center justify-center"
                  title="打卡"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onViewHistory}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-600 transition-colors shadow-sm hover:shadow-md flex items-center justify-center"
                title="查看记录"
              >
                <Clock className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              {flag.verification_type === "self" ? (
                <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-100">
                  <Target className="w-3.5 h-3.5" /> 自律模式
                </span>
              ) : (
                <span className="flex items-center gap-1.5 bg-pink-50 text-pink-600 px-3 py-1.5 rounded-full text-xs font-bold border border-pink-100">
                  <Users className="w-3.5 h-3.5" /> 好友监督
                </span>
              )}
              {isMine &&
                new Date(flag.deadline).getTime() <= Date.now() &&
                flag.status !== "success" &&
                flag.status !== "failed" && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSettle}
                    className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold hover:bg-green-200 transition-colors shadow-sm"
                  >
                    结算
                  </motion.button>
                )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
