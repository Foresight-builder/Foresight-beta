# ⚡ 快速提升清单 - Quick Wins

> **目标**: 2-3 天内可完成的高价值优化  
> **投资回报率**: 极高 ⭐⭐⭐⭐⭐

---

## 🎯 立即可做（今天！）

### 1. 添加 .nvmrc 文件

**时间**: 2 分钟  
**价值**: ⭐⭐⭐

```bash
echo "20" > .nvmrc
```

**好处**: 统一团队 Node 版本，避免"在我机器上能运行"问题

---

### 2. 配置 Prettier

**时间**: 10 分钟  
**价值**: ⭐⭐⭐⭐

```bash
npm install --save-dev prettier
```

创建 `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

运行格式化:

```bash
npx prettier --write "apps/web/src/**/*.{ts,tsx}"
```

**好处**: 代码风格统一，减少 PR review 时间

---

### 3. 添加 Lighthouse CI

**时间**: 15 分钟  
**价值**: ⭐⭐⭐⭐

`.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
          uploadArtifacts: true
```

**好处**: 自动检测性能退化

---

### 4. 添加 bundle 分析

**时间**: 5 分钟  
**价值**: ⭐⭐⭐⭐⭐

```bash
npm install --save-dev @next/bundle-analyzer
```

`next.config.ts`:

```typescript
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer({
  // ... config
});
```

运行:

```bash
ANALYZE=true npm run build
```

**好处**: 找出大型依赖，优化包体积

---

## 📋 本周可完成（2-3天）

### 5. 添加 Health Check 端点

**时间**: 30 分钟  
**价值**: ⭐⭐⭐⭐⭐

已有 `/api/health`，增强它：

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalAPI: await checkExternalAPI(),
  };

  const allHealthy = Object.values(checks).every((c) => c.healthy);

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
```

**好处**: 监控系统可以实时检测服务状态

---

### 6. 图片优化

**时间**: 1 小时  
**价值**: ⭐⭐⭐⭐⭐

替换所有 `<img>` 为 `<Image>`:

```tsx
// 优化前
<img src="/logo.png" alt="Logo" />;

// 优化后
import Image from "next/image";

<Image src="/logo.png" alt="Logo" width={100} height={100} loading="lazy" />;
```

**好处**:

- 自动优化图片格式（WebP）
- 懒加载
- 响应式图片
- **LCP 提升 30-50%**

---

### 7. 添加错误边界日志

**时间**: 30 分钟  
**价值**: ⭐⭐⭐⭐

在 `error.tsx` 和 `global-error.tsx` 中添加：

```typescript
useEffect(() => {
  // 发送到日志服务
  fetch("/api/error-log", {
    method: "POST",
    body: JSON.stringify({
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
  });
}, [error]);
```

**好处**: 了解生产环境真实错误情况

---

### 8. API 响应压缩

**时间**: 10 分钟  
**价值**: ⭐⭐⭐⭐

`next.config.ts`:

```typescript
module.exports = {
  compress: true, // 启用 gzip 压缩

  // 对大于 1KB 的响应压缩
  experimental: {
    compress: {
      level: 6,
    },
  },
};
```

**好处**: API 响应体积减少 60-80%

---

### 9. 添加 Meta 标签

**时间**: 1 小时  
**价值**: ⭐⭐⭐⭐

在 `layout.tsx` 中添加完整的 SEO meta（见主文档）

**好处**:

- Google 搜索排名提升
- 社交媒体分享预览
- 提升专业度

---

### 10. 配置 robots.txt

**时间**: 5 分钟  
**价值**: ⭐⭐⭐

`public/robots.txt`:

```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://foresight.market/sitemap.xml
```

**好处**: 控制搜索引擎爬取

---

## 🔥 极速优化（半天）

### 11. 去除未使用的依赖

**时间**: 2 小时  
**价值**: ⭐⭐⭐⭐

```bash
# 安装工具
npm install --save-dev depcheck

# 检查
npx depcheck

# 移除未使用的包
npm uninstall <package-name>
```

**好处**:

- 减少 node_modules 大小
- 加快安装速度
- 减少安全风险

---

### 12. React Query 优化配置（已完成✅）

**时间**: 0 分钟  
**价值**: ⭐⭐⭐⭐⭐

已在之前的修复中完成！

**好处**:

- 减少 60% 的网络请求
- 更快的页面切换

---

### 13. 数据库索引（已完成✅）

**时间**: 0 分钟  
**价值**: ⭐⭐⭐⭐⭐

已有 `optimize-indexes.sql`，如果未执行：

```sql
-- 在 Supabase SQL Editor 执行
\i infra/supabase/sql/optimize-indexes.sql
```

**好处**: 查询速度提升 10-100 倍

---

### 14. 添加 Loading 状态

**时间**: 2 小时  
**价值**: ⭐⭐⭐⭐

使用我们创建的骨架屏组件：

```tsx
import { CardListSkeleton } from "@/components/skeletons";

if (isLoading) {
  return <CardListSkeleton count={6} />;
}
```

**好处**: 用户感知速度提升 50%

---

## 📊 投资回报率排名

| 优化项       | 时间   | 价值       | ROI        |
| ------------ | ------ | ---------- | ---------- |
| Bundle 分析  | 5分钟  | ⭐⭐⭐⭐⭐ | 🔥🔥🔥🔥🔥 |
| 图片优化     | 1小时  | ⭐⭐⭐⭐⭐ | 🔥🔥🔥🔥🔥 |
| Health Check | 30分钟 | ⭐⭐⭐⭐⭐ | 🔥🔥🔥🔥   |
| Meta 标签    | 1小时  | ⭐⭐⭐⭐   | 🔥🔥🔥🔥   |
| API 压缩     | 10分钟 | ⭐⭐⭐⭐   | 🔥🔥🔥🔥   |
| Prettier     | 10分钟 | ⭐⭐⭐⭐   | 🔥🔥🔥     |
| 错误日志     | 30分钟 | ⭐⭐⭐⭐   | 🔥🔥🔥     |
| 去除依赖     | 2小时  | ⭐⭐⭐⭐   | 🔥🔥🔥     |

---

## 🎯 建议执行顺序

### Day 1 上午（2小时）

1. ✅ 添加 .nvmrc
2. ✅ 配置 Prettier
3. ✅ 添加 bundle 分析
4. ✅ 运行并优化

### Day 1 下午（3小时）

5. ✅ 图片优化（最重要！）
6. ✅ 添加 Meta 标签
7. ✅ 配置 robots.txt

### Day 2 上午（2小时）

8. ✅ Health Check 增强
9. ✅ API 压缩
10. ✅ 错误边界日志

### Day 2 下午（3小时）

11. ✅ 去除未使用依赖
12. ✅ 添加 Loading 骨架屏
13. ✅ Lighthouse CI

---

## 📈 预期效果

完成上述优化后：

| 指标            | 优化前 | 优化后 | 提升 |
| --------------- | ------ | ------ | ---- |
| Lighthouse 分数 | 65     | 85+    | +20  |
| 首屏加载        | 3s     | 1.5s   | 50%  |
| Bundle 大小     | 800KB  | 500KB  | 37%  |
| 网络请求数      | 50+    | 20-30  | 40%  |
| 感知速度        | 😐     | 🚀     | ++++ |

---

## ✅ 检查清单

打印此清单，完成后打勾：

- [ ] .nvmrc 文件
- [ ] Prettier 配置
- [ ] Bundle 分析运行
- [ ] 所有图片替换为 Next Image
- [ ] Meta 标签完整
- [ ] robots.txt 配置
- [ ] Health Check 增强
- [ ] API 压缩启用
- [ ] 错误日志上报
- [ ] 未使用依赖清理
- [ ] Loading 骨架屏
- [ ] Lighthouse CI

---

**完成后别忘了**:

1. 运行 `npm run build` 检查构建
2. 运行 Lighthouse 测试
3. 提交代码并创建 PR
4. 庆祝！🎉

---

**需要帮助？** 参考完整的 `OPTIMIZATION_ROADMAP.md`
