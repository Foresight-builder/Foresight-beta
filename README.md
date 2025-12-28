<p align="center">
  <img src="apps/web/public/images/logo.png" alt="Foresight Logo" width="120" />
</p>

<h1 align="center">🔮 Foresight</h1>

<p align="center">
  <strong>下一代去中心化预测市场协议</strong><br/>
  <em>Polymarket 级别的交易体验 × UMA 预言机去中心化结算 × Web3 原生架构</em>
</p>

<p align="center">
  <a href="https://foresight.market">官网</a> •
  <a href="./DOCS.md">开发文档</a> •
  <a href="./CONTRIBUTING.md">贡献指南</a> •
  <a href="https://twitter.com/ForesightMarket">Twitter</a> •
  <a href="https://discord.gg/foresight">Discord</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Polygon-Amoy-8247E5?logo=polygon" alt="Polygon" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 🌟 为什么选择 Foresight？

### 对标 Polymarket，超越 Polymarket

| 特性           | Polymarket          | Foresight                   |
| -------------- | ------------------- | --------------------------- |
| **订单簿架构** | 链下撮合 + 链上结算 | ✅ 相同架构                 |
| **结算机制**   | UMA 乐观预言机      | ✅ UMA Optimistic Oracle V3 |
| **市场类型**   | 二元市场为主        | ✅ 二元 + 多元（最多8选项） |
| **抵押代币**   | USDC                | ✅ USDC                     |
| **治理模式**   | 多签 + Timelock     | ✅ Gnosis Safe + Timelock   |
| **开源程度**   | 部分开源            | ✅ 完全开源                 |
| **部署网络**   | Polygon             | ✅ Polygon（支持多链扩展）  |

### 核心优势

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Foresight 技术架构                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   用户界面 (Next.js 15)                                                  │
│   ├── 响应式设计，移动端优先                                              │
│   ├── 实时订单簿深度展示                                                  │
│   └── Web3 钱包无缝集成                                                   │
│                     │                                                    │
│                     ▼                                                    │
│   链下订单簿 (Relayer Service)                                           │
│   ├── EIP-712 签名订单                                                   │
│   ├── 高性能撮合引擎                                                      │
│   └── Supabase 实时数据同步                                              │
│                     │                                                    │
│                     ▼                                                    │
│   智能合约层 (Polygon)                                                   │
│   ├── MarketFactory: 市场工厂（UUPS 可升级）                              │
│   ├── OffchainBinaryMarket: 二元市场模板                                 │
│   ├── OffchainMultiMarket8: 多元市场模板（最多8选项）                      │
│   ├── OutcomeToken1155: ERC-1155 结果代币                                │
│   └── UMAOracleAdapterV2: UMA 预言机适配器                               │
│                     │                                                    │
│                     ▼                                                    │
│   结算层 (UMA Protocol)                                                  │
│   ├── 乐观预言机机制                                                      │
│   ├── 去中心化争议仲裁                                                    │
│   └── 经济激励保障真实性                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ 产品特性

### 🎯 预测市场

- **二元市场**: YES/NO 简单直观的预测
- **多元市场**: 支持 2-8 个选项的复杂事件
- **实时赔率**: 基于订单簿的动态定价
- **零 Gas 交易**: 链下签名，链上结算

### 💰 专业交易体验

- **限价单**: 精确控制入场价格
- **市价单**: 即时成交最优价格
- **深度图表**: 可视化买卖盘分布
- **K线图**: 专业级价格走势分析

### 🔐 安全与去中心化

- **UMA 预言机**: 去中心化的结果验证
- **多签治理**: 3/5 多签 + 24h Timelock
- **闪电贷保护**: 单区块交易量限制
- **签名安全**: ECDSA 可延展性保护

### 👛 钱包支持

- MetaMask
- Coinbase Wallet
- WalletConnect
- 更多钱包即将支持...

### 🌍 国际化

- 🇨🇳 简体中文
- 🇺🇸 English
- 🇪🇸 Español

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+ (推荐) 或 npm
- Git

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Foresight-builder/Foresight-beta.git
cd Foresight-beta

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要配置

# 启动开发服务器
npm run ws:dev

# 访问 http://localhost:3000
```

### 环境变量配置

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# 区块链
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_deployer_private_key

# 合约地址 (Polygon Amoy)
NEXT_PUBLIC_MARKET_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_OUTCOME_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_UMA_ADAPTER_ADDRESS=0x...

# Relayer
NEXT_PUBLIC_RELAYER_URL=http://localhost:3001
```

---

## 🏗️ 项目架构

```
Foresight-beta/
├── apps/
│   └── web/                      # Next.js 15 前端应用
│       ├── src/
│       │   ├── app/              # App Router 页面
│       │   ├── components/       # React 组件库
│       │   ├── contexts/         # 全局状态管理
│       │   ├── hooks/            # 自定义 Hooks
│       │   └── lib/              # 工具函数库
│       └── messages/             # i18n 翻译文件
│
├── packages/
│   └── contracts/                # Solidity 智能合约
│       └── contracts/
│           ├── MarketFactory.sol           # 市场工厂
│           ├── templates/                  # 市场模板
│           │   ├── OffchainMarketBase.sol  # 基础合约
│           │   ├── OffchainBinaryMarket.sol
│           │   └── OffchainMultiMarket8.sol
│           ├── tokens/
│           │   └── OutcomeToken1155.sol    # ERC-1155 代币
│           ├── oracles/
│           │   └── UMAOracleAdapterV2.sol  # UMA 适配器
│           └── governance/
│               └── ForesightTimelock.sol   # 治理时间锁
│
├── services/
│   └── relayer/                  # 链下订单簿服务
│       └── src/
│           ├── index.ts          # Express 服务器
│           ├── orderbook.ts      # 订单簿逻辑
│           └── supabase.ts       # 数据库交互
│
├── infra/
│   └── supabase/                 # 数据库脚本
│       ├── sql/                  # SQL 迁移文件
│       └── scripts/              # 管理脚本
│
└── scripts/                      # 部署脚本
    └── deploy_offchain_sprint1.ts
```

---

## 📊 技术规格

### 智能合约

| 合约                   | 描述                | 审计状态  |
| ---------------------- | ------------------- | --------- |
| `MarketFactory`        | UUPS 可升级市场工厂 | 🔄 进行中 |
| `OffchainBinaryMarket` | 二元市场（YES/NO）  | 🔄 进行中 |
| `OffchainMultiMarket8` | 多元市场（2-8选项） | 🔄 进行中 |
| `OutcomeToken1155`     | ERC-1155 结果代币   | 🔄 进行中 |
| `UMAOracleAdapterV2`   | UMA 预言机集成      | 🔄 进行中 |
| `ForesightTimelock`    | 治理时间锁          | 🔄 进行中 |

### 安全特性

- ✅ ReentrancyGuard 重入保护
- ✅ 闪电贷攻击防护（单区块限额）
- ✅ 批量操作大小限制（防 DoS）
- ✅ 订单最小生命周期（防三明治攻击）
- ✅ ECDSA 签名可延展性保护
- ✅ ERC-1271 智能合约钱包支持
- ✅ 熔断机制（紧急暂停）

### 性能指标

| 指标             | 目标值  |
| ---------------- | ------- |
| 首屏加载 (LCP)   | < 2.5s  |
| 交互响应 (INP)   | < 200ms |
| 布局稳定性 (CLS) | < 0.1   |
| API 响应（缓存） | < 50ms  |

---

## 🔗 已部署合约

### Polygon Amoy 测试网

| 合约                        | 地址                                         |
| --------------------------- | -------------------------------------------- |
| MarketFactory               | `0x0762A2EeFEB20f03ceA60A542FfC8CEC85FE8A30` |
| OutcomeToken1155            | `0x6dA31A9B2e9e58909836DDa3aeA7f824b1725087` |
| UMAOracleAdapterV2          | `0x5e42fce766Ad623cE175002B7b2528411C47cc92` |
| OffchainBinaryMarket (impl) | `0x846145DC2850FfB97D14C4AF79675815b6D7AF0f` |
| OffchainMultiMarket8 (impl) | `0x1e8BeCF558Baf0F74cEc2D7fa7ba44F0335282e8` |

---

## 🛣️ 路线图

### Phase 1: 基础设施 ✅

- [x] 核心智能合约开发
- [x] 链下订单簿服务
- [x] 前端交易界面
- [x] UMA 预言机集成

### Phase 2: 安全加固 ✅

- [x] 多签治理系统
- [x] Timelock 机制
- [x] 安全审计准备
- [x] 攻击防护措施

### Phase 3: 功能增强 🔄

- [ ] 流动性挖矿
- [ ] 社交功能增强
- [ ] 移动端 App
- [ ] API 开放平台

### Phase 4: 生态扩展 📅

- [ ] 多链部署
- [ ] DAO 治理
- [ ] 预言机网络扩展
- [ ] 机构级 API

---

## 📚 文档导航

| 文档                                         | 描述           |
| -------------------------------------------- | -------------- |
| [DOCS.md](./DOCS.md)                         | 完整开发者文档 |
| [CONTRIBUTING.md](./CONTRIBUTING.md)         | 贡献指南       |
| [SECURITY.md](./SECURITY.md)                 | 安全政策       |
| [CHANGELOG.md](./CHANGELOG.md)               | 变更日志       |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)   | 行为准则       |
| [Relayer 文档](./services/relayer/README.md) | 订单簿服务文档 |

---

## 🤝 参与贡献

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细指南。

```bash
# Fork 本仓库
# 创建特性分支
git checkout -b feature/amazing-feature

# 提交变更 (遵循 Conventional Commits)
git commit -m 'feat(market): add amazing feature'

# 推送到分支
git push origin feature/amazing-feature

# 创建 Pull Request
```

---

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。

---

## 📞 联系我们

<p align="center">
  <a href="https://foresight.market">🌐 官网</a> •
  <a href="https://twitter.com/ForesightMarket">🐦 Twitter</a> •
  <a href="https://discord.gg/foresight">💬 Discord</a> •
  <a href="mailto:hello@foresight.market">📧 Email</a>
</p>

---

<p align="center">
  <strong>Built with ❤️ by the Foresight Team</strong><br/>
  <em>Predicting the future, one market at a time.</em>
</p>
