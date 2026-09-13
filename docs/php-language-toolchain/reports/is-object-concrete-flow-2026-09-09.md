# is_object 具体对象分支验收

日期：2026-09-09。范围：让 `is_object()` 对对象/标量参数 Union 的控制流事实同时驱动诊断、成员补全和 Definition。

## 语义依据

- [PHP 官方 is_object 手册](https://www.php.net/manual/en/function.is-object.php)规定，参数为对象时返回 true，否则返回 false。
- 因此 `ConcreteObject|string` 的真路径可保留 `ConcreteObject`，假路径可保留 `string`；多个对象候选会全部保留并使用既有 Union 公共成员规则，不猜测某一个具体类。

## 已完成

- Semantic 在确认调用解析到全局 `is_object()` 后，从参数 Union 中按已索引声明身份筛选并保留全部对象候选。
- 正向分支、else、否定提前退出守卫和显式全局调用进入单类或公共成员补全与多目标 Definition；命名空间 shadow 保持 unknown。
- 诊断仍由共享类型代数处理，补全与导航现在消费相同事实。
- Semantic snapshot 升至 schema 48，使 schema 47 缓存安全失效并重建。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 436 项测试、根包 30 项测试通过。其中 Parser 50、Semantic 199、Language Server 89 项。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布组件 tarball；PHP 8.5 fixture lint、宿主测试 TypeScript、`pnpm package`、`pnpm verify:vsix` 与 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，验证新增三条精确诊断、两个单类成员 Definition、一个多类公共成员补全及返回两处声明的 Definition；完整属性/数组 fixture 冻结六十五条类型不兼容诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `5a27212715b5fe622e6038eb83d695ea5c47f26dad08579c18a47e586f8e24de`。
- 完整测试日志位于 `/tmp/php-is-object-union-flow-full-test-20260909.out`；宿主标准输出位于 `/tmp/php-is-object-union-flow-host-20260909-0431.out`，原始日志位于 `/tmp/php-is-object-union-flow-vscode-logs-20260909-0431`。
- 宿主输出没有 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。无桌面 D-Bus 环境产生 Electron 平台日志；测试主动覆盖服务器崩溃恢复和 Rename 拒绝路径，VS Code Agent Host 另有 Node `url.parse()` 弃用警告。
