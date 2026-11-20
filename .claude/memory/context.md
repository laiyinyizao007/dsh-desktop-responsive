# context.md — dsh-desktop-responsive

> 高频上下文。每次接手这个仓库先读这一份。

## 这是什么

一个 DSH 插件：把 DeepSeek Harness / DSH Desktop 的网页界面改成手机宽度可用。全部逻辑在浏览器侧（`client.js`），服务端入口 `index.js` 是空的 Cordis 壳。

## 当前状态

- 版本 `0.2.0`，**2026-11-20 之前从未发布到任何地方**（npm 404、无 tag、无 Release、不在 awesome-dsh-plugin 社区目录、不在 dsh-m 的策展 registry）。
- 宿主基线：Harness `0.2.1-rc.3`（补丁也绑在这个版本上）。
- 测试：`npm install --include=dev && npm test` → 共 91 条。装上上游包（`0.2.1-rc.3`）时 91 条全过；只克隆本仓库时 87 通过 / 4 跳过（跳过的四条要读上游源码）。

## 关键约束（改动时别踩）

1. **不按类名选择宿主元素。** 上游类名是哈希（`pI_x6G_frame`），每次构建都变。只按 `data-dsh-region` 标记和上游自带的 `data-*` 属性定位；第三方插件的可选表面才用语义类名，且一律标 `optional`。
2. **卸载必须写回 React 的原值**，不能清空。React 只在它认为值变了时才重写样式。
3. **官方 `@deepseek-ai/*` 用 `peerDependencies`**，不放进 `dependencies`；范围必须带显式 `||` 预发布分支（见 `docs/adr/20261120-peer-not-dependency.md`）。
4. **补丁只加属性**，不改上游渲染结构。
5. **宿主必须自带 `data-dsh-*` 标记。** npm 上发布的 `@deepseek-ai/dsh-client-ui-*` 包里插件要的标记一个都没有（`npm pack` 拉下来 grep 过；只有 `dsh-web-frontend` 带一个与插件无关的 `data-dsh-automatic-focus`）。插件靠 `[data-dsh-sidebar-root]` 或 `[data-dsh-region="layout"]` 定位 frame，两者都没有就整体不生效。**DSH Desktop 的构建带 `data-dsh-sidebar-root`**（它给上游 sidebar 包打了补丁），所以在 Desktop 上装完即用；纯 npm 的 web profile 上则不生效。`patches/` 补 14 个标记，sidebar 的 `data-dsh-sidebar-root` 与 `data-dsh-region="sidebar-toggle"` 要宿主自己补。
6. **卸载要把监听器和属性都还回去。** 插件写在宿主自有元素上的每一样东西都由 `client.js` 里的登记表管（`setOwned` / `setOwnedStyle` / `releaseOwnedAll`）：自己补的标记、抽屉的 `inert`、用量面板的 dialog 语义、表格滚动监听、根元素上的自定义属性与诊断属性。卸载时逐项还原成宿主原本的值——宿主本来就有的值不能被抹掉。
7. **写宿主自有元素要走登记表。** 直接 `el.setAttribute()` 会在卸载后留下残留；只有插件自己造出来的元素才可以直接写，因为它们会被整体移除。

## 发布路径

- npm（可选）：`npm publish`，`publishConfig.registry` 已钉到 `registry.npmjs.org`。
- 插件目录（正式入口）：向 `awesome-dsh-plugin/awesome-dsh-plugin` 提 `data/plugins/laiyinyizao007__dsh-desktop-responsive.yml`。
- `dsh-m` 的策展 `registry.json` **不收第三方条目**，不用管。

## 排障入口

- 插件自己的诊断都挂在 `documentElement` 上：`data-dshr-missing`（锚点缺失）、`data-dshr-problem`（布局不成立）、`data-dshr-drift`（对第三方插件的适配失效）。对应 `console.error` 的消息里带 `[dsh-desktop-responsive]` 前缀。
- DSH 宿主侧的坑在作者的 `dsh-desktop-pitfalls` 技能里（90 秒安装硬超时、窗口内 POST 403、profile 补丁层要写进 `- insert:`）。
