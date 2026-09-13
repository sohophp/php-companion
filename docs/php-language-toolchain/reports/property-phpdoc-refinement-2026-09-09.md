# 属性 PHPDoc 安全精化验收

日期：2026-09-09。范围：统一属性原生类型、紧邻 `@var`、成员查询和谓词控制流。

## 已完成

- `public mixed $handler` 可由紧邻 `@var Invokable|Other` 安全精化。
- 原生 array、iterable、string、callable/Closure 与同基命名类型只接受结构兼容的文档精化。
- `public int $handler` 上的 `@var Invokable` 不进入查询模型，原生类型继续作为运行时边界。
- 精化结果进入属性读取、类型谓词、成员补全、Definition 与后续成员链。
- 多属性声明的 `@var Type $first` 只绑定 `$first`；同声明 `$second` 不继承该类型。未带变量名的 `@var Type` 仍共享给整条声明。
- PHPDoc/原生冲突诊断采用相同绑定规则，只报告明确匹配的属性。
- 构造器 `@param Service $service` 的安全精化复用于 `public mixed $service` 提升属性；冲突的 `public int $service` 仍按原生类型查询。
- Semantic snapshot 升至 schema 54，schema 53 缓存会重建。

## 验证

- `pnpm typecheck`、`pnpm lint`、PHP 8.5 固件语法检查与 `git diff --check` 通过。
- `pnpm test` 通过：15 个组件测试组共 440 项、根级测试 30 项；其中 Parser 50、Semantic 201、Language Server 91 项。
- Semantic 回归验证命名 `@var` 只精化目标属性、无名 `@var` 精化整条声明，冲突诊断也只返回明确匹配属性。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布组件 tarball。
- `pnpm package`、宿主测试 TypeScript 与 `pnpm verify:vsix` 通过，主扩展和两个开源组合包均通过内容校验。
- 打包 VSIX 在隔离 VS Code Profile 中通过真实 Extension Host 验收：原生 `mixed + @var Invokable|Other` 属性在 `is_callable()` 真路径提供 `onlyInvoke` 补全和 Definition；构造器 `@param Service` 精化的 `public mixed` 提升属性提供 `promotedOnly` 补全和 Definition；无关成员不泄漏，诊断基线保持 67 条。
- 主 VSIX SHA-256：`dd651ab166ab6ebbff88c334d96c37ff4908a138eee1888f33ca496d39f6bb4d`。
- 完整测试日志：`/tmp/php-promoted-property-phpdoc-full-test-20260909.out`；宿主输出：`/tmp/php-promoted-property-phpdoc-host-20260909-062435.out`；VS Code 日志：`/tmp/php-promoted-property-phpdoc-vscode-logs-20260909-062435`。

宿主错误关键字扫描未发现断言失败、超时、文件缺失、流错误或未处理异常；GitHub 未登录与 Node `url.parse()` 弃用提示来自隔离测试环境。
