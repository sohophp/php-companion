# 普通三元表达式结果类型验收

日期：2026-09-09。范围：完整普通三元表达式的结果类型、字面量条件可达性、局部别名查询一致性，以及 unknown 与 Elvis 边界。

## 已完成

- 只解析 CST 中精确匹配的 `conditional_expression`，并读取 condition、body、alternative 字段；不以文本冒号切分表达式。
- 非字面量条件要求 true/false 两个 arm 都有可证明类型，结果组成 Union，并沿局部赋值进入补全、Definition 与参数类型诊断。
- 条件为字面量 `true` 或 `false` 时只求值可达 arm，因此不可达的 unknown 调用不会污染结果。
- 任一可达 arm 未知时保持 unknown，不暴露成员、不产生伪 Definition；省略 body 的 Elvis `condition ?: fallback` 明确保留为 unknown。
- 括号内完整三元表达式复用相同规则。对象 Union 只暴露各运行时分支签名一致的公共成员。
- 表达式 CST 查询仅在文本同时可能包含 `?` 与 `:` 时触发，普通实参保持既有热路径。
- Semantic snapshot 升至 schema 65，使旧缓存重建。

## 自动验证

- `pnpm typecheck` 与 `pnpm lint` 通过。
- `pnpm test` 通过：15 个组件共 458 项，根包 30 项；其中 Parser 54、Semantic 209、Language Server 97 项。
- `pnpm verify:packages` 通过，15 个组件 tarball 均从隔离消费者安装并验证。
- Winstar PHP 8.5 `bin/php-runtime -l` 验证扩展 fixture 无语法错误。
- `pnpm package` 与 `pnpm verify:vsix` 通过，主扩展及 Open Source/Recommended 两个扩展包内容均验证通过。最终 `php-companion-0.4.5.vsix` SHA-256 为 `a4542abaab62b4ac9736a903bf7678c0230f9a0d1cb3b6ff058e9f3f4faf6c4b`。
- VS Code 1.136.2 打包宿主在全新隔离 profile 中通过并以 0 退出。宿主验证完整三元与字面量条件的补全/Definition、可达 unknown 和 Elvis 不产生 Definition，以及三元标量 Union 的精确参数诊断；同一 fixture 也继续覆盖 schema 64 的空合并规则。完整输出保存于 `/tmp/php-ternary-result-host-20260909-1232.out`。
- 宿主输出未出现 `AssertionError`、测试失败、超时或非零退出。无桌面 DBus、无 GitHub token 与 VS Code 自身 `url.parse()` 弃用信息属于隔离环境噪声。

## Winstar 验证

- schema 65 默认 Composer 只读索引载入 9,999 个文件、37,736,007 字节，并完整保留 1,934 个项目文件；`projectComplete=true`，依赖因 10,000 文件预算截断而 `complete=false`。前一增量选取的 6 个真实 Toolbar 空合并别名仍全部完成 `addWithArray` 补全和唯一 Definition。结构化结果保存于 `/tmp/php-ternary-result-winstar-20260909.json`。
- Winstar 实际 `AboutPage|WebPage` 三元源码依赖被截断的 `vendor/sohophp/schema-org` 声明，查询按不完整依赖策略保持空结果，没有把缺失声明当成完整证明。
- 另以 Winstar `src/` 的 1,529 个 PHP 文件构建完整项目源码语义，并用实际 `AddPage|EditPage -> Page` 声明验证完整三元别名：`setTitle` 补全成功，Definition 唯一落到 `src/Modules/Admin/Component/UserInterface/Renderer/Page.php`；含可达 unknown arm 的同名调用没有 Definition。结构化结果保存于 `/tmp/php-ternary-result-winstar-project-20260909.json`。

这些结果证明项目源码完整层级及默认 Composer 预算内的行为；不声称被截断 vendor 包已经完成语义验证。
