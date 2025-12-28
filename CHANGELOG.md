# 📝 变更日志

本文件记录 Foresight 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 🚀 新增

- 待添加

### 🔧 变更

- 待添加

### 🐛 修复

- 待添加

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
