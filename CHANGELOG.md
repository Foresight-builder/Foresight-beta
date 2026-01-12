# 📝 变更日志

本文件记录 Foresight 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 🚀 新增

#### 运行时安全与可观测性

- ✨ 全局中间件注入 x-request-id 并对 `/api/siwe/verify` 启用严格限流（5 次/分钟/每 IP）
- ✨ 事件采集统一化：开发打印、生产持久化 Supabase analytics_events，支持 RED 聚合查询
- ✨ 限流工具支持 Upstash Redis 优先、内存回退；预设档位 strict/moderate/relaxed/lenient

### 📖 文档

- 📖 DOCS.md：新增“认证与会话”“限流与中间件”“可观测性与事件”“API 响应规范”
- 📖 README.md：新增“运行时安全与可观测性”摘要
- 📖 SECURITY.md：新增“运行时安全与风控”章节（CSP、限流、SIWE、OTP、事件审计）
- 📖 CONTRIBUTING.md：补充提交前本地自检与脚本指引

#### 社交系统 (Social Network)

- ✨ **用户关注系统** - 实现用户间双向关注逻辑，新增 `user_follows` 数据库架构。
- ✨ **UserHoverCard** - 全局通用的用户预览卡片，支持悬停显示资料、快速关注及个人中心跳转。
- ✨ **个人中心深度集成** - 新增“粉丝”标签页，优化“关注”列表（区分事件与用户），支持实时社交统计。
- ✨ **跨页面社交入口** - 在排行榜、详情页、评论区全面集成用户卡片入口。

#### 游戏化体验 (Gamification)

- ✨ **Flag 系统 2.0** - 完全重构的创建 Flag 流程，引入沉浸式三步走（播种、呵护、启航）体验。
- ✨ **打卡系统优化** - 重构 Check-in 弹窗，支持根据 Flag 类型动态切换主题，增强仪式感。
- ✨ **流光美学设计** - 弹窗引入 Mesh Gradient（网格渐变）与 Grainy Texture（噪点纹理），大幅提升视觉质感。

#### 排行榜优化

- ✨ **多维排序** - 实现按“盈利”、“胜率”、“连胜”分类切换的实时排序功能。
- ✨ **全局搜索** - 支持按用户名或钱包地址快速检索交易员。
- ✨ **My Spot 模块** - 实装个人排名追踪，支持显示当前排名、盈利及与下一名的差距。

#### 市场增强

- ✨ **Trending Now** - 实装排行榜侧边栏的“正在流行”卡片，实时获取并展示高热度预测事件。
- ✨ **创建 Flag 模板** - 优化官方挑战模板系统，支持动态文案替换与专属主题色。

### ⚡ 性能与体验

- 🎨 **UI 全面优化** - 深度集成玻璃拟态（Glassmorphism）与 Framer Motion 物理引擎动画。
- 🌍 **国际化补全** - 针对社交与 Flag 系统补全了中、英、西三语的俏皮暖心文案。
- 🏗️ **React Portal 集成** - 解决悬浮卡片的 z-index 层级遮挡问题，提升交互稳定性。

---

## [0.1.0] - 2025-12-28

### 🚀 新增

#### 智能合约

- ✨ `MarketFactory` - UUPS 可升级市场工厂合约
- ✨ `OffchainBinaryMarket` - 二元预测市场模板 (YES/NO)
- ✨ `OffchainMultiMarket8` - 多元预测市场模板 (2-8 选项)
- ✨ `OutcomeToken1155` - ERC-1155 结果代币合约
- ✨ `UMAOracleAdapterV2` - UMA Optimistic Oracle V3 适配器
- ✨ `ForesightTimelock` - 治理时间锁合约

#### 前端应用

- ✨ 市场列表页面（趋势、分类筛选）
- ✨ 市场详情页面（交易面板、订单簿、K 线图）
- ✨ 用户资料页面（持仓、历史）
- ✨ 排行榜页面
- ✨ 提案广场功能
- ✨ 论坛讨论功能
- ✨ 多语言支持（中文、英文、西班牙语）
- ✨ 深色/浅色主题切换
- ✨ PWA 支持

#### Relayer 服务

- ✨ 链下订单簿撮合引擎
- ✨ EIP-712 签名验证
- ✨ WebSocket 实时推送
- ✨ Prometheus 指标监控
- ✨ 结构化日志系统
- ✨ Redis 订单簿快照
- ✨ 健康检查端点

#### 高可用 (Phase 2)

- ✨ 基于 Redis 的 Leader Election
- ✨ WebSocket 集群化 (Redis Pub/Sub)
- ✨ 数据库读写分离
- ✨ 链上对账系统

#### 弹性架构 (Phase 3)

- ✨ Redis 分布式滑动窗口限流
- ✨ Circuit Breaker 熔断器
- ✨ Saga 分布式事务
- ✨ 指数退避重试机制
- ✨ Kubernetes HPA 自动扩缩容
- ✨ 蓝绿部署支持

#### 基础设施

- ✨ Supabase 数据库集成
- ✨ Sentry 错误监控集成
- ✨ Grafana 监控仪表板

### 🔐 安全

- 🔒 ReentrancyGuard 重入保护
- 🔒 闪电贷攻击防护（单区块限额）
- 🔒 批量操作大小限制
- 🔒 ECDSA 签名可延展性保护
- 🔒 ERC-1271 智能合约钱包支持
- 🔒 紧急暂停熔断机制
- 🔒 多签治理 + Timelock

### 📚 文档

- 📖 README.md 项目介绍
- 📖 DOCS.md 开发者文档
- 📖 CONTRIBUTING.md 贡献指南
- 📖 SECURITY.md 安全政策
- 📖 Relayer 服务文档

---

## 版本对比

- [Unreleased]: https://github.com/Foresight-builder/Foresight-beta/compare/v0.1.0...HEAD
- [0.1.0]: https://github.com/Foresight-builder/Foresight-beta/releases/tag/v0.1.0

---

## 版本号说明

- **主版本号 (Major)**: 不兼容的 API 变更
- **次版本号 (Minor)**: 向后兼容的功能新增
- **修订号 (Patch)**: 向后兼容的 Bug 修复

### 变更类型图标

| 图标 | 类型 | 描述     |
| ---- | ---- | -------- |
| ✨   | 新增 | 新功能   |
| 🔧   | 变更 | 功能变更 |
| 🐛   | 修复 | Bug 修复 |
| 🔒   | 安全 | 安全相关 |
| 📖   | 文档 | 文档更新 |
| ⚡   | 性能 | 性能优化 |
| 🗑️   | 移除 | 移除功能 |
| ⚠️   | 废弃 | 废弃警告 |
