# 📚 Foresight 开发者文档

> 完整的技术参考手册，涵盖智能合约、前端架构、API 设计与部署指南。

---

## 📑 目录

- [架构概览](#架构概览)
- [智能合约](#智能合约)
  - [合约架构](#合约架构)
  - [MarketFactory](#marketfactory)
  - [市场模板](#市场模板)
  - [UMA 预言机](#uma-预言机)
  - [治理系统](#治理系统)
  - [安全机制](#安全机制)
- [链下订单簿](#链下订单簿)
  - [订单类型](#订单类型)
  - [EIP-712 签名](#eip-712-签名)
  - [撮合引擎](#撮合引擎)
  - [Relayer API](#relayer-api)
- [前端应用](#前端应用)
  - [目录结构](#目录结构)
- [核心组件](#核心组件)
  - [状态管理](#状态管理)
  - [性能优化](#性能优化)
- [API 参考](#api-参考)
- [数据库设计](#数据库设计)
- [部署指南](#部署指南)
- [测试](#测试)

---

## 架构概览

Foresight 采用 **链下订单簿 + 链上结算** 的混合架构，与 Polymarket 技术方案一致：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户操作流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 挂单 (Maker)                    2. 吃单 (Taker)                         │
│  ┌─────────────────────┐            ┌─────────────────────┐                │
│  │ 用户签名 EIP-712    │            │ 获取订单簿深度      │                │
│  │ 订单 (链下)         │ ────────►  │ 选择订单成交        │                │
│  │ 0 Gas 成本          │            │ 提交 batchFill     │                │
│  └─────────────────────┘            └─────────────────────┘                │
│           │                                   │                             │
│           ▼                                   ▼                             │
│  ┌─────────────────────┐            ┌─────────────────────┐                │
│  │    Relayer 服务     │            │    智能合约         │                │
│  │  存储 & 广播订单    │ ◄───────── │  验证签名 & 结算    │                │
│  └─────────────────────┘            └─────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 核心设计原则

| 原则 | 实现 |
|------|------|
| **零 Gas 挂单** | 用户仅签名，订单存储在链下 |
| **原子结算** | batchFill 一次交易完成多笔成交 |
| **去中心化裁决** | UMA 乐观预言机 + 2h 争议期 |
| **可升级性** | UUPS 代理模式 + Timelock 延迟 |
| **Gas 效率** | Minimal Proxy (EIP-1167) 部署市场 |

---

## 智能合约

### 合约架构

```
packages/contracts/contracts/
├── MarketFactory.sol              # 市场工厂 (UUPS 可升级)
├── interfaces/
│   ├── IOracle.sol                # 预言机接口
│   ├── IOracleRegistrar.sol       # 市场注册接口
│   └── IMarket.sol                # 市场接口
├── tokens/
│   └── OutcomeToken1155.sol       # ERC-1155 结果代币
├── templates/
│   ├── OffchainMarketBase.sol     # 市场基类
│   ├── OffchainBinaryMarket.sol   # 二元市场模板
│   └── OffchainMultiMarket8.sol   # 多元市场模板 (≤8结果)
├── oracles/
│   └── UMAOracleAdapterV2.sol     # UMA 预言机适配器
└── governance/
    └── ForesightTimelock.sol      # 治理 Timelock
```

### MarketFactory

工厂合约负责创建和管理所有预测市场。

```solidity
/// @title MarketFactory
/// @notice 创建和管理预测市场的工厂合约
/// @dev 使用 UUPS 可升级模式，通过 Minimal Proxy 部署市场实例
contract MarketFactory is 
    Initializable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable 
{
    // 角色定义
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // 模板注册: templateId => implementation
    mapping(bytes32 => address) public templates;
    
    // 市场映射: marketId => market address
    mapping(bytes32 => address) public markets;
    
    /// @notice 创建新市场
    /// @param marketId 市场唯一标识
    /// @param templateId 使用的模板 ID
    /// @param oracle 预言机地址
    /// @param resolutionTime 结算时间戳
    /// @param outcomeCount 结果数量
    /// @param initData 初始化数据
    function createMarket(
        bytes32 marketId,
        bytes32 templateId,
        address oracle,
        uint256 resolutionTime,
        uint256 outcomeCount,
        bytes calldata initData
    ) external returns (address market);
}
```

**关键功能：**
- `registerTemplate(templateId, implementation)` - 注册市场模板
- `createMarket(...)` - 通过 Clone 创建市场实例
- `setDefaultOracle(oracle)` - 设置默认预言机
- `getMarkets(ids)` - 批量查询市场信息

### 市场模板

#### OffchainMarketBase

所有市场模板的基类，定义了通用的结算逻辑。

```solidity
/// @title OffchainMarketBase
/// @notice 链下订单簿市场的基础合约
abstract contract OffchainMarketBase is 
    IMarket, 
    ReentrancyGuard, 
    Initializable,
    ERC1155Holder,
    EIP712Upgradeable 
{
    // ========== 常量 ==========
    uint256 public constant SHARE_SCALE = 1e18;      // 份额精度
    uint256 public constant USDC_SCALE = 1e6;        // USDC 精度
    uint256 public constant SHARE_GRANULARITY = 1e12; // 最小份额单位
    uint256 public constant MAX_PRICE_6_PER_1E18 = 1e6; // 最高价格 (1 USDC)
    
    // ========== 安全限制 ==========
    uint256 public constant MAX_VOLUME_PER_BLOCK = 1_000_000e6;  // 闪电贷保护
    uint256 public constant MAX_BATCH_SIZE = 50;                  // 批量限制
    uint256 public constant MIN_ORDER_LIFETIME = 5 seconds;       // 最短订单寿命
    
    // ========== 状态 ==========
    enum State { TRADING, RESOLVED, INVALID }
    
    State public state;
    uint8 public resolvedOutcome;
    uint8 public outcomeCount;
    bool public paused;
    
    // ========== 核心函数 ==========
    
    /// @notice 批量结算订单 (由 Relayer 调用)
    function batchFill(SignedFill[] calldata fills) external nonReentrant whenNotPaused;
    
    /// @notice 铸造完整份额集
    function mintCompleteSet(uint256 amount) external nonReentrant whenNotPaused;
    
    /// @notice 赎回获胜结果代币
    function redeem(uint256 amount) external nonReentrant;
    
    /// @notice 市场无效时赎回完整集 (无手续费)
    function redeemCompleteSetOnInvalid(uint256 amount) external nonReentrant;
    
    /// @notice 解决市场 (读取预言机结果)
    function resolve() external;
}
```

**价格与数量单位标准：**

| 字段 | 单位 | 示例 |
|------|------|------|
| `amount18` | 1e18 (份额) | 1 份 = `1000000000000000000` |
| `price6Per1e18` | USDC/份额 | 0.65 USDC = `650000` |
| `SHARE_GRANULARITY` | 最小单位 1e12 | 保证 6 位小数精度 |

#### OffchainBinaryMarket

二元市场模板 (Yes/No)。

```solidity
contract OffchainBinaryMarket is OffchainMarketBase {
    function initialize(
        bytes32 marketId_,
        address factory_,
        address creator_,
        address collateralToken_,
        address outcomeToken_,
        address oracle_,
        uint64 resolutionTime_,
        uint256 feeBps_  // 必须为 0
    ) external initializer {
        require(feeBps_ == 0, "FeeNotSupported");
        _initCommon(..., 2); // outcomeCount = 2
    }
}
```

#### OffchainMultiMarket8

多元市场模板 (2-8 种结果)。

```solidity
contract OffchainMultiMarket8 is OffchainMarketBase {
    function initialize(
        bytes32 marketId_,
        address factory_,
        address creator_,
        address collateralToken_,
        address outcomeToken_,
        address oracle_,
        uint64 resolutionTime_,
        uint8 outcomeCount_,  // 2-8
        uint256 feeBps_       // 必须为 0
    ) external initializer {
        require(outcomeCount_ >= 2 && outcomeCount_ <= 8, "InvalidOutcomeCount");
        require(feeBps_ == 0, "FeeNotSupported");
        _initCommon(..., outcomeCount_);
    }
}
```

### UMA 预言机

#### UMAOracleAdapterV2

与 UMA Optimistic Oracle V3 集成的适配器。

```solidity
/// @title UMAOracleAdapterV2
/// @notice UMA 乐观预言机适配器，支持二元和多元市场
contract UMAOracleAdapterV2 is 
    IOracle, 
    IOracleRegistrar, 
    AccessControl, 
    ReentrancyGuard 
{
    // ========== 角色 ==========
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    
    // ========== 状态 ==========
    enum MarketStatus { NONE, ASSERTING, RESOLVED, INVALID }
    
    struct MarketConfig {
        uint64 resolutionTime;
        uint8 outcomeCount;
        MarketStatus status;
        uint8 resolvedOutcome;
        uint8 reassertionCount;
    }
    
    mapping(bytes32 => MarketConfig) public marketConfigs;
    
    // ========== 核心流程 ==========
    
    /// @notice 市场注册 (由 Factory 调用)
    function registerMarket(
        bytes32 marketId, 
        uint64 resolutionTime, 
        uint8 outcomeCount
    ) external onlyRole(REGISTRAR_ROLE);
    
    /// @notice 发起结算断言 (由 Reporter 调用)
    function requestOutcome(
        bytes32 marketId, 
        uint8 outcomeIndex
    ) external onlyRole(REPORTER_ROLE) nonReentrant;
    
    /// @notice 结算断言 (任何人可调用)
    function settleOutcome(bytes32 marketId) external nonReentrant;
    
    /// @notice 重置无效市场以重新断言
    function resetMarketForReassert(bytes32 marketId) external onlyRole(DEFAULT_ADMIN_ROLE);
}
```

**UMA 结算流程：**

```
1. Reporter 调用 requestOutcome(marketId, outcomeIndex)
   └── 向 UMA OO V3 发起断言，附带 bond

2. UMA Liveness Period (默认 2 小时)
   └── 任何人可通过 disputeAssertion() 争议

3a. 无争议 → assertionResolvedCallback(true)
    └── 市场状态 = RESOLVED，可赎回

3b. 有争议且 Disputer 胜出 → assertionResolvedCallback(false)
    └── 市场状态 = INVALID，可赎回完整集 (无损失)
```

### 治理系统

#### ForesightTimelock

关键操作的延迟执行机制。

```solidity
/// @title ForesightTimelock
/// @notice 24 小时延迟的治理 Timelock
contract ForesightTimelock is TimelockController {
    constructor(
        uint256 minDelay_,          // 24 * 3600 (24小时)
        address[] memory proposers_, // Gnosis Safe 地址
        address[] memory executors_, // address(0) = 任何人可执行
        address admin_
    ) TimelockController(minDelay_, proposers_, executors_, admin_) {}
}
```

**治理架构：**

```
Gnosis Safe (3/5 多签)
        │
        ▼ 提案
ForesightTimelock (24h 延迟)
        │
        ▼ 执行
┌───────────────────────────────────────┐
│  MarketFactory    UMAOracleAdapterV2  │
│  (ADMIN_ROLE)     (DEFAULT_ADMIN_ROLE)│
└───────────────────────────────────────┘
```

### 安全机制

#### 闪电贷保护

```solidity
uint256 public constant MAX_VOLUME_PER_BLOCK = 1_000_000e6; // 100万 USDC

mapping(uint256 => uint256) private _blockVolume;

function _checkFlashLoanProtection(uint256 volume) internal {
    uint256 currentVolume = _blockVolume[block.number] + volume;
    if (currentVolume > MAX_VOLUME_PER_BLOCK) {
        revert FlashLoanProtection();
    }
    _blockVolume[block.number] = currentVolume;
}
```

#### 批量大小限制

```solidity
uint256 public constant MAX_BATCH_SIZE = 50;

function batchFill(SignedFill[] calldata fills) external {
    if (fills.length > MAX_BATCH_SIZE) revert BatchSizeExceeded();
    // ...
}
```

#### 订单最短寿命

```solidity
uint256 public constant MIN_ORDER_LIFETIME = 5 seconds;

function _fillOne(...) internal {
    if (order.expiry < block.timestamp + MIN_ORDER_LIFETIME) {
        revert OrderLifetimeTooShort();
    }
    // ...
}
```

#### 签名可塑性保护

```solidity
uint256 constant ECDSA_S_UPPER_BOUND = 
    0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

function _checkSignatureMalleability(bytes calldata sig) internal pure {
    bytes32 s;
    assembly { s := calldataload(add(sig.offset, 32)) }
    if (uint256(s) > ECDSA_S_UPPER_BOUND) revert InvalidSignatureS();
}
```

---

## 链下订单簿

### 订单类型

```typescript
interface Order {
  marketId: string;      // bytes32 市场 ID
  maker: string;         // 挂单者地址
  isBuy: boolean;        // true = 买入, false = 卖出
  outcomeIndex: number;  // 结果索引 (0-7)
  amount: bigint;        // 数量 (1e18 单位)
  price: bigint;         // 价格 (1e6 单位, USDC per 1e18 share)
  nonce: bigint;         // 防重放
  expiry: number;        // 过期时间戳
  salt: bigint;          // 随机盐
}
```

### EIP-712 签名

**Domain:**
```typescript
const domain = {
  name: "Foresight",
  version: "1",
  chainId: 80002, // Polygon Amoy
  verifyingContract: marketAddress,
};
```

**Order Type:**
```typescript
const types = {
  Order: [
    { name: "marketId", type: "bytes32" },
    { name: "maker", type: "address" },
    { name: "isBuy", type: "bool" },
    { name: "outcomeIndex", type: "uint8" },
    { name: "amount", type: "uint256" },
    { name: "price", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "salt", type: "uint256" },
  ],
};
```

**签名流程:**
```typescript
const signature = await signer.signTypedData(domain, types, order);
```

### 撮合引擎

Relayer 服务负责订单存储和撮合。

```
services/relayer/
├── src/
│   ├── index.ts          # Express 服务入口
│   ├── orderbook.ts      # 订单簿逻辑
│   └── supabase.ts       # 数据库操作
```

**撮合逻辑：**
```typescript
// 买单按价格降序排列 (高价优先)
// 卖单按价格升序排列 (低价优先)

function matchOrders(buyOrders: Order[], sellOrders: Order[]): Fill[] {
  const fills: Fill[] = [];
  
  for (const buy of buyOrders) {
    for (const sell of sellOrders) {
      if (buy.price >= sell.price) {
        // 可以成交
        const fillAmount = min(buy.remainingAmount, sell.remainingAmount);
        fills.push({ buy, sell, amount: fillAmount, price: sell.price });
      }
    }
  }
  
  return fills;
}
```

### Relayer API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/order` | POST | 提交新订单 |
| `/order/:salt` | DELETE | 取消订单 |
| `/depth/:marketId/:outcomeIndex` | GET | 获取订单簿深度 |
| `/orders/:marketId` | GET | 获取市场所有订单 |
| `/my-orders/:address` | GET | 获取用户订单 |

**提交订单示例：**
```bash
curl -X POST http://localhost:3001/order \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "marketId": "0x...",
      "maker": "0x...",
      "isBuy": true,
      "outcomeIndex": 0,
      "amount": "1000000000000000000",
      "price": "650000",
      "nonce": "1",
      "expiry": 1735689600,
      "salt": "12345"
    },
    "signature": "0x..."
  }'
```

---

## 前端应用

### 目录结构

```
apps/web/src/
├── app/                          # Next.js App Router
│   ├── trending/                 # 热门预测列表
│   ├── prediction/[id]/          # 预测详情 & 交易
│   ├── proposals/                # 提案广场
│   ├── leaderboard/              # 排行榜
│   ├── forum/                    # 讨论论坛
│   └── api/                      # API 路由
│
├── components/
│   ├── ui/                       # 基础 UI 组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── VirtualList.tsx       # 虚拟列表
│   │   └── LazyImage.tsx         # 懒加载图片
│   ├── market/                   # 市场相关组件
│   │   ├── TradingPanel.tsx      # 交易面板
│   │   ├── MarketChart.tsx       # K线图
│   │   └── OutcomeList.tsx       # 结果列表
│   └── skeletons/                # 骨架屏
│
├── contexts/
│   ├── AuthContext.tsx           # 认证状态
│   ├── WalletContext.tsx         # 钱包连接
│   └── UserProfileContext.tsx    # 用户资料
│
├── hooks/
│   ├── useInfiniteScroll.ts      # 无限滚动
│   ├── usePersistedState.ts      # 持久化状态
│   ├── usePrefetch.ts            # 数据预取
│   └── useQueries.ts             # React Query hooks
│
└── lib/
    ├── supabase.ts               # Supabase 客户端
    ├── apiCache.ts               # API 缓存
    ├── security.ts               # 安全工具
    ├── rateLimit.ts              # 限流
    └── toast.ts                  # Toast 通知
```

### 核心组件

#### TradingPanel

交易面板组件，支持限价单和市价单。

```tsx
import { TradingPanel } from "@/components/market/TradingPanel";

<TradingPanel
  marketId={marketId}
  outcomeIndex={0}
  outcomeName="Yes"
  currentPrice={0.65}
  onOrderSubmit={handleOrderSubmit}
/>
```

#### VirtualList

高性能虚拟列表，只渲染可见项。

```tsx
import { VirtualList } from "@/components/ui/VirtualList";

<VirtualList
  items={predictions}
  estimatedItemHeight={200}
  getKey={(item) => item.id}
  renderItem={(item) => <PredictionCard prediction={item} />}
  onLoadMore={loadMore}
  hasMore={hasNextPage}
/>
```

### 状态管理

**React Query 配置：**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2分钟
      gcTime: 15 * 60 * 1000,        // 15分钟
      refetchOnWindowFocus: "always",
      structuralSharing: true,        // 减少重渲染
      networkMode: "offlineFirst",
    },
  },
});
```

**数据预取：**
```tsx
import { usePrefetch } from "@/hooks/usePrefetch";

function PredictionCard({ id }) {
  const { prefetchPrediction } = usePrefetch();
  
  return (
    <Card onMouseEnter={() => prefetchPrediction(id)}>
      {/* ... */}
    </Card>
  );
}
```

### 性能优化

| 优化 | 实现 |
|------|------|
| **Bundle 分割** | ethers, framer-motion, react-query 单独打包 |
| **查询并行化** | Promise.all 并行数据库查询 |
| **虚拟列表** | VirtualList 只渲染可见项 |
| **图片懒加载** | LazyImage + IntersectionObserver |
| **API 缓存** | 内存缓存 + HTTP Cache Headers |
| **预取** | 悬停时预取详情数据 |

---

## API 参考

### 预测列表

```
GET /api/predictions
```

**参数：**
| 参数 | 类型 | 描述 |
|------|------|------|
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |
| `category` | string | 分类筛选 |
| `status` | string | 状态筛选 |
| `includeOutcomes` | boolean | 是否包含结果详情 |

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "BTC 会在 2025 年突破 $100k 吗？",
      "category": "crypto",
      "status": "active",
      "followers_count": 128,
      "stats": {
        "yesAmount": 15000.5,
        "noAmount": 8500.25,
        "totalAmount": 23500.75,
        "yesProbability": 0.6383
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 订单簿深度

```
GET /api/orderbook/depth?marketId=0x...&outcomeIndex=0
```

**响应：**
```json
{
  "success": true,
  "data": {
    "bids": [
      { "price": "650000", "amount": "5000000000000000000" },
      { "price": "640000", "amount": "3000000000000000000" }
    ],
    "asks": [
      { "price": "660000", "amount": "2000000000000000000" },
      { "price": "670000", "amount": "4000000000000000000" }
    ]
  }
}
```

---

## 数据库设计

### 核心表

```sql
-- 预测事件
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  market_id TEXT UNIQUE,           -- 链上 marketId
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  resolution_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订单簿
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL,
  maker TEXT NOT NULL,
  is_buy BOOLEAN NOT NULL,
  outcome_index SMALLINT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  filled_amount NUMERIC DEFAULT 0,
  salt TEXT UNIQUE NOT NULL,
  expiry TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成交记录
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL,
  outcome_index SMALLINT NOT NULL,
  maker TEXT NOT NULL,
  taker TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_orders_market ON orders(market_id, outcome_index, status);
CREATE INDEX idx_trades_market ON trades(market_id, outcome_index);
```

---

## 部署指南

### 1. 合约部署

```bash
# 设置环境变量
export PRIVATE_KEY=0x...
export POLYGON_RPC_URL=https://...
export UMA_OO_V3_ADDRESS=0x...
export USDC_ADDRESS=0x...

# 部署到 Polygon Amoy
npx hardhat run scripts/deploy_offchain_sprint1.ts --network amoy
```

### 2. 前端部署

```bash
cd apps/web

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local

# 构建
npm run build

# 部署到 Vercel
vercel --prod
```

### 3. Relayer 部署

```bash
cd services/relayer

# 配置
export BUNDLER_PRIVATE_KEY=0x...
export RPC_URL=https://...
export SUPABASE_URL=...
export SUPABASE_SERVICE_KEY=...

# 启动
npm run start
```

---

## 测试

### 合约测试

```bash
# 运行所有测试
npm run hardhat:test

# 运行特定测试
npx hardhat test test/OffchainMarket.test.ts

# 覆盖率
npx hardhat coverage
```

### 前端测试

```bash
cd apps/web

# 运行测试
npm run test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage
```

---

## 环境变量参考

### 前端 (apps/web/.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# 合约地址
NEXT_PUBLIC_FORESIGHT_ADDRESS_AMOY=0x0762A2EeFEB20f03ceA60A542FfC8CEC85FE8A30
NEXT_PUBLIC_USDC_ADDRESS_AMOY=0x...
NEXT_PUBLIC_OUTCOME_TOKEN_ADDRESS_AMOY=0x6dA31A9B2e9e58909836DDa3aeA7f824b1725087

# Relayer
NEXT_PUBLIC_RELAYER_URL=http://localhost:3001

# RPC
NEXT_PUBLIC_POLYGON_RPC_URL=https://...

# 可选
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
SENTRY_DSN=...
```

### Relayer (services/relayer/.env)

```env
PRIVATE_KEY=0x...
RPC_URL=https://...
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## 常见问题

### Q: 为什么使用链下订单簿而不是 AMM？

**A:** 链下订单簿提供：
- 零 Gas 挂单/撤单
- 无滑点的精确定价
- 毫秒级交易响应
- 更好的做市商体验

### Q: UMA 预言机如何保证公正？

**A:** UMA 采用乐观预言机机制：
1. Reporter 提交结果并质押保证金
2. 2小时争议期内任何人可挑战
3. 争议由 UMA DVM (去中心化仲裁机制) 裁决
4. 恶意 Reporter 将损失保证金

### Q: 如何处理市场无效 (Invalid) 状态？

**A:** 当 UMA 争议成功但原断言被否决时：
1. 市场进入 `INVALID` 状态
2. 用户可调用 `redeemCompleteSetOnInvalid()` 赎回本金
3. 无手续费，用户资金完全返还

---

**文档版本**: v2.0  
**最后更新**: 2024-12-27
