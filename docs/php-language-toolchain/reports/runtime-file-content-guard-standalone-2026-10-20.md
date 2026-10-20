# 运行程序内容守卫：冻结包独立入口

2026-10-20。源码提交`71c7b40f`，Core与Symfony来自同次三包Alpha候选。已执行并通过原完整独立入口，实际退出0，耗时396.93秒，独立审计通过。

核对3830个冻结输入、99份编译JavaScript及16个包内运行资产；保留全部原断言、期限和一次主动崩溃恢复。语言服务器意外关闭计数为1（主动注入），重启失败为0，最终没有待处理版本刷新或重启任务。所属进程、显示服务和临时项目已清理。

本次通过解包VSIX载荷的`extensionDevelopmentPath`运行，未执行正式安装Profile验收，也不代表真人WSL、多小时使用、当前提交远程CI或复杂Controller性能通过。日常Profile未改。

证据：[独立审计汇总](runtime-file-content-guard-standalone-2026-10-20.json)、[原始审计](../../../.vscode-test/runtime-file-guard-standalone-2026-10-20/final-audit.json)。
