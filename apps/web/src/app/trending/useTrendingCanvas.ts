import { useEffect, useRef, useState, useCallback } from "react";

export const useTrendingCanvas = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  canvasWorkerRef: React.MutableRefObject<Worker | null>,
  offscreenActiveRef: React.MutableRefObject<boolean>
) => {
  const [canvasReady, setCanvasReady] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollStopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      isScrollingRef.current = true;
      if (scrollStopTimerRef.current) {
        clearTimeout(scrollStopTimerRef.current);
      }
      scrollStopTimerRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
        canvasWorkerRef.current?.postMessage({
          type: "scrolling",
          isScrolling: false,
        });
      }, 120);

      canvasWorkerRef.current?.postMessage({
        type: "scrolling",
        isScrolling: true,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollStopTimerRef.current) clearTimeout(scrollStopTimerRef.current);
    };
  }, [canvasWorkerRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl: HTMLCanvasElement = canvas;
    const supportsOffscreen =
      typeof (canvasEl as any).transferControlToOffscreen === "function" &&
      typeof Worker !== "undefined";
    if (supportsOffscreen) {
      let worker: Worker | null = null;
      try {
        worker = new Worker(new URL("../../workers/particles.worker.ts", import.meta.url), {
          type: "module",
        });
      } catch (err) {
        console.warn("Worker 初始化失败，回退到主线程绘制:", err);
      }
      if (worker) {
        canvasWorkerRef.current = worker;
        try {
          worker.addEventListener("message", (ev: MessageEvent<any>) => {
            const data = (ev as any)?.data;
            if (data && data.type === "ready") {
              setCanvasReady(true);
            }
          });
        } catch {}
        let offscreen: OffscreenCanvas | null = null;
        try {
          offscreen = (canvasEl as any).transferControlToOffscreen();
        } catch (err) {
          console.warn("transferControlToOffscreen 失败，回退到主线程绘制:", err);
        }
        if (offscreen) {
          const init = () => {
            const dpr = window.devicePixelRatio || 1;
            worker!.postMessage(
              {
                type: "init",
                canvas: offscreen!,
                width: window.innerWidth,
                height: window.innerHeight,
                dpr,
              },
              [offscreen!]
            );
          };
          init();
          const onResize = () => {
            const dpr = window.devicePixelRatio || 1;
            worker!.postMessage({
              type: "resize",
              width: window.innerWidth,
              height: window.innerHeight,
              dpr,
            });
          };
          let rafPending = false;
          const onMouseMove = (e: MouseEvent) => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
              const rect = canvasEl.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              worker!.postMessage({ type: "mouse", x, y, active: true });
              rafPending = false;
            });
          };
          const onMouseLeave = () => {
            worker!.postMessage({ type: "mouse", x: 0, y: 0, active: false });
          };
          window.addEventListener("resize", onResize);
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseleave", onMouseLeave);
          worker!.postMessage({ type: "scrolling", isScrolling: false });
          offscreenActiveRef.current = true;
          return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseleave", onMouseLeave);
            try {
              worker!.postMessage({ type: "destroy" });
            } catch {}
            worker!.terminate();
            canvasWorkerRef.current = null;
            offscreenActiveRef.current = false;
          };
        }
      }
    }
    if (offscreenActiveRef.current) return;
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvasEl.getContext("2d");
    } catch (err) {
      console.warn("主线程 fallback 获取 2D 上下文失败（可能已 Offscreen 接管）:", err);
      return;
    }
    if (!context) return;
    const ctx = context;
    let animId = 0;

    type Shape =
      | "circle"
      | "square"
      | "triangle"
      | "diamond"
      | "ring"
      | "pentagon"
      | "hexagon"
      | "octagon";
    const COLORS = [
      "rgba(255, 140, 180, 0.48)",
      "rgba(179, 136, 255, 0.45)",
      "rgba(100, 200, 255, 0.42)",
      "rgba(120, 230, 190, 0.44)",
      "rgba(255, 190, 120, 0.4)",
    ];

    const LINK_DISTANCE = 90;
    const CELL_SIZE = 24;

    class Particle {
      x: number;
      y: number;
      baseSize: number;
      size: number;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      shape: Shape;
      color: string;
      radius: number;
      pulsePhase: number;
      constructor() {
        this.x = Math.random() * canvasEl.width;
        this.y = Math.random() * canvasEl.height;
        this.baseSize = 6 + Math.random() * 0.8;
        this.size = this.baseSize;
        this.speedX = Math.random() * 0.6 - 0.3;
        this.speedY = Math.random() * 0.6 - 0.3;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = Math.random() * 0.01 - 0.005;
        const shapesPool: Shape[] = [
          "circle",
          "square",
          "diamond",
          "ring",
          "pentagon",
          "hexagon",
          "octagon",
          "circle",
          "square",
          "diamond",
          "ring",
          "pentagon",
          "hexagon",
          "circle",
          "square",
          "diamond",
          "triangle",
        ];
        this.shape = shapesPool[Math.floor(Math.random() * shapesPool.length)];
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.pulsePhase = Math.random() * Math.PI * 2;
        switch (this.shape) {
          case "circle":
            this.radius = this.baseSize;
            break;
          case "square": {
            const s = this.baseSize * 1.6;
            this.radius = (s * Math.SQRT2) / 2;
            break;
          }
          case "triangle": {
            const s = this.baseSize * 2;
            this.radius = s / 2;
            break;
          }
          case "diamond": {
            const s = this.baseSize * 2;
            this.radius = s / 2;
            break;
          }
          case "ring":
            this.radius = this.baseSize * 1.4;
            break;
          case "pentagon":
          case "hexagon":
          case "octagon":
            this.radius = this.baseSize * 1.8;
            break;
        }
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        this.size = this.baseSize * (1 + 0.03 * Math.sin(this.pulsePhase));
        this.pulsePhase += 0.015;
        if (this.x < 0 || this.x > canvasEl.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvasEl.height) this.speedY *= -1;
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        switch (this.shape) {
          case "circle": {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "square": {
            const s = this.size * 1.6;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            break;
          }
          case "triangle": {
            const s = this.size * 2;
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 2, s / 2);
            ctx.lineTo(-s / 2, s / 2);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case "diamond": {
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
          case "ring": {
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 1.4, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
          case "pentagon": {
            const r = this.size * 1.8;
            ctx.beginPath();
            for (let k = 0; k < 5; k++) {
              const ang = (Math.PI * 2 * k) / 5 - Math.PI / 2;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            break;
          }
          case "hexagon": {
            const r = this.size * 1.8;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const ang = (Math.PI * 2 * k) / 6 - Math.PI / 2;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            break;
          }
          case "octagon": {
            const r = this.size * 1.8;
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
              const ang = (Math.PI * 2 * k) / 8 - Math.PI / 2;
              const px = Math.cos(ang) * r;
              const py = Math.sin(ang) * r;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
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

    const resize = () => {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    const baseCount = 60;
    const scaleFactor = Math.min(2, (canvasEl.width * canvasEl.height) / (1280 * 720));
    const particleCount = Math.floor(baseCount * scaleFactor);
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let mouseX = 0;
    let mouseY = 0;
    let mouseActive = false;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      mouseActive = true;
    };
    const onMouseLeave = () => {
      mouseActive = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    let firstFrameDone = false;
    const animate = () => {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      particles.forEach((p) => p.update());

      if (!isScrollingRef.current) {
        const grid = new Map<string, number[]>();
        const keyOf = (x: number, y: number) =>
          `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
        particles.forEach((p, i) => {
          const key = keyOf(p.x, p.y);
          const cell = grid.get(key);
          if (cell) cell.push(i);
          else grid.set(key, [i]);
        });

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
                if (j <= i) continue;
                const q = particles[j];
                const dx = q.x - p.x;
                const dy = q.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < LINK_DISTANCE) {
                  const alpha = Math.max(0.05, ((LINK_DISTANCE - dist) / LINK_DISTANCE) * 0.4);
                  ctx.save();
                  ctx.globalAlpha = alpha;
                  ctx.strokeStyle = "#c4b5fd";
                  ctx.lineWidth = 0.7;
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y);
                  ctx.lineTo(q.x, q.y);
                  ctx.stroke();
                  ctx.restore();
                }
                const rSum = p.radius + q.radius;
                if (dist > 0 && dist < rSum) {
                  const overlap = rSum - dist;
                  const nx = dx / dist;
                  const ny = dy / dist;
                  const sep = overlap * 0.5;
                  p.x -= nx * sep;
                  p.y -= ny * sep;
                  q.x += nx * sep;
                  q.y += ny * sep;

                  const pNorm = p.speedX * nx + p.speedY * ny;
                  const qNorm = q.speedX * nx + q.speedY * ny;
                  const diff = qNorm - pNorm;
                  p.speedX += diff * nx;
                  p.speedY += diff * ny;
                  q.speedX -= diff * nx;
                  q.speedY -= diff * ny;

                  p.speedX *= 0.98;
                  p.speedY *= 0.98;
                  q.speedX *= 0.98;
                  q.speedY *= 0.98;
                }
              }
            }
          }
        }
      }

      if (mouseActive) {
        const influenceR = 150;
        const forceBase = 0.12;
        const maxSpeed = 1.4;
        for (const p of particles) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < influenceR) {
            const strength = 1 - dist / influenceR;
            const accel = forceBase * strength;
            const nx = dx / dist;
            const ny = dy / dist;
            p.speedX += nx * accel;
            p.speedY += ny * accel;
            const v = Math.hypot(p.speedX, p.speedY);
            if (v > maxSpeed) {
              p.speedX = (p.speedX / v) * maxSpeed;
              p.speedY = (p.speedY / v) * maxSpeed;
            }
          }
        }
      }

      particles.forEach((p) => p.draw());
      if (!firstFrameDone) {
        firstFrameDone = true;
        try {
          setCanvasReady(true);
        } catch {}
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [canvasRef, canvasWorkerRef, offscreenActiveRef]);

  return { canvasReady };
};

export const useBackToTop = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let rafId = 0;
    const updateVisibility = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowBackToTop(scrollTop > 300);
      rafId = 0;
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateVisibility);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateVisibility();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  return { showBackToTop, scrollToTop };
};
