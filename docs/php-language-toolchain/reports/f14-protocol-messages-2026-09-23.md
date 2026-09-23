# F14 Language Server 查询错误与诊断参数本地化

日期：2026-09-23。References、Symfony 服务/Controller 查询、类型加载等 LSP 请求的取消、文档变化、索引不完整与有界查询错误按客户端界面语言输出。References 索引不可用时的警告弹窗也使用同一语言；错误代码和成功结果不变。未使用的导入、未解析成员及非静态成员诊断中的 `class/function/const/method/property/constant` 参数标签已翻译，默认英文文案保持原样。

真实 `zh-CN` stdio 回归在关闭索引后查询类引用，确认返回 `RequestFailed` 中文说明，并发出中文 `window/showMessageRequest` 警告；另验证中文导入、未解析方法和非静态方法诊断。现有英文 stdio 回归和协议文案专项测试通过。Language Server TypeScript 构建、定向 Vitest、ESLint 与差异检查通过。

本轮只提交源码和验证记录，未冻结新 Alpha 候选。内部 Provider/索引输出日志及其他协议响应仍需继续审计，F14 最终验收保持开放。
