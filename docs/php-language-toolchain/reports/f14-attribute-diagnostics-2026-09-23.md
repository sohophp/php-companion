# F14 Attribute、弃用与扩展可用性诊断本地化

日期：2026-09-23。Language Server 按 LSP 客户端界面语言输出 `#[AllowDynamicProperties]`、属性 `#[Override]`、`#[NoDiscard]`、`#[Deprecated]` 的目标与版本限制、弃用调用，以及 PHP 扩展不可用诊断。用户在 Attribute/PHPDoc 中提供的说明保持原文；固定原因和目标类型会翻译。诊断代码、严重性、位置、结构化扩展来源数据及默认英文消息保持原样。

真实 stdio 中文回归验证无效 Attribute 目标、`#[Override]` 父级属性、`#[NoDiscard]` 丢弃返回值、带用户说明的弃用调用、Composer platform 禁用扩展，以及 PHP 8.4 下的 Attribute 版本限制。既有英文 stdio 用例覆盖同一诊断族。Language Server TypeScript 构建、7 项定向 stdio 用例、相关 ESLint 与差异检查通过。

本轮只提交源码和验证记录，未冻结新 Alpha 候选。服务端诊断发布路径已使用本地化消息表；代码操作标题、Provider 错误/进度以及诊断参数中的部分类型标签仍待 F14 继续处理。
