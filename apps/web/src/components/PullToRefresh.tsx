"use client";

import React, { useState, useRef } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { Loader2, RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number; // 触发刷新的最小下拉距离
}

/**
 * 下拉刷新组件
 *
 * 特性：
 * - 原生触感的下拉刷新
 * - 平滑动画过渡
 * - 可自定义触发阈值
 * - 加载状态提示
 * - 防止过度下拉
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={fetchData}>
 *   <div>内容</div>
 * </PullToRefresh>
 * ```
 */
export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [{ y }, api] = useSpring(() => ({ y: 0 }));
  const containerRef = useRef<HTMLDivElement>(null);

  const bind = useDrag(
    (state: any) => {
      const { down, movement, velocity, direction, cancel } = state;
      const [, my] = movement as [number, number];
      const [, vy] = velocity as [number, number];
      const [, dy] = direction as [number, number];
      // 禁用状态或正在刷新时不响应
      if (disabled || isRefreshing) {
        cancel();
        return;
      }

      // 检查是否在顶部
      const isAtTop = containerRef.current ? containerRef.current.scrollTop === 0 : true;

      // 只有在顶部且向下拉才响应
      if (!isAtTop || dy < 0) {
        cancel();
        return;
      }

      // 计算下拉距离（应用阻尼效果）
      const pullDistance = Math.max(0, my || 0) * 0.5; // 50% 阻尼
      const maxPull = threshold * 2; // 最大下拉距离为阈值的2倍

      if (down) {
        // 正在下拉
        api.start({ y: Math.min(pullDistance, maxPull), immediate: true });
      } else {
        // 松手
        if (pullDistance >= threshold) {
          // 触发刷新
          api.start({ y: threshold, immediate: false });
          setIsRefreshing(true);
          onRefresh().finally(() => {
            setIsRefreshing(false);
            api.start({ y: 0, immediate: false });
          });
        } else {
          // 未达到阈值，回弹
          api.start({ y: 0, immediate: false });
        }
      }
    },
    {
      axis: "y",
      filterTaps: true,
      from: () => [0, y.get()],
    }
  );

  const pullProgress = y.to((val: number) => Math.min(val / threshold, 1));
  const iconRotation = y.to((val: number) => (val / threshold) * 360);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full touch-none"
      {...(disabled || isRefreshing ? {} : bind())}
      style={{ touchAction: disabled || isRefreshing ? "auto" : "pan-y" }}
    >
      {/* 下拉指示器 */}
      <animated.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 overflow-hidden"
        style={{
          height: y.to((val: number) => `${val}px`),
        }}
      >
        <div className="relative flex flex-col items-center gap-2">
          {isRefreshing ? (
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          ) : (
            <animated.div
              style={{
                rotate: iconRotation,
                opacity: pullProgress.to((p: number) => p),
              }}
            >
              <RefreshCw className="w-6 h-6 text-purple-600" />
            </animated.div>
          )}
          <animated.span
            className="text-xs font-medium text-gray-600"
            style={{
              opacity: pullProgress.to((p: number) => p),
            }}
          >
            {isRefreshing ? "刷新中..." : y.get() >= threshold ? "松开刷新" : "下拉刷新"}
          </animated.span>
        </div>
      </animated.div>

      {/* 内容区域 */}
      <animated.div
        style={{
          transform: y.to((val: number) => `translateY(${val}px)`),
        }}
      >
        {children}
      </animated.div>
    </div>
  );
}
