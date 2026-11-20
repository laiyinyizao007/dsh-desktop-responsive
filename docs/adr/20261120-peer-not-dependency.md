# 官方 `@deepseek-ai/*` 包用 peerDependencies 声明，范围带显式预发布分支

- 状态：已接受
- 日期：2026-11-20
- 相关 Issue：<https://github.com/laiyinyizao007/dsh-desktop-responsive/issues/3>

## 背景

插件在 `dsh.client.inject` 里注入了 `@deepseek-ai/dsh-client-locale`，并在运行时调用 `ctx.locale.register()` 注册自己的中英文案。这个包由宿主提供，随 Harness 一起发布。

初次发布前，`package.json` 完全没有声明任何 peer。

## 备选方案

1. 放进 `dependencies`，让安装器把它装进插件自己的依赖闭包。
2. 放进 `peerDependencies`，由宿主提供。
3. 继续不声明，只靠 `dsh.client.inject` 里的包名。

## 取舍理由

方案 1 会让插件携带一份 `@deepseek-ai/dsh-client-locale` 的私有副本。Harness 把 `@deepseek-ai/*` 当作宿主单例（host singleton）——同一份实现只应存在一份，插件自带副本会造成两份 locale 服务并存，`ctx.locale.register()` 注册到哪一份变得不确定。插件市场安装器的闭包校验也会把这种"解析到闭包之外"的解析结果判为迁移失败。

方案 2 是官方约定：贡献指南明确要求官方 `@deepseek-ai/*` 一律用 `peerDependencies` 声明。安装器把 `@deepseek-ai/*` 视为宿主单例，因此**不**对它们做版本范围比对——范围是给人和工具看的，不是运行时闸门。

方案 3 让依赖关系只存在于 `package.json` 之外，工具读不到，也让第三方无法判断该插件需要什么宿主版本。

### 为什么范围必须带显式 `||` 分支

node-semver 只有当范围内*某个*比较符与目标版本的 `major.minor.patch` 元组完全一致、且该比较符自身也带预发布标签时，才放行这个预发布版本。

实测（node-semver）：

| 范围 | `0.2.1-rc.3` | `0.2.2-alpha.3` | `0.2.2-rc.5` |
| --- | --- | --- | --- |
| `^0.2.1-rc.1` | ✅ | ❌ | ❌ |
| `>=0.2.1-rc.1 <0.3.0-0` | ✅ | ❌ | ❌ |
| `>=0.2.1-rc.1 <0.2.2 \|\| >=0.2.2-alpha.1 <0.3.0-0` | ✅ | ✅ | ✅ |

Harness 本身就是以预发布形式发布的（当前 `0.2.1-rc.3`，`next` 标签已到 `0.2.2-rc.5`）。写成 `>=0.2.1-rc.1 <0.3.0` 会静默排除所有 `0.2.2-rc.*` 构建，用户装插件时会撞上 `ERESOLVE`，还得手工绕过。

Harness 还并行发布一条 `alpha` 标签线（当前 `0.2.2-alpha.3`）。范围因此分两段：`>=0.2.1-rc.1 <0.2.2` 覆盖 `0.2.1` 元组，`>=0.2.2-alpha.1 <0.3.0-0` 覆盖 `0.2.2` 元组。第二段下界取 `alpha` 而非 `rc`，因为 `alpha` 在同一元组上排在 `rc` 之前，一个比较符就能同时放行 `0.2.2-alpha.*` 与 `0.2.2-rc.*`。下一条元组（如 `0.2.3`）需要再加一段——这是 node-semver 预发布规则的固有代价。

## 影响范围

`package.json` 增加：

```json
"peerDependencies": {
  "@deepseek-ai/dsh-client-locale": ">=0.2.1-rc.1 <0.2.2 || >=0.2.2-alpha.1 <0.3.0-0"
}
```

## 验证方式

- `npm view @deepseek-ai/dsh-client-locale` 核对 `latest` / `next` / `alpha` 标签与实际版本号。
- 换 harness 版本后重跑 `npm install`，确认没有 `ERESOLVE`。

## 回滚策略

删掉 `peerDependencies` 整段即可，插件不依赖它才能运行。

## 跟踪链接

- Issue：<https://github.com/laiyinyizao007/dsh-desktop-responsive/issues/3>
