## 概述与目标
- 生成“论坛 / 事件提案”页面，融合 Reddit 帖子流与 Discord 频道导航，继承站点既有主题与样式
- 用点赞作为唯一热度指标；官方手动进行标题标准化与结算源确认
- 游客可浏览；登录用户可发帖/提案/点赞/评论；不做实时推送
- 同步移除旧的 `creating` 页面与其入口，避免用户误入

## 技术栈与约束
- Next.js App Router（apps/web/src/app）
- Tailwind CSS v4 + PostCSS，复用 `globals.css` 的主题变量/令牌
- React Context：Auth/Wallet；论坛数据使用本地存储模块（`localForumStore.ts`）
- TypeScript；不新增第三方 UI/状态库

## 路由与信息架构
- 新增：`/forum`（频道页，默认“事件提案”）
- 详情：`/forum/proposal/[id]`（楼中楼评论）
- 左侧：频道（全站聊天/事件提案/公告）+ 分类（热门/加密/体育/政治等）+ 创建入口
- 中间：吸顶 `PostComposer` + 信息流 `ProposalFeed`
- 右侧：热门提案、公告、筛选（状态/分类）、搜索框、最近已采纳

## 组件拆分
- `ChannelSidebar`：频道与分类列表，含创建入口
- `PostComposer`：发帖/提案（Tab），标题/描述（Markdown 子集）/结算源链接/标签
- `ProposalCard`：作者信息、标题、标签、摘要、点赞数、评论数、状态徽章，操作：点赞/评论/收藏
- `ProposalFeed`：列表与排序（热度/最新/近7天）+ 分页/无限滚动
- `ProposalDetail`：详情与两级楼中楼评论，@提及、引用回复、表情、代码片段、超两级折叠
- `RightSidebar`：热门、公告、筛选、搜索、最近采纳
- 复用：`TopNavBar`、`LoginModal`、`WalletModal`；参考 `ForumSection`、`ChatPanel` 的交互与样式

## 数据模型与状态
- Proposal：`id, title, description, settlementSourceUrl, tags[], status, likeCount, commentCount, author{name, avatar}, createdAt`
- Comment：`id, proposalId, content, author{name, avatar}, createdAt, parentId`
- 状态：草稿/审核中/已采纳/已拒绝/待补充结算源（仅展示）
- 排序：`likeCount`、`createdAt`、近7天过滤
- 持久化：复用 `localForumStore`；权限由 `AuthContext` 控制；钱包交互由 `WalletContext` 提供

## 交互与筛选
- 点赞：仅帖子；无点踩
- 快捷键：`Ctrl+Enter` 发布，`Esc` 关闭
- 筛选：状态与分类；搜索标题/正文关键字
- 评论：两级楼中楼，@提及、引用回复、表情、代码片段；超两级自动折叠

## 样式与主题
- 继承 `globals.css` 的主题变量（如 `--background`、`--foreground`、`--font-sans`）与 `@theme inline`
- 滚动条样式复用 `.scrollbar-hide`/`.scrollbar-beauty`
- 轻量动效：悬停、焦点、点赞反馈

## 可访问性与响应式
- 语义标签与对比度达标；键盘可访问
- 桌面三栏；移动端频道 Tab + 主信息流；右侧内容下沉至主栏顶部模块

## 移除 creating 页面
- 删除路由文件：`apps/web/src/app/creating/page.tsx`
- 移除导航与入口：从 `TopNavBar` 或其他页面中删除/替换“创建”相关链接与按钮，改为跳转 `/forum` 的“发起事件提案”入口
- 处理历史链接：对旧路径 `/creating` 配置到 `/forum` 的临时重定向（若需要保留容错）
- 自检：全仓检索并清理对 `/creating` 的引用，确保不出现 404 与死链

## MVP实施步骤
1. 新增 `/forum`、`/forum/proposal/[id]` 路由骨架与三栏栅格
2. 实现 `ChannelSidebar` 与 `RightSidebar`（热门/公告/筛选/搜索/最近采纳）
3. 实现吸顶 `PostComposer`（双模式、校验、Markdown 子集与快捷键）
4. 实现 `ProposalCard` 与 `ProposalFeed`（排序/分页或无限滚动、点赞/评论计数）
5. 实现 `ProposalDetail`（两级楼中楼、@提及、引用回复、表情、代码片段、折叠逻辑）
6. 接入 `localForumStore`，结合 `AuthContext`/`WalletContext` 做权限与用户信息
7. 补齐空态/加载骨架/错误态与重试；完善主题与动效
8. 移除 `creating` 路由与入口，必要时加重定向；进行全仓引用清理

## 验收标准
- `/forum` 与 `/forum/proposal/[id]` 正常渲染；主题样式一致
- 发帖/提案/点赞/评论功能可用；排序/筛选/搜索准确
- 状态徽章与说明文案就位；空态、加载与错误态完备
- `creating` 页面与入口彻底移除；旧链接跳转策略生效（如配置）
- 无控制台报错；Lighthouse 基础可访问性评分 ≥ 80