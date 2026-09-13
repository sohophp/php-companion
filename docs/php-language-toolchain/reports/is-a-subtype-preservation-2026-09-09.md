# is_a 子类型身份保留验收

日期：2026-09-09。范围：让对象模式 `is_a()` 的成员查询保留声明中的实际子类型，并修正反向路径对子类的排除。

## 语义依据

- [PHP 官方 is_a 手册](https://www.php.net/manual/en/function.is-a.php)说明对象与目标类型相同或目标是其父类型时返回 true。
- 因此 `Child|Other` 对 `Base::class` 的真路径应为 `Child`，而不是降级为 `Base`；假路径应排除 `Child`。

## 已完成

- Semantic 对声明参数 Union 逐项检查相同类型和完整继承关系。
- 真路径保留已经比目标更具体的候选；宽泛父类型、object 或 mixed 可由目标类型精化。
- false/else 和提前终止后的继续路径排除目标及全部已知子类型。
- 参数诊断、成员补全和 Definition 复用同一关系，子类专有成员保持可见。
- Semantic snapshot 升至 schema 49，使 schema 48 缓存安全失效并重建。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 436 项测试、根包 30 项测试通过。其中 Parser 50、Semantic 199、Language Server 89 项。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布组件 tarball；PHP 8.5 fixture lint、宿主测试 TypeScript、`pnpm package`、`pnpm verify:vsix` 与 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，新增两条子类型关系诊断和两个子类/反向成员 Definition；完整属性/数组 fixture 冻结六十七条类型不兼容诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `837069a1a8ce118d1e701be7337dfed5a9945f182159bd05f65d28002f86d4c8`。
- 完整测试日志位于 `/tmp/php-is-a-subtype-preservation-full-test-20260909.out`；宿主标准输出位于 `/tmp/php-is-a-subtype-preservation-host-20260909-0444.out`，原始日志位于 `/tmp/php-is-a-subtype-preservation-vscode-logs-20260909-0444`。
- 宿主输出没有 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。无桌面 D-Bus 环境产生 Electron 平台日志；测试主动覆盖服务器崩溃恢复和 Rename 拒绝路径，VS Code Agent Host 另有 Node `url.parse()` 弃用警告。
