# C2：switch 条件与表达式边界（2026-10-04）

## 改动

冻结语料 D16 的 switch case 表达式入口现在与 match 条件共用被比较值类型来源。枚举建议及兼容变量排序使用该事实，所有普通变量仍保留。PHP switch 是宽松比较，不把类型不兼容的候选直接过滤。分支正文、嵌套调用与一元运算不继承条件契约；枚举声明 case 名称的过滤保持原所有者。

关键词上下文新增 match 条件与 switch case 值的表达式识别，包括现有预算内的函数末尾未闭合恢复。由此 `case tr` 返回合法表达式 `true`，不会混入语句 `try`。未知或 string 被比较值中 `true` 仍是合法表达式关键词；旧枚举推荐则在类型变化时撤回。

临时恢复仍使用 131072 字符、32 层分隔符和完整语法验证；不发布临时事实。没有增加设置或新的建议提供者。

## 验证与原始失败

- `/tmp/sophp-switch-condition-baseline.log`：6 失败、4 通过。初版 fixture 有一处不合法 return switch，已修正；其完整枚举和未闭合条件的缺失仍由有效用例复现。
- `/tmp/sophp-switch-condition-fixed.log` 保留测试迁移误改断言名称的失败，修正测试后不算产品缺陷。
- `/tmp/sophp-switch-condition-lsp.log`：7.2 case tr 的首项错误为 try，8.5 通过；此失败触发表达式上下文修复。
- `/tmp/sophp-switch-condition-context-lsp.log` 不算最终证据：测试期望把合法 true 一并删除，且修改测试时该进程已开始。保留原日志并结束原句柄，再在冻结测试下重跑。
- 最终完整语义：81 文件、1393/1393、零失败，64.63 秒，`/tmp/sophp-switch-condition-context-semantic.log`。包含原 match 16 项、switch 11 项与现有全套语义。
- 最终真实 stdio：2 文件、3/3，5.30 秒，`/tmp/sophp-switch-condition-final-lsp.log`。PHP 7.2 使用无枚举的 bool fixture；PHP 8.5 使用 enum fixture。两版各 5 次未保存查询，核对完整/未闭合条件、候选首位、精确替换范围、try 不进入列表及磁盘不变；另保留 match 回归。
- 隔离 Linux VS Code 1.140.0：当前 enum 建议、替换范围、未保存改为 string 后撤回、Undo/Redo 和磁盘不变通过，`/tmp/sophp-switch-condition-host.log` 退出 0。
- 语义及服务器包重建后生成 bundle；宿主测试编译、定向 ESLint、git diff --check 通过。

## 交付边界

这是源码增量，当前尚未提交；不打包、推送或更新 Profile。宿主 Provider 调用不是可见弹窗、Enter/Tab 或真人 WSL。没有重跑全量协议或性能矩阵，不将这些定向证据推导为 C2/C4 完成。继续原路线图。


后续可见验收实际发现枚举匹配文本缺口并修复。与本批 switch 增量一起收口为必要源码里程碑；前文未提交为当批状态。八次可见首项／Enter／Tab 精确文本和 Undo/Redo 证据见 [可见接受记录](completion-comparison-visible-2026-10-04.md)，原失败不删除。
