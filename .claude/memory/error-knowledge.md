# error-knowledge.md — dsh-desktop-responsive

> 中频记忆。这里记的是"这个错误长什么样、为什么、下次怎么挡住"。

## 已知错误索引

### E1 — 插件装了但布局一点没变

- **症状**：控制台没有任何报错，页面在手机上依然是三栏。
- **真实原因**：必需锚点找不到。宿主太旧，或者上游改了标记名。
- **取证**：`document.documentElement` 上的 `data-dshr-missing` 属性里有缺哪个锚点。
- **修复**：按 `docs/UPSTREAM.md` 的契约更新 `ANCHORS`；从源码构建宿主时应用 `patches/`。

### E2 — `the phone layout does not hold: the frame grid has 4 tracks, expected 3`

- **症状**：`console.error` 里带 `[dsh-desktop-responsive]` 前缀；`data-dshr-problem` 属性有同样的内容。
- **真实原因**：上游把 frame 的网格从三列改成了四列。插件把第一列折成 0px 的做法不再成立。
- **取证**：`data-dshr-problem` 属性；`verifyLayout()` 核对的是 `grid-template-columns` 的轨道数与 `.scrollWidth > .clientWidth + 4`。
- **修复**：更新 `ANCHORS` / `syncGrid()`，不要靠改 CSS 掩盖。

### E3 — `the layout for project-console stopped applying`

- **症状**：同前缀的 `console.error`；`data-dshr-drift` 属性有内容。
- **真实原因**：`auditAdaptations()` 判定对第三方插件（项目控制台 / 底部工作台 / 工作台首页）的适配不再成立——对方升级并改了类名。
- **取证**：`data-dshr-drift` 属性里写的是哪一块（`bottom-panel` / `project-console` / `workbench-home`）。
- **修复**：这些表面是 `optional` 的，失效不影响其它适配；需要恢复就更新对应锚点的选择器。

### E4 — `the settings dialog and the conversation header were not adapted`

- **症状**：`docs/UPSTREAM.md` 里记的这条消息，表示宿主没带标记。
- **真实原因**：设置对话框被 portal 到 `body` 上，没有任何东西标明哪个元素是哪个；会话表头的行也需要标记。
- **取证**：这条消息本身。
- **修复**：从源码构建宿主时应用 `patches/` 下的三个补丁（`dsh-client-ui-chat` / `-conversation` / `-settings-general`，针对 `0.2.1-rc.3`）。

### E5 — 装插件时 `ERESOLVE`

- **症状**：npm/pnpm 报 peer 依赖冲突。
- **真实原因**：peer 范围排除了宿主实际安装的版本——多半是范围里没有针对该 `major.minor.patch` 元组的预发布分支。
- **取证**：`npm view @deepseek-ai/dsh-client-locale versions --json` 看实际版本；比对范围的元组。
- **修复**：按 `docs/adr/20261120-peer-not-dependency.md` 的写法加显式 `||` 分支。

### E6 — 安装 90 秒后 `exit=1`，没有任何错误信息

- **症状**：安装卡在约 91~92 秒后失败，退出码是 1，日志里什么都没有。
- **真实原因**：DSH 安装器的硬上限（`GENERATION_INSTALL_TIMEOUT_MS = 90 * 1000`），超时后 pnpm 被 SIGKILL，退出码 `null` 被当成 1。
- **取证**：市场自己的日志在 `profiles\web\.dsh-market\log.ndjson`，不在 `harness.log`。
- **修复**：插件本身只有 71.6 kB、无运行时依赖，碰不到这个上限；碰到的是依赖体积的问题。

## 预防检查清单

每次改动后过一遍：

- [ ] 插件源码里没有出现哈希类名形态（`test/responsive-layout-contract.test.mjs` 的守卫会拦住，但要在提交前就知道）
- [ ] 新的表面按 `ANCHORS` 的方式定位，不用类名；属于第三方插件的一律 `optional: true`
- [ ] 卸载路径把宿主自己写的值**写回**，没有清空
- [ ] 新的诊断用 `data-dshr-*` 属性暴露，消息里带 `[dsh-desktop-responsive]` 前缀
- [ ] `package.json` 里 `@deepseek-ai/*` 仍然只出现在 `peerDependencies`，范围带显式 `||` 预发布分支
- [ ] `PROJECTWIKI.md` 与 `CHANGELOG.md` 同步更新（G1）
- [ ] 文档里引用的每个文件、行号、常量都还在
- [ ] `npm test` 全绿（`npm install --include=dev && npm test`）
