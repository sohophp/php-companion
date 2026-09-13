# 宽松 null 比较非空流验收

日期：2026-09-09。范围：在宽松 `!= null` 真路径和 `== null` 假路径中，为直接变量、静态属性路径及安全字面量数组键建立非空事实。

## 已完成

- `$value != null` 的真分支和 `$value == null` 条件提前终止后的继续路径会移除 null。
- 同一规则支持 null 位于比较左侧、直接否定、else/elseif、已支持循环与合取控制流。
- nullable 标量、属性和 array shape 元素进入统一实参诊断；对象路径继续使用相同补全机制。
- 宽松 `$value == null` 的真路径可能包含 false、零、空字符串或空数组，因此保留原类型，不推断 null-only。
- 变量、属性和数组修改仍沿用既有事实失效规则。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 420 项测试、根包 30 项测试通过。其中 Parser 46、Semantic 193、Language Server 83 项。
- 既有泛型数组测试按版本门控和传播行为拆分后，在不提高 5000 ms 单测预算的前提下完整测试首次通过。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture、`pnpm package`、`pnpm verify:vsix`、定向 ESLint 和 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，验证新增四条宽松 null 比较精确诊断；完整属性/数组 fixture 冻结三十三条诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `0674d40a6836fc01adbe5dd043ea38cdc653a8c00c563abe9fb13d1e481a4ece`。
- 宿主标准输出位于 `/tmp/php-loose-null-flow-host-20260909-0158.out`，原始日志位于 `/tmp/php-loose-null-flow-vscode-logs-20260909-0158`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。标准输出存在 VS Code Agent Host 所用 Node `url.parse()` 弃用警告。
