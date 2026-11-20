# lessons-learned.md — dsh-desktop-responsive

> 中频记忆。经验沉淀在这里，不在对话里。

## 1. 关键实现路径

插件的骨架是一条固定的链，任何新适配都照着走：

```
ANCHORS 表 → sync*() 系列 → <style> 元素 → 卸载清理
```

- `ANCHORS`（`client.js:232` 起）是唯一的定位入口。每个锚点写清 `origin`（`marker` / `attribute` / `class`）、`package`（元素属于哪个宿主包）、`required` / `optional`。
- `sync*()` 一族在 `install()` 内部，每个负责一个表面。
- 样式统一在一个 `<style>` 元素里，键名 `dsh-desktop-responsive`。
- `install()` 返回的清理函数负责全部还原，卸载时调用。

加一条适配 = 加一个锚点 + 加一个 `sync*()` + 加一条行为测试 + 更新 `PROJECTWIKI.md` 与 `CHANGELOG.md`。

## 2. 用户偏好

- 回答用简体中文，文件 UTF-8 无 BOM。
- 真实姓名、电话、邮箱、账号不进版本库（连测试数据也不行），要用的走环境变量。
- 先找真实错误再下结论：多个"原因"猜错过，先取证再写修复方案。

## 3. 项目特定模式

- **宿主契约优先于实现细节。** 能加标记就不改结构；能不按类名就不按类名。补丁只加 `data-dsh-region` 属性，不动上游渲染树。
- **没有补丁也能跑。** 插件在运行时自行给能推断出来的元素补标记，所以"打了补丁的宿主"和"没打补丁的宿主"表现一致；补丁额外带来的只有设置对话框和会话表头。
- **诊断用属性而不是日志。** 诊断状态挂在 `documentElement` 的 `data-dshr-*` 属性上，页面上一眼能看见，日志只是补充。
- **先找真实错误再下结论**在这条链上体现为：`verifyLayout()` 核对网格轨道数与内容溢出，`auditAdaptations()` 核对对第三方插件的适配是否还在生效。

## 4. 已知挑战

- **上游预发布版本号变化快。** Harness 以 `0.2.x-rc.y` 形式发布，`@deepseek-ai/dsh-client-locale` 的 `latest` 标签还停在 `0.0.1-rc.1`。peer 范围必须带显式 `||` 预发布分支，否则会静默排除掉下一批构建。
- **上游类名是哈希。** 任何"顺手用一下类名"的想法都要挡住——`test/responsive-layout-contract.test.mjs` 有一条守卫会因此让构建失败。
- **可选表面属于别人的插件。** 项目控制台 `.pc-root`、工作台表头 `.dshWbMarketHeaderText` 都不是自己的实现，对方改名即失效；一律标 `optional`，失效只记诊断，不牵连其它适配。
- **上游补丁绑定具体版本。** 补丁文件是给 `0.2.1-rc.3` 的，上游升版要重新生成（流程见 `docs/UPSTREAM.md`）。

## 8. 新陷阱

- **`npm install` 在 `NODE_ENV=production` 的机器上会跳过 devDependencies**，测试运行器正是其中之一。装依赖要 `--include=dev`。
- **npm 包的 `latest` 标签可能很旧。** `@deepseek-ai/dsh-client-locale` 的 `latest` 是 `0.0.1-rc.1`，而实际在用的是 `0.2.x-rc.y`；判断兼容性要看 `next` 标签和实际版本，不要看 `latest`。
- **DSH 的 `dsh plugin` 只是把参数转发给 profile 目录里的 pnpm**，它自己不懂插件语义。安装行为由 profile 的 `pnpm-workspace.yaml`（`autoInstallPeers`、`nodeLinker`）决定。
- **DSH 安装器对插件安装有 90 秒硬上限**，超时后退出码被当成 1 且不打印任何错误。小插件不会碰到，大依赖会。
