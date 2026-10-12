# PHPDoc magic method 参数与默认值

先前独立消费确认的两个缺口已修复：`@method` 参数类型出错会传播为标签错误并标记invalid，语义消费者撤销该方法事实；具体默认值不会截断后续参数。参数保存默认值文本，Signature Help和Hover显示源码中的真实默认值。合法相邻property标签、普通及嵌套Callable的Type=可选标记保持。

默认值结构支持带转义的字符串、数字、布尔/null、具名/类常量，以及嵌套短数组和array(...)，不执行常量表达式；解析深度有64层预算。错误范围限制在实际参数体内，不把合成Callable后缀的位置当成源码范围。语义快照升91、源码声明快照升9，旧90/8及更早快照拒绝；外层持久缓存与Doctrine facts保持各自版本。

## 当前验证

后续[Controller换代修复](controller-context-generation-refresh-2026-10-10.md)已完成同类并发反事实与新正常1,476项完整LSP；以下原失败和当时的验证边界仍保留。

| 范围 | 证据 |
| --- | --- |
| 完整PHPDoc | 66项通过，原40项加26项参数/默认值正反例；初始新增24项全部失败的记录保留 |
| 完整语义 | 23,725项通过，原23,720身份及重数保持，新增5项即时/延迟、旧事实撤销和三种快照恢复检查 |
| 新生产协议 | PHP7.2/8.5 × onDemand/progressive四项通过；实际默认值修改、错误shape/默认数组撤销签名与返回成员、恢复及磁盘原文不变；旧正常bundle四项均失败 |
| 静态检查 | 三包strict编译、正常production构建、根strict及变更范围lint通过 |
| 原完整stdio案例 | 更新Signature Help/Hover的两处旧null期望后，原整个案例通过；其余断言与操作未删减，两个字符串以外的文件内容逐字核对 |
| 完整LSP | 两次119文件/1,472项原入口，各1,471通过/1失败；失败均保留，当前完整单次门禁未通过 |

首轮完整LSP唯一失败是原stdio案例仍期待假null默认值；更新两个期望后该整个案例及第二轮完整运行中的它均通过。第二轮唯一失败为原Symfony上下文用例PHP8.5/progressive，在控制器删除后重建时context返回null；日志同时记录progressive-source-change的新索引开始。此用例在首轮同一正常资产通过，两轮互补覆盖全部1,472身份，但不能据此替代单次完整门禁通过，根因尚未确认，不重复等价全量尝试。

正常LS摘要为`893375b631c46d55d355c9e18c48d91d5ea04e6223bee7b1f68a9f1522c4e895`。最后完整运行29,969份冻结输入、链接和仓库状态保持，实际控制器/服务器/所属进程组结束；76份源码与原始结果归档。见[终态证据](../../../.vscode-test/d1612-magic-method-terminal-audit.json)及[同名JSON](phpdoc-magic-method-parameters-2026-10-10.json)。

语义首次完整测试有一个旧null默认值期望失败，改成真实文本后通过；第一次lint发现测试字符串的多余转义，保持字符串实际值修正后通过。两次完整LSP原失败、定向补验与静态检查均保留，未把补验当成完整全量运行。

## 支持依据与后续边界

参数/返回签名用途按[phpDocumentor的method说明](https://docs.phpdoc.org/guide/references/phpdoc/tags/method.html)核对；默认值结构参考[PHPStan的ConstExprParser](https://github.com/phpstan/phpdoc-parser/blob/2.3.x/src/Parser/ConstExprParser.php)中标量、常量和数组入口。本包未引入其依赖，默认值不作运行时求值或类型证明。

下一项先以受控交错定位重建时的Symfony上下文空结果。其它PHPDoc/高级类型、最新构建的宿主/平台/性能/长期与真人验收继续，Windows C2原失败及createFile fallback Redo限制保持。未额外关闭P2/P5/P9大项，路线图未完成大项26；日常Profile未更新，未提交、推送或发布，完整目标未完成。
