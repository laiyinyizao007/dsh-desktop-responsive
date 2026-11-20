# tool-patterns.md — dsh-desktop-responsive

> 低频记忆。工具层面的用法，不常变。

## 本地验证

```bash
npm install --include=dev   # NODE_ENV=production 的机器上不加这个会跳过 devDependencies
npm test                    # vitest run；共 91 条，装上游包时全过，只克隆仓库时 87 通过 / 4 跳过
npm pack --dry-run          # 看 tarball 里到底装了什么、多大
```

## 看插件在宿主里实际做了什么

诊断状态全在 `documentElement` 的属性上，页面控制台里直接读：

```js
document.documentElement.getAttribute('data-dshr-missing')   // 缺了哪些锚点
document.documentElement.getAttribute('data-dshr-problem')   // 布局为什么不成立
document.documentElement.getAttribute('data-dshr-drift')     // 对第三方插件的适配为什么失效
document.documentElement.getAttribute('data-dshr-mode')      // phone / wide
```

## 查上游的版本与标签

```bash
npm view @deepseek-ai/dsh-client-locale versions --json
npm view @deepseek-ai/dsh-client-locale dist-tags --json
```

`latest` 标签经常是旧的，判断兼容性看 `next` 和实际安装的版本。

## 查语义化版本的预发布规则

node-semver 的规则不看"范围看起来宽不宽"，只看有没有比较符和目标版本落在同一个 `major.minor.patch` 元组上、且自己带预发布标签。验证一行：

```bash
node -e "console.log(require('semver').satisfies('0.2.2-rc.5', '>=0.2.1-rc.1 <0.2.2 || >=0.2.2-alpha.1 <0.3.0-0'))"
```

## 向插件目录提交

条目是**一个文件**：`data/plugins/<owner>__<repo>.yml`，字段只有 `url` / `name` / `category` / `description`（`en` 必填、`zh` 可选）/ `icon` / `tarball`。README 是生成的，不要手改。提交前本地跑一遍：

```bash
node scripts/generate-readme.mjs
node scripts/build-site.mjs
```

（`awesome-lint` 在 Windows 上会因为路径问题报错，与条目内容无关。）
