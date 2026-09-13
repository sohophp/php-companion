# 严格布尔字面量控制流验收

日期：2026-09-09。范围：普通条件、else、可证明提前退出守卫、短路右操作数及三元 arm 中的严格 `true`/`false` 字面量事实，以及查询一致性与保守边界。

## 已完成

- `===` 与 `!==` 支持布尔字面量位于比较任一侧；普通 `if` 主体、反向 else 及所有分支均终止后可证明的同块继续路径使用现有有界范围。
- `T|false !== false` 精确保留 `T`，`T|false === false` 的反向路径同样保留 `T`；`bool !== false` 得到字面量 `true`，对应 true 比较按相同规则处理。
- 参数、断言前已有精确类型的局部变量、直接可见属性及最多 16 层安全字面量 array shape 路径共用事实。
- 成员补全、Definition、成员链和参数类型诊断消费相同结果。后续赋值、路径写入及既有副作用规则会撤销事实。
- 宽松 `==`/`!=` 不产生布尔字面量事实；mixed 的否定字面量补集无法有限表示，因此保持 unknown。严格相等可将 mixed 精化为被断言的单一字面量。
- PHPDoc `array{item: T}|false` 可逐分支证明为原生 `array|false` 的安全精化；根变量排除 false 后，安全 shape 元素的补全、Definition 和参数诊断保留 `T`，短路右操作数与提前退出路径同样生效。
- 严格比较事实进入逻辑已证明的短路右操作数与三元表达式确定 arm；事实的适用范围和条件检查起点分离，使条件内后续按引用修改仍能撤销收窄。
- Semantic snapshot 升至 schema 63，使 schema 62 及更旧缓存安全重建。

## 验证

- `pnpm typecheck` 与 `pnpm lint` 通过。
- `pnpm test` 通过：15 个组件共 454 项，根包 30 项；其中 Parser 54、Semantic 207、Language Server 95 项。
- `pnpm verify:packages` 通过，15 个组件 tarball 均从隔离消费者安装并验证。
- 两份严格布尔 fixture 通过 Winstar PHP 8.5 `bin/php-runtime -l`；扩展测试 TypeScript 编译通过。
- `pnpm package` 与 `pnpm verify:vsix` 通过，主扩展及 Open Source/Recommended 两个扩展包内容均验证通过。`php-companion-0.4.5.vsix` SHA-256 为 `d248f00f761bc3b4c00caca6010754e9d28c762d6d4e67e8312e026151b69193`。
- VS Code 1.136.2 打包宿主在全新隔离 profile 中通过并以 0 退出；宿主验证普通严格布尔分支、提前退出守卫、短路右侧及三元 arm 中 false 排除后 shape 元素的补全与 Definition、6 条精确参数诊断，以及宽松比较不产生 Definition。输出保存在 `/tmp/php-boolean-ternary-flow-host-20260909-114229.out`，VS Code 日志位于 `/tmp/php-boolean-ternary-flow-vscode-logs-20260909-114229`。
- 最终宿主日志未出现 `AssertionError`、测试失败、超时、权限/文件错误、未处理异常、broken pipe 或 write-after-end。无桌面 DBus、无 GitHub token 及 VS Code 自身 `url.parse()` 弃用信息属于隔离环境噪声。
- 使用最终 schema 63 组件对 Winstar 做只读 Composer 索引：1,934 个项目 PHP 文件完整进入索引，总计载入 9,999 个文件、37,736,007 字节；依赖受 10,000 文件预算截断，因此 `complete=false`、`projectComplete=true`。两处真实 Doctrine assert 后仍可补全 `createQueryBuilder` 并 Definition 到 `vendor/doctrine/orm/src/EntityRepository.php`。结构化结果保存在 `/tmp/php-native-assert-boolean-winstar-20260909.json`。
