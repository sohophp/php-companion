# SoPHP Core 源码里程碑核验

日期：2026-10-03。本报告记录提交前终态，实际提交号与候选安装记录由交付记录保存。

## 范围

140 项 Core runtime 与所属包源码、测试路径：根 manifest、Core src、Parser、PHPDoc、Runtime Probe、Index、Semantic、Semantic Provider／Host、Language Server。配合已提交的 phpstorm-stubs 数据层 2187f0f，保存声明补全、内置签名消费、数组回调类型推断、未保存编辑、协议及引用准备进度验证。保持原分支和其它未提交改动；不推送或发布。

## 验证终态

- 完整 LSP stdio：33 文件，510/510，通过且零跳过，1402.57 秒，原会话 53345 退出 0。
- Core C2 隔离宿主：65 条流程证明，原会话 52421 退出 0。
- 根 TypeScript noEmit；支持包 175 项通过：Parser 100、PHPDoc 21、Runtime Probe 30、Semantic Provider 14、Provider Host 10。
- 当前语义全量 1342 项及 D42 定向 36 次 LSP 查询通过；实项目 200 次类型切换补全 P95 18.07 ms。Windows 四次可见 Enter／Tab、接受文本及 Undo/Redo 通过。以上是自动化证据，不算真人 WSL 验收。
- 以 HEAD 2187f0f 加上述 140 项路径独立复现：24 包编译、Core bundle、根 noEmit 通过；七项 runtime 资产与当前根构建 SHA256 一致。独立冒烟语义 5、stdio 4 项通过。临时源码已清理。
- 3002 项冻结输入在完整回归终态逐字一致，冻结已释放。

原日志保留在 /tmp/sophp-core-checkpoint-{stdio,c2,support-tests,independent-direct-build,independent-smoke}.log；结构化证据见同名 JSON。

## 真人测试范围与限制

重载 WSL 窗口后，在独立 Composer 项目检查声明关键字及名称过滤、public／魔术方法、return 接受后的空格、构造函数与实参、成员／数组回调、未保存编辑和 Undo/Redo，再进行日常编码。记录明确复现步骤即可。

外部格式化器的可选修补未纳入本轮 Core 更新，默认格式化缺口仍未收口。VS Code 1.140 批量输入的 getItemsByProvider 异常已在最小提供者复现，仍属未解决限制。准备引用的终态自动验证通过，真实 WSL 与 Symfony 组合需要真人反馈。
