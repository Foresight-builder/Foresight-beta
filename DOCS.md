# 📚 Foresight 开发文档

> 完整的 API 文档、组件使用指南和最佳实践

---

## 📑 目录

- [核心组件](#核心组件)
- [自定义 Hooks](#自定义-hooks)
- [工具函数](#工具函数)
- [API 路由](#api-路由)
- [数据库](#数据库)
- [最佳实践](#最佳实践)

---

## 🧩 核心组件

### 1. LazyImage

**位置**: `apps/web/src/components/ui/LazyImage.tsx`

图片懒加载组件，使用 IntersectionObserver 延迟加载图片。

```tsx
import LazyImage from "@/components/ui/LazyImage";

<LazyImage
  src="/images/banner.jpg"
  alt="Banner"
  width={800}
  height={400}
  className="rounded-lg"
  priority={false} // 是否优先加载
/>;
```

**特性**:

- ✅ 自动懒加载
- ✅ 占位符支持
- ✅ 加载动画
- ✅ 错误处理

---

### 2. EmptyState

**位置**: `apps/web/src/components/EmptyState.tsx`

统一的空状态展示组件。

```tsx
import EmptyState from "@/components/EmptyState";

<EmptyState
  icon={SearchIcon}
  title="未找到结果"
  description="尝试调整搜索条件"
  action={{
    label: "清除筛选",
    onClick: handleClearFilters,
  }}
/>;
```

**预设类型**:

- `no-data`: 无数据
- `no-results`: 无搜索结果
- `error`: 错误状态
- `empty-cart`: 空购物车

---

### 3. GlobalSearch

**位置**: `apps/web/src/components/GlobalSearch.tsx`

全局搜索组件，支持防抖和实时搜索。

```tsx
import GlobalSearch from "@/components/GlobalSearch";

<GlobalSearch
  placeholder="搜索预测..."
  onSearch={(query) => console.log(query)}
  debounceMs={300}
/>;
```

**特性**:

- ✅ 防抖搜索（300ms）
- ✅ 键盘快捷键（Cmd/Ctrl + K）
- ✅ 搜索历史
- ✅ 实时建议

---

### 4. FilterSort

**位置**: `apps/web/src/components/FilterSort.tsx`

筛选和排序组件。

```tsx
import FilterSort from '@/components/FilterSort';

<FilterSort
  filters={{
    category: { label: "类别", options: [...] },
    status: { label: "状态", options: [...] }
  }}
  sortOptions={[
    { value: 'trending', label: '热门' },
    { value: 'newest', label: '最新' }
  ]}
  onFilterChange={(filters) => console.log(filters)}
  onSortChange={(sort) => console.log(sort)}
/>
```

---

### 5. MobileMenu

**位置**: `apps/web/src/components/MobileMenu.tsx`

移动端汉堡菜单。

```tsx
import MobileMenu from "@/components/MobileMenu";

<MobileMenu
  isOpen={isMenuOpen}
  onClose={() => setIsMenuOpen(false)}
  menuItems={[
    { label: "首页", href: "/" },
    { label: "热门", href: "/trending" },
  ]}
/>;
```

**特性**:

- ✅ 滑动动画
- ✅ 点击外部关闭
- ✅ 滚动锁定
- ✅ 键盘支持（ESC）

---

### 6. MobileBottomNav

**位置**: `apps/web/src/components/MobileBottomNav.tsx`

移动端底部导航栏。

```tsx
import MobileBottomNav from "@/components/MobileBottomNav";

<MobileBottomNav
  items={[
    { icon: HomeIcon, label: "首页", href: "/" },
    { icon: TrendingIcon, label: "热门", href: "/trending" },
    { icon: UserIcon, label: "我的", href: "/profile" },
  ]}
/>;
```

**特性**:

- ✅ 固定底部
- ✅ 安全区域适配
- ✅ 活动状态高亮
- ✅ 触摸优化（44x44px）

---

### 7. PullToRefresh

**位置**: `apps/web/src/components/PullToRefresh.tsx`

下拉刷新组件（移动端）。

```tsx
import PullToRefresh from "@/components/PullToRefresh";

<PullToRefresh
  onRefresh={async () => {
    await fetchData();
  }}
  threshold={80} // 触发距离
  maxPullDistance={150}
>
  <YourContent />
</PullToRefresh>;
```

**特性**:

- ✅ 手势识别
- ✅ 加载动画
- ✅ 触感反馈
- ✅ iOS/Android 适配

---

### 8. ProgressBar

**位置**: `apps/web/src/components/ProgressBar.tsx`

页面顶部进度条（NProgress）。

```tsx
// 自动在 layout.tsx 中使用
// 页面切换时自动显示

import { ProgressBar } from "@/components/ProgressBar";

<ProgressBar
  height="3px"
  color="#3b82f6"
  options={{
    showSpinner: false,
    speed: 300,
  }}
/>;
```

---

### 9. ErrorBoundary

**位置**: `apps/web/src/components/ErrorBoundary.tsx`

错误边界组件。

```tsx
import ErrorBoundary from "@/components/ErrorBoundary";

<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h2>出错了</h2>
      <button onClick={reset}>重试</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>;
```

---

### 10. Skeleton 组件

**位置**: `apps/web/src/components/skeletons/`

各种骨架屏组件。

```tsx
import { FlagCardSkeleton } from "@/components/skeletons";

<FlagCardSkeleton count={3} />;
```

**可用骨架屏**:

- `FlagCardSkeleton`
- `LeaderboardSkeleton`
- `ChatSkeleton`
- `ButtonSkeleton`
- `InputSkeleton`

---

## 🪝 自定义 Hooks

### 1. useInfiniteScroll

**位置**: `apps/web/src/hooks/useInfiniteScroll.ts`

无限滚动 Hook（完整版）。

```tsx
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const { loadMoreRef, isNearBottom } = useInfiniteScroll({
  loading: isLoading,
  hasNextPage: hasMore,
  onLoadMore: handleLoadMore,
  threshold: 0.1, // 距底部 10%
  rootMargin: "100px", // 提前 100px
});

// 使用方式 1: 观察特定元素
<div ref={loadMoreRef}>{loading && <Spinner />}</div>;

// 使用方式 2: 监听全局滚动
if (isNearBottom && !loading) {
  loadMore();
}
```

---

### 2. useWindowInfiniteScroll

**位置**: `apps/web/src/hooks/useInfiniteScroll.ts`

简化版无限滚动 Hook（监听 window）。

```tsx
import { useWindowInfiniteScroll } from "@/hooks/useInfiniteScroll";

const observerRef = useWindowInfiniteScroll({
  loading: isLoading,
  hasNextPage: hasMore,
  onLoadMore: handleLoadMore,
  threshold: 0.8, // 距底部 80%
});

<div ref={observerRef} />;
```

---

### 3. usePersistedState

**位置**: `apps/web/src/hooks/usePersistedState.ts`

持久化状态 Hook（localStorage）。

```tsx
import { usePersistedState } from "@/hooks/usePersistedState";

// 基础用法
const [filters, setFilters] = usePersistedState("filters", {
  category: null,
  sortBy: "trending",
});

// 带过期时间（24小时）
const [token, setToken] = usePersistedState("token", null, {
  expiryMs: 24 * 60 * 60 * 1000,
});

// sessionStorage
const [tempData, setTempData] = usePersistedState("temp", null, {
  storage: "session",
});
```

---

### 4. useDebounce

**位置**: `apps/web/src/hooks/useDebounce.ts`

防抖 Hook。

```tsx
import { useDebounce } from "@/hooks/useDebounce";

const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 500);

useEffect(() => {
  if (debouncedSearch) {
    fetchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```

---

## 🔧 工具函数

### 1. apiWithFeedback

**位置**: `apps/web/src/lib/apiWithFeedback.ts`

API 调用加载反馈工具。

```tsx
import { apiWithFeedback } from "@/lib/apiWithFeedback";

// 基础用法
const data = await apiWithFeedback(() => fetch("/api/data").then((r) => r.json()));

// 自定义提示
const data = await apiWithFeedback(() => fetch("/api/data").then((r) => r.json()), {
  loadingMessage: "加载中...",
  successMessage: "加载成功！",
  errorMessage: "加载失败",
});

// 配合 React Query
const { data } = useQuery({
  queryKey: ["data"],
  queryFn: apiWithFeedback(() => fetch("/api/data").then((r) => r.json())),
});
```

**特性**:

- ✅ 自动显示 NProgress
- ✅ 错误 Toast 提示
- ✅ 成功 Toast（可选）
- ✅ 自动错误处理

---

### 2. webVitals

**位置**: `apps/web/src/lib/webVitals.ts`

Web Vitals 性能监控。

```tsx
import { reportWebVitals } from "@/lib/webVitals";

// 自动在 layout.tsx 中使用
// 收集 LCP, INP, CLS, FCP, TTFB

// 查看数据
// GET /api/analytics/vitals
```

---

### 3. errorTracking

**位置**: `apps/web/src/lib/errorTracking.ts`

错误追踪工具。

```tsx
import { ErrorTracker } from "@/lib/errorTracking";

// 捕获错误
try {
  // 你的代码
} catch (error) {
  ErrorTracker.captureException(error, {
    context: "user-action",
    userId: user.id,
  });
}

// 添加面包屑
ErrorTracker.addBreadcrumb({
  category: "navigation",
  message: "User navigated to /trending",
  level: "info",
});
```

---

### 4. supabase

**位置**: `apps/web/src/lib/supabase.ts`

Supabase 客户端工具。

```tsx
import { supabase } from "@/lib/supabase";

// 查询数据
const { data, error } = await supabase.from("predictions").select("*").limit(10);

// 实时订阅
const subscription = supabase
  .channel("predictions")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "predictions",
    },
    (payload) => {
      console.log("New prediction:", payload.new);
    }
  )
  .subscribe();
```

---

## 🛣️ API 路由

### 预测 API

#### GET /api/predictions

获取预测列表。

**查询参数**:

```typescript
{
  page?: number;        // 页码（默认 1）
  pageSize?: number;    // 每页数量（默认 20）
  category?: string;    // 类别筛选
  status?: string;      // 状态筛选
  sortBy?: string;      // 排序方式
}
```

**响应**:

```typescript
{
  success: true,
  data: {
    predictions: Prediction[],
    total: number,
    page: number,
    pageSize: number,
    totalPages: number
  }
}
```

---

#### GET /api/predictions/[id]

获取单个预测详情。

**响应**:

```typescript
{
  success: true,
  data: Prediction
}
```

---

### 搜索 API

#### GET /api/search

全局搜索。

**查询参数**:

```typescript
{
  q: string;           // 搜索关键词
  type?: string;       // 搜索类型（predictions/users）
  limit?: number;      // 结果数量（默认 10）
}
```

**响应**:

```typescript
{
  success: true,
  data: {
    predictions: Prediction[],
    users: User[],
    total: number
  }
}
```

---

### 分析 API

#### POST /api/analytics/vitals

提交 Web Vitals 数据。

**请求体**:

```typescript
{
  name: string; // 指标名称（LCP/INP/CLS等）
  value: number; // 指标值
  rating: string; // 评级（good/needs-improvement/poor）
  url: string; // 页面 URL
  userAgent: string; // User Agent
}
```

---

#### GET /api/admin/performance

获取性能监控数据。

**响应**:

```typescript
{
  success: true,
  data: {
    vitals: {
      lcp: { avg: number, p75: number, p95: number },
      inp: { avg: number, p75: number, p95: number },
      cls: { avg: number, p75: number, p95: number },
      fcp: { avg: number, p75: number, p95: number },
      ttfb: { avg: number, p75: number, p95: number }
    },
    trends: VitalsTrend[]
  }
}
```

---

## 🗄️ 数据库

### 核心表

#### predictions

```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  creator_id UUID REFERENCES users(id)
);
```

#### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP
);
```

#### web_vitals

```sql
CREATE TABLE web_vitals (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  rating TEXT,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP
);
```

---

## 💡 最佳实践

### 1. 组件优化

```tsx
// ✅ 使用 React.memo 优化组件
import { memo } from "react";

export const MyComponent = memo(({ data }) => {
  return <div>{data}</div>;
});

// ✅ 使用 useCallback 缓存函数
const handleClick = useCallback(() => {
  // 处理点击
}, [dependencies]);

// ✅ 使用 useMemo 缓存计算值
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

---

### 2. 图片优化

```tsx
// ✅ 使用 LazyImage 替代 Image
import LazyImage from '@/components/ui/LazyImage';

<LazyImage
  src="/large-image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false}  // 非首屏图片设为 false
/>

// ❌ 避免直接使用 <img>
<img src="/large-image.jpg" />
```

---

### 3. API 缓存

```tsx
// ✅ 配置 React Query 缓存
const { data } = useQuery({
  queryKey: ["predictions"],
  queryFn: fetchPredictions,
  staleTime: 60 * 1000, // 1分钟内数据新鲜
  cacheTime: 5 * 60 * 1000, // 缓存5分钟
});

// ✅ 使用 Next.js revalidate
export const revalidate = 60; // 60秒重新验证
```

---

### 4. 移动端优化

```tsx
// ✅ 确保触摸目标足够大（44x44px）
<button className="min-w-touch min-h-touch">
  点击我
</button>

// ✅ 使用安全区域
<div className="pb-safe">
  内容
</div>

// ✅ 监听移动端手势
import { useGesture } from '@use-gesture/react';

const bind = useGesture({
  onDrag: ({ offset: [x, y] }) => {
    // 处理拖拽
  }
});

<div {...bind()}>可拖拽内容</div>
```

---

### 5. 性能监控

```tsx
// ✅ 在 layout.tsx 中启用 Web Vitals
import { WebVitalsReporter } from "@/components/WebVitalsReporter";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}

// ✅ 定期查看性能仪表板
// 访问: /admin/performance
```

---

### 6. 错误处理

```tsx
// ✅ 使用 ErrorBoundary 包裹关键区域
<ErrorBoundary fallback={<ErrorFallback />}>
  <CriticalComponent />
</ErrorBoundary>;

// ✅ API 错误处理
try {
  const data = await apiWithFeedback(fetchData);
} catch (error) {
  ErrorTracker.captureException(error);
  // 显示错误 UI
}
```

---

## 📖 更多资源

- [Next.js 文档](https://nextjs.org/docs)
- [React Query 文档](https://tanstack.com/query/latest)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Web Vitals 指南](https://web.dev/vitals/)

---

**最后更新**: 2024-12-19  
**文档版本**: v1.0
