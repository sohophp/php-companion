# 已恢复引用后的后台预热顺序修复

2026-10-11。提前恢复原本已先返回完整188引用，但文件打开后的发布流程稍晚完成，又排入1500ms空闲预热，随后出现多余候选扫描。原检查器因此拒绝整个reload阶段。暂停openSourcePublication、先完成原缓存查询、再释放发布的受控流程在旧正常构建明确失败；仅暂停interop的首个控制未复现，两个结果均保留。

[语言服务器](../../../packages/language-server/src/server.ts)现在避免为正在查询的同一文档启动自动预热；已恢复结果与当前epoch、索引generation、打开文档版本集合、查询文档和源码摘要相符时，也跳过随后到达的自动空闲扫描。此判断只减少后台工作，不返回缓存结果；每次实际References仍执行原完整输入校验。显式选区预热、不同词元的选择、源文件变化后的失效和取消规则保持。

[跨进程回归](../../../packages/language-server/test/stdio.test.ts)增加晚到发布场景，使用真实1500ms预热计时器，保持原缓存、输入撤回和完整结果断言。旧正常bundle下该场景失败，新正常bundle下原跨进程整项通过；六文件62项缓存证据/引擎/清理/关闭相关测试通过，语言服务器严格构建、正常Core bundle重建及定向Lint通过。此处是一项包含多次实际服务器流程的测试，另543项stdio案例按名称筛选未执行，不计作新完整LSP回归。

同一66,079文件固定Winstar副本执行未修改的原提前恢复检查器：cold/reload均188及Definition1，完整位置摘要和继承/vendor四锚点通过；reload首次References2035ms，保留3500ms门槛。完整reload日志只有先于Provider的恢复与结果，不再出现候选扫描或Provider日志。工具235输入、定向360输入及项目输入终态独立核对，所观察的真实服务器/Provider/helper/驱动与自有缓存均已结束或清理；46文件归档包含原源码、失败/通过日志及当前正常八资产。

[机器报告](restored-reference-idle-prewarm-2026-10-11.json)；[独立终态审计](../../../.vscode-test/d1796-reference-prewarm-fix-terminal-audit.json)；[归档清单](../../../.vscode-test/d1796-reference-prewarm-fix-archive/manifest.json)。正常语言服务器摘要现为`b8a6df457165ab3dffa428dbc450ffa78ee987e9a987df2d5e30378fb989b53a`。此前122文件/1488项完整LSP仍绑定旧`a5033f60…`构建，不能移作本次新构建的完整资格。

本轮关闭该提前恢复失败的已复现路径，不将此前四个通过流程与新构建单项组合成完整六流程绿色。选区References总延迟门槛、完整新构建回归、其他平台/编辑器/Remote及F13/P9/R4继续；166编号/14家族、路线图未完成大项26。未更新日常Profile、打包、提交或发布。


选区查询的独立CPU采样已取得：当前正常新构建仍返回188及Definition1，cold总3016ms超过原1000ms，reload未执行；主线程请求区间2583样本与单调时钟对齐，连同六个worker线程共七份profile保留。源码新鲜度函数、逐文件stat/read/open/close及autoload排除判定有明显样本；主线程idle约1275ms不能全部归因于文件等待。这提示下一步审查新鲜度检查成本，不证明唯一根因或普通延迟资格。两次私有工具cwd准备失败均未启动LS，原错误保留，修正后的实际查询单独记录；未采用选区性能改动。[采样终态审计](../../../.vscode-test/d1798-selected-reference-cpu-terminal-audit.json)和[归档](../../../.vscode-test/d1798-selected-reference-cpu-archive/manifest.json)。
