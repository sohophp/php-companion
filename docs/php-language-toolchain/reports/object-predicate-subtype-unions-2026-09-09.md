# 对象谓词多子类型保留验收

日期：2026-09-09。范围：让对象模式 `is_a()` 和严格 `is_subclass_of()` 的多子类结果在参数、直接属性和安全 array shape 路径上进入 Union 公共成员与多目标 Definition 主链。

## 语义依据

- [PHP 官方 is_a 手册](https://www.php.net/manual/en/function.is-a.php)允许对象与目标类型相同或以目标为父类型。
- [PHP 官方 is_subclass_of 手册](https://www.php.net/manual/en/function.is-subclass-of.php)要求严格父类或接口关系，目标类型自身不匹配。
- 因此有限 Union 中所有满足相应关系的候选都必须保留，不能任选一个或统一降级成父类型。

## 已完成

- Semantic 对参数原生类型或 PHPDoc Union 的每个候选执行相同、继承或严格子类型判断。
- `is_a()` 保留同类和子类，并仅在宽泛父类候选可安全精化时使用目标类型。
- `is_subclass_of(..., false)` 只保留严格子类，排除目标类型自身。
- 多个剩余对象分支进入既有签名一致公共成员模型，Definition 返回每个真实声明。
- false 路径遇到关系未知的候选时整体保持 unknown，避免从 mixed 等候选推导伪补集。
- Semantic snapshot 升至 schema 50，使 schema 49 缓存安全失效并重建。

## 验证结果

- `pnpm typecheck`、`pnpm lint`、`git diff --check` 与 PHP 固件语法检查通过。
- `pnpm test` 通过：15 个工作区测试组共 436 项，根级测试 30 项；其中 Parser 50、Semantic 199、Language Server 89 项。
- `pnpm verify:packages` 从隔离消费者验证 15 个可独立发布的组件 tarball。
- `pnpm package` 与 `pnpm verify:vsix` 通过；主扩展及两个开源扩展包 VSIX 均通过结构和内容校验。
- 打包后的 VSIX 在隔离 VS Code Profile 中通过真实 Extension Host 验收：`is_a()` 与严格 `is_subclass_of()` 的参数、直接属性和安全 array shape 元素各自只补全一个公共 `sharedSubtype`，每个访问点均返回两个真实 Definition；全套精确类型不匹配诊断保持 67 条。
- 主 VSIX：`php-companion-0.4.5.vsix`，SHA-256 `2366d791fed4ae872c66d8c9b0c82412caed296091f06de58f9f0edc57a1d482`。
- Extension Host 输出：`/tmp/php-object-predicate-path-unions-host-20260909-050720.out`；VS Code 日志：`/tmp/php-object-predicate-path-unions-vscode-logs-20260909-050720`。

宿主日志只出现测试环境既有的 GitHub 未登录提示、VS Code 配置作用域提示和 Node `url.parse()` 弃用提示；错误关键字扫描未发现断言失败、超时、未处理异常或流错误。
