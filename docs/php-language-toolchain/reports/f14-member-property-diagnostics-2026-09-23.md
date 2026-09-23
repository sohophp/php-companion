# F14 成员与属性操作诊断本地化

日期：2026-09-23。Language Server 按 LSP 客户端界面语言输出不可访问成员、PHP 8.4 Property Hook 读写/引用/迭代错误、PHPDoc 与原生类型冲突，以及不可访问构造方法的诊断。诊断代码、严重性、位置和英文默认文案保持原样。

真实 stdio 回归以 `zh-CN` 初始化 Language Server，并从发布的诊断中验证 private 方法、只写 Hook 属性、PHPDoc 冲突和 private 构造方法的中文消息。既有英文 stdio 回归覆盖成员、PHPDoc、Hook 操作及构造方法原文。定向测试、TypeScript 构建、ESLint 和全仓 `pnpm check` 通过；Language Server 全量 271 项通过、1 项跳过，Symfony 扩展 5 项、根扩展 58 项通过，四份 VSIX 内容校验通过。

服务端仍有扩展可用性、继承与 Override、Attribute、Deprecated 等诊断，以及 Provider 错误和代码操作标题未全部本地化。F14 最终验收继续开放。
