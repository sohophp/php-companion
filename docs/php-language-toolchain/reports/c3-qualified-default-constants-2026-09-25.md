# C3 跨命名空间方法生成：限定常量默认值

日期：2026-09-25。只修改 SoPHP 仓库；未修改业务项目，也未打包 VSIX。

## 问题与修复

接口实现、抽象方法实现和 Override 共用生成签名逻辑。此前会重写裸常量、类常量和 `new` 的类名，但复制 `namespace\LIMIT`、`Limits\RELATIVE_LIMIT` 或导入的命名空间别名常量时保留原文本。方法生成到另一命名空间后，这些默认值可能改变指向。独立 PHP 运行例子确认：同一个 `namespace\LIMIT` 在来源 A 为 5，复制到目标 B 后为 9。

生成签名现在识别带命名空间的常量名，分别按来源和目标文件解析；若指向不同，就写入来源常量的完整名称。扫描会跳过字符串、注释、类常量的类名以及 `new` 的类名，避免重复编辑。接口、抽象方法和 Override 沿用同一逻辑。

## 验证

- 语义测试覆盖 `namespace\LOCAL_LIMIT`、相对命名空间常量、导入别名常量及字符串原样保留；`packages/semantic/test/semantic.test.ts` 329/329 通过。
- 真实 stdio LSP 的 Override Code Action 输出来源常量完整名称；定向测试通过。
- VS Code 1.139.0 隔离 C3 源码宿主应用跨命名空间 Override，检查所有默认值、一次 Undo 和一次 Redo；宿主退出码 0。
- 扩展测试 TypeScript、改动文件 ESLint、Semantic 与 Language Server 构建通过。

这证明本次**已有文件的方法文本编辑**在隔离宿主中可撤销和重做；生成**新文件**的一次 Redo 仍是独立开放项。安装 VSIX、WSL Remote 和长期人工操作仍需候选验收。
