# phpstorm-stubs 数据层提交检查

日期：2026-10-03。当前用户授权在必要里程碑本地提交；不推送、发布、打包或更新 Profile。

## 独立范围

本里程碑只包含 `packages/language-spec` 的已审阅元数据、版本／运行时门控、合同测试、来源记录及许可文件，以及根目录的对应第三方许可声明。核心语义消费、声明补全、重构、宿主工具及其它历史报告继续留在原工作区，不混入这一提交。

固定来源仍为 JetBrains/phpstorm-stubs `e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681`。声明与运行时合同的逐项来源记录见包内 SOURCES.md；不把名称覆盖理解为全部签名或行为相同。

## 独立验证

临时目录复制当前 language-spec 源码和测试，解析器源码／package.json／tsconfig 使用提交 `32e7e6a` 的 HEAD 内容，而不是当前未提交解析器。解析器和 language-spec 分别构建成功；language-spec 全部 **15 文件、249/249**，22.07 秒。实际依赖沿用当前锁定的本地安装，未重新下载或执行上游 stub 声明。

原始日志 `/tmp/sophp-stubs-checkpoint-verification.log`；目录及完整基准 HEAD 记录 `/tmp/sophp-stubs-checkpoint-state.json`。这一验证证明元数据包与提交前 HEAD 的解析器兼容，不证明尚未提交的核心消费修复已包含在本里程碑。

当前完整 LSP 原会话 36905 仍运行，2986 项产品和测试输入无变化。其结果在 D40／D41 集中报告另行收口；不把尚未终态的协议登记为通过。stubs 数据检查也不代替真人 WSL 或完整 Pack。
