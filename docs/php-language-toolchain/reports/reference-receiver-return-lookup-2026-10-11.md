# 引用接收者的原生返回类型查询去重

2026-10-11。此前请求区间CPU采样中，`nativeMethodReturnTypeName`累计包含约152ms样本。本轮在接收者与完整声明层级加载后，按PHP大小写不敏感的owner/method身份去重原生返回查询。每个hydration调用创建局部Map，不跨查询或文档代次保留。PSR源文件查找仍保留所有原始大小写拼写，返回类型的实现加载、候选集合、预算和取消流程保持。

四组PHP7.2/8.5 × onDemand/progressive协议验证24个独立消费者、错误大小写先出现、继承原生返回类型与延迟vendor实现：cold精确25个位置；父类未保存返回类型修改后精确26个位置，24消费者和原vendor调用保持，新增返回类型实现也出现，磁盘原文保持。三项既有返回闭包/属性接收者协议通过。另十四项准备源新增/修改/恢复/删除与并行读取/打开缓冲区/取消竞态通过。定向Lint、严格语言服务器构建和正常生产bundle构建通过；选择的测试不作为全量回归。

固定项目正常选区查询得到完整188引用与Definition1、原完整摘要和四个继承/vendor锚点保持。单次总耗时 **2046ms**，此前正常单次 **2015ms**；本轮没有证明总延迟改善，原1000ms门槛继续失败，reload未执行。实际semantic复用为1ms，无named-candidates日志。66079项目输入与工具输入在测量前后保持，观察的进程与自有缓存均清理。

性能测量后仅加强测试的位置总数断言；测量时测试源码已按冻结摘要重建并核对，最终更强断言的四项测试独立通过。原采样与失败保留，不将函数去重本身报告为性能达标。

[机器报告](reference-receiver-return-lookup-2026-10-11.json)；[终态审计](../../../.vscode-test/d1809-reference-receiver-terminal-audit.json)；[证据归档](../../../.vscode-test/d1809-reference-receiver-archive/manifest.json)。正常bundle SHA256为`1ff2c04c4828254a23fcd330c942da08ca48b3c2950aa17d832243a26bc7f084`。新增F04-REF-08，168编号/14家族、路线图未完成大项26。新构建完整LSP/六流程、选区性能、编辑器/平台/Remote及完整F13/P9/R4继续，日常Profile未更新，未提交或发布。
