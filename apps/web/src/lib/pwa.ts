/**
 * PWA 工具函数
 * 处理 Service Worker 注册和 PWA 安装提示
 */

import { log } from "./logger";

/**
 * 注册 Service Worker
 */
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    log.warn("Service Worker 不支持");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    log.info("Service Worker 注册成功", registration);

    // 监听更新
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // 新版本可用
          log.info("新版本可用，请刷新页面");

          // 可以在这里显示更新提示
          if (confirm("发现新版本，是否立即更新？")) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }
        }
      });
    });

    return registration;
  } catch (error) {
    log.error("Service Worker 注册失败", error);
    return null;
  }
}

/**
 * 注销 Service Worker
 */
export async function unregisterServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      log.info("Service Worker 已注销");
      return true;
    }
    return false;
  } catch (error) {
    log.error("Service Worker 注销失败", error);
    return false;
  }
}

/**
 * 检查是否可以安装 PWA
 */
export function canInstallPWA(): boolean {
  if (typeof window === "undefined") return false;

  // 检查是否已经安装
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return false;
  }

  // 检查是否支持安装
  return "BeforeInstallPromptEvent" in window;
}

/**
 * 检查是否已经作为 PWA 运行
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * 获取网络状态
 */
export function getNetworkStatus() {
  if (typeof window === "undefined" || !("navigator" in window)) {
    return { online: true, type: "unknown" };
  }

  return {
    online: navigator.onLine,
    type: (navigator as any).connection?.effectiveType || "unknown",
  };
}

/**
 * 监听网络状态变化
 */
export function onNetworkChange(callback: (online: boolean) => void) {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * 清除所有缓存
 */
export async function clearAllCaches() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    log.info("所有缓存已清除");
    return true;
  } catch (error) {
    log.error("清除缓存失败", error);
    return false;
  }
}
