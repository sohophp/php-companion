# F14 Language Server 代码操作标题本地化

日期：2026-09-23。Language Server 的 Quick Fix、提取/内联、整理导入、实现方法、生成构造方法/访问器与 Override 操作标题现在按 LSP 客户端界面语言输出中英文。操作种类、诊断关联、WorkspaceEdit 和生成的 PHP 代码保持原样；默认英文标题与既有单复数格式保持一致。

真实 `zh-CN` stdio 请求验证 `php.import.unused` 的 Code Action 返回“移除未使用的导入”。现有完整编辑器协议测试固定英文提取变量、内联变量、提取方法、移除参数和整理导入标题与编辑结果；标题专项测试固定单复数和中文变量/类名插值。Language Server TypeScript 构建、相关 Vitest、ESLint 与差异检查通过。

本轮仅提交源码和验证记录，未冻结新 Alpha 候选。Provider 错误/进度、其他协议响应的用户可见文案与部分诊断参数标签仍待 F14 审计。
