# @php-companion/interop

SoPHP 与模板语言工具之间的编辑器无关、版本化互操作契约。它只定义能力协商、Controller 模板上下文、PHP 类型/定义位置、失效通知和跨语言 Rename 准备消息，不依赖 PHP/Twig AST、LSP 或 VS Code。Controller 变量可附带一个或多个精确 PHP context-key 来源范围，供消费者在完整性校验后组合跨语言编辑。

协议版本不一致或缺少必需能力时 `negotiateInterop` 明确拒绝桥接。`mergeControllerContexts` 保留全部来源；变量未出现在每个来源时标记为可选，不确定类型保持 `unknown`。`toTwigMetadataContext` 只用于兼容 TwigPlus 已有 metadata schema，不改变 Twig 作用域和成员访问规则的所有权。

Controller 变量可附带 `valueLocation`，标明字面量 `render()` 关联数组中值表达式的源码范围。SoPHP 在相同源码快照中用语义工作区推断该表达式类型；无法证明时仍输出 `unknown`。传给 TwigPlus 的公开类型成员同时保留 PHP 方法名和可推导的 getter 属性别名。
