# P7 private 参数删除与间接调用

日期：2026-09-23。`Remove unused parameter` 会删除 private 方法形参、对应 PHPDoc 与已解析直接调用中的实参。间接调用的实参不在该编辑计划中；若仍提供操作，改写后的方法可能在运行时收到错误的参数。

本轮在提供操作前检查动态方法访问、短式与长式 callable 数组、first-class callable、静态方法字符串，以及当前类中以变量作为方法名的 callable 数组。任何可能指向该方法而又无法同步编辑实参的调用都会使操作消失。注释和普通字符串中的方法形状不会误触发这些检查；`Formatter::format` 形式的字符串 callable 仍按实际候选拒绝。对不能唯一证明目标的间接调用保持保守拒绝。

## 验证

- 语义定向用例覆盖已知/未知动态方法名、短式/长式 callable 数组、`call_user_func`、first-class callable、静态方法字符串，以及注释和普通字符串反例。
- 语义包 305 项测试、TypeScript 类型检查、相关 ESLint 与 `git diff --check` 通过。
- 真实 Language Server stdio 用例验证直接调用时仍返回重构动作；在同一打开文档更新为 callable 数组调用后，不再返回该动作。定向测试通过。
- 重建正式 bundle 后，`pnpm check:references:winstar` 的冷启动 References 返回 174 处，完整位置 SHA-256 与基线一致；Definition 返回 1 处且位置摘要匹配。本次冷查询为 10.113 秒，属于单次观测。

本轮没有打包 VSIX；编辑器应用、Undo/Redo 和完整 P7/F08 最终矩阵仍需在后续候选验证。
