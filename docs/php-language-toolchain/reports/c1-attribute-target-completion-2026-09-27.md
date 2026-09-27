# C1/C2：Attribute 目标位置补全

日期：2026-09-27。仅修改 SoPHP 隔离工作树、独立 Composer 夹具和测试；没有修改业务项目、打包 VSIX 或安装用户 Profile。

先前 `#[...]` 已只建议实际标记为 Attribute 的类，但 `#[\Attribute(\Attribute::TARGET_METHOD)]` 声明的类仍会出现在 class 的 Attribute 位置。PHP 的 [Attribute 类规则](https://www.php.net/manual/en/language.attributes.classes.php)允许声明目标位掩码，未指定时默认允许所有目标；不匹配目标的错误通常在反射实例化时才显现。编辑器补全现在读取类头标记的参数，并在已完成的 Attribute 语法位置按 class、function、method、property、class constant、parameter 和 PHP 8.5 constant 目标筛选。`Attribute` 的命名空间和 `use` 别名按现有名称解析；`TARGET_*` 与 `IS_REPEATABLE` 的简单位或表达式可证明后才筛选。动态、复杂或无法解析的标志表达式保持候选，避免猜测。

声明层保留标记及参数，使未打开的 Composer 类型也能使用此筛选；磁盘语义缓存版本从 v64 升到 v65，避免旧缓存缺少标志元数据。C2 宿主验证了未保存声明在 class 目标、无 Attribute 标记、method 目标之间变化时，另一文件的补全依次出现、撤回、恢复、撤回、恢复。

验证：解析器 88/88、语义 433/433、Language Server 392 通过/1 跳过，`pnpm build`、测试入口 TypeScript、改动文件 ESLint 和 `git diff --check` 通过。Language Server 日志为 `/tmp/sophp-c1-target-lsp-20260927.log`。VS Code 1.139.1 Linux x64 的 10 项 Open Source Pack C1 源码宿主退出码 0，未打开的 Composer class/method 目标类分别正确筛选；最终源码日志 `/tmp/sophp-c1-attribute-target-pack10-final-20260927.log`。同一组合的 C2 源码宿主退出码 0；日志 `/tmp/sophp-c2-attribute-target-pack10-20260927.log`。

本次没有推断动态标志表达式，也没有覆盖所有内建 Attribute 的目标元数据、重复使用限制和构造参数适配。未闭合的 `#[` 输入缺少可证明的声明目标时仍保留候选。真实 WSL Remote、已安装 0.4.8 候选和其它平台仍待验收；源码增量尚未进入该候选。
