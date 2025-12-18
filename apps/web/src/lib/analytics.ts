/**
 * 前端分析和性能监控工具
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, type Metric } from "web-vitals";

/**
 * 获取设备信息
 */
function getDeviceInfo() {
  return {
    type: /mobile/i.test(navigator.userAgent) 
      ? 'mobile' 
      : /tablet|ipad/i.test(navigator.userAgent) 
      ? 'tablet' 
      : 'desktop',
  };
}

/**
 * 获取网络信息
 */
function getConnectionInfo() {
  // @ts-ignore - Navigator.connection 是实验性 API
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return {
      type: null,
      effectiveType: null,
    };
  }

  return {
    type: connection.type || null,
    effectiveType: connection.effectiveType || null,
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || false,
  };
}

/**
 * 获取视口信息
 */
function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
}

/**
 * 发送指标到分析服务
 */
function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
    device: getDeviceInfo(),
    connection: getConnectionInfo(),
    viewport: getViewportInfo(),
  });

  // 使用 sendBeacon 确保数据发送（即使页面关闭）
  const url = "/api/analytics";

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, {
      body,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(console.error);
  }
}

/**
 * 初始化 Web Vitals 监控
 */
export function initWebVitals() {
  if (typeof window === "undefined") return;

  onCLS(sendToAnalytics); // Cumulative Layout Shift
  onFID(sendToAnalytics); // First Input Delay
  onFCP(sendToAnalytics); // First Contentful Paint
  onLCP(sendToAnalytics); // Largest Contentful Paint
  onTTFB(sendToAnalytics); // Time to First Byte
}

/**
 * 追踪自定义事件
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    event: eventName,
    properties: {
      ...properties,
      url: window.location.href,
      timestamp: Date.now(),
    },
  });

  fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(console.error);
}

/**
 * 追踪页面浏览
 */
export function trackPageView(url?: string) {
  trackEvent("page_view", {
    page: url || window.location.pathname,
    referrer: document.referrer,
  });
}

/**
 * 追踪用户行为
 */
export const Analytics = {
  // 钱包连接
  walletConnected: (walletType: string, address: string) => {
    trackEvent("wallet_connected", { walletType, address });
  },

  // 订单创建
  orderCreated: (orderId: string, side: "buy" | "sell", amount: string) => {
    trackEvent("order_created", { orderId, side, amount });
  },

  // 关注事件
  eventFollowed: (eventId: number) => {
    trackEvent("event_followed", { eventId });
  },

  // Flag 打卡
  flagCheckedIn: (flagId: number) => {
    trackEvent("flag_checked_in", { flagId });
  },

  // 搜索
  search: (query: string) => {
    trackEvent("search", { query });
  },
};
