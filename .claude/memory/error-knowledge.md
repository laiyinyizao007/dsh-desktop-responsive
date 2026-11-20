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

### E4 — `upstream anchors missing: settingsContent`

- **症状**：控制台里带 `[dsh-desktop-responsive]` 前缀的一行，说设置对话框的标记没找到；`data-dshr-missing` 属性上有同样的内容。**只在设置对话框打开时出现**——那几个锚点仅在对话框打开时存在。
- **真实原因**：设置对话框被 portal 到 `body` 上，没有任何东西标明哪个元素是哪个。
- **取证**：这条消息本身；`data-dshr-missing` 属性。
- **修复**：从源码构建宿主时应用 `patches/` 下的三个补丁（`dsh-client-ui-chat` / `-conversation` / `-settings-general`，针对 `0.2.1-rc.3`）。
- **注意**：这条只覆盖设置对话框。表头、视图标签、输入区底栏、消息气泡这些表面**没有**诊断——缺标记时它们静默不生效。

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

### E7 — 宿主一个 `data-dsh-*` 标记都没有（纯 npm 装的 web profile）

- **症状**：布局一点没变；控制台有 `[dsh-desktop-responsive] upstream anchors missing: frame,sidebar,center.`（启动后 4 秒的宽限期一过就报）；`data-dshr-missing` 属性写着 `frame,sidebar,center`。`data-dshr-mode` 照样写——它只跟视口宽度有关，跟有没有 frame 无关。
- **真实原因**：宿主不带任何 `data-dsh-*` 标记。插件靠 `[data-dsh-sidebar-root]` 或 `[data-dsh-region="layout"]` 定位 frame，两者都没有时它无事可做。npm 上发布的 `@deepseek-ai/dsh-client-ui-*` 包里插件要的标记一个都没有，所以"装进 profile 就能用"是错的——宿主构建必须自带标记。
- **取证**：宿主页面里 `document.querySelector('[data-dsh-sidebar-root]')` 与 `document.querySelector('[data-dsh-region]')` 都是 null。
- **修复**：用带标记的宿主构建。**DSH Desktop 的构建带**——它给上游的 sidebar 包打了补丁，加上 `data-dsh-sidebar-root`（在 `dataelement/dsh-desktop` 与 `wang-yi-bit64/dsh-desktop` 两个独立 fork 的 patch 层里都能看到），所以在 Desktop 上装完即用；纯 npm 的 web profile 上则整体不生效。`patches/` 能补 14 个标记，但不含 sidebar 的那两个（`data-dsh-sidebar-root`、`data-dsh-region="sidebar-toggle"`）。

### E8 — 插件卸载后在宿主里留了一堆残留

- **症状**：插件卸载了，宿主的页面却不是原来的样子：抽屉关掉后中心列与右侧列还带着 `inert`（内容点不动、键盘也进不去）；宿主元素上多出 `data-dsh-region="layout"` 这类插件自己补的标记；输入区底栏还留着 `role="dialog"` / `aria-modal`；表格容器上多出 `data-dshr-table-scroll`，而且滚动监听还在跑；根元素上留着 `--dsh-visual-*`、`--dsh-header-centre`、`data-dshr-viewport`。
- **真实原因**：插件把 `inert` 写在中心列与右侧列上，卸载时却去 frame 上摘——摘错了元素。更根本的问题是：插件在**别人家的元素**上写属性与内联样式，全靠"逐个 attribute 手工补一句 removeAttribute"，漏一个就留一个。而这些值宿主自己可能原本就有（`tabindex`、`aria-label`、`role`），直接删会把宿主的值也抹掉。
- **取证**：卸载前后对同一批元素做属性快照做差集；差集里出现的都是插件写的。
- **修复**：用登记表管。`client.js` 里的 `setOwned` / `setOwnedStyle` 记下"这个属性写之前是什么样"和"插件最后写的是什么"，卸载时 `releaseOwnedAll()` 逐项还原成宿主原本的值——还原前先核对元素上现在还是不是插件写的那个值，宿主后来自己改过的不动；插件中途自己撤销的（抽屉关闭时的 `inert`、面板收起时的 `aria-hidden`）走 `releaseOwned`，还原并销账。布尔属性（`inert`）写上插件自己的值（`dshr`），否则宿主后来写的同名属性认不出来。
- **同类陷阱**：`focusout` 监听器原先是内联匿名函数，卸载时结构上就摘不掉——已卸载的插件仍在每次焦点变化时重新测量并重写页面。监听器一律要命名，卸载时按**同样的 capture 标志**摘。

## 预防检查清单

每次改动后过一遍：

- [ ] 插件源码里没有出现哈希类名形态（`test/responsive-layout-contract.test.mjs` 的守卫会拦住，但要在提交前就知道）
- [ ] 新的表面按 `ANCHORS` 的方式定位，不用类名；属于第三方插件的一律 `optional: true`
- [ ] 卸载路径把宿主自己写的值**写回**，没有清空
- [ ] 凡是往**宿主自有元素**上写属性或内联样式——写和撤销都算——都走 `setOwned` / `setOwnedStyle` / `releaseOwned` / `releaseOwnedStyle`，而不是裸 `setAttribute` / `removeAttribute` / `removeProperty`
- [ ] 还原走登记表的"核对再还原"：元素上的值还是插件写的才还原，不是就留下（宿主改过的值不是插件该撤销的）；布尔属性写上插件自己的值
- [ ] 插件自己造出来的元素才允许裸写（它们会被整体移除）
- [ ] 每个监听器都有名字，卸载时按同样的 capture 标志摘掉
- [ ] 新的诊断用 `data-dshr-*` 属性暴露，消息里带 `[dsh-desktop-responsive]` 前缀
- [ ] `package.json` 里 `@deepseek-ai/*` 仍然只出现在 `peerDependencies`，范围带显式 `||` 预发布分支
- [ ] `PROJECTWIKI.md` 与 `CHANGELOG.md` 同步更新（G1）
- [ ] 文档里引用的每个文件、行号、常量都还在
- [ ] 文档里"上游自带"的每个属性都用 `npm pack` 拉包 `grep` 验过，不靠印象
- [ ] 文档里"宿主构建自带"的每个标记都去 DSH Desktop 的 patch 层里看过（`dataelement/dsh-desktop` 与 `wang-yi-bit64/dsh-desktop` 两个独立 fork 可互证），不靠"源码注释这么说"
- [ ] 文档里"本仓库的补丁提供"的每个标记都去 `patches/` 里 `grep` 验过（含 `+` 行）
- [ ] 文档里引用的每条诊断消息都在 `client.js` 里真的 `console.error` 过
- [ ] `npm test` 全绿（`npm install --include=dev && npm test`）；**装上上游包再跑一遍**，否则有 4 条要读上游源码的断言是跳过的——它们正是最容易藏着"永远无法成立"的断言的地方
