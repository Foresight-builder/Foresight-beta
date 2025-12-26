"use client";

import React, { useRef, useState, useEffect, useCallback, memo, useMemo } from "react";

interface VirtualListProps<T> {
  /** 数据列表 */
  items: T[];
  /** 每项的预估高度 */
  estimatedItemHeight: number;
  /** 渲染每一项的函数 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 容器高度 */
  height?: number | string;
  /** 上下预渲染的额外项数 */
  overscan?: number;
  /** 容器类名 */
  className?: string;
  /** 获取每项的唯一 key */
  getKey: (item: T, index: number) => string | number;
  /** 加载更多回调 */
  onLoadMore?: () => void;
  /** 是否正在加载更多 */
  isLoadingMore?: boolean;
  /** 是否还有更多数据 */
  hasMore?: boolean;
  /** 触发加载更多的阈值（距离底部的像素数） */
  loadMoreThreshold?: number;
  /** 空列表时显示的内容 */
  emptyContent?: React.ReactNode;
}

/**
 * 🚀 高性能虚拟列表组件
 * 
 * 特性：
 * - 只渲染可见区域的项目，大幅减少 DOM 节点
 * - 支持动态高度（使用预估高度 + 实际测量）
 * - 支持无限滚动加载更多
 * - 使用 requestAnimationFrame 优化滚动性能
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   items={predictions}
 *   estimatedItemHeight={200}
 *   getKey={(item) => item.id}
 *   renderItem={(item) => <PredictionCard prediction={item} />}
 *   onLoadMore={loadMore}
 *   hasMore={hasNextPage}
 * />
 * ```
 */
function VirtualListInner<T>({
  items,
  estimatedItemHeight,
  renderItem,
  height = "100%",
  overscan = 3,
  className = "",
  getKey,
  onLoadMore,
  isLoadingMore,
  hasMore,
  loadMoreThreshold = 200,
  emptyContent,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const rafRef = useRef<number | null>(null);
  const heightsRef = useRef<Map<string | number, number>>(new Map());

  // 计算总高度
  const totalHeight = useMemo(() => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const key = getKey(items[i], i);
      total += heightsRef.current.get(key) ?? estimatedItemHeight;
    }
    return total;
  }, [items, estimatedItemHeight, getKey]);

  // 计算可见项的范围
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    let currentOffset = 0;
    let start = 0;
    let end = items.length - 1;
    let offsetY = 0;

    // 找到第一个可见项
    for (let i = 0; i < items.length; i++) {
      const key = getKey(items[i], i);
      const itemHeight = heightsRef.current.get(key) ?? estimatedItemHeight;
      
      if (currentOffset + itemHeight > scrollTop) {
        start = Math.max(0, i - overscan);
        offsetY = currentOffset;
        
        // 回退 overscan 项来计算正确的 offsetY
        for (let j = i - 1; j >= start; j--) {
          const prevKey = getKey(items[j], j);
          offsetY -= heightsRef.current.get(prevKey) ?? estimatedItemHeight;
        }
        break;
      }
      currentOffset += itemHeight;
    }

    // 找到最后一个可见项
    const visibleEnd = scrollTop + containerHeight;
    for (let i = start; i < items.length; i++) {
      const key = getKey(items[i], i);
      const itemHeight = heightsRef.current.get(key) ?? estimatedItemHeight;
      currentOffset += itemHeight;
      
      if (currentOffset >= visibleEnd) {
        end = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    return { startIndex: start, endIndex: end, offsetY };
  }, [items, scrollTop, containerHeight, estimatedItemHeight, overscan, getKey]);

  // 处理滚动
  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        const newScrollTop = containerRef.current.scrollTop;
        setScrollTop(newScrollTop);

        // 检查是否需要加载更多
        if (
          onLoadMore &&
          hasMore &&
          !isLoadingMore &&
          containerRef.current.scrollHeight - newScrollTop - containerRef.current.clientHeight <
            loadMoreThreshold
        ) {
          onLoadMore();
        }
      }
    });
  }, [onLoadMore, hasMore, isLoadingMore, loadMoreThreshold]);

  // 监听容器尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    setContainerHeight(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  // 清理 RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // 测量项目高度的回调
  const measureItem = useCallback(
    (key: string | number, element: HTMLElement | null) => {
      if (element) {
        const newHeight = element.getBoundingClientRect().height;
        const currentHeight = heightsRef.current.get(key);
        
        if (currentHeight !== newHeight) {
          heightsRef.current.set(key, newHeight);
        }
      }
    },
    []
  );

  if (items.length === 0) {
    return emptyContent ? <>{emptyContent}</> : null;
  }

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const key = getKey(item, actualIndex);
            
            return (
              <div
                key={key}
                ref={(el) => measureItem(key, el)}
                data-index={actualIndex}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 加载更多指示器 */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}

// 使用 memo 优化，避免父组件重渲染时重新渲染
export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

export default VirtualList;

