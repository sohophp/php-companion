# 准备引用的文件读取开销

2026-10-11。准备引用的新鲜度校验改用callback-backed stat/readFile，减少Promise FileHandle开销；仍按最多八文件读取、先校验regular file及大小、预留总字节预算，再按原顺序发布。完整当前/旧候选、取消、项目epoch和打开缓冲区保护保持。

同查询内缓存打开文档的路径与URI对应关系，每次检查实际URI成员，根别名变化会清除路径缓存；内容和文档对象仍从实时store取得。同一URI修改不会复用旧文本。旧源码大小写转换也改为每份源码一次。

正常bundle的PHP7.2/8.5 × progressive/experimental四项真实读取竞态通过：观测兼容Promise与callback读取，在实际读完成后暂停，打开新的未保存缓冲区并拒绝旧磁盘覆盖；第二次暂停期间修改同一URI，取消后下一查询精确恢复全部调用者。原十项新鲜度协议保持，合计十四项通过。首轮与最终轮是相同测试身份，不计为二十八项。严格构建、正常bundle及定向Lint通过。

固定66079文件项目，callback-only正常单次为 **1149ms**，最终路径复用构建为 **1169ms**，此前正常构建为1351ms；完整188引用、Definition1、完整位置摘要及四个继承/vendor锚点保持。这些单次结果不证明P95，路径复用没有额外延迟改善证据。原1000ms门槛两次均失败，reload未执行，检查器逐字保持。

[机器报告](prepared-reference-callback-reads-2026-10-11.json)；[终态审计](../../../.vscode-test/d1826-reference-callback-terminal-audit.json)；[证据归档](../../../.vscode-test/d1826-reference-callback-archive/manifest.json)。首轮旧源码/正常资产及测试快照与冻结摘要核对，最终366测试输入和两次项目/工具输入、进程/缓存清理核对。最终正常bundle SHA256为`87e7845725f3ab4c53753861431c21e61b05ed28949474bd425b4246d4defd83`。

更新F04-REF-07的既有四项说明，170编号/14家族、未完成大项26保持。当前完整LSP/六流程、1秒性能及编辑器/平台/Remote和完整F13/P9/R4继续；原1488项完整回归属于旧构建，日常Profile未更新，未提交或发布。
