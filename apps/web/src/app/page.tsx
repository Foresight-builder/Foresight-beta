"use client";

import TopNavBar from "@/components/TopNavBar";
import { useWallet } from "@/contexts/WalletContext";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  Sparkles,
  Target,
  Coins,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Eye,
  Plus,
  User,
  Zap,
  Shield,
  Globe,
  Award,
  CheckCircle,
  Clock,
  Tag,
  ListChecks,
  Info,
} from "lucide-react";
import Link from "next/link";
import ChatPanel from "@/components/ChatPanel";
import ForumSection from "@/components/ForumSection";
import Button from "@/components/ui/Button";

function ChartLine({ values, width = 260, height = 80, color = "#6B21A8" }: { values: number[]; width?: number; height?: number; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const norm = values.map(v => (v - min) / Math.max(1e-6, (max - min)));
  const step = width / Math.max(1, values.length - 1);
  const d = norm.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - v * height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function BetBinaryDemo() {
  const [side, setSide] = useState<'YES'|'NO'>('YES');
  const [prob, setProb] = useState(0.62);
  const [amount, setAmount] = useState(100);
  const priceYes = prob;
  const priceNo = 1 - prob;
  const price = side === 'YES' ? priceYes : priceNo;
  const shares = amount > 0 && price > 0 ? amount / price : 0;
  const payoutIfWin = shares;
  const profitIfWin = payoutIfWin - amount;
  const format = (n:number) => n.toFixed(2);
  const series = Array.from({ length: 24 }, (_, i) => {
    const base = side === 'YES' ? priceYes : priceNo;
    const jitter = (Math.sin(i * 0.7) + Math.cos(i * 0.3)) * 0.02;
    const v = Math.min(0.98, Math.max(0.02, base + jitter));
    return v;
  });
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">二元预测</h3>
          <div className="text-sm text-gray-500">价格走势</div>
        </div>
        <div className="mb-4"><ChartLine values={series} width={520} height={90} color="#DB2777" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <div className="text-sm text-gray-600 mb-2">选择方向</div>
            <div className="flex gap-3">
              <button onClick={() => setSide('YES')} className={`px-4 py-2 rounded-xl font-semibold shadow ${side==='YES' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>YES</button>
              <button onClick={() => setSide('NO')} className={`px-4 py-2 rounded-xl font-semibold shadow ${side==='NO' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>NO</button>
            </div>
          </div>
          <div className="col-span-1">
            <div className="text-sm text-gray-600 mb-2">事件概率（价格）</div>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={99} value={Math.round(prob*100)} onChange={e=>setProb(Number(e.target.value)/100)} className="w-full" />
              <div className="text-gray-700 w-16 text-right">{Math.round(prob*100)}%</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">YES 价格≈{format(priceYes)}，NO 价格≈{format(priceNo)}</div>
          </div>
          <div className="col-span-1">
            <div className="text-sm text-gray-600 mb-2">下注金额（ETH）</div>
            <input type="number" min={0} step={0.01} value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white/90" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 rounded-2xl p-3 border border-white/20">
            <div className="text-sm text-gray-600">购买份额</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{format(shares)} 份</div>
          </div>
          <div className="bg-white/70 rounded-2xl p-3 border border-white/20">
            <div className="text-sm text-gray-600">若胜收益</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">+{format(Math.max(0, profitIfWin))} ETH</div>
          </div>
          <div className="bg-white/70 rounded-2xl p-3 border border-white/20">
            <div className="text-sm text-gray-600">当前价格</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{format(price)} </div>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl">模拟下单</button>
        </div>
      </div>
    </div>
  );
}

function BetMultiDemo() {
  const [active, setActive] = useState<'A'|'B'|'C'>('A');
  const base = { A: 0.42, B: 0.36, C: 0.22 }[active];
  const series = Array.from({ length: 24 }, (_, i) => {
    const jitter = (Math.sin(i * 0.5) + Math.cos(i * 0.25)) * 0.02;
    const v = Math.min(0.98, Math.max(0.02, base + jitter));
    return v;
  });
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">多元预测</h3>
          <div className="flex gap-2">
            {(['A','B','C'] as const).map(k => (
              <button key={k} onClick={() => setActive(k)} className={`px-3 py-1.5 rounded-xl ${active===k ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>{k}</button>
            ))}
          </div>
        </div>
        <div className="mb-4"><ChartLine values={series} width={520} height={90} color="#6B21A8" /></div>
        <div className="flex justify-end"><Button variant="primary">模拟下单</Button></div>
      </div>
    </div>
  );
}

function BetRangeDemo() {
  const [minV, setMinV] = useState(20);
  const [maxV, setMaxV] = useState(60);
  const series = Array.from({ length: 24 }, (_, i) => {
    const center = (minV + maxV) / 200;
    const jitter = (Math.sin(i * 0.6) + Math.cos(i * 0.4)) * 0.02;
    const v = Math.min(0.98, Math.max(0.02, center + jitter));
    return v;
  });
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">区间预测</h3>
        </div>
        <div className="mb-4"><ChartLine values={series} width={520} height={90} color="#F472B6" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">最小区间</div>
            <input type="range" min={1} max={99} value={minV} onChange={e => setMinV(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">最大区间</div>
            <input type="range" min={minV+1} max={99} value={maxV} onChange={e => setMaxV(Number(e.target.value))} className="w-full" />
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="primary">模拟下单</Button></div>
      </div>
    </div>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const [canvasHeight, setCanvasHeight] = useState<number>(0);
  const { account } = useWallet();
  const isConnected = !!account;
  const [recentViewed, setRecentViewed] = useState<Array<{ id: number; title: string; category: string; seen_at: string }>>([]);
  const [forumPreview, setForumPreview] = useState<Array<{ id: number; title: string; user_id: string; upvotes: number; created_at: string }>>([]);
  const [chatPreview, setChatPreview] = useState<Array<{ id: string; user_id: string; content: string; created_at: string }>>([]);
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('recent_events') : null;
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const norm = arr
          .filter((x: any) => Number.isFinite(Number(x?.id)))
          .map((x: any) => ({
            id: Number(x.id),
            title: String(x.title || ''),
            category: String(x.category || ''),
            seen_at: String(x.seen_at || new Date().toISOString()),
          }));
        setRecentViewed(norm);
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/forum?eventId=1");
        const data = await res.json();
        const threads = Array.isArray(data?.threads) ? data.threads : [];
        const ranked = threads.sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0));
        setForumPreview(ranked.slice(0, 3));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/chat?eventId=1&limit=3");
        const data = await res.json();
        const list = Array.isArray(data?.messages) ? data.messages : [];
        setChatPreview(list.slice(-3));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas = canvasEl as HTMLCanvasElement;

    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx = maybeCtx as CanvasRenderingContext2D;

    type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'pentagon' | 'hexagon' | 'octagon';
    const COLORS = [
      'rgba(255, 140, 180, 0.48)', // rose pink
      'rgba(179, 136, 255, 0.45)', // lilac purple
      'rgba(100, 200, 255, 0.42)', // sky blue
      'rgba(120, 230, 190, 0.44)', // mint green
      'rgba(255, 190, 120, 0.40)', // peach orange
    ];

    const LINK_DISTANCE = 90; // 粒子间连线的最大距离
    const CELL_SIZE = 24; // 空间哈希的网格大小（用于加速碰撞检测）

    class Particle {
      x: number;
      y: number;
      baseSize: number;
      size: number; // 动态尺寸（带脉动）
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      shape: Shape;
      color: string;
      radius: number; // 碰撞半径（按形状外接圆估算）
      pulsePhase: number; // 脉动相位
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // 统一基础尺寸，去除过小粒子
        this.baseSize = 6.6;
        this.size = this.baseSize;
        // 轻微飘动
        this.speedX = Math.random() * 0.6 - 0.3;
        this.speedY = Math.random() * 0.6 - 0.3;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() * 0.01) - 0.005;
        // 减少三角形频率，增加对称多边形（五/六/八边形）
        const shapesPool: Shape[] = ['circle','square','diamond','ring','pentagon','hexagon','octagon','circle','square','diamond','ring','pentagon','hexagon','circle','square','diamond','triangle'];
        this.shape = shapesPool[Math.floor(Math.random() * shapesPool.length)];
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.pulsePhase = Math.random() * Math.PI * 2;
        // 估算不同形状的外接圆半径，作为碰撞半径
        switch (this.shape) {
          case 'circle':
            this.radius = this.baseSize;
            break;
          case 'square': { // s = baseSize * 1.6，半径约 s * sqrt(2)/2
            const s = this.baseSize * 1.6;
            this.radius = (s * Math.SQRT2) / 2;
            break;
          }
          case 'triangle': { // s = baseSize * 2，半径近似 s/2
            const s = this.baseSize * 2;
            this.radius = s / 2;
            break;
          }
          case 'diamond': { // s = baseSize * 2，半径近似 s/2
            const s = this.baseSize * 2;
            this.radius = s / 2;
            break;
          }
          case 'ring':
            this.radius = this.baseSize * 1.4;
            break;
          case 'pentagon':
          case 'hexagon':
          case 'octagon':
            this.radius = this.baseSize * 1.8;
            break;
        }
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        // 轻微脉动但保持一致性（±3%）
        this.size = this.baseSize * (1 + 0.03 * Math.sin(this.pulsePhase));
        this.pulsePhase += 0.015;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8; // 略强的光晕
        switch (this.shape) {
          case 'circle': {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'square': {
            const s = this.size * 1.6;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            break;
          }
          case 'triangle': {
            const s = this.size * 2;
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 2, s / 2);
            ctx.lineTo(-s / 2, s / 2);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'diamond': {
            const s = this.size * 2;
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 2, 0);
            ctx.lineTo(0, s / 2);
            ctx.lineTo(-s / 2, 0);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'ring': {
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 1.4, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
          case 'pentagon': {
            const r = this.size * 1.8;
            ctx.beginPath();
            for (let k = 0; k < 5; k++) {
              const ang = (Math.PI * 2 * k) / 5 - Math.PI / 2;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'hexagon': {
            const r = this.size * 1.8;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const ang = (Math.PI * 2 * k) / 6 - Math.PI / 2;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'octagon': {
            const r = this.size * 1.8;
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
              const ang = (Math.PI * 2 * k) / 8 - Math.PI / 2;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
            ctx.closePath();
            ctx.fill();
            break;
          }
        }
        ctx.restore();
      }
    }

    let particles: Particle[] = [];
    let animId = 0;
    // 鼠标交互：靠近时粒子加速散开
    let mouseX = 0, mouseY = 0, mouseActive = false;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      mouseActive = true;
    };
    const onMouseLeave = () => { mouseActive = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    const resize = () => {
      const overlapPx = 48; // 与核心功能上边界轻微重叠
      const featuresTop = featuresRef.current ? (featuresRef.current as HTMLElement).offsetTop : Math.floor(window.innerHeight * 0.75);
      canvas.width = window.innerWidth;
      canvas.height = Math.max(300, featuresTop + overlapPx);
      setCanvasHeight(canvas.height);
      // 同步展示尺寸，避免 CSS 拉伸至整屏
      canvas.style.height = `${canvas.height}px`;
    };
    window.addEventListener("resize", resize);
    resize();

    // 粒子数量更少：基础 60，随面积缩放
    const baseCount = 60;
    const scaleFactor = Math.min(2, (canvas.width * canvas.height) / (1280 * 720));
    const particleCount = Math.floor(baseCount * scaleFactor);
    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新位置与尺寸
      particles.forEach((p) => p.update());

      // 鼠标靠近加速散开（径向推力）
      if (mouseActive) {
        const influenceR = 150; // 影响半径
        const forceBase = 0.12; // 基础加速度
        const maxSpeed = 1.4;   // 限制最大速度，避免失控
        for (const p of particles) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < influenceR) {
            const strength = 1 - (dist / influenceR);
            const accel = forceBase * strength;
            const nx = dx / dist;
            const ny = dy / dist;
            p.speedX += nx * accel;
            p.speedY += ny * accel;
            // 速度限制
            const v = Math.hypot(p.speedX, p.speedY);
            if (v > maxSpeed) {
              p.speedX = (p.speedX / v) * maxSpeed;
              p.speedY = (p.speedY / v) * maxSpeed;
            }
          }
        }
      }

      // 构建空间哈希网格
      const grid = new Map<string, number[]>();
      const keyOf = (x: number, y: number) => `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
      particles.forEach((p, i) => {
        const key = keyOf(p.x, p.y);
        const cell = grid.get(key);
        if (cell) cell.push(i); else grid.set(key, [i]);
      });

      // 计算碰撞与连线（只检查邻近 3x3 单元格）
      const neighborsOffsets = [-1, 0, 1];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);
        for (const ox of neighborsOffsets) {
          for (const oy of neighborsOffsets) {
            const key = `${cx + ox},${cy + oy}`;
            const bucket = grid.get(key);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j <= i) continue; // 避免重复处理对
              const q = particles[j];
              const dx = q.x - p.x;
              const dy = q.y - p.y;
              const dist = Math.hypot(dx, dy);
              // 连线：距离足够近绘制细线，透明度随距离衰减
              if (dist < LINK_DISTANCE) {
                const alpha = Math.max(0.05, (LINK_DISTANCE - dist) / LINK_DISTANCE * 0.40);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#c4b5fd'; // 更柔和的薰衣草紫
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
                ctx.restore();
              }
              // 碰撞：近似为圆形外接碰撞
              const rSum = p.radius + q.radius;
              if (dist > 0 && dist < rSum) {
                // 位置分离（各移一半，避免穿透）
                const overlap = rSum - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                const sep = overlap * 0.5;
                p.x -= nx * sep;
                p.y -= ny * sep;
                q.x += nx * sep;
                q.y += ny * sep;

                // 简化的弹性反应：交换法线方向速度分量（等质量）
                const pNorm = p.speedX * nx + p.speedY * ny;
                const qNorm = q.speedX * nx + q.speedY * ny;
                const diff = qNorm - pNorm;
                p.speedX += diff * nx;
                p.speedY += diff * ny;
                q.speedX -= diff * nx;
                q.speedY -= diff * ny;

                // 轻微阻尼，避免颤动
                p.speedX *= 0.98; p.speedY *= 0.98;
                q.speedX *= 0.98; q.speedY *= 0.98;
              }
            }
          }
        }
      }

      // 绘制所有粒子（带光晕）
      particles.forEach((p) => p.draw());

      // 底部渐隐遮罩，增强与核心功能区域的衔接美观
      const fadeHeight = Math.min(160, canvas.height * 0.25);
      const grad = ctx.createLinearGradient(0, canvas.height - fadeHeight, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  const features = [
    {
      title: "下注交易",
      desc: "选择 YES/NO，价格即概率，快速下单",
      icon: Coins,
      color: "from-purple-400 to-pink-400",
    },
    {
      title: "聊天与论坛",
      desc: "与社区即时交流，发帖讨论并投票",
      icon: MessageSquare,
      color: "from-blue-400 to-indigo-400",
    },
  ];

  const stats = [
    { label: "活跃用户", value: "10K+", icon: Users },
    { label: "预测事件", value: "500+", icon: BarChart3 },
    { label: "总交易量", value: "1M ETH", icon: TrendingUp },
    { label: "准确率", value: "85%", icon: Award },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 overflow-hidden text-black">
      <canvas
        ref={canvasRef}
        className="absolute left-0 right-0 top-0 pointer-events-none opacity-60"
        style={canvasHeight ? { height: `${canvasHeight}px` } : undefined}
      />

      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
      </div>

      <TopNavBar />

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative z-20"
          >
            <motion.div
              className="relative inline-flex items-center justify-center mb-6 z-30"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img
                src="/images/logo.png"
                alt="Foresight Logo"
                className="w-20 h-20 drop-shadow-xl relative z-30"
              />
            </motion.div>
            <motion.h1 
              className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 relative z-30 leading-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ position: 'relative', zIndex: 30, lineHeight: '1.1' }}
            >
              Foresight
            </motion.h1>
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 max-w-4xl mx-auto mb-4 relative z-20">
              Your insight, the world's foresight.
            </p>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8 relative z-20">
              让预测更透明，让决策更聪明。基于区块链的去中心化预测市场平台
            </p>
            <div className="relative z-20 flex items-center justify-center gap-3">
              <Link href="/trending"><Button variant="primary" size="lg">去下注</Button></Link>
              <Link href="/forum"><Button variant="secondary" size="lg">进入论坛</Button></Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 mb-6 grid grid-cols-1 xl:grid-cols-2 gap-6"
          >
            <BetBinaryDemo />
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">论坛预览</h3>
                  <Link href="/forum"><Button variant="subtle" size="sm">更多</Button></Link>
                </div>
                <div className="space-y-3">
                  {forumPreview.length === 0 && (
                    <div className="text-sm text-gray-600">暂无热门主题</div>
                  )}
                  {forumPreview.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3 border border-gray-100">
                      <div className="mr-3">
                        <div className="text-sm font-medium text-gray-800 truncate max-w-[18rem]">{t.title}</div>
                        <div className="text-xs text-gray-500 mt-1">由 {String(t.user_id).slice(0,6)}… 在 {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">👍 {t.upvotes}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Link href="/forum"><Button variant="secondary" size="md">发帖</Button></Link>
                  <Link href="/forum"><Button variant="primary" size="md">进入论坛</Button></Link>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Chat & Forum Section */}
      <section className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white/70 ring-1 ring-black/10 text-blue-700 mb-4">
              <MessageSquare className="w-4 h-4 mr-1" />
              聊天与论坛
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">与社区交流与讨论</h2>
            <p className="text-lg text-gray-600">连接钱包参与聊天，发帖投票与评论</p>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span className="text-lg font-semibold">最近聊天</span>
                </div>
                <Link href="/forum#global-chat"><Button variant="subtle" size="sm">进入聊天</Button></Link>
              </div>
              <div className="space-y-3">
                {chatPreview.length === 0 && <div className="text-sm text-gray-600">暂无消息</div>}
                {chatPreview.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3 border border-gray-100">
                    <div className="mr-3">
                      <div className="text-sm font-medium text-gray-800 truncate max-w-[18rem]">{m.content}</div>
                      <div className="text-xs text-gray-500 mt-1">{String(m.user_id).slice(0,6)}… · {new Date(m.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ForumSection eventId={1} />
          </div>
        </div>
      </section>

      {/* Discover Section */}
      <section className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white/70 ring-1 ring-black/10 text-purple-700 mb-4">
              <Sparkles className="w-4 h-4 mr-1" />
              发现市场
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
              找到有意思的事件
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              按分类与状态快速发现：热门、新上架、即将截止
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {['热门','新上架','即将截止','讨论上升'].map((lab) => (
              <span key={lab} className="px-3 py-1.5 rounded-full bg-white ring-1 ring-black/10 text-gray-700 text-sm">
                {lab}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {['科技','体育','娱乐','时政','加密','生活'].map((cat) => (
              <span key={cat} className="px-3 py-1.5 rounded-full bg-white/80 ring-1 ring-black/10 text-gray-700 text-sm">
                {cat}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BetMultiDemo />
            <BetRangeDemo />
            <BetBinaryDemo />
          </div>
        </div>
      </section>

      {/* Creator Entry & Review Board */}
      <section className="relative z-10 py-12 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white ring-1 ring-black/10 text-pink-700 mb-4">
              <Sparkles className="w-4 h-4 mr-1" />
              创作者入口
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
              人人可创，轻松发起事件
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              通过轻量审核保障质量与安全
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/40 p-8 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-purple-600" />
                <span className="text-gray-800 font-semibold">快速创建</span>
              </div>
              <p className="text-gray-600 mb-6">填写标题、描述、分类与截止时间，支持多结果/区间玩法。</p>
              <Link href="/forum" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl">
                发起事件提案 <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="mt-6 grid grid-cols-1 gap-4">
                <div className="rounded-xl bg-white/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-800">快速入门步骤</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>选择分类与玩法（多结果/区间）</li>
                    <li>补充背景与规则要点</li>
                    <li>提交审核并在个人中心跟进</li>
                  </ul>
                </div>

                <div className="rounded-xl bg-white/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-pink-600" />
                    <span className="text-sm font-semibold text-gray-800">热门模板</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["体育赛事", "综艺投票", "链上事件", "宏观走势"].map((t, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-white ring-1 ring-black/10 text-gray-700 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white/80 p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-xs text-gray-600">平均审核 2–4 小时，结果将通知到站内。</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/40 p-8 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-pink-600" />
                <span className="text-gray-800 font-semibold">审核看板</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-xl bg-white/80 p-4 text-center">
                  <div className="text-xs text-gray-500">待审核</div>
                  <div className="text-2xl font-bold text-gray-800">12</div>
                </div>
                <div className="rounded-xl bg-white/80 p-4 text-center">
                  <div className="text-xs text-gray-500">通过率</div>
                  <div className="text-2xl font-bold text-emerald-600">78%</div>
                </div>
                <div className="rounded-xl bg-white/80 p-4 text-center">
                  <div className="text-xs text-gray-500">平均用时</div>
                  <div className="text-2xl font-bold text-gray-800">2.1h</div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'AI 大模型对比赛道', status: '进行中' },
                  { name: '加密合规新规落地', status: '已通过' },
                  { name: '热门综艺总决赛结果', status: '待补充' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-2">
                    <span className="text-sm text-gray-800 truncate">{row.name}</span>
                    <span className="text-xs text-gray-600">{row.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-800">审核规则摘要</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                    <li>主题明确、信息可验证</li>
                    <li>结果判定标准清晰</li>
                    <li>避免违规与争议话题</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-white/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-gray-800">流程时间线与透明度</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="h-2 flex-1 rounded bg-emerald-200" title="提交"></div>
                    <div className="h-2 flex-1 rounded bg-yellow-200" title="审核"></div>
                    <div className="h-2 flex-1 rounded bg-blue-200" title="发布"></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">仲裁与投票（如需）将公开记录。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 个人概览已移除：让位于聊天与论坛 */}

      {/* Trust & Rules */}
      <section className="relative z-10 py-12 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white ring-1 ring-black/10 text-amber-700 mb-4">
              <Shield className="w-4 h-4 mr-1" />
              信任与规则
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">透明判定与结算流程</h2>
            <p className="text-lg text-gray-600">数据源喂价 + 社区投票 + 最终结算，流程清晰可查</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white/90 border border-white/40 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-purple-600" /><span className="font-semibold text-gray-800">数据源与喂价</span></div>
              <p className="text-gray-600">对接可信来源，喂价稳定；异常会被自动记录与提示。</p>
            </div>
            <div className="rounded-3xl bg-white/90 border border-white/40 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-pink-600" /><span className="font-semibold text-gray-800">社区投票确认</span></div>
              <p className="text-gray-600">必要时发起投票，结果与过程公开透明，避免争议。</p>
            </div>
            <div className="rounded-3xl bg-white/90 border border-white/40 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2"><Award className="w-5 h-5 text-indigo-600" /><span className="font-semibold text-gray-800">最终结算</span></div>
              <p className="text-gray-600">确认为结果后自动结算，资金安全、规则明确可追溯。</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white/90 border border-white/40 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-800">透明性指标</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-white/80 p-4 text-center">
                  <div className="text-xs text-gray-500">公开度</div>
                  <div className="text-2xl font-bold text-gray-800">100%</div>
                </div>
                <div className="rounded-xl bg-white/80 p-4 text-center">
                  <div className="text-xs text-gray-500">链上记录</div>
                  <div className="text-2xl font-bold text-emerald-600">开启</div>
                </div>
                <div className="rounded-xl bg-white/80 p-4 text-center">
                  <div className="text-xs text-gray-500">仲裁次数</div>
                  <div className="text-2xl font-bold text-gray-800">0</div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/90 border border-white/40 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-pink-600" />
                <span className="font-semibold text-gray-800">判定流程时间线</span>
              </div>
              <div className="space-y-3">
                {[
                  { t: '提交与初审', d: '0–2h' },
                  { t: '社区反馈/补充', d: '2–12h' },
                  { t: '发布与监控', d: '次日' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-2">
                    <span className="text-sm text-gray-800">{step.t}</span>
                    <span className="text-xs text-gray-600">{step.d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/90 border border-white/40 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-gray-800">友好提示</span>
              </div>
              <p className="text-gray-600">
                标题精炼、信息来源可靠、判定标准具体，将显著提升通过率与用户信任。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-gray-200/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <img
                src="/images/logo.png"
                alt="Foresight Logo"
                className="w-10 h-10 drop-shadow-sm mr-3"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Foresight
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              © 2025 Foresight 预测市场 | 用交易表达信念，价格反映概率
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Target className="w-4 h-4 mr-2" />
              让预测更透明，让决策更聪明
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
