# PHP 8.3 动态类常量访问验收

日期：2026-09-13。范围：`Type::{$name}` 的静态可证明名称、导航、字面量类型传播与版本边界。

## 已实现行为

- Parser 从 PHP grammar 的动态名称包装中恢复字符串字面量、局部变量、常量表达式、纯字符串拼接及 unknown 事实，并保留静态类型接收者。
- Semantic 只解析唯一且当前作用域可见的类常量。字面量名称、从赋值到访问之间未读取或修改的局部字符串、唯一字符串常量别名及无转义纯字符串拼接受支持。
- 唯一解析结果提供 Definition；可静态求值的常量 literal 进入直接调用、局部赋值与参数类型诊断。
- 动态输入、已修改或提前读取的名称、不可访问/歧义常量、复杂表达式和无法静态求值的常量保持 unknown，不产生猜测诊断。
- 类常量 Rename 遇到动态常量访问时继续拒绝，避免遗漏运行时字符串引用。
- 目标版本低于 PHP 8.3 时发布 `php.version.unsupported`，PHP 8.3 及以上接受该语法。Semantic snapshot 为 schema 69，Language Server 持久缓存为 `semantic-v40`。

## 依据

- [PHP 8.3 发布说明](https://www.php.net/releases/8.3/en.php#dynamic_class_constant_fetch)
- [PHP RFC: Dynamic class constant fetch](https://wiki.php.net/rfc/dynamic_class_constant_fetch)
- [PHP 类常量手册](https://www.php.net/manual/en/language.oop5.constants.php)

PHP 8.3 允许用表达式结果动态选择类常量。本批只把不会执行项目代码、且能唯一证明名称和可见声明的子集接入语义模型。

## 当前验证

- Parser 56 项全量测试通过，新增五类动态名称事实并保留嵌套静态常量访问。
- Language Spec 50 项全量测试通过，新增 PHP 8.2 拒绝、PHP 8.3 接受的精确范围。
- Semantic 242 项全量测试通过，覆盖 Definition、literal 参数诊断、局部传播、不可见常量、动态/修改/提前读取反例和 Rename 拒绝。
- Language Server 149 项全量测试通过；真实 stdio 使用 PHP `>=8.3` Composer 项目验证唯一错误诊断、Definition 与修改后抑制。
- Winstar PHP 8.5 runtime wrapper 对独立 `Type::{$name}` fixture 完成语法检查与执行，输出 `dynamic-class-constant-runtime-ok`。
- `pnpm check` 通过：15 个组件 584 项、根扩展 33 项，共 617 项；包含类型检查、ESLint、组件/扩展测试、三份 VSIX 打包和结构校验。
- `pnpm verify:packages` 通过；15 个组件 tarball 均在隔离消费者中完成真实安装与导入。
- 同一最终主 VSIX 在 VS Code 1.137.0 的纯净 Profile 与七插件 Open Source Profile 中均以退出码 0 完成；宿主现场创建 PHP 8.3 fixture，验证唯一错误诊断、Definition 与修改后负例。纯净日志：`/tmp/php-companion-php83-dynamic-constant-pure-final-logs-20260913-1902`；组合日志：`/tmp/php-companion-php83-dynamic-constant-open-source-final-logs-20260913-1905`。
- 冻结第三方插件目录含 1,370 个文件，组合测试后聚合 SHA-256 仍为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。
- 最终 VSIX SHA-256：主扩展 `cfa8056871334210e38193610d138ad0c7c2cb4be8d0266afcacbc45a2016468`；Open Source Pack `07dda3f6facc060cc865e7c72d97ee1bcf6b9e06d863a708b4fe8ef7a471ebbb`；Recommended Pack `b3cb90551642124c8bd4cb7bc1b4f11de527738f8847ba86648616b95c37bdbe`。

## 明确限制

- 不执行动态名称调用、插值、转义、任意变量数据流或运行时反射。
- 不推断无法归约为安全 literal 的常量值。
- 当前不会自动改写动态名称字符串参与类常量 Rename。
