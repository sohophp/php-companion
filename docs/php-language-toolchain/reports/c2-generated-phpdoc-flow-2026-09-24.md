# C2 生成 PHPDoc 后的类型反馈

日期：2026-09-24。测试使用当前 Open Source Pack 源码、冻结的外部扩展 Profile 和 PHP DocBlocker 2.7.0，在隔离 VS Code 1.139.0 中创建独立 Composer 项目。没有修改业务项目，也没有为这次源码增量打包 VSIX。

在 PHP 7.2 和 8.5 配置下，宿主用真实 `type` 输入和补全生成 `@param array $items`，再未保存地改为 `list<AlphaDocItem>`。SoPHP 的成员补全显示 `itemAlpha`，Hover 和 Definition 指向 Alpha 方法。把注释改为 `list<BetaDocItem>` 后，补全切换到 `itemBeta`，原 Alpha 调用不再指向旧声明，Hover 不保留旧方法；随后把调用改为 `itemBeta()`，Hover 和 Definition 都指向 Beta 方法。两次宿主退出码均为 0，日志为 `/tmp/sophp-c2-generated-phpdoc-final-php72-20260924.log` 与 `/tmp/sophp-c2-generated-phpdoc-final-php85-20260924.log`。

同一宿主把生成的原生兼容 `@param integer` 临时改成与原生 `int` 冲突的 `@param string`：默认 `onDemand` 出现一条 `php.phpdoc.type-conflict`，警告范围只覆盖 `string`；未保存地改回后清为零。修复前这条明确冲突在默认模式完全漏报。语义层现在对不完整索引只接受当前文件中原生与 PHPDoc 都是简单标量的冲突；涉及类关系、模板和跨文件继承的判断继续要求完整索引。PHP 7.2/8.5 的真实 stdio 正反例和语义测试均通过。

快速编辑的 C2 独立宿主也复测通过：`never` 诊断保持 10 → 7 → 10，最终快速编辑 7 条；同文件参数诊断保持 5 → 0。该轮记录的空白时间为 121 ms，是一次宿主样本，不是分布或性能承诺。动态类型、复杂 PHPDoc 泛型关系、其它 PHP 次版本、Remote 与长时间编辑仍在 C2/C4 后续门槛内。

随后扩展同一完整 Pack 宿主操作：把未保存的 `@param` 从 `list<BetaDocItem>` 改成 `list<AlphaDocItem|BetaDocItem>`，两个类均有 `itemCommon()`，各自另有独有方法。修复前补全错误地同时显示 `itemAlpha` 和 `itemBeta`；`foreach` 元素从 PHPDoc 类型转为成员目标时丢失了联合类型的多个候选。修复后补全只显示 `itemCommon`，`itemBeta()` 不再跳转到 Beta 声明。PHP 7.2 和 8.5 配置的 VS Code 1.139.0 完整成员 Profile 均以退出码 0 通过；语义层还加入独有成员不可跳转和未解析联合分支不可提供确定补全的回归。该检查覆盖 `list<A|B>` 的这一条编辑路径，不能推论所有复杂 PHPDoc 泛型已完成。

下一轮检查嵌套集合与联合数组形状：`@return array{groups: list<list<A|B>>}` 经函数返回、局部赋值和两层 `foreach` 后，补全只保留 A/B 公共方法，独有方法没有 Definition。发现原生 `array` 参数没有接受 `array{item: A}|array{item: A, other: int}` 的安全 PHPDoc 精化；修复后共有 `item` 键可补全。`array{item: A}|array{other: int}` 仍不能安全读取 `item`，元素投影现要求每个非 null 分支都包含该键。原生 `array` 与 `array{item: A}|string` 冲突时继续拒绝精化。完整 Pack 宿主只统计 Method 类补全；VS Code 的普通文本词语建议不代表 SoPHP 成员结果。PHP 7.2/8.5 的 VS Code 1.139.0 宿主均退出码 0；Semantic 318 项、Language Server 330 项通过，另有 1 项按原设置跳过。本轮未打包 VSIX。

后续按同一数组形状比较补全、Hover、Definition 与诊断：共有 `item` 键的 `A` 方法可跳转并显示 Hover，传给 `string` 参数产生一条确定的 `php.argument.type-mismatch`；有分支缺键时不提供该方法的语义结果，也不产生凭单一分支推断的参数错误。最初诊断漏报，是实参取型读取了参数 PHPDoc 却未接受其可安全索引的元素类型。修复限定在未重赋值、未发生影响该键的偏移写入、未通过引用修改的参数上；动态偏移写入和相关祖先路径写入使类型事实失效。既有 `isset`、嵌套数组路径及原生断言用例曾暴露过宽与过窄的失效范围，调整后语义 318 项重新通过。PHP 7.2 与 8.5 的完整 Pack 宿主均在默认 `onDemand` 下通过上述四项操作，退出码均为 0。本轮仍未打包 VSIX。
