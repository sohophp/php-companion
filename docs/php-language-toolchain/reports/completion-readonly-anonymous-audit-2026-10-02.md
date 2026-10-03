# readonly 匿名类：独立诊断与原型

2026-10-02。状态：问题已复现，隔离原型通过；尚未接入产品源码。

[PHP 官方手册](https://www.php.net/manual/en/language.oop5.anonymous.php)说明 PHP 8.3 起支持 readonly 匿名类。当前解析树有 readonly_modifier，匿名类声明提取却固定 readonlyClass=false。因此 new readonly class extends Build 前缀只建议 BuildMutable，遗漏正确的 BuildReadonly。实际 PHP 8.5 的 readonly 匿名类继承 readonly 基类成功，继承 mutable 基类退出 255。

原型仅在 /tmp 复制的 parser 文件中，匿名类读取 readonly_modifier，未修改工作区或当前根 bundle。三个输入（普通匿名类、readonly、readonly 与注释）验证继承候选、声明标记、普通属性及提升属性的 readonly 一致性，全部通过。原型结合当前已构建语义引擎查询，不是正式产品测试、LSP 或编辑器验收。

正式接入须在完整协议原会话 9902 结束且 913 项冻结输入复核后进行。下一批增加 parser 和语义定向回归、PHP 版本边界、LSP 与隔离宿主。当前不重建运行中的回归输入。

[原始探针与隔离原型](completion-readonly-anonymous-audit-2026-10-02.json)。未打包、提交、推送或更新 Profile。

## 版本边界复现补充

当前 unsupportedSyntax 在目标 8.1／8.2／8.3／8.5 对 readonly 匿名类均返回空，原因是把匿名 readonly_modifier 归入 8.1 的 readonly property。实际 PHP 8.2 语法错误退出 255，8.4／8.5 运行退出 0；8.3 引入时间据官方手册。已生成仅 parser 修改的待应用补丁 `/tmp/sophp-readonly-anonymous-parser.patch`，不含原型导入绝对路径。

正式批次须同步修正匿名类的 PHP 8.3 语法门槛，以及声明／赋值诊断的 owner 版本边界，避免仅补全正确而旧版本接受非法语法。产品解析源码未变，913 冻结输入仍一致；当前完整协议继续观察原会话。

## 隔离候选联合证据

语法版本原型 18 项（匿名类 8.3、具名类 8.2、显式属性 8.1，各六目标版本）通过，并检查诊断范围只覆盖 readonly。语义原型三类赋值的 minimumPhpVersion 分别正确为 8.3／8.2／8.1；analysis 原型在目标 8.1／8.2 对匿名 readonly 报版本错误，8.3／8.5 才启用隐式 readonly 属性声明诊断，四项通过。

四份可审阅待应用补丁保存在 /tmp，包含 parser、语言规格、语义 minimum 事实和 analysis 门槛。原型曾因 /tmp 缺少工作区包解析和绝对路径的 CJS 打包失败，调整为真实依赖路径与保留外部包后通过。此类加载路径调整仅在原型，不会写入产品。

这些结果仍不是正式产品类型检查、真实 LSP 或编辑器证据。完整 stdio 原会话 9902 确认仍运行，本轮没有修改冻结输入，也未重启会话。

## 正式夹具准备与声明方边界

四项解析快照原型通过：普通匿名类、readonly、readonly 与注释、仅注释含 readonly；完整解析与声明快照相等，普通及提升属性标记正确。新增继承反例证明匿名子类从具名 readonly State 继承的 id 赋值合同仍为 PHP 8.2，由属性声明方决定，不被子类 PHP 8.3 的匿名 readonly 门槛覆盖。

四份正式回归文件已准备在 /tmp/sophp-readonly-anonymous-tests：parser 快照与属性、semantic 未保存父类候选与 owner minimum、analysis 版本边界、stdio 8.2／8.3／8.5 的 mutable→readonly→mutable 候选与诊断撤回恢复。尚未复制进产品测试目录，也未执行正式产品夹具；原型结果与后续正式门禁分开报告。
