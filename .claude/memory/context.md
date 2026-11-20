# context.md — dsh-desktop-responsive

> 高频上下文。每次接手这个仓库先读这一份。

## 这是什么

一个 DSH 插件：把 DeepSeek Harness / DSH Desktop 的网页界面改成手机宽度可用。全部逻辑在浏览器侧（`client.js`），服务端入口 `index.js` 是空的 Cordis 壳。

## 当前状态

- 版本 `0.2.0`，**2026-11-20 之前从未发布到任何地方**（npm 404、无 tag、无 Release、不在 awesome-dsh-plugin 社区目录、不在 dsh-m 的策展 registry）。
- 宿主基线：Harness `0.2.1-rc.3`（补丁也绑在这个版本上）。
- 测试：`npm install --include=dev && npm test` → 83 通过 / 4 跳过。

## 关键约束（改动时别踩）

1. **不按类名选择宿主元素。** 上游类名是哈希（`pI_x6G_frame`），每次构建都变。只按 `data-dsh-region` 标记和上游自带的 `data-*` 属性定位；第三方插件的可选表面才用语义类名，且一律标 `optional`。
2. **卸载必须写回 React 的原值**，不能清空。React 只在它认为值变了时才重写样式。
3. **官方 `@deepseek-ai/*` 用 `peerDependencies`**，不放进 `dependencies`；范围必须带显式 `||` 预发布分支（见 `docs/adr/20261120-peer-not-dependency.md`）。
4. **补丁只加属性**，不改上游渲染结构。

## 发布路径

- npm（可选）：`npm publish`，`publishConfig.registry` 已钉到 `registry.npmjs.org`。
- 插件目录（正式入口）：向 `awesome-dsh-plugin/awesome-dsh-plugin` 提 `data/plugins/laiyinyizao007__dsh-desktop-responsive.yml`。
- `dsh-m` 的策展 `registry.json` **不收第三方条目**，不用管。

## 排障入口

- 插件自己的诊断都挂在 `documentElement` 上：`data-dshr-missing`（锚点缺失）、`data-dshr-problem`（布局不成立）、`data-dshr-drift`（对第三方插件的适配失效）。对应 `console.error` 的消息里带 `[dsh-desktop-responsive]` 前缀。
- DSH 宿主侧的坑在作者的 `dsh-desktop-pitfalls` 技能里（90 秒安装硬超时、窗口内 POST 403、profile 补丁层要写进 `- insert:`）。
