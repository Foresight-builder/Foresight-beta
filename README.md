# 🔮 Foresight - 去中心化预测市场

> 基于区块链的去中心化预测市场平台，参与各种事件预测，赢取收益。安全、透明、公平。

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## ✨ 特性

- 🎯 **去中心化预测** - 基于智能合约的公平预测市场
- 💰 **多钱包支持** - MetaMask、Coinbase Wallet、WalletConnect
- 💬 **实时聊天** - 预测事件讨论和交流
- 🏆 **排行榜系统** - 展示顶级预测者
- 🌍 **多语言** - 中文/英文支持
- 📱 **移动端优化** - 完美适配手机和平板
- ⚡ **高性能** - 首屏加载 < 2s，LCP < 2.5s
- 📊 **性能监控** - 实时 Web Vitals 监控

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Git

### 安装

```bash
# 克隆仓库
git clone https://github.com/Foresight-builder/Foresight-beta.git
cd Foresight-beta

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的配置

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 开始使用！

---

## 📖 文档

### 核心文档

- [📋 项目总结](./PROJECT_SUMMARY.md) - 完整的项目优化总结
- [🚀 快速开始](./QUICK_START.md) - 详细的安装和配置指南
- [📚 开发文档](./DOCS.md) - API 和组件使用文档
- [✅ 部署清单](./DEPLOYMENT_CHECKLIST.md) - 生产环境部署指南

### 优化报告

- [Phase 2 报告](./PHASE2_FINAL_REPORT.md) - 交互和性能优化
- [Phase 3 报告](./PHASE3_TIER1_COMPLETE.md) - 移动端和监控
- [Phase 3 规划](./PHASE3_PLAN.md) - 未来优化计划

---

## 🏗️ 技术栈

### 前端

- **框架**: Next.js 15.5.4 (App Router)
- **UI**: React 19 + TypeScript
- **样式**: Tailwind CSS + Framer Motion
- **状态**: React Query + Context API
- **表单**: React Hook Form

### 区块链

- **钱包**: Ethers.js
- **网络**: Polygon (Mumbai Testnet)
- **标准**: EIP-4361 (SIWE)

### 后端

- **数据库**: Supabase (PostgreSQL)
- **认证**: Sign-In with Ethereum (SIWE)
- **存储**: Supabase Storage
- **实时**: Supabase Realtime

### 工具

- **监控**: Web Vitals
- **分析**: 自建性能监控
- **部署**: Vercel
- **CI/CD**: GitHub Actions

---

## 📂 项目结构

```
Foresight-beta/
├── apps/
│   └── web/                    # Next.js 主应用
│       ├── src/
│       │   ├── app/            # App Router 页面
│       │   │   ├── admin/      # 管理页面
│       │   │   │   └── performance/  # 性能监控
│       │   │   ├── api/        # API 路由
│       │   │   │   ├── analytics/    # 分析 API
│       │   │   │   ├── predictions/  # 预测 API
│       │   │   │   └── siwe/         # 认证 API
│       │   │   ├── trending/   # 热门页面
│       │   │   ├── forum/      # 论坛页面
│       │   │   └── layout.tsx  # 根布局
│       │   ├── components/     # React 组件
│       │   │   ├── ui/         # UI 组件
│       │   │   ├── skeletons/  # 骨架屏
│       │   │   ├── MobileMenu.tsx
│       │   │   ├── MobileBottomNav.tsx
│       │   │   ├── PullToRefresh.tsx
│       │   │   └── ...
│       │   ├── contexts/       # Context 状态
│       │   │   ├── AuthContext.tsx
│       │   │   ├── WalletContext.tsx
│       │   │   └── UserProfileContext.tsx
│       │   ├── hooks/          # 自定义 Hooks
│       │   │   ├── useInfiniteScroll.ts
│       │   │   ├── usePersistedState.ts
│       │   │   └── useDebounce.ts
│       │   ├── lib/            # 工具函数
│       │   │   ├── webVitals.ts
│       │   │   ├── apiWithFeedback.ts
│       │   │   ├── supabase.ts
│       │   │   └── ...
│       │   └── styles/
│       │       └── globals.css
│       ├── public/             # 静态资源
│       └── package.json
├── services/
│   └── relayer/                # 中继服务
├── infra/
│   └── supabase/               # 数据库配置
│       ├── migrations/         # 数据库迁移
│       └── sql/                # SQL 脚本
├── docs/                       # 文档
├── README.md                   # 项目主文档（本文件）
├── PROJECT_SUMMARY.md          # 项目总结
└── package.json                # 根 package.json
```

---

## 🎨 核心功能

### 1. 预测市场

- 创建和参与预测事件
- 二元和多元选项支持
- 实时赔率更新
- 自动结算

### 2. 钱包集成

- MetaMask
- Coinbase Wallet
- WalletConnect
- Sign-In with Ethereum (SIWE)

### 3. 社交功能

- 实时聊天
- 讨论论坛
- 用户资料
- 排行榜

### 4. 移动端

- 响应式设计
- 汉堡菜单
- 底部导航
- 下拉刷新
- 触摸优化

### 5. 性能监控

- Web Vitals 收集
- 性能仪表板
- 实时监控
- 数据可视化

---

## 🛠️ 开发

### 开发服务器

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

### 代码检查

```bash
npm run lint
```

### 测试

```bash
npm test
```

---

## 📊 性能指标

### 目标

- **LCP** < 2.5s
- **INP** < 200ms
- **CLS** < 0.1
- **FCP** < 1.8s
- **TTFB** < 800ms

### 实际表现

- ✅ 首屏加载: ~1.8s
- ✅ 移动端: 优秀
- ✅ SEO: 良好
- ✅ 可访问性: 良好

查看实时性能监控：http://localhost:3000/admin/performance

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 开发流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

---

## 👥 团队

- **开发**: Foresight Team
- **设计**: UI/UX Team
- **区块链**: Smart Contract Team

---

## 📧 联系我们

- **Website**: https://foresight.market
- **Twitter**: @ForesightMarket
- **Discord**: [加入我们](https://discord.gg/foresight)
- **Email**: hello@foresight.market

---

## 🙏 致谢

感谢所有贡献者和支持者！

特别感谢：

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Ethers.js](https://docs.ethers.org/)

---

## 📈 路线图

### ✅ 已完成

- Phase 1: 基础 UX 优化
- Phase 2: 交互和性能
- Phase 3 Tier 1: 移动端 + 监控

### 🔜 计划中

- Phase 3 Tier 2: PWA + 推送通知 + SEO
- Phase 3 Tier 3: 国际化 + 无障碍访问
- 更多功能敬请期待...

---

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

---

**最后更新**: 2024-12-19
