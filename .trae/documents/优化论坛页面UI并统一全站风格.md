## 设计目标与约束
- 统一论坛页面与全站的视觉语言（色彩、间距、圆角、阴影、动效）。
- 引入可复用的色彩与组件变体，提升一致性与扩展性。
- 满足 WCAG 2.1 AA 对比度要求，确保无障碍。
- 保持信息架构与功能布局不变，仅进行视觉升级。

## 视觉审计结论
- 颜色与渐变：现有论坛使用多种临时渐变（紫/粉、蓝/青、绿），与首页和 Trending 页的品牌紫粉主色调不完全一致。
- 按钮与反馈：按钮状态（hover/active/focus/disabled）和焦点环不统一；投票按钮的颜色反馈不够明确。
- 字体与间距：字号与行高在不同模块有差异；间距未严格遵循统一阶梯。
- 卡片与阴影：圆角大小不一致（rounded-xl/2xl混用），阴影强度不统一。

## 色彩系统（基于参考四色并与品牌统一）
- 品牌主色：`brand` 紫（#6B21A8）→ 渐变至粉（#DB2777）；强调色 `accent` 粉（#F472B6）。
- 四种方案（对应参考图）用于组件背景/按钮变体：
  - Mint（绿）：从 #D1FAE5 → #A7F3D0，文本 #065F46。
  - Azure（蓝）：从 #BFDBFE → #93C5FD，文本 #1E3A8A。
  - Lilac（紫）：从 #E9D5FF → #FBCFE8，文本 #6B21A8。
  - Peach（橙粉）：从 #FED7AA → #FECACA，文本 #9A3412 或 #B91C1C。
- 中性色板：灰阶用于文本/分隔（如 #111827、#374151、#6B7280、#9CA3AF、#E5E7EB、#F3F4F6）。
- 无障碍：所有文本与背景对比度≥4.5:1；大号加粗文本≥3:1。

## 按钮系统（变体与状态）
- 统一按钮变体：`primary`（品牌紫粉）、`secondary`（蓝）、`success`（绿）、`warning`（橙）、`danger`（红），`ghost`、`subtle`。
- 统一状态：默认/hover/active/disabled；焦点环 `ring-2 ring-offset-2 ring-brand/70`。
- 图标与文案对齐：`inline-flex items-center gap-2`；支持尺寸 `sm/md/lg`。
- 功能映射：发帖=primary、回复=secondary、收藏=subtle、点赞=success、点踩=danger。

## 字体与排版系统
- 字体阶梯：`xs` 12 / `sm` 14 / `base` 16 / `lg` 18 / `xl` 20 / `2xl` 24 / `3xl` 30。
- 行高：正文 `leading-6`，标题 `leading-tight`；段落间距 `space-y-3`。
- 标题/描述统一字重：标题 `font-bold`，次级 `font-semibold`，正文 `font-normal`。

## 间距与布局系统
- 8px 基准网格：`2`、`3`、`4`、`6`、`8` 为常用步长。
- 卡片内边距：`p-4 md:p-6`；模块垂直间距：`py-6 md:py-8`；列表 `space-y-3`。
- 圆角统一：卡片/输入/按钮使用 `rounded-2xl`；小元素 `rounded-xl`。

## 交互元素统一
- 卡片：`rounded-2xl bg-white/80 border border-gray-200 shadow-sm`，强调卡片增加渐变边框/阴影。
- 输入框：`focus:ring-brand focus:border-brand`，禁用态统一 `opacity-50`。
- 投票区：上/下票采用绿/红色按钮，显示即时反馈（数值跃迁+轻微缩放），无障碍文本对比达标。
- 动效：`framer-motion` 统一过渡 `duration-0.2–0.3`、`ease-out`，列表入场淡入+位移 12px。

## 技术实现步骤
1. 扩展全局主题与设计令牌：在 `apps/web/src/app/globals.css` 的 `@theme inline` 中添加颜色变量（brand、mint、azure、lilac、peach）、阴影、圆角、间距令牌；新增渐变工具类（如 `bg-gradient-mint`/`-azure`/`-lilac`/`-peach`）。
2. 新建通用按钮组件：`components/ui/Button.tsx`，支持 `variant`、`size`、`icon`、`fullWidth`；内部用 Tailwind 类映射到上面的令牌与渐变。
3. 论坛页面重构：
   - 将发帖/回复/收藏/投票按钮替换为 Button 组件变体。
   - 频道和分类 chip 使用四种渐变方案，统一边框与文本颜色。
   - 输入框应用统一焦点环与圆角；卡片统一阴影和间距。
   - 调整投票反馈：点赞→绿，点踩→红；添加 `aria-live` 提示。
4. 视觉层次优化：
   - 主题列表：标题、作者信息、时间采用明确的层级颜色与字号，提升可读性。
   - 信息引导：在页面顶部添加次级说明条（品牌浅色），引导发帖路径。
5. 无障碍与质量检查：
   - 对比度自检（示例组合：`#6B21A8`/白、`#0F766E`/白、`#1E3A8A`/白、`#9A3412`/浅桃背景）。
   - 键盘导航：按钮与输入均有可见焦点环；投票按钮具备语义标签。
   - Lighthouse/Labs 检测并修正低对比处。

## 文件改动清单
- `apps/web/src/app/globals.css`：新增主题令牌、渐变工具类。
- `apps/web/src/components/ui/Button.tsx`：通用按钮组件（无第三方库）。
- `apps/web/src/components/ForumSection.tsx`：替换按钮与输入类；统一卡片样式与投票反馈。
- `apps/web/src/app/forum/page.tsx`：频道与分类 chip 改用标准渐变方案；统一阴影、圆角与间距。

## 验收标准
- 按钮颜色系统在所有状态下满足 AA 对比度；focus 可见。
- 论坛页面与首页/Trending 的品牌紫粉风格一致，且四种色系渐变与参考图协调。
- 卡片、输入、chip 的圆角/阴影/间距统一；动效一致。
- 用户操作路径清晰：发帖→回复→投票；反馈明显。

## 回滚与兼容
- 保留原样式类以便快速回滚；Button 组件支持 `className` 透传以兼容现有调用。
- 不引入新的库；完全基于 Tailwind 与现有 `framer-motion`。

请确认以上方案；确认后我将按此步骤实施并提交修改。