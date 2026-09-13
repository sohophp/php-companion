# is_a 对象类型控制流验收

日期：2026-09-09。范围：把对象模式的全局 `is_a()` 接入类型谓词控制流，并排除允许字符串类名时不成立的对象假设。

## 语义依据

- [PHP 官方 is_a 手册](https://www.php.net/manual/en/function.is-a.php)定义 `$allow_string=false` 为默认值；此时第一个参数不接受字符串类名。因此真路径可安全视为目标类型的对象或子类型。
- `$allow_string=true` 时真路径也可能由 class-string 满足；当前对象成员链不把它错误精化为对象。

## 已完成

- Parser 接受第二参数为静态 `Type::class`，并支持位置参数、命名参数、普通分支、else、否定和提前终止守卫。
- `$allow_string` 省略或字面量 false 时产生类型事实；true、动态布尔、动态 class 表达式和不完整调用保持 unknown。
- Semantic 验证调用解析到全局 `is_a()`；命名空间同名函数不触发收窄，显式 `\\is_a()` 可绕过遮蔽。
- 正向事实精化 mixed 或对象 Union；反向事实从关系完整的有限 Union 排除目标类型。
- 参数、直接属性及安全数组路径通过同一事实驱动实参诊断、成员补全和 Definition，并沿用既有修改失效规则。
- Semantic snapshot 升至 schema 44，使 schema 43 缓存原子失效。

## 验证结果

- `pnpm typecheck`、`pnpm lint` 和完整 `pnpm test` 退出码 0：15 个组件共 428 项测试、根包 30 项测试通过。其中 Parser 48、Semantic 196、Language Server 86 项。
- `pnpm verify:packages` 验证 15 个可独立发布组件 tarball；PHP 8.5 fixture、`pnpm package`、`pnpm verify:vsix`、宿主测试 TypeScript、定向 ESLint 和 `git diff --check` 均通过。
- 打包版 VS Code 1.136.2 Extension Host 退出码 0，验证新增七条精确诊断和五个对象成员 Definition；完整属性/数组 fixture 冻结四十八条类型不兼容诊断。
- 主扩展 `php-companion-0.4.5.vsix` SHA-256 为 `03dd89031dd370bb4568c9ce6c0653f36a2af88b5a5289fdf400852654c733ea`。
- 完整测试首次通过，固定 5000 ms 单测预算未变；日志位于 `/tmp/php-is-a-object-flow-full-test-20260909-0311.out`。
- 首次宿主运行发现既有属性阶段的选择器把新增 `$box->object` 用例计入旧的四条基线；将旧阶段限制到 `isAObjectFlow` 之前后，第二次运行通过。该修复只收紧测试选择范围，没有改动产品行为或等待预算。
- 成功宿主标准输出位于 `/tmp/php-is-a-object-flow-host-20260909-0321.out`，原始日志位于 `/tmp/php-is-a-object-flow-vscode-logs-20260909-0321`；扫描未发现 AssertionError、测试超时、ENOENT、EPIPE、stream destroyed、uncaught 或 unhandled 错误。标准输出存在 VS Code Agent Host 所用 Node `url.parse()` 弃用警告。
