# is_subclass_of 严格对象子类型控制流验收

日期：2026-09-09。范围：把对象模式的全局 `is_subclass_of()` 接入类型控制流，并精确保留它与 `is_a()` 不同的严格子类型语义。

## 语义依据

- [PHP 官方 is_subclass_of 手册](https://www.php.net/manual/en/function.is-subclass-of.php)说明该函数检查对象或类名是否以目标类型作为父类或实现接口，并且 `$allow_string` 默认是 true。
- 因此当前实现只在第三参数明确为字面量 false 时产生对象事实；省略、true 或动态值均可能接受 class-string，保持 unknown。
- 严格子类型判断排除目标类型自身，避免把 `BaseType` 错误收窄为 `BaseType` 的子类。

## 已完成

- Parser 记录独立 `subclass-predicate` 事实，支持位置参数、命名参数、true/else、否定和提前终止守卫。
- Semantic 先确认调用解析到全局 `is_subclass_of()`，再通过继承与接口关系判断候选是否为严格子类型；命名空间同名函数不触发收窄，显式 `\\is_subclass_of()` 可正常使用。
- 正向路径只保留有限 Union 中已证明的严格子类型，反向路径保留目标类型自身和不匹配成员；不会用父类型替换候选。
- 参数、直接属性与安全数组路径统一驱动实参诊断、成员补全和 Definition，并沿用既有的赋值、路径修改、调用及引用逃逸失效规则。
- mixed 的严格子类型补集、动态目标、默认/true/dynamic `$allow_string` 保持 unknown。
- Semantic snapshot 升至 schema 45，使 schema 44 缓存原子失效并重建。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 431 项测试、根包 30 项测试通过。其中 Parser 49、Semantic 197、Language Server 87 项。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布组件 tarball；PHP 8.5 fixture lint、宿主测试 TypeScript、`pnpm package`、`pnpm verify:vsix` 与 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，验证新增七条精确诊断和六个严格子类型成员 Definition；完整属性/数组 fixture 冻结五十五条类型不兼容诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `8451290327b100015ea8a8a56d1ea91a3928dbdbc999c90b7fe831955eade26a`。
- 完整测试日志位于 `/tmp/php-is-subclass-of-flow-full-test-20260909.out`；宿主标准输出位于 `/tmp/php-is-subclass-of-flow-host-20260909-0345.out`，原始日志位于 `/tmp/php-is-subclass-of-flow-vscode-logs-20260909-0345`。
- 宿主标准输出没有 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。无桌面 D-Bus 环境产生 Electron 平台日志；测试主动覆盖服务器崩溃恢复和 Rename 拒绝路径，因此日志中保留预期的服务器退出码 70 与 Rename 拒绝记录；VS Code Agent Host 另有 Node `url.parse()` 弃用警告。
