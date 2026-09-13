# 复合对象谓词验收

日期：2026-09-09。范围：让 `is_countable()` 和 `is_iterable()` 的复合目标参与对象成员精确收窄。

## 已完成

- Semantic 不再要求类型谓词目标必须是单一命名类型，而是解析完整 PHPDoc 类型代数。
- `Counted|Other` 经 `is_countable()` 真路径保留 `Counted`，并提供继承的 `count()` 与具体类成员。
- `Iterated|Other` 经 `is_iterable()` 真路径保留 `Iterated`，并提供 `IteratorAggregate` 契约与具体类成员。
- 无关对象成员不会泄漏；Definition 指向具体实现类中的真实声明。
- false/else 路径只排除关系已证明的候选；参数、直接属性和安全 array shape 元素中存在继承链缺口时，成员补全与 Definition 整体保持 unknown。
- Semantic snapshot 升至 schema 51，使 schema 50 缓存安全重建。

## 验证

- `pnpm typecheck`、`pnpm lint`、PHP 8.5 固件语法检查与 `git diff --check` 通过。
- `pnpm test` 通过：15 个组件测试组共 438 项，根级测试 30 项；其中 Parser 50、Semantic 200、Language Server 90 项。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布组件的 tarball。
- `pnpm package` 与 `pnpm verify:vsix` 通过，主扩展及两个开源组合包均通过产物检查。
- 打包 VSIX 在隔离 VS Code Profile 中通过真实 Extension Host 验收：`countedOnly`、`iteratedOnly` 均可补全并导航到具体实现声明，`otherOnly` 不会泄漏；既有精确诊断基线保持 67 条。
- 主 VSIX SHA-256：`da1c1a15cf0741031c65b88c8b35fb538e85fa530978f395daf78b5eb228b53c`。
- Extension Host 输出：`/tmp/php-composite-predicate-complements-host-20260909-053604.out`；VS Code 日志：`/tmp/php-composite-predicate-complements-vscode-logs-20260909-053604`。

宿主日志只有测试环境既有的 GitHub 未登录提示与 Node `url.parse()` 弃用提示；错误关键字扫描未发现断言失败、超时、未处理异常或流错误。
