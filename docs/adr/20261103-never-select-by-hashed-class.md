# 用标记与稳定属性定位宿主元素，绝不按哈希类名选择

- 状态：已接受
- 日期：2026-11-03
- 相关提交：`4870762`（插件初版）

## 背景

Harness 的前端用 CSS Module，编译产物里的类名是哈希（`pI_x6G_frame`）。这个哈希随每一次上游构建变化。

## 备选方案

1. 按哈希类名选择元素。
2. 按语义类名选择元素（`.pc-root`、`.dshWbMarketHeaderText`）。
3. 按宿主自带的稳定 `data-*` 属性选择元素。
4. 组合：用宿主自带属性作为主，标记（`data-dsh-region`）作为补充；对第三方插件的可选表面才用语义类名，且一律标为 `optional`。

## 取舍理由

- 方案 1 在下一次上游构建时静默失效：选择器匹配不到任何元素，插件看起来"装了但没反应"。
- 方案 2 比方案 1 稳定，但仍然是别人的私有实现细节，宿主改个类名就断。
- 方案 3 与上游自己的写法一致，属性名是宿主契约的一部分。

## 影响范围

`client.js` 的 `ANCHORS` 表是唯一的定位入口。每个锚点标注 `origin`（`marker` / `attribute` / `class`）、`package`（元素属于哪个宿主包）、`required`（缺失即判定为漂移）。

宿主自带标记的部分，`patches/` 下的补丁只往元素上加 `data-dsh-region` 属性，不改上游渲染结构；没有补丁的宿主，插件在运行时自行给能推断出来的元素补标记，两种宿主因此表现一致。

第三方插件的可选表面（项目控制台 `.pc-root`、工作台表头 `.dshWbMarketHeaderText`）用语义类名，但一律 `optional: true`——缺失只记诊断，不影响其它适配。

## 验证方式

`test/responsive-layout-contract.test.mjs` 有一条守卫：插件源码里出现哈希类名形态即测试失败。

## 回滚策略

不适用——这是插件的定位前提，回滚等于插件失效。

## 跟踪链接

- Issue：<https://github.com/laiyinyizao007/dsh-desktop-responsive/issues/3>
