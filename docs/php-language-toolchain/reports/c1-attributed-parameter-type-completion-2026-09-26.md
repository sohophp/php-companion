# C1 参数 Attribute 后的类型补全

日期：2026-09-26。仅修改 SoPHP 源码与独立夹具，未修改业务项目，未生成 VSIX。

PHP 8 参数 Attribute 后输入类型名时，例如 `function run(#[MapRequestPayload] Inv $request)`，原来的补全上下文识别未越过 Attribute；带参数的 `#[Autowire(service: '...')]` 还会把 Attribute 内的括号当成参数列表起点。现在从函数声明的参数列表起点追踪括号、方括号和引号，只在完整 Attribute 后的参数类型位置提供类建议。Attribute 字符串中的逗号不再切断当前 PHP 参数；普通默认值表达式仍不触发类型补全。

语义定向用例先复现空结果，修复后覆盖无参/带参 Attribute、引号内逗号、提升属性、联合类型、完整声明及表达式反例。随后又以 `#[MapRequestPayload(validationGroups: ['create', 'write'])]` 复现嵌套数组被提前截断的问题，改用成对方括号识别后修复。语义包 **348/348**。真实 stdio LSP 的独立 PSR-4 用例通过，未打开文件的 `Invoice` 可在含嵌套数组的 Attribute 后被建议。最终源码通过语义包与语言服务构建、根扩展 esbuild、扩展测试 TypeScript、相关 ESLint 和差异检查。

首次 C1 Extension Host 试验使用默认 `phpVersion: auto`，而夹具声明 `php >=7.2`、本机默认 `php` 为 7.2.34；在 PHP 7 目标下 `#[...]` 不作为 Attribute，故新增 PHP 8 断言失败。这是测试版本前提错误，现仅在明确的 PHP 8 目标或探针运行时为 PHP 8 时执行该场景。用 `PHP_COMPANION_TEST_C1_PHP_VERSION=8.5` 重跑 VS Code 1.139.1 Linux x64 Core 源码宿主后，联合参数、联合返回、带参 Attribute 参数和交集属性四处均得到唯一跨命名空间类建议及导入编辑；原有六项编辑查询、未保存切换、vendor 和多根链通过，退出码 **0**。嵌套数组修复后又以明确 PHP 8.5 和 `onDemand` 模式重跑同一源码宿主，四处建议及原有链仍通过，退出码 **0**。

这些是源码宿主和独立 Composer 夹具结果；当前冻结候选 `15a5254` 不含本增量，安装后的真实 WSL Remote 和跨平台仍待交付时验收。
