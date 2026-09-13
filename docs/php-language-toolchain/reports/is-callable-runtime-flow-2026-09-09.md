# is_callable 运行时可调用性控制流验收

日期：2026-09-09。范围：修正 `is_callable()` 的 `syntax_only` 边界，只把实际运行时可调用性检查接入类型控制流，并保留已证明 invokable 对象的具体类身份。

## 语义依据

- [PHP 官方 is_callable 手册](https://www.php.net/manual/en/function.is-callable.php)说明 `syntax_only=false` 是默认值，此时检查值在当前作用域是否可调用。
- `syntax_only=true` 只检查值是否可能具有函数或方法的结构，字符串和结构合法的数组也可能返回 true，因此不能据此证明 `callable` 类型。

## 已完成

- Parser 对省略第二参数、位置或命名的字面量 false 记录 callable 类型事实。
- 字面量 true、动态布尔表达式保持 unknown，避免过度收窄。
- 正向分支、else、否定和提前终止守卫统一支持；有限 Union 的 false 补集仍由共享类型代数处理。
- 参数、直接属性和最多 16 层安全数组路径进入同一实参诊断链，并沿用命名空间 shadow 校验与修改失效规则。
- 参数原生 Union、直接属性原生 Union 和 array shape 中的 invokable 对象在运行时 callable 真路径保留具体类，提供 `__invoke()`、类专有成员补全和真实 Definition；无关对象成员不会泄漏。
- Semantic snapshot 升至 schema 46，使 schema 45 缓存安全失效并重建。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 434 项测试、根包 30 项测试通过。其中 Parser 50、Semantic 198、Language Server 88 项。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布组件 tarball；PHP 8.5 fixture lint、宿主测试 TypeScript、`pnpm package`、`pnpm verify:vsix` 与 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 最终退出码 0，验证新增七条精确 callable 控制流诊断；完整属性/数组 fixture 冻结六十二条类型不兼容诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `f317212506c8af1741eceaff1fc9bfcc9b1453f3024853565850ecc9d77fa82c`。
- 完整测试日志位于 `/tmp/php-is-callable-runtime-flow-full-test-20260909.out`；成功宿主标准输出位于 `/tmp/php-is-callable-runtime-flow-host-20260909-0403.out`，原始日志位于 `/tmp/php-is-callable-runtime-flow-vscode-logs-20260909-0403`。
- 首次宿主运行发现前一 `is_subclass_of` 阶段仍冻结整份文档的旧总数 55；将旧阶段限制为只验证自己的七个精确位置、由本阶段冻结最终总数 62 后，第二次运行通过。该修改只修正分阶段测试边界。
- 成功宿主输出没有 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。无桌面 D-Bus 环境仍产生 Electron 平台日志；测试主动覆盖服务器崩溃恢复和 Rename 拒绝路径，VS Code Agent Host 另有 Node `url.parse()` 弃用警告。

## schema 51 具体 invokable 对象增量

- 参数、直接原生属性和安全 array shape 元素的 `Invokable|Other` 均验证真路径只保留 `Invokable`；`onlyInvoke` 可补全并导航，`otherOnly` 不出现。
- 完整 `pnpm typecheck`、`pnpm lint` 和 `pnpm test` 通过：15 个组件测试组共 438 项、根级 30 项，其中 Parser 50、Semantic 200、Language Server 90 项。
- 15 个组件 tarball 隔离消费者校验、PHP 8.5 fixture lint、宿主 TypeScript、VSIX 构建与三个 VSIX 内容校验均通过。
- 打包 VSIX 在隔离 VS Code Profile 中通过真实 Extension Host 验收，既有精确类型诊断总数保持 67。
- 主 VSIX SHA-256：`a2753a9cfaea9c7434b97c785685ed6a0f25e67bb932a01b75f0cb7b433a17e3`。
- 完整测试日志：`/tmp/php-invokable-object-flow-full-test-20260909.out`；宿主输出：`/tmp/php-invokable-object-flow-host-20260909-054930.out`；VS Code 日志：`/tmp/php-invokable-object-flow-vscode-logs-20260909-054930`。
- 宿主错误关键字扫描未发现断言失败、超时、文件缺失、流错误或未处理异常；日志中的 GitHub 未登录与 Node `url.parse()` 弃用提示来自隔离测试环境。
