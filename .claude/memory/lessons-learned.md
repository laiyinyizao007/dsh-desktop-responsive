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
- **自己能推断的只有三处。** `markLayout()` 只给 frame、侧栏列、中心列补标记。会话表头、标题行、工作区行、视图标签、输入区底栏、已发消息栈、设置对话框都推断不出来——"打了补丁的宿主"和"没打补丁的宿主"表现**不一致**，差的正是这些表面；插件只对设置对话框那组有诊断，其余静默失效。
- **卸载要还原的是"插件写在别人元素上的每一样东西"，不是"插件造出来的元素"。** 后者整体 `.remove()` 就够了；前者要逐项还原成宿主原本的值——宿主本来就有的 `tabindex`、`aria-label`、`role` 被抹掉同样是破坏。所以写宿主自有元素一律走 `setOwned` / `setOwnedStyle` 登记，卸载时 `releaseOwnedAll()` 还原；插件中途自己撤销的走 `releaseOwned`，还原并销账。还原前要核对"现在还是不是我写的"——宿主在插件装着期间自己改过的值不是插件该撤销的；布尔属性（`inert`）认不出来，所以要写上插件自己的值（`dshr`）。登记表本身也会被宿主随手换掉的元素撑大，每一秒修剪一次：连续两轮不在文档里的元素还原后放走，正在被移动的留下。
- **监听器必须命名。** 内联匿名函数在结构上就摘不掉，卸载后的插件仍在监听并改写页面。摘的时候要按**同样的 capture 标志**——`addEventListener(…, true)` 配 `removeEventListener(…, true)`，少一个 true 等于没摘。
- **文档里"上游自带"要去包里查，"宿主自带"要去宿主的补丁层里查，"本仓库补丁提供"要去 `patches/` 里查。** `npm pack @deepseek-ai/dsh-client-ui-*@<版本>` 拉下来 `grep` 一下比凭印象可靠：已发布的包里插件要的 `data-dsh-*` 标记一个都没有。`data-dsh-sidebar-root` 也不在里面——它在 DSH Desktop 的构建里，是那个构建给上游 sidebar 包打的补丁（`dataelement/dsh-desktop` 与 `wang-yi-bit64/dsh-desktop` 两个独立 fork 都这么打，可以互证）。查 `patches/` 时只看 `+` 开头的行：补丁的删除行里也会出现属性名。
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
- **`skipIf` 掉的测试会藏着永远无法成立的断言。** 契约测试里"每个锚点都能在上游源码里找到"这类断言，在只克隆本仓库时是跳过的，一旦装上上游包就必然失败。装上游包跑一遍，是查这类问题最省事的办法。
- **契约测试的"补丁文件名要对齐版本"那条，不能要求每个包都有补丁。** 仓库只补丁了三个包，锚点表里却列了八个上游包；断言要落在"真正打了补丁的包"上。
- **给上游的包装到 `node_modules` 里就能让被跳过的测试跑起来。** `npm install --no-save --no-package-lock --ignore-scripts --legacy-peer-deps @deepseek-ai/dsh-client-ui-…@0.2.1-rc.3`；代价是 npm 会顺手把 peer 依赖（`dsh-client-locale`、`cordis`）删掉，跑完要装回来。
