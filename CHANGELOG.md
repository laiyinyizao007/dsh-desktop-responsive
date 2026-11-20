# 变更日志（Changelog）

所有重要变更均记录于此文件。

本文件格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
并遵循 [语义化版本号](https://semver.org/lang/zh-CN/) 规范。

## [Unreleased]

## [0.2.0] - 2026-11-20

首个发布版本。仓库此前从未发布到 npm 或任何 DSH 插件目录。

### Added（新增）

- 手机宽度布局：侧栏展开态变为浮层抽屉（图标轨保留），设置对话框变为全屏标签页，输入区跟随键盘并保留与表头等高的余量，会话气泡铺满屏幕并放大一级字号。
- 表头标签折进一个箭头菜单，会话工具折进同一个菜单；用量行折进模型选择器并以抽屉形式展开；表格横向滚动并在边缘显示阴影；底部工作台与项目控制台占满整屏。
- `data-dsh-region` 标记契约，以及 `patches/` 下三个上游补丁（设置对话框、会话表头），补丁只加属性、不改上游渲染结构。
- 漂移自检：锚点缺失或上游布局规则变化时写入带 `data-dshr-*` 标记的诊断，而不是静默失效。
- 卸载时还原 React 自己的网格值，插件不在宿主里留残留样式。
- 行为测试（vitest + jsdom）：83 通过 / 4 跳过。测试直接加载插件进 DOM，断言它对布局做了什么，而不是断言源码长什么样。
- 仓库知识库：`PROJECTWIKI.md`（含 Mermaid 架构图、模块表、API 手册、排障速查）、`docs/adr/` 下三份 ADR（不按哈希类名定位、卸载写回 React 原值、官方包用 peer 声明）、`.claude/memory/` 下四份记忆文件（`context.md` / `lessons-learned.md` / `error-knowledge.md` / `tool-patterns.md`）。

### Changed（变更）

- `package.json` 声明 `@deepseek-ai/dsh-client-locale` 为 peer 依赖。插件注入该包并调用 `ctx.locale.register()`，此前未声明。范围写作 `>=0.2.1-rc.1 <0.2.2 || >=0.2.2-alpha.1 <0.3.0-0`：node-semver 只有当范围内某个比较符与版本自身的 `major.minor.patch` 元组一致且同样带预发布标签时，才放行预发布版本，写成 `>=0.2.1-rc.1 <0.3.0` 会静默排除所有 `0.2.2-rc.*` 构建。范围按元组分段，第二段下界取 `alpha` 而非 `rc`——`alpha` 在同一元组上排在 `rc` 之前，一个比较符即可同时放行 `0.2.2-alpha.*` 与 `0.2.2-rc.*`。
- `package.json` 增加 `publishConfig.registry` 指向 `https://registry.npmjs.org`，避免在配置了镜像源的机器上把包发到镜像。
- README 的安装说明改为真实可用的 `dsh plugin --profile web add` 命令（此前指向一个尚未发布的 npm 包），并说明 peer 范围为什么带预发布分支。

<!-- 比对链接 -->
[Unreleased]: https://github.com/laiyinyizao007/dsh-desktop-responsive/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/laiyinyizao007/dsh-desktop-responsive/releases/tag/v0.2.0
