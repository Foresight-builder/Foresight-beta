/**
 * 性能监控工具
 * 收集和上报 Web Vitals 和自定义性能指标
 */

import { log } from "./logger";

// Web Vitals 类型
export interface WebVitalsMetric {
  name: "CLS" | "FID" | "FCP" | "LCP" | "TTFB" | "INP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

// 自定义性能指标
export interface CustomMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count";
  timestamp: number;
}

/**
 * 上报 Web Vitals 指标
 */
export function reportWebVitals(metric: WebVitalsMetric) {
  log.perf(`${metric.name}`, metric.value);

  // 发送到分析服务
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", metric.name, {
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      event_category: "Web Vitals",
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // 发送到自定义分析端点
  sendToAnalytics({
    type: "web-vital",
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

/**
 * 测量自定义性能指标
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  /**
   * 开始测量
   */
  start(label: string) {
    this.marks.set(label, performance.now());
  }

  /**
   * 结束测量并返回耗时
   */
  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) {
      log.warn(`Performance mark not found: ${label}`);
      return 0;
    }

    const duration = performance.now() - start;
    this.marks.delete(label);

    log.perf(label, duration);

    // 上报到分析服务
    sendToAnalytics({
      type: "custom-metric",
      label,
      duration,
    });

    return duration;
  }

  /**
   * 测量异步函数执行时间
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * 测量同步函数执行时间
   */
  measureSync<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

/**
 * 全局性能监控实例
 */
export const perfMonitor = new PerformanceMonitor();

/**
 * 获取页面加载性能
 */
export function getPageLoadMetrics() {
  if (typeof window === "undefined" || !window.performance) {
    return null;
  }

  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (!navigation) return null;

  return {
    // DNS 查询时间
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,

    // TCP 连接时间
    tcp: navigation.connectEnd - navigation.connectStart,

    // SSL 握手时间
    ssl: navigation.secureConnectionStart
      ? navigation.connectEnd - navigation.secureConnectionStart
      : 0,

    // 请求时间
    request: navigation.responseStart - navigation.requestStart,

    // 响应时间
    response: navigation.responseEnd - navigation.responseStart,

    // DOM 解析时间
    domParse: navigation.domInteractive - navigation.responseEnd,

    // DOM 内容加载完成时间
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,

    // 页面加载完成时间
    load: navigation.loadEventEnd - navigation.loadEventStart,

    // 总时间
    total: navigation.loadEventEnd - navigation.fetchStart,
  };
}

/**
 * 获取资源加载性能
 */
export function getResourceMetrics() {
  if (typeof window === "undefined" || !window.performance) {
    return [];
  }

  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

  return resources.map((resource) => ({
    name: resource.name,
    type: resource.initiatorType,
    duration: resource.duration,
    size: resource.transferSize,
    cached: resource.transferSize === 0,
  }));
}

/**
 * 获取内存使用情况
 */
export function getMemoryUsage() {
  if (typeof window === "undefined" || !(performance as any).memory) {
    return null;
  }

  const memory = (performance as any).memory;

  return {
    // 已使用的 JS 堆内存（MB）
    used: Math.round(memory.usedJSHeapSize / 1024 / 1024),

    // 总 JS 堆内存（MB）
    total: Math.round(memory.totalJSHeapSize / 1024 / 1024),

    // JS 堆内存限制（MB）
    limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),

    // 使用率
    usage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
  };
}

/**
 * 发送性能数据到分析服务
 */
function sendToAnalytics(data: any) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  // 使用 sendBeacon 确保数据发送（即使页面关闭）
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/events", blob);
  } else {
    // 降级到 fetch
    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {
      // 静默失败
    });
  }
}

/**
 * 监控长任务（Long Tasks）
 */
export function observeLongTasks(callback: (duration: number) => void) {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          // 超过 50ms 的任务
          log.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          callback(entry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ["longtask"] });

    return () => observer.disconnect();
  } catch (error) {
    log.warn("Long task monitoring not supported", error);
    return () => {};
  }
}

/**
 * 监控布局偏移（Layout Shift）
 */
export function observeLayoutShifts(callback: (value: number) => void) {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return () => {};
  }

  try {
    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          callback(clsValue);
        }
      }
    });

    observer.observe({ type: "layout-shift", buffered: true });

    return () => observer.disconnect();
  } catch (error) {
    log.warn("Layout shift monitoring not supported", error);
    return () => {};
  }
}

/**
 * 生成性能报告
 */
export function generatePerformanceReport() {
  const pageLoad = getPageLoadMetrics();
  const resources = getResourceMetrics();
  const memory = getMemoryUsage();

  const report = {
    timestamp: new Date().toISOString(),
    pageLoad,
    resources: {
      total: resources.length,
      cached: resources.filter((r) => r.cached).length,
      totalSize: resources.reduce((sum, r) => sum + r.size, 0),
      byType: resources.reduce(
        (acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
    memory,
  };

  log.info("Performance Report", report);

  return report;
}
