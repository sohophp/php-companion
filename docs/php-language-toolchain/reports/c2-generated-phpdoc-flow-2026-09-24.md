# C2 生成 PHPDoc 后的类型反馈

日期：2026-09-24。测试使用当前 Open Source Pack 源码、冻结的外部扩展 Profile 和 PHP DocBlocker 2.7.0，在隔离 VS Code 1.139.0 中创建独立 Composer 项目。没有修改业务项目，也没有为这次源码增量打包 VSIX。

在 PHP 7.2 和 8.5 配置下，宿主用真实 `type` 输入和补全生成 `@param array $items`，再未保存地改为 `list<AlphaDocItem>`。SoPHP 的成员补全显示 `itemAlpha`，Hover 和 Definition 指向 Alpha 方法。把注释改为 `list<BetaDocItem>` 后，补全切换到 `itemBeta`，原 Alpha 调用不再指向旧声明，Hover 不保留旧方法；随后把调用改为 `itemBeta()`，Hover 和 Definition 都指向 Beta 方法。两次宿主退出码均为 0，日志为 `/tmp/sophp-c2-generated-phpdoc-final-php72-20260924.log` 与 `/tmp/sophp-c2-generated-phpdoc-final-php85-20260924.log`。

同一宿主把生成的原生兼容 `@param integer` 临时改成与原生 `int` 冲突的 `@param string`：默认 `onDemand` 出现一条 `php.phpdoc.type-conflict`，警告范围只覆盖 `string`；未保存地改回后清为零。修复前这条明确冲突在默认模式完全漏报。语义层现在对不完整索引只接受当前文件中原生与 PHPDoc 都是简单标量的冲突；涉及类关系、模板和跨文件继承的判断继续要求完整索引。PHP 7.2/8.5 的真实 stdio 正反例和语义测试均通过。

快速编辑的 C2 独立宿主也复测通过：`never` 诊断保持 10 → 7 → 10，最终快速编辑 7 条；同文件参数诊断保持 5 → 0。该轮记录的空白时间为 121 ms，是一次宿主样本，不是分布或性能承诺。动态类型、复杂 PHPDoc 泛型关系、其它 PHP 次版本、Remote 与长时间编辑仍在 C2/C4 后续门槛内。
