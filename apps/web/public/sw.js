/**
 * Service Worker for Foresight PWA
 * 提供离线支持和缓存策略
 */

const CACHE_NAME = "foresight-v1";
const RUNTIME_CACHE = "foresight-runtime";

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  "/",
  "/trending",
  "/leaderboard",
  "/forum",
  "/offline",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// 安装事件 - 预缓存静态资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Precaching static resources");
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch 事件 - 缓存策略
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== "GET") {
    return;
  }

  // 跳过 API 请求（始终从网络获取）
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // 图片资源 - Cache First 策略
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // 只缓存成功的响应
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 其他资源 - Network First 策略
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 缓存成功的响应
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时使用缓存
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // 返回离线页面
          if (request.destination === "document") {
            return caches.match("/offline");
          }

          return new Response("Network error", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
      })
  );
});

// 消息事件 - 处理客户端消息
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
    );
  }
});
