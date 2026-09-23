# F14 Symfony Provider 输出通道文案本地化

日期：2026-09-23。Language Server 的语义与路由 Provider 注册冲突、Symfony 容器/事件/Controller 快照失败，以及路由 Provider 查询失败警告，现按 LSP 客户端语言输出。Provider ID、错误码和外部进程返回的错误详情保持原文；英文默认文案保持原样。

验证：Language Server 类型检查与构建、相关 ESLint、2 项文案测试通过。真实 `zh-CN` stdio 客户端的无效内置语义/路由 Provider 测试收到两条中文输出通道警告；既有英文完整路由 Provider stdio 用例通过，覆盖不完整快照和多个权威 Provider 的警告。

本轮仅提交源码和验证记录，未生成 VSIX。索引、缓存与监听器等其他输出通道日志仍待本地化；F14 最终验收保持开放。
