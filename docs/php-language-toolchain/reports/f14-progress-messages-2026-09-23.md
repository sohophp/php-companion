# F14 Language Server 进度文案本地化

日期：2026-09-23。Language Server 的项目索引、PHP 符号候选扫描、Symfony 服务引用和 Controller 上下文搜索进度标题与状态按 LSP 客户端界面语言输出。项目路径、文件数、缓存数和百分比保持原样；默认英文文案保持原样。

真实 `zh-CN` stdio 客户端启用 `window.workDoneProgress` 和 progressive 索引，确认收到“准备 PHP 引用”及“发现 Composer 项目”的 `$/progress` 开始事件。专项测试验证中英文项目/依赖阶段、文件数、路径和 Symfony 进度标题。Language Server TypeScript 构建、定向 Vitest、ESLint 与差异检查通过。

本轮只提交源码和验证记录，未冻结新 Alpha 候选。Provider 与索引输出通道的警告/错误日志仍有英文文本，继续作为 F14 开放项。
