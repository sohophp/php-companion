# F14 Language Server 常见诊断本地化

日期：2026-09-23。Language Server 现在读取 LSP `initialize.locale`，以 VS Code 的界面语言选择诊断文案。缺省和非中文语言继续使用原有英文，`zh-*` 使用简体中文。诊断代码、严重性、范围与 `data` 不随语言改变，因此现有 Quick Fix 与按代码配置的规则仍使用相同身份。

本轮覆盖语法错误、目标 PHP 版本不支持、主类型文件名、未使用 import、确定未定义变量，以及无法解析的类型、函数、常量和成员。定向测试检查语法/版本诊断与英文默认文案；`pnpm check` 全量通过。VS Code 1.138.0 简体中文隔离宿主从当前 [7eb0ada1 候选](p9-alpha-candidate-current-2026-09-23.md)的实际 Language Server 收到中文 `php.syntax` 诊断，英文完整宿主回归也通过。其余诊断、Provider 错误、代码操作标题和进度文案仍须逐项迁移；F14 尚未验收完成。
