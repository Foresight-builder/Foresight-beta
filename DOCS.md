# 📚 Foresight 开发者文档

> 完整的技术参考手册，涵盖智能合约、前端架构、API 设计、数据库模型与部署运维。

---

## 📑 目录

- [架构概览](#架构概览)
- [智能合约](#智能合约)
  - [合约架构](#合约架构)
  - [MarketFactory](#marketfactory)
  - [市场模板](#市场模板)
  - [代币系统](#代币系统)
  - [预言机系统](#预言机系统)
  - [治理系统](#治理系统)
- [链下订单簿](#链下订单簿)
  - [订单生命周期](#订单生命周期)
  - [EIP-712 签名](#eip-712-签名)
  - [Relayer 服务](#relayer-服务)
- [前端架构](#前端架构)
  - [技术栈](#技术栈)
  - [目录结构](#目录结构)
  - [核心组件](#核心组件)
  - [自定义 Hooks](#自定义-hooks)
  - [状态管理](#状态管理)
- [API 参考](#api-参考)
- [数据库设计](#数据库设计)
- [部署指南](#部署指南)
- [安全规范](#安全规范)
- [测试指南](#测试指南)
- [性能优化](#性能优化)

---

## 架构概览

Foresight 采用 **链下撮合 + 链上结算** 的混合架构，实现了接近中心化交易所的用户体验，同时保持完全的去中心化结算。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户交互层                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Web App    │  │  Mobile App │  │  API Client │  │  Bot/SDK    │         │
│  │  (Next.js)  │  │  (Future)   │  │  (REST)     │  │  (Future)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              服务层                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Relayer Service                             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │ Order Book  │  │  Matching   │  │  Event      │                  │    │
│  │  │ Management  │  │  Engine     │  │  Ingestion  │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐    │
│  │                         Supabase                                    │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │  Orders     │  │  Trades     │  │  Candles    │                  │    │
│  │  │  (待成交)   │  │  (历史成交) │  │  (K线数据)  │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              区块链层                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Polygon Network                                │    │
│  │                                                                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │ Market      │  │ Outcome     │  │ UMA Oracle  │                  │    │
│  │  │ Factory     │  │ Token 1155  │  │ Adapter V2  │                  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │    │
│  │         │                │                │                         │    │
│  │  ┌──────▼────────────────▼────────────────▼──────┐                  │    │
│  │  │              Market Instances                 │                  │    │
│  │  │  ┌─────────────────┐  ┌─────────────────┐     │                  │    │
│  │  │  │ Binary Market   │  │ Multi Market    │     │                  │    │
│  │  │  │ (Minimal Proxy) │  │ (Minimal Proxy) │     │                  │    │
│  │  │  └─────────────────┘  └─────────────────┘     │                  │    │
│  │  └───────────────────────────────────────────────┘                  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐    │
│  │                    UMA Optimistic Oracle V3                         │    │
│  │              (去中心化结果验证 & 争议仲裁)                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 智能合约

### 合约架构

```
contracts/
├── MarketFactory.sol              # 市场工厂（UUPS 可升级）
├── interfaces/
│   ├── IOracle.sol                # 预言机接口
│   └── IOracleRegistrar.sol       # 市场注册接口
├── templates/
│   ├── OffchainMarketBase.sol     # 市场基础合约
│   ├── OffchainBinaryMarket.sol   # 二元市场模板
│   └── OffchainMultiMarket8.sol   # 多元市场模板
├── tokens/
│   └── OutcomeToken1155.sol       # ERC-1155 结果代币
├── oracles/
│   └── UMAOracleAdapterV2.sol     # UMA 预言机适配器
└── governance/
    └── ForesightTimelock.sol      # 治理时间锁
```

### MarketFactory

市场工厂负责创建和管理所有预测市场实例。

```solidity
// 核心函数
function createMarket(
    bytes32 templateId,          // 模板ID（binary/multi8）
    address oracle,              // 预言机地址
    address collateral,          // 抵押代币（USDC）
    uint256 resolutionTime,      // 结算时间
    uint256 feeBps,              // 手续费（基点）
    bytes calldata initData      // 初始化数据
) external returns (address market);

// 角色
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

// 事件
event MarketCreated(
    bytes32 indexed templateId,
    address indexed market,
    address indexed creator,
    uint256 resolutionTime
);
```

**使用示例**:

```typescript
import { ethers } from "ethers";

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

// 创建二元市场
const initData = ethers.AbiCoder.defaultAbiCoder().encode(
  ["uint8", "string"],
  [2, "Will BTC reach $100k by 2025?"]
);

const tx = await factory["createMarket(bytes32,address,address,uint256,uint256,bytes)"](
  ethers.id("OffchainBinaryMarket"),  // templateId
  UMA_ORACLE_ADDRESS,                  // oracle
  USDC_ADDRESS,                        // collateral
  Math.floor(Date.now() / 1000) + 86400 * 30,  // 30天后结算
  0,                                   // 零手续费
  initData
);

const receipt = await tx.wait();
const marketAddress = receipt.logs[0].args.market;
```

### 市场模板

#### OffchainMarketBase

所有市场模板的基础合约，定义了核心交易逻辑。

**关键常量**:

```solidity
uint256 public constant SHARE_SCALE = 1e18;           // 份额精度
uint256 public constant USDC_SCALE = 1e6;             // USDC 精度
uint256 public constant SHARE_GRANULARITY = 1e12;     // 最小份额单位
uint256 public constant MAX_PRICE_6_PER_1E18 = 1e6;   // 最大价格（1 USDC）

// 安全限制
uint256 public constant MAX_VOLUME_PER_BLOCK = 1e12 * 1e18;  // 单区块限额
uint256 public constant MAX_BATCH_SIZE = 50;                  // 批量操作限制
uint256 public constant MIN_ORDER_LIFETIME = 5;               // 最小订单生命周期
```

**核心函数**:

```solidity
// 铸造完整份额集（需先 approve USDC）
function mintCompleteSet(uint256 amount18) external;

// 批量成交（由 Relayer 调用）
function batchFill(FillRequest[] calldata fills) external;

// 单笔签名订单成交
function fillOrderSigned(
    Order calldata order,
    bytes calldata signature,
    uint256 fillAmount
) external;

// 取消订单
function cancelSaltsBatch(bytes32[] calldata salts) external;

// 赎回已结算份额
function redeem(uint8 outcomeIndex, uint256 amount18) external;

// 无效市场赎回（无手续费）
function redeemCompleteSetOnInvalid(uint256 amount18) external;
```

**订单结构**:

```solidity
struct Order {
    address maker;           // 挂单者
    uint8 outcomeIndex;      // 结果索引
    bool isBuy;              // true=买入，false=卖出
    uint256 amount18;        // 份额数量（1e18 精度）
    uint256 price6Per1e18;   // 价格（USDC/1e18份额）
    uint256 expiry;          // 过期时间戳
    bytes32 salt;            // 唯一标识符
}
```

#### OffchainBinaryMarket

二元市场（YES/NO）的具体实现。

```solidity
function initialize(
    address factory_,
    address oracle_,
    address collateral_,
    address outcomeToken_,
    bytes32 marketId_,
    uint64 resolutionTime_,
    uint16 feeBps_,
    uint8 outcomeCount_,      // 必须为 2
    string calldata question_
) external initializer;
```

#### OffchainMultiMarket8

多元市场（2-8选项）的具体实现。

```solidity
function initialize(
    address factory_,
    address oracle_,
    address collateral_,
    address outcomeToken_,
    bytes32 marketId_,
    uint64 resolutionTime_,
    uint16 feeBps_,
    uint8 outcomeCount_,      // 2-8
    string calldata question_
) external initializer;
```

### 代币系统

#### OutcomeToken1155

ERC-1155 多代币标准，每个市场的每个结果对应一个 tokenId。

```solidity
// tokenId 计算方式
function computeTokenId(
    address market,
    uint8 outcomeIndex
) public pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(market, outcomeIndex)));
}

// 角色
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

// 核心函数
function mint(address to, uint256 tokenId, uint256 amount) external;
function burn(address from, uint256 tokenId, uint256 amount) external;
```

### 预言机系统

#### UMAOracleAdapterV2

与 UMA Optimistic Oracle V3 的集成适配器。

```solidity
// 市场状态
enum Status { NONE, ASSERTED, RESOLVED, INVALID }

// 注册市场（由 MarketFactory 调用）
function registerMarket(
    bytes32 marketId,
    uint64 resolutionTime,
    uint8 outcomeCount
) external;

// 请求结果断言（由 Reporter 调用）
function requestOutcome(
    bytes32 marketId,
    uint8 outcomeIndex,
    string calldata claim
) external;

// 结算（任何人可调用）
function settleOutcome(bytes32 marketId) external;

// 重置无效市场以重新断言
function resetMarketForReassert(bytes32 marketId) external;

// UMA 回调
function assertionResolvedCallback(
    bytes32 assertionId,
    bool assertedTruthfully
) external;
```

**结算流程**:

```
1. Reporter 调用 requestOutcome(marketId, outcomeIndex, "Resolved outcomeIndex = 0")
   ├── 验证 resolutionTime 已过
   ├── 向 UMA OO V3 提交断言
   └── 状态变为 ASSERTED

2. UMA Liveness Period (默认 2 小时)
   ├── 任何人可以质疑断言（需要保证金）
   └── 如果被质疑，进入 UMA 争议仲裁流程

3. Liveness 结束后
   ├── 调用 settleOutcome(marketId)
   ├── UMA 回调 assertionResolvedCallback
   └── 状态变为 RESOLVED 或 INVALID

4. 用户赎回
   ├── RESOLVED: 调用 redeem(winningOutcome, amount)
   └── INVALID: 调用 redeemCompleteSetOnInvalid(amount)
```

### 治理系统

#### ForesightTimelock

基于 OpenZeppelin TimelockController，实现延迟执行的治理机制。

```solidity
constructor(
    uint256 minDelay_,        // 最小延迟（如 24 小时 = 86400）
    address[] memory proposers_,  // 提案者（Gnosis Safe）
    address[] memory executors_,  // 执行者（address(0) = 任何人）
    address admin_            // 管理员（部署后撤销）
) TimelockController(minDelay_, proposers_, executors_, admin_);
```

**治理流程**:

```
1. Gnosis Safe 创建提案
   └── 收集 3/5 多签签名

2. 提交到 Timelock
   └── schedule(target, value, data, predecessor, salt, delay)

3. 等待延迟期（24小时）
   └── 社区审查窗口

4. 执行
   └── execute(target, value, data, predecessor, salt)
```

---

## 链下订单簿

### 订单生命周期

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   创建订单   │────▶│   签名订单   │────▶│   提交订单   │────▶│   存入DB    │
│  (前端)     │     │  (钱包)     │     │  (Relayer)  │     │  (Supabase) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                    │
                                                                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   更新余额   │◀────│   链上结算   │◀────│   批量成交   │◀────│   订单匹配   │
│  (前端)     │     │  (合约)     │     │  (Relayer)  │     │  (撮合引擎)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### EIP-712 签名

订单使用 EIP-712 结构化签名，确保安全性和可读性。

**Domain 定义**:

```typescript
const domain = {
  name: "Foresight",
  version: "1",
  chainId: 80002,
  verifyingContract: marketAddress,
};
```

**Order 类型**:

```typescript
const types = {
  Order: [
    { name: "maker", type: "address" },
    { name: "outcomeIndex", type: "uint8" },
    { name: "isBuy", type: "bool" },
    { name: "amount18", type: "uint256" },
    { name: "price6Per1e18", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "salt", type: "bytes32" },
  ],
};
```

**签名示例**:

```typescript
import { ethers } from "ethers";

async function signOrder(signer, order, marketAddress) {
  const domain = {
    name: "Foresight",
    version: "1",
    chainId: await signer.provider.getNetwork().then(n => n.chainId),
    verifyingContract: marketAddress,
  };

  const types = {
    Order: [
      { name: "maker", type: "address" },
      { name: "outcomeIndex", type: "uint8" },
      { name: "isBuy", type: "bool" },
      { name: "amount18", type: "uint256" },
      { name: "price6Per1e18", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "salt", type: "bytes32" },
    ],
  };

  const signature = await signer.signTypedData(domain, types, order);
  return signature;
}
```

### Relayer 服务

Relayer 是链下订单簿的核心服务，负责：
- 接收和验证签名订单
- 维护订单簿状态
- 执行订单撮合
- 提交链上结算交易

**API 端点**:

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/order` | 提交新订单 |
| DELETE | `/order/:salt` | 取消订单 |
| GET | `/depth/:marketId` | 获取订单簿深度 |
| GET | `/orders/:marketId` | 获取市场订单列表 |
| POST | `/cancel-salt` | 签名取消订单 |

**订单提交**:

```typescript
// POST /order
{
  "market": "0x...",
  "order": {
    "maker": "0x...",
    "outcomeIndex": 0,
    "isBuy": true,
    "amount18": "1000000000000000000",  // 1 share
    "price6Per1e18": "500000",          // 0.5 USDC
    "expiry": 1735689600,
    "salt": "0x..."
  },
  "signature": "0x..."
}
```

**深度查询**:

```typescript
// GET /depth/:marketId
{
  "bids": [
    { "price": 500000, "amount": "10000000000000000000" },
    { "price": 490000, "amount": "5000000000000000000" }
  ],
  "asks": [
    { "price": 510000, "amount": "8000000000000000000" },
    { "price": 520000, "amount": "12000000000000000000" }
  ]
}
```

---

## 前端架构

### 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 15.5.4 |
| UI | React | 19 |
| 语言 | TypeScript | 5.0 |
| 样式 | Tailwind CSS | 3.4 |
| 动画 | Framer Motion | 11 |
| 状态 | React Query | 5 |
| Web3 | ethers.js | 6 |
| 国际化 | next-intl | 3 |
| 监控 | Sentry | 8 |

### 目录结构

```
apps/web/src/
├── app/                          # App Router 页面
│   ├── api/                      # API 路由
│   │   ├── predictions/          # 预测市场 API
│   │   ├── orderbook/            # 订单簿 API
│   │   └── user-profiles/        # 用户资料 API
│   ├── prediction/[id]/          # 预测详情页
│   ├── trending/                 # 热门列表页
│   ├── leaderboard/              # 排行榜页
│   └── proposals/                # 提案广场页
│
├── components/                   # React 组件
│   ├── ui/                       # 基础 UI 组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── LazyImage.tsx
│   │   └── VirtualList.tsx       # 虚拟列表
│   ├── market/                   # 市场相关组件
│   │   ├── MarketChart.tsx
│   │   ├── TradingPanel.tsx
│   │   └── OutcomeList.tsx
│   ├── skeletons/                # 骨架屏组件
│   └── LazyComponents.tsx        # 动态导入组件
│
├── contexts/                     # Context 状态管理
│   ├── AuthContext.tsx           # 认证状态
│   ├── WalletContext.tsx         # 钱包状态
│   └── UserProfileContext.tsx    # 用户资料
│
├── hooks/                        # 自定义 Hooks
│   ├── useInfiniteScroll.ts
│   ├── usePersistedState.ts
│   ├── usePrefetch.ts            # 数据预取
│   └── useAccessibility.ts
│
├── lib/                          # 工具库
│   ├── supabase.ts               # Supabase 客户端
│   ├── apiCache.ts               # API 缓存
│   ├── security.ts               # 安全工具
│   ├── rateLimit.ts              # 限流工具
│   └── toast.ts                  # Toast 通知
│
└── types/                        # TypeScript 类型
    ├── api.ts
    └── market.ts
```

### 核心组件

#### VirtualList

高性能虚拟列表，只渲染可见区域的项目。

```tsx
import { VirtualList } from "@/components/ui/VirtualList";

<VirtualList
  items={predictions}
  estimatedItemHeight={200}
  getKey={(item) => item.id}
  renderItem={(item, index) => (
    <PredictionCard prediction={item} />
  )}
  onLoadMore={loadMore}
  hasMore={hasNextPage}
  isLoadingMore={isLoading}
/>
```

#### TradingPanel

交易面板组件，支持限价单和市价单。

```tsx
import { TradingPanel } from "@/components/market/TradingPanel";

<TradingPanel
  market={market}
  outcomeIndex={0}
  userBalance={balance}
  onOrderSubmit={handleSubmit}
/>
```

#### LazyImage

图片懒加载组件，支持 IntersectionObserver。

```tsx
import LazyImage from "@/components/ui/LazyImage";

<LazyImage
  src="/image.jpg"
  alt="Description"
  className="w-full h-48 object-cover"
  rootMargin={100}    // 提前 100px 加载
  fadeIn={true}       // 渐入动画
/>
```

### 自定义 Hooks

#### usePrefetch

数据预取 Hook，用于悬停预加载。

```tsx
import { usePrefetch } from "@/hooks/usePrefetch";

function PredictionCard({ id }) {
  const { prefetchPrediction } = usePrefetch();
  
  return (
    <Card
      onMouseEnter={() => prefetchPrediction(id)}
      onClick={() => router.push(`/prediction/${id}`)}
    >
      ...
    </Card>
  );
}
```

#### usePersistedState

持久化状态 Hook，支持 localStorage/sessionStorage。

```tsx
import { usePersistedState } from "@/hooks/usePersistedState";

const [filters, setFilters] = usePersistedState("market-filters", {
  category: null,
  sortBy: "trending",
});
```

#### useInfiniteScroll

无限滚动 Hook。

```tsx
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const { loadMoreRef, isNearBottom } = useInfiniteScroll({
  loading: isLoading,
  hasNextPage,
  onLoadMore: fetchNextPage,
  threshold: 0.1,
});

return (
  <div>
    {items.map(item => <Card key={item.id} {...item} />)}
    <div ref={loadMoreRef} />
  </div>
);
```

### 状态管理

#### React Query

数据获取和缓存使用 React Query。

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";

// 查询
const { data, isLoading } = useQuery({
  queryKey: ["prediction", id],
  queryFn: () => fetch(`/api/predictions/${id}`).then(r => r.json()),
  staleTime: 2 * 60 * 1000,  // 2分钟
});

// 变更
const mutation = useMutation({
  mutationFn: (order) => submitOrder(order),
  onSuccess: () => {
    queryClient.invalidateQueries(["orders"]);
  },
});
```

#### Context

全局状态使用 React Context。

```tsx
// 钱包状态
const { address, isConnected, connect, disconnect } = useWallet();

// 认证状态
const { user, isAuthenticated, signIn, signOut } = useAuth();

// 用户资料
const { profile, updateProfile } = useUserProfile();
```

---

## API 参考

### 预测市场 API

#### GET /api/predictions

获取预测列表。

```typescript
// 请求
GET /api/predictions?category=crypto&status=active&page=1&pageSize=20

// 响应
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Will BTC reach $100k?",
      "category": "crypto",
      "status": "active",
      "resolutionTime": "2025-12-31T00:00:00Z",
      "stats": {
        "yesAmount": 10000,
        "noAmount": 5000,
        "totalAmount": 15000,
        "participantCount": 150,
        "yesProbability": 0.6667
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

#### GET /api/predictions/[id]

获取预测详情。

```typescript
// 请求
GET /api/predictions/1

// 响应
{
  "success": true,
  "data": {
    "id": "1",
    "title": "Will BTC reach $100k?",
    "description": "...",
    "outcomes": [
      { "index": 0, "name": "Yes", "tokenId": "0x..." },
      { "index": 1, "name": "No", "tokenId": "0x..." }
    ],
    "marketAddress": "0x...",
    "resolutionTime": "2025-12-31T00:00:00Z",
    "status": "active"
  }
}
```

### 订单簿 API

#### GET /api/orderbook/depth

获取订单簿深度。

```typescript
// 请求
GET /api/orderbook/depth?marketId=0x...&outcomeIndex=0

// 响应
{
  "success": true,
  "data": {
    "bids": [
      { "price": 0.50, "amount": 1000, "orders": 5 },
      { "price": 0.49, "amount": 500, "orders": 3 }
    ],
    "asks": [
      { "price": 0.51, "amount": 800, "orders": 4 },
      { "price": 0.52, "amount": 1200, "orders": 6 }
    ]
  }
}
```

#### POST /api/orderbook/market-plan

获取市价单执行计划。

```typescript
// 请求
POST /api/orderbook/market-plan
{
  "marketId": "0x...",
  "outcomeIndex": 0,
  "isBuy": true,
  "amount": "1000000000000000000"
}

// 响应
{
  "success": true,
  "data": {
    "fills": [
      { "orderId": "0x...", "amount": "500000000000000000", "price": 510000 },
      { "orderId": "0x...", "amount": "500000000000000000", "price": 520000 }
    ],
    "totalCost": 515000,
    "averagePrice": 515000
  }
}
```

---

## 数据库设计

### 核心表

```sql
-- 预测市场
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  market_address TEXT,
  resolution_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 市场结果选项
CREATE TABLE prediction_outcomes (
  id SERIAL PRIMARY KEY,
  prediction_id INTEGER REFERENCES predictions(id),
  outcome_index SMALLINT NOT NULL,
  name TEXT NOT NULL,
  token_id TEXT
);

-- 订单
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL,
  maker TEXT NOT NULL,
  outcome_index SMALLINT NOT NULL,
  is_buy BOOLEAN NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  salt TEXT UNIQUE NOT NULL,
  signature TEXT NOT NULL,
  expiry TIMESTAMPTZ NOT NULL,
  filled_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成交记录
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  maker TEXT NOT NULL,
  taker TEXT NOT NULL,
  outcome_index SMALLINT NOT NULL,
  is_buy BOOLEAN NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- K线数据
CREATE TABLE candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL,
  outcome_index SMALLINT NOT NULL,
  interval TEXT NOT NULL,  -- '1m', '5m', '1h', '1d'
  open_time TIMESTAMPTZ NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  UNIQUE(market_id, outcome_index, interval, open_time)
);

-- 用户资料
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 事件关注
CREATE TABLE event_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_id INTEGER REFERENCES predictions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);
```

### 索引

```sql
-- 订单查询优化
CREATE INDEX idx_orders_market_status ON orders(market_id, status);
CREATE INDEX idx_orders_maker ON orders(maker);
CREATE INDEX idx_orders_expiry ON orders(expiry) WHERE status = 'open';

-- 成交查询优化
CREATE INDEX idx_trades_market ON trades(market_id, created_at DESC);
CREATE INDEX idx_trades_maker ON trades(maker);
CREATE INDEX idx_trades_taker ON trades(taker);

-- K线查询优化
CREATE INDEX idx_candles_lookup ON candles(market_id, outcome_index, interval, open_time DESC);
```

---

## 部署指南

### 智能合约部署

```bash
# 1. 配置环境变量
export PRIVATE_KEY=your_deployer_private_key
export RPC_URL=https://rpc-amoy.polygon.technology
export USDC_ADDRESS=0x...
export UMA_OOV3_ADDRESS=0x...

# 2. 编译合约
npx hardhat compile

# 3. 部署
npx hardhat run scripts/deploy_offchain_sprint1.ts --network amoy

# 4. 验证合约
npx hardhat verify --network amoy DEPLOYED_ADDRESS
```

### 前端部署

```bash
# 1. 构建
cd apps/web
npm run build

# 2. 部署到 Vercel
vercel deploy --prod
```

### Relayer 部署

```bash
# 1. 构建
cd services/relayer
npm run build

# 2. 使用 PM2 运行
pm2 start dist/index.js --name foresight-relayer

# 3. 或使用 Docker
docker build -t foresight-relayer .
docker run -d -p 3001:3001 foresight-relayer
```

---

## 安全规范

### 智能合约安全

1. **重入保护**: 所有状态修改函数使用 `ReentrancyGuard`
2. **访问控制**: 使用 OpenZeppelin AccessControl
3. **闪电贷防护**: 单区块交易量限制
4. **签名安全**: ECDSA 可延展性检查
5. **熔断机制**: 紧急暂停功能

### 前端安全

1. **输入验证**: 使用 `validateAndSanitize` 清理用户输入
2. **XSS 防护**: 不直接渲染用户原始输入
3. **CSRF 防护**: API 使用签名验证
4. **限流**: 使用 `withRateLimit` 包装 API

```typescript
import { validateAndSanitize } from "@/lib/security";
import { withRateLimit, rateLimitPresets } from "@/lib/rateLimit";

// 输入验证
const result = validateAndSanitize(userInput, {
  type: "text",
  required: true,
  maxLength: 200,
});

// API 限流
export const POST = withRateLimit(handler, rateLimitPresets.strict);
```

---

## 测试指南

### 合约测试

```bash
# 运行所有测试
npm run hardhat:test

# 运行特定测试
npx hardhat test test/OffchainMarket.test.ts

# 覆盖率报告
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

**测试示例**:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("TradingPanel", () => {
  it("should display order form", () => {
    render(<TradingPanel market={mockMarket} />);
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText("Sell")).toBeInTheDocument();
  });
});
```

---

## 性能优化

### 已实现的优化

1. **数据库查询并行化**: 使用 `Promise.all` 并行执行多个查询
2. **内存缓存**: API 响应内存缓存 + HTTP 缓存头
3. **虚拟列表**: 大列表只渲染可见项
4. **代码分割**: 大型库独立打包
5. **数据预取**: 悬停时预加载数据

### 性能指标

| 指标 | 目标 | 当前 |
|------|------|------|
| LCP | < 2.5s | ~2.0s |
| INP | < 200ms | ~150ms |
| CLS | < 0.1 | ~0.05 |
| Bundle Size | < 500KB | ~450KB |

### 监控

```typescript
// Web Vitals 自动收集
import { WebVitalsReporter } from "@/components/WebVitalsReporter";

// 在 layout.tsx 中使用
<WebVitalsReporter />

// 查看数据
GET /api/admin/performance
```

---

## 更多资源

- [Next.js 文档](https://nextjs.org/docs)
- [React Query 文档](https://tanstack.com/query/latest)
- [OpenZeppelin 合约](https://docs.openzeppelin.com/contracts)
- [UMA 协议](https://docs.uma.xyz)
- [EIP-712 规范](https://eips.ethereum.org/EIPS/eip-712)

---

**最后更新**: 2024-12-27  
**文档版本**: v2.0
