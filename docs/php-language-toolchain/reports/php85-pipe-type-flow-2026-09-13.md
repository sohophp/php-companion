# PHP 8.5 Pipe 类型传播验收

日期：2026-09-13。范围：PHP 8.5 `|>` 表达式从输入值到函数、静态方法、实例方法和显式闭包的逐段类型传播。

## 已实现行为

- 使用 Tree-sitter 的左结合 `binary_expression` 和实际 `|>` operator 字段逐段求值，不从源码正则猜测括号或结合顺序。
- 每一段都必须能解析为 PHP 8.5 允许的单参数 callable，并验证必填参数数量、首参数非引用、输入类型兼容和唯一返回类型。
- 函数、静态方法、已证明接收者的实例方法，以及具有完整参数/返回类型的 arrow function 或 closure 可以组成流水线；前一段的返回类型作为后一段的输入类型。
- 最终返回进入已有局部值模型，因此成员补全、Definition 和参数类型查询共享同一事实。
- 动态 callable、按引用首参数、输入不兼容、重载返回不一致、未绑定 callable 模板、`mixed`、`void`、无法解析的输入或超出控制流深度预算时保持 unknown。
- 未知接收者的成员 Definition 保持为空；成员名即使恰好匹配当前命名空间类型，也不会回退到该类型声明。

## 依据

PHP 官方手册规定 `|>` 将左侧值作为右侧 callable 的单个参数，并以 callable 的返回值作为表达式结果；右侧可以是 Closure、first-class callable 或实现 `__invoke()` 的对象。本批只启用其中能够由当前索引完整证明的静态子集：

- [PHP Functional Operators](https://www.php.net/operators.functional)
- [PHP 8.5 release announcement](https://www.php.net/releases/8.5/en.php)

## 验证

- Semantic 正反例覆盖两段函数、静态方法接实例方法、显式 arrow、输入不兼容、按引用及动态 callable。
- Language Server stdio 用真实 PHP 8.5 Composer 项目验证最终成员 Completion、Definition 及不兼容阶段的空 Definition。
- Extension Host fixture 覆盖真实打包扩展中的正向 Definition 和不兼容阶段抑制。
- Winstar PHP 8.5 wrapper 对 fixture 执行 `-l`，确认真实运行时接受语法。

- `pnpm check` 通过：15 个组件 579 项、根扩展 33 项，共 612 项；包含类型检查、ESLint、组件/扩展测试、三份 VSIX 打包和结构校验。
- `pnpm verify:packages` 通过；15 个组件 tarball 均在隔离消费者中完成真实安装与导入。
- 同一最终主 VSIX 在 VS Code 1.137.0 的纯净 Profile 与七插件 Open Source Profile 中均以退出码 0 完成。纯净宿主日志：`/tmp/php-companion-php85-pipe-sealed-pure-logs-20260913-1735`；组合宿主日志：`/tmp/php-companion-php85-pipe-sealed-open-source-logs-20260913-1741`。
- Open Source Profile 包含 TwigPlus、Symfony Language Tools、Red Hat YAML、PHP Debug、PHPUnit、PHP CS Fixer 与 EditorConfig；冻结第三方目录运行前后均为 1,370 个文件，聚合 SHA256 均为 `1f5c87b2dffb64ed8801e6b303d728772b7978d181447ea1bd2ab5dd97a97aad`。
- 最终制品 SHA256：主扩展 `99c4817127d33801b52a1db26c300d5ab3e8ae7170dd7491b95ff5ca7374032a`；Open Source Pack `bdf109b337b2220730b451a44c007a2385d3116fc003a3ac3ac9082a1c5dbd66`；Recommended Pack `19fe1b672ca16ee426c54cad3b76365e0fc0bca13203db18c697e53480a2015a`。
