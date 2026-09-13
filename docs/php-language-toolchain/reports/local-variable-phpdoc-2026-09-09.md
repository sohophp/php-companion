# 局部变量 PHPDoc 类型断言验收

日期：2026-09-09。范围：紧邻局部赋值的显式 `@var Type $variable`、局部类型传播、成员查询与参数诊断。

## 已完成

- `/** @var Service $service */` 紧邻 `$service = ...` 时，`Service` 作为该赋值建立的开发者类型断言进入统一语义模型。
- 断言可驱动成员补全、Definition、后续成员链和参数类型诊断，适用于容器或动态 API 返回 `mixed`、但开发者已明确局部类型的常见工作流。
- 结构化 `@var array{service: Service} $data` 可沿最多 16 层安全字符串或整数文字键提供成员补全与 Definition；根变量或任意偏移写入后立即失效。
- 注解必须显式写出与赋值左值完全相同的变量名；错名和无变量名 `@var` 不产生局部类型事实。
- 注解必须紧邻赋值且 PHPDoc 可完整解析；残缺注解、无法解析的类型和非对象成员目标保持 unknown。
- 事实限定在解析器记录的词法作用域内，下一次同名赋值立即覆盖旧断言，不把旧成员或诊断传播到新值。
- Semantic snapshot 升至 schema 55，schema 54 缓存会重建。

## 验证

- `pnpm typecheck`、`pnpm lint`、PHP 8.5 fixture 语法检查与 `git diff --check` 通过。
- `pnpm test` 通过：15 个组件测试组共 442 项、根级测试 30 项；其中 Parser 50、Semantic 202、Language Server 92 项。
- Semantic 与 Language Server 回归覆盖直接变量和 array shape 字面量键的补全、Definition、参数类型不兼容，以及重赋值、偏移写入、错名和无变量名注解的安全失效。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布组件 tarball。
- `pnpm package`、宿主测试 TypeScript 与 `pnpm verify:vsix` 通过，主扩展和两个开源组合包均通过内容校验。
- 打包 VSIX 在隔离 VS Code 1.136.2 Profile 中通过真实 Extension Host 验收：局部 `@var` 提供成员补全、Definition 和一条精确参数诊断，array shape 字面量键提供补全与 Definition，重赋值或偏移写入后的 Definition 为空。
- 主 VSIX SHA-256：`bf36b81b095eea139b409a3ee62d8d09bb0d6f3249b0f975627f3dd19db61905`。
- 完整测试日志：`/tmp/php-local-var-phpdoc-full-test-20260909.out`；组件打包日志：`/tmp/php-local-var-phpdoc-packages-20260909.out`；宿主输出：`/tmp/php-local-var-phpdoc-host-20260909-071601.out`；VS Code 日志：`/tmp/php-local-var-phpdoc-vscode-logs-20260909-071601`。

首次宿主断言使用“补全列表不含已出现单词”验证失效，受到 VS Code 词汇补全干扰；改用重赋值后 Definition 必须为空后通过。产品语义实现没有因此改动。最终宿主错误关键字扫描未发现断言失败、超时、文件缺失、流错误或未处理异常；GitHub 未登录、DBus 与 Node `url.parse()` 提示来自隔离测试环境。
