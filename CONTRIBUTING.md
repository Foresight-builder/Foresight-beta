# 🤝 贡献指南

感谢你对 Foresight 的关注！我们欢迎各种形式的贡献，包括但不限于：

- 🐛 Bug 报告和修复
- ✨ 新功能建议和实现
- 📚 文档改进
- 🧪 测试用例补充
- 🌍 国际化翻译

---

## 📋 目录

- [行为准则](#行为准则)
- [开发环境设置](#开发环境设置)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码风格](#代码风格)
- [测试指南](#测试指南)
- [问题反馈](#问题反馈)

---

## 行为准则

参与本项目即表示你同意遵守我们的 [行为准则](./CODE_OF_CONDUCT.md)。请确保在所有交流中保持尊重和专业。

---

## 开发环境设置

### 环境要求

- Node.js 18+
- npm（推荐）
- Git
- Docker (可选，用于本地服务)

### 本地开发

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/Foresight-beta.git
cd Foresight-beta

# 2. 安装依赖
npm install

# 3. 复制环境变量配置
cp .env.example .env.local

# 4. 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 项目结构

```
Foresight-beta/
├── apps/web/           # Next.js 前端应用
├── packages/contracts/ # Solidity 智能合约
├── services/relayer/   # 链下订单簿服务
├── infra/supabase/     # 数据库脚本
└── scripts/            # 部署脚本
```

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 类型 (type)

| 类型       | 描述                   |
| ---------- | ---------------------- |
| `feat`     | 新功能                 |
| `fix`      | Bug 修复               |
| `docs`     | 文档更新               |
| `style`    | 代码格式（不影响功能） |
| `refactor` | 代码重构               |
| `perf`     | 性能优化               |
| `test`     | 测试相关               |
| `chore`    | 构建/工具链更新        |
| `ci`       | CI/CD 配置             |

### 示例

```bash
# 功能
feat(market): add multi-outcome market support

# 修复
fix(trading): resolve order matching edge case

# 文档
docs(readme): update installation instructions

# 重构
refactor(api): simplify order validation logic
```

### 范围 (scope)

常用的 scope：

- `web` - 前端应用
- `contracts` - 智能合约
- `relayer` - 订单簿服务
- `api` - API 相关
- `market` - 市场功能
- `trading` - 交易功能
- `auth` - 认证相关
- `i18n` - 国际化

---

## Pull Request 流程

### 1. 创建分支

```bash
# 从 main 创建功能分支
git checkout -b feature/amazing-feature

# 或修复分支
git checkout -b fix/bug-description
```

### 分支命名规范

- `feature/xxx` - 新功能
- `fix/xxx` - Bug 修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 代码重构
- `test/xxx` - 测试相关

### 2. 开发与测试

```bash
# Web 子仓测试
npm run test:web

# Lint
npm run lint -w apps/web

# 类型检查
npm run typecheck -w apps/web

# 全部检查
npm run check:all
```

#### 提交前本地自检

- 确保 3 项均通过：Lint、Typecheck、Tests
- 文档更新场景下，保证链接引用有效（README/DOCS/SECURITY/Relayer 文档中的代码引用）
- 避免新增不必要的文档文件；优先编辑现有文件

### 3. 提交变更

```bash
git add .
git commit -m "feat(market): add amazing feature"
git push origin feature/amazing-feature
```

### 4. 创建 Pull Request

1. 前往 GitHub 创建 Pull Request
2. 填写 PR 模板，说明变更内容
3. 关联相关 Issue（如有）
4. 请求代码审查

### PR 检查清单

- [ ] 代码遵循项目编码规范
- [ ] 所有测试通过
- [ ] 已添加必要的测试用例
- [ ] 已更新相关文档
- [ ] Commit 信息遵循规范
- [ ] 无 lint 错误

---

## 代码风格

### TypeScript/JavaScript

- 使用 Prettier 格式化代码
- 遵循 ESLint 规则
- 优先使用函数式编程风格
- 使用 TypeScript 严格模式

```bash
# 格式化代码
npm run format

# 检查格式
npm run format:check
```

### 命名规范

```typescript
// 组件：PascalCase
export function MarketCard() {}

// 函数：camelCase
function calculatePrice() {}

// 常量：UPPER_SNAKE_CASE
const MAX_BATCH_SIZE = 50;

// 类型/接口：PascalCase
interface MarketOrder {}
type OrderStatus = "open" | "filled";
```

### React 组件规范

```tsx
// ✅ 推荐
export function MarketCard({ market, onSelect }: MarketCardProps) {
  return <div onClick={() => onSelect(market.id)}>{market.title}</div>;
}

// ❌ 避免
export default function (props) {
  return <div>{props.market.title}</div>;
}
```

### Solidity

- 遵循 [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- 使用 NatSpec 注释
- 合约命名使用 PascalCase
- 函数命名使用 camelCase

---

## 测试指南

### 前端测试

```bash
cd apps/web

# 运行测试
npm run test:run

# 监听模式
npm run test:ui

# 覆盖率报告
npm run test:coverage
```

### 合约测试

```bash
# 运行合约测试
npm run hardhat:test

# 覆盖率报告
npx hardhat coverage
```

### Relayer 测试

```bash
cd services/relayer

# 运行测试
npm test

# 覆盖率
npm run test:coverage
```

### 编写测试

```typescript
import { describe, it, expect } from "vitest";

describe("MarketUtils", () => {
  it("should calculate price correctly", () => {
    const price = calculatePrice(100, 200);
    expect(price).toBe(0.333);
  });

  it("should throw on invalid input", () => {
    expect(() => calculatePrice(-1, 100)).toThrow();
  });
});
```

---

## 问题反馈

### 报告 Bug

使用 [Bug Report](https://github.com/Foresight-builder/Foresight-beta/issues/new?template=bug_report.md) 模板：

1. **描述问题**：清晰描述遇到的问题
2. **复现步骤**：详细列出复现步骤
3. **期望行为**：描述期望的正确行为
4. **环境信息**：浏览器、Node 版本等

### 功能建议

使用 [Feature Request](https://github.com/Foresight-builder/Foresight-beta/issues/new?template=feature_request.md) 模板：

1. **问题描述**：描述要解决的问题
2. **建议方案**：你的解决方案建议
3. **替代方案**：是否考虑过其他方案
4. **附加信息**：截图、参考链接等

---

## 联系我们

- 📧 Email: [hello@foresight.market](mailto:hello@foresight.market)
- 💬 Discord: [Foresight Community](https://discord.gg/foresight)
- 🐦 Twitter: [@ForesightMarket](https://twitter.com/ForesightMarket)

---

## 致谢

感谢所有为 Foresight 做出贡献的开发者！🎉

<a href="https://github.com/Foresight-builder/Foresight-beta/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Foresight-builder/Foresight-beta" />
</a>
