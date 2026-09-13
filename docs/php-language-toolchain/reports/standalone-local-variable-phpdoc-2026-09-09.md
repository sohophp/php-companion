# 独立局部 PHPDoc 类型断言验收

日期：2026-09-09。范围：不绑定赋值的显式局部 `@var`、语句块边界、修改失效和统一类型消费。

## 已完成

- `/** @var Service $service */` 可在同一语句块内精化此前由动态 API、`mixed` 参数或其他未知来源建立的变量。
- 单对象、Union/Intersection 对象组及结构化 array shape 使用统一类型代数，进入成员补全、Definition、后续成员链和参数类型诊断。
- 注解必须显式写出变量名并完整解析；后续同变量残缺注解会关闭旧事实，避免退回更早的断言。
- 注解只在自身所在 `compound_statement` 生效，不跨条件、循环、函数或闭包边界。
- 同名赋值、复合赋值、自增减、`unset`、引用绑定、引用 foreach 和已证明的按引用参数调用都会使事实失效；普通按值调用保留事实。
- 查询先按变量名筛选可能相关的 PHPDoc；不存在候选时不会遍历 CST。该提前退出把 Semantic 203 项全量回归从优化前超过 14 分钟仍未完成，降至 28.61 秒完成。
- Semantic snapshot 升至 schema 56，schema 55 缓存会重建。

## 验证

- `pnpm typecheck` 与 `pnpm lint` 通过。
- `pnpm test` 通过：15 个组件共 444 项，根包 30 项；其中 Parser 50、Semantic 203、Language Server 93 项。完整输出保存在 `/tmp/php-standalone-local-var-full-test-20260909.out`。
- `pnpm verify:packages` 通过，15 个组件 tarball 均从隔离消费者安装并验证；输出保存在 `/tmp/php-standalone-local-var-packages-20260909.out`。
- PHP 8.5 fixture 通过 `bin/php-runtime -l`；扩展测试 TypeScript 编译通过。
- `pnpm package` 与 `pnpm verify:vsix` 通过，主扩展及 Open Source/Recommended 两个扩展包内容均验证通过。`php-companion-0.4.5.vsix` SHA-256 为 `c81625b943c81e19041a5022ee5b1e33606d7fa43d5fdade33ad191dd61a9eef`。
- VS Code 1.136.2 打包宿主在全新隔离 profile 中通过并以 0 退出；宿主断言覆盖独立断言的补全、Definition、两条精确参数诊断和按引用失效。输出保存在 `/tmp/php-standalone-local-var-host-20260909-074934.out`，VS Code 日志位于 `/tmp/php-standalone-local-var-vscode-logs-20260909-074934`。
- 最终宿主日志未出现 `AssertionError`、测试失败、超时、权限/文件错误、未处理异常、broken pipe 或 write-after-end。无桌面 DBus、无 GitHub token 及 VS Code 自身 `url.parse()` 弃用信息属于隔离环境噪声。
