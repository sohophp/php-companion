# 原生 assert 类型控制流验收

日期：2026-09-09。范围：独立原生 `assert()` 的正向及可证明补集类型事实、严格布尔字面量比较、数组存在性、静态描述参数、同块作用域和修改失效。

## 已完成

- `assert($value instanceof Type)`、`assert($value !== null)`、`assert(is_string($value))` 及相应的 `\\assert(assertion: ...)` 将类型事实限定在当前 `compound_statement` 的后续范围。
- PHP 官方签名允许可选 `Throwable|string|null $description`。当前精准子集支持第二参数为静态字符串或 `null` 的位置形式，以及 `assertion:`/`description:` 命名参数和命名换序形式；动态描述可能在求值时产生副作用，因此保持 unknown。依据：[PHP assert 手册](https://www.php.net/manual/en/function.assert.php)。
- 肯定 `&&` 中每个必然原子均被记录；`||`、嵌套调用、动态描述、参数展开及残缺表达式保持 unknown。
- `assert(!($value instanceof Type))` 会从层级完整的有限对象 Union 排除目标及其已知子类；`assert(!is_string(...))`、`assert(!is_null(...))` 等精确谓词会从有限 Union 排除已证明成员。mixed 和无法表示的对象补集保持 unknown。
- `is_numeric()` 为 true 时可能得到 int、float 或 numeric-string，但 false 时仍可能得到非数字 string；因此否定事实只排除一定满足谓词的 int/float，不错误排除 string。
- `assert($value !== false)`、`assert(false !== $value)` 及对应严格相等形式支持布尔字面量位于任一侧。`T|false` 排除 false 后保留 `T`，`bool !== false` 得到字面量 `true`，mixed 严格等于字面量可得到该字面量；mixed 的否定补集与宽松 `==`/`!=` 保持 unknown。
- `assert(isset($data['key']))` 移除可选缺失与 null，`assert(array_key_exists('key', $data))` 只移除可选缺失并保留显式 null；两者沿安全字面量数组路径应用现有修改失效规则。
- 参数、断言前由 `mixed` 或 nullable 类型建立的局部变量、直接属性及最多 16 层安全字面量 array shape 路径使用同一事实；内建谓词必须解析为全局内建函数，命名空间同名函数不会提供事实。
- 成员补全、Definition、成员链和参数类型诊断共用解析后的实际类身份。
- 后续赋值、复合修改、自增减、`unset`、引用绑定、引用 foreach 或已证明按引用调用使直接变量事实失效；属性方法调用和 array offset 写入沿现有目标稳定性规则失效。
- Semantic snapshot 升至 schema 61，旧 schema 缓存会重建。

## 真实项目依据

Winstar 当前在 `BlogPostCategoriesService.php` 与 `BlogDatasetEntity.php` 中使用 `assert($repo instanceof BlogPostsEntityRepository)`。本增量针对该真实模式实现，不改动 Winstar 业务源码。

使用包含后续严格布尔 shape 精化的最终 schema 63 构建，对 Winstar 做只读 Composer 索引：1,934 个项目 PHP 文件完整进入索引，总计载入 9,999 个文件、37,736,007 字节。依赖因 10,000 文件预算截断，因此整体 `complete=false`，但 `projectComplete=true`。上述两处源码在 assert 后均能补全 `createQueryBuilder`，Definition 均落到 `vendor/doctrine/orm/src/EntityRepository.php`；这项结果只证明相关项目文件与已载入 Doctrine 声明，不扩展为依赖索引完整。结构化结果保存在 `/tmp/php-native-assert-boolean-winstar-20260909.json`。

## 验证

- `pnpm typecheck` 与 `pnpm lint` 通过。
- `pnpm test` 通过：15 个组件共 454 项，根包 30 项；其中 Parser 54、Semantic 207、Language Server 95 项。
- `pnpm verify:packages` 通过，15 个组件 tarball 均从隔离消费者安装并验证。
- PHP fixture 通过 Winstar PHP 8.5 `bin/php-runtime -l`；扩展测试 TypeScript 编译通过。
- `pnpm package` 与 `pnpm verify:vsix` 通过，主扩展及 Open Source/Recommended 两个扩展包内容均验证通过。`php-companion-0.4.5.vsix` SHA-256 为 `d248f00f761bc3b4c00caca6010754e9d28c762d6d4e67e8312e026151b69193`。
- VS Code 1.136.2 打包宿主在全新隔离 profile 中通过并以 0 退出；宿主断言覆盖两参数描述、命名换序、`!is_null`、有限 Union 否定 `instanceof`、严格 false 排除的成员补全与 Definition、七条原生 assert 精确参数诊断，以及按引用调用、nullable、对象和 false 重赋值后的失效。输出保存在 `/tmp/php-boolean-ternary-flow-host-20260909-114229.out`，VS Code 日志位于 `/tmp/php-boolean-ternary-flow-vscode-logs-20260909-114229`。
- 最终宿主日志未出现 `AssertionError`、测试失败、超时、权限/文件错误、未处理异常、broken pipe 或 write-after-end。无桌面 DBus、无 GitHub token 及 VS Code 自身 `url.parse()` 弃用信息属于隔离环境噪声。
